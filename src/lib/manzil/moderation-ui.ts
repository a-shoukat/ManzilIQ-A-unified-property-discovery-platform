import { z } from "zod";
import { getSupabase } from "./supabase";
import { fetchPendingModeration, setListingModeration, writeAudit } from "./audit";
import { notify } from "./notify";

export const rejectSchema = z.object({
  reason: z.string().trim().min(3, "Please provide a rejection reason (min 3 chars)"),
});

export type ModerationRow = {
  id: string;
  title: string;
  city: string | null;
  owner_id: string;
  moderation_status: string | null;
  created_at: string;
  price?: number | null;
  image_url?: string | null;
  owner_email?: string | null;
  duplicate_hashes?: number;
  fraud_note?: string | null;
};

/** Whether listing approval is required (server/env). Missing → off. */
export function listingApprovalRequired(): boolean {
  const v =
    (typeof import.meta !== "undefined" &&
      (import.meta.env["VITE_REQUIRE_LISTING_APPROVAL"] as string | undefined)) ||
    "";
  return /^(1|true|yes|on)$/i.test(v.trim());
}

export async function fetchModerationQueue(limit = 100): Promise<ModerationRow[]> {
  const pending = await fetchPendingModeration(limit);
  const sb = getSupabase();
  if (!sb || pending.length === 0) return pending as ModerationRow[];

  const ids = pending.map((p) => (p as { id: string }).id);
  const { data: props } = await sb
    .from("properties")
    .select("id, title, city, owner_id, moderation_status, created_at, price, image_url")
    .in("id", ids);

  const ownerIds = [...new Set((props ?? []).map((p) => p.owner_id as string))];
  const { data: profiles } = await sb.from("profiles").select("id, email").in("id", ownerIds);
  const emailBy = new Map((profiles ?? []).map((p) => [p.id as string, p.email as string]));

  let hashCounts = new Map<string, number>();
  try {
    const { data: hashes, error } = await sb
      .from("listing_image_hashes")
      .select("property_id, hash")
      .in("property_id", ids);
    if (!error && hashes) {
      const byHash = new Map<string, string[]>();
      for (const h of hashes) {
        const list = byHash.get(h.hash as string) ?? [];
        list.push(h.property_id as string);
        byHash.set(h.hash as string, list);
      }
      hashCounts = new Map();
      for (const [, propsWithHash] of byHash) {
        if (propsWithHash.length < 2) continue;
        for (const pid of propsWithHash) {
          hashCounts.set(pid, (hashCounts.get(pid) ?? 0) + 1);
        }
      }
    }
  } catch {
    // table may not exist yet
  }

  return (props ?? (pending as ModerationRow[])).map((p) => {
    const row = p as ModerationRow;
    const dup = hashCounts.get(row.id) ?? 0;
    return {
      ...row,
      owner_email: emailBy.get(row.owner_id) ?? null,
      duplicate_hashes: dup,
      fraud_note: dup > 0 ? `Possible duplicate images (${dup} shared hashes)` : null,
    };
  });
}

/** Approve listing using Phase 5 helper + owner notify. */
export async function approveListing(propertyId: string, actorId: string): Promise<void> {
  await setListingModeration(propertyId, "approved", actorId);
  const sb = getSupabase();
  if (!sb) return;
  const { data } = await sb.from("properties").select("owner_id, title").eq("id", propertyId).maybeSingle();
  if (data?.owner_id) {
    await notify(
      data.owner_id as string,
      "Listing approved",
      `"${data.title as string}" is approved and may go live.`,
      "listing_moderation",
    );
  }
}

/** Reject with reason (additive wrapper around setListingModeration). */
export async function rejectListing(
  propertyId: string,
  actorId: string,
  reason: string,
): Promise<void> {
  const parsed = rejectSchema.parse({ reason });
  await setListingModeration(propertyId, "rejected", actorId);
  await writeAudit({
    actorId,
    action: "listing.moderate",
    entityType: "properties",
    entityId: propertyId,
    meta: { status: "rejected", reason: parsed.reason },
  });
  const sb = getSupabase();
  if (!sb) return;
  const { data } = await sb.from("properties").select("owner_id, title").eq("id", propertyId).maybeSingle();
  if (data?.owner_id) {
    await notify(
      data.owner_id as string,
      "Listing rejected",
      `"${data.title as string}" was not approved. Reason: ${parsed.reason}`,
      "listing_moderation",
    );
  }
}
