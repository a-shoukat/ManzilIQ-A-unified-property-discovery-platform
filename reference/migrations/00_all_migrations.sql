-- ManzilIQ consolidated migrations (idempotent, additive).
-- Owner-run in Supabase SQL Editor. Do NOT auto-execute.
-- Order: admin-setup → phase1 → phase2 → phase3 → phase4 → phase6 → phase7 → phase8 → phase9 → phase10 → phase11 (hybrid-safe) → phase12 → backend parity.
-- LIVE QUIRKS: existing audit_logs, push_tokens; subscriptions may already have society_id UNIQUE + optional user_id.
-- Never DROP/RENAME tables. CREATE TABLE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS only.

-- ========== admin-setup ==========
-- ManzilIQ: super admin + client verification setup.
-- Run ONCE yourself in your database dashboard → SQL Editor. Safe to re-run.
-- Nothing here deletes data; it only adds columns, a helper function and access rules.

-- 1. Extra verification columns
alter table public.customer_details add column if not exists cnic_front_url text;
alter table public.customer_details add column if not exists cnic_back_url text;
alter table public.profiles add column if not exists rejection_reason text;
alter table public.profiles add column if not exists full_name text;

-- 2. Helper: is the current user a super admin? (bypasses RLS safely)
create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin');
$$;

-- 3. Stop users from making themselves admin or approving themselves
create or replace function public.protect_profile_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_super_admin() or auth.uid() is null then return new; end if;
  if tg_op = 'INSERT' then
    if new.role not in ('buyer','dealer','society_admin') then new.role := 'buyer'; end if;
    new.verification_status := 'pending';
    new.rejection_reason := null;
  else
    new.role := old.role;
    -- owners may only move themselves back to pending (resubmission)
    if new.verification_status <> old.verification_status
       and not (old.verification_status = 'rejected' and new.verification_status = 'pending') then
      new.verification_status := old.verification_status;
    end if;
    if new.verification_status <> 'pending' then new.rejection_reason := old.rejection_reason; end if;
  end if;
  return new;
end $$;
drop trigger if exists protect_profile_fields on public.profiles;
create trigger protect_profile_fields before insert or update on public.profiles
  for each row execute function public.protect_profile_fields();

-- 4. Super admin can see and manage everything needed for approvals
drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all" on public.profiles for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());
drop policy if exists "customer_details_admin" on public.customer_details;
create policy "customer_details_admin" on public.customer_details for select to authenticated using (public.is_super_admin());
drop policy if exists "dealer_details_admin" on public.dealer_details;
create policy "dealer_details_admin" on public.dealer_details for select to authenticated using (public.is_super_admin());
drop policy if exists "society_details_admin" on public.society_details;
create policy "society_details_admin" on public.society_details for select to authenticated using (public.is_super_admin());
drop policy if exists "documents_admin_read" on storage.objects;
create policy "documents_admin_read" on storage.objects for select to authenticated
  using (bucket_id = 'documents' and public.is_super_admin());
drop policy if exists "notifications_admin_insert" on public.notifications;
create policy "notifications_admin_insert" on public.notifications for insert to authenticated
  with check (public.is_super_admin());

-- 5. Make hello@manziliq.com the super admin
--    (first create the account on the app's Sign up page with that email)
insert into public.profiles (id, email, role, verification_status)
select id, email, 'super_admin', 'approved' from auth.users where email = 'hello@manziliq.com'
on conflict (id) do update set role = 'super_admin', verification_status = 'approved';

-- ========== phase1-fixes ==========
-- ManzilIQ Phase 1 fixes. Safe to run more than once. Adds only; deletes nothing.

-- 1) Buyers & dealers can list approved societies (name only, no private details).
create or replace function public.list_societies()
returns table (id uuid, email text, society_name text)
language sql stable security definer set search_path = public as $$
  select p.id, p.email, d.society_name
  from public.profiles p
  left join public.society_details d on d.profile_id = p.id
  where p.role = 'society_admin' and p.verification_status = 'approved'
$$;
revoke all on function public.list_societies() from public;
grant execute on function public.list_societies() to authenticated;

-- 2) Super admin can add / edit / delete plots for any society.
drop policy if exists "Super admin manages plots" on public.plots;
create policy "Super admin manages plots" on public.plots
  for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin'));

-- ========== phase2-features ==========
-- ManzilIQ Phase 2: wishlist + admin listing management. Safe to re-run. Adds only.

-- 1) Wishlist (saved properties per account)
create table if not exists public.wishlist (
  user_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, property_id)
);
grant select, insert, delete on public.wishlist to authenticated;
grant all on public.wishlist to service_role;
alter table public.wishlist enable row level security;
drop policy if exists "Own wishlist" on public.wishlist;
create policy "Own wishlist" on public.wishlist for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 2) Super admin can edit / delete any listing
drop policy if exists "Super admin manages properties" on public.properties;
create policy "Super admin manages properties" on public.properties for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin'));

-- 3) Super admin can insert profiles for users they create from "Add user"
drop policy if exists "Super admin inserts profiles" on public.profiles;
create policy "Super admin inserts profiles" on public.profiles for insert to authenticated
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'super_admin'));

-- ========== phase3-features ==========
-- Phase 3b: dealer books for a customer + society plot map upload. Adds only; deletes nothing.

-- Dealer looks up an approved buyer by email (returns only the id).
create or replace function public.find_buyer_by_email(_email text)
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.profiles
  where lower(email) = lower(trim(_email)) and role = 'buyer' and verification_status = 'approved'
  limit 1
$$;
revoke all on function public.find_buyer_by_email(text) from public;
grant execute on function public.find_buyer_by_email(text) to authenticated;

-- Dealers may create a booking on behalf of a customer, only as themselves.
drop policy if exists "bookings_dealer_insert" on public.bookings;
create policy "bookings_dealer_insert" on public.bookings for insert to authenticated
  with check (dealer_id = auth.uid() and channel = 'dealer'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'dealer' and verification_status = 'approved'));

-- Public bucket for society master plans; each society writes only its own folder.
insert into storage.buckets (id, name, public) values ('society-maps', 'society-maps', true)
on conflict (id) do nothing;
drop policy if exists "society maps read" on storage.objects;
create policy "society maps read" on storage.objects for select using (bucket_id = 'society-maps');
drop policy if exists "society maps write" on storage.objects;
create policy "society maps write" on storage.objects for all to authenticated
  using (bucket_id = 'society-maps' and ((storage.foldername(name))[1] = auth.uid()::text
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin')))
  with check (bucket_id = 'society-maps' and ((storage.foldername(name))[1] = auth.uid()::text
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin')));

-- ========== phase4-features ==========
-- Phase 4: detailed listings. Adds only; deletes nothing.
alter table public.properties add column if not exists images text[] not null default '{}';
alter table public.properties add column if not exists amenities text[] not null default '{}';
alter table public.properties add column if not exists is_featured boolean not null default false;
alter table public.properties add column if not exists contact_phone text;

create table if not exists public.listing_reports (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  reporter_id uuid references auth.users(id) on delete set null,
  reason text not null,
  details text,
  status text not null default 'open' check (status in ('open', 'dismissed', 'actioned')),
  created_at timestamptz not null default now()
);
grant select, insert, update on public.listing_reports to authenticated;
grant all on public.listing_reports to service_role;
alter table public.listing_reports enable row level security;
drop policy if exists "Report a listing" on public.listing_reports;
create policy "Report a listing" on public.listing_reports for insert to authenticated with check (reporter_id = auth.uid());
drop policy if exists "Super admin reviews reports" on public.listing_reports;
create policy "Super admin reviews reports" on public.listing_reports for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin'));

create table if not exists public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  filters jsonb not null default '{}',
  label text not null,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.saved_searches to authenticated;
grant all on public.saved_searches to service_role;
alter table public.saved_searches enable row level security;
drop policy if exists "Own saved searches" on public.saved_searches;
create policy "Own saved searches" on public.saved_searches for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Only super admin may set is_featured.
create or replace function public.guard_featured() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_featured is distinct from coalesce(case when tg_op = 'UPDATE' then old.is_featured end, false)
     and not exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin') then
    new.is_featured := coalesce(case when tg_op = 'UPDATE' then old.is_featured end, false);
  end if;
  return new;
end $$;
drop trigger if exists guard_featured on public.properties;
create trigger guard_featured before insert or update on public.properties for each row execute function public.guard_featured();

-- Public bucket for listing photos; each account writes only its own folder.
insert into storage.buckets (id, name, public) values ('listing-photos', 'listing-photos', true)
on conflict (id) do nothing;
drop policy if exists "listing photos read" on storage.objects;
create policy "listing photos read" on storage.objects for select using (bucket_id = 'listing-photos');
drop policy if exists "listing photos write" on storage.objects;
create policy "listing photos write" on storage.objects for all to authenticated
  using (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- Lets the app notify super admins about reports (returns ids only).
create or replace function public.list_super_admins() returns setof uuid
language sql stable security definer set search_path = public as $$
  select id from public.profiles where role = 'super_admin'
$$;
revoke all on function public.list_super_admins() from public;
grant execute on function public.list_super_admins() to authenticated;

-- ========== phase6-features ==========
-- ManzilIQ Phase 6: let payments be recorded from the app. Safe to re-run. Adds policies only.
-- Why: today a buyer pressing "Pay" sees a success screen but the database silently refuses
-- the write, because no policy lets a customer update their own payment row.

grant update on public.payments to authenticated;

-- 1) A customer can record their own payment (method, proof, paid date, late fee) but can
--    never mark it confirmed themselves — only the society or the super admin does that.
drop policy if exists "payments_customer_update" on public.payments;
create policy "payments_customer_update" on public.payments
  for update to authenticated
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid() and status <> 'confirmed');

-- 2) A society admin can confirm / reject payments of their own society.
drop policy if exists "payments_society_update" on public.payments;
create policy "payments_society_update" on public.payments
  for update to authenticated
  using (society_id = auth.uid())
  with check (society_id = auth.uid());

-- 3) A super admin can update any payment.
drop policy if exists "payments_super_admin_update" on public.payments;
create policy "payments_super_admin_update" on public.payments
  for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'super_admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'super_admin'));

-- ========== phase7-fixes ==========
-- Phase 7 fixes: block double bookings, let societies reserve their plots,
-- backfill stale plot statuses, and list a society's approved dealers.
-- Run once in Supabase -> SQL Editor.

-- 1) Reject bookings for plots that are not available or already held.
create or replace function public.check_plot_bookable()
returns trigger language plpgsql security definer set search_path = public as $$
declare st text;
begin
  if new.plot_id is null then return new; end if;
  select status into st from public.plots where id = new.plot_id;
  if st is null or st not in ('available', 'assigned') then
    raise exception 'This plot is no longer available';
  end if;
  if exists (
    select 1 from public.bookings b
    where b.plot_id = new.plot_id and b.id <> new.id
      and b.status in ('pending', 'approved', 'token_paid', 'completed')
  ) then
    raise exception 'This plot is no longer available';
  end if;
  return new;
end $$;

drop trigger if exists bookings_plot_bookable on public.bookings;
create trigger bookings_plot_bookable before insert on public.bookings
  for each row execute function public.check_plot_bookable();

-- 2) Society owner and super admin may update plot status.
grant update on public.plots to authenticated;
drop policy if exists plots_society_update on public.plots;
create policy plots_society_update on public.plots for update to authenticated
  using (society_id = auth.uid()) with check (society_id = auth.uid());
drop policy if exists plots_super_admin_update on public.plots;
create policy plots_super_admin_update on public.plots for update to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin'));

-- 3) Backfill: plots already held by bookings.
update public.plots p set status = 'sold'
  where exists (select 1 from public.bookings b where b.plot_id = p.id and b.status = 'completed');
update public.plots p set status = 'reserved'
  where p.status in ('available', 'assigned')
    and exists (select 1 from public.bookings b where b.plot_id = p.id and b.status in ('approved', 'token_paid'));

-- 4) Approved dealers of a society with name, firm and email.
create or replace function public.list_society_dealers(p_society uuid)
returns table (id uuid, name text, firm text, email text)
language sql stable security definer set search_path = public as $$
  select pr.id, coalesce(pr.full_name, '')::text, coalesce(dd.firm_name, '')::text, coalesce(pr.email, '')::text
  from public.dealer_requests r
  join public.profiles pr on pr.id = r.dealer_id
  left join public.dealer_details dd on dd.profile_id = r.dealer_id
  where r.society_id = p_society and r.status = 'approved'
    and (auth.uid() = p_society
      or exists (select 1 from public.profiles me where me.id = auth.uid() and me.role in ('super_admin', 'buyer', 'dealer')));
$$;
grant execute on function public.list_society_dealers(uuid) to authenticated;

-- 5) Review duplicate bookings (nothing is deleted automatically):
-- select plot_id, array_agg(reference_no || ' (' || status || ')') from public.bookings
--   where status in ('pending','approved','token_paid','completed') group by plot_id having count(*) > 1;

-- ========== phase8-fixes ==========
-- Phase 8: atomic double-booking protection + A-101 cleanup.
-- Run once in Supabase -> SQL Editor. Safe to re-run.

-- 1) Clean up the historical double booking on plot A-101.
--    Canonical booking: BK-3SLCEC86 (token already paid — the furthest along).
--    TST-297F4636 (approved) and TST-E7048C74 (pending) were test bookings on the same plot.
update public.bookings set status = 'cancelled'
  where reference_no in ('TST-297F4636', 'TST-E7048C74') and status <> 'cancelled';

-- 2) Booking check now locks the plot row, so two simultaneous requests are processed
--    one after the other: the second one sees the first booking and is refused.
create or replace function public.check_plot_bookable()
returns trigger language plpgsql security definer set search_path = public as $$
declare st text;
begin
  if new.plot_id is null then return new; end if;
  select status into st from public.plots where id = new.plot_id for update;
  if st is null or st not in ('available', 'assigned') then
    raise exception 'This plot is no longer available';
  end if;
  if exists (
    select 1 from public.bookings b
    where b.plot_id = new.plot_id and b.id <> new.id
      and b.status in ('pending', 'approved', 'token_paid', 'completed')
  ) then
    raise exception 'This plot is no longer available';
  end if;
  return new;
end $$;

drop trigger if exists bookings_plot_bookable on public.bookings;
create trigger bookings_plot_bookable before insert on public.bookings
  for each row execute function public.check_plot_bookable();

-- 3) Hard guarantee at the database level: at most one active booking per plot.
create unique index if not exists bookings_one_active_per_plot
  on public.bookings (plot_id)
  where status in ('pending', 'approved', 'token_paid', 'completed');

-- Check: should return no rows.

-- ========== phase9-master-plan ==========
-- Phase 9: Interactive Society Master Plan Map. Run once in Supabase → SQL Editor.
create table if not exists public.plot_map_regions (
  id uuid primary key default gen_random_uuid(),
  society_id uuid not null,
  plot_id uuid references public.plots(id) on delete set null, -- deleted plot => region becomes "unlinked"
  plot_label text,
  page int not null default 1,
  x_pct numeric not null, y_pct numeric not null, w_pct numeric not null, h_pct numeric not null,
  created_at timestamptz not null default now()
);
create index if not exists plot_map_regions_society on public.plot_map_regions(society_id);

grant select on public.plot_map_regions to anon, authenticated;
grant insert, update, delete on public.plot_map_regions to authenticated;
grant all on public.plot_map_regions to service_role;
alter table public.plot_map_regions enable row level security;

drop policy if exists "regions readable" on public.plot_map_regions;
create policy "regions readable" on public.plot_map_regions for select using (true);
drop policy if exists "regions managed by society or admin" on public.plot_map_regions;
create policy "regions managed by society or admin" on public.plot_map_regions for all to authenticated
  using (society_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'super_admin'))
  with check (society_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'super_admin'));

-- Plots must be readable by buyers/dealers for the viewer (status only, no private data in plots).
drop policy if exists "plots readable by signed in" on public.plots;
create policy "plots readable by signed in" on public.plots for select to authenticated using (true);

-- Realtime: live colour updates.
do $$ begin
  begin alter publication supabase_realtime add table public.plots; exception when others then null; end;
  begin alter publication supabase_realtime add table public.bookings; exception when others then null; end;
  begin alter publication supabase_realtime add table public.plot_map_regions; exception when others then null; end;
end $$;

-- ========== phase10-sold-at ==========
-- Phase 10: record when a plot/property becomes sold.
-- Run once in the Supabase SQL editor. Safe to re-run.

alter table public.plots add column if not exists sold_at timestamptz;
alter table public.properties add column if not exists sold_at timestamptz;

create or replace function public.set_sold_at()
returns trigger language plpgsql as $$
begin
  if new.status = 'sold' and (tg_op = 'INSERT' or old.status is distinct from 'sold') then
    new.sold_at := coalesce(new.sold_at, now());
  elsif new.status <> 'sold' then
    new.sold_at := null;
  end if;
  return new;
end $$;

drop trigger if exists plots_set_sold_at on public.plots;
create trigger plots_set_sold_at before insert or update of status on public.plots
  for each row execute function public.set_sold_at();

drop trigger if exists properties_set_sold_at on public.properties;
create trigger properties_set_sold_at before insert or update of status on public.properties
  for each row execute function public.set_sold_at();

-- ========== phase11-subscriptions (hybrid-safe; no recreate) ==========
-- Live may already have subscriptions with society_id UNIQUE + optional user_id.
-- Do not recreate. Only ensure user_id uniqueness for app upserts and add missing columns.
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  role text check (role is null or role in ('buyer','dealer','society_admin')),
  plan_id text,
  status text not null default 'active' check (status in ('active','trialing','expired','cancelled')),
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Additive columns for hybrid live shape (society SaaS rows)
alter table public.subscriptions add column if not exists society_id uuid;
alter table public.subscriptions add column if not exists user_id uuid;
alter table public.subscriptions add column if not exists role text;
alter table public.subscriptions add column if not exists plan_id text;
alter table public.subscriptions add column if not exists status text;
alter table public.subscriptions add column if not exists current_period_start timestamptz;
alter table public.subscriptions add column if not exists current_period_end timestamptz;
alter table public.subscriptions add column if not exists created_at timestamptz;
alter table public.subscriptions add column if not exists updated_at timestamptz;

-- Ensure UNIQUE(user_id) for PostgREST upsert onConflict user_id (skip nulls)
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.subscriptions'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) ilike '%user_id%'
  ) and not exists (
    select 1 from pg_indexes
    where schemaname = 'public' and tablename = 'subscriptions'
      and indexdef ilike '%unique%user_id%'
  ) then
    -- dedupe non-null user_id keeping newest
    delete from public.subscriptions s
    using public.subscriptions newer
    where s.user_id is not null and newer.user_id is not null
      and s.user_id = newer.user_id and s.ctid < newer.ctid;
    begin
      alter table public.subscriptions add constraint subscriptions_user_id_key unique (user_id);
    exception when others then
      create unique index if not exists subscriptions_user_id_uidx on public.subscriptions (user_id) where user_id is not null;
    end;
  end if;
end $$;

grant select, insert, update, delete on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;
alter table public.subscriptions enable row level security;

drop policy if exists "own subscription read" on public.subscriptions;
create policy "own subscription read" on public.subscriptions for select to authenticated
  using (user_id = auth.uid() or society_id = auth.uid() or public.is_super_admin());

drop policy if exists "own subscription insert" on public.subscriptions;
create policy "own subscription insert" on public.subscriptions for insert to authenticated
  with check (user_id = auth.uid() or public.is_super_admin());

drop policy if exists "own subscription update" on public.subscriptions;
create policy "own subscription update" on public.subscriptions for update to authenticated
  using (user_id = auth.uid() or public.is_super_admin())
  with check (user_id = auth.uid() or public.is_super_admin());

drop policy if exists "admin subscription delete" on public.subscriptions;
create policy "admin subscription delete" on public.subscriptions for delete to authenticated
  using (public.is_super_admin());

create or replace function public.subscriptions_sync_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.user_id is not null then
    select role into new.role from public.profiles where id = new.user_id;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists subscriptions_sync_role on public.subscriptions;
create trigger subscriptions_sync_role before insert or update on public.subscriptions
  for each row execute function public.subscriptions_sync_role();

-- ========== phase12-pipeline ==========
-- ManzilIQ phase 12: lead labels + manual deal-pipeline stage on bookings. Run ONCE in the SQL editor. Safe to re-run.
alter table public.leads add column if not exists label text;
alter table public.leads drop constraint if exists leads_label_check;
alter table public.leads add constraint leads_label_check check (label is null or label in ('hot','warm','cold'));
-- carry over old hot/warm/cold statuses into the new label
update public.leads set label = status where label is null and status in ('hot','warm','cold');

alter table public.bookings add column if not exists pipeline_stage smallint;
alter table public.bookings drop constraint if exists bookings_pipeline_stage_check;
alter table public.bookings add constraint bookings_pipeline_stage_check check (pipeline_stage is null or pipeline_stage between 1 and 6);

-- ========== backend parity (Phases 1–9 additive; respect live audit_logs / push_tokens) ==========

-- push_tokens: already may exist live — create if missing, never drop
create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token text not null,
  platform text not null default 'web' check (platform in ('web','android','ios')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, token)
);
alter table public.push_tokens add column if not exists platform text;
alter table public.push_tokens add column if not exists updated_at timestamptz;
create index if not exists push_tokens_user_idx on public.push_tokens(user_id);
grant select, insert, update, delete on public.push_tokens to authenticated;
grant all on public.push_tokens to service_role;
alter table public.push_tokens enable row level security;
drop policy if exists "own push tokens" on public.push_tokens;
create policy "own push tokens" on public.push_tokens for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "admin push tokens read" on public.push_tokens;
create policy "admin push tokens read" on public.push_tokens for select to authenticated
  using (public.is_super_admin());

-- audit_logs: already may exist live — create if missing, extend columns only
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.audit_logs add column if not exists actor_id uuid;
alter table public.audit_logs add column if not exists action text;
alter table public.audit_logs add column if not exists entity_type text;
alter table public.audit_logs add column if not exists entity_id text;
alter table public.audit_logs add column if not exists meta jsonb;
alter table public.audit_logs add column if not exists created_at timestamptz;
create index if not exists audit_logs_created_idx on public.audit_logs(created_at desc);
create index if not exists audit_logs_actor_idx on public.audit_logs(actor_id);
grant select, insert on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;
alter table public.audit_logs enable row level security;
drop policy if exists "audit insert authenticated" on public.audit_logs;
create policy "audit insert authenticated" on public.audit_logs for insert to authenticated
  with check (actor_id = auth.uid() or public.is_super_admin());
drop policy if exists "audit admin read" on public.audit_logs;
create policy "audit admin read" on public.audit_logs for select to authenticated
  using (public.is_super_admin() or actor_id = auth.uid());

-- notification delivery log (external channels)
create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid references public.notifications(id) on delete set null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  channel text not null check (channel in ('in_app','email','sms','fcm')),
  status text not null default 'queued' check (status in ('queued','sent','failed','skipped')),
  detail text,
  created_at timestamptz not null default now()
);
create index if not exists notification_deliveries_user_idx on public.notification_deliveries(user_id, created_at desc);
grant select, insert on public.notification_deliveries to authenticated;
grant all on public.notification_deliveries to service_role;
alter table public.notification_deliveries enable row level security;
drop policy if exists "delivery own read" on public.notification_deliveries;
create policy "delivery own read" on public.notification_deliveries for select to authenticated
  using (user_id = auth.uid() or public.is_super_admin());
drop policy if exists "delivery insert" on public.notification_deliveries;
create policy "delivery insert" on public.notification_deliveries for insert to authenticated
  with check (true);

-- installment reminder runs
create table if not exists public.reminder_runs (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  kind text not null check (kind in ('t_minus_3','due','overdue','escalation')),
  channel text not null default 'in_app',
  status text not null default 'sent',
  created_at timestamptz not null default now(),
  unique (payment_id, kind)
);
grant select, insert on public.reminder_runs to authenticated;
grant all on public.reminder_runs to service_role;
alter table public.reminder_runs enable row level security;
drop policy if exists "reminder admin read" on public.reminder_runs;
create policy "reminder admin read" on public.reminder_runs for select to authenticated
  using (public.is_super_admin()
    or exists (select 1 from public.payments p where p.id = payment_id and (p.customer_id = auth.uid() or p.society_id = auth.uid())));
drop policy if exists "reminder insert service" on public.reminder_runs;
create policy "reminder insert service" on public.reminder_runs for insert to authenticated with check (true);

-- inquiries CRM
create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete set null,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  inquirer_id uuid references public.profiles(id) on delete set null,
  name text not null,
  email text,
  phone text,
  message text not null,
  status text not null default 'new' check (status in ('new','contacted','qualified','converted','closed')),
  lead_id uuid references public.leads(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists inquiries_owner_idx on public.inquiries(owner_id, created_at desc);
grant select, insert, update on public.inquiries to authenticated;
grant all on public.inquiries to service_role;
alter table public.inquiries enable row level security;
drop policy if exists "inquiry insert" on public.inquiries;
create policy "inquiry insert" on public.inquiries for insert to authenticated
  with check (inquirer_id = auth.uid() or inquirer_id is null);
drop policy if exists "inquiry owner read" on public.inquiries;
create policy "inquiry owner read" on public.inquiries for select to authenticated
  using (owner_id = auth.uid() or inquirer_id = auth.uid() or public.is_super_admin());
drop policy if exists "inquiry owner update" on public.inquiries;
create policy "inquiry owner update" on public.inquiries for update to authenticated
  using (owner_id = auth.uid() or public.is_super_admin())
  with check (owner_id = auth.uid() or public.is_super_admin());

create table if not exists public.inquiry_replies (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.inquiries(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
grant select, insert on public.inquiry_replies to authenticated;
grant all on public.inquiry_replies to service_role;
alter table public.inquiry_replies enable row level security;
drop policy if exists "inquiry reply read" on public.inquiry_replies;
create policy "inquiry reply read" on public.inquiry_replies for select to authenticated
  using (exists (
    select 1 from public.inquiries i
    where i.id = inquiry_id and (i.owner_id = auth.uid() or i.inquirer_id = auth.uid() or public.is_super_admin())
  ));
drop policy if exists "inquiry reply insert" on public.inquiry_replies;
create policy "inquiry reply insert" on public.inquiry_replies for insert to authenticated
  with check (author_id = auth.uid() and exists (
    select 1 from public.inquiries i
    where i.id = inquiry_id and (i.owner_id = auth.uid() or i.inquirer_id = auth.uid() or public.is_super_admin())
  ));

-- AI price predictions log
create table if not exists public.price_predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  input jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  method text not null default 'local',
  created_at timestamptz not null default now()
);
create index if not exists price_predictions_created_idx on public.price_predictions(created_at desc);
grant select, insert on public.price_predictions to authenticated;
grant all on public.price_predictions to service_role;
alter table public.price_predictions enable row level security;
drop policy if exists "prediction insert" on public.price_predictions;
create policy "prediction insert" on public.price_predictions for insert to authenticated
  with check (user_id = auth.uid() or user_id is null);
drop policy if exists "prediction read" on public.price_predictions;
create policy "prediction read" on public.price_predictions for select to authenticated
  using (user_id = auth.uid() or public.is_super_admin());

-- Map Layer-1 geo columns (no UI change required to store)
alter table public.properties add column if not exists lat double precision;
alter table public.properties add column if not exists lng double precision;
alter table public.society_details add column if not exists lat double precision;
alter table public.society_details add column if not exists lng double precision;
alter table public.society_details add column if not exists geojson jsonb;

-- Listing moderation queue fields
alter table public.properties add column if not exists moderation_status text;
alter table public.properties add column if not exists moderated_at timestamptz;
alter table public.properties add column if not exists moderated_by uuid;
do $$ begin
  alter table public.properties drop constraint if exists properties_moderation_status_check;
  alter table public.properties add constraint properties_moderation_status_check
    check (moderation_status is null or moderation_status in ('pending','approved','rejected'));
exception when others then null;
end $$;

-- Payment gateway transaction refs
alter table public.payments add column if not exists gateway text;
alter table public.payments add column if not exists gateway_txn_id text;
alter table public.payments add column if not exists gateway_payload jsonb;

-- Rate-limit / security helper: simple request counters (optional)
create table if not exists public.rate_limit_buckets (
  bucket_key text primary key,
  hits int not null default 0,
  window_start timestamptz not null default now()
);
grant all on public.rate_limit_buckets to service_role;
