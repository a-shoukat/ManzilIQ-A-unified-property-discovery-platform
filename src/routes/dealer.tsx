import { Button } from '@/components/ui/button';
import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router';
import { PageFrame, useAppNavigation, pageHead } from '@/components/manzil/PageFrame';
import { useAuth } from '@/lib/manzil/auth';

function DealerHub({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { profile } = useAuth();
  void profile;
  const cards = [
    { page: 'dealer-discover', title: 'Discover Societies', desc: 'Browse societies, view lots, send join requests' },
    { page: 'dealer-lots', title: 'My Lots & Plots', desc: 'Assigned plots, mark showing to client, plot map' },
    { page: 'dealer-leads', title: 'Leads & Pipeline', desc: 'Customer leads, call/visit log, 6-stage deal pipeline' },
    { page: 'dealer/forms', title: 'Sale forms', desc: 'Urdu sale receipt / booking form for buyers' },
    { page: 'dealer/form-settings', title: 'Form header settings', desc: 'Logo, society badges, business details' },
  ];
  return (
    <div className="container">
      <h1>Dealer portal</h1>
      <p className="muted">Societies, lots, leads and deals</p>
      <div className="hub-grid">
        {cards.map((c) => (
          <Button variant="legacy" key={c.page} className="hub-card" onClick={() => onNavigate(c.page)}>
            <strong>{c.title}</strong>
            <span className="muted small">{c.desc}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/dealer")({ head: () => pageHead("Dealer"), component: RoutePage });
/** Nested /dealer/* screens render via Outlet; exact /dealer hub markup unchanged aside from nav cards. */
function RoutePage() {
  const onNavigate = useAppNavigation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isHub = pathname === '/dealer' || pathname === '/dealer/';
  if (!isHub) return <Outlet />;
  return <PageFrame><DealerHub onNavigate={onNavigate} /></PageFrame>;
}
