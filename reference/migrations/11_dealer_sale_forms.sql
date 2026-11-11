-- Phase 11 — Dealer Urdu Sale Receipt / Booking Form
-- Additive + idempotent. Owner-run only.
-- Depends on: profiles, bookings, plots, payments, audit_logs, is_super_admin().

-- ========== settings (one row per dealer) ==========
create table if not exists public.dealer_form_settings (
  dealer_id uuid primary key references public.profiles(id) on delete cascade,
  logo_url text,
  business_name_ur text not null default '',
  business_name_en text not null default '',
  society_name_ur text not null default '',
  scheme_badge_ur text not null default '',
  phase_badge_ur text not null default '',
  tagline_ur text not null default '',
  address_ur text not null default '',
  ceo_label_ur text not null default 'سی ای او',
  ceo_name_ur text not null default '',
  phone text not null default '',
  header_bg_color text not null default '#1a4d2e',
  header_accent_color text not null default '#c9a227',
  footer_note_ur text not null default '',
  show_manager_signature boolean not null default true,
  next_serial int not null default 1 check (next_serial >= 1),
  updated_at timestamptz not null default now()
);
grant select on public.dealer_form_settings to authenticated, anon;
grant insert, update on public.dealer_form_settings to authenticated;
grant all on public.dealer_form_settings to service_role;
alter table public.dealer_form_settings enable row level security;
drop policy if exists "dealer form settings own" on public.dealer_form_settings;
drop policy if exists "dealer form settings read" on public.dealer_form_settings;
drop policy if exists "dealer form settings write" on public.dealer_form_settings;
-- Header branding is printed on public share pages — readable by anyone; writes stay dealer-owned.
create policy "dealer form settings read" on public.dealer_form_settings for select to authenticated, anon
  using (true);
create policy "dealer form settings write" on public.dealer_form_settings for all to authenticated
  using (dealer_id = auth.uid() or public.is_super_admin())
  with check (dealer_id = auth.uid() or public.is_super_admin());

-- ========== sale forms ==========
create table if not exists public.dealer_sale_forms (
  id uuid primary key default gen_random_uuid(),
  dealer_id uuid not null references public.profiles(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  plot_id uuid references public.plots(id) on delete set null,
  serial_no int, -- null while draft; assigned at ISSUE
  form_date date not null default (timezone('Asia/Karachi', now()))::date,
  buyer_name text not null default '',
  buyer_guardian_name text not null default '',
  buyer_cnic text not null default '',
  buyer_phone text not null default '',
  buyer_address text not null default '',
  seller_name text not null default '',
  seller_guardian_name text not null default '',
  plot_size_text text not null default '',
  rate_per_marla numeric(14,0) not null default 0,
  total_price numeric(14,0) not null default 0,
  file_fee_commission numeric(14,0) not null default 0,
  token_received numeric(14,0) not null default 0,
  previous_amount numeric(14,0) not null default 0,
  total_received numeric(14,0) not null default 0,
  balance_amount numeric(14,0) not null default 0,
  amounts_manually_edited boolean not null default false,
  balance_due_date date,
  bayana_date date,
  notes text not null default '',
  status text not null default 'draft' check (status in ('draft','issued','cancelled')),
  public_share_token text unique,
  revoked_at timestamptz,
  issued_at timestamptz,
  cancelled_at timestamptz,
  version int not null default 1,
  duplicated_from uuid references public.dealer_sale_forms(id) on delete set null,
  header_snapshot jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Evolve older installs
alter table public.dealer_sale_forms add column if not exists amounts_manually_edited boolean not null default false;
alter table public.dealer_sale_forms add column if not exists revoked_at timestamptz;
alter table public.dealer_sale_forms add column if not exists issued_at timestamptz;
alter table public.dealer_sale_forms add column if not exists cancelled_at timestamptz;
alter table public.dealer_sale_forms add column if not exists version int not null default 1;
alter table public.dealer_sale_forms add column if not exists duplicated_from uuid;
alter table public.dealer_sale_forms add column if not exists header_snapshot jsonb;
-- Allow draft rows without a serial
do $$
begin
  alter table public.dealer_sale_forms alter column serial_no drop not null;
exception when others then null;
end $$;
-- Drop legacy unique if present; use partial unique for issued serials only
do $$
begin
  alter table public.dealer_sale_forms drop constraint if exists dealer_sale_forms_dealer_id_serial_no_key;
exception when others then null;
end $$;
create unique index if not exists dealer_sale_forms_dealer_serial_uidx
  on public.dealer_sale_forms (dealer_id, serial_no)
  where serial_no is not null;
-- Backfill amounts_manually_edited from legacy totals_edited if that column exists
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'dealer_sale_forms' and column_name = 'totals_edited'
  ) then
    execute 'update public.dealer_sale_forms set amounts_manually_edited = totals_edited where amounts_manually_edited = false and totals_edited = true';
  end if;
end $$;

create index if not exists dealer_sale_forms_dealer_idx on public.dealer_sale_forms(dealer_id, created_at desc);
create index if not exists dealer_sale_forms_token_idx on public.dealer_sale_forms(public_share_token);

grant select, insert, update on public.dealer_sale_forms to authenticated;
grant select on public.dealer_sale_forms to anon;
grant all on public.dealer_sale_forms to service_role;
alter table public.dealer_sale_forms enable row level security;

drop policy if exists "dealer sale forms owner" on public.dealer_sale_forms;
create policy "dealer sale forms owner" on public.dealer_sale_forms for all to authenticated
  using (dealer_id = auth.uid() or public.is_super_admin())
  with check (dealer_id = auth.uid() or public.is_super_admin());

-- Public may read by token only when not revoked (cancelled kept so watermark can show)
drop policy if exists "dealer sale forms public token" on public.dealer_sale_forms;
create policy "dealer sale forms public token" on public.dealer_sale_forms for select to anon, authenticated
  using (
    public_share_token is not null
    and revoked_at is null
    and status in ('issued', 'cancelled')
  );

-- Atomic serial allocator with row lock (SELECT … FOR UPDATE)
create or replace function public.allocate_dealer_form_serial(p_dealer_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_serial int;
  v_max int;
begin
  if auth.uid() is distinct from p_dealer_id and not public.is_super_admin() then
    raise exception 'not allowed';
  end if;

  insert into public.dealer_form_settings (dealer_id, next_serial)
  values (p_dealer_id, 1)
  on conflict (dealer_id) do nothing;

  select next_serial into v_serial
  from public.dealer_form_settings
  where dealer_id = p_dealer_id
  for update;

  select coalesce(max(serial_no), 0) into v_max
  from public.dealer_sale_forms
  where dealer_id = p_dealer_id and serial_no is not null;

  if v_serial <= v_max then
    v_serial := v_max + 1;
  end if;

  update public.dealer_form_settings
  set next_serial = v_serial + 1, updated_at = now()
  where dealer_id = p_dealer_id;

  return v_serial;
end;
$$;
grant execute on function public.allocate_dealer_form_serial(uuid) to authenticated;

-- ========== logos bucket ==========
insert into storage.buckets (id, name, public)
values ('dealer-logos', 'dealer-logos', true)
on conflict (id) do nothing;

drop policy if exists "dealer logos read" on storage.objects;
create policy "dealer logos read" on storage.objects for select
  using (bucket_id = 'dealer-logos');

drop policy if exists "dealer logos write own" on storage.objects;
create policy "dealer logos write own" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'dealer-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "dealer logos update own" on storage.objects;
create policy "dealer logos update own" on storage.objects for update to authenticated
  using (bucket_id = 'dealer-logos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'dealer-logos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "dealer logos delete own" on storage.objects;
create policy "dealer logos delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'dealer-logos' and (storage.foldername(name))[1] = auth.uid()::text);
