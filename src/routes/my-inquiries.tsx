import { Button } from '@/components/ui/button';
import { createFileRoute } from '@tanstack/react-router';
import { PageFrame, useAppNavigation, pageHead } from '@/components/manzil/PageFrame';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/manzil/auth';
import { errorText } from '@/lib/manzil/errors';
import {
  fetchInquiryThread,
  fetchMyInquiries,
  replySchema,
  replyToInquiry,
} from '@/lib/manzil/inquiry-crm';
import type { Inquiry, InquiryReply } from '@/lib/manzil/inquiries';

/** Screen 1 — Buyer inquiry list + thread (matches inbox / leads CRM style). */
function MyInquiries({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { session } = useAuth();
  const [list, setList] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [replies, setReplies] = useState<InquiryReply[]>([]);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);

  const load = async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      setList(await fetchMyInquiries(session.user.id));
    } catch (e) {
      setError(errorText(e, 'Could not load inquiries'));
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openThread = async (id: string) => {
    if (openId === id) {
      setOpenId(null);
      return;
    }
    setOpenId(id);
    const t = await fetchInquiryThread(id);
    setReplies(t.replies);
  };

  const sendReply = async (inquiryId: string) => {
    if (!session) return;
    const parsed = replySchema.safeParse({ body });
    if (!parsed.success) {
      setFormErr(parsed.error.issues[0]?.message ?? 'Invalid reply');
      return;
    }
    setFormErr(null);
    setBusy(true);
    try {
      await replyToInquiry(inquiryId, session.user.id, parsed.data.body);
      setBody('');
      setReplies((await fetchInquiryThread(inquiryId)).replies);
      await load();
    } catch (e) {
      setFormErr(errorText(e, 'Could not send reply'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <h1>My inquiries</h1>
          <p className="muted" style={{ margin: 0 }}>Messages you sent about listings</p>
        </div>
        <div className="link-row" style={{ margin: 0 }}>
          <Button variant="legacy" className="btn secondary small" onClick={() => onNavigate('inbox')}>Inbox</Button>
          <Button variant="legacy" className="btn secondary small" onClick={() => onNavigate('dashboard')}>Dashboard</Button>
        </div>
      </div>

      {error && <div className="error" role="alert">{error}</div>}
      {loading ? (
        <p className="muted">Loading…</p>
      ) : list.length === 0 ? (
        <p className="muted">No inquiries yet. Contact a listing owner from a property page.</p>
      ) : (
        list.map((inq) => (
          <div key={inq.id} className="queue-card">
            <div className="queue-head">
              <div>
                <strong>{inq.name}</strong>
                <div className="muted small">{new Date(inq.created_at).toLocaleString()}</div>
                <p style={{ margin: '8px 0 0' }}>{inq.message}</p>
              </div>
              <span className={`badge ${inq.status === 'new' ? 'warn' : inq.status === 'converted' || inq.status === 'closed' ? 'ok' : 'warn'}`}>
                {inq.status}
              </span>
            </div>
            <div className="link-row">
              <Button variant="legacy" className="btn secondary small" onClick={() => void openThread(inq.id)}>
                {openId === inq.id ? 'Hide thread' : 'Open thread'}
              </Button>
            </div>
            {openId === inq.id && (
              <div style={{ marginTop: 12 }}>
                {replies.length === 0 ? (
                  <p className="muted small">No replies yet.</p>
                ) : (
                  replies.map((r) => (
                    <div key={r.id} className="detail-item" style={{ marginBottom: 8 }}>
                      <span className="muted small">{new Date(r.created_at).toLocaleString()}</span>
                      <p style={{ margin: '4px 0 0' }}>{r.body}</p>
                    </div>
                  ))
                )}
                <label>
                  Your reply
                  <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} />
                </label>
                {formErr && <div className="error" role="alert">{formErr}</div>}
                <Button variant="legacy" className="btn small" disabled={busy} onClick={() => void sendReply(inq.id)}>
                  {busy ? 'Sending…' : 'Send reply'}
                </Button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

export const Route = createFileRoute('/my-inquiries')({
  head: () => pageHead('My inquiries'),
  component: RoutePage,
});
function RoutePage() {
  const onNavigate = useAppNavigation();
  return (
    <PageFrame>
      <MyInquiries onNavigate={onNavigate} />
    </PageFrame>
  );
}
