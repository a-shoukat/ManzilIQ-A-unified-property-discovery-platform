import type { Plot } from './types';

export interface MapRegion {
  id: string; society_id: string; plot_id: string | null; plot_label: string | null;
  page: number; x_pct: number; y_pct: number; w_pct: number; h_pct: number;
}

export type MapStatus = 'available' | 'reserved' | 'sold' | 'blocked';
/** Available=green, token paid/reserved/assigned=amber, sold=red, blocked=gray. */
export function mapStatus(s: Plot['status']): MapStatus {
  if (s === 'available') return 'available';
  if (s === 'reserved' || s === 'assigned') return 'reserved';
  if (s === 'sold') return 'sold';
  return 'blocked';
}
export const MAP_STATUS_LABEL: Record<MapStatus, string> = { available: 'Available', reserved: 'Token paid / Reserved', sold: 'Sold', blocked: 'Blocked' };

const clamp = (n: number) => Math.min(100, Math.max(0, n));
/** Convert two drag points (px within a page of width×height) to a percentage rectangle. */
export function rectToPct(x1: number, y1: number, x2: number, y2: number, width: number, height: number) {
  const x = clamp((Math.min(x1, x2) / width) * 100), y = clamp((Math.min(y1, y2) / height) * 100);
  const w = clamp((Math.abs(x2 - x1) / width) * 100), h = clamp((Math.abs(y2 - y1) / height) * 100);
  return { x_pct: +x.toFixed(3), y_pct: +y.toFixed(3), w_pct: +Math.min(w, 100 - x).toFixed(3), h_pct: +Math.min(h, 100 - y).toFixed(3) };
}

export function mappingProgress(regions: MapRegion[], plots: Plot[]) {
  const ids = new Set(plots.map((p) => p.id));
  const mapped = new Set(regions.filter((r) => r.plot_id && ids.has(r.plot_id)).map((r) => r.plot_id));
  return { mapped: mapped.size, total: plots.length };
}
export const isUnlinked = (r: MapRegion, plots: Plot[]) => !r.plot_id || !plots.some((p) => p.id === r.plot_id);

export function statusSummary(plots: Plot[]) {
  const s = { available: 0, reserved: 0, sold: 0, blocked: 0 } as Record<MapStatus, number>;
  plots.forEach((p) => { s[mapStatus(p.status)]++; });
  return s;
}

/** Plain-text transcript: all mapped plots + status summary. */
export function buildTranscript(societyName: string, regions: MapRegion[], plots: Plot[], date = new Date()): string {
  const byId = new Map(plots.map((p) => [p.id, p]));
  const seen = new Set<string>();
  const mapped: Plot[] = [];
  regions.forEach((r) => { const p = r.plot_id ? byId.get(r.plot_id) : undefined; if (p && !seen.has(p.id)) { seen.add(p.id); mapped.push(p); } });
  mapped.sort((a, b) => a.block.localeCompare(b.block) || a.plot_no.localeCompare(b.plot_no, undefined, { numeric: true }));
  const s = statusSummary(mapped);
  const lines = [
    `ManzilIQ — Master Plan Transcript`, `Society: ${societyName}`, `Generated: ${date.toISOString().slice(0, 10)}`, '',
    `Summary: ${mapped.length} plots mapped — ${s.available} available, ${s.reserved} reserved, ${s.sold} sold, ${s.blocked} blocked`, '',
    ['Plot', 'Block', 'Size (marla)', 'Price (PKR)', 'Status'].join('\t'),
    ...mapped.map((p) => [p.plot_no, p.block, String(p.size_marla), String(p.base_price), MAP_STATUS_LABEL[mapStatus(p.status)]].join('\t')),
  ];
  return lines.join('\n');
}
