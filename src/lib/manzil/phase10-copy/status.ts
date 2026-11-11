/** Phase 10 Screen 7 — UI copy via i18n (admin namespace). */
import i18n from '@/lib/i18n';

const t = (key: string) => i18n.t(key, { ns: 'admin' });

export const STATUS_COPY = {
  get title() {
    return t('statusTitle');
  },
  get subtitle() {
    return t('statusSubtitle');
  },
  get adminHub() {
    return t('adminHub');
  },
  get loading() {
    return t('loading');
  },
  get mode() {
    return t('mode');
  },
  get integrations() {
    return t('integrations');
  },
  get integration() {
    return t('integration');
  },
  get status() {
    return t('statusCol');
  },
  get active() {
    return t('activeLower');
  },
  get inactive() {
    return t('inactiveLower');
  },
  get lastReminder() {
    return t('lastReminder');
  },
  get noReminder() {
    return t('noReminder');
  },
  get kind() {
    return t('kind');
  },
  get when() {
    return t('when');
  },
  get failedTitle() {
    return t('failedTitle');
  },
  get failedHint() {
    return t('failedHint');
  },
  get noFailed() {
    return t('noFailed');
  },
  get channel() {
    return t('channel');
  },
  get user() {
    return t('user');
  },
  get detail() {
    return t('detail');
  },
  get loadError() {
    return t('statusLoadError');
  },
} as const;
