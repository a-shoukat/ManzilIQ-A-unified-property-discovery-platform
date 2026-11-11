import { Button } from '@/components/ui/button';
import { createFileRoute } from '@tanstack/react-router';
import { PageFrame, useAppNavigation, pageHead } from '@/components/manzil/PageFrame';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/manzil/auth';
import { errorText } from '@/lib/manzil/errors';
import {
  convertInquiryToLead,
  fetchInquiryThread,
  fetchOwnerInquiries,
  INQUIRY_STATUSES,
  replySchema,
  replyToInquiry,
  setInquiryStatus,
  unreadInquiryCount,
} from '@/lib/manzil/inquiry-crm';
import type { Inquiry, InquiryReply, InquiryStatus } from '@/lib/manzil/inquiries';

/** Screen 1 — Owner/dealer/society inquiry inbox (dealer leads CRM layout). */
function InquiriesInbox({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { session, profile } = useAuth();
  const [list, setList] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<InquiryStatus | 'all'>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [replies, setReplies] = useState<InquiryReply[]>([]);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [formErr, setFormErr] = useState<string | null>(null);

  const load = async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      setList(await fetchOwnerInquiries(session.user.id));
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

  const visible = useMemo(
    () => (statusFilter === 'all' ? list : list.filter((i) => i.status === statusFilter)),
    [list, statusFilter],
  );
  const unread = unreadInquiryCount(list);
  const isDealer = profile?.role === 'dealer';

  const openThread = async (id: string) => {
    if (openId === id) {
      setOpenId(null);
      return;
    }
    setOpenId(id);
    setReplies((await fetchInquiryThread(id)).replies);
  };

  const changeStatus = async (id: string, status: InquiryStatus) => {
    setBusy(true);
    try {
      await setInquiryStatus(id, status);
      setList((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
      setMsg(`Status set to ${status}`);
    } catch (e) {
      setError(errorText(e, 'Could not update status'));
    } finally {
      setBusy(false);
    }
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
      setMsg('Reply sent');
    } catch (e) {
      setFormErr(errorText(e, 'Could not send reply'));
    } finally {
      setBusy(false);
    }
  };

  const convert = async (inq: Inquiry) => {
    if (!session || !isDealer) {
      setMsg('Convert to lead is available for dealer accounts (dealer leads pipeline).');
      return;
    }
    setBusy(true);
    try {
      await convertInquiryToLead(inq, session.user.id);
      setMsg('Converted to lead');
      await load();
    } catch (e) {
      setError(errorText(e, 'Could not convert to lead'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <h1>Inquiries</h1>
          <p className="muted" style={{ margin: 0 }}>
            {list.length} inquiries
            {unread > 0 && (
              <span className="side-count" style={{ marginLeft: 8 }}>{unread} new</span>
            )}
          </p>
        </div>
        <div className="link-row" style={{ margin: 0 }}>
          {isDealer && (
            <Button variant="legacy" className="btn secondary small" onClick={() => onNavigate('dealer-leads')}>
              Leads pipeline
            </Button>
          )}
          <Button variant="legacy" className="btn secondary small" onClick={() => onNavigate('dashboard')}>
            Dashboard
          </Button>
        </div>
      </div>

      {msg && <div className="notice" style={{ marginBottom: 12 }}>{msg}</div>}
      {error && <div className="error" role="alert">{error}</div>}

      <div className="link-row" style={{ marginBottom: 12 }}>
        <Button
          variant="legacy"
          className={`btn secondary small${statusFilter === 'all' ? ' active' : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          All
        </Button>
        {INQUIRY_STATUSES.map((s) => (
          <Button
            key={s}
            variant="legacy"
            className={`btn secondary small${statusFilter === s ? ' active' : ''}`}
            onClick={() => setStatusFilter(s)}
          >
            {s}
          </Button>
        ))}
      </div>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : visible.length === 0 ? (
        <p className="muted">No inquiries in this filter.</p>
      ) : (
        visible.map((inq) => (
          <div key={inq.id} className={`queue-card${inq.status === 'new' ? '' : ' read-dim'}`}>
            <div className="queue-head">
              <div>
                <strong>{inq.name}</strong>
                <div className="muted small">
                  {[inq.phone, inq.email].filter(Boolean).join(' · ') || 'No contact'}
                  {' · '}
                  {new Date(inq.created_at).toLocaleString()}
                </div>
                <p style={{ margin: '8px 0 0' }}>{inq.message}</p>
              </div>
              <span className={`badge ${inq.status === 'converted' || inq.status === 'closed' ? 'ok' : 'warn'}`}>
                {inq.status}
              </span>
            </div>
            <div className="queue-actions" style={{ flexWrap: 'wrap', gap: 8 }}>
              <label className="small">
                Status
                <select
                  value={inq.status}
                  disabled={busy}
                  onChange={(e) => void changeStatus(inq.id, e.target.value as InquiryStatus)}
                >
                  {INQUIRY_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>
              <Button variant="legacy" className="btn secondary small" onClick={() => void openThread(inq.id)}>
                {openId === inq.id ? 'Hide thread' : 'Thread'}
              </Button>
              {isDealer && !inq.lead_id && (
                <Button variant="legacy" className="btn small" disabled={busy} onClick={() => void convert(inq)}>
                  Convert to lead
                </Button>
              )}
              {inq.lead_id && <span className="muted small">Linked to lead</span>}
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
                  Reply
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

export const Route = createFileRoute('/inquiries')({
  head: () => pageHead('Inquiries'),
  component: RoutePage,
});
function RoutePage() {
  const onNavigate = useAppNavigation();
  return (
    <PageFrame>
      <InquiriesInbox onNavigate={onNavigate} />
    </PageFrame>
  );
}
