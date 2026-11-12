import { describe, expect, it } from "vitest";
import { MAP_ACCEPT, validateMasterPlanFile } from "@/lib/manzil/master-plan-upload";

describe("master plan upload validation", () => {
  it("accepts PNG JPG WEBP under 10MB and PDF under 25MB", () => {
    expect(validateMasterPlanFile({ type: "image/png", size: 1000 }).ok).toBe(true);
    expect(validateMasterPlanFile({ type: "image/webp", size: 1000 }).ok).toBe(true);
    expect(validateMasterPlanFile({ type: "image/jpeg", size: 1000 }).ok).toBe(true);
    expect(validateMasterPlanFile({ type: "application/pdf", size: 1000 }).ok).toBe(true);
  });

  it("rejects unsupported types and oversize images", () => {
    expect(validateMasterPlanFile({ type: "image/gif", size: 100 }).ok).toBe(false);
    expect(validateMasterPlanFile({ type: "image/png", size: 11 * 1024 * 1024 }).ok).toBe(false);
    expect(MAP_ACCEPT).toContain("image/png");
    expect(MAP_ACCEPT).toContain("image/webp");
  });
});
