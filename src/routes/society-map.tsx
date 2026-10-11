import { Button } from '@/components/ui/button';
import { createFileRoute } from '@tanstack/react-router';
import { PageFrame, useAppNavigation, pageHead } from '@/components/manzil/PageFrame';
import { useEffect, useState } from 'react';
import { fetchPlots } from '@/lib/manzil/society';
import { formatPrice } from '@/lib/manzil/properties';
import type { Plot } from '@/lib/manzil/types';
import { useSocietyId } from './society';

const STATUS_COLOR: Record<Plot['status'], string> = {
  available: '#16a34a',
  assigned: '#2563eb',
  reserved: '#d97706',
  sold: '#64748b',
  blocked: '#dc2626',
};

/** WBS: Society Portal — Interactive Plot Map (5 features) */
function PlotMap({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { societyId } = useSocietyId();
  const [plots, setPlots] = useState<Plot[]>([]);
  const [block, setBlock] = useState('');
  const [zoom, setZoom] = useState(1);
  const [selected, setSelected] = useState<Plot | null>(null);

  useEffect(() => {
    if (societyId) fetchPlots(societyId).then(setPlots);
  }, [societyId]);

  const blocks = [...new Set(plots.map((p) => p.block))].sort();
  const activeBlock = block || blocks[0] || '';
  const shown = plots.filter((p) => p.block === activeBlock);

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <h1>Interactive plot map</h1>
          <p className="muted" style={{ margin: 0 }}>Color-coded availability</p>
        </div>
        <Button variant="legacy" className="btn secondary small" onClick={() => onNavigate('society')}>Society portal</Button>
      </div>

      <div className="map-toolbar">
        <div className="block-tabs">
          {blocks.map((b) => (
            <Button variant="legacy" key={b} className={`tab${b === activeBlock ? ' active' : ''}`} onClick={() => { setBlock(b); setSelected(null); }}>
              Block {b}
            </Button>
          ))}
        </div>
        <div className="link-row" style={{ margin: 0 }}>
          <Button variant="legacy" className="btn secondary small" onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.2).toFixed(1)))}>−</Button>
          <span className="muted small">{Math.round(zoom * 100)}%</span>
          <Button variant="legacy" className="btn secondary small" onClick={() => setZoom((z) => Math.min(2, +(z + 0.2).toFixed(1)))}>+</Button>
        </div>
      </div>

      <div className="map-legend">
        {Object.entries(STATUS_COLOR).map(([s, c]) => (
          <span key={s} className="legend-item"><i style={{ background: c }} />{s}</span>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="muted">No plots in this block yet — add them in Plot Inventory.</p>
      ) : (
        <div className="map-grid" style={{ transform: `scale(${zoom})` }}>
          {shown.map((p) => (
            <Button variant="legacy"
              key={p.id}
              className={`map-cell${selected?.id === p.id ? ' selected' : ''}`}
              style={{ background: STATUS_COLOR[p.status] }}
              onClick={() => setSelected(p)}
              title={`${p.block}-${p.plot_no}`}
            >
              {p.plot_no}
            </Button>
          ))}
        </div>
      )}

      {selected && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="topbar">
            <h3 style={{ margin: 0 }}>Plot {selected.block}-{selected.plot_no}</h3>
            <Button variant="legacy" className="btn secondary small" onClick={() => setSelected(null)}>Close</Button>
          </div>
          <div className="detail-grid">
            <div className="detail-item"><span className="detail-key">Size</span><span>{selected.size_marla} Marla</span></div>
            <div className="detail-item"><span className="detail-key">Category</span><span>{selected.category}</span></div>
            <div className="detail-item"><span className="detail-key">Base price</span><span>{formatPrice(selected.base_price)}</span></div>
            <div className="detail-item"><span className="detail-key">Status</span><span>{selected.status}</span></div>
          </div>
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/society-map")({ head: () => pageHead("Society Map"), component: RoutePage });
function RoutePage() { const onNavigate = useAppNavigation(); return <PageFrame ><PlotMap onNavigate={onNavigate} /></PageFrame>; }
