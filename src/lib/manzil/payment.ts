import { getSupabase } from './supabase';
import { uploadDocument } from './storage';
import { notify } from './notify';
import { generateDocument } from './legal';
import type { Booking, InstallmentPlan, Payment, PaymentMethod } from '@/lib/manzil/types';

const DEFAULT_PLANS: Record<string, { months: number; downPct: number }> = {
  'Lump sum (full payment)': { months: 1, downPct: 100 },
  '1-year plan': { months: 12, downPct: 20 },
  '3-year plan': { months: 36, downPct: 20 },
  '5-year plan': { months: 60, downPct: 20 },
};

export function makeReceiptNo(): string {
  return `RCP-${Date.now().toString(36).toUpperCase().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`;
}

/** Auto-generate payment schedule for an approved booking. */
export async function generateSchedule(booking: Booking, totalPrice: number): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Database not connected');

  // find society's custom plan by name, else defaults
  let months = 12;
  let downPct = 20;
  const { data: custom } = await supabase
    .from('installment_plans')
    .select('*')
    .eq('society_id', booking.society_id)
    .eq('name', booking.installment_plan ?? '')
    .single();
  if (custom) {
    months = (custom as InstallmentPlan).duration_months;
    downPct = Number((custom as InstallmentPlan).down_payment_pct);
  } else if (booking.installment_plan && DEFAULT_PLANS[booking.installment_plan]) {
    months = DEFAULT_PLANS[booking.installment_plan].months;
    downPct = DEFAULT_PLANS[booking.installment_plan].downPct;
  }

  const down = Math.round((totalPrice * downPct) / 100);
  const rest = totalPrice - down;
  const monthly = months <= 1 ? rest : Math.round(rest / months);

  const rows: Partial<Payment>[] = [];
  const start = new Date();
  if (down > 0) {
    rows.push({
      booking_id: booking.id,
      customer_id: booking.customer_id,
      society_id: booking.society_id,
      amount: down,
      method: 'jazzcash',
      status: 'pending',
      due_date: start.toISOString().slice(0, 10),
      late_fee: 0,
      receipt_no: makeReceiptNo(),
      label: 'Down payment',
    });
  }
  for (let i = 1; i <= months; i++) {
    const d = new Date(start);
    d.setMonth(d.getMonth() + i);
    rows.push({
      booking_id: booking.id,
      customer_id: booking.customer_id,
      society_id: booking.society_id,
      amount: monthly,
      method: 'jazzcash',
      status: 'pending',
      due_date: d.toISOString().slice(0, 10),
      late_fee: 0,
      receipt_no: makeReceiptNo(),
      label: `Installment ${i}/${months}`,
    });
  }
  // token already paid counts toward down payment
  if (booking.token_amount > 0 && rows.length > 0) {
    const first = rows[0].amount ?? 0;
    if (booking.token_amount >= first) {
      rows[0] = { ...rows[0], amount: 0, status: 'confirmed', paid_at: new Date().toISOString() };
    } else {
      rows[0] = { ...rows[0], amount: first - booking.token_amount };
    }
  }

  const { error } = await supabase.from('payments').insert(rows);
  if (error) throw error;
}

/** Late fee: 2% per overdue month on unpaid amount. */
export function calcLateFee(p: Payment): number {
  if (p.status === 'confirmed' || !p.due_date) return 0;
  const due = new Date(p.due_date);
  const now = new Date();
  if (now <= due) return 0;
  const months = Math.max(1, Math.floor((now.getTime() - due.getTime()) / (30 * 24 * 3600 * 1000)));
  return Math.round(p.amount * 0.02 * months);
}

export async function fetchMyPayments(customerId: string): Promise<Payment[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data } = await supabase.from('payments').select('*').eq('customer_id', customerId).order('due_date');
  const list = (data as Payment[]) ?? [];
  for (const p of list) {
    const { data: b } = await supabase.from('bookings').select('reference_no').eq('id', p.booking_id).single();
    p.booking_ref = (b as { reference_no: string } | null)?.reference_no ?? '—';
  }
  return list;
}

export async function payInstallment(
  p: Payment,
  method: PaymentMethod,
  proofFile?: File | null,
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Database not connected');
  let proofUrl: string | null = null;
  if (proofFile) proofUrl = await uploadDocument(proofFile);
  const lateFee = calcLateFee(p);
  const { error } = await supabase
    .from('payments')
    .update({
      method,
      proof_url: proofUrl,
      status: method === 'cash' || method === 'cheque' ? 'pending' : 'confirmed',
      paid_at: new Date().toISOString(),
      late_fee: lateFee,
    })
    .eq('id', p.id);
  if (error) throw error;
  // trigger: payment received → notify society
  if (p.society_id) {
    notify(p.society_id, 'Payment received', `${p.label ?? 'Payment'} of PKR ${p.amount.toLocaleString()} received (${p.booking_ref ?? ''}).`, 'payment_received').catch(() => {});
  }
  // auto-generate installment receipt
  try {
    const { data: b } = await supabase.from('bookings').select('*').eq('id', p.booking_id).single();
    if (b) await generateDocument(b as Booking, 'installment_receipt');
  } catch (e) {
    console.error('receipt gen failed:', e);
  }
}

export async function confirmPayment(id: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Database not connected');
  const { error } = await supabase.from('payments').update({ status: 'confirmed', paid_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function fetchSocietyPayments(societyId: string): Promise<Payment[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data } = await supabase.from('payments').select('*').eq('society_id', societyId).order('due_date');
  const list = (data as Payment[]) ?? [];
  for (const p of list) {
    const { data: b } = await supabase.from('bookings').select('reference_no').eq('id', p.booking_id).single();
    p.booking_ref = (b as { reference_no: string } | null)?.reference_no ?? '—';
  }
  return list;
}

export async function fetchPlans(societyId: string): Promise<InstallmentPlan[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data } = await supabase.from('installment_plans').select('*').eq('society_id', societyId).order('duration_months');
  return (data as InstallmentPlan[]) ?? [];
}

export async function savePlan(societyId: string, input: Partial<InstallmentPlan> & { name: string }): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Database not connected');
  const { error } = await supabase.from('installment_plans').upsert(
    {
      society_id: societyId,
      name: input.name,
      duration_months: input.duration_months ?? 12,
      down_payment_pct: input.down_payment_pct ?? 20,
    },
    { onConflict: 'society_id,name' },
  );
  if (error) throw error;
}

export async function deletePlan(id: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Database not connected');
  const { error } = await supabase.from('installment_plans').delete().eq('id', id);
  if (error) throw error;
}

export interface FinancialSummary {
  collected: number;
  pending: number;
  overdue: number;
  defaulters: { ref: string; amount: number }[];
  commissionPayable: number;
  monthly: { month: string; total: number }[];
}

export async function financialSummary(societyId: string): Promise<FinancialSummary> {
  const payments = await fetchSocietyPayments(societyId);
  let collected = 0;
  let pending = 0;
  let overdue = 0;
  const defMap = new Map<string, number>();
  const monthly = new Map<string, number>();

  for (const p of payments) {
    if (p.status === 'confirmed') {
      collected += p.amount + p.late_fee;
      const m = (p.paid_at ?? p.created_at).slice(0, 7);
      monthly.set(m, (monthly.get(m) ?? 0) + p.amount);
    } else {
      pending += p.amount;
      if (calcLateFee(p) > 0) {
        overdue += p.amount;
        defMap.set(p.booking_ref ?? p.booking_id, (defMap.get(p.booking_ref ?? p.booking_id) ?? 0) + p.amount);
      }
    }
  }

  // commission payable: sum over lots commission % of assigned plot values (approx via payments of dealer bookings)
  const supabase = getSupabase();
  let commissionPayable = 0;
  if (supabase) {
    const { data: lots } = await supabase.from('lots').select('commission_pct, dealer_id').eq('society_id', societyId).eq('status', 'active');
    for (const lot of (lots as { commission_pct: number }[]) ?? []) {
      commissionPayable += Math.round(collected * (Number(lot.commission_pct) / 100));
    }
  }

  return {
    collected,
    pending,
    overdue,
    defaulters: [...defMap.entries()].map(([ref, amount]) => ({ ref, amount })),
    commissionPayable,
    monthly: [...monthly.entries()].map(([month, total]) => ({ month, total })).sort((a, b) => a.month.localeCompare(b.month)).slice(-6),
  };
}
