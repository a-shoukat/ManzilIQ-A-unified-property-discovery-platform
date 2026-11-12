import { formatSize } from '@/lib/manzil/phase3-rules';
import { Button } from '@/components/ui/button';
import { createFileRoute } from '@tanstack/react-router';
import { PageFrame, useAppNavigation, pageHead } from '@/components/manzil/PageFrame';
import { useEffect, useState } from 'react';
import { fetchApprovedSocieties, fetchPlots } from '@/lib/manzil/society';
import { formatPrice } from '@/lib/manzil/properties';
import { formatDateTime, formatPlotHeading, formatStatusLabel } from '@/lib/manzil/format';
import { plotOptionLabel } from '@/lib/manzil/bookable-plots';
import type { Plot } from '@/lib/manzil/types';
import { useSocietyId } from './society';
import { MasterPlanWorkspace } from '@/components/manzil/MasterPlanWorkspace';
import { useAuth } from '@/lib/manzil/auth';

const STATUS_COLOR: Record<Plot['status'], string> = {
  available: 'var(--success)',
  assigned: 'var(--primary)',
  reserved: 'var(--warning)',
  sold: 'var(--muted-foreground)',
  blocked: 'var(--destructive)',
};

/** WBS: Society Portal — Interactive Plot Map (5 features). Guests: view-only. */
function PlotMap({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { session, profile } = useAuth();
  const societyCtx = useSocietyId();
  const [guestSocieties, setGuestSocieties] = useState<{ id: string; name: string }[]>([]);
  const [guestSocietyId, setGuestSocietyId] = useState('');
  const [plots, setPlots] = useState<Plot[]>([]);
  const [block, setBlock] = useState('');
  const [zoom, setZoom] = useState(1);
  const [selected, setSelected] = useState<Plot | null>(null);

  const isEditor = profile?.role === 'society_admin' || profile?.role === 'super_admin';
  const societies = isEditor ? societyCtx.societies : guestSocieties;
  const societyId = isEditor ? societyCtx.societyId : (guestSocietyId || null);
  const societyName = societies.find((x) => x.id === societyId)?.name
    ?? (profile?.role === 'society_admin' ? 'My society' : 'Society');

  useEffect(() => {
    if (isEditor) return;
    fetchApprovedSocieties().then((list) => {
      const mapped = list.map((s) => ({ id: s.id, name: s.name }));
      setGuestSocieties(mapped);
      if (mapped[0]) setGuestSocietyId(mapped[0].id);
    });
  }, [isEditor]);

  useEffect(() => { if (societyId) fetchPlots(societyId).then(setPlots); }, [societyId]);

  const blocks = [...new Set(plots.map((p) => p.block))].sort();
  const activeBlock = block || blocks[0] || '';
  const shown = plots.filter((p) => p.block === activeBlock);

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <h1>Interactive plot map</h1>
          <p className="muted" style={{ margin: 0 }}>{isEditor ? 'Color-coded availability' : 'View-only · sign in to book or upload'}</p>
        </div>
        {isEditor ? (
          <Button variant="legacy" className="btn secondary small" onClick={() => onNavigate('society')}>Society portal</Button>
        ) : (
          <Button variant="legacy" className="btn secondary small" onClick={() => onNavigate(session ? 'dashboard' : 'login')}>
            {session ? 'Dashboard' : 'Sign in'}
          </Button>
        )}
      </div>

      {!isEditor && (
        <select className="input" style={{ maxWidth: 280, marginBottom: 16 }} value={guestSocietyId} onChange={(e) => setGuestSocietyId(e.target.value)} aria-label="Society">
          {guestSocieties.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      )}
      {isEditor && profile?.role === 'super_admin' && societies.length > 0 && (
        <select className="input" style={{ maxWidth: 280, marginBottom: 16 }} value={societyId ?? ''} onChange={(e) => societyCtx.setSocietyId(e.target.value)} aria-label="Society">
          {societies.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      )}

      {societyId && (
        <div style={{ marginBottom: 24 }}>
          <MasterPlanWorkspace societyId={societyId} societyName={societyName} editable={!!isEditor} />
        </div>
      )}
      <h3>Block grid view</h3>
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
          <span key={s} className="legend-item"><i style={{ background: c }} />{formatStatusLabel(s)}</span>
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
              title={plotOptionLabel(p)}
            >
              {p.plot_no}
            </Button>
          ))}
        </div>
      )}

      {selected && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="topbar">
            <h3 style={{ margin: 0 }}>{formatPlotHeading(selected)}</h3>
            <Button variant="legacy" className="btn secondary small" onClick={() => setSelected(null)}>Close</Button>
          </div>
          <div className="detail-grid">
            <div className="detail-item"><span className="detail-key">Size</span><span>{formatSize(selected.size_marla)}</span></div>
            <div className="detail-item"><span className="detail-key">Category</span><span>{formatStatusLabel(selected.category)}</span></div>
            <div className="detail-item"><span className="detail-key">Base price</span><span>{formatPrice(selected.base_price)}</span></div>
            <div className="detail-item"><span className="detail-key">Status</span><span>{formatStatusLabel(selected.status)}</span></div>
          </div>
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/society-map")({ head: () => pageHead("Society Map"), component: RoutePage });
function RoutePage() { const onNavigate = useAppNavigation(); return <PageFrame publicPage><PlotMap onNavigate={onNavigate} /></PageFrame>; }
