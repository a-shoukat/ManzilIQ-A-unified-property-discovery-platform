import { Button } from '@/components/ui/button';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { PageFrame, useAppNavigation, pageHead } from '@/components/manzil/PageFrame';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/manzil/auth';
import { calcLateFee, fetchMyPayments } from '@/lib/manzil/payment';
import { fetchInbox, markAllRead, markRead } from '@/lib/manzil/notify';
import { formatPrice } from '@/lib/manzil/properties';
import type { Notification } from '@/lib/manzil/types';
import { formatAppDate } from '@/lib/i18n';
import { useLanguage } from '@/lib/i18n/LanguageProvider';

/** Module 9 — Notification inbox + due reminders */
function Inbox({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { t } = useTranslation(['notifications', 'common', 'auth']);
  const { language } = useLanguage();
  const { session } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [reminders, setReminders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const marking = useRef<Set<string>>(new Set());

  const load = async () => {
    if (!session) return;
    setLoading(true);
    const [inbox, payments] = await Promise.all([
      fetchInbox(session.user.id),
      fetchMyPayments(session.user.id),
    ]);
    // Dedupe identical title+body notifications that double-fired.
    const seen = new Set<string>();
    const deduped: Notification[] = [];
    for (const n of inbox) {
      const key = `${n.title}::${n.body ?? ''}::${n.read}`;
      if (seen.has(key) && !n.read) continue;
      if (seen.has(`${n.title}::${n.body ?? ''}`)) continue;
      seen.add(`${n.title}::${n.body ?? ''}`);
      seen.add(key);
      deduped.push(n);
    }
    setItems(deduped);
    const now = new Date();
    const soon = new Date();
    soon.setDate(soon.getDate() + 3);
    const r: string[] = [];
    for (const p of payments) {
      if (p.status !== 'pending' || !p.due_date) continue;
      if (!(Number(p.amount) > 0)) continue;
      const due = new Date(p.due_date);
      const late = calcLateFee(p);
      if (due < now) {
        // Hide "Late PKR 0" noise when late fee is zero — still surface overdue principal.
        if (late <= 0) {
          r.push(t('notifications:dueSoon', { label: p.label, amount: formatPrice(p.amount), date: p.due_date }));
        } else {
          r.push(t('notifications:lateAlert', { label: p.label, amount: formatPrice(p.amount + late) }));
        }
      } else if (due <= soon) {
        r.push(t('notifications:dueSoon', { label: p.label, amount: formatPrice(p.amount), date: p.due_date }));
      }
    }
    setReminders(r);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, session?.user.id]);

  const read = async (id: string) => {
    if (marking.current.has(id)) return;
    marking.current.add(id);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await markRead(id);
    } finally {
      marking.current.delete(id);
    }
  };

  const unread = items.filter((n) => !n.read).length;

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <h1>
            {t('notifications:inboxTitle')}
            {unread > 0 && <span className="side-count" style={{ marginLeft: 8 }}>{unread}</span>}
          </h1>
          <p className="muted" style={{ margin: 0 }}>{t('notifications:reminders')}</p>
        </div>
        <div className="link-row" style={{ margin: 0 }}>
          {unread > 0 && (
            <Button
              variant="legacy"
              className="btn secondary small"
              onClick={async () => {
                if (!session) return;
                setItems((prev) => prev.map((n) => ({ ...n, read: true })));
                await markAllRead(session.user.id);
              }}
            >
              {t('notifications:markAllRead')}
            </Button>
          )}
          <Button variant="legacy" className="btn secondary small" onClick={() => onNavigate('dashboard')}>{t('common:dashboard')}</Button>
        </div>
      </div>

      {reminders.length > 0 && (
        <div className="notice warn-box" style={{ marginBottom: 12 }}>
          {reminders.map((r, i) => <div key={i}>{r}</div>)}
        </div>
      )}

      {loading ? <p className="muted">{t('auth:loadingEllipsis')}</p> : items.length === 0 && reminders.length === 0 ? (
        <p className="muted">{t('notifications:empty')}</p>
      ) : (
        items.map((n) => (
          <div
            key={n.id}
            className={`queue-card${n.read ? ' read-dim' : ''}`}
            role="button"
            tabIndex={0}
            onClick={() => { if (!n.read) void read(n.id); }}
            onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !n.read) { e.preventDefault(); void read(n.id); } }}
          >
            <div className="queue-head">
              <div>
                <strong>{n.title}{!n.read && <span className="badge warn" style={{ marginLeft: 8 }}>Unread</span>}</strong>
                <div className="muted small">{formatAppDate(n.created_at, language, { dateStyle: 'medium', timeStyle: 'short' })}</div>
                {n.body && <p style={{ margin: '8px 0 0' }}>{n.body}</p>}
              </div>
              {!n.read && (
                <Button
                  variant="legacy"
                  className="btn secondary small"
                  onClick={(e) => { e.stopPropagation(); void read(n.id); }}
                >
                  {t('notifications:markRead')}
                </Button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export const Route = createFileRoute('/inbox')({ head: () => pageHead('Inbox'), component: RoutePage });
function RoutePage() {
  const onNavigate = useAppNavigation();
  return <PageFrame><Inbox onNavigate={onNavigate} /></PageFrame>;
}
