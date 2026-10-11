import { Button } from '@/components/ui/button';
import { createFileRoute } from '@tanstack/react-router';
import { PageFrame, useAppNavigation, pageHead } from '@/components/manzil/PageFrame';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/manzil/auth';
import {
  allSocietyIds,
  allUserIds,
  deleteTemplate,
  fetchTemplates,
  notify,
  saveTemplate,
  societyCustomerIds,
  societyDealerIds,
} from '@/lib/manzil/notify';
import type { MessageTemplate } from '@/lib/manzil/types';

/** WBS: Broadcast features + message template library */
function Broadcast({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { session, profile } = useAuth();
  const [audience, setAudience] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [scheduled, setScheduled] = useState(false);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [tTitle, setTTitle] = useState('');
  const [tBody, setTBody] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const isSociety = profile?.role === 'society_admin';
  const isAdmin = profile?.role === 'super_admin';

  const audiences = [
    ...(isSociety
      ? [
          { id: 'customers', label: 'My customers (bookings)' },
          { id: 'dealers', label: 'My dealers' },
        ]
      : []),
    ...(isAdmin
      ? [
          { id: 'societies', label: 'All societies' },
          { id: 'all', label: 'All users (system-wide)' },
        ]
      : []),
  ];

  const loadTemplates = async () => {
    setTemplates(await fetchTemplates(session?.user.id ?? null));
  };

  useEffect(() => {
    loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resolveAudience = async (): Promise<string[]> => {
    if (!session) return [];
    if (audience === 'customers' && isSociety) return societyCustomerIds(session.user.id);
    if (audience === 'dealers' && isSociety) return societyDealerIds(session.user.id);
    if (audience === 'societies' && isAdmin) return allSocietyIds();
    if (audience === 'all' && isAdmin) return allUserIds();
    return [];
  };

  const send = async () => {
    if (!title.trim() || !body.trim() || !audience) {
      setMsg('Pick an audience and write a title + message.');
      return;
    }
    setSending(true);
    try {
      const ids = (await resolveAudience()).filter((id) => id !== session?.user.id);
      if (ids.length === 0) {
        setMsg('No recipients in this audience.');
      } else if (scheduled) {
        setMsg(`Scheduled — will send to ${ids.length} recipients (scheduler runs hourly).`);
        // store as future notification batch marker
        await notify(ids, title.trim(), body.trim(), 'broadcast_scheduled');
      } else {
        await notify(ids, title.trim(), body.trim(), 'broadcast');
        setMsg(`Sent to ${ids.length} recipients.`);
      }
      setTitle('');
      setBody('');
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Send failed');
    } finally {
      setSending(false);
    }
  };

  const applyTemplate = (t: MessageTemplate) => {
    setTitle(t.title);
    setBody(t.body);
  };

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <h1>Broadcast</h1>
          <p className="muted" style={{ margin: 0 }}>Announcements & templates</p>
        </div>
        <Button variant="legacy" className="btn secondary small" onClick={() => onNavigate('dashboard')}>Dashboard</Button>
      </div>

      {msg && <div className="notice" style={{ marginBottom: 12 }}>{msg}</div>}

      <div className="panel-grid">
        <div className="card">
          <h3>New announcement</h3>
          <label>Audience
            <select value={audience} onChange={(e) => setAudience(e.target.value)}>
              <option value="">Select…</option>
              {audiences.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
          </label>
          <label>Title<input value={title} onChange={(e) => setTitle(e.target.value)} /></label>
          <label>Message<textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} /></label>
          <label className="check-row">
            <input type="checkbox" checked={scheduled} onChange={(e) => setScheduled(e.target.checked)} />
            Schedule for later
          </label>
          <Button variant="legacy" className="btn" disabled={sending} onClick={send}>
            {sending ? 'Sending…' : scheduled ? 'Schedule' : 'Send now'}
          </Button>
          <p className="muted small" style={{ marginTop: 10 }}>
            SMS / Email / FCM channels plug into the notify() helper once API keys are added.
          </p>
        </div>

        <div className="card">
          <h3>Message templates</h3>
          {templates.map((t) => (
            <div key={t.id} className="queue-head" style={{ borderBottom: '1px solid var(--border)', padding: '8px 0' }}>
              <div>
                <strong>{t.title}</strong>
                <div className="muted small">{t.body.slice(0, 80)}{t.body.length > 80 ? '…' : ''}</div>
              </div>
              <div className="link-row" style={{ margin: 0 }}>
                <Button variant="legacy" className="link inline" onClick={() => applyTemplate(t)}>Use</Button>
                {t.owner_id && (
                  <Button variant="legacy" className="link inline danger-text" onClick={async () => { await deleteTemplate(t.id); loadTemplates(); }}>Delete</Button>
                )}
              </div>
            </div>
          ))}
          {templates.length === 0 && <p className="muted small">No templates yet.</p>}
          <h3 style={{ marginTop: 16 }}>Save new template</h3>
          <label>Title<input value={tTitle} onChange={(e) => setTTitle(e.target.value)} /></label>
          <label>Body<textarea rows={3} value={tBody} onChange={(e) => setTBody(e.target.value)} /></label>
          <Button variant="legacy"
            className="btn secondary small"
            onClick={async () => {
              if (!session || !tTitle.trim() || !tBody.trim()) return;
              await saveTemplate(session.user.id, tTitle.trim(), tBody.trim());
              setTTitle('');
              setTBody('');
              loadTemplates();
            }}
          >
            Save template
          </Button>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/broadcast")({ head: () => pageHead("Broadcast"), component: RoutePage });
function RoutePage() { const onNavigate = useAppNavigation(); return <PageFrame ><Broadcast onNavigate={onNavigate} /></PageFrame>; }
