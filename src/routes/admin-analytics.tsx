import { Button } from '@/components/ui/button';
import { createFileRoute } from '@tanstack/react-router';
import { PageFrame, useAppNavigation, pageHead } from '@/components/manzil/PageFrame';
import { useEffect, useState } from 'react';
import { platformStats, type PlatformStats } from '@/lib/manzil/admin';
import { formatPrice } from '@/lib/manzil/properties';

/** WBS: Admin Panel — Platform Analytics (6 features) */
function PlatformAnalytics({ onNavigate }: { onNavigate: (p: string) => void }) {
  const [s, setS] = useState<PlatformStats | null>(null);

  useEffect(() => {
    platformStats().then(setS);
  }, []);

  const maxM = Math.max(1, ...(s?.monthlyUsers.map((m) => m.total) ?? [1]));

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <h1>Platform analytics</h1>
          <p className="muted" style={{ margin: 0 }}>Whole-platform overview</p>
        </div>
        <Button variant="legacy" className="btn secondary small" onClick={() => onNavigate('admin')}>Admin panel</Button>
      </div>

      {!s ? <p className="muted">Loading…</p> : (
        <>
          <div className="stat-grid">
            <div className="stat-card"><span className="stat-label">Registered societies</span><strong>{s.societies}</strong></div>
            <div className="stat-card"><span className="stat-label">Active dealers</span><strong>{s.dealers}</strong></div>
            <div className="stat-card"><span className="stat-label">Customers onboarded</span><strong>{s.customers}</strong></div>
            <div className="stat-card"><span className="stat-label">Platform GMV</span><strong className="stat-ok">{formatPrice(s.gmv)}</strong></div>
            <div className="stat-card"><span className="stat-label">Active plots</span><strong>{s.plotsActive}</strong></div>
            <div className="stat-card"><span className="stat-label">Plots sold</span><strong>{s.plotsSold}</strong></div>
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <h3>Monthly growth — new users</h3>
            {s.monthlyUsers.length === 0 ? <p className="muted small">No data yet.</p> : (
              <div className="bar-chart">
                {s.monthlyUsers.map((m) => (
                  <div key={m.month} className="bar-row">
                    <span className="muted small" style={{ width: 70 }}>{m.month}</span>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${Math.round((m.total / maxM) * 100)}%` }} />
                    </div>
                    <span className="small">{m.total}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export const Route = createFileRoute("/admin-analytics")({ head: () => pageHead("Admin Analytics"), component: RoutePage });
function RoutePage() { const onNavigate = useAppNavigation(); return <PageFrame ><PlatformAnalytics onNavigate={onNavigate} /></PageFrame>; }
