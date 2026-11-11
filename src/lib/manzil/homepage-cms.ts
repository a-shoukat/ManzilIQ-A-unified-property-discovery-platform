import { DEFAULT_SITE_CONTENT, type SiteBanner, type SiteContent } from "./cms";

/** Sentinel path: homepage uses the bundled residence.jpg asset. */
export const BUILTIN_RESIDENCE_PATH = "builtin:residence";

/** Fixed id for the seeded default hero banner (idempotent upserts). */
export const DEFAULT_BANNER_ID = "00000000-0000-4000-8000-000000000001";

export type HomepageBannerView = {
  id: string;
  title: string;
  subtitle: string;
  image_path: string;
  href: string | null;
  sort_order: number;
  active: boolean;
};

export type HomepageCmsView = {
  content: Record<string, string>;
  banners: HomepageBannerView[];
};

/** Exact hardcoded homepage strings (must stay in sync with index.tsx defaults). */
export const HARDCODED_HOMEPAGE_CONTENT: Record<string, string> = { ...DEFAULT_SITE_CONTENT };

export function defaultHomepageBanner(): HomepageBannerView {
  return {
    id: DEFAULT_BANNER_ID,
    title: HARDCODED_HOMEPAGE_CONTENT["hero_title"]!,
    subtitle: HARDCODED_HOMEPAGE_CONTENT["hero_subtitle"]!,
    image_path: BUILTIN_RESIDENCE_PATH,
    href: null,
    sort_order: 0,
    active: true,
  };
}

export function defaultHomepageView(): HomepageCmsView {
  return {
    content: { ...HARDCODED_HOMEPAGE_CONTENT },
    banners: [defaultHomepageBanner()],
  };
}

/**
 * Merge DB rows into a homepage view. Empty / missing tables → identical to
 * the pre-CMS hardcoded homepage (fallback).
 */
export function resolveHomepageView(input: {
  contentRows?: SiteContent[] | null;
  banners?: SiteBanner[] | null;
  error?: boolean;
}): HomepageCmsView {
  if (input.error) return defaultHomepageView();

  const content = { ...HARDCODED_HOMEPAGE_CONTENT };
  for (const row of input.contentRows ?? []) {
    if (row?.key && typeof row.value === "string") content[row.key] = row.value;
  }

  const active = (input.banners ?? [])
    .filter((b) => b && b.active !== false)
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((b) => ({
      id: b.id,
      title: b.title || HARDCODED_HOMEPAGE_CONTENT["hero_title"]!,
      subtitle: b.subtitle ?? HARDCODED_HOMEPAGE_CONTENT["hero_subtitle"]!,
      image_path: b.image_path || BUILTIN_RESIDENCE_PATH,
      href: b.href,
      sort_order: b.sort_order ?? 0,
      active: true,
    }));

  return {
    content,
    banners: active.length > 0 ? active : [defaultHomepageBanner()],
  };
}

/** Title lines for hero (hardcoded used `<br/>` between lines). */
export function homepageTitleLines(title: string): string[] {
  return title
    .split(/\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Pure equality helper for tests — empty DB matches hardcoded defaults. */
export function homepageViewMatchesHardcoded(view: HomepageCmsView): boolean {
  const d = defaultHomepageView();
  for (const k of Object.keys(d.content)) {
    if (view.content[k] !== d.content[k]) return false;
  }
  if (view.banners.length !== 1) return false;
  const b = view.banners[0]!;
  const db = d.banners[0]!;
  return (
    b.title === db.title &&
    b.subtitle === db.subtitle &&
    b.image_path === db.image_path &&
    b.active === true
  );
}
