import { Button } from '@/components/ui/button';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { PageFrame, useAppNavigation, pageHead } from '@/components/manzil/PageFrame';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/manzil/auth';
import { fetchApprovedSocieties } from '@/lib/manzil/society';

export function useSocietyId(): { societyId: string | null; societies: { id: string; name: string }[]; setSocietyId: (id: string) => void } {
  const { profile } = useAuth();
  const [societies, setSocieties] = useState<{ id: string; name: string }[]>([]);
  const [societyId, setSocietyId] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.role === 'society_admin') {
      setSocietyId(profile.id);
    } else if (profile?.role === 'super_admin') {
      fetchApprovedSocieties().then((list) => {
        setSocieties(list.map((s) => ({ id: s.id, name: s.name })));
        if (list[0]) setSocietyId(list[0].id);
      });
    }
  }, [profile]);

  return { societyId, societies, setSocietyId };
}

function SocietyHub({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { t } = useTranslation('society');
  const cards = [
    { page: 'society-inventory', titleKey: 'inventoryCard', descKey: 'inventoryDesc' },
    { page: 'society-map', titleKey: 'mapTitle', descKey: 'mapDesc' },
    { page: 'society-dealers', titleKey: 'dealersTitle', descKey: 'dealersDesc' },
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

export const Route = createFileRoute("/society")({ head: () => pageHead("Society"), component: RoutePage });
function RoutePage() { const onNavigate = useAppNavigation(); return <PageFrame ><SocietyHub onNavigate={onNavigate} /></PageFrame>; }
