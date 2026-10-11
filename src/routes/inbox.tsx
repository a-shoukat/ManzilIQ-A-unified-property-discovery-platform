import { Button } from '@/components/ui/button';
import { createFileRoute } from '@tanstack/react-router';
import { PageFrame, useAppNavigation, pageHead } from '@/components/manzil/PageFrame';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/manzil/auth';
import { calcLateFee, fetchMyPayments } from '@/lib/manzil/payment';
import { fetchInbox, markAllRead, markRead } from '@/lib/manzil/notify';
import { formatPrice } from '@/lib/manzil/properties';
import type { Notification } from '@/lib/manzil/types';

/** Module 9 — Notification inbox + due reminders */
function Inbox({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { session } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [reminders, setReminders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!session) return;
    setLoading(true);
    const [inbox, payments] = await Promise.all([
      fetchInbox(session.user.id),
      fetchMyPayments(session.user.id),
    ]);
    setItems(inbox);
    // trigger: payment due reminders (3 days) + late alerts — computed live
    const now = new Date();
    const soon = new Date();
    soon.setDate(soon.getDate() + 3);
    const r: string[] = [];
    for (const p of payments) {
      if (p.status !== 'pending' || !p.due_date) continue;
      const due = new Date(p.due_date);
      if (due < now) {
        r.push(`⚠️ Late: ${p.label} — ${formatPrice(p.amount + calcLateFee(p))} (incl. late fee)`);
      } else if (due <= soon) {
        r.push(`⏰ Due in 3 days: ${p.label} — ${formatPrice(p.amount)} (due ${p.due_date})`);
      }
    }
    setReminders(r);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const read = async (id: string) => {
    await markRead(id);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <h1>Inbox</h1>
          <p className="muted" style={{ margin: 0 }}>Notifications & reminders</p>
        </div>
        <div className="link-row" style={{ margin: 0 }}>
          {items.some((n) => !n.read) && (
            <Button variant="legacy"
              className="btn secondary small"
              onClick={async () => {
                if (session) {
                  await markAllRead(session.user.id);
                  load();
                }
              }}
            >
              Mark all read
            </Button>
          )}
          <Button variant="legacy" className="btn secondary small" onClick={() => onNavigate('dashboard')}>Dashboard</Button>
        </div>
      </div>

      {reminders.length > 0 && (
        <div className="notice warn-box" style={{ marginBottom: 12 }}>
          {reminders.map((r, i) => <div key={i}>{r}</div>)}
        </div>
      )}

      {loading ? <p className="muted">Loading…</p> : items.length === 0 && reminders.length === 0 ? (
        <p className="muted">No notifications yet.</p>
      ) : (
        items.map((n) => (
          <div key={n.id} className={`queue-card${n.read ? ' read-dim' : ''}`}>
            <div className="queue-head">
              <div>
                <strong>{n.title}</strong>
                <div className="muted small">{new Date(n.created_at).toLocaleString()}</div>
                {n.body && <p style={{ margin: '8px 0 0' }}>{n.body}</p>}
              </div>
              {!n.read && (
                <Button variant="legacy" className="btn secondary small" onClick={() => read(n.id)}>
                  Mark read
                </Button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export const Route = createFileRoute("/inbox")({ head: () => pageHead("Inbox"), component: RoutePage });
function RoutePage() { const onNavigate = useAppNavigation(); return <PageFrame ><Inbox onNavigate={onNavigate} /></PageFrame>; }
