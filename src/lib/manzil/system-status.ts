import { getSupabase } from "./supabase";
import { getBackendHealth } from "./health.functions";
import type { BackendHealth } from "./features";

export type FailedDelivery = {
  id: string;
  user_id: string;
  channel: string;
  status: string;
  detail: string | null;
  created_at: string;
};

export type ReminderRunSummary = {
  id: string;
  kind: string;
  status: string;
  created_at: string;
} | null;

export async function loadSystemStatus(): Promise<{
  health: BackendHealth;
  lastReminder: ReminderRunSummary;
  failedNotifications: FailedDelivery[];
}> {
  const health = await getBackendHealth();
  const sb = getSupabase();
  let lastReminder: ReminderRunSummary = null;
  let failedNotifications: FailedDelivery[] = [];
  if (sb) {
    const { data: runs } = await sb
      .from("reminder_runs")
      .select("id, kind, status, created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    lastReminder = (runs as ReminderRunSummary) ?? null;

    const { data: failed } = await sb
      .from("notification_deliveries")
      .select("id, user_id, channel, status, detail, created_at")
      .eq("status", "failed")
      .order("created_at", { ascending: false })
      .limit(25);
    failedNotifications = (failed as FailedDelivery[]) ?? [];
  }
  return { health, lastReminder, failedNotifications };
}

export function integrationRows(health: BackendHealth): { key: string; label: string; on: boolean }[] {
  const f = health.features;
  return [
    { key: "payments_live", label: "Payments (JazzCash / EasyPaisa)", on: !!f.payments_live },
    { key: "notify_sms", label: "SMS", on: !!f.notify_sms },
    { key: "notify_email", label: "Email", on: !!f.notify_email },
    { key: "notify_fcm", label: "Push (FCM)", on: !!f.notify_fcm },
    { key: "maps_js", label: "Maps", on: !!f.maps_js },
    { key: "reminders", label: "Reminder cron", on: !!f.reminders },
    { key: "ai_remote", label: "AI remote estimate", on: !!f.ai_remote },
    { key: "supabase", label: "Supabase", on: !!f.supabase },
  ];
}
