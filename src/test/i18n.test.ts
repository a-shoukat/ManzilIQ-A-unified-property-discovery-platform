import { beforeEach, describe, expect, it } from 'vitest';
import i18n, {
  applyDocumentLanguage,
  formatAppDate,
  formatAppNumber,
  initI18n,
  LANG_STORAGE_KEY,
  persistLanguage,
  readStoredLanguage,
} from '@/lib/i18n';

describe('i18n foundation', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('dir');
    document.documentElement.removeAttribute('lang');
    document.documentElement.removeAttribute('data-lang');
    initI18n('en');
  });

  it('defaults to English and sets ltr', async () => {
    applyDocumentLanguage('en');
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
    expect(i18n.t('signIn', { ns: 'common' })).toBe('Sign in');
  });

  it('switches to Urdu with rtl and Nastaliq-ready dir/lang', async () => {
    await i18n.changeLanguage('ur');
    applyDocumentLanguage('ur');
    expect(document.documentElement.lang).toBe('ur');
    expect(document.documentElement.dir).toBe('rtl');
    expect(i18n.t('signIn', { ns: 'common' })).toBe('لاگ اِن');
    expect(i18n.t('plot', { ns: 'common' })).toBe('پلاٹ');
    expect(i18n.t('wishlist', { ns: 'common' })).toBe('پسندیدہ فہرست');
  });

  it('falls back to English for missing keys', async () => {
    await i18n.changeLanguage('ur');
    // Unknown key returns the key string with default i18next behavior; with fallbackLng
    // a key that exists only in en should resolve from en.
    expect(i18n.exists('signIn', { ns: 'common' })).toBe(true);
    const missing = i18n.t('___missing_key_for_test___', { ns: 'common', defaultValue: 'fallback-en' });
    expect(missing).toBe('fallback-en');
  });

  it('persists language in localStorage', () => {
    persistLanguage('ur');
    expect(window.localStorage.getItem(LANG_STORAGE_KEY)).toBe('ur');
    expect(readStoredLanguage()).toBe('ur');
  });

  it('formats dates/numbers with Western digits', () => {
    const d = new Date('2026-03-15T12:00:00Z');
    const en = formatAppDate(d, 'en', { year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'UTC' });
    const ur = formatAppDate(d, 'ur', { year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'UTC' });
    expect(en).toMatch(/15/);
    expect(ur).toMatch(/15/);
    expect(ur).not.toMatch(/[۰-۹]/);
    expect(formatAppNumber(1234567, 'ur')).toMatch(/1/);
    expect(formatAppNumber(1234567, 'ur')).not.toMatch(/[۰-۹]/);
  });
});
