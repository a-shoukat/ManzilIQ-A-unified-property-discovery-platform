import { assignablePlots } from '@/lib/manzil/plot-rules';
import { fetchBookedPlotIds } from '@/lib/manzil/society';
import { Button } from '@/components/ui/button';
import { dealerLabel } from '@/lib/manzil/booking-rules';
import { createFileRoute } from '@tanstack/react-router';
import { PageFrame, useAppNavigation, pageHead } from '@/components/manzil/PageFrame';
import { useEffect, useState } from 'react';
import {
  createLot,
  decideDealerRequest,
  fetchDealerRequests,
  fetchLots,
  fetchPlots,
  fetchSocietyDealers,
  revokeLot,
} from '@/lib/manzil/society';
import type { Lot } from '@/lib/manzil/types';import { useSocietyId } from './society';

/** WBS: Society Portal — Dealer Management (6) + Lot Assignment (society side) */
function Dealers({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { societyId } = useSocietyId();
  const [requests, setRequests] = useState<Awaited<ReturnType<typeof fetchDealerRequests>>>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [dealers, setDealers] = useState<Awaited<ReturnType<typeof fetchSocietyDealers>>>([]);
  const [loading, setLoading] = useState(true);

  // lot form
  const [lotName, setLotName] = useState('');
  const [lotBlock, setLotBlock] = useState('');
  const [lotDealer, setLotDealer] = useState('');
  const [lotCommission, setLotCommission] = useState('2');
  const [lotExpiry, setLotExpiry] = useState('');
  const [lotPlots, setLotPlots] = useState<string[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async (sid: string) => {
    setLoading(true);
    const [r, l, d] = await Promise.all([
      fetchDealerRequests(sid),
      fetchLots(sid),
      fetchSocietyDealers(sid),
    ]);
    setRequests(r);
    setLots(l);
    setDealers(d);
    setLoading(false);
  };

  useEffect(() => {
    if (societyId) load(societyId);
  }, [societyId]);

  const pending = requests.filter((r) => r.status === 'pending');
  const [availablePlots, setAvailablePlots] = useState<{ id: string; label: string }[]>([]);

  useEffect(() => {
    if (!societyId) return;
    Promise.all([fetchPlots(societyId), fetchBookedPlotIds(societyId)]).then(([plots, booked]) =>
      setAvailablePlots(
        assignablePlots(plots, booked)
          .filter((p) => !lotBlock || p.block === lotBlock)
          .map((p) => ({ id: p.id, label: `${p.block}-${p.plot_no} (${p.size_marla}M)` })),
      ),
    );
  }, [societyId, lotBlock, lots]);

  const togglePlot = (id: string) =>
    setLotPlots((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const submitLot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!societyId || !lotDealer) {
      setMsg('Select a dealer first.');
      return;
    }
    try {
      await createLot(societyId, {
        name: lotName || `Lot — ${lotBlock || 'Mixed'}`,
        block: lotBlock,
        dealerId: lotDealer,
        commissionPct: parseFloat(lotCommission) || 0,
        expiresAt: lotExpiry || null,
        plotIds: lotPlots,
      });
      setMsg(`Lot assigned to dealer (${lotPlots.length} plots).`);
      setLotName('');
      setLotPlots([]);
      load(societyId);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Lot creation failed');
    }
  };

  const activeLots = lots.filter((l) => l.status === 'active');
  const historyLots = lots.filter((l) => l.status !== 'active');

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <h1>Dealer management</h1>
          <p className="muted" style={{ margin: 0 }}>Requests, lots, commission</p>
        </div>
        <Button variant="legacy" className="btn secondary small" onClick={() => onNavigate('society')}>Society portal</Button>
      </div>

      {msg && <div className="notice" style={{ marginBottom: 12 }}>{msg}</div>}

      {loading ? <p className="muted">Loading…</p> : (
        <>
          <h3>Join requests ({pending.length} pending)</h3>
          {pending.length === 0 && <p className="muted small">No pending requests.</p>}
          {pending.map((r) => (
            <div key={r.id} className="queue-card">
              <div className="queue-head">
                <div>
                  <strong>{r.firm_name ?? r.dealer_email}</strong>
                  <div className="muted small">{r.dealer_email} · License: {r.license_no ?? '—'}</div>
                </div>
                <div className="link-row" style={{ margin: 0 }}>
                  <Button variant="legacy" className="btn small" onClick={async () => { await decideDealerRequest(r.id, 'approved'); if (societyId) load(societyId); }}>Approve</Button>
                  <Button variant="legacy" className="btn secondary small" onClick={async () => { await decideDealerRequest(r.id, 'rejected'); if (societyId) load(societyId); }}>Reject</Button>
                </div>
              </div>
            </div>
          ))}

          <h3 style={{ marginTop: 24 }}>Assign lot to dealer</h3>
          <div className="card">
            <form onSubmit={submitLot}>
              <div className="form-row">
                <label>Lot name<input value={lotName} onChange={(e) => setLotName(e.target.value)} placeholder="e.g. Block A batch 1" /></label>
                <label>Block<input value={lotBlock} onChange={(e) => setLotBlock(e.target.value.toUpperCase())} placeholder="A" /></label>
              </div>
              <div className="form-row">
                <label>Dealer
                  <select value={lotDealer} onChange={(e) => setLotDealer(e.target.value)}>
                    <option value="">Select dealer…</option>
                    {dealers.map((d) => <option key={d.id} value={d.id}>{dealerLabel(d)}</option>)}
                  </select>
                </label>
                <label>Commission %<input type="number" min={0} step={0.5} value={lotCommission} onChange={(e) => setLotCommission(e.target.value)} /></label>
              </div>
              <label>Expiry date<input type="date" value={lotExpiry} onChange={(e) => setLotExpiry(e.target.value)} /></label>
              <label>Plots in this lot ({lotPlots.length} selected)</label>
              <div className="chip-grid">
                {availablePlots.map((p) => (
                  <Button variant="legacy"
                    key={p.id}
                    type="button"
                    className={`chip${lotPlots.includes(p.id) ? ' selected' : ''}`}
                    onClick={() => togglePlot(p.id)}
                  >
                    {p.label}
                  </Button>
                ))}
                {availablePlots.length === 0 && <span className="muted small">No available plots{lotBlock ? ` in block ${lotBlock}` : ''}.</span>}
              </div>
              <Button variant="legacy" className="btn small" type="submit" style={{ marginTop: 12 }}>Assign lot</Button>
            </form>
          </div>

          <h3 style={{ marginTop: 24 }}>Active lots ({activeLots.length})</h3>
          {activeLots.map((l) => (
            <div key={l.id} className="queue-card">
              <div className="queue-head">
                <div>
                  <strong>{l.name}</strong>
                  <div className="muted small">
                    {l.dealer_email} · {l.plot_count} plots · {l.commission_pct}% commission
                    {l.expires_at ? ` · expires ${l.expires_at}` : ''}
                  </div>
                </div>
                <Button variant="legacy" className="btn danger small" onClick={async () => { if (confirm('Revoke this lot? Plots return to available.')) { await revokeLot(l.id); if (societyId) load(societyId); } }}>
                  Revoke
                </Button>
              </div>
            </div>
          ))}

          <h3 style={{ marginTop: 24 }}>Dealer performance</h3>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Dealer</th><th>Firm</th><th>Active lots</th><th>Plots assigned</th></tr></thead>
              <tbody>
                {dealers.map((d) => {
                  const dl = lots.filter((l) => l.dealer_id === d.id && l.status === 'active');
                  return (
                    <tr key={d.id}>
                      <td>{d.email}</td>
                      <td>{d.firm || '—'}</td>
                      <td>{dl.length}</td>
                      <td>{dl.reduce((s, l) => s + (l.plot_count ?? 0), 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {dealers.length === 0 && <p className="muted small">No approved dealers yet.</p>}
          </div>

          {historyLots.length > 0 && (
            <>
              <h3 style={{ marginTop: 24 }}>Lot history</h3>
              {historyLots.map((l) => (
                <div key={l.id} className="queue-card">
                  <strong>{l.name}</strong>
                  <div className="muted small">{l.dealer_email} · status: {l.status} · {l.commission_pct}% commission</div>
                </div>
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}

export const Route = createFileRoute("/society-dealers")({ head: () => pageHead("Society Dealers"), component: RoutePage });
function RoutePage() { const onNavigate = useAppNavigation(); return <PageFrame ><Dealers onNavigate={onNavigate} /></PageFrame>; }
