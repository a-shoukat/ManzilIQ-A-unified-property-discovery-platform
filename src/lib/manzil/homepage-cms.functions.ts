import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "./env-server";
import type { SiteBanner, SiteContent } from "./cms";
import { defaultHomepageView, resolveHomepageView, type HomepageCmsView } from "./homepage-cms";

const TTL_MS = 30_000;

let cache: { at: number; view: HomepageCmsView } | null = null;

function publicClient() {
  const url = serverEnv("SUPABASE_URL") ?? serverEnv("VITE_SUPABASE_URL");
  const key =
    serverEnv("SUPABASE_ANON_KEY") ??
    serverEnv("VITE_SUPABASE_PUBLISHABLE_KEY") ??
    serverEnv("VITE_SUPABASE_ANON_KEY");
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Invalidate after admin CMS writes (best-effort; TTL also covers). */
export function invalidateHomepageCmsCache(): void {
  cache = null;
}

/** Client-callable bust so admin saves refresh the public homepage promptly. */
export const bustHomepageCmsCache = createServerFn({ method: "POST" }).handler(async () => {
  invalidateHomepageCmsCache();
  return { ok: true as const };
});

/**
 * Public homepage CMS read. Short TTL cache. Falls back to hardcoded defaults
 * when DB is empty, errors, or tables are missing.
 */
export const getHomepageCms = createServerFn({ method: "GET" }).handler(
  async (): Promise<HomepageCmsView> => {
    const now = Date.now();
    if (cache && now - cache.at < TTL_MS) return cache.view;

    const sb = publicClient();
    if (!sb) {
      const view = defaultHomepageView();
      cache = { at: now, view };
      return view;
    }

    try {
      const [cRes, bRes] = await Promise.all([
        sb.from("site_content").select("key, value, updated_at"),
        sb
          .from("site_banners")
          .select("*")
          .eq("active", true)
          .order("sort_order", { ascending: true }),
      ]);

      if (cRes.error || bRes.error) {
        const view = resolveHomepageView({ error: true });
        cache = { at: now, view };
        return view;
      }

      const view = resolveHomepageView({
        contentRows: (cRes.data as SiteContent[]) ?? [],
        banners: (bRes.data as SiteBanner[]) ?? [],
      });
      cache = { at: now, view };
      return view;
    } catch {
      const view = defaultHomepageView();
      cache = { at: now, view };
      return view;
    }
  },
);
