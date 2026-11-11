import { z } from "zod";
import { getSupabase } from "./supabase";
import { uploadDocument, getDocumentUrl } from "./storage";
import {
  BUILTIN_RESIDENCE_PATH,
  DEFAULT_BANNER_ID,
  HARDCODED_HOMEPAGE_CONTENT,
} from "./homepage-cms";

export const bannerSchema = z.object({
  title: z.string().trim().min(1, "Title required").max(120),
  subtitle: z.string().trim().max(240).optional().nullable(),
  href: z.string().trim().max(500).optional().nullable(),
  sort_order: z.coerce.number().int().min(0).max(999).default(0),
  active: z.boolean().default(true),
});

export const contentSchema = z.object({
  key: z.string().trim().min(1).max(80),
  value: z.string().max(8000),
});

export type SiteBanner = {
  id: string;
  title: string;
  subtitle: string | null;
  image_path: string | null;
  href: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type SiteContent = { key: string; value: string; updated_at: string };

export const DEFAULT_SITE_CONTENT: Record<string, string> = {
  hero_eyebrow: "PROPERTY, WITH PERSPECTIVE",
  hero_title: "A new address.\nA new beginning.",
  hero_subtitle: "Your next chapter starts with the right place.",
  marketplace_eyebrow: "A PLACE TO BEGIN",
  marketplace_title: "Discover your next property",
  marketplace_subtitle: "Great spaces. Real possibilities. Find a place that feels right.",
};

export async function fetchBanners(): Promise<SiteBanner[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("site_banners")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("site_banners:", error.message);
    return [];
  }
  return (data as SiteBanner[]) ?? [];
}

export async function saveBanner(
  input: z.infer<typeof bannerSchema> & { id?: string; imageFile?: File | null },
): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Database not connected");
  const parsed = bannerSchema.parse(input);
  let image_path: string | undefined;
  if (input.imageFile) image_path = await uploadDocument(input.imageFile);
  const row = {
    title: parsed.title,
    subtitle: parsed.subtitle || null,
    href: parsed.href || null,
    sort_order: parsed.sort_order,
    active: parsed.active,
    updated_at: new Date().toISOString(),
    ...(image_path ? { image_path } : {}),
  };
  if (input.id) {
    const { error } = await sb.from("site_banners").update(row).eq("id", input.id);
    if (error) throw error;
  } else {
    const { error } = await sb.from("site_banners").insert(row);
    if (error) throw error;
  }
}

export async function deleteBanner(id: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Database not connected");
  const { error } = await sb.from("site_banners").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchSiteContent(): Promise<SiteContent[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.from("site_content").select("*");
  if (error) {
    console.error("site_content:", error.message);
    return [];
  }
  return (data as SiteContent[]) ?? [];
}

export async function upsertSiteContent(key: string, value: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Database not connected");
  const parsed = contentSchema.parse({ key, value });
  const { error } = await sb.from("site_content").upsert({
    key: parsed.key,
    value: parsed.value,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

/** Restore seeded homepage defaults (content keys + default hero banner). */
export async function resetSiteContentToDefault(): Promise<void> {
  for (const [key, value] of Object.entries(DEFAULT_SITE_CONTENT)) {
    await upsertSiteContent(key, value);
  }
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from("site_banners").upsert({
    id: DEFAULT_BANNER_ID,
    title: HARDCODED_HOMEPAGE_CONTENT["hero_title"],
    subtitle: HARDCODED_HOMEPAGE_CONTENT["hero_subtitle"],
    image_path: BUILTIN_RESIDENCE_PATH,
    href: null,
    sort_order: 0,
    active: true,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function bannerImageUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return getDocumentUrl(path);
}

export function contentMap(rows: SiteContent[]): Record<string, string> {
  const m = { ...DEFAULT_SITE_CONTENT };
  for (const r of rows) m[r.key] = r.value;
  return m;
}
