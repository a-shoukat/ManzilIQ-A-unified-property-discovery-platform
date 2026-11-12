-- Phase 10.5 optional — add viewing / negotiating to inquiries.status.
-- Additive: expands CHECK only. Existing rows (new/contacted/qualified/converted/closed) stay valid.

do $$
begin
  alter table public.inquiries drop constraint if exists inquiries_status_check;
exception when undefined_object then
  null;
end $$;

-- Postgres auto-names column checks as <table>_<column>_check; also try unnamed drop via recreate.
alter table public.inquiries drop constraint if exists inquiries_status_check;

alter table public.inquiries
  add constraint inquiries_status_check
  check (status in (
    'new',
    'contacted',
    'viewing',
    'negotiating',
    'qualified',
    'converted',
    'closed'
  ));
