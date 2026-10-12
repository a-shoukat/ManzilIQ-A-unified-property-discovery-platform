/** Booking statuses that hold a plot — no one else may book it. */
export const ACTIVE_BOOKING_STATUSES = ['pending', 'approved', 'token_paid', 'completed'] as const;

export const PLOT_UNAVAILABLE = 'This plot is no longer available';

/** Plot statuses a buyer or dealer may still book. */
export const BOOKABLE_PLOT_STATUSES = ['available', 'assigned'];

/** Keep only plots that are bookable and not held by an active booking (even if plot status is stale). */
export function filterBookablePlots<T extends { id: string; status?: string }>(plots: T[], heldPlotIds: Iterable<string>): T[] {
  const held = new Set(heldPlotIds);
  return plots.filter((p) => !held.has(p.id) && (p.status === undefined || BOOKABLE_PLOT_STATUSES.includes(p.status)));
}

/** Map a database refusal for a taken plot to the clear user-facing message. */
export function bookingErrorText(err: unknown): string | null {
  const msg = err instanceof Error ? err.message : (err as { message?: string } | null)?.message ?? '';
  return msg.toLowerCase().includes('no longer available') ? PLOT_UNAVAILABLE : null;
}

/** "Name — Firm (email)" for a dealer dropdown, skipping missing parts. */
export function dealerLabel(d: { name?: string | null; firm?: string | null; email?: string | null }): string {
  const clean = (v?: string | null) => (v && v.trim() && v !== '—' ? v.trim() : '');
  const head = [clean(d.name), clean(d.firm)].filter(Boolean).join(' — ') || 'Dealer';
  return clean(d.email) ? `${head} (${clean(d.email)})` : head;
}

/** Receipt lines: the headline amount is always what was actually paid (installment + late fee). */
export function receiptLines(p: { amount: number; late_fee: number }) {
  const installment = Number(p.amount || 0);
  const lateFee = Number(p.late_fee || 0);
  return { installment, lateFee, totalPaid: installment + lateFee };
}

/** Readable plot label: "Plot A-101 · Block A · Dream Gardens". Avoids repeating the block when plot_no already starts with it. */
export function plotLabel(plotNo: string, block: string | null | undefined, society?: string | null): string {
  const parts = [`Plot ${plotNo}`];
  if (block) parts.push(`Block ${block}`);
  if (society) parts.push(society);
  return parts.join(' · ');
}
