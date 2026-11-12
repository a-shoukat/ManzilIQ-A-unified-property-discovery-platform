import { describe, expect, it } from "vitest";
import { canAccessPage } from "@/lib/manzil/access";
import { filterAuditLogs, metaDiff, paginate } from "@/lib/manzil/audit-ui";
import { computeVerificationHash, verifyReceiptHash } from "@/lib/manzil/payment-history";
import { rejectSchema } from "@/lib/manzil/moderation-ui";
import { DEFAULT_SITE_CONTENT, contentMap } from "@/lib/manzil/cms";
import { prefsSchema, DEFAULT_PREFS } from "@/lib/manzil/notification-prefs";
import { integrationRows } from "@/lib/manzil/system-status";
import type { BackendHealth } from "@/lib/manzil/features";
import { INQUIRY_COPY } from "@/lib/manzil/phase10-copy/inquiries";
import { NOTIF_PREFS_COPY } from "@/lib/manzil/phase10-copy/notifications";
import { MODERATION_COPY } from "@/lib/manzil/phase10-copy/moderation";
import { CMS_COPY } from "@/lib/manzil/phase10-copy/cms";
import { AUDIT_COPY } from "@/lib/manzil/phase10-copy/audit";
import { PAYMENTS_COPY } from "@/lib/manzil/phase10-copy/payments";
import { STATUS_COPY } from "@/lib/manzil/phase10-copy/status";

describe("phase 10 access", () => {
  it("guards admin moderation/cms/audit/status to super_admin", () => {
    for (const p of ["admin-moderation", "admin-cms", "admin-audit", "admin-status"]) {
      expect(canAccessPage(p, "super_admin")).toBe(true);
      expect(canAccessPage(p, "buyer")).toBe(false);
      expect(canAccessPage(p, "dealer")).toBe(false);
    }
  });
  it("allows inquiry routes by role", () => {
    expect(canAccessPage("my-inquiries", "buyer")).toBe(true);
    expect(canAccessPage("my-inquiries", "dealer")).toBe(false);
    expect(canAccessPage("inquiries", "dealer")).toBe(true);
    expect(canAccessPage("inquiries", "society_admin")).toBe(true);
    expect(canAccessPage("inquiries", "buyer")).toBe(false);
  });
  it("allows settings and payment-history for intended roles", () => {
    expect(canAccessPage("settings", "buyer")).toBe(true);
    expect(canAccessPage("payment-history", "society_admin")).toBe(true);
    expect(canAccessPage("payment-history", "dealer")).toBe(false);
  });
});

describe("audit UI helpers", () => {
  const rows = [
    {
      id: "1",
      actor_id: "aaa",
      action: "listing.moderate",
      entity_type: "properties",
      entity_id: "p1",
      meta: { old: { status: "pending" }, new: { status: "approved" } },
      created_at: "2026-01-10T12:00:00Z",
    },
    {
      id: "2",
      actor_id: "bbb",
      action: "profile.approve",
      entity_type: "profiles",
      entity_id: "u1",
      meta: { status: "approved" },
      created_at: "2026-02-01T12:00:00Z",
    },
  ];
  it("filters by action and table", () => {
    expect(filterAuditLogs(rows, { action: "listing" })).toHaveLength(1);
    expect(filterAuditLogs(rows, { table: "profiles" })).toHaveLength(1);
  });
  it("paginates", () => {
    expect(paginate(rows, 1, 1).slice).toHaveLength(1);
    expect(paginate(rows, 1, 1).pages).toBe(2);
  });
  it("expands old vs new meta", () => {
    const d = metaDiff(rows[0]!.meta);
    expect(d.oldVal).toContain("pending");
    expect(d.newVal).toContain("approved");
  });
});

describe("payment receipt verify", () => {
  it("round-trips verification hash", () => {
    const p = { id: "pay-1", amount: 1000, gateway_txn_id: "TXN", receipt_no: "RCP" };
    const h = computeVerificationHash(p);
    expect(verifyReceiptHash({ ...p, status: "confirmed", late_fee: 0 } as never, h)).toBe(true);
    expect(verifyReceiptHash({ ...p, status: "confirmed", late_fee: 0 } as never, "wrong")).toBe(false);
  });
});

describe("moderation / cms / prefs schemas", () => {
  it("requires reject reason", () => {
    expect(rejectSchema.safeParse({ reason: "no" }).success).toBe(false);
    expect(rejectSchema.safeParse({ reason: "Incomplete docs" }).success).toBe(true);
  });
  it("merges site content defaults", () => {
    expect(contentMap([{ key: "hero_title", value: "Custom", updated_at: "" }])["hero_title"]).toBe("Custom");
    expect(contentMap([])["marketplace_title"]).toBe(DEFAULT_SITE_CONTENT["marketplace_title"]);
  });
  it("validates notification prefs", () => {
    expect(prefsSchema.safeParse(DEFAULT_PREFS).success).toBe(true);
  });
});

describe("phase 10 copy isolation", () => {
  it("exposes isolatable strings per screen via i18n keys", async () => {
    const { initI18n } = await import("@/lib/i18n");
    initI18n("en");
    expect(INQUIRY_COPY.myTitle.length).toBeGreaterThan(0);
    expect(NOTIF_PREFS_COPY.title.length).toBeGreaterThan(0);
    expect(MODERATION_COPY.title).toContain("moderation");
    expect(CMS_COPY.title).toContain("CMS");
    expect(AUDIT_COPY.title).toContain("Audit");
    expect(PAYMENTS_COPY.skipNote).toMatch(/PDF/);
    expect(STATUS_COPY.title).toContain("status");
  });
});

describe("system status rows", () => {
  it("lists integrations from health", () => {
    const health: BackendHealth = {
      mode: "demo",
      notes: [],
      features: {
        supabase: true,
        otp_email: false,
        otp_sms: false,
        notify_email: false,
        notify_sms: false,
        notify_fcm: false,
        payments_live: false,
        reminders: false,
        ai_remote: false,
        maps_js: true,
      },
    };
    const rows = integrationRows(health);
    expect(rows.find((r) => r.key === "maps_js")?.on).toBe(true);
    expect(rows.find((r) => r.key === "maps_js")?.modeLabel).toBe("live");
    expect(rows.find((r) => r.key === "payments_live")?.on).toBe(false);
    expect(rows.find((r) => r.key === "payments_live")?.modeLabel).toBe("mock");
    expect(rows.find((r) => r.key === "reminders")?.modeLabel).toBe("off");
  });
});

describe("ops runbook docs exist", () => {
  it("references migration order and reminder cron", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const root = path.resolve(import.meta.dirname, "../..");
    const runbook = await fs.readFile(path.join(root, "docs/OPS_RUNBOOK.md"), "utf8");
    expect(runbook).toMatch(/00_all_migrations\.sql/);
    expect(runbook).toMatch(/REMINDER_CRON_SECRET/);
    expect(runbook).toMatch(/12_preferred_language\.sql/);
    const e2e = await fs.readFile(
      path.join(root, "docs/E2E_APPROVE_BOOK_CHARGE_RECEIPT_TRANSFER.md"),
      "utf8",
    );
    expect(e2e).toMatch(/approve/i);
    expect(e2e).toMatch(/transfer/i);
  });
});
