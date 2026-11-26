import { describe, expect, it } from "vitest";
import { brandLogoSrcAt, BRAND_LOGO_CANDIDATES } from "@/lib/manzil/brand-logo";

describe("brand logo sources", () => {
  it("serves local public paths first (not Lovable __l5e)", () => {
    expect(BRAND_LOGO_CANDIDATES[0]).toBe("/manziliq-logo.svg");
    for (const src of BRAND_LOGO_CANDIDATES) {
      expect(src.startsWith("/")).toBe(true);
      expect(src.includes("__l5e")).toBe(false);
    }
  });

  it("returns null past the last candidate for wordmark fallback", () => {
    expect(brandLogoSrcAt(0)).toBe("/manziliq-logo.svg");
    expect(brandLogoSrcAt(BRAND_LOGO_CANDIDATES.length)).toBeNull();
  });
});
