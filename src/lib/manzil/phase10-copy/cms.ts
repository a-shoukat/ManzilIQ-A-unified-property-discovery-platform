/** Phase 10 Screen 3 — isolatable copy for Phase 12 Urdu. */
export const CMS_COPY = {
  title: "Homepage CMS",
  subtitle: "Banners & site content (admin)",
  preview: "Preview",
  hidePreview: "Hide preview",
  reset: "Reset to default",
  adminHub: "Admin hub",
  homepageNote:
    "Public marketplace homepage is unchanged until homepage wiring is approved (Needs decision). Edits here persist to site_banners / site_content only.",
  loading: "Loading…",
  siteContent: "Site content",
  saveContent: "Save content",
  banners: (n: number) => `Banners (${n})`,
  noBanners: "No banners yet.",
  addBanner: "Add banner",
  toggleActive: "Toggle active",
  delete: "Delete",
  titleField: "Title",
  sortOrder: "Sort order",
  subtitleField: "Subtitle",
  href: "Link href",
  image: "Image",
  active: "Active",
  add: "Add banner",
  saving: "Saving…",
  loadError:
    "Could not load CMS. Run reference/migrations/10_phase10_ui_support.sql if tables are missing.",
} as const;
