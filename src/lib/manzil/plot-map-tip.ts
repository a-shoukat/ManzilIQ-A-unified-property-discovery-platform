import { formatSize } from "./phase3-rules";
import { formatPrice } from "./properties";
import type { Plot } from "./types";

/** True when the buyer-facing Book CTA should appear for this plot. */
export function plotIsBookable(plot: Pick<Plot, "status">): boolean {
  return plot.status === "available";
}

/** Hover / tap tip rows: plot number, size (marla/kanal), status, price. */
export function plotHoverTipLines(plot: Pick<Plot, "block" | "plot_no" | "size_marla" | "status" | "base_price">): {
  title: string;
  rows: { label: string; value: string }[];
} {
  return {
    title: `Plot ${plot.block}-${plot.plot_no}`,
    rows: [
      { label: "Size", value: formatSize(plot.size_marla) },
      { label: "Status", value: plot.status },
      { label: "Price", value: formatPrice(plot.base_price) },
    ],
  };
}
