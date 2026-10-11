import { Button } from '@/components/ui/button';
import { createFileRoute } from '@tanstack/react-router';
import { PageFrame, useAppNavigation, pageHead } from '@/components/manzil/PageFrame';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/manzil/auth';
import { customerActivity, type ActivityItem } from '@/lib/manzil/analytics';

const ICONS: Record<ActivityItem['kind'], string> = { booking: '📝', payment: '💳', document: '📄' };

/** Module 12 — Customer activity tracking */
function CustomerActivity({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { session } = useAuth();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session) {
      customerActivity(session.user.id).then((r) => {
        setItems(r);
        setLoading(false);
      });
    }
  }, [session]);

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <h1>My activity</h1>
          <p className="muted" style={{ margin: 0 }}>Bookings, payments & documents timeline</p>
        </div>
        <Button variant="legacy" className="btn secondary small" onClick={() => onNavigate('dashboard')}>Dashboard</Button>
      </div>

      {loading ? <p className="muted">Loading…</p> : items.length === 0 ? (
        <p className="muted">No activity yet.</p>
      ) : (
        items.map((it, i) => (
          <div key={i} className="queue-card">
            <div className="queue-head">
              <div>
                <span style={{ marginRight: 8 }}>{ICONS[it.kind]}</span>
                <span>{it.text}</span>
              </div>
              <span className="muted small">{new Date(it.date).toLocaleDateString()}</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export const Route = createFileRoute("/my-activity")({ head: () => pageHead("My Activity"), component: RoutePage });
function RoutePage() { const onNavigate = useAppNavigation(); return <PageFrame ><CustomerActivity onNavigate={onNavigate} /></PageFrame>; }
