import { getSupabase } from "./supabase";
import { getBackendHealth } from "./health.functions";
import type { BackendHealth, MigrationProbe } from "./features";

export type FailedDelivery = {
  id: string;
  user_id: string;
  channel: string;
  status: string;
  detail: string | null;
  created_at: string;
};

export type DeliveryRow = FailedDelivery;

export type ReminderRunSummary = {
  id: string;
  kind: string;
  status: string;
  created_at: string;
  /** Present when reading reminder_job_runs summary rows. */
  t_minus_3?: number;
  due_count?: number;
  overdue_count?: number;
  escalated_count?: number;
} | null;

export async function loadSystemStatus(): Promise<{
  health: BackendHealth;
  lastReminder: ReminderRunSummary;
  failedNotifications: FailedDelivery[];
  recentDeliveries: DeliveryRow[];
  migrations: MigrationProbe | null;
}> {
  const health = await getBackendHealth();
  const sb = getSupabase();
  let lastReminder: ReminderRunSummary = null;
  let failedNotifications: FailedDelivery[] = [];
  let recentDeliveries: DeliveryRow[] = [];
  if (sb) {
    // Prefer job-level summary (Task 3); fall back to per-payment reminder_runs.
    const job = await sb
      .from("reminder_job_runs")
      .select("id, status, created_at, t_minus_3, due_count, overdue_count, escalated_count")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!job.error && job.data) {
      const r = job.data as {
        id: string;
        status: string;
        created_at: string;
        t_minus_3: number;
        due_count: number;
        overdue_count: number;
        escalated_count: number;
      };
      lastReminder = {
        id: r.id,
        kind: "job",
        status: r.status,
        created_at: r.created_at,
        t_minus_3: r.t_minus_3,
        due_count: r.due_count,
        overdue_count: r.overdue_count,
        escalated_count: r.escalated_count,
      };
    } else {
      const { data: runs } = await sb
        .from("reminder_runs")
        .select("id, kind, status, created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      lastReminder = (runs as ReminderRunSummary) ?? null;
    }

    const { data: failed } = await sb
      .from("notification_deliveries")
      .select("id, user_id, channel, status, detail, created_at")
      .eq("status", "failed")
      .order("created_at", { ascending: false })
      .limit(25);
    failedNotifications = (failed as FailedDelivery[]) ?? [];

    const { data: recent } = await sb
      .from("notification_deliveries")
      .select("id, user_id, channel, status, detail, created_at")
      .order("created_at", { ascending: false })
      .limit(25);
    recentDeliveries = (recent as DeliveryRow[]) ?? [];
  }
  return {
    health,
    lastReminder,
    failedNotifications,
    recentDeliveries,
    migrations: health.migrations ?? null,
  };
}

export type IntegrationRow = {
  key: string;
  label: string;
  on: boolean;
  /** live when configured; mock when falling back; off when N/A */
  modeLabel: "live" | "mock" | "off";
};

export function integrationRows(health: BackendHealth): IntegrationRow[] {
  const f = health.features;
  const row = (key: string, label: string, on: boolean, mockWhenOff = true): IntegrationRow => ({
    key,
    label,
    on,
    modeLabel: on ? "live" : mockWhenOff ? "mock" : "off",
  });
  return [
    row("payments_live", "Payments (JazzCash / EasyPaisa)", !!f.payments_live, true),
    row("notify_sms", "SMS", !!f.notify_sms, true),
    row("notify_email", "Email", !!f.notify_email, true),
    row("notify_fcm", "Push (FCM)", !!f.notify_fcm, true),
    row("maps_js", "Maps (Google JS)", !!f.maps_js, true),
    row("reminders", "Reminder cron", !!f.reminders, false),
    row("ai_remote", "AI remote estimate", !!f.ai_remote, true),
    row("supabase", "Supabase", !!f.supabase, false),
  ];
}
