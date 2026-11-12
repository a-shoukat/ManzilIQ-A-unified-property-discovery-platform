/** Local public logo paths tried in order before the text wordmark fallback. */
export const BRAND_LOGO_CANDIDATES = [
  "/manziliq-logo.svg",
  "/manziliq-logo.jpg",
  "/manziliq-logo.png",
] as const;

/** Square mark for login/forgot 55×55 slots. */
export const BRAND_MARK_CANDIDATES = [
  "/manziliq-mark.svg",
  "/manziliq-logo.svg",
] as const;

export function brandLogoSrcAt(index: number, compact = false): string | null {
  const list = compact ? BRAND_MARK_CANDIDATES : BRAND_LOGO_CANDIDATES;
  return list[index] ?? null;
}

export function brandLogoCandidateCount(compact = false): number {
  return compact ? BRAND_MARK_CANDIDATES.length : BRAND_LOGO_CANDIDATES.length;
}
