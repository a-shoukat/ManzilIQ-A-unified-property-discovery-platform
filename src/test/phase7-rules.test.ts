import { describe, it, expect } from 'vitest';
import { filterBookablePlots, bookingErrorText, PLOT_UNAVAILABLE, dealerLabel, receiptLines } from '@/lib/manzil/booking-rules';

describe('phase 7 rules', () => {
  it('receipt total equals amount actually paid (69.5L + 1.39L fee = 70.89L)', () => {
    expect(receiptLines({ amount: 6950000, late_fee: 139000 }).totalPaid).toBe(7089000);
  });
  it('plot with an active booking is hidden even if its status is still available', () => {
    const plots = [{ id: 'a101', status: 'available' }, { id: 'a102', status: 'available' }];
    expect(filterBookablePlots(plots, ['a101']).map((p) => p.id)).toEqual(['a102']);
  });
  it('reserved and sold plots are hidden', () => {
    const plots = [{ id: 'r', status: 'reserved' }, { id: 's', status: 'sold' }, { id: 'ok', status: 'assigned' }];
    expect(filterBookablePlots(plots, []).map((p) => p.id)).toEqual(['ok']);
  });
  it('database refusal shows "This plot is no longer available"', () => {
    expect(bookingErrorText(new Error('This plot is no longer available'))).toBe(PLOT_UNAVAILABLE);
    expect(bookingErrorText(new Error('other'))).toBeNull();
  });
  it('dealer label never shows "-- (--)"', () => {
    expect(dealerLabel({ name: 'Ali', firm: 'Ali Estates', email: 'a@x.com' })).toBe('Ali — Ali Estates (a@x.com)');
    expect(dealerLabel({ name: null, firm: '—', email: '—' })).toBe('Dealer');
  });
});
