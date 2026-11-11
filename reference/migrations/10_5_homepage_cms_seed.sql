-- Phase 10.5 — seed site_content / site_banners with EXACT hardcoded homepage values.
-- Additive + idempotent (safe to re-run). Requires 10_phase10_ui_support.sql first.

-- Site content keys (exact match of DEFAULT_SITE_CONTENT / index.tsx)
insert into public.site_content (key, value, updated_at) values
  ('hero_eyebrow', 'PROPERTY, WITH PERSPECTIVE', now()),
  ('hero_title', E'A new address.\nA new beginning.', now()),
  ('hero_subtitle', 'Your next chapter starts with the right place.', now()),
  ('marketplace_eyebrow', 'A PLACE TO BEGIN', now()),
  ('marketplace_title', 'Discover your next property', now()),
  ('marketplace_subtitle', 'Great spaces. Real possibilities. Find a place that feels right.', now())
on conflict (key) do update
  set value = excluded.value,
      updated_at = now()
  where public.site_content.value is distinct from excluded.value
     or public.site_content.key = excluded.key;

-- Default hero banner (builtin:residence → bundled residence.jpg on the client)
insert into public.site_banners (
  id, title, subtitle, image_path, href, sort_order, active, created_at, updated_at
) values (
  '00000000-0000-4000-8000-000000000001',
  E'A new address.\nA new beginning.',
  'Your next chapter starts with the right place.',
  'builtin:residence',
  null,
  0,
  true,
  now(),
  now()
)
on conflict (id) do update set
  title = excluded.title,
  subtitle = excluded.subtitle,
  image_path = excluded.image_path,
  href = excluded.href,
  sort_order = excluded.sort_order,
  active = excluded.active,
  updated_at = now();
