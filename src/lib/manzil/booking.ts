import { getSupabase } from './supabase';
import { generateSchedule } from './payment';
import { generateDocument } from './legal';
import { notify } from './notify';
import type { Booking } from '@/lib/manzil/types';
import { ACTIVE_BOOKING_STATUSES, PLOT_UNAVAILABLE, plotLabel, bookingErrorText, filterBookablePlots } from './booking-rules';

/** Plot ids held by an active booking (blocks double booking even when plot status is stale). */
export async function fetchHeldPlotIds(plotIds: string[]): Promise<string[]> {
  const supabase = getSupabase();
  if (!supabase || plotIds.length === 0) return [];
  const { data } = await supabase.from('bookings').select('plot_id').in('plot_id', plotIds).in('status', [...ACTIVE_BOOKING_STATUSES]);
  return ((data as { plot_id: string }[]) ?? []).map((r) => r.plot_id);
}

export function makeReferenceNo(): string {
  return `BK-${Date.now().toString(36).toUpperCase().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`;
}

/** Batch-loads plot, society, customer and dealer details so every row has a readable label. */
async function enrichAll(list: Booking[]): Promise<Booking[]> {
  const supabase = getSupabase();
  if (!supabase || list.length === 0) return list;
  const uniq = (xs: (string | null)[]) => [...new Set(xs.filter((x): x is string => !!x))];
  const plotIds = uniq(list.map((b) => b.plot_id));
  const socIds = uniq(list.map((b) => b.society_id));
  const userIds = uniq(list.flatMap((b) => [b.customer_id, b.dealer_id]));
  const [plotsRes, socRes, usersRes] = await Promise.all([
    plotIds.length ? supabase.from('plots').select('id, block, plot_no, size_marla, base_price, status').in('id', plotIds) : Promise.resolve({ data: [] }),
    socIds.length ? supabase.from('society_details').select('profile_id, society_name').in('profile_id', socIds) : Promise.resolve({ data: [] }),
    userIds.length ? supabase.from('profiles').select('id, email, full_name').in('id', userIds) : Promise.resolve({ data: [] }),
  ]);
  type P = { id: string; block: string | null; plot_no: string; size_marla: number; base_price: number; status: string };
  const plots = new Map(((plotsRes.data ?? []) as P[]).map((p) => [p.id, p]));
  const socs = new Map(((socRes.data ?? []) as { profile_id: string; society_name: string }[]).map((x) => [x.profile_id, x.society_name]));
  const users = new Map(((usersRes.data ?? []) as { id: string; email: string; full_name: string | null }[]).map((u) => [u.id, u]));
  for (const b of list) {
    const p = b.plot_id ? plots.get(b.plot_id) : undefined;
    b.society_name = b.society_id ? socs.get(b.society_id) ?? null : null;
    if (p) {
      b.plot_no = p.plot_no; b.plot_block = p.block; b.plot_size_marla = p.size_marla; b.plot_price = p.base_price; b.plot_status = p.status;
      b.plot_label = plotLabel(p.plot_no, p.block, b.society_name);
    } else {
      b.plot_label = b.plot_id ? 'Plot details unavailable' : 'No plot linked';
    }
    const c = b.customer_id ? users.get(b.customer_id) : undefined;
    b.customer_email = c?.email ?? '—';
    b.customer_name = c?.full_name ?? null;
    b.dealer_email = b.dealer_id ? users.get(b.dealer_id)?.email ?? null : null;
  }
  return list;
}

export async function createBooking(input: {
  plot_id: string;
  customer_id: string;
  dealer_id: string | null;
  society_id: string;
  channel: 'direct' | 'dealer';
  token_amount: number;
  installment_plan: string;
}): Promise<Booking> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Database not connected');
  const held = await fetchHeldPlotIds([input.plot_id]);
  const { data: pl } = await supabase.from('plots').select('id, status').eq('id', input.plot_id).maybeSingle();
  if (!pl || held.length || filterBookablePlots([pl as { id: string; status: string }], []).length === 0) throw new Error(PLOT_UNAVAILABLE);
  const { data, error } = await supabase
    .from('bookings')
    .insert({ ...input, reference_no: makeReferenceNo(), status: 'pending' })
    .select()
    .single();
  if (error) throw new Error(bookingErrorText(error) ?? error.message);
  // trigger: new booking created → notify society
  if (input.society_id) {
    notify(input.society_id, 'New booking request', `Booking ${(data as Booking).reference_no} needs review.`, 'booking_created').catch(() => {});
  }
  return data as Booking;
}

export async function fetchMyBookings(customerId: string): Promise<Booking[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data } = await supabase.from('bookings').select('*').eq('customer_id', customerId).order('created_at', { ascending: false });
  const list = (data as Booking[]) ?? [];
  return enrichAll(list);
}

export async function fetchSocietyBookings(societyId: string): Promise<Booking[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data } = await supabase.from('bookings').select('*').eq('society_id', societyId).order('created_at', { ascending: false });
  const list = (data as Booking[]) ?? [];
  return enrichAll(list);
}

export async function fetchAllBookings(): Promise<Booking[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data } = await supabase.from('bookings').select('*').order('created_at', { ascending: false });
  const list = (data as Booking[]) ?? [];
  return enrichAll(list);
}

export async function setBookingStatus(id: string, status: Booking['status']): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Database not connected');
  const { error } = await supabase.from('bookings').update({ status }).eq('id', id);
  if (error) throw error;
}

/** Approve booking → reserve the plot + generate installment schedule */
export async function approveBooking(b: Booking): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Database not connected');
  await setBookingStatus(b.id, 'approved');
  let total = 0;
  if (b.plot_id) {
    const { data: up, error: upErr } = await supabase.from('plots').update({ status: 'reserved' }).eq('id', b.plot_id).select('id');
    if (upErr || !up?.length) throw new Error('Booking approved, but the plot could not be marked reserved — your account is not allowed to update this plot. Run reference/phase7-fixes.sql.');
    const { data: p } = await supabase.from('plots').select('base_price').eq('id', b.plot_id).maybeSingle();
    total = Number((p as { base_price: number } | null)?.base_price ?? 0);
  }
  const { count } = await supabase.from('payments').select('id', { count: 'exact', head: true }).eq('booking_id', b.id);
  if (!count) {
    await generateSchedule({ ...b, status: 'approved' }, total);
  }
  // trigger: booking approved → notify customer
  if (b.customer_id) {
    notify(b.customer_id, 'Booking approved', `Booking ${b.reference_no} approved. Your payment schedule is ready.`, 'booking_approved').catch(() => {});
  }
  // auto-generate allotment letter on approval
  try {
    await generateDocument(b, 'allotment');
  } catch (e) {
    console.error('allotment letter failed:', e);
  }
}

/** Complete transfer → mark plot sold, booking completed */
export async function completeTransfer(b: Booking): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Database not connected');
  await setBookingStatus(b.id, 'completed');
  if (b.plot_id) {
    await supabase.from('plots').update({ status: 'sold' }).eq('id', b.plot_id);
  }
  // trigger: transfer approved → notify customer
  if (b.customer_id) {
    notify(b.customer_id, 'Transfer approved', `Plot transfer for booking ${b.reference_no} is complete.`, 'transfer_approved').catch(() => {});
  }
  // auto-generate transfer deed + NOC letter on completion
  try {
    await generateDocument(b, 'transfer_deed');
    await generateDocument(b, 'noc_letter');
  } catch (e) {
    console.error('transfer docs failed:', e);
  }
}

export async function fetchAvailablePlots(societyId: string) {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from('plots')
    .select('id, block, plot_no, size_marla, base_price, status')
    .eq('society_id', societyId)
    .eq('status', 'available')
    .order('block')
    .order('plot_no');
  const list = (data as { id: string; block: string; plot_no: string; size_marla: number; base_price: number; status: string }[]) ?? [];
  return filterBookablePlots(list, await fetchHeldPlotIds(list.map((p) => p.id)));
}

/** Everything the booking detail view needs: payments and documents linked to one booking. */
export async function fetchBookingExtras(bookingId: string) {
  const supabase = getSupabase();
  if (!supabase) return { payments: [], documents: [] };
  const [p, d] = await Promise.all([
    supabase.from('payments').select('*').eq('booking_id', bookingId).order('due_date'),
    supabase.from('generated_documents').select('id, doc_type, version, created_at').eq('booking_id', bookingId).order('created_at'),
  ]);
  return {
    payments: (p.data ?? []) as import('./types').Payment[],
    documents: (d.data ?? []) as { id: string; doc_type: import('./types').GeneratedDocType; version: number; created_at: string }[],
  };
}

/** Manually set a booking's deal-pipeline stage (1–6). */
export async function setBookingPipelineStage(bookingId: string, stage: number): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Database not connected');
  const { error } = await supabase.from('bookings').update({ pipeline_stage: stage }).eq('id', bookingId);
  if (error) throw error;
}

/** Deal stage for a booking, combining booking events with any manual override. */
export async function fetchBookingDealStage(b: Pick<Booking, 'id' | 'status' | 'pipeline_stage'>): Promise<number> {
  const { dealStage } = await import('./deal-pipeline');
  const x = await fetchBookingExtras(b.id);
  return dealStage({
    status: b.status,
    docTypes: x.documents.map((d) => d.doc_type),
    allPaid: x.payments.length > 0 && x.payments.every((p) => !!p.paid_at),
    manualStage: b.pipeline_stage ?? null,
  });
}
