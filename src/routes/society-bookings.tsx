import { Button } from '@/components/ui/button';
import { createFileRoute } from '@tanstack/react-router';
import { PageFrame, useAppNavigation, pageHead } from '@/components/manzil/PageFrame';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/manzil/auth';
import {
  approveBooking,
  completeTransfer,
  fetchAllBookings,
  fetchSocietyBookings,
  setBookingStatus,
} from '@/lib/manzil/booking';
import { notify } from '@/lib/manzil/notify';
import { generateDocument } from '@/lib/manzil/legal';
import type { Booking } from '@/lib/manzil/types';
import { BookingCard } from './my-bookings';
import { useSocietyId } from './society';

interface Props {
  onNavigate: (p: string) => void;
  admin?: boolean;
}

/** WBS: Booking & Transfer Approval (admin, 5) + Society booking management (5) */
function BookingsAdmin({ onNavigate, admin }: Props) {
  const { profile } = useAuth();
  const { societyId, societies, setSocietyId } = useSocietyId();
  const [list, setList] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    if (admin) {
      setList(await fetchAllBookings());
    } else if (societyId) {
      setList(await fetchSocietyBookings(societyId));
    }
    setLoading(false);
  };

  useEffect(() => {
    if (admin || societyId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [societyId, admin]);

  const act = async (b: Booking, fn: () => Promise<void>) => {
    setActing(b.id);
    await fn();
    setActing(null);
    load();
  };

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <h1>{admin ? 'All bookings' : 'Booking requests'}</h1>
          <p className="muted" style={{ margin: 0 }}>{list.length} total</p>
        </div>
        <div className="link-row" style={{ margin: 0 }}>
          {!admin && societies.length > 0 && (
            <select value={societyId ?? ''} onChange={(e) => setSocietyId(e.target.value)}>
              {societies.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
          <Button variant="legacy" className="btn secondary small" onClick={() => onNavigate(admin ? 'dashboard' : 'society')}>
            Back
          </Button>
        </div>
      </div>

      {loading ? <p className="muted">Loading…</p> : list.length === 0 ? (
        <p className="muted">No booking requests.</p>
      ) : (
        list.map((b) => (
          <div key={b.id}>
            <BookingCard b={b} />
            <div className="link-row" style={{ marginTop: -4, marginBottom: 12 }}>
              {b.status === 'pending' && (
                <>
                  <Button variant="legacy" className="btn small" disabled={acting === b.id} onClick={() => act(b, () => approveBooking(b))}>
                    Approve → reserve plot
                  </Button>
                  <Button variant="legacy" className="btn secondary small" disabled={acting === b.id} onClick={() => act(b, async () => { await setBookingStatus(b.id, 'rejected'); if (b.customer_id) notify(b.customer_id, 'Booking rejected', `Booking ${b.reference_no} was not approved.`, 'booking_rejected').catch(() => {}); })}>
                    Reject
                  </Button>
                </>
              )}
              {b.status === 'approved' && (
                <Button variant="legacy" className="btn small" disabled={acting === b.id} onClick={() => act(b, () => setBookingStatus(b.id, 'token_paid'))}>
                  Confirm token received
                </Button>
              )}
              {b.status === 'token_paid' && (
                <Button variant="legacy" className="btn small" disabled={acting === b.id} onClick={() => act(b, () => completeTransfer(b))}>
                  Approve transfer → mark sold
                </Button>
              )}
              {(b.status === 'pending' || b.status === 'approved') && (
                <Button variant="legacy" className="btn secondary small" disabled={acting === b.id} onClick={() => act(b, async () => { await setBookingStatus(b.id, 'cancelled'); try { await generateDocument(b, 'cancellation'); } catch { /* ignore */ } })}>
                  Cancel
                </Button>
              )}
            </div>
            {profile?.role === 'super_admin' && admin && (
              <div className="muted small" style={{ marginTop: -8, marginBottom: 12 }}>
                Customer: {b.customer_email}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

export const Route = createFileRoute("/society-bookings")({ head: () => pageHead("Society Bookings"), component: RoutePage });
function RoutePage() { const onNavigate = useAppNavigation(); return <PageFrame ><BookingsAdmin onNavigate={onNavigate} /></PageFrame>; }
