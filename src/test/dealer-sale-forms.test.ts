import { describe, expect, it } from "vitest";
import {
  allocateSerialsConcurrent,
  computeTotals,
  formatRupeeUr,
  makeShareToken,
  normalizePkPhone,
  totalsWereEdited,
} from "@/lib/manzil/dealer-sale-form-math";
import { saleFormSchema, settingsSchema, whatsappShareUrl } from "@/lib/manzil/dealer-sale-forms";

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

  it("formats rupees with Urdu suffix", () => {
    expect(formatRupeeUr(1_250_000)).toContain("روپے");
    expect(formatRupeeUr(1_250_000)).toMatch(/1[,.]?250[,.]?000/);
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

  it("documents revoke rule: null token blocks public access", () => {
    const canPublicRead = (token: string | null) => !!token;
    expect(canPublicRead("abc")).toBe(true);
    expect(canPublicRead(null)).toBe(false);
  });
});
