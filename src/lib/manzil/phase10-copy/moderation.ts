/** Phase 10 Screen 2 — UI copy via i18n (admin namespace). */
import i18n from '@/lib/i18n';

const t = (key: string) => i18n.t(key, { ns: 'admin' });

export const MODERATION_COPY = {
  get title() {
    return t('moderationTitle');
  },
  get subtitle() {
    return t('moderationSubtitle');
  },
  get adminHub() {
    return t('adminHub');
  },
  get approvalOff() {
    return t('approvalOff');
  },
  get loading() {
    return t('loading');
  },
  get empty() {
    return t('moderationEmpty');
  },
  get photo() {
    return t('photo');
  },
  get listing() {
    return t('listing');
  },
  get owner() {
    return t('owner');
  },
  get price() {
    return t('price');
  },
  get flags() {
    return t('flags');
  },
  get none() {
    return t('none');
  },
  get rejectReason() {
    return t('rejectReason');
  },
  get approve() {
    return t('approve');
  },
  get reject() {
    return t('reject');
  },
  get open() {
    return t('open');
  },
  get loadError() {
    return t('moderationLoadError');
  },
  get approveError() {
    return t('approveError');
  },
  get rejectError() {
    return t('rejectError');
  },
} as const;
