import { Button } from '@/components/ui/button';
import { createFileRoute } from '@tanstack/react-router';
import { PageFrame, useAppNavigation, pageHead } from '@/components/manzil/PageFrame';
import { useAuth } from '@/lib/manzil/auth';
import { ROLE_LABELS } from '@/lib/manzil/types';

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

function Dashboard({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { profile, signOut } = useAuth();
  const home = profile ? ROLE_HOME[profile.role] : null;

  const statusBadge =
    profile?.verification_status === 'approved' ? (
      <div className="badge ok">Verified</div>
    ) : profile?.verification_status === 'pending' ? (
      <div className="badge warn">Pending verification</div>
    ) : profile?.verification_status === 'rejected' ? (
      <div className="badge warn">Rejected</div>
    ) : (
      <div className="badge warn">Blacklisted</div>
    );

  return (
    <div className="page">
      <div className="card wide">
        <div className="topbar">
          <div>
            <h1>ManzilIQ</h1>
            <p className="muted" style={{ margin: 0 }}>
              {profile ? ROLE_LABELS[profile.role] : ''} dashboard
            </p>
          </div>
          <Button variant="legacy"
            className="btn secondary small"
            onClick={async () => {
              await signOut();
              onNavigate('login');
            }}
          >
            Sign out
          </Button>
        </div>

        {statusBadge}
        <p>
          Signed in as <strong>{profile?.email}</strong>
        </p>
        <p className="muted">{home?.text}</p>

        {home && home.links.length > 0 && (
          <div className="link-row">
            {home.links.map((l) => (
              <Button variant="legacy" key={l.page} className="btn secondary small" onClick={() => onNavigate(l.page)}>
                {l.label}
              </Button>
            ))}
          </div>
        )}

        <div className="link-row">
          <Button variant="legacy" className="btn small" onClick={() => onNavigate('marketplace')}>
            Browse marketplace
          </Button>
          <Button variant="legacy" className="btn secondary small" onClick={() => onNavigate('map-view')}>
            Society map
          </Button>
          <Button variant="legacy" className="btn secondary small" onClick={() => onNavigate('compare')}>
            Compare plots
          </Button>
        </div>

      </div>
    </div>
  );
}

export const Route = createFileRoute("/dashboard")({ head: () => pageHead("Dashboard"), component: RoutePage });
function RoutePage() { const onNavigate = useAppNavigation(); return <PageFrame ><Dashboard onNavigate={onNavigate} /></PageFrame>; }
