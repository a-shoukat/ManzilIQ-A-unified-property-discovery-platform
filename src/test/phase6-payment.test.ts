import { describe, expect, it, vi } from 'vitest';
import { payInstallment, PAYMENT_SAVE_DENIED } from '@/lib/manzil/payment';
import { getSupabase } from '@/lib/manzil/supabase';
import type { Payment } from '@/lib/manzil/types';

vi.mock('@/lib/manzil/supabase', () => ({ getSupabase: vi.fn(() => null) }));

const ROW: Payment = {
  id: 'pay-1',
  booking_id: 'book-1',
  customer_id: 'cust-1',
  society_id: 'soc-1',
  amount: 250000,
  method: 'bank',
  proof_url: null,
  status: 'pending',
  verified_by: null,
  verified_at: null,
  rejection_reason: null,
  due_date: '2026-10-11',
  paid_at: null,
  late_fee: 0,
  receipt_no: 'RCP-TEST',
  label: 'Installment 1/1',
  booking_ref: 'BK-TEST',
  created_at: '2026-10-11T00:00:00Z',
} as Payment;

function client(updateReturn: unknown) {
  const afterUpdate = vi.fn().mockResolvedValue(updateReturn);
  const eq = vi.fn(() => ({ select: afterUpdate }));
  const update = vi.fn(() => ({ eq }));
  const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  const from = vi.fn((table: string) =>
    table === 'payments' ? { update } : { select: () => ({ eq: () => ({ maybeSingle }) }) },
  );
  vi.mocked(getSupabase).mockReturnValueOnce({ from } as unknown as NonNullable<ReturnType<typeof getSupabase>>);
  return { update, afterUpdate };
}

describe('Recording a payment (Phase 6)', () => {
  it('fails loudly when the database refuses the write instead of showing a fake success', async () => {
    client({ data: [], error: null });
    await expect(payInstallment(ROW, 'jazzcash', null, 'DEMO-JC-1')).rejects.toThrow(PAYMENT_SAVE_DENIED);
  });

  it('records a wallet payment as pending, never self-confirmed', async () => {
    const { update } = client({ data: [{ id: 'pay-1' }], error: null });
    await payInstallment(ROW, 'jazzcash', null, 'DEMO-JC-1');
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pending', method: 'jazzcash' }),
    );
  });
});
