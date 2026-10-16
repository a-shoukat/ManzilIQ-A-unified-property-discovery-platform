-- ManzilIQ phase 12: lead labels + manual deal-pipeline stage on bookings. Run ONCE in the SQL editor. Safe to re-run.
alter table public.leads add column if not exists label text;
alter table public.leads drop constraint if exists leads_label_check;
alter table public.leads add constraint leads_label_check check (label is null or label in ('hot','warm','cold'));
-- carry over old hot/warm/cold statuses into the new label
update public.leads set label = status where label is null and status in ('hot','warm','cold');

alter table public.bookings add column if not exists pipeline_stage smallint;
alter table public.bookings drop constraint if exists bookings_pipeline_stage_check;
alter table public.bookings add constraint bookings_pipeline_stage_check check (pipeline_stage is null or pipeline_stage between 1 and 6);
