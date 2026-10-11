import { getSupabase } from './supabase';
import { notify } from './notify';
import type { SearchFilters } from './listing-detail';

function sb() { const s = getSupabase(); if (!s) throw new Error('Database not connected'); return s; }

export async function uploadListingPhoto(file: File): Promise<string> {
  const s = sb();
  if (!file.type.startsWith('image/')) throw new Error('Only images can be uploaded');
  if (file.size > 8 * 1024 * 1024) throw new Error(`${file.name} is over 8 MB`);
  const { data: u } = await s.auth.getUser();
  if (!u.user) throw new Error('Not signed in');
  const path = `${u.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${file.name.split('.').pop() || 'jpg'}`;
  const { error } = await s.storage.from('listing-photos').upload(path, file, { contentType: file.type });
  if (error) throw error;
  return s.storage.from('listing-photos').getPublicUrl(path).data.publicUrl;
}

export async function reportListing(propertyId: string, title: string, reason: string, details: string): Promise<void> {
  const s = sb();
  const { data: u } = await s.auth.getUser();
  if (!u.user) throw new Error('Sign in to report a listing');
  const { error } = await s.from('listing_reports').insert({ property_id: propertyId, reporter_id: u.user.id, reason, details: details || null });
  if (error) throw error;
  const { data: admins } = await s.rpc('list_super_admins').then((r) => r, () => ({ data: null }));
  if (Array.isArray(admins)) notify(admins as string[], 'Listing reported', `"${title}" — ${reason}`, 'listing_report').catch(() => {});
}

export interface ListingReport { id: string; property_id: string; reason: string; details: string | null; status: string; created_at: string; property_title?: string }
export async function fetchReports(): Promise<ListingReport[]> {
  const s = sb();
  const { data, error } = await s.from('listing_reports').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  const list = (data as ListingReport[]) ?? [];
  const ids = [...new Set(list.map((r) => r.property_id))];
  if (ids.length) {
    const { data: props } = await s.from('properties').select('id, title').in('id', ids);
    const m = new Map(((props as { id: string; title: string }[]) ?? []).map((p) => [p.id, p.title]));
    for (const r of list) r.property_title = m.get(r.property_id) ?? '(deleted listing)';
  }
  return list;
}
export async function setReportStatus(id: string, status: 'dismissed' | 'actioned'): Promise<void> {
  const { error } = await sb().from('listing_reports').update({ status }).eq('id', id);
  if (error) throw error;
}

export interface SavedSearch { id: string; filters: SearchFilters; label: string; last_seen_at: string; created_at: string }
export async function fetchSavedSearches(): Promise<SavedSearch[]> {
  const { data, error } = await sb().from('saved_searches').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data as SavedSearch[]) ?? [];
}
export async function saveSearch(filters: SearchFilters, label: string): Promise<void> {
  const s = sb();
  const { data: u } = await s.auth.getUser();
  if (!u.user) throw new Error('Sign in to save searches');
  const { error } = await s.from('saved_searches').insert({ user_id: u.user.id, filters, label });
  if (error) throw error;
}
export async function markSearchSeen(id: string): Promise<void> {
  const { error } = await sb().from('saved_searches').update({ last_seen_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}
export async function deleteSavedSearch(id: string): Promise<void> {
  const { error } = await sb().from('saved_searches').delete().eq('id', id);
  if (error) throw error;
}
