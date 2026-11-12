import { getSupabase } from "./supabase";

export type AuditAction =
  | "profile.approve"
  | "profile.reject"
  | "listing.moderate"
  | "listing.feature"
  | "payment.confirm"
  | "booking.status"
  | "dispute.status"
  | "subscription.grant"
  | "inquiry.status"
  | string;

/** Append-only audit row. Extends existing live audit_logs; never recreates the table. */
export async function writeAudit(input: {
  actorId: string | null;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from("audit_logs").insert({
    actor_id: input.actorId,
    action: input.action,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    meta: input.meta ?? {},
  });
  if (error) console.error("audit_logs insert failed:", error.message);
}

export async function fetchAuditLogs(limit = 100): Promise<
  {
    id: string;
    actor_id: string | null;
    action: string;
    entity_type: string | null;
    entity_id: string | null;
    meta: Record<string, unknown>;
    created_at: string;
  }[]
> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as never[]) ?? [];
}

export type ModerationStatus = "pending" | "approved" | "rejected";

/** Backend moderation helpers — no new admin UI in this pass. */
export async function setListingModeration(
  propertyId: string,
  status: ModerationStatus,
  actorId: string,
): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Database not connected");
  const { error } = await sb
    .from("properties")
    .update({
      moderation_status: status,
      moderated_at: new Date().toISOString(),
      moderated_by: actorId,
    })
    .eq("id", propertyId);
  if (error) throw error;
  await writeAudit({
    actorId,
    action: "listing.moderate",
    entityType: "properties",
    entityId: propertyId,
    meta: { status },
  });
}

export async function fetchPendingModeration(limit = 100) {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("properties")
    .select("id, title, city, owner_id, moderation_status, created_at")
    .eq("moderation_status", "pending")
    .order("created_at", { ascending: true })
    .limit(limit);
  return data ?? [];
}
