import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
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
import { NOTIF_PREFS_COPY as C } from '@/lib/manzil/phase10-copy/notifications';

/** Screen 5 — Notification preferences (all roles). */
function NotificationSettings({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { t } = useTranslation(['notifications', 'common']);
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
      .catch((e) => setError(errorText(e, C.loadError)))
      .finally(() => setLoading(false));
  }, [session]);

  const save = async () => {
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      await saveNotificationPrefs(session.user.id, prefs);
      setMsg(C.saved);
    } catch (e) {
      setError(errorText(e, C.saveError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <h1>{C.title}</h1>
          <p className="muted" style={{ margin: 0 }}>{C.subtitle}</p>
        </div>
        <div className="link-row" style={{ margin: 0 }}>
          <Button variant="legacy" className="btn secondary small" onClick={() => onNavigate('profile')}>
            {C.profileLink}
          </Button>
          <Button variant="legacy" className="btn secondary small" onClick={() => onNavigate('inbox')}>
            {C.inboxLink}
          </Button>
        </div>
      </div>

      {msg && <div className="notice" style={{ marginBottom: 12 }}>{msg}</div>}
      {error && <div className="error" role="alert">{error}</div>}

      {loading ? (
        <p className="muted">{C.loading}</p>
      ) : (
        <div className="card wide">
          <h3>{C.channels}</h3>
          {(
            [
              ['in_app', C.channelLabels.in_app],
              ['email', C.channelLabels.email],
              ['sms', C.channelLabels.sms],
              ['push', C.channelLabels.push],
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

          <h3 style={{ marginTop: 16 }}>{C.events}</h3>
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
            {busy ? C.saving : C.save}
          </Button>
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute('/settings/notifications')({
  head: () => pageHead(C.title),
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
