import { describe, it, expect } from 'vitest';
import { firstDueDate, receiptTotal, canPay } from '@/lib/manzil/payment-rules';
import { assignablePlots } from '@/lib/manzil/plot-rules';
import { compareKey } from '@/lib/manzil/compare';
import type { Plot } from '@/lib/manzil/types';

const plot = (id: string, status: Plot['status'], lot_id: string | null = null) =>
  ({ id, status, lot_id, block: 'A', plot_no: id } as Plot);

describe('phase 1 rules', () => {
  it('first installment is due 30 days after booking', () => {
    expect(firstDueDate(new Date('2026-10-11T00:00:00Z')).toISOString().slice(0, 10)).toBe('2026-11-10');
  });
  it('receipt total is amount paid plus late fee', () => {
    expect(receiptTotal({ amount: 7090000, late_fee: 140000 })).toBe(7230000);
  });
  it('no Pay button on PKR 0 rows', () => {
    expect(canPay({ amount: 0 })).toBe(false);
    expect(canPay({ amount: 500 })).toBe(true);
  });
  it('assign-lot excludes reserved, sold and booked plots', () => {
    const out = assignablePlots([plot('1', 'available'), plot('2', 'reserved'), plot('3', 'sold'), plot('4', 'available')], new Set(['4']));
    expect(out.map((p) => p.id)).toEqual(['1']);
  });
  it('compare list is stored per account', () => {
    expect(compareKey('u1')).not.toBe(compareKey('u2'));
  });
});
