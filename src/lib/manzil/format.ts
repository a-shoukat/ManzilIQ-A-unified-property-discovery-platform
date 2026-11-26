import { plotOptionLabel } from './bookable-plots';

/** Middle-dot separator for display labels (Buyer · Dashboard). */
export const MID_DOT = ' · ';

/** Strip trailing .0 / .00 from numeric display strings. */
export function trimTrailingZero(n: number, digits: number): string {
  return n
    .toFixed(digits)
    .replace(/(\.\d*?[1-9])0+$/, '$1')
    .replace(/\.0+$/, '');
}

/** PKR Lakh/Cr formatter — no trailing .0. */
export function formatPkr(n: number): string {
  const v = Number(n) || 0;
  if (v >= 10_000_000) return `PKR ${trimTrailingZero(v / 10_000_000, 2)} Cr`;
  if (v >= 100_000) return `PKR ${trimTrailingZero(v / 100_000, 1)} Lakh`;
  return `PKR ${Math.round(v).toLocaleString('en-PK')}`;
}

/** DD MMM YYYY */
export function formatDate(value: string | Date | null | undefined): string {
  if (value == null || value === '') return 'N/A';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** DD MMM YYYY, h:mm AM/PM (no seconds). */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (value == null || value === '') return 'N/A';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return 'N/A';
  const date = formatDate(d);
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${date}, ${time}`;
}

const STATUS_LABELS: Record<string, string> = {
  in_review: 'In review',
  token_paid: 'Token paid',
  society_admin: 'Society admin',
  super_admin: 'Super admin',
  free: 'Free',
  active: 'Active',
  expired: 'Expired',
  cancelled: 'Cancelled',
  canceled: 'Cancelled',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  available: 'Available',
  reserved: 'Reserved',
  sold: 'Sold',
  assigned: 'Assigned',
  blocked: 'Blocked',
  open: 'Open',
  resolved: 'Resolved',
  escalated: 'Escalated',
};

/** Display-layer status labels (in_review → In review). */
export function formatStatusLabel(status: string | null | undefined): string {
  if (!status) return 'N/A';
  const key = status.trim().toLowerCase();
  if (STATUS_LABELS[key]) return STATUS_LABELS[key];
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Trim + collapse spaces + title-case city for filters/estimator. */
export function normalizeCity(city: string | null | undefined): string {
  const raw = String(city ?? '').trim().replace(/\s+/g, ' ');
  if (!raw) return '';
  return raw
    .split(' ')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(' ');
}

/** Sentence case for short display labels. */
export function sentenceCase(s: string): string {
  const t = s.trim().replace(/_/g, ' ');
  if (!t) return '';
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

/** Title case words (Buyer Dashboard). */
export function titleCase(s: string): string {
  return s
    .trim()
    .replace(/_/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/** "Plot A-101" without duplicating block when plot_no already includes it. */
export function formatPlotHeading(p: { block: string; plot_no: string }): string {
  return `Plot ${plotOptionLabel(p)}`;
}

/** Size with a real space: "5 Marla" (never "5Marla" / "5M"). */
export function formatMarla(size: number | null | undefined): string {
  const n = Number(size) || 0;
  return `${trimTrailingZero(n, 2)} Marla`;
}

/** Join display parts with middle dots, skipping empties. */
export function joinDisplay(...parts: Array<string | null | undefined>): string {
  return parts.map((p) => (p ?? '').trim()).filter(Boolean).join(MID_DOT);
}
