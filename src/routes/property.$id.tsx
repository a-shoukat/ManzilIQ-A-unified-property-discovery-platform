import { Button } from '@/components/ui/button';
import { createFileRoute } from '@tanstack/react-router';
import { PageFrame, useAppNavigation, pageHead } from '@/components/manzil/PageFrame';
import { useEffect, useState } from 'react';
import { fetchProperty, formatPrice } from '@/lib/manzil/properties';
import { useCompare } from '@/lib/manzil/compare';
import type { Property } from '@/lib/manzil/types';

function PropertyDetail({
  id,
  onNavigate,
}: {
  id: string;
  onNavigate: (p: string, arg?: string) => void;
}) {
  const [p, setP] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const { toggle, has } = useCompare();

  useEffect(() => {
    fetchProperty(id).then((prop) => {
      setP(prop);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="container">
        <p className="muted">Loading…</p>
      </div>
    );
  }

  if (!p) {
    return (
      <div className="container">
        <p className="muted">Property not found.</p>
        <Button variant="legacy" className="btn secondary small" onClick={() => onNavigate('marketplace')}>
          Back to marketplace
        </Button>
      </div>
    );
  }

  const rows: [string, string][] = [
    ['City', p.city],
    ['Area', p.area ?? '—'],
    ['Society', p.society_name ?? '—'],
    ['Block', p.block ?? '—'],
    ['Plot size', `${p.plot_size_marla} Marla`],
    ['Category', p.category],
    ['Purpose', p.purpose],
    ['Bedrooms', p.bedrooms != null ? String(p.bedrooms) : '—'],
    ['Bathrooms', p.bathrooms != null ? String(p.bathrooms) : '—'],
    ['Status', p.status],
  ];

  return (
    <div className="container">
      <Button variant="legacy" className="btn secondary small" onClick={() => onNavigate('marketplace')}>
        ← Back
      </Button>
      <div className="detail-hero">
        <div className="prop-img large">
          {p.image_url ? (
            <img src={p.image_url} alt={p.title} />
          ) : (
            <div className="prop-img-fallback">{p.category === 'commercial' ? '🏢' : '🏠'}</div>
          )}
        </div>
        <div>
          <h1>{p.title}</h1>
          <p className="muted">
            {p.city}
            {p.area ? ` · ${p.area}` : ''}
          </p>
          <p className="price big">{formatPrice(p.price)}</p>
          <div className="link-row">
            <Button variant="legacy" className={`btn small ${has(p.id) ? 'secondary' : ''}`} onClick={() => toggle(p)}>
              {has(p.id) ? '✓ In comparison' : '+ Add to compare'}
            </Button>
          </div>
        </div>
      </div>
      {p.description && <p className="desc">{p.description}</p>}
      <div className="spec-table">
        {rows.map(([k, v]) => (
          <div key={k} className="spec-row">
            <span className="detail-key">{k}</span>
            <span>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/property/$id")({ head: () => pageHead("Property"), component: RoutePage });
function RoutePage() { const onNavigate = useAppNavigation(); return <PageFrame publicPage><PropertyDetail id={Route.useParams().id} onNavigate={onNavigate} /></PageFrame>; }
