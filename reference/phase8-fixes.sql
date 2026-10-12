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
select plot_id, count(*) from public.bookings
  where status in ('pending', 'approved', 'token_paid', 'completed')
  group by plot_id having count(*) > 1;
