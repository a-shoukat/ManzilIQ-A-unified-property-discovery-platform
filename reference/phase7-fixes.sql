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
