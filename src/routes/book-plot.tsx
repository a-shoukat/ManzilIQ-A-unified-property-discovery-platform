import { Button } from '@/components/ui/button';
import { dealerLabel } from '@/lib/manzil/booking-rules';
import { createFileRoute } from '@tanstack/react-router';
import { PageFrame, useAppNavigation, pageHead } from '@/components/manzil/PageFrame';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/manzil/auth';
import { fetchApprovedSocieties } from '@/lib/manzil/society';
import { fetchSocietyDealers } from '@/lib/manzil/society';
import { createBooking, fetchAvailablePlots } from '@/lib/manzil/booking';
import { formatPrice } from '@/lib/manzil/properties';
import { INSTALLMENT_PLANS, type Booking } from '@/lib/manzil/types';

/** WBS: Customer Portal — Booking Flow (6 features) */
function BookPlot({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { session } = useAuth();
  const [step, setStep] = useState(1);
  const [societies, setSocieties] = useState<{ id: string; name: string }[]>([]);
  const [societyId, setSocietyId] = useState('');
  const [plotsLoading, setPlotsLoading] = useState(false);
  const [plots, setPlots] = useState<Awaited<ReturnType<typeof fetchAvailablePlots>>>([]);
  const [plotId, setPlotId] = useState('');
  const [channel, setChannel] = useState<'direct' | 'dealer'>('direct');
  const [dealers, setDealers] = useState<{ id: string; email: string; firm: string }[]>([]);
  const [dealerId, setDealerId] = useState('');
  const [token, setToken] = useState('');
  const [plan, setPlan] = useState(INSTALLMENT_PLANS[0] ?? 'Lump sum (full payment)');
  const [payMethod, setPayMethod] = useState('JazzCash');
  const [done, setDone] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchApprovedSocieties().then((list) => {
      setSocieties(list.map((s) => ({ id: s.id, name: s.name })));
      if (list[0]) setSocietyId(list[0].id);
    });
  }, []);

  useEffect(() => {
    setPlots([]);
    setDealers([]);
    setPlotId('');
    if (!societyId) return;
    let live = true;
    setPlotsLoading(true);
    fetchAvailablePlots(societyId).then((p) => { if (live) { setPlots(p); setPlotsLoading(false); } });
    fetchSocietyDealers(societyId).then((d) => { if (live) setDealers(d); });
    return () => { live = false; };
  }, [societyId]);

  const selectedPlot = plots.find((p) => p.id === plotId);

  const submit = async () => {
    if (!session || !plotId) return;
    setLoading(true);
    setError(null);
    try {
      const b = await createBooking({
        plot_id: plotId,
        customer_id: session.user.id,
        dealer_id: channel === 'dealer' ? dealerId || null : null,
        society_id: societyId,
        channel,
        token_amount: parseFloat(token) || 0,
        installment_plan: plan,
      });
      // token "paid" online (simulated)
      setDone(b);
      setStep(5);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Booking failed');
    } finally {
      setLoading(false);
    }
  };

  const canNext1 = societyId && plotId;
  const canNext2 = channel === 'direct' || dealerId;

  return (
    <div className="container">
      <div className="card wide">
        <div className="topbar">
          <h1 style={{ margin: 0 }}>Book a plot</h1>
          <Button variant="legacy" className="btn secondary small" onClick={() => onNavigate('dashboard')}>Dashboard</Button>
        </div>

        <div className="pipeline" style={{ marginBottom: 20 }}>
          {['Plot', 'Channel', 'Token', 'Plan', 'Done'].map((s, i) => (
            <div key={s} className={`pipe-stage${i + 1 <= step ? ' done' : ''}`} title={s}>{s}</div>
          ))}
        </div>

        {error && <div className="error">{error}</div>}

        {step === 1 && (
          <>
            <label>Society
              <select value={societyId} onChange={(e) => { setPlots([]); setPlotId(''); setPlotsLoading(true); setSocietyId(e.target.value); }}>
                {societies.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <label>Select plot
              <select value={plotId} disabled={plotsLoading} onChange={(e) => setPlotId(e.target.value)}>
                <option value="">{plotsLoading ? 'Loading plots…' : 'Choose a plot…'}</option>
                {!plotsLoading && plots.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.block}-{p.plot_no} · {p.size_marla}M · {formatPrice(p.base_price)}
                  </option>
                ))}
              </select>
            </label>
            {!plotsLoading && plots.length === 0 && <p className="muted small">No available plots in this society.</p>}
            <Button variant="legacy" className="btn" disabled={!canNext1} onClick={() => setStep(2)}>Continue</Button>
          </>
        )}

        {step === 2 && (
          <>
            <p className="muted">How do you want to book?</p>
            <div className="role-grid">
              <Button variant="legacy" className={`role-card${channel === 'direct' ? ' selected' : ''}`} onClick={() => setChannel('direct')}>
                Direct society
              </Button>
              <Button variant="legacy" className={`role-card${channel === 'dealer' ? ' selected' : ''}`} onClick={() => setChannel('dealer')}>
                Via dealer
              </Button>
            </div>
            {channel === 'dealer' && (
              <label>Choose dealer
                <select value={dealerId} onChange={(e) => setDealerId(e.target.value)}>
                  <option value="">Select dealer…</option>
                  {dealers.map((d) => <option key={d.id} value={d.id}>{dealerLabel(d)}</option>)}
                </select>
              </label>
            )}
            <div className="link-row">
              <Button variant="legacy" className="btn secondary small" onClick={() => setStep(1)}>Back</Button>
              <Button variant="legacy" className="btn small" disabled={!canNext2} onClick={() => setStep(3)}>Continue</Button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <p className="muted">Pay token amount online (simulated)</p>
            <label>Token amount (PKR)
              <input type="number" min={0} value={token} onChange={(e) => setToken(e.target.value)} placeholder="e.g. 100000" />
            </label>
            <label>Payment method
              <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                <option>JazzCash</option>
                <option>EasyPaisa</option>
                <option>Bank transfer</option>
              </select>
            </label>
            <div className="notice" style={{ marginBottom: 12 }}>
              Demo mode — no real money moves. Real payment gateways plug in here.
            </div>
            <div className="link-row">
              <Button variant="legacy" className="btn secondary small" onClick={() => setStep(2)}>Back</Button>
              <Button variant="legacy" className="btn small" onClick={() => setStep(4)}>Pay {token ? formatPrice(parseFloat(token)) : ''}</Button>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <p className="muted">Select installment plan</p>
            {INSTALLMENT_PLANS.map((p) => (
              <Button variant="legacy" key={p} className={`role-card${plan === p ? ' selected' : ''}`} style={{ width: '100%', marginBottom: 8 }} onClick={() => setPlan(p)}>
                {p}
              </Button>
            ))}
            <div className="link-row">
              <Button variant="legacy" className="btn secondary small" onClick={() => setStep(3)}>Back</Button>
              <Button variant="legacy" className="btn small" disabled={loading} onClick={submit}>
                {loading ? 'Booking…' : 'Confirm booking'}
              </Button>
            </div>
          </>
        )}

        {step === 5 && done && (
          <>
            <div className="badge ok">Booking confirmed</div>
            <h3>Reference number</h3>
            <p className="price big">{done.reference_no}</p>
            <div className="detail-grid">
              <div className="detail-item"><span className="detail-key">Plot</span><span>{selectedPlot ? `${selectedPlot.block}-${selectedPlot.plot_no}` : '—'}</span></div>
              <div className="detail-item"><span className="detail-key">Channel</span><span>{done.channel}</span></div>
              <div className="detail-item"><span className="detail-key">Token</span><span>{formatPrice(done.token_amount)}</span></div>
              <div className="detail-item"><span className="detail-key">Plan</span><span>{done.installment_plan}</span></div>
            </div>
            <p className="muted small" style={{ marginTop: 12 }}>
              The society will review your booking. Track status in "My bookings".
            </p>
            <div className="link-row">
              <Button variant="legacy" className="btn small" onClick={() => onNavigate('my-bookings')}>My bookings</Button>
              <Button variant="legacy" className="btn secondary small" onClick={() => onNavigate('dashboard')}>Dashboard</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/book-plot")({ head: () => pageHead("Book Plot"), component: RoutePage });
function RoutePage() { const onNavigate = useAppNavigation(); return <PageFrame ><BookPlot onNavigate={onNavigate} /></PageFrame>; }
