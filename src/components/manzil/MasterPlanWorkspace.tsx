import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileDown, PencilRuler, Trash2, Upload } from 'lucide-react';
import { MasterPlanMap } from './MasterPlanMap';
import type { Plot } from '@/lib/manzil/types';
import { fetchPlots } from '@/lib/manzil/society';
import { errorText } from '@/lib/manzil/errors';
import { formatSize } from '@/lib/manzil/phase3-rules';
import { formatPrice } from '@/lib/manzil/properties';
import { formatPlotHeading, formatStatusLabel } from '@/lib/manzil/format';
import { plotOptionLabel } from '@/lib/manzil/bookable-plots';
import { deleteRegion, fetchMasterPlanUrl, fetchRegions, MAP_ACCEPT, saveRegion, subscribeSocietyMap, uploadMasterPlan } from '@/lib/manzil/master-plan';
import { buildTranscript, isUnlinked, mappingProgress, mapStatus, MAP_STATUS_LABEL, statusSummary, type MapRegion, type MapStatus, rectToPct } from '@/lib/manzil/master-plan-rules';

const STATUSES: MapStatus[] = ['available', 'reserved', 'sold', 'blocked'];

export function MasterPlanWorkspace({ societyId, societyName, editable, onBook }: { societyId: string; societyName: string; editable: boolean; onBook?: ((p: Plot) => void) | undefined }) {
  const [pdfUrl, setPdfUrl] = useState<string | null | undefined>(undefined);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [regions, setRegions] = useState<MapRegion[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [drawMode, setDrawMode] = useState(false);
  const [pending, setPending] = useState<{ rect: ReturnType<typeof rectToPct>; page: number; id?: string } | null>(null);
  const [linkQuery, setLinkQuery] = useState('');
  const [selected, setSelected] = useState<MapRegion | null>(null);
  const [block, setBlock] = useState(''); const [status, setStatus] = useState(''); const [size, setSize] = useState('');
  const [search, setSearch] = useState(''); const [flash, setFlash] = useState<string | null>(null);
  const [detail, setDetail] = useState<Plot | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  const reload = useCallback(() => {
    fetchPlots(societyId).then(setPlots);
    fetchRegions(societyId).then(setRegions).catch((e) => toast.error(errorText(e, 'Could not load map regions — run phase9-master-plan.sql')));
  }, [societyId]);

  useEffect(() => {
    setPdfUrl(undefined); setPage(1); setSelected(null);
    fetchMasterPlanUrl(societyId).then(setPdfUrl);
    reload();
    return subscribeSocietyMap(societyId, reload);
  }, [societyId, reload]);

  const onUpload = async (f?: File) => {
    if (!f) return; setUploading(true);
    try { await uploadMasterPlan(societyId, f); setPdfUrl(await fetchMasterPlanUrl(societyId)); toast.success('Master plan uploaded'); }
    catch (e) { toast.error(errorText(e, 'Upload failed')); }
    setUploading(false);
  };

  const plotById = useMemo(() => new Map(plots.map((p) => [p.id, p])), [plots]);
  const blocks = useMemo(() => [...new Set(plots.map((p) => p.block))].sort(), [plots]);
  const sizes = useMemo(() => [...new Set(plots.map((p) => p.size_marla))].sort((a, b) => a - b), [plots]);
  const visible = useMemo(() => new Set(regions.filter((r) => {
    const p = r.plot_id ? plotById.get(r.plot_id) : undefined;
    if (!p) return true;
    return (!block || p.block === block) && (!status || mapStatus(p.status) === status) && (!size || String(p.size_marla) === size);
  }).map((r) => r.id)), [regions, plotById, block, status, size]);

  const progress = mappingProgress(regions, plots);
  const mappedIds = new Set(regions.map((r) => r.plot_id).filter(Boolean));
  const unlinkedCount = regions.filter((r) => isUnlinked(r, plots)).length;
  const summary = statusSummary(plots.filter((p) => mappedIds.has(p.id)));

  const findPlot = () => {
    const q = search.trim().toLowerCase(); if (!q) return;
    const p = plots.find((x) => x.plot_no.toLowerCase() === q || `${x.block}-${x.plot_no}`.toLowerCase() === q) ?? plots.find((x) => x.plot_no.toLowerCase().includes(q));
    const r = p && regions.find((x) => x.plot_id === p.id);
    if (!r) { toast.error(p ? `Plot ${p.plot_no} is not on the map yet` : 'Plot not found'); return; }
    setBlock(''); setStatus(''); setSize(''); setPage(r.page); setFlash(r.id); setTimeout(() => setFlash(null), 3200);
  };

  const linkTo = async (plot: Plot) => {
    if (!pending) return;
    try {
      const saved = await saveRegion({ id: pending.id, society_id: societyId, plot_id: plot.id, plot_label: `${plot.block}-${plot.plot_no}`, page: pending.page, ...pending.rect });
      setRegions((rs) => [...rs.filter((r) => r.id !== saved.id), { ...saved, x_pct: +saved.x_pct, y_pct: +saved.y_pct, w_pct: +saved.w_pct, h_pct: +saved.h_pct }]);
      toast.success(`Plot ${plot.block}-${plot.plot_no} mapped`);
      setPending(null); setLinkQuery(''); setSelected(null); setDrawMode(false);
    } catch (e) { toast.error(errorText(e, 'Could not save region')); }
  };
  const remove = async (r: MapRegion) => {
    try { await deleteRegion(r.id); setRegions((rs) => rs.filter((x) => x.id !== r.id)); setSelected(null); toast.success('Region deleted'); }
    catch (e) { toast.error(errorText(e, 'Could not delete')); }
  };

  const download = () => {
    const text = buildTranscript(societyName, regions, plots);
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    const a = document.createElement('a'); a.href = url; a.download = `${societyName.replace(/\W+/g, '-')}-master-plan.txt`; a.click(); URL.revokeObjectURL(url);
  };

  const linkCandidates = plots.filter((p) => `${p.block}-${p.plot_no} ${p.plot_no}`.toLowerCase().includes(linkQuery.toLowerCase())).slice(0, 30);

  return (
    <div className="mp-workspace">
      <div className="card card-full mp-head">
        <div>
          <strong>Master plan — {societyName}</strong>
          <div className="muted small">
            {editable ? `${progress.mapped}/${progress.total} plots mapped` : `${regions.length} plots on map`}
            {editable && unlinkedCount > 0 && <> · <span className="mp-warn">{unlinkedCount} unlinked</span></>}
            {' · '}{summary.available} available · {summary.reserved} reserved · {summary.sold} sold
          </div>
          {editable && progress.total > 0 && <div className="mp-progress"><i style={{ width: `${(progress.mapped / progress.total) * 100}%` }} /></div>}
        </div>
        <div className="link-row" style={{ margin: 0 }}>
          {pdfUrl && <Button variant="secondary" size="sm" onClick={download}><FileDown size={15} />Generate transcript</Button>}
          {editable && pdfUrl && <Button size="sm" variant={drawMode ? 'default' : 'secondary'} onClick={() => setDrawMode((d) => !d)}><PencilRuler size={15} />{drawMode ? 'Drawing — drag on map' : 'Draw plot region'}</Button>}
          {editable && (<>
            <Button asChild size="sm" variant="secondary"><label style={{ cursor: 'pointer' }}><Upload size={15} />{uploading ? 'Uploading…' : 'Upload map'}
              <input type="file" accept={MAP_ACCEPT} hidden disabled={uploading} onChange={(e) => { void onUpload(e.target.files?.[0]); e.target.value = ''; }} /></label></Button>
            <span className="muted small">PDF (25MB) · PNG, JPG, WEBP (10MB)</span>
          </>)}
        </div>
      </div>

      {pdfUrl === undefined ? <p className="muted">Loading…</p> : !pdfUrl ? (
        <div className="card card-full"><p className="muted" style={{ margin: 0 }}>{editable ? 'Upload your society master-plan PDF to start mapping plots.' : 'This society has not published a master plan yet.'}</p></div>
      ) : (<>
        <div className="mp-filters">
          <select className="input" value={block} onChange={(e) => setBlock(e.target.value)}><option value="">All blocks</option>{blocks.map((b) => <option key={b} value={b}>Block {b}</option>)}</select>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option>{STATUSES.map((s) => <option key={s} value={s}>{MAP_STATUS_LABEL[s]}</option>)}</select>
          <select className="input" value={size} onChange={(e) => setSize(e.target.value)}><option value="">All sizes</option>{sizes.map((s) => <option key={s} value={String(s)}>{formatSize(s)}</option>)}</select>
          <form className="mp-search" onSubmit={(e) => { e.preventDefault(); findPlot(); }}>
            <Input placeholder="Find plot no. e.g. 101" value={search} onChange={(e) => setSearch(e.target.value)} />
            <Button type="submit" size="sm">Find</Button>
          </form>
          {pages > 1 && (
            <select className="input" value={page} onChange={(e) => setPage(+e.target.value)} aria-label="Page">
              {Array.from({ length: pages }, (_, i) => <option key={i} value={i + 1}>Page {i + 1} of {pages}</option>)}
            </select>
          )}
        </div>
        <div className="map-legend">
          {STATUSES.map((s) => <span key={s} className="legend-item"><i className={`mp-swatch st-${s}`} />{MAP_STATUS_LABEL[s]}</span>)}
        </div>

        <MasterPlanMap pdfUrl={pdfUrl} plots={plots} regions={regions} page={page} onPageCount={setPages}
          visibleRegionIds={visible} highlightId={flash} drawMode={editable && drawMode} editable={editable}
          selectedRegionId={selected?.id ?? null}
          onDraw={(rect, pg) => { setPending({ rect, page: pg }); setLinkQuery(''); }}
          onSelectRegion={(r) => editable && setSelected(r)}
          onViewDetails={(p) => { setDetail(p); setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50); }}
          {...(onBook ? { onBook } : {})} />

        {editable && pending && (
          <div className="card card-full">
            <div className="topbar"><strong>{pending.id ? 'Re-link region' : 'Link this region to a plot'}</strong><Button size="sm" variant="secondary" onClick={() => setPending(null)}>Cancel</Button></div>
            <Input autoFocus placeholder="Search plot number…" value={linkQuery} onChange={(e) => setLinkQuery(e.target.value)} />
            <div className="mp-link-list">
              {linkCandidates.map((p) => (
                <Button key={p.id} size="sm" variant={mappedIds.has(p.id) ? 'outline' : 'secondary'} onClick={() => void linkTo(p)}>
                  {plotOptionLabel(p)}{mappedIds.has(p.id) ? ' (mapped)' : ''}
                </Button>
              ))}
              {linkCandidates.length === 0 && <span className="muted small">No plots match.</span>}
            </div>
          </div>
        )}
        {editable && selected && !pending && (
          <div className="card card-full">
            <div className="topbar">
              <strong>{isUnlinked(selected, plots) ? `Unlinked region${selected.plot_label ? ` (was ${selected.plot_label})` : ''}` : `Region · Plot ${selected.plot_label}`}</strong>
              <div className="link-row" style={{ margin: 0 }}>
                <Button size="sm" variant="secondary" onClick={() => setPending({ id: selected.id, page: selected.page, rect: { x_pct: selected.x_pct, y_pct: selected.y_pct, w_pct: selected.w_pct, h_pct: selected.h_pct } })}>Re-link</Button>
                <Button size="sm" variant="destructive" onClick={() => void remove(selected)}><Trash2 size={14} />Delete</Button>
                <Button size="sm" variant="secondary" onClick={() => setSelected(null)}>Close</Button>
              </div>
            </div>
          </div>
        )}
        {detail && (
          <div className="card card-full" ref={detailRef}>
            <div className="topbar"><h3 style={{ margin: 0 }}>{formatPlotHeading(detail)}</h3><Button size="sm" variant="secondary" onClick={() => setDetail(null)}>Close</Button></div>
            <div className="detail-grid">
              <div className="detail-item"><span className="detail-key">Block</span><span>{detail.block}</span></div>
              <div className="detail-item"><span className="detail-key">Size</span><span>{formatSize(detail.size_marla)}</span></div>
              <div className="detail-item"><span className="detail-key">Category</span><span style={{ textTransform: 'capitalize' }}>{detail.category}</span></div>
              <div className="detail-item"><span className="detail-key">Price</span><span>{formatPrice(detail.base_price)}</span></div>
              <div className="detail-item"><span className="detail-key">Status</span><span>{MAP_STATUS_LABEL[mapStatus(detail.status)]}</span></div>
            </div>
            {onBook && detail.status === 'available' && <Button style={{ marginTop: 12 }} onClick={() => onBook(detail)}>Book this plot</Button>}
          </div>
        )}
      </>)}
    </div>
  );
}
