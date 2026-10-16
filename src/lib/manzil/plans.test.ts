import { describe, expect, it } from 'vitest';
import { canUse, effectivePlan, getPlan, type SubscriptionRow } from './plans';

const now = new Date('2026-10-16T00:00:00Z');
const sub = (plan_id: string, end: string, status: SubscriptionRow['status'] = 'active'): SubscriptionRow => ({ user_id: 'u', role: 'x', plan_id, status, current_period_start: '2026-09-16T00:00:00Z', current_period_end: end });

describe('plans', () => {
  it('prices match the demo price list', () => {
    expect(getPlan('buyer_plus')?.price).toBe(499);
    expect(getPlan('dealer_pro')?.price).toBe(1499);
    expect(getPlan('society_growth')?.price).toBe(4999);
    expect(getPlan('society_enterprise')?.price).toBe(14999);
  });
  it('free buyer cannot use saved-search alerts', () => {
    expect(canUse('saved_search_alerts', 'buyer', null, now)).toBe(false);
  });
  it('active Buyer Plus unlocks saved-search alerts', () => {
    expect(canUse('saved_search_alerts', 'buyer', sub('buyer_plus', '2026-11-01T00:00:00Z'), now)).toBe(true);
  });
  it('expired paid plan downgrades to Free and flags expiry', () => {
    const r = effectivePlan('dealer', sub('dealer_pro', '2026-10-01T00:00:00Z'), now);
    expect(r.plan?.id).toBe('dealer_free');
    expect(r.expired).toBe(true);
    expect(canUse('lead_crm', 'dealer', sub('dealer_pro', '2026-10-01T00:00:00Z'), now)).toBe(false);
  });
  it('cancelled plan locks features', () => {
    expect(canUse('master_plan_map', 'society_admin', sub('society_growth', '2026-11-01T00:00:00Z', 'cancelled'), now)).toBe(false);
  });
  it('super admin always has full access', () => {
    expect(canUse('api_access', 'super_admin', null, now)).toBe(true);
  });
  it('growth does not include API access but enterprise does', () => {
    expect(canUse('api_access', 'society_admin', sub('society_growth', '2026-11-01T00:00:00Z'), now)).toBe(false);
    expect(canUse('api_access', 'society_admin', sub('society_enterprise', '2026-11-01T00:00:00Z'), now)).toBe(true);
  });
});
