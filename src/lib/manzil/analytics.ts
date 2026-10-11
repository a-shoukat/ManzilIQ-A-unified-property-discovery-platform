import { getSupabase } from './supabase';
import { PIPELINE_STAGES } from '@/lib/manzil/types';

/** Module 12 — Analytics & Reporting: data layer */

export interface SocietySalesStats {
  plotsByStatus: { status: string; count: number }[];
  bookingsByStatus: { status: string; count: number }[];
  revenueByMonth: { month: string; total: number }[];
  topBlocks: { block: string; sold: number; total: number }[];
}

export async function societySalesStats(societyId: string): Promise<SocietySalesStats> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Database not connected');

  const { data: plots } = await supabase.from('plots').select('status, block').eq('society_id', societyId);
  const plotsByStatus = new Map<string, number>();
  const blockMap = new Map<string, { sold: number; total: number }>();
  for (const p of (plots as { status: string; block: string }[] | null) ?? []) {
    plotsByStatus.set(p.status, (plotsByStatus.get(p.status) ?? 0) + 1);
    const b = blockMap.get(p.block) ?? { sold: 0, total: 0 };
    b.total++;
    if (p.status === 'sold') b.sold++;
    blockMap.set(p.block, b);
  }

  const { data: bookings } = await supabase.from('bookings').select('status').eq('society_id', societyId);
  const bookingsByStatus = new Map<string, number>();
  for (const b of (bookings as { status: string }[] | null) ?? []) {
    bookingsByStatus.set(b.status, (bookingsByStatus.get(b.status) ?? 0) + 1);
  }

  const { data: pays } = await supabase
    .from('payments')
    .select('amount, created_at')
    .eq('society_id', societyId)
    .eq('status', 'confirmed');
  const revByMonth = new Map<string, number>();
  for (const p of (pays as { amount: number; created_at: string }[] | null) ?? []) {
    const m = p.created_at.slice(0, 7);
    revByMonth.set(m, (revByMonth.get(m) ?? 0) + Number(p.amount));
  }

  return {
    plotsByStatus: [...plotsByStatus.entries()].map(([status, count]) => ({ status, count })),
    bookingsByStatus: [...bookingsByStatus.entries()].map(([status, count]) => ({ status, count })),
    revenueByMonth: [...revByMonth.entries()]
      .map(([month, total]) => ({ month, total }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-8),
    topBlocks: [...blockMap.entries()]
      .map(([block, v]) => ({ block, ...v }))
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 6),
  };
}

export interface DealerPerf {
  lots: number;
  plotsAssigned: number;
  leads: number;
  leadsByTemp: { temp: string; count: number }[];
  pipeline: { stage: string; count: number }[];
  converted: number;
  conversionRate: number;
}

export async function dealerPerformance(dealerId: string): Promise<DealerPerf> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Database not connected');

  const { count: lots } = await supabase.from('lots').select('id', { count: 'exact', head: true }).eq('dealer_id', dealerId);
  const { data: lotRows } = await supabase.from('lots').select('id').eq('dealer_id', dealerId);
  const lotIds = ((lotRows as { id: string }[] | null) ?? []).map((l) => l.id);
  let plotsAssigned = 0;
  if (lotIds.length > 0) {
    const { count } = await supabase.from('plots').select('id', { count: 'exact', head: true }).in('lot_id', lotIds);
    plotsAssigned = count ?? 0;
  }

  const { data: leads } = await supabase.from('leads').select('status, pipeline_stage').eq('dealer_id', dealerId);
  const list = (leads as { status: string; pipeline_stage: number }[] | null) ?? [];
  const byTemp = new Map<string, number>();
  const pipe = new Array(PIPELINE_STAGES.length).fill(0);
  let converted = 0;
  for (const l of list) {
    byTemp.set(l.status, (byTemp.get(l.status) ?? 0) + 1);
    if (l.pipeline_stage >= 0 && l.pipeline_stage < pipe.length) pipe[l.pipeline_stage]++;
    if (l.status === 'converted') converted++;
  }

  return {
    lots: lots ?? 0,
    plotsAssigned,
    leads: list.length,
    leadsByTemp: [...byTemp.entries()].map(([temp, count]) => ({ temp, count })),
    pipeline: PIPELINE_STAGES.map((stage, i) => ({ stage, count: pipe[i] })),
    converted,
    conversionRate: list.length ? Math.round((converted / list.length) * 100) : 0,
  };
}

export interface MarketTrend {
  city: string;
  category: string;
  avgPerMarla: number;
  listings: number;
}

export interface TrendPoint {
  month: string;
  avgPerMarla: number;
}

/** AI-flavoured market trend analysis from live listings. */
export async function marketTrends(): Promise<{ byCity: MarketTrend[]; overall: TrendPoint[] }> {
  const supabase = getSupabase();
  if (!supabase) return { byCity: [], overall: [] };

  const { data: props } = await supabase
    .from('properties')
    .select('price, plot_size_marla, category, city, created_at')
    .eq('purpose', 'sale')
    .gt('plot_size_marla', 0)
    .gt('price', 0)
    .limit(500);
  const rows = (props as { price: number; plot_size_marla: number; category: string; city: string; created_at: string }[] | null) ?? [];

  const cityMap = new Map<string, { sum: number; n: number; category: string }>();
  const monthMap = new Map<string, { sum: number; n: number }>();
  for (const r of rows) {
    const rate = Number(r.price) / Number(r.plot_size_marla);
    const key = `${(r.city || 'Unknown').toLowerCase()}|${r.category}`;
    const c = cityMap.get(key) ?? { sum: 0, n: 0, category: r.category };
    c.sum += rate;
    c.n++;
    cityMap.set(key, c);
    const m = r.created_at.slice(0, 7);
    const mo = monthMap.get(m) ?? { sum: 0, n: 0 };
    mo.sum += rate;
    mo.n++;
    monthMap.set(m, mo);
  }

  return {
    byCity: [...cityMap.entries()]
      .map(([key, v]) => ({
        city: key.split('|')[0] ?? 'Unknown',
        category: v.category,
        avgPerMarla: Math.round(v.sum / v.n),
        listings: v.n,
      }))
      .sort((a, b) => b.listings - a.listings)
      .slice(0, 10),
    overall: [...monthMap.entries()]
      .map(([month, v]) => ({ month, avgPerMarla: Math.round(v.sum / v.n) }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-8),
  };
}

export interface ActivityItem {
  date: string;
  kind: 'booking' | 'payment' | 'document';
  text: string;
}

export async function customerActivity(customerId: string): Promise<ActivityItem[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const items: ActivityItem[] = [];

  const { data: bookings } = await supabase.from('bookings').select('reference_no, status, created_at').eq('customer_id', customerId);
  for (const b of (bookings as { reference_no: string; status: string; created_at: string }[] | null) ?? []) {
    items.push({ date: b.created_at, kind: 'booking', text: `Booking ${b.reference_no} — ${b.status}` });
  }
  const { data: pays } = await supabase.from('payments').select('label, amount, status, created_at').eq('customer_id', customerId);
  for (const p of (pays as { label: string; amount: number; status: string; created_at: string }[] | null) ?? []) {
    items.push({ date: p.created_at, kind: 'payment', text: `${p.label ?? 'Payment'} — PKR ${Number(p.amount).toLocaleString()} (${p.status})` });
  }
  const { data: docs } = await supabase.from('generated_documents').select('title, created_at').eq('customer_id', customerId);
  for (const d of (docs as { title: string; created_at: string }[] | null) ?? []) {
    items.push({ date: d.created_at, kind: 'document', text: `Document: ${d.title}` });
  }
  return items.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 50);
}

/** Download rows as CSV. */
export function downloadCSV(filename: string, rows: Record<string, unknown>[]): void {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0] ?? {});
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
