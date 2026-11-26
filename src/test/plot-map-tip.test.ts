import { describe, expect, it } from "vitest";
import { plotHoverTipLines, plotIsBookable } from "@/lib/manzil/plot-map-tip";

describe("plot map tip", () => {
  it("builds hover lines with size, status, and price", () => {
    const tip = plotHoverTipLines({
      block: "A",
      plot_no: "101",
      size_marla: 10,
      status: "available",
      base_price: 2_500_000,
    });
    expect(tip.title).toBe("Plot A-101");
    expect(tip.rows.map((r) => r.label)).toEqual(["Size", "Status", "Price"]);
    expect(tip.rows[0]?.value).toMatch(/Marla|Kanal/);
    expect(tip.rows[1]?.value).toBe("available");
    expect(tip.rows[2]?.value).toMatch(/2/);
  });

  it("formats kanal sizes", () => {
    const tip = plotHoverTipLines({
      block: "B",
      plot_no: "5",
      size_marla: 20,
      status: "reserved",
      base_price: 1,
    });
    expect(tip.rows[0]?.value).toBe("1 Kanal");
  });

  it("only available plots are bookable", () => {
    expect(plotIsBookable({ status: "available" })).toBe(true);
    expect(plotIsBookable({ status: "reserved" })).toBe(false);
    expect(plotIsBookable({ status: "sold" })).toBe(false);
  });
});
