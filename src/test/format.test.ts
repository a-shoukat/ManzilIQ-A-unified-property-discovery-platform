import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatDateTime,
  formatMarla,
  formatPkr,
  formatPlotHeading,
  formatStatusLabel,
  joinDisplay,
  normalizeCity,
  trimTrailingZero,
} from "@/lib/manzil/format";

describe("format helpers", () => {
  it("formats PKR without trailing .0", () => {
    expect(formatPkr(500_000)).toBe("PKR 5 Lakh");
    expect(formatPkr(550_000)).toBe("PKR 5.5 Lakh");
    expect(formatPkr(10_000_000)).toBe("PKR 1 Cr");
    expect(formatPkr(12_500_000)).toBe("PKR 1.25 Cr");
    expect(trimTrailingZero(5.0, 1)).toBe("5");
  });

  it("formats dates without seconds", () => {
    const iso = "2026-03-05T14:30:45.000Z";
    expect(formatDate(iso)).toMatch(/05 Mar 2026/);
    const dt = formatDateTime(iso);
    expect(dt).toMatch(/05 Mar 2026,/);
    expect(dt).toMatch(/\d{1,2}:\d{2} (AM|PM)$/);
    expect(dt).not.toMatch(/\d{1,2}:\d{2}:\d{2}/); // no seconds
    expect(formatDate(null)).toBe("N/A");
  });

  it("maps status labels and normalizes city", () => {
    expect(formatStatusLabel("in_review")).toBe("In review");
    expect(formatStatusLabel("token_paid")).toBe("Token paid");
    expect(normalizeCity("  lahore  ")).toBe("Lahore");
    expect(normalizeCity("ISLAMABAD")).toBe("Islamabad");
  });

  it("avoids duplicate plot prefixes and missing spaces", () => {
    expect(formatPlotHeading({ block: "A", plot_no: "A-101" })).toBe("Plot A-101");
    expect(formatPlotHeading({ block: "A", plot_no: "101" })).toBe("Plot A-101");
    expect(formatMarla(5)).toBe("5 Marla");
    expect(joinDisplay("Buyer", "Dashboard")).toBe("Buyer · Dashboard");
  });
});
