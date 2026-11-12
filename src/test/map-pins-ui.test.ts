import { afterEach, describe, expect, it, vi } from "vitest";
import { buildMapPins } from "@/lib/manzil/maps-geo";
import { defaultMapCenter, layer1MapProvider } from "@/lib/manzil/map-pins-ui";

describe("Layer-1 map provider", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses leaflet when Google key missing", () => {
    vi.stubEnv("VITE_GOOGLE_MAPS_API_KEY", "");
    expect(layer1MapProvider()).toBe("leaflet");
  });

  it("uses google when key set", () => {
    vi.stubEnv("VITE_GOOGLE_MAPS_API_KEY", "test-key");
    expect(layer1MapProvider()).toBe("google");
  });
});

describe("map pin helpers", () => {
  it("centers on Narowal when empty", () => {
    expect(defaultMapCenter([])).toEqual({ lat: 32.101, lng: 74.873 });
  });
  it("averages pin positions", () => {
    const pins = buildMapPins([
      { id: "1", title: "A", lat: 32, lng: 74, price: 1 },
      { id: "2", title: "B", lat: 34, lng: 76, price: 2 },
    ]);
    expect(defaultMapCenter(pins)).toEqual({ lat: 33, lng: 75 });
  });
});
