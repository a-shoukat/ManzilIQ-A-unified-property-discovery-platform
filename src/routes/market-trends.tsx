import { Button } from '@/components/ui/button';
import { createFileRoute } from '@tanstack/react-router';
import { PageFrame, useAppNavigation, pageHead } from '@/components/manzil/PageFrame';
import { useEffect, useState } from 'react';
import { marketTrends } from '@/lib/manzil/analytics';
import { formatPrice } from '@/lib/manzil/properties';

/** Module 12 — AI-based market trend analysis */
function MarketTrends({ onNavigate }: { onNavigate: (p: string) => void }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof marketTrends>> | null>(null);

  useEffect(() => {
    marketTrends().then(setData);
  }, []);

  const maxT = Math.max(1, ...(data?.overall.map((t) => t.avgPerMarla) ?? [1]));
  const trend = data && data.overall.length >= 2
    ? data.overall[data.overall.length - 1].avgPerMarla - data.overall[0].avgPerMarla
    : 0;

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <h1>Market trends</h1>
          <p className="muted" style={{ margin: 0 }}>Avg PKR/marla from live listings</p>
        </div>
        <Button variant="legacy" className="btn secondary small" onClick={() => onNavigate('dashboard')}>Dashboard</Button>
      </div>

      {!data ? <p className="muted">Loading…</p> : (
        <>
          {data.overall.length >= 2 && (
            <div className={`notice ${trend >= 0 ? '' : 'warn-box'}`} style={{ marginBottom: 16 }}>
              Market is trending <strong>{trend >= 0 ? 'up' : 'down'}</strong> ({trend >= 0 ? '+' : ''}{formatPrice(Math.abs(trend))}/marla across the tracked period).
            </div>
          )}

          <div className="card" style={{ marginBottom: 16 }}>
            <h3>Rate trend (PKR/marla)</h3>
            {data.overall.length === 0 ? <p className="muted small">Not enough data yet.</p> : (
              <div className="bar-chart">
                {data.overall.map((t) => (
                  <div key={t.month} className="bar-row">
                    <span className="muted small" style={{ width: 70 }}>{t.month}</span>
                    <div className="bar-track"><div className="bar-fill" style={{ width: `${Math.round((t.avgPerMarla / maxT) * 100)}%` }} /></div>
                    <span className="small">{formatPrice(t.avgPerMarla)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h3>By city & category</h3>
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>City</th><th>Category</th><th>Avg/marla</th><th>Listings</th></tr></thead>
                <tbody>
                  {data.byCity.map((c, i) => (
                    <tr key={i}>
                      <td style={{ textTransform: 'capitalize' }}>{c.city}</td>
                      <td>{c.category}</td>
                      <td>{formatPrice(c.avgPerMarla)}</td>
                      <td>{c.listings}</td>
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

export const Route = createFileRoute("/market-trends")({ head: () => pageHead("Market Trends"), component: RoutePage });
function RoutePage() { const onNavigate = useAppNavigation(); return <PageFrame publicPage><MarketTrends onNavigate={onNavigate} /></PageFrame>; }
