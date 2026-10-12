import { Button } from '@/components/ui/button';
import { createFileRoute } from '@tanstack/react-router';
import { PageFrame, useAppNavigation, pageHead } from '@/components/manzil/PageFrame';
import { useEffect, useState } from 'react';
import {
  approveBooking,
  completeTransfer,
  fetchAllBookings,
  fetchBookingExtras,
  fetchSocietyBookings,
  setBookingStatus,
} from '@/lib/manzil/booking';
import { notify } from '@/lib/manzil/notify';
import { generateDocument } from '@/lib/manzil/legal';
import { formatPrice } from '@/lib/manzil/estimator';
import { DOC_TITLES, type Booking } from '@/lib/manzil/types';
import { BookingCard } from './my-bookings';
import { useSocietyId } from './society';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface Props {
  onNavigate: (p: string) => void;
  admin?: boolean;
}

const TIMELINE: Booking['status'][] = ['pending', 'approved', 'token_paid', 'completed'];

function BookingActions({ b, acting, act }: { b: Booking; acting: string | null; act: (b: Booking, fn: () => Promise<void>) => void }) {
  const busy = acting === b.id;
  return (
    <div className="link-row">
      {b.status === 'pending' && (
        <>
          <Button variant="legacy" className="btn small" disabled={busy} onClick={() => act(b, () => approveBooking(b))}>Approve → reserve plot</Button>
          <Button variant="legacy" className="btn secondary small" disabled={busy} onClick={() => act(b, async () => { await setBookingStatus(b.id, 'rejected'); if (b.customer_id) notify(b.customer_id, 'Booking rejected', `Booking ${b.reference_no} was not approved.`, 'booking_rejected').catch(() => {}); })}>Reject</Button>
        </>
      )}
      {b.status === 'approved' && (
        <Button variant="legacy" className="btn small" disabled={busy} onClick={() => act(b, () => setBookingStatus(b.id, 'token_paid'))}>Confirm token received</Button>
      )}
      {b.status === 'token_paid' && (
        <Button variant="legacy" className="btn small" disabled={busy} onClick={() => act(b, () => completeTransfer(b))}>Approve transfer → mark sold</Button>
      )}
      {(b.status === 'pending' || b.status === 'approved') && (
        <Button variant="legacy" className="btn secondary small" disabled={busy} onClick={() => act(b, async () => { await setBookingStatus(b.id, 'cancelled'); try { await generateDocument(b, 'cancellation'); } catch { /* ignore */ } })}>Cancel</Button>
      )}
    </div>
  );
}

function BookingDetail({ b, onClose, acting, act }: { b: Booking; onClose: () => void; acting: string | null; act: (b: Booking, fn: () => Promise<void>) => void }) {
  const [extras, setExtras] = useState<Awaited<ReturnType<typeof fetchBookingExtras>> | null>(null);
  useEffect(() => { setExtras(null); fetchBookingExtras(b.id).then(setExtras); }, [b.id]);
  const reached = TIMELINE.indexOf(b.status);
  const ended = b.status === 'cancelled' || b.status === 'rejected';
  const row = (k: string, v: React.ReactNode) => <div className="detail-row"><span className="muted small">{k}</span><span>{v ?? '—'}</span></div>;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Booking {b.reference_no}</DialogTitle>
          <DialogDescription>Created {new Date(b.created_at).toLocaleString()} · <span className="badge">{b.status.replace('_', ' ')}</span></DialogDescription>
        </DialogHeader>
        <div className="detail-grid">
          <section>
            <h4>Customer</h4>
            {row('Name', b.customer_name)}
            {row('Email', b.customer_email)}
          </section>
          <section>
            <h4>Plot & society</h4>
            {row('Plot', b.plot_no ?? b.plot_label)}
            {row('Block', b.plot_block)}
            {row('Size', b.plot_size_marla ? `${b.plot_size_marla} marla` : null)}
            {row('Price', b.plot_price ? formatPrice(b.plot_price) : null)}
            {row('Society', b.society_name)}
          </section>
          <section>
            <h4>Booking terms</h4>
            {row('Channel', b.channel === 'dealer' ? `Dealer${b.dealer_email ? ` (${b.dealer_email})` : ''}` : 'Direct')}
            {row('Token amount', formatPrice(b.token_amount))}
            {row('Installment plan', b.installment_plan)}
          </section>
          <section>
            <h4>Status timeline</h4>
            <ol className="timeline">
              {TIMELINE.map((s, i) => <li key={s} className={!ended && i <= reached ? 'done' : ''}>{s.replace('_', ' ')}</li>)}
              {ended && <li className="done">{b.status}</li>}
            </ol>
          </section>
        </div>
        <h4>Payment history</h4>
        {!extras ? <p className="muted small">Loading…</p> : extras.payments.length === 0 ? <p className="muted small">No payments yet.</p> : (
          <div className="table-wrap"><table className="data-table"><thead><tr><th>Item</th><th>Due</th><th>Amount</th><th>Status</th><th>Receipt</th></tr></thead><tbody>
            {extras.payments.map((p) => <tr key={p.id}><td>{p.label ?? '—'}</td><td>{p.due_date ?? '—'}</td><td>{formatPrice(p.amount + (p.late_fee || 0))}</td><td>{p.paid_at ? p.status : 'unpaid'}</td><td>{p.receipt_no ?? '—'}</td></tr>)}
          </tbody></table></div>
        )}
        <h4>Documents</h4>
        {!extras ? <p className="muted small">Loading…</p> : extras.documents.length === 0 ? <p className="muted small">No documents yet.</p> : (
          <ul className="small">{extras.documents.map((d) => <li key={d.id}>{DOC_TITLES[d.doc_type] ?? d.doc_type} · v{d.version} · {new Date(d.created_at).toLocaleDateString()}</li>)}</ul>
        )}
        <h4>Actions</h4>
        <BookingActions b={b} acting={acting} act={act} />
      </DialogContent>
    </Dialog>
  );
}

/** WBS: Booking & Transfer Approval (admin, 5) + Society booking management (5) */
function BookingsAdmin({ onNavigate, admin }: Props) {
  const { societyId, societies, setSocietyId } = useSocietyId();
  const [list, setList] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    if (admin) setList(await fetchAllBookings());
    else if (societyId) setList(await fetchSocietyBookings(societyId));
    setLoading(false);
  };

  useEffect(() => {
    if (admin || societyId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [societyId, admin]);

  const act = async (b: Booking, fn: () => Promise<void>) => {
    setActing(b.id);
    setError(null);
    try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : 'Action failed'); }
    setActing(null);
    load();
  };

  const opened = list.find((b) => b.id === openId) ?? null;

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <h1>{admin ? 'All bookings' : 'Booking requests'}</h1>
          <p className="muted" style={{ margin: 0 }}>{list.length} total · click a booking for full details</p>
        </div>
        <div className="link-row" style={{ margin: 0 }}>
          {!admin && societies.length > 0 && (
            <select value={societyId ?? ''} onChange={(e) => setSocietyId(e.target.value)}>
              {societies.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
          <Button variant="legacy" className="btn secondary small" onClick={() => onNavigate(admin ? 'dashboard' : 'society')}>Back</Button>
        </div>
      </div>
      {error && <div className="error">{error}</div>}

      {loading ? <p className="muted">Loading…</p> : list.length === 0 ? (
        <p className="muted">No booking requests.</p>
      ) : (
        list.map((b) => (
          <div key={b.id} style={{ marginBottom: 12 }}>
            <div role="button" tabIndex={0} aria-label={`Open booking ${b.reference_no}`} style={{ cursor: 'pointer' }} onClick={() => setOpenId(b.id)} onKeyDown={(e) => e.key === 'Enter' && setOpenId(b.id)}>
              <BookingCard b={b} />
            </div>
            <div className="link-row" style={{ marginTop: -4 }}>
              <Button variant="legacy" className="btn secondary small" onClick={() => setOpenId(b.id)}>View details</Button>
              <BookingActions b={b} acting={acting} act={act} />
            </div>
            {admin && <div className="muted small">Customer: {b.customer_email}</div>}
          </div>
        ))
      )}
      {opened && <BookingDetail b={opened} onClose={() => setOpenId(null)} acting={acting} act={act} />}
    </div>
  );
}

export const Route = createFileRoute("/admin-bookings")({ head: () => pageHead("Admin Bookings"), component: RoutePage });
function RoutePage() { const onNavigate = useAppNavigation(); return <PageFrame ><BookingsAdmin admin onNavigate={onNavigate} /></PageFrame>; }
