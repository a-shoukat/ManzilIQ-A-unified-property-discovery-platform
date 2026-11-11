/** Phase 10 Screen 3 — UI copy via i18n (admin namespace). */
import i18n from '@/lib/i18n';

const t = (key: string, opts?: Record<string, unknown>) =>
  i18n.t(key, { ns: 'admin', ...(opts ?? {}) });

export const CMS_COPY = {
  get title() {
    return t('cmsTitle');
  },
  get subtitle() {
    return t('cmsSubtitle');
  },
  get preview() {
    return t('preview');
  },
  get hidePreview() {
    return t('hidePreview');
  },
  get reset() {
    return t('resetDefault');
  },
  get adminHub() {
    return t('adminHub');
  },
  get homepageNote() {
    return t('homepageNote');
  },
  get loading() {
    return t('loading');
  },
  get siteContent() {
    return t('siteContent');
  },
  get saveContent() {
    return t('saveContent');
  },
  banners: (n: number) => t('bannersCount', { count: n }),
  get noBanners() {
    return t('noBanners');
  },
  get addBanner() {
    return t('addBanner');
  },
  get toggleActive() {
    return t('toggleActive');
  },
  get delete() {
    return t('delete');
  },
  get titleField() {
    return t('titleField');
  },
  get sortOrder() {
    return t('sortOrder');
  },
  get subtitleField() {
    return t('subtitleField');
  },
  get href() {
    return t('href');
  },
  get image() {
    return t('image');
  },
  get active() {
    return t('active');
  },
  get add() {
    return t('addBanner');
  },
  get saving() {
    return t('saving');
  },
  get loadError() {
    return t('cmsLoadError');
  },
} as const;
