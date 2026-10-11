-- ManzilIQ Phase 6: let payments be recorded from the app. Safe to re-run. Adds policies only.
-- Why: today a buyer pressing "Pay" sees a success screen but the database silently refuses
-- the write, because no policy lets a customer update their own payment row.

grant update on public.payments to authenticated;

-- 1) A customer can record their own payment (method, proof, paid date, late fee) but can
--    never mark it confirmed themselves — only the society or the super admin does that.
drop policy if exists "payments_customer_update" on public.payments;
create policy "payments_customer_update" on public.payments
  for update to authenticated
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid() and status <> 'confirmed');

-- 2) A society admin can confirm / reject payments of their own society.
drop policy if exists "payments_society_update" on public.payments;
create policy "payments_society_update" on public.payments
  for update to authenticated
  using (society_id = auth.uid())
  with check (society_id = auth.uid());

-- 3) A super admin can update any payment.
drop policy if exists "payments_super_admin_update" on public.payments;
create policy "payments_super_admin_update" on public.payments
  for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'super_admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'super_admin'));
