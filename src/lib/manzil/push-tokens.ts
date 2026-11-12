import { getSupabase } from "./supabase";

/** Register a browser/device push token (uses existing push_tokens table). */
export async function registerPushToken(
  userId: string,
  token: string,
  platform: "web" | "android" | "ios" = "web",
): Promise<void> {
  const sb = getSupabase();
  if (!sb || !token.trim()) return;
  const { error } = await sb
    .from("push_tokens")
    .upsert(
      { user_id: userId, token: token.trim(), platform, updated_at: new Date().toISOString() },
      { onConflict: "user_id,token" },
    );
  if (error) console.error("push token upsert failed:", error.message);
}

export async function fetchPushTokens(userId: string): Promise<string[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb.from("push_tokens").select("token").eq("user_id", userId);
  return ((data as { token: string }[]) ?? []).map((r) => r.token).filter(Boolean);
}
