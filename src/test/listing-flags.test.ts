import { describe, expect, it } from "vitest";
import { isFlaggedListingImage, isTestListing, societyDisplayName } from "@/lib/manzil/listing-flags";

describe("listing flags", () => {
  it("detects MUSE TEST listings", () => {
    expect(isTestListing({ title: "MUSE TEST plot", description: null, society_name: null })).toBe(true);
    expect(isTestListing({ title: "5 Marla house", description: null, society_name: null })).toBe(false);
  });

  it("flags Al Rahman House swan photo case", () => {
    expect(isFlaggedListingImage({ title: "Al Rahman House", image_url: "https://x/swan.jpg" })).toBe(true);
  });

  it("never shows raw emails as society names", () => {
    expect(societyDisplayName("Dream Gardens")).toBe("Dream Gardens");
    expect(societyDisplayName("admin@example.com", "admin@example.com")).toBe("Unnamed society");
    expect(societyDisplayName(null)).toBe("Unnamed society");
  });
});
