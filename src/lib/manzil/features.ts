/**
 * Feature flags for real backend paths. Missing env → mock/demo remains.
 * Client-safe flags only expose public/Vite keys; secret readiness comes from getBackendHealth().
 */

export type BackendFeature =
  | "supabase"
  | "otp_email"
  | "otp_sms"
  | "notify_email"
  | "notify_sms"
  | "notify_fcm"
  | "payments_live"
  | "reminders"
  | "ai_remote"
  | "maps_js";

export interface BackendHealth {
  features: Record<BackendFeature, boolean>;
  mode: "demo" | "partial" | "live";
  notes: string[];
}

/** Public (Vite) configuration — safe in the browser. */
export function publicFeatureFlags(): Pick<
  Record<BackendFeature, boolean>,
  "supabase" | "maps_js" | "ai_remote"
> {
  const supabaseUrl = (import.meta.env["VITE_SUPABASE_URL"] as string | undefined) || "";
  const supabaseKey =
    (import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined) ||
    (import.meta.env["VITE_SUPABASE_ANON_KEY"] as string | undefined) ||
    "";
  const maps = (import.meta.env["VITE_GOOGLE_MAPS_API_KEY"] as string | undefined) || "";
  const aiUrl = (import.meta.env["VITE_AI_ESTIMATE_URL"] as string | undefined) || "";
  return {
    supabase:
      !!supabaseUrl &&
      !!supabaseKey &&
      !supabaseUrl.includes("your-project-id") &&
      !supabaseKey.includes("your-anon-key"),
    maps_js: !!maps.trim(),
    ai_remote: !!aiUrl.trim(),
  };
}

export function summarizeMode(features: Record<BackendFeature, boolean>): BackendHealth["mode"] {
  const liveKeys: BackendFeature[] = [
    "otp_email",
    "otp_sms",
    "notify_email",
    "notify_sms",
    "notify_fcm",
    "payments_live",
    "reminders",
    "ai_remote",
    "maps_js",
  ];
  const on = liveKeys.filter((k) => features[k]).length;
  if (on === 0) return "demo";
  if (on >= 5) return "live";
  return "partial";
}
