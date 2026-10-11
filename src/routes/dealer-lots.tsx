import { Button } from '@/components/ui/button';
import { createFileRoute } from '@tanstack/react-router';
import { PageFrame, useAppNavigation, pageHead } from '@/components/manzil/PageFrame';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/manzil/auth';
import { fetchLotPlots, fetchMyLots, markShowing, releasePlot } from '@/lib/manzil/dealer';
import { formatPrice } from '@/lib/manzil/properties';
import type { Lot, Plot } from '@/lib/manzil/types';

/** WBS: Dealer Portal — Plot Inventory / Lot View (5 features) */
function MyLots({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { session } = useAuth();
  const [lots, setLots] = useState<Lot[]>([]);
  const [openLot, setOpenLot] = useState<string | null>(null);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showingFor, setShowingFor] = useState<string | null>(null);
  const [clientName, setClientName] = useState('');

  const load = async () => {
    if (!session) return;
    setLoading(true);
    setLots(await fetchMyLots(session.user.id));
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openPlots = async (lotId: string) => {
    if (openLot === lotId) {
      setOpenLot(null);
      return;
    }
    setOpenLot(lotId);
    setPlots(await fetchLotPlots(lotId));
  };

  const doMarkShowing = async (p: Plot) => {
    if (showingFor !== p.id) {
      setShowingFor(p.id);
      setClientName(p.showing_client ?? '');
      return;
    }
    await markShowing(p.id, clientName.trim() || null);
    setShowingFor(null);
    if (openLot) setPlots(await fetchLotPlots(openLot));
  };

  const doRelease = async (p: Plot) => {
    if (!confirm(`Release plot ${p.block}-${p.plot_no} back to society?`)) return;
    await releasePlot(p.id);
    if (openLot) setPlots(await fetchLotPlots(openLot));
    load();
  };

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <h1>My lots & plots</h1>
          <p className="muted" style={{ margin: 0 }}>Only your assigned plots</p>
        </div>
        <Button variant="legacy" className="btn secondary small" onClick={() => onNavigate('dealer')}>Dealer portal</Button>
      </div>

      {loading ? <p className="muted">Loading…</p> : lots.length === 0 ? (
        <div className="card">
          <p className="muted">No lots assigned yet. Discover societies and send a join request first.</p>
          <Button variant="legacy" className="btn small" onClick={() => onNavigate('dealer-discover')}>Discover societies</Button>
        </div>
      ) : (
        lots.map((lot) => (
          <div key={lot.id} className="card wide" style={{ marginBottom: 16 }}>
            <div className="queue-head">
              <div>
                <strong>{lot.name}</strong>
                <div className="muted small">
                  {lot.plot_count} plots · {lot.commission_pct}% commission
                  {lot.expires_at ? ` · expires ${lot.expires_at}` : ''}
                </div>
              </div>
              <Button variant="legacy" className="btn secondary small" onClick={() => openPlots(lot.id)}>
                {openLot === lot.id ? 'Hide plots' : 'View plots'}
              </Button>
            </div>
            {openLot === lot.id && (
              <div className="table-wrap" style={{ marginTop: 12 }}>
                <table className="data-table">
                  <thead><tr><th>Plot</th><th>Size</th><th>Price</th><th>Status</th><th>Showing to</th><th></th></tr></thead>
                  <tbody>
                    {plots.map((p) => (
                      <tr key={p.id}>
                        <td>{p.block}-{p.plot_no}</td>
                        <td>{p.size_marla} M</td>
                        <td>{formatPrice(p.base_price)}</td>
                        <td><span className={`badge ${p.status === 'assigned' ? 'ok' : 'warn'}`}>{p.status}</span></td>
                        <td>
                          {showingFor === p.id ? (
                            <input
                              value={clientName}
                              onChange={(e) => setClientName(e.target.value)}
                              placeholder="Client name"
                              style={{ marginTop: 0 }}
                            />
                          ) : (
                            p.showing_client ?? '—'
                          )}
                        </td>
                        <td className="row-actions">
                          <Button variant="legacy" className="link inline" onClick={() => doMarkShowing(p)}>
                            {showingFor === p.id ? 'Save' : p.showing_client ? 'Edit showing' : "Mark showing"}
                          </Button>
                          <Button variant="legacy" className="link inline danger-text" onClick={() => doRelease(p)}>Release</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

export const Route = createFileRoute("/dealer-lots")({ head: () => pageHead("Dealer Lots"), component: RoutePage });
function RoutePage() { const onNavigate = useAppNavigation(); return <PageFrame ><MyLots onNavigate={onNavigate} /></PageFrame>; }
