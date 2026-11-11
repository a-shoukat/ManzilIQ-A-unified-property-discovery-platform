import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { I18nextProvider } from 'react-i18next';
import { getSupabase } from '@/lib/manzil/supabase';
import { useAuth } from '@/lib/manzil/auth';
import i18n, {
  applyDocumentLanguage,
  initI18n,
  isAppLanguage,
  persistLanguage,
  readStoredLanguage,
  type AppLanguage,
} from '@/lib/i18n';

interface LanguageContextValue {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => Promise<void>;
  ready: boolean;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: 'en',
  setLanguage: async () => {},
  ready: false,
});

export function useLanguage() {
  return useContext(LanguageContext);
}

async function savePreferredLanguage(userId: string, lang: AppLanguage) {
  const db = getSupabase();
  if (!db) return;
  // Column may be absent until migration runs — ignore schema errors.
  const { error } = await db
    .from('profiles')
    .update({ preferred_language: lang })
    .eq('id', userId);
  if (error && !/preferred_language|column/i.test(error.message)) {
    console.warn('preferred_language update failed', error.message);
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { session, profile } = useAuth();
  const [language, setLanguageState] = useState<AppLanguage>(() => readStoredLanguage());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initI18n(readStoredLanguage());
    setReady(true);
  }, []);

  // Prefer profile.preferred_language when available; else localStorage (default en).
  useEffect(() => {
    const fromProfile = (profile as { preferred_language?: string } | null)?.preferred_language;
    const next = isAppLanguage(fromProfile) ? fromProfile : readStoredLanguage();
    if (next === language) {
      applyDocumentLanguage(next);
      return;
    }
    setLanguageState(next);
    persistLanguage(next);
    void i18n.changeLanguage(next);
    applyDocumentLanguage(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, (profile as { preferred_language?: string } | null)?.preferred_language]);

  const setLanguage = useCallback(
    async (lang: AppLanguage) => {
      setLanguageState(lang);
      persistLanguage(lang);
      await i18n.changeLanguage(lang);
      applyDocumentLanguage(lang);
      if (session?.user?.id) {
        await savePreferredLanguage(session.user.id, lang);
      }
    },
    [session?.user?.id],
  );

  return (
    <I18nextProvider i18n={i18n}>
      <LanguageContext.Provider value={{ language, setLanguage, ready }}>
        {children}
      </LanguageContext.Provider>
    </I18nextProvider>
  );
}
