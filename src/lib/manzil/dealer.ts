import { listPublicSocieties } from './society';
import { getSupabase } from './supabase';
import type { Booking, Lead, LeadActivity, Lot, Plot, SocietySummary } from '@/lib/manzil/types';

/** Load society cards with plot counts in two queries (avoids N+1 hang on Discover). */
export async function fetchSocietySummaries(): Promise<SocietySummary[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const societies = await listPublicSocieties();
  if (societies.length === 0) return [];
  const ids = societies.map((p) => p.id);
  const { data: plots, error } = await supabase.from('plots').select('society_id, status').in('society_id', ids);
  if (error) throw new Error(error.message);
  const totals = new Map<string, { total: number; avail: number }>();
  for (const id of ids) totals.set(id, { total: 0, avail: 0 });
  for (const row of (plots as { society_id: string; status: string }[]) ?? []) {
    const t = totals.get(row.society_id);
    if (!t) continue;
    t.total += 1;
    if (row.status === 'available') t.avail += 1;
  }
  return societies.map((p) => ({
    id: p.id,
    email: p.email,
    name: p.name,
    plots_available: totals.get(p.id)?.avail ?? 0,
    plots_total: totals.get(p.id)?.total ?? 0,
  }));
}

/** Race a promise against a timeout; rejects with a clear message. */
export function withTimeout<T>(promise: Promise<T>, ms: number, label = 'Request'): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

export async function sendJoinRequest(dealerId: string, societyId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Database not connected');
  const { error } = await supabase.from('dealer_requests').upsert(
    { dealer_id: dealerId, society_id: societyId, status: 'pending' },
    { onConflict: 'dealer_id,society_id' },
  );
  if (error) throw error;
}

export async function fetchMyRequests(dealerId: string) {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data } = await supabase.from('dealer_requests').select('*').eq('dealer_id', dealerId).order('created_at', { ascending: false });
  return (data as { id: string; society_id: string; status: string }[]) ?? [];
}

export async function fetchMyLots(dealerId: string): Promise<Lot[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data } = await supabase.from('lots').select('*').eq('dealer_id', dealerId).eq('status', 'active').order('created_at', { ascending: false });
  const lots = (data as Lot[]) ?? [];
  for (const lot of lots) {
    const { count } = await supabase.from('plots').select('id', { count: 'exact', head: true }).eq('lot_id', lot.id);
    lot.plot_count = count ?? 0;
  }
  return lots;
}

export async function fetchLotPlots(lotId: string): Promise<Plot[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data } = await supabase.from('plots').select('*').eq('lot_id', lotId).order('block').order('plot_no');
  return (data as Plot[]) ?? [];
}

export async function markShowing(plotId: string, client: string | null): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Database not connected');
  const { error } = await supabase.from('plots').update({ showing_client: client }).eq('id', plotId);
  if (error) throw error;
}

export async function releasePlot(plotId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Database not connected');
  const { error } = await supabase.from('plots').update({ status: 'available', lot_id: null, showing_client: null }).eq('id', plotId);
  if (error) throw error;
}

// ---- Leads ----

export async function fetchLeads(dealerId: string): Promise<Lead[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data } = await supabase.from('leads').select('*').eq('dealer_id', dealerId).order('created_at', { ascending: false });
  const leads = (data as Lead[]) ?? [];
  for (const l of leads) {
    if (l.plot_id) {
      const { data: p } = await supabase.from('plots').select('block, plot_no').eq('id', l.plot_id).maybeSingle();
      l.plot_label = p ? `${(p as { block: string }).block}-${(p as { plot_no: string }).plot_no}` : '—';
      const { data: bk } = await supabase.from('bookings').select('id, status, pipeline_stage').eq('plot_id', l.plot_id)
        .not('status', 'in', '(cancelled,rejected)').order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (bk) {
        l.booking_id = (bk as { id: string }).id;
        const { fetchBookingDealStage } = await import('./booking');
        l.booking_stage = await fetchBookingDealStage(bk as Pick<Booking, 'id' | 'status' | 'pipeline_stage'>);
      }
    }
  }
  return leads;
}

export async function createLead(dealerId: string, input: Partial<Lead>): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Database not connected');
  const { error } = await supabase.from('leads').insert({
    dealer_id: dealerId,
    customer_name: input.customer_name,
    phone: input.phone || null,
    email: input.email || null,
    status: input.status || 'new',
    ...(input.label ? { label: input.label } : {}),
    pipeline_stage: 1,
    plot_id: input.plot_id || null,
    follow_up_date: input.follow_up_date || null,
  });
  if (error) throw error;
}

export async function updateLead(id: string, patch: Partial<Lead>): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Database not connected');
  const { error } = await supabase.from('leads').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteLead(id: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Database not connected');
  const { error } = await supabase.from('leads').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchActivities(leadId: string): Promise<LeadActivity[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data } = await supabase.from('lead_activities').select('*').eq('lead_id', leadId).order('created_at', { ascending: false });
  return (data as LeadActivity[]) ?? [];
}

export async function addActivity(leadId: string, type: LeadActivity['activity_type'], details: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Database not connected');
  const { error } = await supabase.from('lead_activities').insert({ lead_id: leadId, activity_type: type, details });
  if (error) throw error;
}
