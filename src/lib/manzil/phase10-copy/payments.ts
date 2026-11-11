/** Phase 10 Screen 6 — UI copy via i18n (payments namespace). */
import i18n from '@/lib/i18n';

const t = (key: string, opts?: Record<string, unknown>) =>
  i18n.t(key, { ns: 'payments', ...(opts ?? {}) });

export const PAYMENTS_COPY = {
  get buyerTitle() {
    return t('historyBuyerTitle');
  },
  get societyTitle() {
    return t('historySocietyTitle');
  },
  get subtitle() {
    return t('historySubtitle');
  },
  get myPayments() {
    return t('myPayments');
  },
  get financials() {
    return t('financials');
  },
  get dashboard() {
    return t('dashboard');
  },
  get skipNote() {
    return t('skipNote');
  },
  get loading() {
    return t('loading');
  },
  get empty() {
    return t('emptyHistory');
  },
  get booking() {
    return t('booking');
  },
  get installment() {
    return t('installment');
  },
  get amount() {
    return t('amount');
  },
  get status() {
    return t('status');
  },
  get gatewayRef() {
    return t('gatewayRef');
  },
  get downloadPdf() {
    return t('downloadPdf');
  },
  get downloading() {
    return t('downloading');
  },
  get verifyReceipt() {
    return t('verifyReceipt');
  },
  get verificationHash() {
    return t('verificationHash');
  },
  get checkHash() {
    return t('checkHash');
  },
  get verifiedOk() {
    return t('verifiedOk');
  },
  get verifiedFail() {
    return t('verifiedFail');
  },
  get loadError() {
    return t('loadError');
  },
  get pdfError() {
    return t('pdfError');
  },
} as const;
