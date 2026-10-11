import { getSupabase } from './supabase';
import type { Property } from '@/lib/manzil/types';

/** Demo seed data used when the properties table is empty/missing. */
export const DEMO_PROPERTIES: Property[] = [
  {
    id: 'demo-1',
    title: '5 Marla House — Dream Gardens',
    city: 'Narowal',
    area: 'Zafarwal Road',
    society_name: 'Dream Gardens',
    block: 'A',
    plot_size_marla: 5,
    category: 'residential',
    purpose: 'sale',
    price: 7500000,
    bedrooms: 4,
    bathrooms: 3,
    description: 'Newly built 5 marla house, tiled flooring, near main boulevard.',
    image_url: null,
    status: 'available',
    owner_id: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-2',
    title: '10 Marla Plot — Block C',
    city: 'Narowal',
    area: 'Muridke Road',
    society_name: 'Dream Gardens',
    block: 'C',
    plot_size_marla: 10,
    category: 'residential',
    purpose: 'sale',
    price: 5200000,
    bedrooms: null,
    bathrooms: null,
    description: 'Corner plot facing park, clear title, ready for construction.',
    image_url: null,
    status: 'available',
    owner_id: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-3',
    title: '4 Marla Commercial — Main Bazaar',
    city: 'Zafarwal',
    area: 'New Model Bazaar',
    society_name: null,
    block: null,
    plot_size_marla: 4,
    category: 'commercial',
    purpose: 'rent',
    price: 85000,
    bedrooms: null,
    bathrooms: 1,
    description: 'High footfall commercial space, ideal for retail.',
    image_url: null,
    status: 'available',
    owner_id: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-4',
    title: '1 Kanal Villa — Lake View',
    city: 'Narowal',
    area: 'Qila Kalarwala',
    society_name: 'Lake View Society',
    block: 'B',
    plot_size_marla: 20,
    category: 'residential',
    purpose: 'sale',
    price: 28000000,
    bedrooms: 6,
    bathrooms: 5,
    description: 'Designer 1 kanal villa with lawn and servant quarter.',
    image_url: null,
    status: 'reserved',
    owner_id: null,
    created_at: new Date().toISOString(),
  },
];

type PropertyList = { list: Property[]; demo: boolean };
const CACHE_KEY = 'manziliq.properties.v1';
let inflight: Promise<PropertyList> | null = null;

/** Last list shown on this device, for an instant first paint on repeat visits. */
export function readCachedProperties(): PropertyList | null {
  if (typeof window === 'undefined') return null;
  try { const raw = sessionStorage.getItem(CACHE_KEY); return raw ? (JSON.parse(raw) as PropertyList) : null; } catch { return null; }
}

/** Deduplicated fetch: concurrent callers share one request; result is cached for the session. */
export function fetchProperties(): Promise<PropertyList> {
  if (!inflight) {
    inflight = loadProperties().then((r) => {
      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(r)); } catch { /* storage full */ }
      return r;
    }).finally(() => { setTimeout(() => { inflight = null; }, 30_000); });
  }
  return inflight;
}

async function loadProperties(): Promise<PropertyList> {
  const supabase = getSupabase();
  if (!supabase) return { list: DEMO_PROPERTIES, demo: true };
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .order('created_at', { ascending: false });
  if (error || !data || data.length === 0) {
    return { list: DEMO_PROPERTIES, demo: true };
  }
  return { list: data as Property[], demo: false };
}

export async function fetchProperty(id: string): Promise<Property | null> {
  if (id.startsWith('demo-')) {
    return DEMO_PROPERTIES.find((p) => p.id === id) ?? null;
  }
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.from('properties').select('*').eq('id', id).maybeSingle();
  return (data as Property) ?? null;
}

export async function createProperty(
  p: Omit<Property, 'id' | 'created_at' | 'owner_id'>,
  ownerId: string,
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Database not connected');
  const { error } = await supabase.from('properties').insert({ ...p, owner_id: ownerId });
  if (error) throw error;
}

export function formatPrice(n: number): string {
  if (n >= 10000000) return `PKR ${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `PKR ${(n / 100000).toFixed(1)} Lakh`;
  return `PKR ${n.toLocaleString()}`;
}
