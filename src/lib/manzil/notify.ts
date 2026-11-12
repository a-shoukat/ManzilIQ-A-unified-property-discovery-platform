import { getSupabase } from "./supabase";
import type { MessageTemplate, Notification } from "@/lib/manzil/types";
import { fetchPushTokens } from "./push-tokens";
import { deliveryStatusFromResult } from "./notify-status";

/** Write an in-app notification. External channels (SMS/Email/FCM)
 *  plug in via server fn when API keys are configured; otherwise in-app only. */
export async function notify(
  userIds: string | string[],
  title: string,
  body: string,
  type: string,
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const ids = Array.isArray(userIds) ? userIds : [userIds];
  const uniq = [...new Set(ids.filter(Boolean))];
  if (uniq.length === 0) return;
  const { data, error } = await supabase
    .from("notifications")
    .insert(uniq.map((user_id) => ({ user_id, title, body, type })))
    .select("id, user_id");
  if (error) {
    console.error("notify failed:", error.message);
    return;
  }

  // Best-effort external dispatch (never blocks UX on missing credentials).
  void fanOutExternal(uniq, title, body, (data as { id: string; user_id: string }[]) ?? []);
}

async function fanOutExternal(
  userIds: string[],
  title: string,
  body: string,
  rows: { id: string; user_id: string }[],
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase || typeof window === "undefined") return;
  try {
    const { dispatchNotificationChannels } = await import("./notify-channels.functions");
    for (const uid of userIds) {
      const [{ data: profile }, { data: customer }, tokens] = await Promise.all([
        supabase.from("profiles").select("email").eq("id", uid).maybeSingle(),
        supabase
          .from("customer_details")
          .select("contact_phone")
          .eq("profile_id", uid)
          .maybeSingle(),
        fetchPushTokens(uid),
      ]);
      const email = (profile as { email?: string } | null)?.email;
      const phone = (customer as { contact_phone?: string } | null)?.contact_phone;
      const payload: {
        title: string;
        body: string;
        email?: string;
        phone?: string;
        pushTokens?: string[];
      } = { title, body };
      if (email) payload.email = email;
      if (phone) payload.phone = phone;
      if (tokens.length) payload.pushTokens = tokens;
      const { results } = await dispatchNotificationChannels({ data: payload });
      const notifId = rows.find((r) => r.user_id === uid)?.id ?? null;
      for (const r of results) {
        await supabase.from("notification_deliveries").insert({
          notification_id: notifId,
          user_id: uid,
          channel: r.channel,
          status: deliveryStatusFromResult(r.ok, r.detail),
          detail: r.detail,
        });
      }
    }
  } catch (e) {
    console.error("external notify skipped:", e instanceof Error ? e.message : e);
  }
}

export async function fetchInbox(userId: string): Promise<Notification[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  return (data as Notification[]) ?? [];
}

export async function unreadCount(userId: string): Promise<number> {
  const supabase = getSupabase();
  if (!supabase) return 0;
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("read", false);
  return count ?? 0;
}

export async function markRead(id: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.from("notifications").update({ read: true }).eq("id", id);
}

export async function markAllRead(userId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false);
}

// ---- broadcast recipient lists ----

export async function societyCustomerIds(societyId: string): Promise<string[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from("bookings")
    .select("customer_id")
    .eq("society_id", societyId);
  return [
    ...new Set(
      ((data as { customer_id: string }[]) ?? []).map((r) => r.customer_id).filter(Boolean),
    ),
  ];
}

export async function societyDealerIds(societyId: string): Promise<string[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from("dealer_requests")
    .select("dealer_id")
    .eq("society_id", societyId)
    .eq("status", "approved");
  return [...new Set(((data as { dealer_id: string }[]) ?? []).map((r) => r.dealer_id))];
}

export async function allSocietyIds(): Promise<string[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "society_admin")
    .eq("verification_status", "approved");
  return ((data as { id: string }[]) ?? []).map((r) => r.id);
}

export async function allUserIds(): Promise<string[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data } = await supabase.from("profiles").select("id");
  return ((data as { id: string }[]) ?? []).map((r) => r.id);
}

// ---- templates ----

export async function fetchTemplates(ownerId: string | null): Promise<MessageTemplate[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from("message_templates")
    .select("*")
    .or(`owner_id.is.null${ownerId ? `,owner_id.eq.${ownerId}` : ""}`)
    .order("created_at", { ascending: false });
  return (data as MessageTemplate[]) ?? [];
}

export async function saveTemplate(ownerId: string, title: string, body: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Database not connected");
  const { error } = await supabase
    .from("message_templates")
    .insert({ owner_id: ownerId, title, body });
  if (error) throw error;
}

export async function deleteTemplate(id: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.from("message_templates").delete().eq("id", id);
}
