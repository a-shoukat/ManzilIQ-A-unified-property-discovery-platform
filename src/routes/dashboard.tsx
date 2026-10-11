import { Button } from '@/components/ui/button';
import { createFileRoute } from '@tanstack/react-router';
import { PageFrame, useAppNavigation, pageHead } from '@/components/manzil/PageFrame';
import { useAuth } from '@/lib/manzil/auth';
import { ROLE_LABELS } from '@/lib/manzil/types';
import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/manzil/supabase';
import { CustomerRegistrationForm, DealerRegistrationForm, SocietyRegistrationForm } from '@/components/manzil/RegistrationForms';
import { RoleOverview } from '@/components/manzil/RoleOverview';

const ROLE_HOME: Record<string, { text: string; links: { label: string; page: string }[] }> = {
  buyer: {
    text: 'Search, compare and book plots.',
    links: [
      { label: 'Book a plot', page: 'book-plot' },
      { label: 'My bookings', page: 'my-bookings' },
      { label: 'My payments', page: 'my-payments' },
      { label: 'Documents', page: 'documents' },
      { label: 'My activity', page: 'my-activity' },
    ],
  },
  dealer: {
    text: 'Discover societies, manage your lots and customer leads.',
    links: [
      { label: 'Dealer portal', page: 'dealer' },
      { label: 'Documents', page: 'documents' },
      { label: 'My performance', page: 'dealer-analytics' },
    ],
  },
  society_admin: {
    text: 'Manage inventory, dealers, bookings and finances.',
    links: [
      { label: 'Booking requests', page: 'society-bookings' },
      { label: 'Financials', page: 'society-financials' },
      { label: 'Documents', page: 'documents' },
      { label: 'Sales analytics', page: 'society-analytics' },
    ],
  },
  super_admin: {
    text: 'Full platform control.',
    links: [
      { label: 'Admin panel', page: 'admin' },
      { label: 'Verification queue', page: 'admin-verification' },
    ],
  },
};

function useAdminStats(enabled: boolean) {
  const [stats, setStats] = useState<Record<string, number | null>>({});
  useEffect(() => {
    const db = getSupabase();
    if (!enabled || !db) return;
    const count = async (table: string, filter?: [string, string]) => {
      let q = db.from(table).select('*', { count: 'exact', head: true });
      if (filter) q = q.eq(filter[0], filter[1]);
      const { count: c, error } = await q;
      return error ? null : c ?? 0;
    };
    void Promise.all([
      count('profiles'), count('profiles', ['verification_status', 'pending']), count('properties'),
      count('bookings'), count('payments'), count('disputes', ['status', 'open']),
    ]).then(([users, pending, listings, bookings, payments, disputes]) =>
      setStats({ users, pending, listings, bookings, payments, disputes }));
  }, [enabled]);
  return stats;
}

function AttentionPanel({ onNavigate }: { onNavigate: (p: string) => void }) {
  const [pending, setPending] = useState<{ id: string; email: string; role: string }[]>([]);
  const [disputes, setDisputes] = useState<{ id: string; title?: string; reason?: string }[]>([]);
  useEffect(() => {
    const db = getSupabase(); if (!db) return;
    void db.from('profiles').select('id,email,role').eq('verification_status', 'pending').order('created_at', { ascending: false }).limit(5)
      .then(({ data }) => setPending(data ?? []));
    void db.from('disputes').select('*').eq('status', 'open').limit(5).then(({ data }) => setDisputes(data ?? []));
  }, []);
  return (
    <div className="attention-grid">
      <div className="attention-card">
        <h3>Pending approvals</h3>
        {pending.length === 0 ? <p className="muted small">All caught up.</p> : pending.map((p) => (
          <div key={p.id} className="attention-row"><span>{p.email}<span className="muted small"> · {p.role}</span></span>
            <Button size="sm" onClick={() => onNavigate('admin-verification')}>Review</Button></div>))}
      </div>
      <div className="attention-card">
        <h3>Open disputes</h3>
        {disputes.length === 0 ? <p className="muted small">No open disputes.</p> : disputes.map((d) => (
          <div key={d.id} className="attention-row"><span>{d.title ?? d.reason ?? 'Dispute'}</span>
            <Button size="sm" variant="outline" onClick={() => onNavigate('admin-disputes')}>Open</Button></div>))}
      </div>
    </div>
  );
}

function AdminOverview({ onNavigate }: { onNavigate: (p: string) => void }) {
  const stats = useAdminStats(true);
  const tiles: { key: string; label: string; page: string }[] = [
    { key: 'pending', label: 'Pending approvals', page: 'admin-verification' },
    { key: 'users', label: 'Total users', page: 'admin-users' },
    { key: 'listings', label: 'Listings', page: 'marketplace' },
    { key: 'bookings', label: 'Bookings', page: 'admin-bookings' },
    { key: 'payments', label: 'Payments', page: 'admin-analytics' },
    { key: 'disputes', label: 'Open disputes', page: 'admin-disputes' },
  ];
  const areas: [string, string][] = [
    ['admin-users', 'Users'], ['admin-verification', 'Approvals'], ['admin-bookings', 'Bookings'], ['admin-disputes', 'Disputes'],
    ['admin-templates', 'Legal templates'], ['broadcast', 'Broadcast'], ['admin-analytics', 'Analytics'],
    ['marketplace', 'Listings'], ['add-property', 'Add listing'], ['society', 'Societies'], ['dealer', 'Dealers'],
  ];
  return (
    <>
      <div className="stat-grid">
        {tiles.map((t) => (
          <Button variant="legacy" key={t.key} className="stat-tile" onClick={() => onNavigate(t.page)}>
            <span className="muted small">{t.label}</span>
            <strong>{stats[t.key] ?? '—'}</strong>
          </Button>
        ))}
      </div>
      <AttentionPanel onNavigate={onNavigate} />
      <h3>Manage platform</h3>
      <div className="hub-grid">
        {areas.map(([page, label]) => (
          <Button variant="legacy" key={page} className="hub-card" onClick={() => onNavigate(page)}>
            <strong>{label}</strong>
          </Button>
        ))}
      </div>
    </>
  );
}

function Dashboard({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { profile, details, signOut, refresh } = useAuth();
  const home = profile ? ROLE_HOME[profile.role] : null;
  const isAdmin = profile?.role === 'super_admin';
  const status = profile?.verification_status;
  const needsForm = !isAdmin && profile && (status === 'rejected' || (status === 'pending' && !details));

  const statusBadge = !profile ? <div className="badge">Loading…</div> : isAdmin ? <div className="badge ok">Super admin</div> :
    status === 'approved' ? <div className="badge ok">Verified</div> :
    status === 'pending' ? <div className="badge warn">{details ? 'Awaiting approval' : 'Verification required'}</div> :
    status === 'rejected' ? <div className="badge warn">Rejected</div> : status === 'blacklisted' ? <div className="badge warn">Blacklisted</div> : <div className="badge">Loading…</div>;

  const form = profile?.role === 'dealer' ? DealerRegistrationForm : profile?.role === 'society_admin' ? SocietyRegistrationForm : CustomerRegistrationForm;
  const Form = form;

  return (
    <div className="page">
      <div className="card wide">
        <div className="topbar">
          <div>
            <h1>{isAdmin ? 'Super admin dashboard' : 'ManzilIQ'}</h1>
            <p className="muted" style={{ margin: 0 }}>
              {profile ? ROLE_LABELS[profile.role] : ''} {isAdmin ? '· full platform control' : 'dashboard'}
            </p>
          </div>
          <Button variant="legacy" className="btn secondary small" onClick={async () => { await signOut(); onNavigate('login'); }}>
            Sign out
          </Button>
        </div>
        {statusBadge}
        <p>Signed in as <strong>{profile?.email}</strong></p>

        {!profile && <p className="muted">Setting up your account…</p>}
        {isAdmin && <AdminOverview onNavigate={onNavigate} />}

        {needsForm && (
          <div className="onboarding-box">
            <h3>{status === 'rejected' ? 'Resubmit your verification' : 'Verify your identity'}</h3>
            {status === 'rejected' && profile?.rejection_reason && <div className="error">Reason: {profile.rejection_reason}</div>}
            <p className="muted">Submit your details below. A super admin will review and approve your account.</p>
            <Form onDone={() => { void refresh(); }} />
          </div>
        )}
        {!isAdmin && status === 'pending' && details && (
          <div className="notice">Thanks! Your documents are under review. You'll be notified once approved.</div>
        )}

        {!isAdmin && status === 'approved' && home && profile && (
          <RoleOverview role={profile.role} userId={profile.id} onNavigate={onNavigate} />
        )}

        <div className="link-row">
          <Button variant="legacy" className="btn small" onClick={() => onNavigate('marketplace')}>Browse marketplace</Button>
          <Button variant="legacy" className="btn secondary small" onClick={() => onNavigate('map-view')}>Society map</Button>
          <Button variant="legacy" className="btn secondary small" onClick={() => onNavigate('compare')}>Compare plots</Button>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/dashboard")({ head: () => pageHead("Dashboard"), component: RoutePage });
function RoutePage() { const onNavigate = useAppNavigation(); return <PageFrame ><Dashboard onNavigate={onNavigate} /></PageFrame>; }
