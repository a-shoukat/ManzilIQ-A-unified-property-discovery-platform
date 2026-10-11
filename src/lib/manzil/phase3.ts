import { getSupabase } from './supabase';
import { notify } from './notify';
import { commissionFor, commissionState } from './phase3-rules';
import type { Booking } from './types';

export interface CommissionRow { ref: string; plot: string; price: number; pct: number; amount: number; state: 'earned' | 'pending' | 'void'; date: string }

export async function fetchCommissions(dealerId: string): Promise<CommissionRow[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data: bks, error } = await sb.from('bookings').select('reference_no, plot_id, status, created_at').eq('dealer_id', dealerId).order('created_at', { ascending: false });
  if (error) throw error;
  const list = (bks as { reference_no: string; plot_id: string | null; status: string; created_at: string }[]) ?? [];
  const plotIds = [...new Set(list.map((b) => b.plot_id).filter(Boolean))] as string[];
  const { data: plots } = plotIds.length ? await sb.from('plots').select('id, block, plot_no, base_price, lot_id').in('id', plotIds) : { data: [] };
  const pmap = new Map(((plots as { id: string; block: string; plot_no: string; base_price: number; lot_id: string | null }[]) ?? []).map((p) => [p.id, p]));
  const lotIds = [...new Set([...pmap.values()].map((p) => p.lot_id).filter(Boolean))] as string[];
  const { data: lots } = lotIds.length ? await sb.from('lots').select('id, commission_pct').in('id', lotIds) : { data: [] };
  const lmap = new Map(((lots as { id: string; commission_pct: number }[]) ?? []).map((l) => [l.id, Number(l.commission_pct)]));
  return list.map((b) => {
    const p = b.plot_id ? pmap.get(b.plot_id) : undefined;
    const pct = p?.lot_id ? lmap.get(p.lot_id) ?? 0 : 0;
    const price = Number(p?.base_price ?? 0);
    return { ref: b.reference_no, plot: p ? `${p.block}-${p.plot_no}` : '—', price, pct, amount: commissionFor(price, pct), state: commissionState(b.status), date: b.created_at };
  });
}

export async function fetchFraudInputs() {
  const sb = getSupabase();
  if (!sb) return { bookings: [], listings: [] };
  const [{ data: b }, { data: l }] = await Promise.all([
    sb.from('bookings').select('id, reference_no, plot_id, customer_id, status, created_at').limit(2000),
    sb.from('properties').select('id, title, city, price, plot_size_marla, purpose').limit(2000),
  ]);
  return { bookings: (b ?? []) as never[], listings: ((l ?? []) as { id: string; title: string; city: string; price: number; plot_size_marla: number; purpose: string }[]).map((x) => ({ ...x, price: Number(x.price), plot_size_marla: Number(x.plot_size_marla) })) };
}

/** Buyer asks the society to cancel; the society cancels and the cancellation letter is issued. */
export async function requestCancellation(b: Booking, reason: string): Promise<void> {
  if (!b.society_id) throw new Error('This booking has no society attached');
  await notify(b.society_id, 'Cancellation requested', `Buyer asked to cancel booking ${b.reference_no}. Reason: ${reason || '—'}`, 'cancel_request');
}

export async function sendInquiry(ownerId: string, title: string, from: { name: string; phone: string; email: string }, message: string): Promise<void> {
  await notify(ownerId, `New inquiry: ${title}`, `${from.name} (${from.phone || 'no phone'}, ${from.email}) — ${message}`, 'inquiry');
}

export async function myBookingsForDispute(userId: string) {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb.from('bookings').select('reference_no, plot_id, society_id').or(`customer_id.eq.${userId},dealer_id.eq.${userId},society_id.eq.${userId}`).limit(200);
  return (data as { reference_no: string; plot_id: string | null; society_id: string | null }[]) ?? [];
}
