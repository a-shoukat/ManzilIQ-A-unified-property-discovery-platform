import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enCommon from '@/locales/en/common.json';
import enAuth from '@/locales/en/auth.json';
import enMarketplace from '@/locales/en/marketplace.json';
import enDealer from '@/locales/en/dealer.json';
import enSociety from '@/locales/en/society.json';
import enBooking from '@/locales/en/booking.json';
import enPayments from '@/locales/en/payments.json';
import enLegal from '@/locales/en/legal.json';
import enAdmin from '@/locales/en/admin.json';
import enInquiries from '@/locales/en/inquiries.json';
import enNotifications from '@/locales/en/notifications.json';
import enErrors from '@/locales/en/errors.json';
import enValidation from '@/locales/en/validation.json';

import urCommon from '@/locales/ur/common.json';
import urAuth from '@/locales/ur/auth.json';
import urMarketplace from '@/locales/ur/marketplace.json';
import urDealer from '@/locales/ur/dealer.json';
import urSociety from '@/locales/ur/society.json';
import urBooking from '@/locales/ur/booking.json';
import urPayments from '@/locales/ur/payments.json';
import urLegal from '@/locales/ur/legal.json';
import urAdmin from '@/locales/ur/admin.json';
import urInquiries from '@/locales/ur/inquiries.json';
import urNotifications from '@/locales/ur/notifications.json';
import urErrors from '@/locales/ur/errors.json';
import urValidation from '@/locales/ur/validation.json';

export const SUPPORTED_LANGS = ['en', 'ur'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGS)[number];

export const LANG_STORAGE_KEY = 'manziliq.preferred_language';

export const NAMESPACES = [
  'common',
  'auth',
  'marketplace',
  'dealer',
  'society',
  'booking',
  'payments',
  'legal',
  'admin',
  'inquiries',
  'notifications',
  'errors',
  'validation',
] as const;

export type AppNamespace = (typeof NAMESPACES)[number];

const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
    marketplace: enMarketplace,
    dealer: enDealer,
    society: enSociety,
    booking: enBooking,
    payments: enPayments,
    legal: enLegal,
    admin: enAdmin,
    inquiries: enInquiries,
    notifications: enNotifications,
    errors: enErrors,
    validation: enValidation,
  },
  ur: {
    common: urCommon,
    auth: urAuth,
    marketplace: urMarketplace,
    dealer: urDealer,
    society: urSociety,
    booking: urBooking,
    payments: urPayments,
    legal: urLegal,
    admin: urAdmin,
    inquiries: urInquiries,
    notifications: urNotifications,
    errors: urErrors,
    validation: urValidation,
  },
};

export function isAppLanguage(value: unknown): value is AppLanguage {
  return value === 'en' || value === 'ur';
}

export function readStoredLanguage(): AppLanguage {
  if (typeof window === 'undefined') return 'en';
  try {
    const raw = window.localStorage.getItem(LANG_STORAGE_KEY);
    return isAppLanguage(raw) ? raw : 'en';
  } catch {
    return 'en';
  }
}

export function persistLanguage(lang: AppLanguage) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    /* ignore quota / private mode */
  }
}

export function applyDocumentLanguage(lang: AppLanguage) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.lang = lang === 'ur' ? 'ur' : 'en';
  root.dir = lang === 'ur' ? 'rtl' : 'ltr';
  root.dataset['lang'] = lang;
}

/** Format dates with locale but keep Western digits (latn). */
export function formatAppDate(
  value: Date | string | number,
  lang: AppLanguage,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const locale = lang === 'ur' ? 'ur-PK-u-nu-latn' : 'en-PK-u-nu-latn';
  return new Intl.DateTimeFormat(locale, options).format(date);
}

/** Format numbers with Western digits; thousands separators match en-PK style. */
export function formatAppNumber(
  value: number,
  lang: AppLanguage,
  options?: Intl.NumberFormatOptions,
): string {
  const locale = lang === 'ur' ? 'ur-PK-u-nu-latn' : 'en-PK-u-nu-latn';
  return new Intl.NumberFormat(locale, options).format(value);
}

let initialized = false;

export function initI18n(lang: AppLanguage = 'en') {
  if (initialized) {
    void i18n.changeLanguage(lang);
    applyDocumentLanguage(lang);
    return i18n;
  }
  void i18n.use(initReactI18next).init({
    resources,
    lng: lang,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: [...NAMESPACES],
    interpolation: { escapeValue: false },
    returnNull: false,
    react: { useSuspense: false },
  });
  initialized = true;
  applyDocumentLanguage(lang);
  return i18n;
}

export default i18n;
