import { getSupabase } from "./supabase";

/** Layer-1 geo helpers — store/read coords without changing map-view layout. */

export function mapsJsConfigured(): boolean {
  const k = (import.meta.env["VITE_GOOGLE_MAPS_API_KEY"] as string | undefined) || "";
  return !!k.trim();
}

export function googleMapsApiKey(): string | undefined {
  const k = (import.meta.env["VITE_GOOGLE_MAPS_API_KEY"] as string | undefined) || "";
  return k.trim() || undefined;
}

/** Embed URL for a place query (works without Maps JS SDK). */
export function mapsEmbedUrl(query: string): string {
  const q = encodeURIComponent(query || "Narowal Pakistan");
  const key = googleMapsApiKey();
  if (key) {
    return `https://www.google.com/maps/embed/v1/search?key=${encodeURIComponent(key)}&q=${q}`;
  }
  return `https://maps.google.com/maps?q=${q}&output=embed`;
}

export async function updatePropertyGeo(
  propertyId: string,
  lat: number,
  lng: number,
): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Database not connected");
  const { error } = await sb.from("properties").update({ lat, lng }).eq("id", propertyId);
  if (error) throw error;
}

export async function updateSocietyGeo(
  societyProfileId: string,
  lat: number,
  lng: number,
  geojson?: unknown,
): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Database not connected");
  const patch: Record<string, unknown> = { lat, lng };
  if (geojson !== undefined) patch["geojson"] = geojson;
  const { error } = await sb
    .from("society_details")
    .update(patch)
    .eq("profile_id", societyProfileId);
  if (error) throw error;
}

export async function fetchPropertiesWithGeo(limit = 500): Promise<
  {
    id: string;
    title: string;
    city: string;
    price: number;
    lat: number;
    lng: number;
    status: string;
  }[]
> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("properties")
    .select("id, title, city, price, lat, lng, status")
    .not("lat", "is", null)
    .not("lng", "is", null)
    .limit(limit);
  return (
    (data as {
      id: string;
      title: string;
      city: string;
      price: number;
      lat: number;
      lng: number;
      status: string;
    }[]) ?? []
  ).filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
}

/**
 * Static pin payload for a future Maps JS layer.
 * Needs UI decision before mounting MarkerClusterer / Directions in map-view.
 */
export function buildMapPins(
  rows: { id: string; title: string; lat: number; lng: number; price: number }[],
): { id: string; title: string; position: { lat: number; lng: number }; price: number }[] {
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    position: { lat: r.lat, lng: r.lng },
    price: r.price,
  }));
}
