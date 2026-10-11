import { describe, it, expect } from 'vitest';
import { canManageListing, canDeleteListing } from '@/lib/manzil/listing-rules';

describe('listing management', () => {
  const listing = { id: 'p1', owner_id: 'owner' };
  it('owner and super admin can manage; others cannot', () => {
    expect(canManageListing(listing, { id: 'owner', role: 'society_admin' })).toBe(true);
    expect(canManageListing(listing, { id: 'x', role: 'super_admin' })).toBe(true);
    expect(canManageListing(listing, { id: 'x', role: 'buyer' })).toBe(false);
    expect(canManageListing(listing, null)).toBe(false);
  });
  it('reserved or sold listings cannot be deleted', () => {
    expect(canDeleteListing({ status: 'available' })).toBe(true);
    expect(canDeleteListing({ status: 'reserved' })).toBe(false);
    expect(canDeleteListing({ status: 'sold' })).toBe(false);
  });
});
