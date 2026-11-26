import type { Property } from './types';

/** Client-side test listing detection (no DB column required). */
export function isTestListing(p: Pick<Property, 'title' | 'description' | 'society_name'>): boolean {
  const blob = `${p.title} ${p.description ?? ''} ${p.society_name ?? ''}`.toLowerCase();
  return /\bmuse\s*test\b/.test(blob) || /\btest\s*listing\b/.test(blob) || /\b\[test\]\b/.test(blob);
}

/** Known bad / placeholder photos that should fall back visually. */
export function isFlaggedListingImage(p: Pick<Property, 'title' | 'image_url'>): boolean {
  const title = (p.title ?? '').toLowerCase();
  // Live-test: Al Rahman House used an unrelated swan stock photo.
  if (title.includes('al rahman') && title.includes('house')) return true;
  if (title.includes('al-rahman') && title.includes('house')) return true;
  return false;
}

export function societyDisplayName(name: string | null | undefined, email?: string | null): string {
  const n = (name ?? '').trim();
  if (n && !n.includes('@')) return n;
  const e = (email ?? '').trim();
  if (n && n.includes('@') && e && n === e) return 'Unnamed society';
  if (n) return n;
  return 'Unnamed society';
}
