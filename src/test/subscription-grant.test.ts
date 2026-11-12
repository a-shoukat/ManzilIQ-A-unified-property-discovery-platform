import { describe, expect, it } from "vitest";
import {
  resolveGrantSocietyId,
  SOCIETY_PROFILE_REQUIRED,
  societyAdminsWithProfile,
} from "@/lib/manzil/subscription-grant";

describe("subscription grant society_id", () => {
  it("requires society profile for society_admin grants", () => {
    expect(() =>
      resolveGrantSocietyId({
        role: "society_admin",
        userId: "soc-1",
        hasSocietyProfile: false,
      }),
    ).toThrow(SOCIETY_PROFILE_REQUIRED);
  });

  it("uses user id as society_id when profile exists", () => {
    expect(
      resolveGrantSocietyId({
        role: "society_admin",
        userId: "soc-1",
        hasSocietyProfile: true,
      }),
    ).toBe("soc-1");
  });

  it("prefers explicit society_id when profile exists", () => {
    expect(
      resolveGrantSocietyId({
        role: "society_admin",
        userId: "soc-1",
        explicitSocietyId: "soc-9",
        hasSocietyProfile: true,
      }),
    ).toBe("soc-9");
  });

  it("leaves society_id null for buyer/dealer", () => {
    expect(
      resolveGrantSocietyId({
        role: "buyer",
        userId: "u-1",
        hasSocietyProfile: false,
      }),
    ).toBeNull();
    expect(
      resolveGrantSocietyId({
        role: "dealer",
        userId: "d-1",
        explicitSocietyId: null,
        hasSocietyProfile: false,
      }),
    ).toBeNull();
  });

  it("filters grant UI to society admins with submitted profiles", () => {
    const users = [
      { id: "b1", role: "buyer" },
      { id: "s1", role: "society_admin" },
      { id: "s2", role: "society_admin" },
    ];
    expect(societyAdminsWithProfile(users, ["s2"]).map((u) => u.id)).toEqual(["b1", "s2"]);
  });
});
