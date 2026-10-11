import { describe, it, expect } from 'vitest';
import { isValidMobile, isValidCnicLast6, simulateCharge, normalizeMobile, DEMO_OTP } from '@/lib/manzil/mock-gateway';

describe('demo wallet checkout', () => {
  it('accepts Pakistani mobile numbers only', () => {
    expect(isValidMobile('0300-1234567')).toBe(true);
    expect(isValidMobile('+92 300 1234567')).toBe(true);
    expect(normalizeMobile('+923001234567')).toBe('03001234567');
    expect(isValidMobile('0423456789')).toBe(false);
  });
  it('JazzCash needs last 6 CNIC digits', () => {
    expect(isValidCnicLast6('123456')).toBe(true);
    expect(isValidCnicLast6('12345')).toBe(false);
  });
  it('wrong OTP fails', () => expect(simulateCharge('jazzcash', '03001234567', '000000').ok).toBe(false));
  it('number ending 0000 is declined', () => expect(simulateCharge('easypaisa', '03001230000', DEMO_OTP).ok).toBe(false));
  it('correct OTP succeeds with a demo transaction id', () => {
    const r = simulateCharge('jazzcash', '03001234567', DEMO_OTP);
    expect(r.ok && r.txnId.startsWith('DEMO-JC-')).toBe(true);
  });
});
