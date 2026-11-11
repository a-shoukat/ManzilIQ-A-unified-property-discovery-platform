-- Phase 10 UI support — additive only (safe on live). Owner must run manually.
-- Does not alter existing page behavior. Tables used by new Phase 10 screens.

-- Notification channel/event preferences
create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  in_app boolean not null default true,
  email boolean not null default true,
  sms boolean not null default false,
  push boolean not null default false,
  events jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.notification_preferences to authenticated;
grant all on public.notification_preferences to service_role;
alter table public.notification_preferences enable row level security;
drop policy if exists "notif pref own" on public.notification_preferences;
create policy "notif pref own" on public.notification_preferences for all to authenticated
  using (user_id = auth.uid() or public.is_super_admin())
  with check (user_id = auth.uid() or public.is_super_admin());

-- Homepage CMS (admin edits; public homepage wiring is opt-in / Needs decision)
create table if not exists public.site_banners (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  subtitle text,
  image_path text,
  href text,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.site_banners to authenticated, anon;
grant insert, update, delete on public.site_banners to authenticated;
grant all on public.site_banners to service_role;
alter table public.site_banners enable row level security;
drop policy if exists "banners public read" on public.site_banners;
create policy "banners public read" on public.site_banners for select to authenticated, anon using (true);
drop policy if exists "banners admin write" on public.site_banners;
create policy "banners admin write" on public.site_banners for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

create table if not exists public.site_content (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);
grant select on public.site_content to authenticated, anon;
grant insert, update, delete on public.site_content to authenticated;
grant all on public.site_content to service_role;
alter table public.site_content enable row level security;
drop policy if exists "content public read" on public.site_content;
create policy "content public read" on public.site_content for select to authenticated, anon using (true);
drop policy if exists "content admin write" on public.site_content;
create policy "content admin write" on public.site_content for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

-- Optional listing image hashes for fraud/duplicate flags (empty until populated)
create table if not exists public.listing_image_hashes (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  image_path text,
  hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists listing_image_hashes_hash_idx on public.listing_image_hashes(hash);
create index if not exists listing_image_hashes_property_idx on public.listing_image_hashes(property_id);
grant select on public.listing_image_hashes to authenticated;
grant all on public.listing_image_hashes to service_role;
alter table public.listing_image_hashes enable row level security;
drop policy if exists "image hash admin read" on public.listing_image_hashes;
create policy "image hash admin read" on public.listing_image_hashes for select to authenticated
  using (public.is_super_admin());

-- Receipt verification hash column on payments (additive)
alter table public.payments add column if not exists verification_hash text;
