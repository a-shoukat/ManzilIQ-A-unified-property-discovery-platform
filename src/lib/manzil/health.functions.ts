import { createServerFn } from "@tanstack/react-start";
import {
  publicFeatureFlags,
  summarizeMode,
  type BackendFeature,
  type BackendHealth,
} from "./features";

function env(k: string): string | undefined {
  const v = process.env[k];
  return v && v.trim() ? v.trim() : undefined;
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
      notes.push("VITE_GOOGLE_MAPS_API_KEY unset — iframe/embed fallback only.");
    return { features, mode: summarizeMode(features), notes };
  },
);
