/** Local public logo paths tried in order before the text wordmark fallback. */
export const BRAND_LOGO_CANDIDATES = [
  "/manziliq-logo.svg",
  "/manziliq-logo.jpg",
  "/manziliq-logo.png",
] as const;

export function brandLogoSrcAt(index: number): string | null {
  return BRAND_LOGO_CANDIDATES[index] ?? null;
}
