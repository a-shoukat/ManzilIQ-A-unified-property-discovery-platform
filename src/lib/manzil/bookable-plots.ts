import { BOOKABLE_PLOT_STATUSES, filterBookablePlots } from "./booking-rules";
import type { Plot } from "./types";

/** Normalize DB / CSV status casing to canonical PlotStatus tokens. */
export function normalizePlotStatus(status: string | null | undefined): string {
  return String(status ?? "")
    .trim()
    .toLowerCase();
}

export type PlotInventoryRow = {
  id: string;
  block: string;
  plot_no: string;
  size_marla: number;
  base_price: number;
  status: string;
};

/**
 * Shared bookable filter for map tips / booking wizard.
 * Keeps available + assigned plots that are not held by an active booking.
 */
export function bookablePlotsFromInventory<T extends { id: string; status?: string; block?: string; plot_no?: string }>(
  plots: T[],
  heldPlotIds: Iterable<string> = [],
): T[] {
  const normalized = plots.map((p) => ({
    ...p,
    status: normalizePlotStatus(p.status),
  }));
  return filterBookablePlots(normalized, heldPlotIds);
}

/** Labels like A-101 for wizard options / tests. */
export function plotOptionLabel(p: { block: string; plot_no: string }): string {
  const no = p.plot_no.trim();
  const block = p.block.trim();
  if (!block) return no;
  if (no.toUpperCase().startsWith(`${block.toUpperCase()}-`)) return no;
  return `${block}-${no}`;
}

export function isBookableStatus(status: string | null | undefined): boolean {
  return (BOOKABLE_PLOT_STATUSES as readonly string[]).includes(normalizePlotStatus(status));
}

/** Select columns shared by map inventory and booking wizard. */
export const BOOKABLE_PLOT_SELECT = "id, block, plot_no, size_marla, base_price, status";

export type BookablePlot = Pick<Plot, "id" | "block" | "plot_no" | "size_marla" | "base_price" | "status">;
