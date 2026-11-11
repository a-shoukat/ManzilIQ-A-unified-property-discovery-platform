/** Phase 10 Screen 5 — UI copy via i18n (notifications namespace). */
import i18n from '@/lib/i18n';

const t = (key: string) => i18n.t(key, { ns: 'notifications' });

export const NOTIF_PREFS_COPY = {
  get title() {
    return t('prefsTitle');
  },
  get subtitle() {
    return t('prefsSubtitle');
  },
  get profileLink() {
    return t('profileLink');
  },
  get inboxLink() {
    return t('inboxLink');
  },
  get loading() {
    return t('loading');
  },
  get channels() {
    return t('channels');
  },
  get events() {
    return t('events');
  },
  get save() {
    return t('savePrefs');
  },
  get saving() {
    return t('saving');
  },
  get saved() {
    return t('saved');
  },
  get loadError() {
    return t('loadError');
  },
  get saveError() {
    return t('saveError');
  },
  get channelLabels() {
    return {
      in_app: t('channelInApp'),
      email: t('channelEmail'),
      sms: t('channelSms'),
      push: t('channelPush'),
    } as const;
  },
} as const;
