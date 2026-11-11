/** Phase 10 Screen 2 — isolatable copy for Phase 12 Urdu. */
export const MODERATION_COPY = {
  title: "Listing moderation",
  subtitle: "Pending listings awaiting approve / reject",
  adminHub: "Admin hub",
  approvalOff:
    "REQUIRE_LISTING_APPROVAL is off (VITE_REQUIRE_LISTING_APPROVAL unset). Queue still lists pending rows when present; live publish gating is inactive until the flag is enabled.",
  loading: "Loading…",
  empty: "No pending listings.",
  photo: "Photo",
  listing: "Listing",
  owner: "Owner",
  price: "Price",
  flags: "Flags",
  none: "None",
  rejectReason: "Reject reason",
  approve: "Approve",
  reject: "Reject",
  open: "Open",
  loadError: "Could not load moderation queue",
  approveError: "Approve failed",
  rejectError: "Reject failed",
} as const;
