-- ManzilIQ phase 11: SaaS subscriptions. Run ONCE in the SQL editor. Safe to re-run.
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  role text not null check (role in ('buyer','dealer','society_admin')),
  plan_id text not null,
  status text not null default 'active' check (status in ('active','trialing','expired','cancelled')),
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;

alter table public.subscriptions enable row level security;

drop policy if exists "own subscription read" on public.subscriptions;
create policy "own subscription read" on public.subscriptions for select to authenticated
  using (user_id = auth.uid() or public.is_super_admin());

-- Demo checkout: users may start/change their own plan (no real payment gateway).
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

-- Role on the row must always match the user's real role.
create or replace function public.subscriptions_sync_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  select role into new.role from public.profiles where id = new.user_id;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists subscriptions_sync_role on public.subscriptions;
create trigger subscriptions_sync_role before insert or update on public.subscriptions
  for each row execute function public.subscriptions_sync_role();
