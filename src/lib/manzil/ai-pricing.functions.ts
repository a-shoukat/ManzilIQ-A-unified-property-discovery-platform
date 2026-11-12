import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "./env-server";

export type EstimatePayload = {
  city: string;
  area: string;
  sizeMarla: number;
  category: "residential" | "commercial";
  bedrooms: number | null;
  society: string;
};

function serviceClient() {
  const url = serverEnv("SUPABASE_URL") ?? serverEnv("VITE_SUPABASE_URL");
  const key = serverEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/**
 * Optional remote AI estimate (Flask/XGBoost etc.).
 * When AI_ESTIMATE_URL / VITE_AI_ESTIMATE_URL is unset → caller should use local estimator.
 */
export const remoteEstimate = createServerFn({ method: "POST" })
  .inputValidator((d: EstimatePayload & { userId?: string }) => ({
    city: String(d.city ?? "").slice(0, 80),
    area: String(d.area ?? "").slice(0, 80),
    sizeMarla: Number(d.sizeMarla) || 0,
    category: d.category === "commercial" ? ("commercial" as const) : ("residential" as const),
    bedrooms: d.bedrooms == null ? null : Number(d.bedrooms),
    society: String(d.society ?? "").slice(0, 120),
    userId: d.userId ? String(d.userId) : undefined,
  }))
  .handler(async ({ data }) => {
    const url = serverEnv("AI_ESTIMATE_URL") ?? serverEnv("VITE_AI_ESTIMATE_URL");
    if (!url) {
      return { ok: false as const, reason: "ai_remote_disabled" as const, result: null };
    }
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(serverEnv("AI_ESTIMATE_API_KEY")
            ? { Authorization: `Bearer ${serverEnv("AI_ESTIMATE_API_KEY")}` }
            : {}),
        },
        body: JSON.stringify({
          city: data.city,
          area: data.area,
          size_marla: data.sizeMarla,
          category: data.category,
          bedrooms: data.bedrooms,
          society: data.society,
        }),
      });
      if (!r.ok) return { ok: false as const, reason: `http_${r.status}` as const, result: null };
      const result = await r.json();
      const sb = serviceClient();
      if (sb) {
        await sb.from("price_predictions").insert({
          user_id: data.userId ?? null,
          input: data,
          result,
          method: "remote",
        });
      }
      return { ok: true as const, reason: "ok" as const, result };
    } catch (e) {
      return {
        ok: false as const,
        reason: e instanceof Error ? e.message : "remote_failed",
        result: null,
      };
    }
  });

/** Log a local estimate into price_predictions when service role is available; else no-op. */
export const logPricePrediction = createServerFn({ method: "POST" })
  .inputValidator(
    (d: { userId?: string; input: EstimatePayload; result: unknown; method?: string }) => ({
      userId: d.userId ? String(d.userId) : undefined,
      input: d.input,
      result: d.result,
      method: String(d.method ?? "local").slice(0, 40),
    }),
  )
  .handler(async ({ data }) => {
    const sb = serviceClient();
    if (!sb) return { ok: false as const, reason: "needs_service_role" as const };
    const { error } = await sb.from("price_predictions").insert({
      user_id: data.userId ?? null,
      input: data.input,
      result: data.result,
      method: data.method,
    });
    if (error) return { ok: false as const, reason: error.message };
    return { ok: true as const, reason: "ok" as const };
  });
