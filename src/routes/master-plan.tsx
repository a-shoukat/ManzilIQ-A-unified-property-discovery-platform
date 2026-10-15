import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { PageFrame, useAppNavigation, pageHead } from '@/components/manzil/PageFrame';
import { MasterPlanWorkspace } from '@/components/manzil/MasterPlanWorkspace';
import { fetchApprovedSocieties } from '@/lib/manzil/society';
import { useAuth } from '@/lib/manzil/auth';

function MasterPlanViewer() {
  const onNavigate = useAppNavigation();
  const { profile } = useAuth();
  const [societies, setSocieties] = useState<{ id: string; name: string }[]>([]);
  const [id, setId] = useState('');
  useEffect(() => { fetchApprovedSocieties().then((l) => { setSocieties(l); if (l[0]) setId(l[0].id); }); }, []);
  const soc = societies.find((s) => s.id === id);
  return (
    <div className="container">
      <div className="topbar">
        <div><h1>Society master plans</h1><p className="muted" style={{ margin: 0 }}>Live plot availability on each society's official layout</p></div>
        <select className="input" style={{ maxWidth: 280 }} value={id} onChange={(e) => setId(e.target.value)} aria-label="Society">
          {societies.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      {soc ? <MasterPlanWorkspace key={soc.id} societyId={soc.id} societyName={soc.name} editable={false}
        onBook={profile?.role === 'buyer' ? () => onNavigate('book-plot') : profile?.role === 'dealer' ? () => onNavigate('dealer-book') : undefined} />
        : <p className="muted">No societies available yet.</p>}
    </div>
  );
}

export const Route = createFileRoute('/master-plan')({ head: () => pageHead('Society Master Plans'), component: RoutePage });
function RoutePage() { return <PageFrame><MasterPlanViewer /></PageFrame>; }
