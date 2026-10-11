-- ManzilIQ Prototype — Supabase schema (cumulative per version)
-- Run this in the Supabase SQL Editor. Safe to re-run (uses IF NOT EXISTS).

-- ============ v2-auth: profiles, role details, verification ============

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'buyer'
    check (role in ('buyer', 'dealer', 'society_admin', 'super_admin')),
  verification_status text not null default 'approved'
    check (verification_status in ('pending', 'approved', 'rejected', 'blacklisted')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- Society registration details (WBS: Society Portal — Registration & Verification)
create table if not exists public.society_details (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  society_name text not null,
  address text not null,
  developer_info text,
  noc_doc_url text,
  secp_doc_url text,
  created_at timestamptz not null default now()
);

alter table public.society_details enable row level security;

drop policy if exists "society_details_owner" on public.society_details;
create policy "society_details_owner" on public.society_details
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- Dealer registration details (WBS: Dealer Portal — Registration & Profile)
create table if not exists public.dealer_details (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  cnic_doc_url text,
  license_no text not null,
  firm_name text not null,
  experience_years int not null default 0,
  photo_url text,
  created_at timestamptz not null default now()
);

alter table public.dealer_details enable row level security;

drop policy if exists "dealer_details_owner" on public.dealer_details;
create policy "dealer_details_owner" on public.dealer_details
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- Customer registration details (WBS: Customer Portal — Account Registration)
create table if not exists public.customer_details (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  cnic_number text,
  contact_phone text,
  address text,
  photo_url text,
  created_at timestamptz not null default now()
);

alter table public.customer_details enable row level security;

drop policy if exists "customer_details_owner" on public.customer_details;
create policy "customer_details_owner" on public.customer_details
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- Document storage bucket (CNIC, NOC, SECP, photos)
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

drop policy if exists "documents_owner_rw" on storage.objects;
create policy "documents_owner_rw" on storage.objects
  for all using (bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]);

-- ============ v3-marketplace: properties ============

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  city text not null,
  area text,
  society_name text,
  block text,
  plot_size_marla numeric not null default 5,
  category text not null default 'residential' check (category in ('residential', 'commercial')),
  purpose text not null default 'sale' check (purpose in ('sale', 'rent')),
  price numeric not null default 0,
  bedrooms int,
  bathrooms int,
  description text,
  image_url text,
  status text not null default 'available'
    check (status in ('available', 'reserved', 'sold')),
  owner_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.properties enable row level security;

drop policy if exists "properties_public_read" on public.properties;
create policy "properties_public_read" on public.properties
  for select using (true);

drop policy if exists "properties_owner_write" on public.properties;
create policy "properties_owner_write" on public.properties
  for insert with check (auth.uid() = owner_id);

drop policy if exists "properties_owner_update" on public.properties;
create policy "properties_owner_update" on public.properties
  for update using (auth.uid() = owner_id);

drop policy if exists "properties_owner_delete" on public.properties;
create policy "properties_owner_delete" on public.properties
  for delete using (auth.uid() = owner_id);

-- ============ v4-society: plots, lots, dealer requests ============

create table if not exists public.lots (
  id uuid primary key default gen_random_uuid(),
  society_id uuid not null references public.profiles(id) on delete cascade,
  dealer_id uuid references public.profiles(id) on delete set null,
  name text not null,
  block text,
  commission_pct numeric not null default 0,
  expires_at date,
  status text not null default 'active'
    check (status in ('active', 'revoked', 'expired', 'released')),
  created_at timestamptz not null default now()
);

create table if not exists public.plots (
  id uuid primary key default gen_random_uuid(),
  society_id uuid not null references public.profiles(id) on delete cascade,
  block text not null,
  plot_no text not null,
  size_marla numeric not null default 5,
  category text not null default 'residential'
    check (category in ('residential', 'commercial')),
  base_price numeric not null default 0,
  status text not null default 'available'
    check (status in ('available', 'assigned', 'reserved', 'sold', 'blocked')),
  lot_id uuid references public.lots(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (society_id, block, plot_no)
);

create table if not exists public.dealer_requests (
  id uuid primary key default gen_random_uuid(),
  dealer_id uuid not null references public.profiles(id) on delete cascade,
  society_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  unique (dealer_id, society_id)
);

alter table public.lots enable row level security;
alter table public.plots enable row level security;
alter table public.dealer_requests enable row level security;

-- plots: public can read; society owns writes; assigned dealer can read own lots
drop policy if exists "plots_public_read" on public.plots;
create policy "plots_public_read" on public.plots for select using (true);

drop policy if exists "plots_society_write" on public.plots;
create policy "plots_society_write" on public.plots
  for all using (auth.uid() = society_id) with check (auth.uid() = society_id);

-- lots: society manages; dealer reads own
drop policy if exists "lots_society_all" on public.lots;
create policy "lots_society_all" on public.lots
  for all using (auth.uid() = society_id) with check (auth.uid() = society_id);

drop policy if exists "lots_dealer_read" on public.lots;
create policy "lots_dealer_read" on public.lots
  for select using (auth.uid() = dealer_id);

-- dealer_requests: dealer creates own; society manages incoming
drop policy if exists "dr_dealer_create" on public.dealer_requests;
create policy "dr_dealer_create" on public.dealer_requests
  for insert with check (auth.uid() = dealer_id);

drop policy if exists "dr_read" on public.dealer_requests;
create policy "dr_read" on public.dealer_requests
  for select using (auth.uid() = dealer_id or auth.uid() = society_id);

drop policy if exists "dr_society_update" on public.dealer_requests;
create policy "dr_society_update" on public.dealer_requests
  for update using (auth.uid() = society_id);

-- ============ v5-dealer: leads, activities, plot showing flag ============

alter table public.plots add column if not exists showing_client text;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  dealer_id uuid not null references public.profiles(id) on delete cascade,
  customer_name text not null,
  phone text,
  email text,
  status text not null default 'new'
    check (status in ('new', 'hot', 'warm', 'cold', 'converted', 'lost')),
  pipeline_stage int not null default 1 check (pipeline_stage between 1 and 6),
  plot_id uuid references public.plots(id) on delete set null,
  follow_up_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.lead_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  activity_type text not null default 'note'
    check (activity_type in ('call', 'visit', 'note', 'follow_up')),
  details text not null,
  created_at timestamptz not null default now()
);

alter table public.leads enable row level security;
alter table public.lead_activities enable row level security;

drop policy if exists "leads_owner" on public.leads;
create policy "leads_owner" on public.leads
  for all using (auth.uid() = dealer_id) with check (auth.uid() = dealer_id);

drop policy if exists "lead_act_owner" on public.lead_activities;
create policy "lead_act_owner" on public.lead_activities
  for all using (
    exists (select 1 from public.leads l where l.id = lead_id and l.dealer_id = auth.uid())
  ) with check (
    exists (select 1 from public.leads l where l.id = lead_id and l.dealer_id = auth.uid())
  );

-- ============ v7-booking: bookings ============

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  reference_no text unique not null,
  plot_id uuid references public.plots(id) on delete set null,
  customer_id uuid references public.profiles(id) on delete set null,
  dealer_id uuid references public.profiles(id) on delete set null,
  society_id uuid references public.profiles(id) on delete set null,
  channel text not null default 'direct' check (channel in ('direct', 'dealer')),
  token_amount numeric not null default 0,
  installment_plan text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'token_paid', 'completed', 'cancelled')),
  created_at timestamptz not null default now()
);

alter table public.bookings enable row level security;

drop policy if exists "bookings_read" on public.bookings;
create policy "bookings_read" on public.bookings
  for select using (
    auth.uid() = customer_id or auth.uid() = dealer_id or auth.uid() = society_id
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin')
  );

drop policy if exists "bookings_customer_insert" on public.bookings;
create policy "bookings_customer_insert" on public.bookings
  for insert with check (auth.uid() = customer_id);

drop policy if exists "bookings_manage_update" on public.bookings;
create policy "bookings_manage_update" on public.bookings
  for update using (
    auth.uid() = society_id or auth.uid() = dealer_id
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin')
  );

-- ============ v8-payment: plans + payments ============

create table if not exists public.installment_plans (
  id uuid primary key default gen_random_uuid(),
  society_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  duration_months int not null default 12,
  down_payment_pct numeric not null default 20,
  created_at timestamptz not null default now(),
  unique (society_id, name)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  customer_id uuid references public.profiles(id) on delete set null,
  society_id uuid references public.profiles(id) on delete set null,
  amount numeric not null default 0,
  method text not null default 'jazzcash'
    check (method in ('jazzcash', 'easypaisa', 'bank', 'cash', 'cheque')),
  proof_url text,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed')),
  due_date date,
  paid_at timestamptz,
  late_fee numeric not null default 0,
  receipt_no text unique,
  label text,
  created_at timestamptz not null default now()
);

alter table public.installment_plans enable row level security;
alter table public.payments enable row level security;

drop policy if exists "plans_society" on public.installment_plans;
create policy "plans_society" on public.installment_plans
  for all using (auth.uid() = society_id) with check (auth.uid() = society_id);

drop policy if exists "plans_public_read" on public.installment_plans;
create policy "plans_public_read" on public.installment_plans for select using (true);

drop policy if exists "payments_read" on public.payments;
create policy "payments_read" on public.payments
  for select using (
    auth.uid() = customer_id or auth.uid() = society_id
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin')
  );

drop policy if exists "payments_customer_insert" on public.payments;
create policy "payments_customer_insert" on public.payments
  for insert with check (auth.uid() = customer_id);

drop policy if exists "payments_society_insert" on public.payments;
create policy "payments_society_insert" on public.payments
  for insert with check (
    auth.uid() = society_id
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin')
  );

-- ============ v10-notifications: inbox + templates ============

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text,
  type text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.message_templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;
alter table public.message_templates enable row level security;

drop policy if exists "notif_owner_read" on public.notifications;
create policy "notif_owner_read" on public.notifications
  for select using (auth.uid() = user_id);

drop policy if exists "notif_owner_update" on public.notifications;
create policy "notif_owner_update" on public.notifications
  for update using (auth.uid() = user_id);

drop policy if exists "notif_any_insert" on public.notifications;
create policy "notif_any_insert" on public.notifications
  for insert with check (auth.role() = 'authenticated');

drop policy if exists "templates_owner" on public.message_templates;
create policy "templates_owner" on public.message_templates
  for all using (owner_id is null or auth.uid() = owner_id)
  with check (auth.uid() = owner_id or owner_id is null);

drop policy if exists "templates_read" on public.message_templates;
create policy "templates_read" on public.message_templates
  for select using (true);

-- ============ v11-admin: disputes + legal templates ============

create table if not exists public.disputes (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id) on delete set null,
  type text not null default 'customer-complaint'
    check (type in ('society-dealer', 'customer-complaint', 'transaction')),
  subject text not null,
  description text not null,
  plot_id uuid references public.plots(id) on delete set null,
  booking_ref text,
  status text not null default 'open'
    check (status in ('open', 'in_review', 'resolved', 'escalated')),
  resolution_note text,
  created_at timestamptz not null default now()
);

create table if not exists public.legal_templates (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  title text not null,
  body text not null,
  version int not null default 1,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.disputes enable row level security;
alter table public.legal_templates enable row level security;

drop policy if exists "disputes_reporter_insert" on public.disputes;
create policy "disputes_reporter_insert" on public.disputes
  for insert with check (auth.uid() = reporter_id);

drop policy if exists "disputes_read" on public.disputes;
create policy "disputes_read" on public.disputes
  for select using (
    auth.uid() = reporter_id
    or exists (select 1 from public.profiles where id = auth.uid() and role in ('super_admin', 'society_admin'))
  );

drop policy if exists "disputes_admin_update" on public.disputes;
create policy "disputes_admin_update" on public.disputes
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin')
  );

drop policy if exists "legal_tpl_admin" on public.legal_templates;
create policy "legal_tpl_admin" on public.legal_templates
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin')
  ) with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin')
  );

drop policy if exists "legal_tpl_read" on public.legal_templates;
create policy "legal_tpl_read" on public.legal_templates
  for select using (published = true);

-- ============ v12-legal: generated documents ============

create table if not exists public.generated_documents (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete set null,
  customer_id uuid references public.profiles(id) on delete set null,
  society_id uuid references public.profiles(id) on delete set null,
  dealer_id uuid references public.profiles(id) on delete set null,
  doc_type text not null
    check (doc_type in ('allotment', 'token_receipt', 'sale_agreement', 'installment_receipt', 'transfer_deed', 'noc_letter', 'cancellation')),
  title text not null,
  body text not null,
  version int not null default 1,
  expires_at date,
  created_at timestamptz not null default now()
);

alter table public.generated_documents enable row level security;

drop policy if exists "gendoc_read" on public.generated_documents;
create policy "gendoc_read" on public.generated_documents
  for select using (
    auth.uid() = customer_id or auth.uid() = society_id or auth.uid() = dealer_id
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin')
  );

drop policy if exists "gendoc_insert" on public.generated_documents;
create policy "gendoc_insert" on public.generated_documents
  for insert with check (
    auth.uid() = society_id
    or auth.uid() = customer_id
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin')
  );

drop policy if exists "payments_society_update" on public.payments;
create policy "payments_society_update" on public.payments
  for update using (
    auth.uid() = society_id
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin')
  );
