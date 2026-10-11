import { getSupabase } from './supabase';
import { generateSchedule } from './payment';
import { generateDocument } from './legal';
import { notify } from './notify';
import type { Booking } from '@/lib/manzil/types';

export function makeReferenceNo(): string {
  return `BK-${Date.now().toString(36).toUpperCase().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`;
}

async function enrich(b: Booking): Promise<Booking> {
  const supabase = getSupabase();
  if (!supabase) return b;
  if (b.plot_id) {
    const { data: p } = await supabase.from('plots').select('block, plot_no').eq('id', b.plot_id).maybeSingle();
    b.plot_label = p ? `${(p as { block: string }).block}-${(p as { plot_no: string }).plot_no}` : '—';
  }
  if (b.customer_id) {
    const { data: c } = await supabase.from('profiles').select('email').eq('id', b.customer_id).maybeSingle();
    b.customer_email = (c as { email: string } | null)?.email ?? '—';
  }
  return b;
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
  const { data, error } = await supabase
    .from('bookings')
    .insert({ ...input, reference_no: makeReferenceNo(), status: 'pending' })
    .select()
    .single();
  if (error) throw error;
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
  for (const b of list) await enrich(b);
  return list;
}

export async function fetchSocietyBookings(societyId: string): Promise<Booking[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data } = await supabase.from('bookings').select('*').eq('society_id', societyId).order('created_at', { ascending: false });
  const list = (data as Booking[]) ?? [];
  for (const b of list) await enrich(b);
  return list;
}

export async function fetchAllBookings(): Promise<Booking[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data } = await supabase.from('bookings').select('*').order('created_at', { ascending: false });
  const list = (data as Booking[]) ?? [];
  for (const b of list) await enrich(b);
  return list;
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
    await supabase.from('plots').update({ status: 'reserved' }).eq('id', b.plot_id);
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
    .select('id, block, plot_no, size_marla, base_price')
    .eq('society_id', societyId)
    .eq('status', 'available')
    .order('block')
    .order('plot_no');
  return (data as { id: string; block: string; plot_no: string; size_marla: number; base_price: number }[]) ?? [];
}
