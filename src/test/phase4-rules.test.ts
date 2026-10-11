import { describe, it, expect } from 'vitest';
import { freshness, similarProperties, featuredFirst, matchesSearch, newMatches } from '@/lib/manzil/listing-detail';
import type { Property } from '@/lib/manzil/types';

const base: Property = { id: 'a', title: 'House', city: 'Lahore', area: null, society_name: null, block: null, plot_size_marla: 5, category: 'residential', purpose: 'sale', price: 10_000_000, bedrooms: 3, bathrooms: 2, description: null, image_url: null, status: 'available', owner_id: null, created_at: '2026-10-01T00:00:00Z' };
const mk = (o: Partial<Property>): Property => ({ ...base, ...o });
const now = new Date('2026-10-11T00:00:00Z').getTime();

describe('freshness', () => {
  it('under 7 days is New', () => expect(freshness('2026-10-08T00:00:00Z', now)).toEqual({ label: 'Added 3 days ago', isNew: true }));
  it('10 days is not New', () => expect(freshness('2026-10-01T00:00:00Z', now).isNew).toBe(false));
});

describe('similar properties', () => {
  it('same city/category/purpose within ±30% price', () => {
    const all = [base, mk({ id: 'b', price: 12_000_000 }), mk({ id: 'c', price: 14_000_000 }), mk({ id: 'd', city: 'Karachi' }), mk({ id: 'e', purpose: 'rent' })];
    expect(similarProperties(base, all).map((p) => p.id)).toEqual(['b']);
  });
});

describe('featured', () => {
  it('featured listings come first', () => expect(featuredFirst([{ id: 1 }, { id: 2, is_featured: true }]).map((x) => x.id)).toEqual([2, 1]));
});

describe('saved search alerts', () => {
  it('only counts new matching listings', () => {
    const all = [mk({ id: 'old' }), mk({ id: 'new', created_at: '2026-10-10T00:00:00Z' }), mk({ id: 'other', city: 'Karachi', created_at: '2026-10-10T00:00:00Z' })];
    expect(newMatches(all, { city: 'Lahore' }, '2026-10-05T00:00:00Z').map((p) => p.id)).toEqual(['new']);
    expect(matchesSearch(base, { maxPrice: 5_000_000 })).toBe(false);
  });
});
