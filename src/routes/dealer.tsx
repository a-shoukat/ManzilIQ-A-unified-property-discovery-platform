import { Button } from '@/components/ui/button';
import { createFileRoute } from '@tanstack/react-router';
import { PageFrame, useAppNavigation, pageHead } from '@/components/manzil/PageFrame';
import { useAuth } from '@/lib/manzil/auth';

function DealerHub({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { profile } = useAuth();
  void profile;
  const cards = [
    { page: 'dealer-discover', title: 'Discover Societies', desc: 'Browse societies, view lots, send join requests' },
    { page: 'dealer-lots', title: 'My Lots & Plots', desc: 'Assigned plots, mark showing to client, plot map' },
    { page: 'dealer-leads', title: 'Leads & Pipeline', desc: 'Customer leads, call/visit log, 6-stage deal pipeline' },
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
function RoutePage() { const onNavigate = useAppNavigation(); return <PageFrame ><DealerHub onNavigate={onNavigate} /></PageFrame>; }
