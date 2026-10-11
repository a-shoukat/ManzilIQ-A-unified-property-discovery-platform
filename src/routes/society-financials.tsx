import { Button } from '@/components/ui/button';
import { createFileRoute } from '@tanstack/react-router';
import { PageFrame, useAppNavigation, pageHead } from '@/components/manzil/PageFrame';
import { useEffect, useState } from 'react';
import {
  confirmPayment,
  deletePlan,
  fetchPlans,
  fetchSocietyPayments,
  financialSummary,
  savePlan,
  type FinancialSummary,
} from '@/lib/manzil/payment';
import { formatPrice } from '@/lib/manzil/properties';
import type { Payment } from '@/lib/manzil/types';
import { useSocietyId } from './society';

/** WBS: Payment & Financial System — society side (plans, tracking, reporting) */
function SocietyFinancials({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { societyId, societies, setSocietyId } = useSocietyId();
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [plans, setPlans] = useState<Awaited<ReturnType<typeof fetchPlans>>>([]);
  const [loading, setLoading] = useState(true);

  const [pName, setPName] = useState('');
  const [pMonths, setPMonths] = useState('12');
  const [pDown, setPDown] = useState('20');

  const load = async (sid: string) => {
    setLoading(true);
    const [s, p, pl] = await Promise.all([
      financialSummary(sid),
      fetchSocietyPayments(sid),
      fetchPlans(sid),
    ]);
    setSummary(s);
    setPayments(p);
    setPlans(pl);
    setLoading(false);
  };

  useEffect(() => {
    if (societyId) load(societyId);
  }, [societyId]);

  const submitPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!societyId || !pName.trim()) return;
    await savePlan(societyId, {
      name: pName.trim(),
      duration_months: parseInt(pMonths, 10) || 12,
      down_payment_pct: parseFloat(pDown) || 0,
    });
    setPName('');
    load(societyId);
  };

  const maxMonth = Math.max(1, ...(summary?.monthly.map((m) => m.total) ?? [1]));

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <h1>Financials</h1>
          <p className="muted" style={{ margin: 0 }}>Revenue, dues & plans</p>
        </div>
        <div className="link-row" style={{ margin: 0 }}>
          {societies.length > 0 && (
            <select value={societyId ?? ''} onChange={(e) => setSocietyId(e.target.value)}>
              {societies.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
          <Button variant="legacy" className="btn secondary small" onClick={() => onNavigate('society')}>Society portal</Button>
        </div>
      </div>

      {loading || !summary ? <p className="muted">Loading…</p> : (
        <>
          <div className="stat-grid">
            <div className="stat-card"><span className="stat-label">Revenue collected</span><strong className="stat-ok">{formatPrice(summary.collected)}</strong></div>
            <div className="stat-card"><span className="stat-label">Pending installments</span><strong>{formatPrice(summary.pending)}</strong></div>
            <div className="stat-card"><span className="stat-label">Overdue</span><strong className="stat-bad">{formatPrice(summary.overdue)}</strong></div>
            <div className="stat-card"><span className="stat-label">Commission payable</span><strong>{formatPrice(summary.commissionPayable)}</strong></div>
          </div>

          <div className="panel-grid" style={{ marginTop: 16 }}>
            <div className="card">
              <h3>Monthly revenue trend</h3>
              {summary.monthly.length === 0 ? <p className="muted small">No confirmed payments yet.</p> : (
                <div className="bar-chart">
                  {summary.monthly.map((m) => (
                    <div key={m.month} className="bar-row">
                      <span className="muted small" style={{ width: 70 }}>{m.month}</span>
                      <div className="bar-track">
                        <div className="bar-fill" style={{ width: `${Math.round((m.total / maxMonth) * 100)}%` }} />
                      </div>
                      <span className="small">{formatPrice(m.total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="card">
              <h3>Defaulters</h3>
              {summary.defaulters.length === 0 ? <p className="muted small">No defaulters. 🎉</p> : (
                summary.defaulters.map((d) => (
                  <div key={d.ref} className="queue-head" style={{ borderBottom: '1px solid #1e293b', padding: '8px 0' }}>
                    <span>{d.ref}</span>
                    <strong className="stat-bad">{formatPrice(d.amount)}</strong>
                  </div>
                ))
              )}
            </div>
          </div>

          <h3 style={{ marginTop: 24 }}>Installment plans (custom)</h3>
          <div className="card" style={{ marginBottom: 12 }}>
            <form onSubmit={submitPlan}>
              <div className="form-row">
                <label>Plan name<input required value={pName} onChange={(e) => setPName(e.target.value)} placeholder="e.g. 2-year plan" /></label>
                <label>Duration (months)<input type="number" min={1} value={pMonths} onChange={(e) => setPMonths(e.target.value)} /></label>
                <label>Down payment %<input type="number" min={0} max={100} value={pDown} onChange={(e) => setPDown(e.target.value)} /></label>
              </div>
              <Button variant="legacy" className="btn small" type="submit">Save plan</Button>
            </form>
            {plans.map((pl) => (
              <div key={pl.id} className="queue-head" style={{ borderBottom: '1px solid #1e293b', padding: '8px 0', marginTop: 8 }}>
                <span>{pl.name} · {pl.duration_months} months · {pl.down_payment_pct}% down</span>
                <Button variant="legacy" className="link inline danger-text" onClick={async () => { await deletePlan(pl.id); if (societyId) load(societyId); }}>Delete</Button>
              </div>
            ))}
            {plans.length === 0 && <p className="muted small">No custom plans — defaults apply (20% down).</p>}
          </div>

          <h3>Payment history</h3>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Booking</th><th>Label</th><th>Due</th><th>Amount</th><th>Method</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td>{p.booking_ref}</td>
                    <td>{p.label}</td>
                    <td>{p.due_date}</td>
                    <td>{formatPrice(p.amount)}</td>
                    <td>{p.method}</td>
                    <td><span className={`badge ${p.status === 'confirmed' ? 'ok' : 'warn'}`}>{p.status}</span></td>
                    <td className="row-actions">
                      {p.status === 'pending' && p.method !== 'jazzcash' && p.method !== 'easypaisa' && (
                        <Button variant="legacy" className="link inline" onClick={async () => { await confirmPayment(p.id); if (societyId) load(societyId); }}>
                          Confirm receipt
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {payments.length === 0 && <p className="muted small">No payments yet.</p>}
          </div>
        </>
      )}
    </div>
  );
}

export const Route = createFileRoute("/society-financials")({ head: () => pageHead("Society Financials"), component: RoutePage });
function RoutePage() { const onNavigate = useAppNavigation(); return <PageFrame ><SocietyFinancials onNavigate={onNavigate} /></PageFrame>; }
