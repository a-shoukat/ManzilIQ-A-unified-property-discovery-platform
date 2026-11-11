import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "./env-server";
import { checkRateLimit } from "./security";
import {
  buildAuthorizedReceiptHtml,
  isDemoGatewayPayment,
  receiptHashOf,
  receiptPdfInputSchema,
} from "./payment-receipt";
import type { GatewayPayment } from "./payment-history";

/**
 * Choice: server-rendered HTML → browser/OS "Save as PDF".
 * Chromium/pdfkit/puppeteer are too heavy for this Vercel/Nitro runtime.
 * Fonts: Source Sans 3 (EN) + Noto Nastaliq Urdu (UR) via Google Fonts for Phase 12.
 */

export { receiptPdfInputSchema };

function serviceClient() {
  const url = serverEnv("SUPABASE_URL") ?? serverEnv("VITE_SUPABASE_URL");
  const key = serverEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function anonAuthed(accessToken: string) {
  const url = serverEnv("SUPABASE_URL") ?? serverEnv("VITE_SUPABASE_URL");
  const key =
    serverEnv("SUPABASE_ANON_KEY") ??
    serverEnv("VITE_SUPABASE_PUBLISHABLE_KEY") ??
    serverEnv("VITE_SUPABASE_ANON_KEY");
  if (!url || !key) return null;
  return createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type ReceiptPdfResult =
  | {
      ok: true;
      format: "html-print-pdf";
      html: string;
      filename: string;
      hash: string;
      demo: boolean;
    }
  | {
      ok: false;
      reason: string;
    };

export const generatePaymentReceiptPdf = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => receiptPdfInputSchema.parse(d))
  .handler(async ({ data }): Promise<ReceiptPdfResult> => {
    const rl = checkRateLimit(`receipt-pdf:${data.paymentId}`, 12, 60_000);
    if (!rl.ok) return { ok: false, reason: "Too many receipt downloads. Please wait a minute." };

    const userClient = anonAuthed(data.accessToken);
    if (!userClient) return { ok: false, reason: "Auth not configured" };

    const { data: userData, error: userErr } = await userClient.auth.getUser(data.accessToken);
    if (userErr || !userData.user) return { ok: false, reason: "Invalid or expired session" };
    const userId = userData.user.id;

    const sb = serviceClient() ?? userClient;
    const { data: profile } = await sb
      .from("profiles")
      .select("id, role, full_name, email")
      .eq("id", userId)
      .maybeSingle();
    const role = (profile as { role?: string } | null)?.role ?? "buyer";

    const { data: payRow, error: payErr } = await sb
      .from("payments")
      .select("*")
      .eq("id", data.paymentId)
      .maybeSingle();
    if (payErr || !payRow) return { ok: false, reason: "Payment not found" };
    const payment = payRow as GatewayPayment;

    const allowed =
      role === "super_admin" ||
      (role === "buyer" && payment.customer_id === userId) ||
      (role === "society_admin" && payment.society_id === userId);
    if (!allowed) return { ok: false, reason: "Not authorized for this payment" };

    let buyerName = "—";
    if (payment.customer_id) {
      const { data: buyer } = await sb
        .from("profiles")
        .select("full_name, email")
        .eq("id", payment.customer_id)
        .maybeSingle();
      const b = buyer as { full_name?: string | null; email?: string } | null;
      buyerName = b?.full_name || b?.email || payment.customer_id;
    }

    let plotLabel = "—";
    let societyName = "—";
    let bookingRef = payment.booking_ref ?? null;
    if (payment.booking_id) {
      const { data: booking } = await sb
        .from("bookings")
        .select("id, reference_no, plot_id, society_id")
        .eq("id", payment.booking_id)
        .maybeSingle();
      const bk = booking as {
        reference_no?: string | null;
        plot_id?: string | null;
        society_id?: string | null;
      } | null;
      if (bk?.reference_no) bookingRef = bk.reference_no;
      if (bk?.plot_id) {
        const { data: plot } = await sb
          .from("plots")
          .select("block, plot_no")
          .eq("id", bk.plot_id)
          .maybeSingle();
        const pl = plot as { block?: string | null; plot_no?: string | null } | null;
        if (pl) plotLabel = [pl.block, pl.plot_no].filter(Boolean).join(" / ") || plotLabel;
      }
      const societyId = payment.society_id ?? bk?.society_id;
      if (societyId) {
        const { data: soc } = await sb
          .from("society_details")
          .select("society_name")
          .eq("profile_id", societyId)
          .maybeSingle();
        const sn = (soc as { society_name?: string } | null)?.society_name;
        if (sn) societyName = sn;
        else {
          const { data: sp } = await sb
            .from("profiles")
            .select("email, full_name")
            .eq("id", societyId)
            .maybeSingle();
          const s = sp as { email?: string; full_name?: string | null } | null;
          societyName = s?.full_name || s?.email || societyId;
        }
      }
    }

    const enriched: GatewayPayment = {
      ...payment,
      ...(bookingRef ? { booking_ref: bookingRef } : {}),
    };
    const hash = receiptHashOf(enriched);
    const html = buildAuthorizedReceiptHtml({
      payment: enriched,
      buyerName,
      plotLabel,
      societyName,
      localeLines: {
        en: "Payment receipt",
        ur: "ادائیگی کی رسید — ManzilIQ",
      },
    });

    return {
      ok: true,
      format: "html-print-pdf",
      html,
      filename: `receipt-${payment.receipt_no ?? payment.id}.html`,
      hash,
      demo: isDemoGatewayPayment(payment),
    };
  });
