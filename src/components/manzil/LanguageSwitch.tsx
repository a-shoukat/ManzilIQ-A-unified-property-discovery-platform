import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/i18n/LanguageProvider';

/** Compact EN / اردو toggle for the header and account menu. Matches existing ghost button style. */
export function LanguageSwitch({ className }: { className?: string }) {
  const { t } = useTranslation('common');
  const { language, setLanguage } = useLanguage();
  const next = language === 'en' ? 'ur' : 'en';
  const label = language === 'en' ? t('switchToUrdu') : t('switchToEnglish');

  return (
    <Button
      variant="ghost"
      size="sm"
      type="button"
      className={className ?? 'lang-switch'}
      aria-label={t('language')}
      title={t('language')}
      onClick={() => {
        void setLanguage(next);
      }}
    >
      {label}
    </Button>
  );
}
