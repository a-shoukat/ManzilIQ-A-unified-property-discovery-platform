import { Button } from '@/components/ui/button';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { PageFrame, useAppNavigation, pageHead } from '@/components/manzil/PageFrame';
function AdminHub({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { t } = useTranslation('admin');
  const cards = [
    { page: 'admin-verification', titleKey: 'verificationQueue', descKey: 'verificationDesc' },
    { page: 'admin-moderation', titleKey: 'moderation', descKey: 'moderationDesc' },
    { page: 'admin-cms', titleKey: 'cms', descKey: 'cmsDesc' },
    { page: 'admin-audit', titleKey: 'audit', descKey: 'auditDesc' },
    { page: 'admin-status', titleKey: 'status', descKey: 'statusDesc' },
    { page: 'admin-bookings', titleKey: 'bookings', descKey: 'bookingsDesc' },
    { page: 'admin-disputes', titleKey: 'disputes', descKey: 'disputesDesc' },
    { page: 'admin-templates', titleKey: 'templates', descKey: 'templatesDesc' },
    { page: 'admin-analytics', titleKey: 'analytics', descKey: 'analyticsDesc' },
    { page: 'broadcast', titleKey: 'broadcastTitle', descKey: 'broadcastDesc' },
  ];
  return (
    <div className="container">
      <h1>{t('panelTitle')}</h1>
      <p className="muted">{t('panelSubtitle')}</p>
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

export const Route = createFileRoute("/admin")({ head: () => pageHead("Admin"), component: RoutePage });
function RoutePage() { const onNavigate = useAppNavigation(); return <PageFrame ><AdminHub onNavigate={onNavigate} /></PageFrame>; }
