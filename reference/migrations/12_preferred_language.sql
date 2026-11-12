-- Preferred UI language for profiles (en | ur). Safe to re-run.
alter table public.profiles
  add column if not exists preferred_language text
  check (preferred_language is null or preferred_language in ('en', 'ur'));

comment on column public.profiles.preferred_language is
  'UI language preference: en (default) or ur. Synced with localStorage manziliq.preferred_language.';
