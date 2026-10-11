export type UserRole = 'buyer' | 'dealer' | 'society_admin' | 'super_admin';

export type VerificationStatus = 'pending' | 'approved' | 'rejected' | 'blacklisted';

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  verification_status: VerificationStatus;
  created_at: string;
}

export interface SocietyDetails {
  profile_id: string;
  society_name: string;
  address: string;
  developer_info: string | null;
  noc_doc_url: string | null;
  secp_doc_url: string | null;
}

export interface DealerDetails {
  profile_id: string;
  cnic_doc_url: string | null;
  license_no: string;
  firm_name: string;
  experience_years: number;
  photo_url: string | null;
}

export interface CustomerDetails {
  profile_id: string;
  cnic_number: string | null;
  contact_phone: string | null;
  address: string | null;
  photo_url: string | null;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  buyer: 'Buyer',
  dealer: 'Dealer',
  society_admin: 'Society Admin',
  super_admin: 'Super Admin',
};

export type PropertyCategory = 'residential' | 'commercial';
export type PropertyPurpose = 'sale' | 'rent';
export type PropertyStatus = 'available' | 'reserved' | 'sold';

export interface Property {
  id: string;
  title: string;
  city: string;
  area: string | null;
  society_name: string | null;
  block: string | null;
  plot_size_marla: number;
  category: PropertyCategory;
  purpose: PropertyPurpose;
  price: number;
  bedrooms: number | null;
  bathrooms: number | null;
  description: string | null;
  image_url: string | null;
  status: PropertyStatus;
  owner_id: string | null;
  created_at: string;
}

export type PlotStatus = 'available' | 'assigned' | 'reserved' | 'sold' | 'blocked';

export interface Plot {
  id: string;
  society_id: string;
  block: string;
  plot_no: string;
  size_marla: number;
  category: PropertyCategory;
  base_price: number;
  status: PlotStatus;
  lot_id: string | null;
  showing_client: string | null;
  created_at: string;
}

export type LotStatus = 'active' | 'revoked' | 'expired' | 'released';

export interface Lot {
  id: string;
  society_id: string;
  dealer_id: string | null;
  name: string;
  block: string | null;
  commission_pct: number;
  expires_at: string | null;
  status: LotStatus;
  created_at: string;
  dealer_email?: string;
  plot_count?: number;
}

export interface DealerRequest {
  id: string;
  dealer_id: string;
  society_id: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  dealer_email?: string;
  firm_name?: string | null;
  license_no?: string | null;
}

export type LeadStatus = 'new' | 'hot' | 'warm' | 'cold' | 'converted' | 'lost';

export interface Lead {
  id: string;
  dealer_id: string;
  customer_name: string;
  phone: string | null;
  email: string | null;
  status: LeadStatus;
  pipeline_stage: number;
  plot_id: string | null;
  follow_up_date: string | null;
  created_at: string;
  plot_label?: string;
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  activity_type: 'call' | 'visit' | 'note' | 'follow_up';
  details: string;
  created_at: string;
}

export const PIPELINE_STAGES = [
  'Inquiry received',
  'Site visit scheduled',
  'Token amount received',
  'Agreement signed',
  'Full payment complete',
  'Transfer request sent',
];

export interface SocietySummary {
  id: string;
  name: string;
  email: string;
  plots_available: number;
  plots_total: number;
}

export type BookingChannel = 'direct' | 'dealer';
export type BookingStatus = 'pending' | 'approved' | 'rejected' | 'token_paid' | 'completed' | 'cancelled';

export interface Booking {
  id: string;
  reference_no: string;
  plot_id: string | null;
  customer_id: string | null;
  dealer_id: string | null;
  society_id: string | null;
  channel: BookingChannel;
  token_amount: number;
  installment_plan: string | null;
  status: BookingStatus;
  created_at: string;
  plot_label?: string;
  customer_email?: string;
}

export const INSTALLMENT_PLANS = [
  'Lump sum (full payment)',
  '1-year plan',
  '3-year plan',
  '5-year plan',
];

export type PaymentMethod = 'jazzcash' | 'easypaisa' | 'bank' | 'cash' | 'cheque';

export interface InstallmentPlan {
  id: string;
  society_id: string;
  name: string;
  duration_months: number;
  down_payment_pct: number;
  created_at: string;
}

export interface Payment {
  id: string;
  booking_id: string;
  customer_id: string | null;
  society_id: string | null;
  amount: number;
  method: PaymentMethod;
  proof_url: string | null;
  status: 'pending' | 'confirmed';
  due_date: string | null;
  paid_at: string | null;
  late_fee: number;
  receipt_no: string | null;
  label: string | null;
  created_at: string;
  booking_ref?: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  type: string | null;
  read: boolean;
  created_at: string;
}

export interface MessageTemplate {
  id: string;
  owner_id: string | null;
  title: string;
  body: string;
  created_at: string;
}

export type DisputeType = 'society-dealer' | 'customer-complaint' | 'transaction';
export type DisputeStatus = 'open' | 'in_review' | 'resolved' | 'escalated';

export interface Dispute {
  id: string;
  reporter_id: string | null;
  type: DisputeType;
  subject: string;
  description: string;
  plot_id: string | null;
  booking_ref: string | null;
  status: DisputeStatus;
  resolution_note: string | null;
  created_at: string;
  reporter_email?: string;
  plot_label?: string;
}

export interface LegalTemplate {
  id: string;
  key: string;
  title: string;
  body: string;
  version: number;
  published: boolean;
  created_at: string;
}

export const LEGAL_TEMPLATE_KEYS = [
  { key: 'allotment', title: 'Allotment Letter' },
  { key: 'sale_agreement', title: 'Sale Agreement' },
  { key: 'transfer_deed', title: 'Transfer Deed' },
];

export type GeneratedDocType =
  | 'allotment'
  | 'token_receipt'
  | 'sale_agreement'
  | 'installment_receipt'
  | 'transfer_deed'
  | 'noc_letter'
  | 'cancellation';

export interface GeneratedDocument {
  id: string;
  booking_id: string | null;
  customer_id: string | null;
  society_id: string | null;
  dealer_id: string | null;
  doc_type: GeneratedDocType;
  title: string;
  body: string;
  version: number;
  expires_at: string | null;
  created_at: string;
  booking_ref?: string;
}

export const DOC_TITLES: Record<GeneratedDocType, string> = {
  allotment: 'Allotment Letter',
  token_receipt: 'Token Receipt',
  sale_agreement: 'Sale & Purchase Agreement',
  installment_receipt: 'Installment Receipt',
  transfer_deed: 'Transfer Deed',
  noc_letter: 'NOC Issuance Letter',
  cancellation: 'Cancellation Letter',
};
