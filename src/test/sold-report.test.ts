import { describe, it, expect } from 'vitest';
import { buildSoldReport, buildSoldTranscript } from '@/lib/manzil/sold-report';
const b = { id: '1', reference_no: 'BK-1', plot_id: 'p', customer_id: 'c', dealer_id: 'd', society_id: 's', channel: 'dealer', token_amount: 500000, installment_plan: '1-year plan', status: 'completed', created_at: '2026-01-01', plot_no: '101', plot_block: 'A', plot_size_marla: 10, plot_price: 10000000, society_name: 'DHA Lahore', customer_name: 'Ali' } as never;
describe('sold report', () => {
  it('commission = price × lot %', () => { const r = buildSoldReport(b, { commissionPct: 2 }); expect(r.commissionAmount).toBe(200000); expect(r.commissionPct).toBe(2); });
  it('direct sale has no commission', () => { const r = buildSoldReport({ ...(b as object), channel: 'direct', dealer_id: null } as never, { commissionPct: 2 }); expect(r.commissionAmount).toBe(0); });
  it('transcript uses PKR and marla', () => { const t = buildSoldTranscript(buildSoldReport(b, {})); expect(t).toContain('PKR 10,000,000'); expect(t).toContain('10 marla'); });
});
