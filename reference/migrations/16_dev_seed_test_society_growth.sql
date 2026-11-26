-- 16_dev_seed_test_society_growth.sql
-- *** DEV-ONLY *** Owner-run seed for live-test Bugs 2–3.
-- Does NOT create auth users. Paste the test society profile UUID below after
-- the account exists and society_details was submitted. Safe to re-run.
--
-- NEVER run blindly on production without confirming the UUID / email.

-- ========= SET THIS =========
-- Example: select id from public.profiles where email = 'dha-test@example.com';
-- \set society_profile_id '00000000-0000-0000-0000-000000000000'

do $$
declare
  -- Replace with the live test society's profiles.id (society_admin).
  sid uuid := null; -- e.g. 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid;
  email_hint text := 'REPLACE_WITH_TEST_SOCIETY_EMAIL@example.com';
begin
  if sid is null then
    select p.id into sid
    from public.profiles p
    where p.email = email_hint and p.role = 'society_admin'
    limit 1;
  end if;

  if sid is null then
    raise notice 'DEV seed skipped: set sid or email_hint to an existing society_admin profile';
    return;
  end if;

  -- Ensure society profile row exists (minimal public fields only)
  insert into public.society_details (profile_id, society_name, address)
  values (sid, 'DEV Test Society', 'Narowal, Punjab')
  on conflict (profile_id) do update
    set society_name = excluded.society_name;

  update public.profiles
  set verification_status = 'approved'
  where id = sid;

  -- Growth grant — always send society_id; conflict on society_id / user_id
  insert into public.subscriptions (
    user_id, society_id, role, plan_id, status,
    current_period_start, current_period_end
  ) values (
    sid, sid, 'society_admin', 'society_growth', 'active',
    now(), now() + interval '30 days'
  )
  on conflict (user_id) do update set
    society_id = excluded.society_id,
    plan_id = excluded.plan_id,
    status = 'active',
    current_period_end = excluded.current_period_end,
    role = 'society_admin';

  -- If live unique is society_id-only, also upsert that path when supported
  begin
    insert into public.subscriptions (
      user_id, society_id, role, plan_id, status,
      current_period_start, current_period_end
    ) values (
      sid, sid, 'society_admin', 'society_growth', 'active',
      now(), now() + interval '30 days'
    )
    on conflict (society_id) do update set
      user_id = excluded.user_id,
      plan_id = 'society_growth',
      status = 'active',
      current_period_end = excluded.current_period_end;
  exception when others then
    null; -- partial unique index / missing constraint — user_id upsert above is enough
  end;

  raise notice 'DEV seed OK: Growth granted for society %', sid;
end $$;
