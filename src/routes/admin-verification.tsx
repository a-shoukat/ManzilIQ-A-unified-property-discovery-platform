import { Button } from '@/components/ui/button';
import { createFileRoute } from '@tanstack/react-router';
import { PageFrame, useAppNavigation, pageHead } from '@/components/manzil/PageFrame';
import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/manzil/supabase';
import { getDocumentUrl } from '@/lib/manzil/storage';
import type { VerificationStatus } from '@/lib/manzil/types';

interface QueueItem {
  id: string;
  email: string;
  role: string;
  verification_status: VerificationStatus;
  created_at: string;
  detail: Record<string, string | number | null> | null;
  detailTable: string;
}

/** WBS: Admin Panel — Society Verification (6) + Dealer Verification (5) */
function AdminVerification({ onNavigate }: { onNavigate: (p: string) => void }) {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const load = async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    setLoading(true);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['buyer', 'dealer', 'society_admin'])
      .order('created_at', { ascending: false });

    const out: QueueItem[] = [];
    for (const p of profiles ?? []) {
      const table = p.role === 'dealer' ? 'dealer_details' : p.role === 'buyer' ? 'customer_details' : 'society_details';
      const { data: d } = await supabase
        .from(table)
        .select('*')
        .eq('profile_id', p.id)
        .maybeSingle();
      out.push({ ...p, detail: d ?? null, detailTable: table });
    }
    setItems(out);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const setStatus = async (id: string, status: VerificationStatus) => {
    const supabase = getSupabase();
    if (!supabase) return;
    const reason = reasons[id]?.trim() || null;
    if (status !== 'approved' && !reason) { setError('Please write a reason before rejecting.'); return; }
    setError(null);
    setActing(id);
    const { error: uErr } = await supabase.from('profiles')
      .update({ verification_status: status, rejection_reason: status === 'approved' ? null : reason }).eq('id', id);
    if (uErr) { setError(uErr.message); setActing(null); return; }
    await supabase.from('notifications').insert({
      user_id: id,
      type: 'verification',
      title: status === 'approved' ? 'Your account is approved' : 'Verification not approved',
      body: status === 'approved' ? 'Welcome to ManzilIQ — all features are now unlocked.' : `Reason: ${reason}. Please resubmit from your overview.`,
    });
    setActing(null);
    load();
  };

  const openDoc = async (path: string | null) => {
    if (!path) return;
    const url = await getDocumentUrl(path);
    if (url) window.open(url, '_blank');
  };

  const pending = items.filter((i) => i.verification_status === 'pending');
  const decided = items.filter((i) => i.verification_status !== 'pending');

  const renderRow = (i: QueueItem) => (
    <div key={i.id} className="queue-card">
      <div className="queue-head">
        <div>
          <strong>{i.role === 'dealer' ? i.detail?.['firm_name'] ?? i.email : i.role === 'buyer' ? (i as QueueItem & { full_name?: string }).full_name ?? i.email : i.detail?.['society_name'] ?? i.email}</strong>
          <div className="muted small">
            {i.role === 'dealer' ? 'Dealer' : i.role === 'buyer' ? 'Client' : 'Society'} · {i.email}
          </div>
        </div>
        <span className={`badge ${i.verification_status === 'approved' ? 'ok' : i.verification_status === 'pending' ? 'warn' : 'warn'}`}>
          {i.verification_status}
        </span>
      </div>
      {i.detail && (
        <div className="detail-grid">
          {Object.entries(i.detail)
            .filter(([k]) => !['profile_id', 'created_at'].includes(k))
            .map(([k, v]) => (
              <div key={k} className="detail-item">
                <span className="detail-key">{k.replace(/_/g, ' ')}</span>
                {String(v ?? '').includes('/') && (k.includes('url') || k.includes('doc') || k.includes('photo')) ? (
                  <Button variant="legacy" className="link inline" onClick={() => openDoc(v as string)}>
                    View document
                  </Button>
                ) : (
                  <span>{String(v ?? '—')}</span>
                )
              }
              </div>
            ))}
        </div>
      )}
      {i.verification_status === 'pending' && (
        <div className="queue-actions">
          <input placeholder="Reason (required to reject)" value={reasons[i.id] ?? ''} onChange={(e) => setReasons({ ...reasons, [i.id]: e.target.value })} />
          <Button variant="legacy" className="btn small" disabled={acting === i.id} onClick={() => setStatus(i.id, 'approved')}>
            Approve
          </Button>
          <Button variant="legacy" className="btn secondary small" disabled={acting === i.id} onClick={() => setStatus(i.id, 'rejected')}>
            Reject
          </Button>
          {i.role === 'dealer' && (
            <Button variant="legacy" className="btn danger small" disabled={acting === i.id} onClick={() => setStatus(i.id, 'blacklisted')}>
              Blacklist
            </Button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="page">
      <div className="card wide">
        <div className="topbar">
          <div>
            <h1>Verification queue</h1>
            <p className="muted" style={{ margin: 0 }}>
              Client, dealer & society registrations awaiting review
            </p>
          </div>
          <Button variant="legacy" className="btn secondary small" onClick={() => onNavigate('dashboard')}>
            Dashboard
          </Button>
        </div>

        {error && <div className="error" role="alert">{error}</div>}
        {!loading && items.length === 0 && <p className="muted">No accounts visible. If you expected some, make sure the admin setup script has been run in your database.</p>}
        {loading ? (
          <p className="muted">Loading…</p>
        ) : (
          <>
            <h3>Pending ({pending.length})</h3>
            {pending.length === 0 && <p className="muted">Nothing awaiting review.</p>}
            {pending.map(renderRow)}
            <h3 style={{ marginTop: 24 }}>Decided ({decided.length})</h3>
            {decided.map(renderRow)}
          </>
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/admin-verification")({ head: () => pageHead("Admin Verification"), component: RoutePage });
function RoutePage() { const onNavigate = useAppNavigation(); return <PageFrame ><AdminVerification onNavigate={onNavigate} /></PageFrame>; }
