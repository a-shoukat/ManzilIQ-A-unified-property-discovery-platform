import { getSupabase } from './supabase';
import type { Booking } from './types';

export interface SoldReport {
  reference: string; reportDate: string; preparedBy: string; office: string;
  saleDate: string; closingDate: string;
  society: string; city: string; block: string; plotNo: string; sizeMarla: number | null; category: string;
  salePrice: number; tokenPaid: number; installmentPlan: string;
  channel: 'dealer' | 'direct';
  dealerName: string; dealerPhone: string; dealerEmail: string; commissionPct: number; commissionAmount: number;
  buyerName: string; buyerEmail: string; buyerPhone: string; seller: string;
  totalPaid: number; payments: { label: string; amount: number; paidAt: string; receipt: string }[];
  transferStatus: string;
}

const d = (s?: string | null) => (s ? new Date(s).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
export const pkr = (n: number) => `PKR ${Math.round(n || 0).toLocaleString('en-PK')}`;
export function sizeLabel(m: number | null): string {
  if (!m) return '—';
  return m >= 20 ? `${m} marla (${+(m / 20).toFixed(2)} kanal)` : `${m} marla`;
}

/** Pure builder so it can be tested without the database. */
export function buildSoldReport(b: Booking, x: {
  plot?: Record<string, unknown> | null; society?: Record<string, unknown> | null;
  dealer?: Record<string, unknown> | null; buyer?: Record<string, unknown> | null;
  commissionPct?: number; payments?: { label?: string | null; amount: number; late_fee?: number | null; paid_at?: string | null; receipt_no?: string | null }[];
  docTypes?: string[];
}, now = new Date()): SoldReport {
  const str = (o: Record<string, unknown> | null | undefined, k: string) => (o && o[k] != null ? String(o[k]) : '');
  const price = Number(x.plot?.base_price ?? b.plot_price ?? 0);
  const pct = Number(x.commissionPct ?? 0);
  const isDealer = b.channel === 'dealer' && !!b.dealer_id;
  const dealerName = str(x.dealer, 'full_name') || b.dealer_email || '';
  const society = b.society_name || str(x.society, 'society_name') || '—';
  const paid = (x.payments ?? []).filter((p) => p.paid_at);
  const docs = x.docTypes ?? [];
  const transferStatus = docs.some((t) => /transfer/i.test(t)) ? 'Transfer letter issued — registry / intiqal with society records'
    : docs.some((t) => /allot/i.test(t)) ? 'Allotment letter issued — transfer pending' : 'Transfer / registry pending';
  return {
    reference: b.reference_no, reportDate: d(now.toISOString()),
    preparedBy: isDealer ? dealerName || 'Dealer' : `${society} admin`, office: society,
    saleDate: d(b.created_at), closingDate: d(str(x.plot, 'sold_at') || str(b as unknown as Record<string, unknown>, 'updated_at') || b.created_at),
    society, city: str(x.society, 'city') || '—', block: b.plot_block || str(x.plot, 'block') || '—', plotNo: b.plot_no || str(x.plot, 'plot_no') || '—',
    sizeMarla: (b.plot_size_marla ?? Number(x.plot?.size_marla)) || null,
    category: (str(x.plot, 'category') || str(x.plot, 'plot_type') || 'residential').replace(/^\w/, (c) => c.toUpperCase()),
    salePrice: price, tokenPaid: Number(b.token_amount || 0), installmentPlan: b.installment_plan || '—', channel: isDealer ? 'dealer' : 'direct',
    dealerName: isDealer ? dealerName || '—' : '—', dealerPhone: isDealer ? str(x.dealer, 'phone') || '—' : '—', dealerEmail: isDealer ? b.dealer_email || str(x.dealer, 'email') || '—' : '—',
    commissionPct: isDealer ? pct : 0, commissionAmount: isDealer ? Math.round(price * pct / 100) : 0,
    buyerName: b.customer_name || str(x.buyer, 'full_name') || b.customer_email || '—', buyerEmail: b.customer_email || str(x.buyer, 'email') || '—', buyerPhone: str(x.buyer, 'phone') || '—',
    seller: society,
    totalPaid: paid.reduce((s, p) => s + Number(p.amount) + Number(p.late_fee || 0), 0),
    payments: paid.map((p) => ({ label: p.label || 'Payment', amount: Number(p.amount) + Number(p.late_fee || 0), paidAt: d(p.paid_at), receipt: p.receipt_no || '—' })),
    transferStatus,
  };
}

export async function loadSoldReport(b: Booking): Promise<SoldReport> {
  const sb = getSupabase();
  if (!sb) return buildSoldReport(b, {});
  const one = async (q: PromiseLike<{ data: unknown }>) => { try { return ((await q).data as Record<string, unknown> | null) ?? null; } catch { return null; } };
  const [plot, society, dealer, buyer, pays, docs] = await Promise.all([
    b.plot_id ? one(sb.from('plots').select('*').eq('id', b.plot_id).maybeSingle()) : null,
    b.society_id ? one(sb.from('society_details').select('*').eq('profile_id', b.society_id).maybeSingle()) : null,
    b.dealer_id ? one(sb.from('profiles').select('*').eq('id', b.dealer_id).maybeSingle()) : null,
    b.customer_id ? one(sb.from('profiles').select('*').eq('id', b.customer_id).maybeSingle()) : null,
    sb.from('payments').select('*').eq('booking_id', b.id).then((r) => r.data ?? [], () => []),
    sb.from('legal_documents').select('doc_type').eq('booking_id', b.id).then((r) => r.data ?? [], () => []),
  ]);
  let pct = 0;
  const lotId = plot?.lot_id as string | undefined;
  if (lotId) { const lot = await one(sb.from('lots').select('commission_pct').eq('id', lotId).maybeSingle()); pct = Number(lot?.commission_pct ?? 0); }
  return buildSoldReport(b, { plot, society, dealer, buyer, commissionPct: pct, payments: pays as never, docTypes: (docs as { doc_type: string }[]).map((x) => x.doc_type) });
}

export function buildSoldTranscript(r: SoldReport): string {
  return [
    'ManzilIQ — PROPERTY SOLD REPORT (Administrative and Fee Information)', `Booking: ${r.reference}`, '',
    `1. Report date: ${r.reportDate} | Prepared by: ${r.preparedBy} | Office: ${r.office}`,
    `2. Date of sale: ${r.saleDate} | Closing date: ${r.closingDate}`,
    `3. Property: Plot ${r.plotNo}, Block ${r.block}, ${r.society}, ${r.city}`,
    `   Size: ${sizeLabel(r.sizeMarla)} | Category: ${r.category}`, '',
    'BROKERAGE FEES',
    `4. Sale price: ${pkr(r.salePrice)}`,
    `5. Total brokerage fee: ${pkr(r.commissionAmount)} (${r.commissionPct}%)`,
    `6. Fee paid by: Seller (${r.seller})`, '',
    '7. PARTICIPATING PARTIES',
    `   Seller / listing office: ${r.seller}`,
    `   Dealer / selling agent: ${r.dealerName} | Phone: ${r.dealerPhone} | Email: ${r.dealerEmail}`,
    `   Buyer: ${r.buyerName} | Phone: ${r.buyerPhone} | Email: ${r.buyerEmail}`, '',
    '8. REFERRAL FEE DISBURSEMENTS: None recorded', '',
    '9. TRANSFER / REGISTRY STATUS', `   ${r.transferStatus}`, '',
    '10. FUNDS HANDLING',
    `   Token received: ${pkr(r.tokenPaid)} | Installment plan: ${r.installmentPlan}`,
    `   Total received: ${pkr(r.totalPaid)} | Balance: ${pkr(Math.max(0, r.salePrice - r.totalPaid))}`,
    ...r.payments.map((p) => `   - ${p.paidAt}  ${p.label}  ${pkr(p.amount)}  Receipt ${p.receipt}`),
  ].join('\n');
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

export function buildSoldReportHtml(r: SoldReport): string {
  const f = (label: string, v: string) => `<span class="f"><span class="l">${esc(label)}</span><span class="v">${esc(v)}</span></span>`;
  const box = (on: boolean, t: string) => `<span class="cb">${on ? '&#9746;' : '&#9744;'} ${esc(t)}</span>`;
  const resi = /resi/i.test(r.category);
  return `<!doctype html><html><head><meta charset="utf-8"><title>Sold Report ${esc(r.reference)}</title><style>
@page{size:A4;margin:14mm}*{box-sizing:border-box}body{font:11.5px/1.55 Arial,Helvetica,sans-serif;color:#111;margin:0}
.hd{border:2px solid #111;text-align:center;padding:8px}.hd h1{margin:0;font-size:20px;letter-spacing:2px;text-decoration:underline}.hd p{margin:2px 0 0}
.note{border:1.5px solid #111;padding:6px 8px;margin:6px 0 10px}
.r{display:flex;gap:10px;margin:5px 0;align-items:flex-end}.n{width:26px;font-weight:700}.sub{padding-left:26px}
.f{display:inline-flex;gap:6px;flex:1;align-items:flex-end}.l{white-space:nowrap}.v{flex:1;border-bottom:1px solid #111;font-weight:700;padding:0 4px;min-height:16px}
h3{margin:10px 0 2px;font-size:12.5px}.cb{margin-right:12px}
table{width:100%;border-collapse:collapse;margin-top:4px}td,th{border:1px solid #111;padding:3px 6px;text-align:left}
.sig{display:flex;gap:30px;margin-top:26px}.sig div{flex:1;border-top:1px solid #111;padding-top:3px;text-align:center}
.ft{margin-top:14px;text-align:center;font-style:italic;font-size:10px;border-top:1px dashed #111;padding-top:4px}
</style></head><body>
<div class="hd"><h1>PROPERTY SOLD REPORT</h1><p>Administrative and Fee Information</p></div>
<div class="note"><b>NOTE:</b> This record is prepared when a plot sale is closed on ManzilIQ, summarising the parties, provider details and fee arrangements for society review. Ref: <b>${esc(r.reference)}</b></div>
<div class="r"><span class="n">1.</span>${f('DATE:', r.reportDate)}${f('Prepared by', r.preparedBy)}${f('Office', r.office)}</div>
<div class="r"><span class="n">2.</span>${f('Date of sale', r.saleDate)}${f('Date of closing', r.closingDate)}</div>
<div class="r"><span class="n">3.</span>${f('Property', `Plot ${r.plotNo}, Block ${r.block}, ${r.society}`)}</div>
<div class="r sub">${f('City', r.city)}${f('Size', sizeLabel(r.sizeMarla))}</div>
<div class="r sub">3.1 Type: ${box(resi, 'Residential')}${box(!resi, 'Commercial')}</div>
<h3>Brokerage fees:</h3>
<div class="r"><span class="n">4.</span>${f('Sale price of property', pkr(r.salePrice))}</div>
<div class="r"><span class="n">5.</span>${f('Total brokerage fee on closing', pkr(r.commissionAmount))}${f('or', `${r.commissionPct}%`)}</div>
<div class="r sub">6.1 Fee to be paid by ${box(true, 'Seller (society)')}${box(false, 'Buyer')}</div>
<h3>7. Participating parties:</h3>
<div class="r sub">7.1 ${f('Seller / listing office', r.seller)}</div>
<div class="r sub">7.2 ${f('Selling dealer', r.dealerName)}${f('Phone', r.dealerPhone)}${f('Email', r.dealerEmail)}</div>
<div class="r sub">7.3 ${f('Buyer', r.buyerName)}${f('Phone', r.buyerPhone)}${f('Email', r.buyerEmail)}</div>
<h3>8. Referral fee disbursements:</h3>
<div class="r sub">${f('Referral fee paid by this office', 'None')}</div>
<h3>9. Transfer / registry status:</h3>
<div class="r sub">${f('Status', r.transferStatus)}</div>
<h3>10. Trust / fund handling:</h3>
<div class="r sub">${f('Token received', pkr(r.tokenPaid))}${f('Installment plan', r.installmentPlan)}</div>
<div class="r sub">${f('Total received', pkr(r.totalPaid))}${f('Balance', pkr(Math.max(0, r.salePrice - r.totalPaid)))}</div>
${r.payments.length ? `<table><tr><th>Date</th><th>Item</th><th>Amount</th><th>Receipt</th></tr>${r.payments.map((p) => `<tr><td>${esc(p.paidAt)}</td><td>${esc(p.label)}</td><td>${esc(pkr(p.amount))}</td><td>${esc(p.receipt)}</td></tr>`).join('')}</table>` : ''}
<div class="sig"><div>Prepared by</div><div>Society authority</div><div>Date</div></div>
<div class="ft">ManzilIQ — Property Sold Report · ${esc(r.reference)}</div>
<script>window.onload=function(){setTimeout(function(){window.print()},250)}</script>
</body></html>`;
}

export function downloadText(text: string, filename: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
