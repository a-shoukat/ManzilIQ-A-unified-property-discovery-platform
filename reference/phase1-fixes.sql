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
