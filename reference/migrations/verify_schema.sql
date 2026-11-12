-- ManzilIQ schema verification (read-only). Run after 00_all_migrations.sql.
-- Expect: each check returns ok=true (or empty missing lists).

-- 1) Required tables
with required(name) as (
  values
    ('profiles'),('society_details'),('dealer_details'),('customer_details'),
    ('properties'),('lots'),('plots'),('dealer_requests'),('leads'),('lead_activities'),
    ('bookings'),('installment_plans'),('payments'),('notifications'),('message_templates'),
    ('disputes'),('legal_templates'),('generated_documents'),('push_tokens'),
    ('transfer_requests'),('audit_logs'),('system_settings'),('broadcasts'),
    ('favorites'),('property_images'),('reviews'),('price_history'),('subscriptions'),
    ('wishlist'),('listing_reports'),('saved_searches'),('plot_map_regions'),
    ('notification_deliveries'),('reminder_runs'),('inquiries'),('inquiry_replies'),
    ('price_predictions'),('rate_limit_buckets')
)
select r.name as missing_table
from required r
where to_regclass('public.' || r.name) is null
order by 1;

-- 2) Critical columns
select 'payments.gateway' as check_name, exists (
  select 1 from information_schema.columns
  where table_schema='public' and table_name='payments' and column_name='gateway'
) as ok
union all
select 'properties.lat', exists (
  select 1 from information_schema.columns
  where table_schema='public' and table_name='properties' and column_name='lat'
)
union all
select 'properties.moderation_status', exists (
  select 1 from information_schema.columns
  where table_schema='public' and table_name='properties' and column_name='moderation_status'
)
union all
select 'bookings.pipeline_stage', exists (
  select 1 from information_schema.columns
  where table_schema='public' and table_name='bookings' and column_name='pipeline_stage'
)
union all
select 'plots.sold_at', exists (
  select 1 from information_schema.columns
  where table_schema='public' and table_name='plots' and column_name='sold_at'
);

-- 3) Subscriptions hybrid / upsert readiness
select
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.subscriptions'::regclass and contype = 'u'
      and pg_get_constraintdef(oid) ilike '%user_id%'
  ) or exists (
    select 1 from pg_indexes
    where schemaname='public' and tablename='subscriptions'
      and indexdef ilike '%unique%user_id%'
  ) as subscriptions_user_id_unique;

-- 4) RLS enabled on sensitive new tables
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'push_tokens','audit_logs','notification_deliveries','reminder_runs',
    'inquiries','inquiry_replies','price_predictions','subscriptions','wishlist'
  )
order by 1;

-- 5) Active booking uniqueness index
select indexname, indexdef
from pg_indexes
where schemaname='public' and indexname = 'bookings_one_active_per_plot';
