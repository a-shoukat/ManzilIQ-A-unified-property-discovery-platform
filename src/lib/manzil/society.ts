import { getSupabase } from './supabase';
import { notify } from './notify';
import type { DealerRequest, Lot, Plot } from '@/lib/manzil/types';

export async function fetchPlots(societyId: string): Promise<Plot[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from('plots')
    .select('*')
    .eq('society_id', societyId)
    .order('block')
    .order('plot_no');
  return (data as Plot[]) ?? [];
}

export async function upsertPlot(
  societyId: string,
  p: Partial<Plot> & { block: string; plot_no: string },
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Database not connected');
  const { error } = await supabase.from('plots').upsert(
    {
      society_id: societyId,
      block: p.block,
      plot_no: p.plot_no,
      size_marla: p.size_marla ?? 5,
      category: p.category ?? 'residential',
      base_price: p.base_price ?? 0,
      status: p.status ?? 'available',
    },
    { onConflict: 'society_id,block,plot_no' },
  );
  if (error) throw error;
}

export async function deletePlot(id: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Database not connected');
  const { error } = await supabase.from('plots').delete().eq('id', id);
  if (error) throw error;
}

export async function setPlotStatus(id: string, status: Plot['status']): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Database not connected');
  const { error } = await supabase.from('plots').update({ status }).eq('id', id);
  if (error) throw error;
}

/** Minimal CSV parser: expects header row block,plot_no,size_marla,category,base_price */
export function parsePlotCsv(text: string): { rows: Record<string, string>[]; error?: string } {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { rows: [], error: 'CSV is empty' };
  const headers = (lines[0] ?? '').split(',').map((h) => h.trim().toLowerCase());
  const need = ['block', 'plot_no', 'size_marla'];
  for (const n of need) {
    if (!headers.includes(n)) return { rows: [], error: `Missing column: ${n}` };
  }
  const rows = lines.slice(1).map((line) => {
    const cells = line.split(',').map((c) => c.trim());
    const r: Record<string, string> = {};
    headers.forEach((h, i) => (r[h] = cells[i] ?? ''));
    return r;
  });
  return { rows };
}

export async function fetchLots(societyId: string): Promise<Lot[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from('lots')
    .select('*')
    .eq('society_id', societyId)
    .order('created_at', { ascending: false });
  const lots = (data as Lot[]) ?? [];
  // enrich with dealer email + plot counts
  for (const lot of lots) {
    if (lot.dealer_id) {
      const { data: prof } = await supabase.from('profiles').select('email').eq('id', lot.dealer_id).maybeSingle();
      lot.dealer_email = (prof as { email: string } | null)?.email ?? '—';
    }
    const { count } = await supabase.from('plots').select('id', { count: 'exact', head: true }).eq('lot_id', lot.id);
    lot.plot_count = count ?? 0;
  }
  return lots;
}

export async function createLot(
  societyId: string,
  input: {
    name: string;
    block: string;
    dealerId: string;
    commissionPct: number;
    expiresAt: string | null;
    plotIds: string[];
  },
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Database not connected');
  const { data: lot, error } = await supabase
    .from('lots')
    .insert({
      society_id: societyId,
      dealer_id: input.dealerId,
      name: input.name,
      block: input.block || null,
      commission_pct: input.commissionPct,
      expires_at: input.expiresAt,
      status: 'active',
    })
    .select()
    .single();
  if (error) throw error;
  if (input.plotIds.length > 0) {
    const { error: pErr } = await supabase
      .from('plots')
      .update({ status: 'assigned', lot_id: (lot as Lot).id })
      .in('id', input.plotIds);
    if (pErr) throw pErr;
  }
  // trigger: lot assigned → notify dealer
  notify(input.dealerId, 'New lot assigned', `Lot "${input.name}" with ${input.plotIds.length} plots assigned to you.`, 'lot_assigned').catch(() => {});
}

export async function revokeLot(lotId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Database not connected');
  await supabase.from('lots').update({ status: 'revoked' }).eq('id', lotId);
  await supabase.from('plots').update({ status: 'available', lot_id: null }).eq('lot_id', lotId);
}

export async function fetchDealerRequests(societyId: string): Promise<DealerRequest[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from('dealer_requests')
    .select('*')
    .eq('society_id', societyId)
    .order('created_at', { ascending: false });
  const reqs = (data as DealerRequest[]) ?? [];
  for (const r of reqs) {
    const { data: prof } = await supabase.from('profiles').select('email').eq('id', r.dealer_id).maybeSingle();
    r.dealer_email = (prof as { email: string } | null)?.email ?? '—';
    const { data: det } = await supabase.from('dealer_details').select('firm_name, license_no').eq('profile_id', r.dealer_id).maybeSingle();
    r.firm_name = (det as { firm_name: string } | null)?.firm_name ?? null;
    r.license_no = (det as { license_no: string } | null)?.license_no ?? null;
  }
  return reqs;
}

export async function decideDealerRequest(id: string, status: 'approved' | 'rejected'): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Database not connected');
  const { error } = await supabase.from('dealer_requests').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function fetchApprovedSocieties(): Promise<{ id: string; email: string; name: string }[]> {
  return listPublicSocieties();
}

export async function fetchSocietyDealers(societyId: string): Promise<{ id: string; name: string; email: string; firm: string }[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data: rpc, error } = await supabase.rpc('list_society_dealers', { p_society: societyId });
  if (!error && Array.isArray(rpc)) return rpc as { id: string; name: string; email: string; firm: string }[];
  const { data } = await supabase.from('dealer_requests').select('dealer_id').eq('society_id', societyId).eq('status', 'approved');
  const out: { id: string; name: string; email: string; firm: string }[] = [];
  for (const r of (data as { dealer_id: string }[]) ?? []) {
    const { data: prof } = await supabase.from('profiles').select('email, full_name').eq('id', r.dealer_id).maybeSingle();
    const { data: det } = await supabase.from('dealer_details').select('firm_name').eq('profile_id', r.dealer_id).maybeSingle();
    const pp = prof as { email?: string; full_name?: string } | null;
    out.push({ id: r.dealer_id, name: pp?.full_name ?? '', email: pp?.email ?? '', firm: (det as { firm_name: string } | null)?.firm_name ?? '' });
  }
  return out;
}

/** Plot ids tied to a live booking (pending/approved/token_paid/completed). */
export async function fetchBookedPlotIds(societyId: string): Promise<Set<string>> {
  const supabase = getSupabase();
  if (!supabase) return new Set();
  const { data } = await supabase.from('bookings').select('plot_id, status').eq('society_id', societyId)
    .in('status', ['pending', 'approved', 'token_paid', 'completed']);
  return new Set(((data as { plot_id: string | null }[]) ?? []).map((b) => b.plot_id).filter((x): x is string => !!x));
}

/** Approved societies visible to any signed-in user (uses list_societies() when installed). */
export async function listPublicSocieties(): Promise<{ id: string; email: string; name: string }[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const rpc = await supabase.rpc('list_societies');
  if (!rpc.error && Array.isArray(rpc.data)) {
    return (rpc.data as { id: string; email: string | null; society_name: string | null }[])
      .map((r) => ({ id: r.id, email: r.email ?? '', name: r.society_name ?? r.email ?? 'Society' }));
  }
  const { data } = await supabase.from('profiles').select('id, email').eq('role', 'society_admin').eq('verification_status', 'approved');
  const out: { id: string; email: string; name: string }[] = [];
  for (const p of (data as { id: string; email: string }[]) ?? []) {
    const { data: d } = await supabase.from('society_details').select('society_name').eq('profile_id', p.id).maybeSingle();
    out.push({ id: p.id, email: p.email, name: (d as { society_name: string } | null)?.society_name ?? p.email });
  }
  return out;
}
