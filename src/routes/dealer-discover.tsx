import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { createFileRoute } from '@tanstack/react-router';
import { PageFrame, useAppNavigation, pageHead } from '@/components/manzil/PageFrame';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/manzil/auth';
import { fetchMyRequests, fetchSocietySummaries, sendJoinRequest } from '@/lib/manzil/dealer';
import type { SocietySummary } from '@/lib/manzil/types';

/** WBS: Dealer Portal — Society Discovery & Join (5 features) */
function Discover({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { t } = useTranslation('dealer');
  const { session } = useAuth();
  const [societies, setSocieties] = useState<SocietySummary[]>([]);
  const [reqMap, setReqMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [s, r] = await Promise.all([
      fetchSocietySummaries(),
      session ? fetchMyRequests(session.user.id) : Promise.resolve([]),
    ]);
    setSocieties(s);
    const m: Record<string, string> = {};
    r.forEach((x) => (m[x.society_id] = x.status));
    setReqMap(m);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const join = async (sid: string) => {
    if (!session) return;
    try {
      await sendJoinRequest(session.user.id, sid);
      setMsg('Join request sent. Track its status here.');
      load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Request failed');
    }
  };

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <h1>{t('discoverHeading')}</h1>
          <p className="muted" style={{ margin: 0 }}>Browse registered societies & request to join</p>
        </div>
        <Button variant="legacy" className="btn secondary small" onClick={() => onNavigate('dealer')}>Dealer portal</Button>
      </div>
      {msg && <div className="notice" style={{ marginBottom: 12 }}>{msg}</div>}
      {loading ? <p className="muted">Loading…</p> : societies.length === 0 ? (
        <p className="muted">No verified societies yet.</p>
      ) : (
        <div className="hub-grid">
          {societies.map((s) => {
            const st = reqMap[s.id];
            return (
              <div key={s.id} className="hub-card" style={{ cursor: 'default' }}>
                <strong>{s.name}</strong>
                <span className="muted small">{s.email}</span>
                <span className="muted small">
                  {s.plots_available} / {s.plots_total} plots available
                </span>
                {st === 'approved' ? (
                  <span className="badge ok">Approved — view lots in "My Lots"</span>
                ) : st === 'pending' ? (
                  <span className="badge warn">Request pending</span>
                ) : st === 'rejected' ? (
                  <span className="badge warn">Rejected</span>
                ) : (
                  <Button variant="legacy" className="btn small" onClick={() => join(s.id)}>Send join request</Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/dealer-discover")({ head: () => pageHead("Dealer Discover"), component: RoutePage });
function RoutePage() { const onNavigate = useAppNavigation(); return <PageFrame ><Discover onNavigate={onNavigate} /></PageFrame>; }
