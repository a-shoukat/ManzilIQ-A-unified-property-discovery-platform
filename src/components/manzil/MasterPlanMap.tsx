import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import type { Plot } from '@/lib/manzil/types';
import { formatPrice } from '@/lib/manzil/properties';
import { formatSize } from '@/lib/manzil/phase3-rules';
import { mapStatus, MAP_STATUS_LABEL, rectToPct, isUnlinked, type MapRegion } from '@/lib/manzil/master-plan-rules';
import { isSvgMapUrl } from '@/lib/manzil/master-plan';

type PdfDoc = { numPages: number; getPage: (n: number) => Promise<any> };
const MIN = 0.5, MAX = 6;
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));

export interface MasterPlanMapProps {
  pdfUrl: string;
  plots: Plot[];
  regions: MapRegion[];
  visibleRegionIds?: Set<string>;
  highlightId?: string | null;
  drawMode?: boolean;
  editable?: boolean;
  selectedRegionId?: string | null;
  onDraw?: (rect: ReturnType<typeof rectToPct>, page: number) => void;
  onSelectRegion?: (r: MapRegion) => void;
  onViewDetails?: (p: Plot) => void;
  page: number;
  onPageCount?: (n: number) => void;
}

export function MasterPlanMap(props: MasterPlanMapProps) {
  const { pdfUrl, plots, regions, page, drawMode, editable } = props;
  const wrapRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [doc, setDoc] = useState<PdfDoc | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [view, setView] = useState({ z: 1, x: 0, y: 0 });
  const viewRef = useRef(view); viewRef.current = view;
  const [renderZoom, setRenderZoom] = useState(1);
  const [draft, setDraft] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [tip, setTip] = useState<{ region: MapRegion; x: number; y: number } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ kind: 'pan' | 'draw' | 'pinch'; sx: number; sy: number; vx: number; vy: number; dist?: number; z?: number } | null>(null);
  const plotById = useMemo(() => new Map(plots.map((p) => [p.id, p])), [plots]);

  const isSvg = isSvgMapUrl(pdfUrl);
  const [svgDims, setSvgDims] = useState<{ w: number; h: number } | null>(null);

  // Load SVG-wrapped raster map
  useEffect(() => {
    if (!isSvg) { setSvgDims(null); return; }
    let cancelled = false;
    setSvgDims(null); setErr(null);
    const img = new Image();
    img.onload = () => { if (!cancelled) { setSvgDims({ w: img.naturalWidth || 1000, h: img.naturalHeight || 750 }); props.onPageCount?.(1); } };
    img.onerror = () => { if (!cancelled) setErr('Could not open map image'); };
    img.src = pdfUrl;
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfUrl, isSvg]);

  useEffect(() => {
    if (!svgDims || !wrapRef.current) return;
    const fit = () => { const w = wrapRef.current!.clientWidth; setSize({ w, h: (w / svgDims.w) * svgDims.h }); };
    fit(); window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [svgDims]);

  // Load PDF (browser-only import)
  useEffect(() => {
    if (isSvg) { setDoc(null); return; }
    let cancelled = false;
    setDoc(null); setErr(null);
    (async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
        pdfjs.GlobalWorkerOptions.workerSrc = worker;
        const d = await pdfjs.getDocument(pdfUrl).promise;
        if (!cancelled) { setDoc(d as unknown as PdfDoc); props.onPageCount?.(d.numPages); }
      } catch (e) { if (!cancelled) setErr(e instanceof Error ? e.message : 'Could not open PDF'); }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfUrl, isSvg]);

  // Debounced high-res re-render when zoom settles (never on data change)
  useEffect(() => { const t = setTimeout(() => setRenderZoom(view.z), 250); return () => clearTimeout(t); }, [view.z]);

  useEffect(() => {
    if (!doc || !canvasRef.current || !wrapRef.current) return;
    let task: { cancel: () => void; promise: Promise<void> } | null = null;
    let cancelled = false;
    (async () => {
      const p = await doc.getPage(clamp(page, 1, doc.numPages));
      const base = p.getViewport({ scale: 1 });
      const cssW = wrapRef.current!.clientWidth;
      const cssH = (cssW / base.width) * base.height;
      if (cancelled) return;
      setSize({ w: cssW, h: cssH });
      const scale = (cssW / base.width) * (window.devicePixelRatio || 1) * clamp(renderZoom, 1, 4);
      const vp = p.getViewport({ scale });
      const c = canvasRef.current!;
      c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
      task = p.render({ canvasContext: c.getContext('2d')!, viewport: vp });
      await task!.promise.catch(() => {});
    })();
    return () => { cancelled = true; task?.cancel(); };
  }, [doc, page, renderZoom]);
  const ready = isSvg ? !!svgDims : !!doc;

  useEffect(() => { setView({ z: 1, x: 0, y: 0 }); }, [page, pdfUrl]);

  const zoomAt = useCallback((next: number, px: number, py: number) => {
    setView((v) => { const z = clamp(next, MIN, MAX); const k = z / v.z; return { z, x: px - (px - v.x) * k, y: py - (py - v.y) * k }; });
  }, []);
  const zoomCenter = (f: number) => { const el = wrapRef.current; if (el) zoomAt(viewRef.current.z * f, el.clientWidth / 2, el.clientHeight / 2); };

  useEffect(() => {
    const el = wrapRef.current; if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      const r = el.getBoundingClientRect();
      zoomAt(viewRef.current.z * Math.exp(-dy * 0.0015), e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomAt, doc, svgDims]);

  const local = (cx: number, cy: number) => {
    const r = wrapRef.current!.getBoundingClientRect(); const v = viewRef.current;
    return { x: (cx - r.left - v.x) / v.z, y: (cy - r.top - v.y) / v.z };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('[data-region],[data-tip]')) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    setTip(null);
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()] as { x: number; y: number }[] as [{ x: number; y: number }, { x: number; y: number }];
      gesture.current = { kind: 'pinch', sx: 0, sy: 0, vx: 0, vy: 0, dist: Math.hypot(a.x - b.x, a.y - b.y), z: viewRef.current.z };
      setDraft(null); return;
    }
    if (drawMode) { const p = local(e.clientX, e.clientY); gesture.current = { kind: 'draw', sx: 0, sy: 0, vx: 0, vy: 0 }; setDraft({ x1: p.x, y1: p.y, x2: p.x, y2: p.y }); }
    else gesture.current = { kind: 'pan', sx: e.clientX, sy: e.clientY, vx: viewRef.current.x, vy: viewRef.current.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current; if (!g) return;
    if (g.kind === 'pinch' && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()] as { x: number; y: number }[] as [{ x: number; y: number }, { x: number; y: number }]; const r = wrapRef.current!.getBoundingClientRect();
      zoomAt(g.z! * (Math.hypot(a.x - b.x, a.y - b.y) / g.dist!), (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
    } else if (g.kind === 'pan') setView((v) => ({ ...v, x: g.vx + e.clientX - g.sx, y: g.vy + e.clientY - g.sy }));
    else if (g.kind === 'draw') { const p = local(e.clientX, e.clientY); setDraft((d) => d && { ...d, x2: clamp(p.x, 0, size.w), y2: clamp(p.y, 0, size.h) }); }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (g?.kind === 'draw' && draft) {
      if (Math.abs(draft.x2 - draft.x1) > 6 && Math.abs(draft.y2 - draft.y1) > 6) props.onDraw?.(rectToPct(draft.x1, draft.y1, draft.x2, draft.y2, size.w, size.h), page);
      setDraft(null);
    }
    if (pointers.current.size === 0) gesture.current = null;
  };

  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelHide = () => { if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null; } };
  const scheduleHide = (regionId: string) => {
    cancelHide();
    hideTimer.current = setTimeout(() => setTip((t) => (t?.region.id === regionId ? null : t)), 250);
  };
  useEffect(() => () => cancelHide(), []);
  const showTip = (region: MapRegion, e: React.PointerEvent | React.MouseEvent) => {
    const r = wrapRef.current!.getBoundingClientRect();
    setTip({ region, x: e.clientX - r.left, y: e.clientY - r.top });
  };

  const pageRegions = regions.filter((r) => r.page === page);
  const tipPlot = tip?.region.plot_id ? plotById.get(tip.region.plot_id) : undefined;

  if (err) return <p className="muted">Could not open the master plan: {err}</p>;
  return (
    <div className="mp-wrap">
      <div className="mp-zoom">
        <Button size="icon" variant="secondary" aria-label="Zoom in" onClick={() => zoomCenter(1.3)}><ZoomIn size={16} /></Button>
        <Button size="icon" variant="secondary" aria-label="Zoom out" onClick={() => zoomCenter(1 / 1.3)}><ZoomOut size={16} /></Button>
        <Button size="icon" variant="secondary" aria-label="Reset view" onClick={() => setView({ z: 1, x: 0, y: 0 })}><Maximize2 size={16} /></Button>
        <span className="mp-zoom-label">{Math.round(view.z * 100)}%</span>
      </div>
      <div ref={wrapRef} className={`mp-viewport${drawMode ? ' drawing' : ''}`} style={{ height: Math.min(Math.max(size.h, 320), 720) }}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
        {!ready && <div className="mp-loading">Loading master plan…</div>}
        <div ref={innerRef} className="mp-inner" style={{ width: size.w, height: size.h, transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})` }}>
          {isSvg ? (svgDims && <img src={pdfUrl} alt="Master plan" draggable={false} style={{ width: size.w, height: size.h, display: 'block', userSelect: 'none', pointerEvents: 'none' }} />) : <canvas ref={canvasRef} style={{ width: size.w, height: size.h }} />}
          {pageRegions.map((r) => {
            const plot = r.plot_id ? plotById.get(r.plot_id) : undefined;
            const unlinked = isUnlinked(r, plots);
            if (unlinked && !editable) return null;
            if (props.visibleRegionIds && !props.visibleRegionIds.has(r.id)) return null;
            const st = plot ? mapStatus(plot.status) : 'blocked';
            return (
              <div key={r.id} data-region className={`mp-region st-${st}${unlinked ? ' unlinked' : ''}${props.highlightId === r.id ? ' flash' : ''}${props.selectedRegionId === r.id ? ' selected' : ''}`}
                style={{ left: `${r.x_pct}%`, top: `${r.y_pct}%`, width: `${r.w_pct}%`, height: `${r.h_pct}%` }}
                onPointerEnter={(e) => { if (e.pointerType === 'mouse') { cancelHide(); showTip(r, e); } }}
                onPointerLeave={(e) => { if (e.pointerType === 'mouse') scheduleHide(r.id); }}
                onClick={(e) => { showTip(r, e); props.onSelectRegion?.(r); }}
                aria-label={plot ? `Plot ${plot.block}-${plot.plot_no}` : 'Unlinked region'}>
                {unlinked && <span className="mp-unlinked">unlinked</span>}
              </div>
            );
          })}
          {draft && <div className="mp-draft" style={{ left: Math.min(draft.x1, draft.x2), top: Math.min(draft.y1, draft.y2), width: Math.abs(draft.x2 - draft.x1), height: Math.abs(draft.y2 - draft.y1) }} />}
        </div>
        {tip && (
          <div data-tip className="mp-tip" style={{ left: clamp(tip.x + 12, 4, (wrapRef.current?.clientWidth ?? 300) - 230), top: clamp(tip.y + 12, 4, (wrapRef.current?.clientHeight ?? 300) - 170) }}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerEnter={cancelHide} onPointerLeave={(e) => { if (e.pointerType === 'mouse') scheduleHide(tip.region.id); }}>
            {tipPlot ? (<>
              <strong>Plot {tipPlot.plot_no}</strong>
              <div className="mp-tip-row"><span>Block</span><span>{tipPlot.block}</span></div>
              <div className="mp-tip-row"><span>Size</span><span>{formatSize(tipPlot.size_marla)}</span></div>
              <div className="mp-tip-row"><span>Category</span><span style={{ textTransform: 'capitalize' }}>{tipPlot.category}</span></div>
              <div className="mp-tip-row"><span>Price</span><span>{formatPrice(tipPlot.base_price)}</span></div>
              <div className="mp-tip-row"><span>Status</span><span className={`mp-pill st-${mapStatus(tipPlot.status)}`}>{MAP_STATUS_LABEL[mapStatus(tipPlot.status)]}</span></div>
              {props.onViewDetails && <Button size="sm" style={{ marginTop: 8, width: '100%' }} onClick={() => { props.onViewDetails!(tipPlot); setTip(null); }}>View details</Button>}
            </>) : <span className="muted small">This region is not linked to a plot in inventory.</span>}
            <button type="button" className="mp-tip-close" aria-label="Close" onClick={() => setTip(null)}>×</button>
          </div>
        )}
      </div>
    </div>
  );
}
