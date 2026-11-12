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
  get migrations() {
    return t('migrations');
  },
  get migrationOk() {
    return t('migrationOk');
  },
  get migrationPartial() {
    return t('migrationPartial');
  },
  get migrationUnknown() {
    return t('migrationUnknown');
  },
  get migrationHint() {
    return t('migrationHint');
  },
  get missing() {
    return t('missing');
  },
  get live() {
    return t('live');
  },
  get mock() {
    return t('mock');
  },
  get off() {
    return t('off');
  },
  get recentTitle() {
    return t('recentTitle');
  },
  get recentHint() {
    return t('recentHint');
  },
  get noRecent() {
    return t('noRecent');
  },
  get countT3() {
    return t('countT3');
  },
  get countDue() {
    return t('countDue');
  },
  get countOverdue() {
    return t('countOverdue');
  },
  get countEscalated() {
    return t('countEscalated');
  },
} as const;
