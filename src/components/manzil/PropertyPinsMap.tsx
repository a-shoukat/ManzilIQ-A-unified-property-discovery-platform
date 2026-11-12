import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { buildMapPins, fetchPropertiesWithGeo } from "@/lib/manzil/maps-geo";
import {
  defaultMapCenter,
  layer1MapProvider,
  type MapPin,
} from "@/lib/manzil/map-pins-ui";
import { formatPrice } from "@/lib/manzil/properties";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

type Props = {
  onOpenProperty?: (id: string) => void;
  height?: number;
  className?: string;
};

type ClusterProps = {
  pins: MapPin[];
  height: number;
  onOpenProperty?: (id: string) => void;
};

/**
 * Layer-1 property pins with clustering.
 * Google Maps JS when VITE_GOOGLE_MAPS_API_KEY is set; otherwise Leaflet + OSM.
 */
export function PropertyPinsMap({ onOpenProperty, height = 420, className }: Props) {
  const { t } = useTranslation("marketplace");
  const [pins, setPins] = useState<MapPin[]>([]);
  const [loading, setLoading] = useState(true);
  const provider = layer1MapProvider();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchPropertiesWithGeo()
      .then((rows) => {
        if (!cancelled) setPins(buildMapPins(rows));
      })
      .catch(() => {
        if (!cancelled) setPins([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const clusterProps: ClusterProps = {
    pins,
    height,
    ...(onOpenProperty ? { onOpenProperty } : {}),
  };

  return (
    <div className={className ?? "card card-full pins-map-card"}>
      <div className="topbar" style={{ marginBottom: 8 }}>
        <div>
          <h3 style={{ margin: 0 }}>{t("layer1Title")}</h3>
          <p className="muted small" style={{ margin: 0 }}>
            {provider === "google" ? t("layer1Google") : t("layer1Leaflet")}
            {pins.length > 0 ? ` · ${t("layer1PinCount", { count: pins.length })}` : ""}
          </p>
        </div>
      </div>
      {loading ? (
        <p className="muted">{t("layer1Loading")}</p>
      ) : pins.length === 0 ? (
        <p className="muted">{t("layer1Empty")}</p>
      ) : provider === "google" ? (
        <GoogleClusterMap {...clusterProps} />
      ) : (
        <LeafletClusterMap {...clusterProps} />
      )}
    </div>
  );
}

function LeafletClusterMap({ pins, height, onOpenProperty }: ClusterProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || pins.length === 0) return;
    let map: import("leaflet").Map | null = null;
    let cancelled = false;

    void (async () => {
      const L = await import("leaflet");
      await import("leaflet.markercluster");
      // Fix default marker icons under Vite
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (cancelled || !ref.current) return;
      const center = defaultMapCenter(pins);
      map = L.map(ref.current).setView([center.lat, center.lng], pins.length === 1 ? 14 : 11);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
        maxZoom: 19,
      }).addTo(map);

      // leaflet.markercluster extends L
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cluster = (L as any).markerClusterGroup();
      for (const p of pins) {
        const m = L.marker([p.position.lat, p.position.lng]);
        m.bindPopup(
          `<strong>${escapeHtml(p.title)}</strong><br/>${escapeHtml(formatPrice(p.price))}`,
        );
        if (onOpenProperty) {
          m.on("click", () => onOpenProperty(p.id));
        }
        cluster.addLayer(m);
      }
      map.addLayer(cluster);
      if (pins.length > 1) {
        try {
          map.fitBounds(cluster.getBounds().pad(0.15));
        } catch {
          /* ignore empty bounds */
        }
      }
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [pins, onOpenProperty]);

  return <div ref={ref} style={{ height, width: "100%", borderRadius: 12 }} />;
}

function GoogleClusterMap({ pins, height, onOpenProperty }: ClusterProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!ref.current || pins.length === 0) return;
    let cancelled = false;

    void (async () => {
      try {
        const { googleMapsApiKey } = await import("@/lib/manzil/maps-geo");
        const key = googleMapsApiKey();
        if (!key) {
          setFailed(true);
          return;
        }
        await loadGoogleMapsScript(key);
        const g = window.google;
        if (cancelled || !ref.current || !g?.maps) {
          setFailed(true);
          return;
        }
        const { MarkerClusterer } = await import("@googlemaps/markerclusterer");
        const center = defaultMapCenter(pins);
        const map = new g.maps.Map(ref.current, {
          center,
          zoom: pins.length === 1 ? 14 : 11,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });
        const markers = pins.map((p) => {
          const m = new g.maps.Marker({
            position: p.position,
            title: p.title,
          });
          const info = new g.maps.InfoWindow({
            content: `<strong>${escapeHtml(p.title)}</strong><br/>${escapeHtml(formatPrice(p.price))}`,
          });
          m.addListener("click", () => {
            info.open({ map, anchor: m });
            onOpenProperty?.(p.id);
          });
          return m;
        });
        new MarkerClusterer({ map, markers });
        if (pins.length > 1) {
          const bounds = new g.maps.LatLngBounds();
          for (const p of pins) bounds.extend(p.position);
          map.fitBounds(bounds);
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pins, onOpenProperty]);

  if (failed) {
    const fallback: ClusterProps = {
      pins,
      height,
      ...(onOpenProperty ? { onOpenProperty } : {}),
    };
    return <LeafletClusterMap {...fallback} />;
  }
  return <div ref={ref} style={{ height, width: "100%", borderRadius: 12 }} />;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type GoogleMapsNamespace = {
  maps: {
    Map: new (
      el: HTMLElement,
      opts: {
        center: { lat: number; lng: number };
        zoom: number;
        mapTypeControl?: boolean;
        streetViewControl?: boolean;
        fullscreenControl?: boolean;
      },
    ) => {
      fitBounds: (b: unknown) => void;
    };
    Marker: new (opts: {
      position: { lat: number; lng: number };
      title: string;
    }) => {
      addListener: (event: string, fn: () => void) => void;
    };
    InfoWindow: new (opts: { content: string }) => {
      open: (opts: { map: unknown; anchor: unknown }) => void;
    };
    LatLngBounds: new () => {
      extend: (p: { lat: number; lng: number }) => void;
    };
  };
};

declare global {
  interface Window {
    // Loaded via Maps JS script tag when VITE_GOOGLE_MAPS_API_KEY is set.
    google?: GoogleMapsNamespace;
  }
}

function loadGoogleMapsScript(key: string): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("ssr"));
  if (window.google?.maps) return Promise.resolve();
  const existing = document.querySelector<HTMLScriptElement>("script[data-manzil-gmaps]");
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("gmaps load failed")));
    });
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}`;
    s.async = true;
    s.defer = true;
    s.dataset["manzilGmaps"] = "1";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("gmaps load failed"));
    document.head.appendChild(s);
  });
}
