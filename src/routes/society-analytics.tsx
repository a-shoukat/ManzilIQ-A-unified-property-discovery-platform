import { Button } from '@/components/ui/button';
import { createFileRoute } from '@tanstack/react-router';
import { PageFrame, useAppNavigation, pageHead } from '@/components/manzil/PageFrame';
import { useEffect, useState } from 'react';
import { societySalesStats, downloadCSV, type SocietySalesStats } from '@/lib/manzil/analytics';
import { fetchSocietyPayments, financialSummary } from '@/lib/manzil/payment';
import { formatPrice } from '@/lib/manzil/properties';
import { useSocietyId } from './society';

/** Module 12 — Society sales analytics + payment reports (CSV) */
function SocietyAnalytics({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { societyId } = useSocietyId();
  const [stats, setStats] = useState<SocietySalesStats | null>(null);

  useEffect(() => {
    if (societyId) societySalesStats(societyId).then(setStats);
  }, [societyId]);

  const maxRev = Math.max(1, ...(stats?.revenueByMonth.map((r) => r.total) ?? [1]));

  const exportPayments = async () => {
    if (!societyId) return;
    const [payments, summary] = await Promise.all([fetchSocietyPayments(societyId), financialSummary(societyId)]);
    void summary;
    downloadCSV(
      `payments-report-${new Date().toISOString().slice(0, 10)}.csv`,
      payments.map((p) => ({
        receipt: p.receipt_no ?? '',
        booking: p.booking_ref ?? '',
        label: p.label ?? '',
        amount: p.amount,
        method: p.method,
        status: p.status,
        due_date: p.due_date ?? '',
        paid_at: p.paid_at ?? '',
      })),
    );
  };

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <h1>Sales analytics</h1>
          <p className="muted" style={{ margin: 0 }}>Society performance reports</p>
        </div>
        <div className="link-row" style={{ margin: 0 }}>
          <Button variant="legacy" className="btn secondary small" onClick={exportPayments}>Export payments CSV</Button>
          <Button variant="legacy" className="btn secondary small" onClick={() => onNavigate('society')}>Society hub</Button>
        </div>
      </div>

      {!stats ? <p className="muted">Loading…</p> : (
        <>
          <div className="panel-grid">
            <div className="card">
              <h3>Plots by status</h3>
              {stats.plotsByStatus.map((s) => (
                <div key={s.status} className="bar-row">
                  <span className="small" style={{ width: 90 }}>{s.status}</span>
                  <div className="bar-track"><div className="bar-fill" style={{ width: `${Math.min(s.count * 10, 100)}%` }} /></div>
                  <span className="small">{s.count}</span>
                </div>
              ))}
            </div>
            <div className="card">
              <h3>Bookings funnel</h3>
              {stats.bookingsByStatus.map((s) => (
                <div key={s.status} className="bar-row">
                  <span className="small" style={{ width: 90 }}>{s.status}</span>
                  <div className="bar-track"><div className="bar-fill" style={{ width: `${Math.min(s.count * 10, 100)}%` }} /></div>
                  <span className="small">{s.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <h3>Revenue trend (confirmed)</h3>
            {stats.revenueByMonth.length === 0 ? <p className="muted small">No revenue yet.</p> : (
              <div className="bar-chart">
                {stats.revenueByMonth.map((r) => (
                  <div key={r.month} className="bar-row">
                    <span className="muted small" style={{ width: 70 }}>{r.month}</span>
                    <div className="bar-track"><div className="bar-fill" style={{ width: `${Math.round((r.total / maxRev) * 100)}%` }} /></div>
                    <span className="small">{formatPrice(r.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <h3>Block performance</h3>
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Block</th><th>Sold</th><th>Total</th><th>Sell-through</th></tr></thead>
                <tbody>
                  {stats.topBlocks.map((b) => (
                    <tr key={b.block}>
                      <td>{b.block}</td>
                      <td>{b.sold}</td>
                      <td>{b.total}</td>
                      <td>{b.total ? Math.round((b.sold / b.total) * 100) : 0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export const Route = createFileRoute("/society-analytics")({ head: () => pageHead("Society Analytics"), component: RoutePage });
function RoutePage() { const onNavigate = useAppNavigation(); return <PageFrame ><SocietyAnalytics onNavigate={onNavigate} /></PageFrame>; }
