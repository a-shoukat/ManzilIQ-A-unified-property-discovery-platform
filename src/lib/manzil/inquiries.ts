import { getSupabase } from "./supabase";
import { notify } from "./notify";

import type { InquiryStatusValue } from "./inquiry-status";

export type InquiryStatus = InquiryStatusValue;

export interface Inquiry {
  id: string;
  property_id: string | null;
  owner_id: string;
  inquirer_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  message: string;
  status: InquiryStatus;
  lead_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface InquiryReply {
  id: string;
  inquiry_id: string;
  author_id: string;
  body: string;
  created_at: string;
}

/** Persist inquiry + keep existing in-app notify to owner. */
export async function createInquiry(input: {
  ownerId: string;
  propertyId?: string | null;
  inquirerId?: string | null;
  title: string;
  from: { name: string; phone: string; email: string };
  message: string;
}): Promise<Inquiry | null> {
  const sb = getSupabase();
  if (!sb) {
    await notify(
      input.ownerId,
      `New inquiry: ${input.title}`,
      `${input.from.name} (${input.from.phone || "no phone"}, ${input.from.email}) — ${input.message}`,
      "inquiry",
    );
    return null;
  }
  const { data, error } = await sb
    .from("inquiries")
    .insert({
      owner_id: input.ownerId,
      property_id: input.propertyId ?? null,
      inquirer_id: input.inquirerId ?? null,
      name: input.from.name,
      email: input.from.email || null,
      phone: input.from.phone || null,
      message: input.message,
      status: "new",
    })
    .select("*")
    .maybeSingle();
  if (error) {
    // Table may not exist yet — fall back to notify-only (pre-migration).
    console.error("inquiry insert failed:", error.message);
    await notify(
      input.ownerId,
      `New inquiry: ${input.title}`,
      `${input.from.name} (${input.from.phone || "no phone"}, ${input.from.email}) — ${input.message}`,
      "inquiry",
    );
    return null;
  }
  await notify(
    input.ownerId,
    `New inquiry: ${input.title}`,
    `${input.from.name} (${input.from.phone || "no phone"}, ${input.from.email}) — ${input.message}`,
    "inquiry",
  );
  return data as Inquiry;
}

export async function fetchOwnerInquiries(ownerId: string): Promise<Inquiry[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("inquiries")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false })
    .limit(200);
  return (data as Inquiry[]) ?? [];
}

export async function setInquiryStatus(id: string, status: InquiryStatus): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Database not connected");
  const { error } = await sb
    .from("inquiries")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function replyToInquiry(
  inquiryId: string,
  authorId: string,
  body: string,
): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Database not connected");
  const { error } = await sb.from("inquiry_replies").insert({
    inquiry_id: inquiryId,
    author_id: authorId,
    body,
  });
  if (error) throw error;
  const { data: inq } = await sb
    .from("inquiries")
    .select("inquirer_id, owner_id, status")
    .eq("id", inquiryId)
    .maybeSingle();
  const row = inq as { inquirer_id: string | null; owner_id: string; status: string } | null;
  if (row?.status === "new") {
    await sb
      .from("inquiries")
      .update({ status: "contacted", updated_at: new Date().toISOString() })
      .eq("id", inquiryId);
  }
  const notifyId =
    row?.inquirer_id && row.inquirer_id !== authorId ? row.inquirer_id : row?.owner_id;
  if (notifyId && notifyId !== authorId) {
    await notify(notifyId, "Inquiry reply", body.slice(0, 200), "inquiry_reply");
  }
}

export async function linkInquiryToLead(inquiryId: string, leadId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Database not connected");
  const { error } = await sb
    .from("inquiries")
    .update({ lead_id: leadId, status: "converted", updated_at: new Date().toISOString() })
    .eq("id", inquiryId);
  if (error) throw error;
}

export async function fetchInquiryReplies(inquiryId: string): Promise<InquiryReply[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("inquiry_replies")
    .select("*")
    .eq("inquiry_id", inquiryId)
    .order("created_at", { ascending: true });
  return (data as InquiryReply[]) ?? [];
}
