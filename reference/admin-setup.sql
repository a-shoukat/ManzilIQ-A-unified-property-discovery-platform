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
