import type { Payment, Plot } from './types';
/** First payment falls due 30 days after booking, never the same day. */
export function firstDueDate(bookedAt: Date): Date {
  const d = new Date(bookedAt);
  d.setDate(d.getDate() + 30);
  return d;
}
/** Total printed on the receipt: amount paid in the transaction plus any late fee. */
export function receiptTotal(p: Pick<Payment, 'amount' | 'late_fee'>): number {
  return Number(p.amount || 0) + Number(p.late_fee || 0);
}
/** No Pay button for zero-amount rows (e.g. lump-sum placeholder) or rows already paid. */
export function canPay(p: Pick<Payment, 'amount' | 'paid_at'>): boolean {
  return Number(p.amount) > 0 && !p.paid_at;
}
export type { Plot };
