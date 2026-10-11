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
