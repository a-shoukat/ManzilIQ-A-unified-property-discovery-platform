import type { GeneratedDocType } from './types';

export interface PartySignature {
  role: string; // e.g. "Buyer", "Seller"
  mode: 'typed' | 'drawn';
  name: string;
  dataUrl?: string | undefined; // PNG for drawn signatures
  signedAt: string; // ISO
}

/** Documents that carry a buyer/seller signature block. */
export const SIGNABLE_DOCS: GeneratedDocType[] = ['allotment', 'sale_agreement', 'transfer_deed'];
export const SIGN_PARTIES: Record<string, [string, string]> = {
  allotment: ['Buyer (Allottee)', 'Seller (Society authority)'],
  sale_agreement: ['Buyer', 'Seller'],
  transfer_deed: ['Transferee (Buyer)', 'Transferor (Seller)'],
};

const MARK = '\n\n[[MANZILIQ_SIGNATURES]]';

/** Signatures are stored with the document body so they travel with every version. */
export function attachSignatures(body: string, sigs: PartySignature[]): string {
  return sigs.length ? `${body}${MARK}${JSON.stringify(sigs)}` : body;
}

export function splitSignatures(body: string): { text: string; sigs: PartySignature[] } {
  const i = body.indexOf(MARK);
  if (i < 0) return { text: body, sigs: [] };
  try { return { text: body.slice(0, i), sigs: JSON.parse(body.slice(i + MARK.length)) as PartySignature[] }; }
  catch { return { text: body.slice(0, i), sigs: [] }; }
}

export function watermarkText(ref: string, generatedAt: string): string {
  const t = new Date(generatedAt);
  const stamp = isNaN(t.getTime()) ? generatedAt : t.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  return `MANZILIQ · ${ref} · ${stamp}`;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

/** Print-ready A4 HTML with diagonal watermark repeated on every page + embedded signatures. */
export function buildLegalPdfHtml(opts: { title: string; body: string; reference: string; generatedAt: string; version: number }): string {
  const { text, sigs } = splitSignatures(opts.body);
  const wm = esc(watermarkText(opts.reference, opts.generatedAt));
  const tiles = Array.from({ length: 14 }, () => `<span>${wm}</span>`).join('');
  const sigHtml = sigs.map((s) => `<div class="sg">
    <div class="ink">${s.mode === 'drawn' && s.dataUrl ? `<img src="${s.dataUrl}" alt="signature">` : `<span class="typed">${esc(s.name)}</span>`}</div>
    <div class="ln">${esc(s.role)}: <b>${esc(s.name)}</b></div>
    <div class="meta">${s.mode === 'drawn' ? 'Drawn' : 'Typed'} e-signature · ${esc(new Date(s.signedAt).toLocaleString('en-PK'))}</div></div>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(opts.title)} ${esc(opts.reference)}</title>
<link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&display=swap" rel="stylesheet"><style>
@page{size:A4;margin:18mm}*{box-sizing:border-box}body{font:13px/1.7 Georgia,serif;color:#111;margin:0}
.wm{position:fixed;inset:-30% -30%;display:flex;flex-wrap:wrap;align-content:space-around;justify-content:space-around;transform:rotate(-35deg);pointer-events:none;z-index:0}
.wm span{font:700 15px Arial,sans-serif;color:rgba(0,0,0,.09);letter-spacing:2px;white-space:nowrap;padding:40px 30px}
main{position:relative;z-index:1}h1{text-align:center;font-size:20px;letter-spacing:1px;margin:0 0 4px}
.sub{text-align:center;font:11px Arial,sans-serif;color:#555;margin-bottom:18px}pre{white-space:pre-wrap;font:inherit;margin:0}
.sigs{display:flex;gap:28px;margin-top:34px;page-break-inside:avoid}.sg{flex:1}.ink{height:70px;display:flex;align-items:flex-end;border-bottom:1px solid #111}
.ink img{max-height:66px;max-width:100%}.typed{font:600 30px 'Dancing Script',cursive}.ln{margin-top:4px;font-size:12px}.meta{font:10px Arial,sans-serif;color:#555}
.ft{margin-top:24px;border-top:1px dashed #111;padding-top:4px;font:10px Arial,sans-serif;text-align:center;color:#444}
</style></head><body><div class="wm">${tiles}</div><main>
<h1>${esc(opts.title)}</h1><div class="sub">Ref ${esc(opts.reference)} · v${opts.version} · Generated ${esc(watermarkText(opts.reference, opts.generatedAt).split(' · ')[2] ?? '')}</div>
<pre>${esc(text)}</pre>${sigs.length ? `<div class="sigs">${sigHtml}</div>` : ''}
<div class="ft">Tamper-evident document · ${wm} · Any alteration voids this document</div></main>
<script>window.onload=function(){setTimeout(function(){window.print()},400)}</script></body></html>`;
}
