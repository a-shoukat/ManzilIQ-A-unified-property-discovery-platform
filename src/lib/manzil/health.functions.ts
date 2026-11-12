import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import {
  MIGRATION_PROBE_TABLES,
  publicFeatureFlags,
  summarizeMigrationProbe,
  summarizeMode,
  type BackendFeature,
  type BackendHealth,
  type MigrationProbe,
} from "./features";

function env(k: string): string | undefined {
  const v = process.env[k];
  return v && v.trim() ? v.trim() : undefined;
}

async function probeMigrations(): Promise<MigrationProbe> {
  const url = env("SUPABASE_URL") ?? env("VITE_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  const checked = [...MIGRATION_PROBE_TABLES];
  if (!url || !key) {
    return { state: "unknown", missing: [], checkedAt: new Date().toISOString() };
  }
  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const present: string[] = [];
  for (const table of checked) {
    const { error } = await sb.from(table).select("*", { head: true, count: "exact" }).limit(0);
    if (!error) present.push(table);
    else if (/does not exist|Could not find the table/i.test(error.message)) {
      /* missing */
    } else {
      // Permission / other errors: treat as present (table exists).
      present.push(table);
    }
  }
  // preferred_language column (Phase 12)
  const { error: colErr } = await sb.from("profiles").select("preferred_language").limit(0);
  const colName = "profiles.preferred_language";
  const checkedWithCol = [...checked, colName];
  if (!colErr) present.push(colName);
  else if (!/does not exist|column/i.test(colErr.message)) present.push(colName);
  return summarizeMigrationProbe(present, checkedWithCol);
}

function serverSecretsReady(): Record<
  Exclude<BackendFeature, "supabase" | "maps_js" | "ai_remote">,
  boolean
> {
  const resend = !!env("RESEND_API_KEY");
  const twilio = !!(env("TWILIO_ACCOUNT_SID") && env("TWILIO_AUTH_TOKEN") && env("TWILIO_FROM"));
  const fcm = !!(env("FCM_SERVER_KEY") || env("FIREBASE_SERVICE_ACCOUNT_JSON"));
  const jazz = !!(
    env("JAZZCASH_MERCHANT_ID") &&
    env("JAZZCASH_PASSWORD") &&
    env("JAZZCASH_INTEGRITY_SALT")
  );
  const easy = !!(env("EASYPAISA_STORE_ID") && env("EASYPAISA_PASSWORD"));
  const cron = !!env("REMINDER_CRON_SECRET");
  return {
    otp_email: resend,
    otp_sms: twilio,
    notify_email: resend || !!env("NOTIFY_EMAIL_API_KEY"),
    notify_sms: twilio || !!env("NOTIFY_SMS_API_KEY"),
    notify_fcm: fcm,
    payments_live: jazz || easy,
    reminders: cron && (resend || twilio),
  };
}

/** Server-only health: which backend channels are configured (no secret values). */
export const getBackendHealth = createServerFn({ method: "GET" }).handler(
  async (): Promise<BackendHealth> => {
    const pub = publicFeatureFlags();
    const secrets = serverSecretsReady();
    const features = { ...pub, ...secrets } as Record<BackendFeature, boolean>;
    const notes: string[] = [];
    if (!features.supabase) notes.push("Supabase public URL/key missing — app stays offline/demo.");
    if (!features.payments_live)
      notes.push("JazzCash/EasyPaisa merchant env missing — mock wallet remains.");
    if (!features.notify_email && !features.notify_sms)
      notes.push("No SMS/email notify credentials — in-app only.");
    if (!features.notify_fcm) notes.push("FCM not configured — push skipped.");
    if (!features.reminders)
      notes.push("Reminder cron secret or messaging env missing — scheduler inert.");
    if (!features.ai_remote) notes.push("VITE_AI_ESTIMATE_URL unset — local estimator only.");
    if (!features.maps_js)
      notes.push("VITE_GOOGLE_MAPS_API_KEY unset — Layer-1 uses Leaflet OSM fallback.");
    const migrations = await probeMigrations();
    if (migrations.state === "partial") {
      notes.push(`Migrations partial — missing: ${migrations.missing.join(", ")}`);
    } else if (migrations.state === "unknown") {
      notes.push("Migration state unknown — set SUPABASE_SERVICE_ROLE_KEY to probe.");
    }
    return { features, mode: summarizeMode(features), notes, migrations };
  },
);
