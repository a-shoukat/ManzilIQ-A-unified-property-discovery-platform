/** Demo JazzCash / EasyPaisa checkout. No money moves; swap for the real merchant APIs later. */
export type WalletMethod = 'jazzcash' | 'easypaisa';
export const DEMO_OTP = '123456';
/** Wallet numbers ending in 0000 simulate "insufficient balance" so failures can be tested. */
export const DECLINE_SUFFIX = '0000';

export function normalizeMobile(v: string): string {
  const d = v.replace(/\D/g, '');
  if (d.startsWith('92') && d.length === 12) return `0${d.slice(2)}`;
  return d;
}
export function isValidMobile(v: string): boolean { return /^03\d{9}$/.test(normalizeMobile(v)); }
export function isValidCnicLast6(v: string): boolean { return /^\d{6}$/.test(v.trim()); }
export function maskMobile(v: string): string { const m = normalizeMobile(v); return `${m.slice(0, 4)}•••${m.slice(-4)}`; }

export function makeTxnId(method: WalletMethod, now = Date.now()): string {
  const prefix = method === 'jazzcash' ? 'JC' : 'EP';
  return `DEMO-${prefix}-${now.toString(36).toUpperCase()}${Math.floor(Math.random() * 900 + 100)}`;
}

export type ChargeResult = { ok: true; txnId: string } | { ok: false; reason: string };
export function simulateCharge(method: WalletMethod, mobile: string, otp: string): ChargeResult {
  if (otp.trim() !== DEMO_OTP) return { ok: false, reason: 'Incorrect OTP. Please check the code and try again.' };
  if (normalizeMobile(mobile).endsWith(DECLINE_SUFFIX)) return { ok: false, reason: `Insufficient balance in your ${method === 'jazzcash' ? 'JazzCash' : 'EasyPaisa'} account.` };
  return { ok: true, txnId: makeTxnId(method) };
}
