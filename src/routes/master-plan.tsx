import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageFrame, useAppNavigation, pageHead } from '@/components/manzil/PageFrame';
import { MasterPlanWorkspace } from '@/components/manzil/MasterPlanWorkspace';
import { fetchApprovedSocieties } from '@/lib/manzil/society';
import { useAuth } from '@/lib/manzil/auth';

function MasterPlanViewer() {
  const { t } = useTranslation(['society', 'common']);
  const onNavigate = useAppNavigation();
  const { profile, session } = useAuth();
  const [societies, setSocieties] = useState<{ id: string; name: string }[]>([]);
  const [id, setId] = useState('');
  useEffect(() => { fetchApprovedSocieties().then((l) => { setSocieties(l); if (l[0]) setId(l[0].id); }); }, []);
  const soc = societies.find((s) => s.id === id);
  const onBook = !session
    ? () => onNavigate('login')
    : profile?.role === 'buyer'
      ? () => onNavigate('book-plot')
      : profile?.role === 'dealer'
        ? () => onNavigate('dealer-book')
        : undefined;
  return (
    <div className="container">
      <div className="topbar">
        <div>
          <h1>{t('society:masterPlansPublicTitle', { defaultValue: 'Society master plans' })}</h1>
          <p className="muted" style={{ margin: 0 }}>
            {t('society:masterPlansPublicSubtitle', { defaultValue: 'Live plot availability on each society’s official layout' })}
          </p>
        </div>
        <select className="input" style={{ maxWidth: 280 }} value={id} onChange={(e) => setId(e.target.value)} aria-label={t('common:society', { defaultValue: 'Society' })}>
          {societies.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      {soc ? (
        <MasterPlanWorkspace
          key={soc.id}
          societyId={soc.id}
          societyName={soc.name}
          editable={false}
          {...(onBook ? { onBook } : {})}
        />
      ) : (
        <p className="muted">{t('society:noSocietiesYet', { defaultValue: 'No societies available yet.' })}</p>
      )}
    </div>
  );
}

export const Route = createFileRoute('/master-plan')({ head: () => pageHead('Society Master Plans'), component: RoutePage });
function RoutePage() { return <PageFrame publicPage><MasterPlanViewer /></PageFrame>; }
