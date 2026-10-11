-- Phase 3b: dealer books for a customer + society plot map upload. Adds only; deletes nothing.

-- Dealer looks up an approved buyer by email (returns only the id).
create or replace function public.find_buyer_by_email(_email text)
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.profiles
  where lower(email) = lower(trim(_email)) and role = 'buyer' and verification_status = 'approved'
  limit 1
$$;
revoke all on function public.find_buyer_by_email(text) from public;
grant execute on function public.find_buyer_by_email(text) to authenticated;

-- Dealers may create a booking on behalf of a customer, only as themselves.
drop policy if exists "bookings_dealer_insert" on public.bookings;
create policy "bookings_dealer_insert" on public.bookings for insert to authenticated
  with check (dealer_id = auth.uid() and channel = 'dealer'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'dealer' and verification_status = 'approved'));

-- Public bucket for society master plans; each society writes only its own folder.
insert into storage.buckets (id, name, public) values ('society-maps', 'society-maps', true)
on conflict (id) do nothing;
drop policy if exists "society maps read" on storage.objects;
create policy "society maps read" on storage.objects for select using (bucket_id = 'society-maps');
drop policy if exists "society maps write" on storage.objects;
create policy "society maps write" on storage.objects for all to authenticated
  using (bucket_id = 'society-maps' and ((storage.foldername(name))[1] = auth.uid()::text
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin')))
  with check (bucket_id = 'society-maps' and ((storage.foldername(name))[1] = auth.uid()::text
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin')));
