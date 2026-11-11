/** Phase 10 Screen 5 — isolatable copy for Phase 12 Urdu. */
export const NOTIF_PREFS_COPY = {
  title: "Notification preferences",
  subtitle: "Channels and event types",
  profileLink: "Profile & settings",
  inboxLink: "Inbox",
  loading: "Loading…",
  channels: "Channels",
  events: "Events",
  save: "Save preferences",
  saving: "Saving…",
  saved: "Preferences saved",
  loadError: "Could not load preferences",
  saveError:
    "Could not save. Run reference/migrations/10_phase10_ui_support.sql if the table is missing.",
  channelLabels: {
    in_app: "In-app",
    email: "Email",
    sms: "SMS",
    push: "Push",
  } as const,
} as const;
