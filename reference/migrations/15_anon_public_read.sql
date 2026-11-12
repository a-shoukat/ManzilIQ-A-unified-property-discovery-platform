-- 15_anon_public_read.sql
-- Guest browse: master-plan / marketplace / property detail need anon SELECT on
-- non-sensitive inventory data. No KYC/CNIC/owner contact via society_details docs.
-- Idempotent. Owner-run only.

-- Public society directory (name only — no email / noc / secp)
create or replace function public.list_societies()
returns table (id uuid, email text, society_name text)
language sql stable security definer set search_path = public as $$
  select p.id,
         null::text as email,
         coalesce(d.society_name, 'Society') as society_name
  from public.profiles p
  left join public.society_details d on d.profile_id = p.id
  where p.role = 'society_admin' and p.verification_status = 'approved'
$$;
revoke all on function public.list_societies() from public;
grant execute on function public.list_societies() to authenticated, anon;

-- Plots: inventory status/size/price is public map data (no owner contact columns)
grant select on public.plots to anon, authenticated;
drop policy if exists "plots readable by signed in" on public.plots;
drop policy if exists "plots public read" on public.plots;
create policy "plots public read" on public.plots
  for select to anon, authenticated
  using (true);

-- Properties already had public read in source-schema; ensure anon grant
grant select on public.properties to anon, authenticated;
drop policy if exists "properties_public_read" on public.properties;
create policy "properties_public_read" on public.properties
  for select to anon, authenticated
  using (true);

-- Ensure geo cols exist before public view
alter table public.society_details add column if not exists lat double precision;
alter table public.society_details add column if not exists lng double precision;

-- Safe society name/address/geo for maps (NOT noc_doc_url / secp_doc_url).
-- Default view owner rights — anon must not SELECT society_details directly.
create or replace view public.society_public as
select
  profile_id,
  society_name,
  address,
  lat,
  lng
from public.society_details;

grant select on public.society_public to anon, authenticated;

-- Approved societies can expose public profile fields via RLS on society_details
-- for SELECT of non-doc columns only is not possible with row RLS; keep docs private
-- by never granting anon SELECT on society_details table itself.
revoke select on public.society_details from anon;

-- plot_map_regions already granted to anon in phase9; reaffirm
grant select on public.plot_map_regions to anon, authenticated;

-- society-maps storage bucket already has public read policy in tip
