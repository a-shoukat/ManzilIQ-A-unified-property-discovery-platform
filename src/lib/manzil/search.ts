import { getSupabase } from './supabase';
import { DEMO_PROPERTIES } from './properties';
import type { Profile, Property } from './types';

/** Strip characters that break PostgREST `or()` filters or act as wildcards. */
export function sanitizeQuery(q: string): string {
  return q.replace(/[,()%*\\:"']/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function searchProperties(query: string, { limit = 8, onlyAvailable = true } = {}): Promise<Property[]> {
  const q = sanitizeQuery(query);
  if (q.length < 2) return [];
  const sb = getSupabase();
  if (!sb) {
    const l = q.toLowerCase();
    return DEMO_PROPERTIES.filter(p => (!onlyAvailable || p.status === 'available') && `${p.title} ${p.city} ${p.area ?? ''} ${p.society_name ?? ''} ${p.category}`.toLowerCase().includes(l)).slice(0, limit);
  }
  const pat = `%${q}%`;
  let req = sb.from('properties').select('*')
    .or(`title.ilike.${pat},city.ilike.${pat},area.ilike.${pat},society_name.ilike.${pat},category.ilike.${pat}`)
    .limit(limit);
  if (onlyAvailable) req = req.eq('status', 'available');
  const { data, error } = await req;
  if (error) throw error;
  return (data ?? []) as Property[];
}

export async function searchUsers(query: string, { limit = 8 } = {}): Promise<Profile[]> {
  const q = sanitizeQuery(query);
  if (q.length < 2) return [];
  const sb = getSupabase();
  if (!sb) return [];
  const pat = `%${q}%`;
  const { data, error } = await sb.from('profiles').select('id,email,full_name,role,verification_status,created_at')
    .or(`full_name.ilike.${pat},email.ilike.${pat}`).limit(limit);
  if (error) throw error;
  return (data ?? []) as Profile[];
}
