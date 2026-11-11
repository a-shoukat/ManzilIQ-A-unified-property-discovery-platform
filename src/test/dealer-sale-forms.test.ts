import { describe, expect, it } from "vitest";
import {
  allocateSerialsConcurrent,
  computeTotals,
  formatRupeeUr,
  makeShareToken,
  maskCnic,
  maskPhone,
  normalizePkPhone,
  totalsWereEdited,
} from "@/lib/manzil/dealer-sale-form-math";
import {
  saleFormSchema,
  settingsSchema,
  toPublicSaleFormView,
  whatsappShareUrl,
  type DealerFormSettings,
  type DealerSaleForm,
} from "@/lib/manzil/dealer-sale-forms";
import { canAccessPage } from "@/lib/manzil/access";

describe("dealer sale form totals", () => {
  it("total_received = token + previous; balance = price - received", () => {
    expect(computeTotals({ token_received: 500_000, previous_amount: 200_000, total_price: 5_000_000 })).toEqual({
      total_received: 700_000,
      balance_amount: 4_300_000,
    });
  });

  it("flags manual override when stored differs", () => {
    expect(
      totalsWereEdited({
        token_received: 100,
        previous_amount: 0,
        total_price: 1000,
        total_received: 100,
        balance_amount: 900,
      }),
    ).toBe(false);
    expect(
      totalsWereEdited({
        token_received: 100,
        previous_amount: 0,
        total_price: 1000,
        total_received: 150,
        balance_amount: 850,
      }),
    ).toBe(true);
  });

  it("formats rupees with Urdu suffix and Western digits only", () => {
    const s = formatRupeeUr(1_250_000);
    expect(s).toContain("روپے");
    expect(s).toMatch(/1[,.]?250[,.]?000/);
    expect(s).not.toMatch(/[۰-۹٠-٩]/);
  });
});

describe("dealer sale form PDF HTML", () => {
  it("embeds Nastaliq, print colors, signatures, watermark, and settings header", async () => {
    const { buildDealerSaleFormPdfHtml } = await import("@/lib/manzil/dealer-sale-form-pdf");
    const settings: DealerFormSettings = {
      dealer_id: "d1",
      logo_url: null,
      business_name_ur: "ٹیسٹ اسٹیٹ",
      business_name_en: "Test Estate",
      society_name_ur: "ٹیسٹ سوسائٹی",
      scheme_badge_ur: "سکیم",
      phase_badge_ur: "",
      tagline_ur: "ٹیگ",
      address_ur: "ایڈریس لائن",
      ceo_label_ur: "سی ای او",
      ceo_name_ur: "نام",
      phone: "03001234567",
      header_bg_color: "#1a4d2e",
      header_accent_color: "#c9a227",
      footer_note_ur: "",
      show_manager_signature: true,
      next_serial: 1,
      updated_at: "",
    };
    const form = {
      id: "f1",
      dealer_id: "d1",
      booking_id: null,
      plot_id: null,
      serial_no: 7,
      form_date: "2026-11-12",
      buyer_name: "علی",
      buyer_guardian_name: "—",
      buyer_cnic: "35202-1234567-1",
      buyer_phone: "03001112233",
      buyer_address: "لاہور",
      seller_name: "فروخت",
      seller_guardian_name: "—",
      plot_size_text: "10 مرلہ",
      rate_per_marla: 500000,
      total_price: 5000000,
      file_fee_commission: 0,
      token_received: 500000,
      previous_amount: 0,
      total_received: 500000,
      balance_amount: 4500000,
      amounts_manually_edited: false,
      balance_due_date: null,
      bayana_date: null,
      notes: "",
      status: "cancelled" as const,
      public_share_token: null,
      created_at: "",
      updated_at: "",
    } as DealerSaleForm;
    const html = buildDealerSaleFormPdfHtml(form, settings, "a5");
    expect(html).toContain("data:font/woff2;base64,");
    expect(html).not.toContain("fonts.googleapis.com");
    expect(html).toContain("print-color-adjust: exact");
    expect(html).toContain("@page { size: A5");
    expect(html).toContain("دستخط فروخت کنندہ");
    expect(html).toContain("دستخط مینجر");
    expect(html).toContain("منسوخ");
    expect(html).toContain("ٹیسٹ اسٹیٹ");
    expect(html).toContain("ایڈریس لائن");
    expect(html).toContain("روپے");
    expect(html).not.toMatch(/[۰-۹٠-٩]/);
    // Empty phase badge must not appear as blank chip
    expect(html).not.toMatch(/class="badge"><\/span>\s*$/m);
    expect(html).toContain("سکیم");
  });
});

describe("serial allocator concurrency", () => {
  it("never duplicates under concurrent allocate", async () => {
    const state = { next_serial: 1 };
    const got = await allocateSerialsConcurrent(state, 50);
    expect(new Set(got).size).toBe(50);
    expect(Math.min(...got)).toBe(1);
    expect(Math.max(...got)).toBe(50);
    expect(state.next_serial).toBe(51);
  });
});

describe("share token + phone", () => {
  it("makes unguessable tokens", () => {
    const a = makeShareToken();
    const b = makeShareToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(32);
  });

  it("normalizes PK phones for WhatsApp", () => {
    expect(normalizePkPhone("03001234567")).toBe("+923001234567");
    expect(normalizePkPhone("+92 300 1234567")).toBe("+923001234567");
    expect(whatsappShareUrl("03001234567", "hello")).toContain("wa.me/923001234567");
  });
});

describe("autofill mapping contract", () => {
  it("zod accepts booking autofill-shaped payload", () => {
    const parsed = saleFormSchema.safeParse({
      booking_id: "11111111-1111-1111-1111-111111111111",
      plot_id: null,
      form_date: "2026-11-12",
      buyer_name: "علی",
      buyer_guardian_name: "",
      buyer_cnic: "35202-1234567-1",
      buyer_phone: "03001234567",
      buyer_address: "نارووال",
      seller_name: "",
      seller_guardian_name: "",
      plot_size_text: "10 مرلہ",
      rate_per_marla: 500000,
      total_price: 5000000,
      file_fee_commission: 0,
      token_received: 500000,
      previous_amount: 0,
      notes: "بکنگ BK-1",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects fractional rupees", () => {
    expect(saleFormSchema.safeParse({
      form_date: "2026-11-12",
      buyer_name: "A",
      buyer_guardian_name: "",
      buyer_cnic: "",
      buyer_phone: "",
      buyer_address: "",
      seller_name: "",
      seller_guardian_name: "",
      plot_size_text: "",
      rate_per_marla: 10.5,
      total_price: 100,
      file_fee_commission: 0,
      token_received: 0,
      previous_amount: 0,
      notes: "",
    }).success).toBe(false);
  });
});

describe("settings + share revoke rules", () => {
  it("validates header colors", () => {
    expect(settingsSchema.safeParse({
      ...{
        business_name_ur: "x",
        business_name_en: "",
        society_name_ur: "",
        scheme_badge_ur: "",
        phase_badge_ur: "",
        tagline_ur: "",
        address_ur: "",
        ceo_label_ur: "سی ای او",
        ceo_name_ur: "",
        phone: "",
        header_bg_color: "#1a4d2e",
        header_accent_color: "#c9a227",
        footer_note_ur: "",
        show_manager_signature: true,
        next_serial: 1,
      },
    }).success).toBe(true);
    expect(settingsSchema.safeParse({
      business_name_ur: "",
      business_name_en: "",
      society_name_ur: "",
      scheme_badge_ur: "",
      phase_badge_ur: "",
      tagline_ur: "",
      address_ur: "",
      ceo_label_ur: "",
      ceo_name_ur: "",
      phone: "",
      header_bg_color: "green",
      header_accent_color: "#c9a227",
      footer_note_ur: "",
      show_manager_signature: true,
      next_serial: 1,
    }).success).toBe(false);
  });

  it("documents revoke rule: null token or revoked_at blocks public access", () => {
    const canPublicRead = (row: { public_share_token: string | null; revoked_at?: string | null }) =>
      !!row.public_share_token && !row.revoked_at;
    expect(canPublicRead({ public_share_token: "abc", revoked_at: null })).toBe(true);
    expect(canPublicRead({ public_share_token: null })).toBe(false);
    expect(canPublicRead({ public_share_token: "abc", revoked_at: "2026-01-01" })).toBe(false);
  });
});

describe("public masking + roles", () => {
  it("masks CNIC to last 4 and phone partially", () => {
    expect(maskCnic("35202-1234567-1")).toMatch(/5671$/);
    expect(maskCnic("35202-1234567-1")).not.toContain("35202");
    expect(maskPhone("03001234567")).toMatch(/^030/);
    expect(maskPhone("03001234567")).toMatch(/67$/);
    expect(maskPhone("03001234567")).toContain("*");
  });

  it("public view hides dealer_id and masks PII", () => {
    const form = {
      id: "f1",
      dealer_id: "secret-dealer",
      booking_id: null,
      plot_id: null,
      serial_no: 7,
      form_date: "2026-11-12",
      buyer_name: "Ali",
      buyer_guardian_name: "",
      buyer_cnic: "3520212345671",
      buyer_phone: "03001234567",
      buyer_address: "Narowal",
      seller_name: "",
      seller_guardian_name: "",
      plot_size_text: "10",
      rate_per_marla: 1,
      total_price: 1,
      file_fee_commission: 0,
      token_received: 0,
      previous_amount: 0,
      total_received: 0,
      balance_amount: 1,
      amounts_manually_edited: false,
      balance_due_date: null,
      bayana_date: null,
      notes: "",
      status: "issued" as const,
      public_share_token: "tok",
      created_at: "",
      updated_at: "",
    } satisfies DealerSaleForm;
    const header = { dealer_id: "secret-dealer", next_serial: 8 } as DealerFormSettings;
    const view = toPublicSaleFormView(form, {
      ...header,
      logo_url: null,
      business_name_ur: "x",
      business_name_en: "",
      society_name_ur: "",
      scheme_badge_ur: "",
      phase_badge_ur: "",
      tagline_ur: "",
      address_ur: "",
      ceo_label_ur: "",
      ceo_name_ur: "",
      phone: "",
      header_bg_color: "#1a4d2e",
      header_accent_color: "#c9a227",
      footer_note_ur: "",
      show_manager_signature: true,
    });
    expect(view).not.toHaveProperty("dealer_id");
    expect(view.buyer_cnic_masked).toMatch(/5671$/);
    expect(view.buyer_cnic_masked).not.toContain("35202");
    expect(view.buyer_phone_masked).toContain("*");
  });

  it("guards flat dealer form routes", () => {
    expect(canAccessPage("dealer-forms", "dealer")).toBe(true);
    expect(canAccessPage("dealer-form-settings", "dealer")).toBe(true);
    expect(canAccessPage("dealer-forms", "buyer")).toBe(false);
    expect(canAccessPage("dealer-forms", "super_admin")).toBe(true);
  });
});
