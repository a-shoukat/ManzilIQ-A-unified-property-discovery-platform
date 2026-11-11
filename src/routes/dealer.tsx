import { Button } from '@/components/ui/button';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { PageFrame, useAppNavigation, pageHead } from '@/components/manzil/PageFrame';
import { useAuth } from '@/lib/manzil/auth';

function DealerHub({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { t } = useTranslation('dealer');
  const { profile } = useAuth();
  void profile;
  const cards = [
    { page: 'dealer-discover', titleKey: 'discoverTitle', descKey: 'discoverDesc' },
    { page: 'dealer-lots', titleKey: 'lotsTitle', descKey: 'lotsDesc' },
    { page: 'dealer-leads', titleKey: 'leadsTitle', descKey: 'leadsDesc' },
  ];
  return (
    <div className="container">
      <h1>{t('hubTitle')}</h1>
      <p className="muted">{t('hubSubtitle')}</p>
      <div className="hub-grid">
        {cards.map((c) => (
          <Button variant="legacy" key={c.page} className="hub-card" onClick={() => onNavigate(c.page)}>
            <strong>{t(c.titleKey)}</strong>
            <span className="muted small">{t(c.descKey)}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/dealer")({ head: () => pageHead("Dealer"), component: RoutePage });
function RoutePage() { const onNavigate = useAppNavigation(); return <PageFrame ><DealerHub onNavigate={onNavigate} /></PageFrame>; }
