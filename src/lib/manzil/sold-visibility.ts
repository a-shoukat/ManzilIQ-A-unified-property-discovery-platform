import type { UserRole } from './types';

/** How long a sold listing stays visible (marked SOLD) to buyers. */
export const SOLD_GRACE_MS = 24 * 60 * 60 * 1000;

/** Guests and buyers get the filtered view; society admins, dealers and admins see everything. */
export function isBuyerView(role: UserRole | null | undefined): boolean {
  return !role || role === 'buyer';
}

type SoldLike = { status: string; sold_at?: string | null };

/** Sold items are shown for 24h after sold_at, then hidden. Sold items with no timestamp (legacy) stay visible. */
export function visibleToBuyer(item: SoldLike, now: number = Date.now()): boolean {
  if (item.status !== 'sold') return true;
  if (!item.sold_at) return true;
  const t = new Date(item.sold_at).getTime();
  if (Number.isNaN(t)) return true;
  return now - t < SOLD_GRACE_MS;
}

/** Apply buyer-side sold filtering only when the viewer is a buyer or guest. Never use for the master-plan map. */
export function filterForViewer<T extends SoldLike>(list: T[], role: UserRole | null | undefined, now: number = Date.now()): T[] {
  return isBuyerView(role) ? list.filter((i) => visibleToBuyer(i, now)) : list;
}
