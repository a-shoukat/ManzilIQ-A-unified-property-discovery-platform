import { getSupabase } from './supabase';
import { notify } from './notify';
import type { Booking, GeneratedDocType, GeneratedDocument } from '@/lib/manzil/types';

interface DocContext {
  customer_name: string;
  cnic: string;
  plot: string;
  society: string;
  amount: string;
  date: string;
  reference_no: string;
  breakdown?: string;
}

async function buildContext(booking: Booking): Promise<DocContext> {
  const supabase = getSupabase();
  let customer_name = booking.customer_email ?? 'Customer';
  let cnic = '—';
  let plot = booking.plot_label ?? '—';
  let society = '—';
  let amount = '—';

  if (supabase) {
    if (booking.customer_id) {
      const { data: c } = await supabase.from('customer_details').select('cnic_number').eq('profile_id', booking.customer_id).maybeSingle();
      cnic = (c as { cnic_number: string } | null)?.cnic_number ?? '—';
      const { data: p } = await supabase.from('profiles').select('email').eq('id', booking.customer_id).maybeSingle();
      customer_name = (p as { email: string } | null)?.email ?? customer_name;
    }
    if (booking.plot_id) {
      const { data: pl } = await supabase.from('plots').select('block, plot_no, size_marla, base_price').eq('id', booking.plot_id).maybeSingle();
      const pp = pl as { block: string; plot_no: string; size_marla: number; base_price: number } | null;
      if (pp) {
        plot = `${pp.block}-${pp.plot_no} (${pp.size_marla} Marla)`;
        amount = `PKR ${Number(pp.base_price).toLocaleString()}`;
      }
    }
    if (booking.society_id) {
      const { data: s } = await supabase.from('society_details').select('society_name, address').eq('profile_id', booking.society_id).maybeSingle();
      const ss = s as { society_name: string; address: string } | null;
      if (ss) society = `${ss.society_name}, ${ss.address}`;
    }
  }

  return {
    customer_name,
    cnic,
    plot,
    society,
    amount,
    date: new Date().toLocaleDateString(),
    reference_no: booking.reference_no,
  };
}

const FALLBACK_BODIES: Record<GeneratedDocType, string> = {
  allotment: 'ALLOTMENT LETTER\n\nDate: {{date}}\nRef: {{reference_no}}\n\nDear {{customer_name}} (CNIC: {{cnic}}),\n\nThis letter confirms the allotment of {{plot}}, {{society}} against a total consideration of {{amount}}.\n\nAuthorized signature: ____________',
  token_receipt: 'TOKEN RECEIPT\n\nDate: {{date}}\nRef: {{reference_no}}\n\nReceived from {{customer_name}} (CNIC: {{cnic}}) the token amount against {{plot}}, {{society}}.\n\nReceived by: ____________',
  sale_agreement: 'SALE & PURCHASE AGREEMENT\n\nDate: {{date}} | Ref: {{reference_no}}\n\nBetween {{society}} and {{customer_name}} (CNIC: {{cnic}}) for {{plot}} at {{amount}}.\n\nSeller: ____________   Buyer: ____________',
  installment_receipt: 'INSTALLMENT RECEIPT\n\nDate: {{date}}\nRef: {{reference_no}}\n\nReceived from {{customer_name}} against {{plot}}, {{society}}.\n\nAmount paid: {{amount}}\n{{breakdown}}\n\nReceived by: ____________',
  transfer_deed: 'TRANSFER DEED\n\nDate: {{date}} | Ref: {{reference_no}}\n\n{{plot}}, {{society}} is hereby transferred to {{customer_name}} (CNIC: {{cnic}}) after full payment of {{amount}}.\n\nTransferor: ____________   Transferee: ____________',
  noc_letter: 'NOC ISSUANCE LETTER\n\nDate: {{date}} | Ref: {{reference_no}}\n\nThis is to certify that {{plot}}, {{society}} has no objection for transfer to {{customer_name}} (CNIC: {{cnic}}).\n\nIssued by: ____________',
  cancellation: 'CANCELLATION LETTER\n\nDate: {{date}} | Ref: {{reference_no}}\n\nThe booking of {{plot}}, {{society}} by {{customer_name}} (CNIC: {{cnic}}) stands cancelled.\n\nAuthorized signature: ____________',
};

function fill(body: string, ctx: DocContext): string {
  const map = ctx as unknown as Record<string, string>;
  return body.replace(/\{\{(\w+)\}\}/g, (_, k: string) => map[k] ?? `{{${k}}}`);
}

/** Generate a document (auto-fill from DB, versioned). Returns the created doc. */
export async function generateDocument(
  booking: Booking,
  docType: GeneratedDocType,
  extra?: Partial<DocContext>,
): Promise<GeneratedDocument> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Database not connected');

  const ctx = { ...(await buildContext(booking)), ...extra };
  // prefer published legal template for allotment/sale_agreement/transfer_deed
  const tplKey = docType === 'allotment' ? 'allotment' : docType === 'sale_agreement' ? 'sale_agreement' : docType === 'transfer_deed' ? 'transfer_deed' : null;
  let body = FALLBACK_BODIES[docType];
  if (tplKey) {
    const { data: tpl } = await supabase.from('legal_templates').select('body').eq('key', tplKey).eq('published', true).order('version', { ascending: false }).limit(1).maybeSingle();
    if ((tpl as { body: string } | null)?.body) body = (tpl as { body: string }).body;
  }
  const rendered = fill(body, ctx);

  const { data: prev } = await supabase
    .from('generated_documents')
    .select('version')
    .eq('booking_id', booking.id)
    .eq('doc_type', docType)
    .order('version', { ascending: false })
    .limit(1);
  const version = (((prev as { version: number }[] | null)?.[0]?.version) ?? 0) + 1;

  const expires =
    docType === 'noc_letter' || docType === 'allotment'
      ? new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10)
      : null;

  const { data, error } = await supabase
    .from('generated_documents')
    .insert({
      booking_id: booking.id,
      customer_id: booking.customer_id,
      society_id: booking.society_id,
      dealer_id: booking.dealer_id,
      doc_type: docType,
      title: `${docType.replace(/_/g, ' ')} — ${booking.reference_no}`,
      body: rendered,
      version,
      expires_at: expires,
    })
    .select()
    .single();
  if (error) throw error;

  // trigger: document ready → notify customer
  if (booking.customer_id) {
    notify(booking.customer_id, 'Document ready', `Your ${docType.replace(/_/g, ' ')} for booking ${booking.reference_no} is ready to download.`, 'document_ready').catch(() => {});
  }
  return data as GeneratedDocument;
}

export async function fetchDocuments(filter: {
  customerId?: string;
  societyId?: string;
  dealerId?: string;
  all?: boolean;
}): Promise<GeneratedDocument[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  let q = supabase.from('generated_documents').select('*').order('created_at', { ascending: false });
  if (filter.customerId) q = q.eq('customer_id', filter.customerId);
  else if (filter.societyId) q = q.eq('society_id', filter.societyId);
  else if (filter.dealerId) q = q.eq('dealer_id', filter.dealerId);
  const { data } = await q;
  const list = (data as GeneratedDocument[]) ?? [];
  for (const d of list) {
    if (d.booking_id) {
      const { data: b } = await supabase.from('bookings').select('reference_no').eq('id', d.booking_id).maybeSingle();
      d.booking_ref = (b as { reference_no: string } | null)?.reference_no ?? '—';
    }
  }
  return list;
}
