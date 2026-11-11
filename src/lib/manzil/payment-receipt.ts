import { z } from "zod";
import { formatPrice } from "./properties";
import { receiptTotal } from "./payment-rules";
import { computeVerificationHash, receiptHashOf, type GatewayPayment } from "./payment-history";

export const receiptPdfInputSchema = z.object({
  paymentId: z.string().uuid("Invalid payment id"),
  accessToken: z.string().min(20, "Sign in required").max(4000),
});

export type ReceiptContext = {
  payment: GatewayPayment;
  buyerName: string;
  plotLabel: string;
  societyName: string;
  localeLines?: { en: string; ur?: string };
};

export function isDemoGatewayPayment(p: GatewayPayment): boolean {
  const txn = (p.gateway_txn_id ?? "").toUpperCase();
  const gw = (p.gateway ?? "").toLowerCase();
  return txn.startsWith("DEMO-") || gw === "mock" || gw.includes("demo");
}

/** Tiny deterministic matrix from hash (visual QR stand-in; hash text is authoritative for Verify). */
export function verificationQrSvg(hash: string, size = 120): string {
  const cells = 21;
  const bits: boolean[] = [];
  for (let i = 0; i < hash.length; i++) {
    const c = hash.charCodeAt(i);
    for (let b = 0; b < 8; b++) bits.push(Boolean((c >> b) & 1));
  }
  while (bits.length < cells * cells) bits.push(bits[bits.length % Math.max(hash.length, 1)]!);
  const cell = size / cells;
  let rects = "";
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      const on = bits[(y * cells + x) % bits.length]!;
      const finder = (x < 7 && y < 7) || (x >= cells - 7 && y < 7) || (x < 7 && y >= cells - 7);
      if (on || finder) {
        rects += `<rect x="${(x * cell).toFixed(2)}" y="${(y * cell).toFixed(2)}" width="${cell.toFixed(2)}" height="${cell.toFixed(2)}" fill="#111"/>`;
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="Verification QR">${rects}</svg>`;
}

export function buildAuthorizedReceiptHtml(ctx: ReceiptContext): string {
  const p = ctx.payment;
  const hash = receiptHashOf(p);
  const total = receiptTotal(p);
  const demo = isDemoGatewayPayment(p);
  const date = p.paid_at
    ? new Date(p.paid_at).toLocaleString()
    : p.created_at
      ? new Date(p.created_at).toLocaleString()
      : "—";
  const qr = verificationQrSvg(hash);
  const urLine = ctx.localeLines?.ur
    ? `<p class="ur muted">${escapeHtml(ctx.localeLines.ur)}</p>`
    : `<p class="ur muted">ادائیگی کی رسید — ManzilIQ</p>`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>Receipt ${escapeHtml(p.receipt_no ?? p.id)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&family=Source+Sans+3:wght@400;600;700&display=swap" rel="stylesheet"/>
  <style>
    :root { --ink:#1a1a1a; --muted:#666; --line:#e6e6e6; --accent:#0f3d2e; }
    * { box-sizing: border-box; }
    body {
      font-family: "Source Sans 3", system-ui, sans-serif;
      color: var(--ink);
      margin: 0;
      padding: 32px;
      max-width: 720px;
      margin-inline: auto;
      position: relative;
      background: #fff;
    }
    .ur { font-family: "Noto Nastaliq Urdu", "Source Sans 3", sans-serif; direction: rtl; }
    .sheet { position: relative; overflow: hidden; border: 1px solid var(--line); padding: 28px; }
    .sheet::before {
      content: "ManzilIQ";
      position: absolute;
      inset: 20% 0 auto;
      text-align: center;
      font-size: 72px;
      font-weight: 700;
      color: rgba(15, 61, 46, 0.06);
      transform: rotate(-24deg);
      pointer-events: none;
      z-index: 0;
      letter-spacing: 0.08em;
    }
    .content { position: relative; z-index: 1; }
    h1 { margin: 0 0 4px; font-size: 1.6rem; color: var(--accent); }
    .muted { color: var(--muted); }
    .demo {
      display: inline-block;
      margin: 8px 0 16px;
      padding: 4px 10px;
      border: 2px solid #b45309;
      color: #b45309;
      font-weight: 700;
      letter-spacing: 0.12em;
      font-size: 0.85rem;
    }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    td { padding: 8px 0; border-bottom: 1px solid var(--line); vertical-align: top; }
    td:last-child { text-align: right; font-weight: 600; }
    .foot { display: flex; gap: 20px; align-items: flex-start; margin-top: 24px; }
    .hash { font-family: ui-monospace, monospace; font-size: 0.8rem; word-break: break-all; }
    @media print {
      body { padding: 0; }
      .sheet { border: none; }
      .noprint { display: none; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="content">
      <h1>ManzilIQ payment receipt</h1>
      ${urLine}
      <p class="muted">${escapeHtml(p.receipt_no ?? "—")}</p>
      ${demo ? `<div class="demo">DEMO</div>` : ""}
      <table>
        <tr><td>Buyer</td><td>${escapeHtml(ctx.buyerName)}</td></tr>
        <tr><td>Society</td><td>${escapeHtml(ctx.societyName)}</td></tr>
        <tr><td>Plot</td><td>${escapeHtml(ctx.plotLabel)}</td></tr>
        <tr><td>Booking</td><td>${escapeHtml(p.booking_ref ?? "—")}</td></tr>
        <tr><td>Installment</td><td>${escapeHtml(p.label ?? "—")}</td></tr>
        <tr><td>Amount</td><td>${escapeHtml(formatPrice(p.amount))}</td></tr>
        <tr><td>Late fee</td><td>${escapeHtml(formatPrice(p.late_fee || 0))}</td></tr>
        <tr><td><strong>Total</strong></td><td><strong>${escapeHtml(formatPrice(total))}</strong></td></tr>
        <tr><td>Method</td><td>${escapeHtml(String(p.gateway || p.method || "—"))}</td></tr>
        <tr><td>Gateway reference</td><td>${escapeHtml(p.gateway_txn_id ?? "—")}</td></tr>
        <tr><td>Date</td><td>${escapeHtml(date)}</td></tr>
        <tr><td>Status</td><td>${escapeHtml(p.status)}</td></tr>
      </table>
      <div class="foot">
        <div>${qr}</div>
        <div>
          <div class="muted">Verification hash (matches Verify receipt)</div>
          <div class="hash">${escapeHtml(hash)}</div>
          <p class="muted noprint" style="margin-top:12px">Print or Save as PDF from your browser (File → Print → Save as PDF).</p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export { computeVerificationHash, receiptHashOf };
