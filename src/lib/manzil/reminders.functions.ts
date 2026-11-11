import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "./env-server";
import { dispatchChannels } from "./notify-channels.functions";
import { kindsForDueDate, type ReminderKind } from "./reminder-rules";

function adminClient() {
  const url = serverEnv("SUPABASE_URL") ?? serverEnv("VITE_SUPABASE_URL");
  const key = serverEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Installment reminder job (T-3 / due / overdue / escalate to admin).
 * Call from an external cron with Authorization: Bearer $REMINDER_CRON_SECRET.
 * Requires SUPABASE_SERVICE_ROLE_KEY; otherwise returns needs_credentials.
 */
export const runInstallmentReminders = createServerFn({ method: "POST" })
  .inputValidator((d: { secret?: string }) => ({ secret: String(d?.secret ?? "") }))
  .handler(async ({ data }) => {
    const expected = serverEnv("REMINDER_CRON_SECRET");
    if (!expected || data.secret !== expected) {
      return { ok: false as const, reason: "unauthorized" as const, sent: 0 };
    }
    const sb = adminClient();
    if (!sb) {
      return { ok: false as const, reason: "needs_credentials" as const, sent: 0 };
    }

    const today = todayUtc();
    const { data: pending, error } = await sb
      .from("payments")
      .select("id, customer_id, society_id, amount, due_date, label, status, booking_id")
      .neq("status", "confirmed")
      .not("due_date", "is", null)
      .limit(500);
    if (error) return { ok: false as const, reason: error.message, sent: 0 };

    let sent = 0;
    const rows =
      (pending as {
        id: string;
        customer_id: string;
        society_id: string;
        amount: number;
        due_date: string;
        label: string | null;
        booking_id: string;
      }[]) ?? [];

    for (const p of rows) {
      const kinds: ReminderKind[] = kindsForDueDate(p.due_date, today);
      for (const kind of kinds) {
        const { error: insErr } = await sb.from("reminder_runs").insert({
          payment_id: p.id,
          kind,
          channel: "in_app",
          status: "sent",
        });
        if (insErr) continue; // unique (payment_id, kind) → already sent

        const title =
          kind === "t_minus_3"
            ? "Installment due in 3 days"
            : kind === "due"
              ? "Installment due today"
              : kind === "overdue"
                ? "Installment overdue"
                : "Overdue payment escalation";
        const body = `${p.label ?? "Payment"} of PKR ${Number(p.amount).toLocaleString()} (due ${p.due_date}).`;
        const targets = kind === "escalation" ? [p.society_id] : [p.customer_id];
        for (const uid of targets.filter(Boolean)) {
          await sb
            .from("notifications")
            .insert({ user_id: uid, title, body, type: `reminder_${kind}` });
          const { data: profile } = await sb
            .from("profiles")
            .select("email")
            .eq("id", uid)
            .maybeSingle();
          const { data: cust } = await sb
            .from("customer_details")
            .select("contact_phone")
            .eq("profile_id", uid)
            .maybeSingle();
          const email = (profile as { email?: string } | null)?.email;
          const phone = (cust as { contact_phone?: string } | null)?.contact_phone;
          await dispatchChannels({
            title,
            body,
            channels: ["email", "sms"],
            ...(email ? { email } : {}),
            ...(phone ? { phone } : {}),
          });
        }
        sent += 1;
      }
    }
    return { ok: true as const, reason: "ok" as const, sent };
  });
