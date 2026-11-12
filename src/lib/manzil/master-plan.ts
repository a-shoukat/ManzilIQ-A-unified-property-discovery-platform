import { getSupabase } from './supabase';
import type { MapRegion } from './master-plan-rules';

import { IMAGE_TYPES, MAP_ACCEPT, validateMasterPlanFile } from './master-plan-upload';

const BUCKET = 'society-maps';
const PDF_NAME = 'master-plan.pdf';
const SVG_NAME = 'master-plan.svg';
export { IMAGE_TYPES, MAP_ACCEPT, validateMasterPlanFile };

/** True when a master-plan URL points at the SVG-wrapped raster map. */
export const isSvgMapUrl = (url: string) => url.split('?')[0]!.toLowerCase().endsWith('.svg');

export async function fetchMasterPlanUrl(societyId: string): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.storage.from(BUCKET).list(societyId, { limit: 10, search: 'master-plan' });
  const files = (data ?? []).filter((x) => x.name === PDF_NAME || x.name === SVG_NAME)
    .sort((a, b) => String(b.updated_at ?? '').localeCompare(String(a.updated_at ?? '')));
  const f = files[0];
  if (!f) return null;
  return `${sb.storage.from(BUCKET).getPublicUrl(`${societyId}/${f.name}`).data.publicUrl}?v=${encodeURIComponent(f.updated_at ?? '')}`;
}

const readDataUrl = (file: File) => new Promise<string>((res, rej) => {
  const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(new Error('Could not read image')); r.readAsDataURL(file);
});
const imageSize = (src: string) => new Promise<{ w: number; h: number }>((res, rej) => {
  const img = new Image(); img.onload = () => res({ w: img.naturalWidth, h: img.naturalHeight }); img.onerror = () => rej(new Error('Could not open image')); img.src = src;
});

/** Wrap a raster image inside an SVG document so it renders on the same stage as PDFs. */
export async function rasterToSvg(file: File): Promise<Blob> {
  const dataUrl = await readDataUrl(file);
  const { w, h } = await imageSize(dataUrl);
  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><image width="${w}" height="${h}" href="${dataUrl}" xlink:href="${dataUrl}"/></svg>`;
  return new Blob([svg], { type: 'image/svg+xml' });
}

export async function uploadMasterPlan(societyId: string, file: File): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error('Database not connected');
  const check = validateMasterPlanFile(file);
  if (!check.ok) throw new Error(check.reason);
  const isPdf = check.kind === 'pdf';
  const name = isPdf ? PDF_NAME : SVG_NAME;
  const body = isPdf ? file : await rasterToSvg(file);
  const { error } = await sb.storage.from(BUCKET).upload(`${societyId}/${name}`, body, { upsert: true, contentType: isPdf ? 'application/pdf' : 'image/svg+xml' });
  if (error) throw error;
  await sb.storage.from(BUCKET).remove([`${societyId}/${isPdf ? SVG_NAME : PDF_NAME}`]).catch(() => {});
}

export async function fetchRegions(societyId: string): Promise<MapRegion[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.from('plot_map_regions').select('*').eq('society_id', societyId);
  if (error) throw error;
  return (data ?? []).map((r) => ({ ...r, x_pct: +r.x_pct, y_pct: +r.y_pct, w_pct: +r.w_pct, h_pct: +r.h_pct })) as MapRegion[];
}

export async function saveRegion(r: Omit<MapRegion, 'id'> & { id?: string | undefined }): Promise<MapRegion> {
  const sb = getSupabase();
  if (!sb) throw new Error('Database not connected');
  const q = r.id ? sb.from('plot_map_regions').update(r).eq('id', r.id) : sb.from('plot_map_regions').insert(r);
  const { data, error } = await q.select().single();
  if (error) throw error;
  return data as MapRegion;
}

export async function deleteRegion(id: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error('Database not connected');
  const { error } = await sb.from('plot_map_regions').delete().eq('id', id);
  if (error) throw error;
}

/** Subscribe to plot/booking/region changes for live colours. Returns unsubscribe. */
export function subscribeSocietyMap(societyId: string, onChange: () => void): () => void {
  const sb = getSupabase();
  if (!sb) return () => {};
  const ch = sb.channel(`master-plan-${societyId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'plots', filter: `society_id=eq.${societyId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'plot_map_regions', filter: `society_id=eq.${societyId}` }, onChange)
    .subscribe();
  return () => { void sb.removeChannel(ch); };
}
