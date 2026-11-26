-- 14_subscription_society_grant.sql
-- Live hybrid subscriptions: society_id was NOT NULL UNIQUE; app grants must send society_id
-- for society plans and may leave it null for buyer/dealer. Idempotent. Owner-run only.

-- Allow null society_id for non-society plan rows
do $$ begin
  alter table public.subscriptions alter column society_id drop not null;
exception when others then
  -- column missing, already nullable, or not a table — ignore
  null;
end $$;

alter table public.subscriptions add column if not exists society_id uuid;
alter table public.subscriptions add column if not exists user_id uuid;

-- Backfill user_id from society_id when the row is society-keyed only
update public.subscriptions s
set user_id = s.society_id
where s.user_id is null
  and s.society_id is not null
  and exists (select 1 from public.profiles p where p.id = s.society_id);

-- Backfill society_id for society_admin rows that already have a society_details profile
update public.subscriptions s
set society_id = s.user_id
from public.profiles p
where s.user_id = p.id
  and p.role = 'society_admin'
  and s.society_id is null
  and exists (select 1 from public.society_details d where d.profile_id = s.user_id);

-- Keep user_id uniqueness for PostgREST upsert onConflict user_id
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.subscriptions'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) ilike '%user_id%'
  ) and not exists (
    select 1 from pg_indexes
    where schemaname = 'public' and tablename = 'subscriptions'
      and indexdef ilike '%unique%user_id%'
  ) then
    delete from public.subscriptions s
    using public.subscriptions newer
    where s.user_id is not null and newer.user_id is not null
      and s.user_id = newer.user_id and s.ctid < newer.ctid;
    begin
      alter table public.subscriptions add constraint subscriptions_user_id_key unique (user_id);
    exception when others then
      create unique index if not exists subscriptions_user_id_uidx on public.subscriptions (user_id) where user_id is not null;
    end;
  end if;
end $$;

-- Partial unique on society_id when present (avoids blocking multiple null buyer/dealer rows)
do $$ begin
  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.subscriptions'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) ~* 'society_id'
      and pg_get_constraintdef(oid) not ilike '%user_id%'
  ) then
    -- Drop full UNIQUE(society_id) if it rejects nulls or duplicates nulls poorly; replace with partial
    begin
      alter table public.subscriptions drop constraint if exists subscriptions_society_id_key;
    exception when others then null;
    end;
  end if;
  create unique index if not exists subscriptions_society_id_uidx
    on public.subscriptions (society_id)
    where society_id is not null;
exception when others then
  null;
end $$;
