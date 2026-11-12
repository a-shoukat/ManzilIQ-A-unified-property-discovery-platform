import { z } from "zod";
import { getSupabase } from "./supabase";

export const EVENT_TYPES = [
  "inquiry",
  "inquiry_reply",
  "booking",
  "payment",
  "reminder",
  "verification",
  "listing_moderation",
  "broadcast",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export const prefsSchema = z.object({
  in_app: z.boolean(),
  email: z.boolean(),
  sms: z.boolean(),
  push: z.boolean(),
  events: z.record(z.boolean()),
});

export type NotificationPrefs = z.infer<typeof prefsSchema> & { user_id?: string };

export const DEFAULT_PREFS: NotificationPrefs = {
  in_app: true,
  email: true,
  sms: false,
  push: false,
  events: Object.fromEntries(EVENT_TYPES.map((e) => [e, true])),
};

export async function fetchNotificationPrefs(userId: string): Promise<NotificationPrefs> {
  const sb = getSupabase();
  if (!sb) return { ...DEFAULT_PREFS, events: { ...DEFAULT_PREFS.events } };
  const { data, error } = await sb
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return { ...DEFAULT_PREFS, events: { ...DEFAULT_PREFS.events } };
  const events = {
    ...DEFAULT_PREFS.events,
    ...((data.events as Record<string, boolean>) ?? {}),
  };
  return {
    in_app: !!data.in_app,
    email: !!data.email,
    sms: !!data.sms,
    push: !!data.push,
    events,
  };
}

export async function saveNotificationPrefs(
  userId: string,
  prefs: NotificationPrefs,
): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Database not connected");
  const parsed = prefsSchema.parse(prefs);
  const { error } = await sb.from("notification_preferences").upsert({
    user_id: userId,
    in_app: parsed.in_app,
    email: parsed.email,
    sms: parsed.sms,
    push: parsed.push,
    events: parsed.events,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}
