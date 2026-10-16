import { describe, it, expect } from 'vitest';
import { visibleToBuyer, filterForViewer } from './sold-visibility';

const now = Date.parse('2026-10-16T12:00:00Z');
const hoursAgo = (h: number) => new Date(now - h * 3600_000).toISOString();

describe('sold visibility for buyers', () => {
  it('shows a sold item within 24 hours', () => {
    expect(visibleToBuyer({ status: 'sold', sold_at: hoursAgo(23) }, now)).toBe(true);
  });
  it('hides a sold item after 24 hours', () => {
    expect(visibleToBuyer({ status: 'sold', sold_at: hoursAgo(25) }, now)).toBe(false);
  });
  it('dealers and society admins still see old sold items', () => {
    const list = [{ status: 'sold', sold_at: hoursAgo(48) }];
    expect(filterForViewer(list, 'dealer', now)).toHaveLength(1);
    expect(filterForViewer(list, 'society_admin', now)).toHaveLength(1);
    expect(filterForViewer(list, 'buyer', now)).toHaveLength(0);
    expect(filterForViewer(list, undefined, now)).toHaveLength(0);
  });
});
