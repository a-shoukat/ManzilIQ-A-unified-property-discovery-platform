import { Button } from '@/components/ui/button';
import { createFileRoute } from '@tanstack/react-router';
import { PageFrame, useAppNavigation, pageHead } from '@/components/manzil/PageFrame';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/manzil/auth';
import { fetchApprovedSocieties } from '@/lib/manzil/society';

export function useSocietyId(): { societyId: string | null; societies: { id: string; name: string }[]; setSocietyId: (id: string) => void } {
  const { profile } = useAuth();
  const [societies, setSocieties] = useState<{ id: string; name: string }[]>([]);
  const [societyId, setSocietyId] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.role === 'society_admin') {
      setSocietyId(profile.id);
    } else if (profile?.role === 'super_admin') {
      fetchApprovedSocieties().then((list) => {
        setSocieties(list.map((s) => ({ id: s.id, name: s.name })));
        if (list[0]) setSocietyId(list[0].id);
      });
    }
  }, [profile]);

  return { societyId, societies, setSocietyId };
}

function SocietyHub({ onNavigate }: { onNavigate: (p: string) => void }) {
  const cards = [
    { page: 'society-inventory', title: 'Plot Inventory', desc: 'CSV upload, manual entry, block grouping, edit / delete' },
    { page: 'society-map', title: 'Interactive Plot Map', desc: 'Color-coded availability, block switcher, zoom' },
    { page: 'society-dealers', title: 'Dealer Management', desc: 'Join requests, lot assignment, commission, revoke' },
  ];
  return (
    <div className="container">
      <h1>Society portal</h1>
      <p className="muted">Manage inventory, map and dealers</p>
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

export const Route = createFileRoute("/society")({ head: () => pageHead("Society"), component: RoutePage });
function RoutePage() { const onNavigate = useAppNavigation(); return <PageFrame ><SocietyHub onNavigate={onNavigate} /></PageFrame>; }
