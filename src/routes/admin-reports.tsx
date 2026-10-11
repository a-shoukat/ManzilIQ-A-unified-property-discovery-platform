import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PageFrame, useAppNavigation, pageHead } from '@/components/manzil/PageFrame';
import { fetchReports, setReportStatus, type ListingReport } from '@/lib/manzil/phase4';
import { errorText } from '@/lib/manzil/errors';

function Reports({ onNavigate }: { onNavigate: (p: string, arg?: string) => void }) {
  const [list, setList] = useState<ListingReport[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = () => fetchReports().then(setList).catch((e) => { setErr(errorText(e, 'Could not load reports')); setList([]); });
  useEffect(() => { void load(); }, []);
  const act = async (id: string, s: 'dismissed' | 'actioned') => { try { await setReportStatus(id, s); toast.success(s === 'dismissed' ? 'Report dismissed' : 'Marked as handled'); void load(); } catch (e) { toast.error(errorText(e, 'Could not update')); } };
  return (
    <div className="page page-full">
      <div className="topbar"><div><h1>Reported listings</h1><p className="muted" style={{ margin: 0 }}>Reports sent by users from property pages.</p></div></div>
      {err && <p className="error">{err}</p>}
      {!list ? <p className="muted">Loading…</p> : list.length === 0 ? <div className="card card-full"><strong>No reports</strong></div> : list.map((r) => (
        <div key={r.id} className="card card-full" style={{ marginBottom: 12 }}>
          <div className="queue-head">
            <div><strong>{r.property_title}</strong><div className="muted small">{r.reason} · {new Date(r.created_at).toLocaleString()}</div>{r.details && <p style={{ margin: '8px 0 0' }}>{r.details}</p>}</div>
            <span className={`badge ${r.status === 'open' ? 'warn' : 'ok'}`}>{r.status}</span>
          </div>
          <div className="link-row">
            <Button size="sm" variant="outline" onClick={() => onNavigate('property', r.property_id)}>Open listing</Button>
            {r.status === 'open' && <><Button size="sm" onClick={() => void act(r.id, 'actioned')}>Mark handled</Button><Button size="sm" variant="ghost" onClick={() => void act(r.id, 'dismissed')}>Dismiss</Button></>}
          </div>
        </div>
      ))}
    </div>
  );
}

export const Route = createFileRoute('/admin-reports')({ head: () => pageHead('Reported Listings'), component: RoutePage });
function RoutePage() { const onNavigate = useAppNavigation(); return <PageFrame><Reports onNavigate={onNavigate} /></PageFrame>; }
