import { getSupabase } from './supabase';
import { notify } from './notify';
import type { Dispute, LegalTemplate } from '@/lib/manzil/types';

// ---- Disputes ----

export async function fileDispute(input: {
  reporter_id: string;
  type: Dispute['type'];
  subject: string;
  description: string;
  plot_id?: string | null;
  booking_ref?: string | null;
}): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Database not connected');
  const { error } = await supabase.from('disputes').insert({
    reporter_id: input.reporter_id,
    type: input.type,
    subject: input.subject,
    description: input.description,
    plot_id: input.plot_id || null,
    booking_ref: input.booking_ref || null,
    status: 'open',
  });
  if (error) throw error;
}

export async function fetchDisputes(mineOnly: string | null): Promise<Dispute[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  let q = supabase.from('disputes').select('*').order('created_at', { ascending: false });
  if (mineOnly) q = q.eq('reporter_id', mineOnly);
  const { data } = await q;
  const list = (data as Dispute[]) ?? [];
  for (const d of list) {
    if (d.reporter_id) {
      const { data: p } = await supabase.from('profiles').select('email').eq('id', d.reporter_id).maybeSingle();
      d.reporter_email = (p as { email: string } | null)?.email ?? '—';
    }
    if (d.plot_id) {
      const { data: pl } = await supabase.from('plots').select('block, plot_no').eq('id', d.plot_id).maybeSingle();
      d.plot_label = pl ? `${(pl as { block: string }).block}-${(pl as { plot_no: string }).plot_no}` : '—';
    }
  }
  return list;
}

export async function setDisputeStatus(id: string, status: Dispute['status'], resolutionNote?: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Database not connected');
  const patch: Partial<Dispute> = { status };
  if (resolutionNote !== undefined) patch.resolution_note = resolutionNote;
  const { error } = await supabase.from('disputes').update(patch).eq('id', id);
  if (error) throw error;
  // trigger: complaint status update → notify reporter
  const { data: d } = await supabase.from('disputes').select('reporter_id, subject').eq('id', id).maybeSingle();
  const dd = d as { reporter_id: string; subject: string } | null;
  if (dd?.reporter_id) {
    notify(dd.reporter_id, `Dispute ${status}`, `Your dispute "${dd.subject}" is now ${status}.${resolutionNote ? ' Note: ' + resolutionNote : ''}`, 'dispute_update').catch(() => {});
  }
}

export async function freezePlotForDispute(plotId: string, freeze: boolean): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Database not connected');
  const { error } = await supabase.from('plots').update({ status: freeze ? 'blocked' : 'available' }).eq('id', plotId);
  if (error) throw error;
}

// ---- Legal templates ----

export async function fetchLegalTemplates(): Promise<LegalTemplate[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data } = await supabase.from('legal_templates').select('*').order('key').order('version', { ascending: false });
  return (data as LegalTemplate[]) ?? [];
}

export async function saveLegalTemplate(key: string, title: string, body: string, publish: boolean): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Database not connected');
  const { data: existing } = await supabase.from('legal_templates').select('version').eq('key', key).order('version', { ascending: false }).limit(1);
  const nextVersion = ((existing as { version: number }[] | null)?.[0]?.version ?? 0) + 1;
  if (publish) {
    await supabase.from('legal_templates').update({ published: false }).eq('key', key);
  }
  const { error } = await supabase.from('legal_templates').insert({ key, title, body, version: nextVersion, published: publish });
  if (error) throw error;
}

/** Fill {{placeholders}} with sample data for preview. */
export function renderTemplatePreview(body: string): string {
  const sample: Record<string, string> = {
    customer_name: 'Ahmed Khan',
    cnic: '35202-1234567-1',
    plot: 'A-12 (5 Marla)',
    society: 'Dream Gardens, Narowal',
    amount: 'PKR 7,500,000',
    date: new Date().toLocaleDateString(),
    reference_no: 'BK-ABC123',
  };
  return body.replace(/\{\{(\w+)\}\}/g, (_, k: string) => sample[k] ?? `{{${k}}}`);
}

// ---- Platform analytics ----

export interface PlatformStats {
  societies: number;
  dealers: number;
  customers: number;
  gmv: number;
  plotsActive: number;
  plotsSold: number;
  monthlyUsers: { month: string; total: number }[];
}

export async function platformStats(): Promise<PlatformStats> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Database not connected');

  const count = async (table: string, filter?: (q: unknown) => unknown) => {
    let q = supabase.from(table).select('id', { count: 'exact', head: true });
    if (filter) q = filter(q) as typeof q;
    const { count: c } = await q;
    return c ?? 0;
  };

  const [societies, dealers, customers] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'society_admin').eq('verification_status', 'approved').then((r) => r.count ?? 0),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'dealer').eq('verification_status', 'approved').then((r) => r.count ?? 0),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'buyer').then((r) => r.count ?? 0),
  ]);

  const { data: payData } = await supabase.from('payments').select('amount').eq('status', 'confirmed');
  const gmv = ((payData as { amount: number }[]) ?? []).reduce((s, p) => s + Number(p.amount), 0);

  const { count: plotsActive } = await supabase.from('plots').select('id', { count: 'exact', head: true }).neq('status', 'sold');
  const { count: plotsSold } = await supabase.from('plots').select('id', { count: 'exact', head: true }).eq('status', 'sold');

  const { data: users } = await supabase.from('profiles').select('created_at');
  const monthly = new Map<string, number>();
  for (const u of (users as { created_at: string }[]) ?? []) {
    const m = u.created_at.slice(0, 7);
    monthly.set(m, (monthly.get(m) ?? 0) + 1);
  }

  void count;
  return {
    societies,
    dealers,
    customers,
    gmv,
    plotsActive: plotsActive ?? 0,
    plotsSold: plotsSold ?? 0,
    monthlyUsers: [...monthly.entries()].map(([month, total]) => ({ month, total })).sort((a, b) => a.month.localeCompare(b.month)).slice(-6),
  };
}
