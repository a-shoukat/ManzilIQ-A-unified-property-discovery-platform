import { Button } from '@/components/ui/button';
import { createFileRoute } from '@tanstack/react-router';
import { PageFrame, useAppNavigation, pageHead } from '@/components/manzil/PageFrame';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/manzil/auth';
import { fetchMyLots, fetchLotPlots } from '@/lib/manzil/dealer';
import { createBooking } from '@/lib/manzil/booking';
import { findBuyerByEmail } from '@/lib/manzil/phase3';
import { formatSize } from '@/lib/manzil/phase3-rules';
import { notify } from '@/lib/manzil/notify';
import { formatPrice } from '@/lib/manzil/properties';
import { errorText } from '@/lib/manzil/errors';
import { INSTALLMENT_PLANS, type Booking, type Lot, type Plot } from '@/lib/manzil/types';

function DealerBook({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { session } = useAuth();
  const [lots, setLots] = useState<Lot[] | null>(null);
  const [plots, setPlots] = useState<(Plot & { lot: Lot })[]>([]);
  const [plotId, setPlotId] = useState('');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [plan, setPlan] = useState(INSTALLMENT_PLANS[0] ?? 'Lump sum (full payment)');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Booking | null>(null);

  useEffect(() => {
    if (!session) return;
    fetchMyLots(session.user.id).then(async (ls) => {
      setLots(ls);
      const all = await Promise.all(ls.map(async (l) => (await fetchLotPlots(l.id)).map((p) => ({ ...p, lot: l }))));
      setPlots(all.flat().filter((p) => p.status === 'available' || p.status === 'assigned'));
    });
  }, [session]);

  const plot = plots.find((p) => p.id === plotId);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !plot) return;
    setBusy(true); setError(null);
    try {
      const buyerId = await findBuyerByEmail(email);
      if (!buyerId) throw new Error('No approved buyer account with this email. Ask the customer to sign up and get verified first.');
      const b = await createBooking({ plot_id: plot.id, customer_id: buyerId, dealer_id: session.user.id, society_id: plot.society_id, channel: 'dealer', token_amount: parseFloat(token) || 0, installment_plan: plan });
      notify(buyerId, 'Booking created for you', `Your dealer booked plot ${plot.block}-${plot.plot_no} (ref ${b.reference_no}). It is waiting for society approval.`, 'booking_created').catch(() => {});
      setDone(b);
    } catch (err) { setError(errorText(err, 'Booking failed')); }
    setBusy(false);
  };

  return (
    <div className="page page-full">
      <div className="topbar">
        <div><h1>Book for a customer</h1><p className="muted" style={{ margin: 0 }}>Book a plot from your lots on behalf of a verified buyer.</p></div>
        <Button variant="outline" size="sm" onClick={() => onNavigate('dealer-commissions')}>My commissions</Button>
      </div>
      {done ? (
        <div className="card card-full">
          <strong>Booking {done.reference_no} created</strong>
          <p className="muted">The society will review it. The customer has been notified, and your commission shows under Commissions.</p>
          <div className="link-row"><Button size="sm" onClick={() => { setDone(null); setPlotId(''); setEmail(''); setToken(''); }}>Book another</Button></div>
        </div>
      ) : lots === null ? <p className="muted">Loading…</p> : plots.length === 0 ? (
        <div className="card card-full"><strong>No plots to book</strong><p className="muted">You need an active lot with available plots. Join a society from Discover societies.</p>
          <Button size="sm" variant="outline" onClick={() => onNavigate('dealer-discover')}>Discover societies</Button></div>
      ) : (
        <form className="card card-full" onSubmit={submit} style={{ maxWidth: 760 }}>
          {error && <div className="error">{error}</div>}
          <label>Plot
            <select required value={plotId} onChange={(e) => setPlotId(e.target.value)}>
              <option value="">Choose a plot…</option>
              {plots.map((p) => <option key={p.id} value={p.id}>{p.lot.name} · {p.block}-{p.plot_no} · {formatSize(p.size_marla)} · {formatPrice(p.base_price)}</option>)}
            </select>
          </label>
          <label>Customer's email (their buyer account)<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="customer@example.com" /></label>
          <label>Token amount (PKR)<input type="number" min={0} value={token} onChange={(e) => setToken(e.target.value)} /></label>
          <label>Installment plan
            <select value={plan} onChange={(e) => setPlan(e.target.value)}>{INSTALLMENT_PLANS.map((p) => <option key={p}>{p}</option>)}</select>
          </label>
          {plot && <p className="muted small">Commission at {plot.lot.commission_pct}%: {formatPrice(Math.round(plot.base_price * plot.lot.commission_pct / 100))}</p>}
          <Button type="submit" disabled={busy || !plotId}>{busy ? 'Booking…' : 'Create booking'}</Button>
        </form>
      )}
    </div>
  );
}

export const Route = createFileRoute('/dealer-book')({ head: () => pageHead('Book for Customer'), component: RoutePage });
function RoutePage() { const onNavigate = useAppNavigation(); return <PageFrame><DealerBook onNavigate={onNavigate} /></PageFrame>; }
