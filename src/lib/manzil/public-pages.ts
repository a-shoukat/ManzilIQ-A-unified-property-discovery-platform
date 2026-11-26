/** Pages guests may open without signing in (view-only where applicable). */
export const PUBLIC_PAGES = new Set([
  "marketplace",
  "map-view",
  "master-plan",
  "society-map",
  "price-estimator",
  "compare",
  "market-trends",
  "pricing",
  "login",
  "property",
  "search",
  "f",
]);

/** Auth-required actions that should bounce back after sign-in. */
export const AUTH_RETURN_PAGES = new Set([
  "book-plot",
  "wishlist",
  "my-inquiries",
  "inquiries",
  "add-property",
  "dealer-book",
]);

export function isPublicPage(page: string): boolean {
  return PUBLIC_PAGES.has(page);
}

/** Safe in-app path for post-login redirect (blocks open redirects). */
export function safeReturnPath(next: string | null | undefined): string | null {
  if (!next || typeof next !== "string") return null;
  const path = next.trim();
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("://")) return null;
  if (path.length > 200) return null;
  return path;
}
