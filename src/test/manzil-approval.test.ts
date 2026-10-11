import { describe, expect, it } from 'vitest';
import { canAccessPage, needsApproval } from '@/lib/manzil/access';

describe('client approval workflow', () => {
  it('pending clients cannot book a plot', () => {
    expect(needsApproval('book-plot', 'buyer', 'pending')).toBe(true);
  });
  it('rejected clients can still open their overview to resubmit', () => {
    expect(needsApproval('dashboard', 'buyer', 'rejected')).toBe(false);
  });
  it('approved clients can book', () => {
    expect(needsApproval('book-plot', 'buyer', 'approved')).toBe(false);
  });
  it('super admin is never blocked and can open every admin page', () => {
    expect(needsApproval('admin', 'super_admin', 'pending')).toBe(false);
    for (const p of ['admin', 'admin-verification', 'dealer-analytics', 'my-activity', 'society', 'dealer'])
      expect(canAccessPage(p, 'super_admin')).toBe(true);
  });
});

describe('admin-users access', () => {
  it('only super admin opens the users page', () => {
    expect(canAccessPage('admin-users', 'super_admin')).toBe(true);
    expect(canAccessPage('admin-users', 'buyer')).toBe(false);
  });
});
