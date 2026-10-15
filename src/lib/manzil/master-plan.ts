import { getSupabase } from './supabase';
import type { MapRegion } from './master-plan-rules';

const BUCKET = 'society-maps';
const PATH = (societyId: string) => `${societyId}/master-plan.pdf`;

export async function fetchMasterPlanUrl(societyId: string): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.storage.from(BUCKET).list(societyId, { limit: 5, search: 'master-plan.pdf' });
  const f = data?.find((x) => x.name === 'master-plan.pdf');
  if (!f) return null;
  return `${sb.storage.from(BUCKET).getPublicUrl(PATH(societyId)).data.publicUrl}?v=${encodeURIComponent(f.updated_at ?? '')}`;
}

export async function uploadMasterPlan(societyId: string, file: File): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error('Database not connected');
  if (file.type !== 'application/pdf') throw new Error('Please choose a PDF file');
  if (file.size > 25 * 1024 * 1024) throw new Error('PDF must be under 25 MB');
  const { error } = await sb.storage.from(BUCKET).upload(PATH(societyId), file, { upsert: true, contentType: 'application/pdf' });
  if (error) throw error;
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
