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
