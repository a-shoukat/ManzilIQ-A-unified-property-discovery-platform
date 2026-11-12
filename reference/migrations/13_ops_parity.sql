-- Task 3 / ops parity — reminder job summary runs (idempotent).
-- Owner-run only in Supabase SQL Editor. Do not auto-execute from the app.

create table if not exists public.reminder_job_runs (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'ok',
  t_minus_3 int not null default 0,
  due_count int not null default 0,
  overdue_count int not null default 0,
  escalated_count int not null default 0,
  detail text,
  created_at timestamptz not null default now()
);

create index if not exists reminder_job_runs_created_idx
  on public.reminder_job_runs (created_at desc);

grant select on public.reminder_job_runs to authenticated;
grant all on public.reminder_job_runs to service_role;

alter table public.reminder_job_runs enable row level security;

drop policy if exists "reminder_job_runs admin read" on public.reminder_job_runs;
create policy "reminder_job_runs admin read" on public.reminder_job_runs
  for select to authenticated
  using (public.is_super_admin());

drop policy if exists "reminder_job_runs insert service" on public.reminder_job_runs;
create policy "reminder_job_runs insert service" on public.reminder_job_runs
  for insert to authenticated
  with check (true);
