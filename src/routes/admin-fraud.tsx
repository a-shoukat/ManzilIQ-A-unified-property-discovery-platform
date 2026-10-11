import { Button } from '@/components/ui/button';
import { createFileRoute } from '@tanstack/react-router';
import { PageFrame, useAppNavigation, pageHead } from '@/components/manzil/PageFrame';
import { useEffect, useState } from 'react';
import { fetchFraudInputs } from '@/lib/manzil/phase3';
import { detectFraud, type FraudAlert } from '@/lib/manzil/phase3-rules';

function Fraud({ onNavigate }: { onNavigate: (p: string) => void }) {
  const [alerts, setAlerts] = useState<FraudAlert[] | null>(null);
  const load = () => { setAlerts(null); fetchFraudInputs().then(({ bookings, listings }) => setAlerts(detectFraud(bookings, listings))); };
  useEffect(load, []);
  return (
    <div className="page page-full">
      <div className="topbar">
        <div><h1>Fraud alerts</h1><p className="muted" style={{ margin: 0 }}>Double bookings, rapid repeat bookings and prices far below the city average.</p></div>
        <div className="link-row" style={{ margin: 0 }}>
          <Button variant="outline" size="sm" onClick={load}>Re-scan</Button>
          <Button variant="outline" size="sm" onClick={() => onNavigate('admin-disputes')}>Disputes</Button>
        </div>
      </div>
      {!alerts ? <p className="muted">Scanning…</p> : alerts.length === 0 ? <div className="card card-full"><strong>All clear</strong><p className="muted">No suspicious activity found.</p></div> :
        alerts.map((a, i) => (
          <div key={i} className="card card-full" style={{ marginBottom: 12 }}>
            <div className="queue-head"><div><strong>{a.title}</strong><div className="muted small">{a.detail}</div></div>
              <span className={`badge ${a.severity === 'high' ? 'danger' : 'warn'}`}>{a.severity}</span></div>
          </div>
        ))}
    </div>
  );
}

export const Route = createFileRoute('/admin-fraud')({ head: () => pageHead('Fraud Alerts'), component: RoutePage });
function RoutePage() { const onNavigate = useAppNavigation(); return <PageFrame><Fraud onNavigate={onNavigate} /></PageFrame>; }
