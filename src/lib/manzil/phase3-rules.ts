/** 1 Kanal = 20 Marla. Show sizes the way Pakistani buyers read them. */
export const MARLA_PER_KANAL = 20;
export function formatSize(marla: number | null | undefined): string {
  const m = Number(marla) || 0;
  if (m < MARLA_PER_KANAL) return `${m} Marla`;
  const k = Math.floor(m / MARLA_PER_KANAL);
  const rest = +(m - k * MARLA_PER_KANAL).toFixed(2);
  return rest ? `${k} Kanal ${rest} Marla` : `${k} Kanal`;
}
export function toMarla(value: number, unit: 'marla' | 'kanal'): number {
  return unit === 'kanal' ? value * MARLA_PER_KANAL : value;
}

/** Dealer commission = plot price × lot commission %. Earned once token is paid. */
export const EARNED_STATUSES = ['token_paid', 'completed'] as const;
export function commissionFor(basePrice: number, pct: number): number {
  return Math.round((Number(basePrice) || 0) * (Number(pct) || 0) / 100);
}
export function commissionState(status: string): 'earned' | 'pending' | 'void' {
  if ((EARNED_STATUSES as readonly string[]).includes(status)) return 'earned';
  if (status === 'cancelled' || status === 'rejected') return 'void';
  return 'pending';
}

/** Buyers may ask to cancel only while a booking is still live. */
export function canRequestCancel(status: string): boolean {
  return status === 'pending' || status === 'approved' || status === 'token_paid';
}

export interface FraudAlert { kind: 'double-booking' | 'rapid-bookings' | 'suspicious-price'; severity: 'high' | 'medium'; title: string; detail: string }
const LIVE = new Set(['pending', 'approved', 'token_paid', 'completed']);

export function detectFraud(
  bookings: { id: string; reference_no: string; plot_id: string | null; customer_id: string | null; status: string; created_at: string }[],
  listings: { id: string; title: string; city: string; price: number; plot_size_marla: number; purpose: string }[],
): FraudAlert[] {
  const alerts: FraudAlert[] = [];
  const byPlot = new Map<string, string[]>();
  for (const b of bookings) if (b.plot_id && LIVE.has(b.status)) byPlot.set(b.plot_id, [...(byPlot.get(b.plot_id) ?? []), b.reference_no]);
  for (const refs of byPlot.values()) if (refs.length > 1)
    alerts.push({ kind: 'double-booking', severity: 'high', title: 'Same plot booked more than once', detail: refs.join(', ') });

  const byCustomer = new Map<string, number[]>();
  for (const b of bookings) if (b.customer_id) byCustomer.set(b.customer_id, [...(byCustomer.get(b.customer_id) ?? []), new Date(b.created_at).getTime()]);
  for (const [cid, times] of byCustomer) {
    times.sort((a, b) => a - b);
    for (let i = 0; i + 2 < times.length; i++) if ((times[i + 2] ?? 0) - (times[i] ?? 0) <= 24 * 3600e3) {
      alerts.push({ kind: 'rapid-bookings', severity: 'medium', title: '3+ bookings by one account within 24 hours', detail: `Account ${cid.slice(0, 8)}…` });
      break;
    }
  }

  const sale = listings.filter((l) => l.purpose === 'sale' && l.plot_size_marla > 0 && l.price > 0);
  const avg = new Map<string, { s: number; n: number }>();
  for (const l of sale) { const a = avg.get(l.city) ?? { s: 0, n: 0 }; a.s += l.price / l.plot_size_marla; a.n++; avg.set(l.city, a); }
  for (const l of sale) {
    const a = avg.get(l.city)!;
    if (a.n < 3) continue;
    const rate = l.price / l.plot_size_marla, mean = a.s / a.n;
    if (rate < mean * 0.3) alerts.push({ kind: 'suspicious-price', severity: 'medium', title: 'Price far below the city average', detail: `${l.title} (${l.city})` });
  }
  return alerts;
}
