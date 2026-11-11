/** Inquiry CRM status machine (Phase 4 + Phase 10.5 viewing/negotiating). */

export const INQUIRY_STATUS_VALUES = [
  "new",
  "contacted",
  "viewing",
  "negotiating",
  "qualified",
  "converted",
  "closed",
] as const;

export type InquiryStatusValue = (typeof INQUIRY_STATUS_VALUES)[number];

export const INQUIRY_TRANSITIONS: Record<InquiryStatusValue, InquiryStatusValue[]> = {
  new: ["contacted", "viewing", "qualified", "closed"],
  contacted: ["viewing", "negotiating", "qualified", "converted", "closed"],
  viewing: ["negotiating", "qualified", "converted", "closed"],
  negotiating: ["qualified", "converted", "closed"],
  qualified: ["converted", "closed"],
  converted: ["closed"],
  closed: [],
};

export function canTransitionInquiryStatus(
  from: InquiryStatusValue | string,
  to: InquiryStatusValue | string,
): boolean {
  const allowed = INQUIRY_TRANSITIONS[from as InquiryStatusValue] ?? [];
  return allowed.includes(to as InquiryStatusValue);
}
