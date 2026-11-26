import { canRequestCancel } from '@/lib/manzil/phase3-rules';
import { requestCancellation } from '@/lib/manzil/phase3';
import { toast } from 'sonner';
import { errorText } from '@/lib/manzil/errors';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { createFileRoute } from '@tanstack/react-router';
import { PageFrame, useAppNavigation, pageHead } from '@/components/manzil/PageFrame';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/manzil/auth';
import { fetchMyBookings } from '@/lib/manzil/booking';
import { formatPrice } from '@/lib/manzil/properties';
import { formatDateTime, formatPlotHeading, formatStatusLabel, joinDisplay } from '@/lib/manzil/format';
import type { Booking } from '@/lib/manzil/types';

export function BookingCard({ b, actions }: { b: Booking; actions?: React.ReactNode }) {
  const { t } = useTranslation(['booking', 'common']);
  const plotLabel = b.plot_block && b.plot_no
    ? formatPlotHeading({ block: b.plot_block, plot_no: b.plot_no })
    : b.plot_no
      ? `${t('common:plot')} ${b.plot_no}`
      : null;
  return (
    <div className="queue-card">
      <div className="queue-head">
        <div>
          <strong>{b.reference_no}</strong>
          <div className="booking-chips">
            {plotLabel ? (
              <>
                <span className="booking-chip booking-chip-plot">{plotLabel}</span>
                {b.society_name && <span className="booking-chip">{b.society_name}</span>}
              </>
            ) : (
              <span className="booking-chip booking-chip-missing">{b.plot_label ?? 'Plot details unavailable'}</span>
            )}
          </div>
          <div className="muted small">
            {joinDisplay(b.channel, `Token ${formatPrice(b.token_amount)}`, b.installment_plan)}
          </div>
          <div className="muted small">{formatDateTime(b.created_at)}</div>
        </div>
        <span className={`badge ${b.status === 'approved' || b.status === 'completed' || b.status === 'token_paid' ? 'ok' : b.status === 'pending' ? 'warn' : 'warn'}`}>
          {formatStatusLabel(b.status)}
        </span>
      </div>
      {actions}
    </div>
  );
}

function CancelControls({ b, onNavigate }: { b: Booking; onNavigate: (p: string) => void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [sent, setSent] = useState(false);
  if (b.status === 'cancelled') return <div className="link-row"><Button size="sm" variant="outline" onClick={() => onNavigate('documents')}>View cancellation letter</Button></div>;
  if (!canRequestCancel(b.status)) return null;
  if (sent) return <p className="muted small">Cancellation requested — the society will review it and issue your letter.</p>;
  if (!open) return <div className="link-row"><Button size="sm" variant="outline" onClick={() => setOpen(true)}>Request cancellation</Button></div>;
  return (
    <div style={{ marginTop: 8 }}>
      <label>Reason<input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why do you want to cancel?" /></label>
      <div className="link-row">
        <Button size="sm" variant="destructive" onClick={async () => { try { await requestCancellation(b, reason); setSent(true); toast.success('Request sent to the society'); } catch (e) { toast.error(errorText(e, 'Could not send request')); } }}>Send request</Button>
        <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Back</Button>
      </div>
    </div>
  );
}

function MyBookings({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { t } = useTranslation(['booking', 'common']);
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
          <h1>{t('booking:myBookings')}</h1>
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
        <div className="booking-list-gap">
          {list.map((b) => <BookingCard key={b.id} b={b} actions={<CancelControls b={b} onNavigate={onNavigate} />} />)}
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/my-bookings")({ head: () => pageHead("My Bookings"), component: RoutePage });
function RoutePage() { const onNavigate = useAppNavigation(); return <PageFrame ><MyBookings onNavigate={onNavigate} /></PageFrame>; }
