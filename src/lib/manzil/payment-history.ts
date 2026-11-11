import { z } from "zod";
import { getSupabase } from "./supabase";
import { formatPrice } from "./properties";
import { receiptTotal } from "./payment-rules";
import type { Payment } from "./types";

export const verifySchema = z.object({
  hash: z.string().trim().min(8, "Enter the verification hash"),
});

export type GatewayPayment = Payment & {
  gateway?: string | null;
  gateway_txn_id?: string | null;
  verification_hash?: string | null;
};

/** Deterministic client-safe verification fingerprint (no Node crypto in browser). */
export function computeVerificationHash(p: {
  id: string;
  amount: number;
  gateway_txn_id?: string | null;
  receipt_no?: string | null;
}): string {
  const raw = [p.id, String(p.amount), p.gateway_txn_id ?? "", p.receipt_no ?? ""].join("|");
  let h = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `vh_${(h >>> 0).toString(16)}_${p.id.replace(/-/g, "").slice(0, 8)}`;
}

export function receiptHashOf(p: GatewayPayment): string {
  return p.verification_hash || computeVerificationHash(p);
}

export function verifyReceiptHash(p: GatewayPayment, input: string): boolean {
  return receiptHashOf(p) === input.trim();
}

export async function fetchBuyerGatewayPayments(userId: string): Promise<GatewayPayment[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("payments")
    .select("*")
    .eq("customer_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);
  return (data as GatewayPayment[]) ?? [];
}

export async function fetchSocietyGatewayPayments(societyId: string): Promise<GatewayPayment[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("payments")
    .select("*")
    .eq("society_id", societyId)
    .order("created_at", { ascending: false })
    .limit(200);
  return (data as GatewayPayment[]) ?? [];
}

/** Printable HTML receipt — Phase 3 has no separate PDF server fn; browser Save-as-PDF. */
export function buildPaymentReceiptHtml(p: GatewayPayment): string {
  const total = receiptTotal(p);
  const hash = receiptHashOf(p);
  return `<!doctype html><html><head><meta charset="utf-8"/><title>Receipt ${p.receipt_no ?? p.id}</title>
  <style>body{font-family:system-ui,sans-serif;padding:24px;max-width:640px;margin:auto}h1{margin:0 0 8px}.muted{color:#666}table{width:100%;border-collapse:collapse;margin-top:16px}td{padding:6px 0;border-bottom:1px solid #eee}</style></head><body>
  <h1>ManzilIQ payment receipt</h1>
  <p class="muted">${p.receipt_no ?? "—"}</p>
  <table>
    <tr><td>Booking</td><td>${p.booking_ref ?? "—"}</td></tr>
    <tr><td>Label / installment</td><td>${p.label ?? "—"}</td></tr>
    <tr><td>Amount</td><td>${formatPrice(p.amount)}</td></tr>
    <tr><td>Late fee</td><td>${formatPrice(p.late_fee || 0)}</td></tr>
    <tr><td><strong>Total</strong></td><td><strong>${formatPrice(total)}</strong></td></tr>
    <tr><td>Status</td><td>${p.status}</td></tr>
    <tr><td>Method / gateway</td><td>${p.gateway || p.method || "—"}</td></tr>
    <tr><td>Gateway reference</td><td>${p.gateway_txn_id ?? "—"}</td></tr>
    <tr><td>Paid at</td><td>${p.paid_at ? new Date(p.paid_at).toLocaleString() : "—"}</td></tr>
    <tr><td>Verification hash</td><td><code>${hash}</code></td></tr>
  </table>
  <p class="muted">Print this page or Save as PDF from your browser.</p>
  </body></html>`;
}

export function downloadReceiptPdf(p: GatewayPayment): void {
  const html = buildPaymentReceiptHtml(p);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `receipt-${p.receipt_no ?? p.id}.html`;
  a.click();
  URL.revokeObjectURL(url);
}
