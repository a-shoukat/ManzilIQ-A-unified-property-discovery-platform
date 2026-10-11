import { receiptTotal, canPay } from '@/lib/manzil/payment-rules';
import { Button } from '@/components/ui/button';
import { createFileRoute } from '@tanstack/react-router';
import { PageFrame, useAppNavigation, pageHead } from '@/components/manzil/PageFrame';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/manzil/auth';
import { calcLateFee, fetchMyPayments, payInstallment } from '@/lib/manzil/payment';
import { formatPrice } from '@/lib/manzil/properties';
import type { Payment, PaymentMethod } from '@/lib/manzil/types';

const METHODS: { id: PaymentMethod; label: string }[] = [
  { id: 'jazzcash', label: 'JazzCash' },
  { id: 'easypaisa', label: 'EasyPaisa' },
  { id: 'bank', label: 'Bank transfer (proof upload)' },
  { id: 'cash', label: 'Cash (manual)' },
  { id: 'cheque', label: 'Cheque (manual)' },
];

/** WBS: Payment & Financial System — customer side (tracking + receipts) */
function MyPayments({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { session } = useAuth();
  const [list, setList] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<Payment | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('jazzcash');
  const [proof, setProof] = useState<File | null>(null);
  const [receipt, setReceipt] = useState<Payment | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    if (!session) return;
    setLoading(true);
    setList(await fetchMyPayments(session.user.id));
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const dueSoon = list.filter(
    (p) => p.status === 'pending' && p.due_date && p.due_date <= today,
  );

  const doPay = async () => {
    if (!paying) return;
    try {
      await payInstallment(paying, method, method === 'bank' ? proof : null);
      setMsg(
        method === 'cash' || method === 'cheque'
          ? 'Recorded — society will confirm on receipt.'
          : 'Payment confirmed.',
      );
      setPaying(null);
      setProof(null);
      load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Payment failed');
    }
  };

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <h1>My payments</h1>
          <p className="muted" style={{ margin: 0 }}>Due calendar & history</p>
        </div>
        <Button variant="legacy" className="btn secondary small" onClick={() => onNavigate('dashboard')}>Dashboard</Button>
      </div>

      {msg && <div className="notice" style={{ marginBottom: 12 }}>{msg}</div>}
      {dueSoon.length > 0 && (
        <div className="notice warn-box" style={{ marginBottom: 12 }}>
          ⏰ {dueSoon.length} payment{dueSoon.length > 1 ? 's' : ''} due or overdue — late fee 2%/month applies.
        </div>
      )}

      {loading ? <p className="muted">Loading…</p> : list.length === 0 ? (
        <p className="muted">No payment schedule yet — it appears after your booking is approved.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Booking</th><th>Label</th><th>Due</th><th>Amount</th><th>Late fee</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {list.map((p) => {
                const late = calcLateFee(p);
                const overdue = p.status === 'pending' && p.due_date && p.due_date < today;
                return (
                  <tr key={p.id} className={overdue ? 'row-overdue' : ''}>
                    <td>{p.booking_ref}</td>
                    <td>{p.label ?? '—'}</td>
                    <td>{p.due_date ?? '—'}</td>
                    <td>{formatPrice(p.amount)}</td>
                    <td>{late > 0 ? formatPrice(late) : '—'}</td>
                    <td>
                      <span className={`badge ${p.status === 'confirmed' ? 'ok' : 'warn'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="row-actions">
                      {p.status === 'pending' && canPay(p) && (
                        <Button variant="legacy" className="link inline" onClick={() => setPaying(p)}>Pay</Button>
                      )}
                      {p.status === 'confirmed' && (
                        <Button variant="legacy" className="link inline" onClick={() => setReceipt(p)}>Receipt</Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {paying && (
        <div className="modal-backdrop" onClick={() => setPaying(null)}>
          <div className="card" onClick={(e) => e.stopPropagation()}>
            <h3>Pay {formatPrice(paying.amount + calcLateFee(paying))}</h3>
            <p className="muted small">{paying.label} · {paying.booking_ref}</p>
            <label>Method
              <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                {METHODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </label>
            {method === 'bank' && (
              <label>Transfer proof (upload)
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setProof(e.target.files?.[0] ?? null)} />
              </label>
            )}
            <div className="notice" style={{ marginBottom: 12 }}>Demo mode — simulated payment.</div>
            <div className="link-row">
              <Button variant="legacy" className="btn small" onClick={doPay}>Confirm payment</Button>
              <Button variant="legacy" className="btn secondary small" onClick={() => setPaying(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {receipt && (
        <div className="modal-backdrop" onClick={() => setReceipt(null)}>
          <div className="card receipt" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ textAlign: 'center' }}>Payment Receipt</h2>
            <p style={{ textAlign: 'center' }} className="muted">{receipt.receipt_no}</p>
            <div className="spec-table">
              <div className="spec-row"><span className="detail-key">Booking</span><span>{receipt.booking_ref}</span></div>
              <div className="spec-row"><span className="detail-key">Label</span><span>{receipt.label}</span></div>
              <div className="spec-row"><span className="detail-key">Installment amount</span><span>{formatPrice(receipt.amount)}</span></div>
              <div className="spec-row"><span className="detail-key">Late fee</span><span>{receipt.late_fee > 0 ? formatPrice(receipt.late_fee) : '—'}</span></div>
              <div className="spec-row"><span className="detail-key"><strong>Total paid</strong></span><strong>{formatPrice(receiptTotal(receipt))}</strong></div>
              <div className="spec-row"><span className="detail-key">Method</span><span>{receipt.method}</span></div>
              <div className="spec-row"><span className="detail-key">Paid at</span><span>{receipt.paid_at ? new Date(receipt.paid_at).toLocaleString() : '—'}</span></div>
            </div>
            <div className="link-row no-print">
              <Button variant="legacy" className="btn small" onClick={() => window.print()}>Print / PDF</Button>
              <Button variant="legacy" className="btn secondary small" onClick={() => setReceipt(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/my-payments")({ head: () => pageHead("My Payments"), component: RoutePage });
function RoutePage() { const onNavigate = useAppNavigation(); return <PageFrame ><MyPayments onNavigate={onNavigate} /></PageFrame>; }
