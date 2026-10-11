import { Button } from '@/components/ui/button';
import { createFileRoute } from '@tanstack/react-router';
import { PageFrame, useAppNavigation, pageHead } from '@/components/manzil/PageFrame';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/manzil/auth';
import { fetchMyBookings } from '@/lib/manzil/booking';
import { formatPrice } from '@/lib/manzil/properties';
import type { Booking } from '@/lib/manzil/types';

export function BookingCard({ b }: { b: Booking }) {
  return (
    <div className="queue-card">
      <div className="queue-head">
        <div>
          <strong>{b.reference_no}</strong>
          <div className="muted small">
            Plot {b.plot_label ?? '—'} · {b.channel} · Token {formatPrice(b.token_amount)}
            {b.installment_plan ? ` · ${b.installment_plan}` : ''}
          </div>
          <div className="muted small">{new Date(b.created_at).toLocaleString()}</div>
        </div>
        <span className={`badge ${b.status === 'approved' || b.status === 'completed' || b.status === 'token_paid' ? 'ok' : b.status === 'pending' ? 'warn' : 'warn'}`}>
          {b.status.replace('_', ' ')}
        </span>
      </div>
    </div>
  );
}

function MyBookings({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { session } = useAuth();
  const [list, setList] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session) fetchMyBookings(session.user.id).then((l) => { setList(l); setLoading(false); });
  }, [session]);

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <h1>My bookings</h1>
          <p className="muted" style={{ margin: 0 }}>{list.length} bookings</p>
        </div>
        <div className="link-row" style={{ margin: 0 }}>
          <Button variant="legacy" className="btn small" onClick={() => onNavigate('book-plot')}>+ New booking</Button>
          <Button variant="legacy" className="btn secondary small" onClick={() => onNavigate('dashboard')}>Dashboard</Button>
        </div>
      </div>
      {loading ? <p className="muted">Loading…</p> : list.length === 0 ? (
        <p className="muted">No bookings yet.</p>
      ) : (
        list.map((b) => <BookingCard key={b.id} b={b} />)
      )}
    </div>
  );
}

export const Route = createFileRoute("/my-bookings")({ head: () => pageHead("My Bookings"), component: RoutePage });
function RoutePage() { const onNavigate = useAppNavigation(); return <PageFrame ><MyBookings onNavigate={onNavigate} /></PageFrame>; }
