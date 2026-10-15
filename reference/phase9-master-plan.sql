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
