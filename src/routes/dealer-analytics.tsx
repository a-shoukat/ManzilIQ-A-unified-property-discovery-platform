import { Button } from '@/components/ui/button';
import { createFileRoute } from '@tanstack/react-router';
import { PageFrame, useAppNavigation, pageHead } from '@/components/manzil/PageFrame';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/manzil/auth';
import { dealerPerformance, type DealerPerf } from '@/lib/manzil/analytics';

/** Module 12 — Dealer performance analytics */
function DealerAnalytics({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { session } = useAuth();
  const [p, setP] = useState<DealerPerf | null>(null);

  useEffect(() => {
    if (session) dealerPerformance(session.user.id).then(setP);
  }, [session]);

  const maxPipe = Math.max(1, ...(p?.pipeline.map((s) => s.count) ?? [1]));

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <h1>My performance</h1>
          <p className="muted" style={{ margin: 0 }}>Lots, leads & pipeline analytics</p>
        </div>
        <Button variant="legacy" className="btn secondary small" onClick={() => onNavigate('dealer')}>Dealer hub</Button>
      </div>

      {!p ? <p className="muted">Loading…</p> : (
        <>
          <div className="stat-grid">
            <div className="stat-card"><span className="stat-label">Lots assigned</span><strong>{p.lots}</strong></div>
            <div className="stat-card"><span className="stat-label">Plots assigned</span><strong>{p.plotsAssigned}</strong></div>
            <div className="stat-card"><span className="stat-label">Total leads</span><strong>{p.leads}</strong></div>
            <div className="stat-card"><span className="stat-label">Converted</span><strong className="stat-ok">{p.converted}</strong></div>
            <div className="stat-card"><span className="stat-label">Conversion rate</span><strong>{p.conversionRate}%</strong></div>
          </div>

          <div className="panel-grid" style={{ marginTop: 16 }}>
            <div className="card">
              <h3>Leads by temperature</h3>
              {p.leadsByTemp.length === 0 ? <p className="muted small">No leads yet.</p> :
                p.leadsByTemp.map((t) => (
                  <div key={t.temp} className="bar-row">
                    <span className="small" style={{ width: 90 }}>{t.temp}</span>
                    <div className="bar-track"><div className="bar-fill" style={{ width: `${Math.min(t.count * 12, 100)}%` }} /></div>
                    <span className="small">{t.count}</span>
                  </div>
                ))}
            </div>
            <div className="card">
              <h3>Pipeline distribution</h3>
              {p.pipeline.map((s, i) => (
                <div key={s.stage} className="bar-row">
                  <span className="muted small" style={{ width: 150 }}>{i + 1}. {s.stage}</span>
                  <div className="bar-track"><div className="bar-fill" style={{ width: `${Math.round((s.count / maxPipe) * 100)}%` }} /></div>
                  <span className="small">{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export const Route = createFileRoute("/dealer-analytics")({ head: () => pageHead("Dealer Analytics"), component: RoutePage });
function RoutePage() { const onNavigate = useAppNavigation(); return <PageFrame ><DealerAnalytics onNavigate={onNavigate} /></PageFrame>; }
