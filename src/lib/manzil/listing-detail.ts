import type { Property } from './types';

export const AMENITIES = [
  'Electricity', 'Gas', 'Water', 'Sewerage', 'Boundary wall', 'Gated community', 'Security',
  'Park nearby', 'Mosque nearby', 'School nearby', 'Hospital nearby', 'Market nearby',
  'Corner plot', 'Park facing', 'Main boulevard', 'Possession ready', 'Furnished', 'Parking',
] as const;

const DAY = 24 * 3600e3;
export function freshness(createdAt: string, now = Date.now()): { label: string; isNew: boolean } {
  const days = Math.floor((now - new Date(createdAt).getTime()) / DAY);
  if (days <= 0) return { label: 'Added today', isNew: true };
  if (days === 1) return { label: 'Added yesterday', isNew: true };
  if (days < 30) return { label: `Added ${days} days ago`, isNew: days < 7 };
  const months = Math.floor(days / 30);
  return { label: `Added ${months} month${months > 1 ? 's' : ''} ago`, isNew: false };
}

/** Same city, category and purpose; price within ±30%; closest price first. */
export function similarProperties(p: Property, all: Property[], limit = 4): Property[] {
  return all
    .filter((x) => x.id !== p.id && x.city === p.city && x.category === p.category && x.purpose === p.purpose
      && (!p.price || Math.abs(x.price - p.price) <= p.price * 0.3))
    .sort((a, b) => Math.abs(a.price - p.price) - Math.abs(b.price - p.price))
    .slice(0, limit);
}

/** Featured first, then the chosen order. */
export function featuredFirst<T extends { is_featured?: boolean | null }>(list: T[]): T[] {
  return [...list].sort((a, b) => Number(!!b.is_featured) - Number(!!a.is_featured));
}

export interface SearchFilters { q?: string; city?: string; category?: string; purpose?: string; maxPrice?: number }
export function matchesSearch(p: Property, f: SearchFilters): boolean {
  return (!f.q || `${p.title} ${p.area ?? ''} ${p.society_name ?? ''}`.toLowerCase().includes(f.q.toLowerCase()))
    && (!f.city || p.city === f.city) && (!f.category || p.category === f.category)
    && (!f.purpose || p.purpose === f.purpose) && (!f.maxPrice || p.price <= f.maxPrice);
}
export function newMatches(all: Property[], f: SearchFilters, since: string): Property[] {
  const t = new Date(since).getTime();
  return all.filter((p) => new Date(p.created_at).getTime() > t && matchesSearch(p, f));
}
export function describeSearch(f: SearchFilters): string {
  const parts = [f.purpose === 'rent' ? 'For rent' : f.purpose === 'sale' ? 'For sale' : 'All', f.category, f.city ? `in ${f.city}` : '', f.q ? `"${f.q}"` : '', f.maxPrice ? `up to PKR ${f.maxPrice.toLocaleString()}` : ''];
  return parts.filter(Boolean).join(' · ');
}

export const REPORT_REASONS = ['Wrong price', 'Already sold', 'Fake or duplicate listing', 'Wrong location', 'Misleading photos', 'Other'] as const;
export const MAX_PHOTOS = 10;
