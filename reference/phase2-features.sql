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
