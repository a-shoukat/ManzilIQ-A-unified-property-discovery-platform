/** Phase 10 Screen 4 — UI copy via i18n (admin namespace). */
import i18n from '@/lib/i18n';

const t = (key: string, opts?: Record<string, unknown>) =>
  i18n.t(key, { ns: 'admin', ...(opts ?? {}) });

export const AUDIT_COPY = {
  get title() {
    return t('auditTitle');
  },
  subtitle: (filtered: number, loaded: number) =>
    t('auditSubtitle', { filtered, loaded }),
  get exportCsv() {
    return t('exportCsv');
  },
  get adminHub() {
    return t('adminHub');
  },
  get table() {
    return t('tableEntity');
  },
  get user() {
    return t('userActorId');
  },
  get action() {
    return t('action');
  },
  get from() {
    return t('from');
  },
  get to() {
    return t('to');
  },
  get loading() {
    return t('loading');
  },
  get empty() {
    return t('auditEmpty');
  },
  get when() {
    return t('when');
  },
  get actor() {
    return t('actor');
  },
  get entity() {
    return t('entity');
  },
  get expand() {
    return t('expand');
  },
  get hide() {
    return t('hide');
  },
  get old() {
    return t('old');
  },
  get new() {
    return t('new');
  },
  get previous() {
    return t('previous');
  },
  get next() {
    return t('next');
  },
  page: (p: number, pages: number) => t('pageOf', { page: p, pages }),
  get loadError() {
    return t('auditLoadError');
  },
} as const;
