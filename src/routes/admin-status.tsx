import { Button } from '@/components/ui/button';
import { createFileRoute } from '@tanstack/react-router';
import { PageFrame, useAppNavigation, pageHead } from '@/components/manzil/PageFrame';
import { useEffect, useState } from 'react';
import { errorText } from '@/lib/manzil/errors';
import {
  integrationRows,
  loadSystemStatus,
  type FailedDelivery,
  type ReminderRunSummary,
} from '@/lib/manzil/system-status';
import type { BackendHealth } from '@/lib/manzil/features';

/** Screen 7 — Admin system status (Phase 0 health + recent failures). */
function AdminStatus({ onNavigate }: { onNavigate: (p: string) => void }) {
  const [health, setHealth] = useState<BackendHealth | null>(null);
  const [lastReminder, setLastReminder] = useState<ReminderRunSummary>(null);
  const [failed, setFailed] = useState<FailedDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    loadSystemStatus()
      .then((s) => {
        setHealth(s.health);
        setLastReminder(s.lastReminder);
        setFailed(s.failedNotifications);
      })
      .catch((e) => setError(errorText(e, 'Could not load system status')))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <h1>System status</h1>
          <p className="muted" style={{ margin: 0 }}>Integrations, reminders, failed notifications</p>
        </div>
        <Button variant="legacy" className="btn secondary small" onClick={() => onNavigate('admin')}>
          Admin hub
        </Button>
      </div>

      {error && <div className="error" role="alert">{error}</div>}
      {loading || !health ? (
        <p className="muted">Loading…</p>
      ) : (
        <>
          <div className="notice" style={{ marginBottom: 12 }}>
            Mode: <strong>{health.mode}</strong>
            {health.notes.length > 0 && (
              <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
                {health.notes.map((n) => (
                  <li key={n} className="small">{n}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <h3>Integrations</h3>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Integration</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {integrationRows(health).map((r) => (
                    <tr key={r.key}>
                      <td>{r.label}</td>
                      <td>
                        <span className={`badge ${r.on ? 'ok' : 'warn'}`}>{r.on ? 'active' : 'inactive'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <h3>Last reminder job run</h3>
            {!lastReminder ? (
              <p className="muted">No reminder_runs rows yet.</p>
            ) : (
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-key">Kind</span>
                  <span>{lastReminder.kind}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-key">Status</span>
                  <span>{lastReminder.status}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-key">When</span>
                  <span>{new Date(lastReminder.created_at).toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <h3>Recent failed notifications</h3>
            <p className="muted small">From notification_deliveries (Phase 1 delivery log).</p>
            {failed.length === 0 ? (
              <p className="muted">No failed deliveries.</p>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Channel</th>
                      <th>User</th>
                      <th>Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {failed.map((f) => (
                      <tr key={f.id}>
                        <td className="small">{new Date(f.created_at).toLocaleString()}</td>
                        <td>{f.channel}</td>
                        <td className="small">{f.user_id.slice(0, 8)}</td>
                        <td className="small">{f.detail ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export const Route = createFileRoute('/admin-status')({
  head: () => pageHead('System status'),
  component: RoutePage,
});
function RoutePage() {
  const onNavigate = useAppNavigation();
  return (
    <PageFrame>
      <AdminStatus onNavigate={onNavigate} />
    </PageFrame>
  );
}
