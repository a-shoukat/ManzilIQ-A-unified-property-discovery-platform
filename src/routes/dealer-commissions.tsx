import { Button } from '@/components/ui/button';
import { createFileRoute } from '@tanstack/react-router';
import { PageFrame, useAppNavigation, pageHead } from '@/components/manzil/PageFrame';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/manzil/auth';
import { fetchCommissions, type CommissionRow } from '@/lib/manzil/phase3';
import { formatPrice } from '@/lib/manzil/properties';
import { errorText } from '@/lib/manzil/errors';

function Commissions({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { session } = useAuth();
  const [rows, setRows] = useState<CommissionRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { if (session) fetchCommissions(session.user.id).then(setRows).catch((e) => { setErr(errorText(e, 'Could not load commissions')); setRows([]); }); }, [session]);
  const sum = (s: string) => (rows ?? []).filter((r) => r.state === s).reduce((a, r) => a + r.amount, 0);
  return (
    <div className="page page-full">
      <div className="topbar">
        <div><h1>My commissions</h1><p className="muted" style={{ margin: 0 }}>Plot price × your lot's commission %. Earned once the buyer pays the token.</p></div>
        <Button variant="outline" size="sm" onClick={() => onNavigate('dealer')}>Dealer workspace</Button>
      </div>
      {err && <p className="error">{err}</p>}
      <div className="stat-grid" style={{ marginBottom: 16 }}>
        <div className="card"><div className="muted small">Earned</div><strong>{formatPrice(sum('earned'))}</strong></div>
        <div className="card"><div className="muted small">Pending</div><strong>{formatPrice(sum('pending'))}</strong></div>
        <div className="card"><div className="muted small">Bookings</div><strong>{rows?.length ?? '—'}</strong></div>
      </div>
      {!rows ? <p className="muted">Loading…</p> : rows.length === 0 ? <p className="muted">No bookings through you yet.</p> : (
        <div className="table-wrap"><table><thead><tr><th>Booking</th><th>Plot</th><th>Price</th><th>%</th><th>Commission</th><th>Status</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.ref}><td>{r.ref}</td><td>{r.plot}</td><td>{formatPrice(r.price)}</td><td>{r.pct}%</td><td><strong>{formatPrice(r.amount)}</strong></td>
            <td><span className={`badge ${r.state === 'earned' ? 'ok' : 'warn'}`}>{r.state}</span></td></tr>)}</tbody></table></div>
      )}
    </div>
  );
}

export const Route = createFileRoute('/dealer-commissions')({ head: () => pageHead('Dealer Commissions'), component: RoutePage });
function RoutePage() { const onNavigate = useAppNavigation(); return <PageFrame><Commissions onNavigate={onNavigate} /></PageFrame>; }
