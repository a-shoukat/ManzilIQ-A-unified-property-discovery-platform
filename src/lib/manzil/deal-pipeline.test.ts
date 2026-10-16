import { describe, expect, it } from 'vitest';
import { autoStage, dealStage, filterByLabel, leadLabelOf, stageName } from './deal-pipeline';

const base = { docTypes: [] as string[], allPaid: false };

describe('deal pipeline', () => {
  it('new booking is stage 1 Inquiry received', () => {
    expect(autoStage({ ...base, status: 'pending' })).toBe(1);
    expect(stageName(1)).toBe('Inquiry received');
  });
  it('token paid advances to stage 3', () => {
    expect(autoStage({ ...base, status: 'token_paid' })).toBe(3);
  });
  it('sale agreement after token is stage 4', () => {
    expect(autoStage({ ...base, status: 'token_paid', docTypes: ['sale_agreement'] })).toBe(4);
  });
  it('all payments paid is stage 5', () => {
    expect(autoStage({ ...base, status: 'token_paid', allPaid: true })).toBe(5);
  });
  it('completed booking is stage 6 Transfer request sent', () => {
    expect(autoStage({ ...base, status: 'completed' })).toBe(6);
    expect(stageName(6)).toBe('Transfer request sent');
  });
  it('manual site-visit override wins over lower auto stage', () => {
    expect(dealStage({ ...base, status: 'approved', manualStage: 2 })).toBe(2);
  });
  it('manual override never lowers the auto stage', () => {
    expect(dealStage({ ...base, status: 'completed', manualStage: 2 })).toBe(6);
  });
});

describe('lead labels', () => {
  const leads = [{ label: 'hot' }, { label: null, status: 'warm' }, { label: 'cold' }, { label: null, status: 'new' }];
  it('filters by Hot', () => expect(filterByLabel(leads, 'hot')).toHaveLength(1));
  it('legacy warm status counts as Warm label', () => expect(leadLabelOf(leads[1])).toBe('warm'));
  it('all returns every lead', () => expect(filterByLabel(leads, 'all')).toHaveLength(4));
});
