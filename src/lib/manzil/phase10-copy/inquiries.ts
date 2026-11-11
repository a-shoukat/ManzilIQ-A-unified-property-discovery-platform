/** Phase 10 Screen 1 — UI copy via i18n (inquiries namespace). */
import i18n from '@/lib/i18n';

const t = (key: string, opts?: Record<string, unknown>) =>
  i18n.t(key, { ns: 'inquiries', ...(opts ?? {}) });

export const INQUIRY_COPY = {
  get myTitle() {
    return t('myTitle');
  },
  get mySubtitle() {
    return t('mySubtitle');
  },
  get ownerTitle() {
    return t('ownerTitle');
  },
  ownerSubtitle: (n: number) => t('ownerSubtitle', { count: n }),
  get inbox() {
    return t('inbox');
  },
  get dashboard() {
    return t('dashboard');
  },
  get leadsPipeline() {
    return t('leadsPipeline');
  },
  get loading() {
    return t('loading');
  },
  get emptyMine() {
    return t('emptyMine');
  },
  get emptyFilter() {
    return t('emptyFilter');
  },
  get openThread() {
    return t('openThread');
  },
  get hideThread() {
    return t('hideThread');
  },
  get thread() {
    return t('thread');
  },
  get noReplies() {
    return t('noReplies');
  },
  get yourReply() {
    return t('yourReply');
  },
  get reply() {
    return t('reply');
  },
  get sendReply() {
    return t('sendReply');
  },
  get sending() {
    return t('sending');
  },
  get status() {
    return t('status');
  },
  get convertToLead() {
    return t('convertToLead');
  },
  get linkedToLead() {
    return t('linkedToLead');
  },
  get all() {
    return t('all');
  },
  get newBadge() {
    return t('newBadge');
  },
  get filterHint() {
    return t('filterHint');
  },
  get loadError() {
    return t('loadError');
  },
  get replyError() {
    return t('replyError');
  },
  get statusError() {
    return t('statusError');
  },
  get convertError() {
    return t('convertError');
  },
  get convertDealerOnly() {
    return t('convertDealerOnly');
  },
  get convertedMsg() {
    return t('convertedMsg');
  },
  get replySent() {
    return t('replySent');
  },
  statusSet: (s: string) => t('statusSet', { status: s }),
} as const;
