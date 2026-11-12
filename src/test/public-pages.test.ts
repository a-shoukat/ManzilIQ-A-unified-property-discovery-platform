import { describe, expect, it } from "vitest";
import { canAccessPage } from "@/lib/manzil/access";
import { isPublicPage, safeReturnPath } from "@/lib/manzil/public-pages";

describe("guest public pages", () => {
  it("allows logged-out /master-plan and /society-map", () => {
    expect(isPublicPage("master-plan")).toBe(true);
    expect(isPublicPage("society-map")).toBe(true);
    expect(canAccessPage("master-plan", undefined)).toBe(true);
    expect(canAccessPage("society-map", undefined)).toBe(true);
  });

  it("keeps booking auth-gated for guests", () => {
    expect(canAccessPage("book-plot", undefined)).toBe(false);
    expect(canAccessPage("book-plot", "buyer")).toBe(true);
    expect(canAccessPage("add-property", undefined)).toBe(false);
  });

  it("blocks open redirects on login next=", () => {
    expect(safeReturnPath("/book-plot")).toBe("/book-plot");
    expect(safeReturnPath("/master-plan?x=1")).toBe("/master-plan?x=1");
    expect(safeReturnPath("https://evil.test")).toBeNull();
    expect(safeReturnPath("//evil.test")).toBeNull();
    expect(safeReturnPath(null)).toBeNull();
  });
});
