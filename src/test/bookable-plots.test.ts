import { describe, expect, it } from "vitest";
import {
  bookablePlotsFromInventory,
  normalizePlotStatus,
  plotOptionLabel,
} from "@/lib/manzil/bookable-plots";

/** DHA-style block A inventory as shown on the map. */
const dhaBlockA = [
  { id: "1", block: "A", plot_no: "101", status: "available" },
  { id: "2", block: "A", plot_no: "102", status: "Available" }, // mixed-case DB quirk
  { id: "3", block: "A", plot_no: "103", status: "assigned" },
  { id: "4", block: "A", plot_no: "104", status: "available" },
  { id: "5", block: "A", plot_no: "105", status: "reserved" },
  { id: "6", block: "A", plot_no: "106", status: "sold" },
];

describe("bookable plots shared helper (wizard ↔ map)", () => {
  it("lists A-101–A-104 for the booking wizard when map shows them bookable", () => {
    const bookable = bookablePlotsFromInventory(dhaBlockA, []);
    expect(bookable.map((p) => plotOptionLabel(p))).toEqual([
      "A-101",
      "A-102",
      "A-103",
      "A-104",
    ]);
  });

  it("hides a plot held by an active booking even if status is still available", () => {
    const bookable = bookablePlotsFromInventory(dhaBlockA, ["1"]);
    expect(bookable.map((p) => p.plot_no)).toEqual(["102", "103", "104"]);
  });

  it("normalizes status casing", () => {
    expect(normalizePlotStatus(" Available ")).toBe("available");
    expect(normalizePlotStatus("ASSIGNED")).toBe("assigned");
  });
});
