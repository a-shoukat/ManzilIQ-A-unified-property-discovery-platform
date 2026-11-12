import { describe, expect, it } from "vitest";
import {
  brandLogoSrcAt,
  brandLogoCandidateCount,
  BRAND_LOGO_CANDIDATES,
  BRAND_MARK_CANDIDATES,
} from "@/lib/manzil/brand-logo";

describe("brand logo sources", () => {
  it("serves local public paths first (not Lovable __l5e)", () => {
    expect(BRAND_LOGO_CANDIDATES[0]).toBe("/manziliq-logo.svg");
    for (const src of [...BRAND_LOGO_CANDIDATES, ...BRAND_MARK_CANDIDATES]) {
      expect(src.startsWith("/")).toBe(true);
      expect(src.includes("__l5e")).toBe(false);
    }
  });

  it("returns null past the last candidate for wordmark fallback", () => {
    expect(brandLogoSrcAt(0)).toBe("/manziliq-logo.svg");
    expect(brandLogoSrcAt(BRAND_LOGO_CANDIDATES.length)).toBeNull();
  });

  it("uses square mark candidates for compact login slots", () => {
    expect(brandLogoSrcAt(0, true)).toBe("/manziliq-mark.svg");
    expect(brandLogoCandidateCount(true)).toBe(BRAND_MARK_CANDIDATES.length);
    expect(brandLogoSrcAt(BRAND_MARK_CANDIDATES.length, true)).toBeNull();
  });
});
