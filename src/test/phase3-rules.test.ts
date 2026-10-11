import { describe, it, expect } from 'vitest';
import { formatSize, toMarla, commissionFor, commissionState, canRequestCancel, detectFraud } from '@/lib/manzil/phase3-rules';

describe('Kanal unit', () => {
  it('20 Marla is 1 Kanal', () => {
    expect(formatSize(5)).toBe('5 Marla');
    expect(formatSize(20)).toBe('1 Kanal');
    expect(formatSize(30)).toBe('1 Kanal 10 Marla');
    expect(toMarla(2, 'kanal')).toBe(40);
  });
});

describe('dealer commission', () => {
  it('is price × lot %', () => expect(commissionFor(5_000_000, 2)).toBe(100_000));
  it('earned only after token paid', () => {
    expect(commissionState('pending')).toBe('pending');
    expect(commissionState('token_paid')).toBe('earned');
    expect(commissionState('cancelled')).toBe('void');
  });
});

describe('cancellation', () => {
  it('only live bookings can be cancelled', () => {
    expect(canRequestCancel('pending')).toBe(true);
    expect(canRequestCancel('completed')).toBe(false);
    expect(canRequestCancel('cancelled')).toBe(false);
  });
});

describe('fraud alerts', () => {
  const b = (id: string, plot: string, cust: string, h: number, status = 'pending') =>
    ({ id, reference_no: id, plot_id: plot, customer_id: cust, status, created_at: new Date(h * 3600e3).toISOString() });
  it('flags the same plot booked twice', () => {
    const a = detectFraud([b('A', 'p1', 'c1', 0), b('B', 'p1', 'c2', 1)], []);
    expect(a.some((x) => x.kind === 'double-booking')).toBe(true);
  });
  it('ignores a cancelled duplicate', () => {
    expect(detectFraud([b('A', 'p1', 'c1', 0), b('B', 'p1', 'c2', 1, 'cancelled')], [])).toHaveLength(0);
  });
  it('flags 3 bookings within 24h', () => {
    const a = detectFraud([b('A', 'p1', 'c1', 0), b('B', 'p2', 'c1', 5), b('C', 'p3', 'c1', 20)], []);
    expect(a.some((x) => x.kind === 'rapid-bookings')).toBe(true);
  });
});
