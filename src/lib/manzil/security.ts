/** Lightweight security helpers (rate limit + deploy checklist). */

const buckets = new Map<string, { hits: number; windowStart: number }>();

export function checkRateLimit(
  key: string,
  limit = 60,
  windowMs = 60_000,
): { ok: boolean; remaining: number } {
  const now = Date.now();
  const cur = buckets.get(key);
  if (!cur || now - cur.windowStart > windowMs) {
    buckets.set(key, { hits: 1, windowStart: now });
    return { ok: true, remaining: limit - 1 };
  }
  cur.hits += 1;
  if (cur.hits > limit) return { ok: false, remaining: 0 };
  return { ok: true, remaining: limit - cur.hits };
}

/** OWASP-oriented checklist for deploy docs (no ZAP run in this environment). */
export const SECURITY_CHECKLIST = [
  "RLS enabled on all public tables with user data",
  "No service-role key in client bundles",
  "OTP / payment / notify secrets only on server",
  "CSRF middleware on createServerFn (src/start.ts)",
  "Cron endpoints require REMINDER_CRON_SECRET",
  "Wallet charge never self-confirms payments (society/admin confirms)",
  "protect_profile_fields prevents role self-elevation",
  "Rate-limit sensitive server fns (OTP, charge, reminders)",
] as const;
