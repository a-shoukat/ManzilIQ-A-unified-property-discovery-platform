import { googleMapsApiKey } from "./maps-geo";

export type MapPin = {
  id: string;
  title: string;
  position: { lat: number; lng: number };
  price: number;
};

/** Choose Google JS when key present; otherwise Leaflet OSM (no errors). */
export function layer1MapProvider(): "google" | "leaflet" {
  return googleMapsApiKey() ? "google" : "leaflet";
}

export function defaultMapCenter(pins: MapPin[]): { lat: number; lng: number } {
  if (pins.length === 0) return { lat: 32.101, lng: 74.873 }; // Narowal
  const lat = pins.reduce((s, p) => s + p.position.lat, 0) / pins.length;
  const lng = pins.reduce((s, p) => s + p.position.lng, 0) / pins.length;
  return { lat, lng };
}
