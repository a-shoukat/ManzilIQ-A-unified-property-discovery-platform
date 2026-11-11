import { z } from "zod";
import { getSupabase } from "./supabase";
import {
  fetchInquiryReplies,
  fetchOwnerInquiries,
  linkInquiryToLead,
  replyToInquiry,
  setInquiryStatus,
  type Inquiry,
  type InquiryReply,
  type InquiryStatus,
} from "./inquiries";
import { createLead } from "./dealer";

/** Phase 4 + Phase 10.5 statuses (see 10_5_inquiry_statuses.sql). */
export const INQUIRY_STATUSES: InquiryStatus[] = [
  "new",
  "contacted",
  "viewing",
  "negotiating",
  "qualified",
  "converted",
  "closed",
];

export const replySchema = z.object({
  body: z.string().trim().min(1, "Reply cannot be empty").max(4000),
});

/** Buyer-facing list of inquiries they submitted. */
export async function fetchMyInquiries(inquirerId: string): Promise<Inquiry[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("inquiries")
    .select("*")
    .eq("inquirer_id", inquirerId)
    .order("created_at", { ascending: false })
    .limit(200);
  return (data as Inquiry[]) ?? [];
}

export async function fetchInquiryThread(inquiryId: string): Promise<{
  inquiry: Inquiry | null;
  replies: InquiryReply[];
}> {
  const sb = getSupabase();
  if (!sb) return { inquiry: null, replies: [] };
  const { data } = await sb.from("inquiries").select("*").eq("id", inquiryId).maybeSingle();
  const replies = await fetchInquiryReplies(inquiryId);
  return { inquiry: (data as Inquiry) ?? null, replies };
}

export { fetchOwnerInquiries, replyToInquiry, setInquiryStatus, fetchInquiryReplies };

/** Create a dealer lead from an inquiry and link it (additive — does not alter createLead). */
export async function convertInquiryToLead(inquiry: Inquiry, dealerId: string): Promise<string> {
  const sb = getSupabase();
  if (!sb) throw new Error("Database not connected");
  await createLead(dealerId, {
    customer_name: inquiry.name,
    phone: inquiry.phone ?? "",
    email: inquiry.email ?? "",
    status: "new",
  });
  const { data: lead } = await sb
    .from("leads")
    .select("id")
    .eq("dealer_id", dealerId)
    .eq("customer_name", inquiry.name)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!lead?.id) throw new Error("Lead created but could not resolve id");
  await linkInquiryToLead(inquiry.id, lead.id as string);
  return lead.id as string;
}

export function unreadInquiryCount(list: Inquiry[]): number {
  return list.filter((i) => i.status === "new").length;
}
