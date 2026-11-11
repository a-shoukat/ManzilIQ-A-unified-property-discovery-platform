import { Button } from '@/components/ui/button';
import { createFileRoute } from '@tanstack/react-router';
import { PageFrame, useAppNavigation, pageHead } from '@/components/manzil/PageFrame';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/manzil/auth';
import { errorText } from '@/lib/manzil/errors';
import {
  DEFAULT_PREFS,
  EVENT_TYPES,
  fetchNotificationPrefs,
  saveNotificationPrefs,
  type NotificationPrefs,
} from '@/lib/manzil/notification-prefs';

/** Screen 5 — Notification preferences (all roles). */
function NotificationSettings({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { session } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPrefs>({ ...DEFAULT_PREFS, events: { ...DEFAULT_PREFS.events } });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    fetchNotificationPrefs(session.user.id)
      .then(setPrefs)
      .catch((e) => setError(errorText(e, 'Could not load preferences')))
      .finally(() => setLoading(false));
  }, [session]);

  const save = async () => {
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      await saveNotificationPrefs(session.user.id, prefs);
      setMsg('Preferences saved');
    } catch (e) {
      setError(
        errorText(
          e,
          'Could not save. Run reference/migrations/10_phase10_ui_support.sql if the table is missing.',
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <h1>Notification preferences</h1>
          <p className="muted" style={{ margin: 0 }}>Channels and event types</p>
        </div>
        <div className="link-row" style={{ margin: 0 }}>
          <Button variant="legacy" className="btn secondary small" onClick={() => onNavigate('profile')}>
            Profile & settings
          </Button>
          <Button variant="legacy" className="btn secondary small" onClick={() => onNavigate('inbox')}>
            Inbox
          </Button>
        </div>
      </div>

      {msg && <div className="notice" style={{ marginBottom: 12 }}>{msg}</div>}
      {error && <div className="error" role="alert">{error}</div>}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <div className="card wide">
          <h3>Channels</h3>
          {(
            [
              ['in_app', 'In-app'],
              ['email', 'Email'],
              ['sms', 'SMS'],
              ['push', 'Push'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="small" style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <input
                type="checkbox"
                checked={prefs[key]}
                onChange={(e) => setPrefs({ ...prefs, [key]: e.target.checked })}
              />
              {label}
            </label>
          ))}

          <h3 style={{ marginTop: 16 }}>Events</h3>
          {EVENT_TYPES.map((ev) => (
            <label key={ev} className="small" style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <input
                type="checkbox"
                checked={!!prefs.events[ev]}
                onChange={(e) =>
                  setPrefs({
                    ...prefs,
                    events: { ...prefs.events, [ev]: e.target.checked },
                  })
                }
              />
              {ev.replace(/_/g, ' ')}
            </label>
          ))}

          <Button variant="legacy" className="btn small" disabled={busy} onClick={() => void save()}>
            {busy ? 'Saving…' : 'Save preferences'}
          </Button>
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute('/settings/notifications')({
  head: () => pageHead('Notification preferences'),
  component: RoutePage,
});
function RoutePage() {
  const onNavigate = useAppNavigation();
  return (
    <PageFrame>
      <NotificationSettings onNavigate={onNavigate} />
    </PageFrame>
  );
}
