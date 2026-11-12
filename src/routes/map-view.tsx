import { Button } from "@/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { PageFrame, useAppNavigation, pageHead } from "@/components/manzil/PageFrame";
import { useEffect, useRef, useState } from "react";
import { fetchPlots } from "@/lib/manzil/society";
import { fetchApprovedSocieties } from "@/lib/manzil/society";
import { formatPrice } from "@/lib/manzil/properties";
import { formatPlotHeading, formatStatusLabel } from "@/lib/manzil/format";
import { plotOptionLabel } from "@/lib/manzil/bookable-plots";
import { formatSize } from "@/lib/manzil/phase3-rules";
import type { Plot } from "@/lib/manzil/types";
import { mapsEmbedUrl, mapsJsConfigured } from "@/lib/manzil/maps-geo";
import { PropertyPinsMap } from "@/components/manzil/PropertyPinsMap";
import { plotHoverTipLines, plotIsBookable } from "@/lib/manzil/plot-map-tip";

const STATUS_COLOR: Record<Plot["status"], string> = {
  available: "var(--success)",
  assigned: "var(--primary)",
  reserved: "var(--warning)",
  sold: "var(--muted-foreground)",
  blocked: "var(--destructive)",
};

/** WBS: Customer Portal — Interactive Map View (5 features) */
function MapView({ onNavigate }: { onNavigate: (p: string, arg?: string) => void }) {
  const { t } = useTranslation(["marketplace", "common"]);
  const [societies, setSocieties] = useState<{ id: string; name: string }[]>([]);
  const [societyId, setSocietyId] = useState("");
  const [plots, setPlots] = useState<Plot[]>([]);
  const [block, setBlock] = useState("");
  const [minSize, setMinSize] = useState("");
  const [maxSize, setMaxSize] = useState("");
  const [status, setStatus] = useState("");
  const [zoom, setZoom] = useState(1);
  const [selected, setSelected] = useState<Plot | null>(null);
  const [tip, setTip] = useState<{ plot: Plot; x: number; y: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const gridRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchApprovedSocieties().then((list) => {
      const mapped = list.map((s) => ({ id: s.id, name: s.name }));
      setSocieties(mapped);
      if (mapped[0]) setSocietyId(mapped[0].id);
      else setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!societyId) return;
    setLoading(true);
    fetchPlots(societyId).then((p) => {
      setPlots(p);
      setBlock("");
      setSelected(null);
      setTip(null);
      setLoading(false);
    });
  }, [societyId]);

  useEffect(() => () => { if (hideTimer.current) clearTimeout(hideTimer.current); }, []);

  const blocks = [...new Set(plots.map((p) => p.block))].sort();
  const activeBlock = block || blocks[0] || "";

  const shown = plots.filter((p) => {
    if (p.block !== activeBlock) return false;
    if (status && p.status !== status) return false;
    if (minSize && p.size_marla < parseFloat(minSize)) return false;
    if (maxSize && p.size_marla > parseFloat(maxSize)) return false;
    return true;
  });

  const embedCode = `<iframe src="${typeof window !== "undefined" ? window.location.origin : ""}/map-view?society=${societyId}" width="100%" height="600" style="border:0" title="Society plot map"></iframe>`;

  const cancelHide = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };
  const scheduleHide = (plotId: string) => {
    cancelHide();
    hideTimer.current = setTimeout(() => setTip((t) => (t?.plot.id === plotId ? null : t)), 250);
  };
  const showTip = (plot: Plot, clientX: number, clientY: number) => {
    const r = gridRef.current?.getBoundingClientRect();
    if (!r) {
      setTip({ plot, x: 12, y: 12 });
      return;
    }
    setTip({ plot, x: clientX - r.left, y: clientY - r.top });
  };
  const openDetails = (plot: Plot) => {
    setSelected(plot);
    setTip(null);
    setTimeout(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  };

  const tipLines = tip ? plotHoverTipLines(tip.plot) : null;

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <h1>{t("marketplace:mapTitle")}</h1>
          <p className="muted" style={{ margin: 0 }}>
            {t("marketplace:mapSubtitle")}
          </p>
        </div>
        <Button
          variant="legacy"
          className="btn secondary small"
          onClick={() => onNavigate("marketplace")}
        >
          {t("common:marketplace")}
        </Button>
      </div>

      <div className="filters" style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr" }}>
        <select value={societyId} onChange={(e) => setSocietyId(e.target.value)} aria-label={t("marketplace:selectSociety")}>
          {societies.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">{t("marketplace:allStatuses")}</option>
          <option value="available">{t("marketplace:available")}</option>
          <option value="reserved">{t("marketplace:reserved")}</option>
          <option value="sold">{t("marketplace:sold")}</option>
        </select>
        <label className="map-size-field">
          <span className="muted small">Min Marla</span>
          <input
            type="number"
            placeholder={t("marketplace:minSize")}
            value={minSize}
            onChange={(e) => setMinSize(e.target.value)}
            style={{ marginTop: 0 }}
            dir="ltr"
            className="ltr-isolate"
            aria-label="Min Marla"
          />
        </label>
        <label className="map-size-field">
          <span className="muted small">Max Marla</span>
          <input
            type="number"
            placeholder={t("marketplace:maxSizeMarla")}
            value={maxSize}
            onChange={(e) => setMaxSize(e.target.value)}
            style={{ marginTop: 0 }}
            dir="ltr"
            className="ltr-isolate"
            aria-label="Max Marla"
          />
        </label>
      </div>

      <PropertyPinsMap
        onOpenProperty={(id) => onNavigate("property", id)}
        className="card card-full pins-map-card"
      />

      <PunjabMap />

      <h2 style={{ marginTop: 8 }}>{t("marketplace:layer2Title")}</h2>
      <p className="muted small">{t("marketplace:layer2Subtitle")}</p>

      {loading ? (
        <div className="hub-grid" aria-busy="true" aria-label={t("marketplace:loadingPlots")}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="hub-card discover-skeleton">
              <span className="skeleton-line wide" />
              <span className="skeleton-line" />
              <span className="skeleton-line short" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="map-toolbar">
            <div className="block-tabs">
              {blocks.map((b) => (
                <Button
                  variant="legacy"
                  key={b}
                  className={`tab${b === activeBlock ? " active" : ""}`}
                  onClick={() => {
                    setBlock(b);
                    setSelected(null);
                    setTip(null);
                  }}
                >
                  Block {b}
                </Button>
              ))}
            </div>
            <div className="link-row" style={{ margin: 0 }}>
              <Button
                variant="legacy"
                className="btn secondary small"
                onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.2).toFixed(1)))}
              >
                −
              </Button>
              <span className="muted small">{Math.round(zoom * 100)}%</span>
              <Button
                variant="legacy"
                className="btn secondary small"
                onClick={() => setZoom((z) => Math.min(2, +(z + 0.2).toFixed(1)))}
              >
                +
              </Button>
            </div>
          </div>

          <div className="map-legend">
            {Object.entries(STATUS_COLOR).map(([s, c]) => (
              <span key={s} className="legend-item">
                <i style={{ background: c }} />
                {formatStatusLabel(s)}
              </span>
            ))}
          </div>

          {shown.length === 0 ? (
            <p className="muted">{t("marketplace:noPlots")}</p>
          ) : (
            <div className="map-grid-wrap" ref={gridRef} style={{ position: "relative" }}>
              <div className="map-grid" style={{ transform: `scale(${zoom})` }}>
                {shown.map((p) => (
                  <Button
                    variant="legacy"
                    key={p.id}
                    className={`map-cell${selected?.id === p.id ? " selected" : ""}`}
                    style={{ background: STATUS_COLOR[p.status] }}
                    onPointerEnter={(e) => {
                      if (e.pointerType === "mouse") {
                        cancelHide();
                        showTip(p, e.clientX, e.clientY);
                      }
                    }}
                    onPointerLeave={(e) => {
                      if (e.pointerType === "mouse") scheduleHide(p.id);
                    }}
                    onClick={(e) => {
                      cancelHide();
                      showTip(p, e.clientX, e.clientY);
                      setSelected(p);
                    }}
                    aria-label={plotHoverTipLines(p).title}
                  >
                    {p.plot_no}
                  </Button>
                ))}
              </div>
              {tip && tipLines && (
                <div
                  className="mp-tip map-grid-tip"
                  data-tip
                  style={{
                    left: Math.min(Math.max(tip.x + 12, 4), 240),
                    top: Math.max(tip.y + 12, 4),
                  }}
                  onPointerEnter={cancelHide}
                  onPointerLeave={(e) => {
                    if (e.pointerType === "mouse") scheduleHide(tip.plot.id);
                  }}
                >
                  <strong>{tipLines.title}</strong>
                  {tipLines.rows.map((row) => (
                    <div key={row.label} className="mp-tip-row">
                      <span>{row.label === "Size" ? t("marketplace:size") : row.label === "Status" ? t("marketplace:status") : t("marketplace:price")}</span>
                      <span style={{ textTransform: row.label === "Status" ? "capitalize" : undefined }}>{row.value}</span>
                    </div>
                  ))}
                  <Button
                    size="sm"
                    style={{ marginTop: 8, width: "100%" }}
                    onClick={() => openDetails(tip.plot)}
                  >
                    {t("marketplace:viewDetails")}
                  </Button>
                  {plotIsBookable(tip.plot) && (
                    <Button
                      size="sm"
                      variant="secondary"
                      style={{ marginTop: 6, width: "100%" }}
                      onClick={() => onNavigate("book-plot")}
                    >
                      {t("marketplace:bookThisPlot")}
                    </Button>
                  )}
                  <button type="button" className="mp-tip-close" aria-label={t("common:close")} onClick={() => setTip(null)}>
                    ×
                  </button>
                </div>
              )}
            </div>
          )}

          {selected && (
            <div className="card" style={{ marginTop: 16 }} ref={detailRef}>
              <div className="topbar">
                <h3 style={{ margin: 0 }}>
                  {t("marketplace:plotDetails")} · {plotOptionLabel(selected)}
                </h3>
                <Button
                  variant="legacy"
                  className="btn secondary small"
                  onClick={() => setSelected(null)}
                >
                  {t("common:close")}
                </Button>
              </div>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-key">{t("marketplace:size")}</span>
                  <span>{formatSize(selected.size_marla)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-key">{t("marketplace:category")}</span>
                  <span>{selected.category}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-key">{t("marketplace:basePrice")}</span>
                  <span>{formatPrice(selected.base_price)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-key">{t("marketplace:status")}</span>
                  <span style={{ textTransform: "capitalize" }}>{selected.status}</span>
                </div>
              </div>
              <div className="link-row" style={{ marginTop: 12 }}>
                <Button variant="legacy" className="btn secondary small" onClick={() => openDetails(selected)}>
                  {t("marketplace:viewDetails")}
                </Button>
                {plotIsBookable(selected) && (
                  <Button variant="legacy" className="btn small" onClick={() => onNavigate("book-plot")}>
                    {t("marketplace:bookThisPlot")}
                  </Button>
                )}
              </div>
            </div>
          )}

          <div className="card" style={{ marginTop: 24 }}>
            <h3>{t("marketplace:embedMap")}</h3>
            <p className="muted small">{t("marketplace:embedMapHint")}</p>
            <textarea
              readOnly
              rows={3}
              value={embedCode}
              onClick={(e) => (e.target as HTMLTextAreaElement).select()}
            />
          </div>
        </>
      )}
    </div>
  );
}

const PUNJAB_PLACES: { label: string; q: string; z: number }[] = [
  { label: "All Punjab", q: "Punjab, Pakistan", z: 7 },
  { label: "Lahore", q: "Lahore, Pakistan", z: 11 },
  { label: "Rawalpindi", q: "Rawalpindi, Pakistan", z: 11 },
  { label: "Faisalabad", q: "Faisalabad, Pakistan", z: 11 },
  { label: "Multan", q: "Multan, Pakistan", z: 11 },
  { label: "Gujranwala", q: "Gujranwala, Pakistan", z: 11 },
  { label: "Sialkot", q: "Sialkot, Pakistan", z: 12 },
  { label: "Bahawalpur", q: "Bahawalpur, Pakistan", z: 11 },
];

/** Embedded Google map of Punjab, Pakistan with quick city jumps. */
function PunjabMap() {
  const [place, setPlace] = useState(PUNJAB_PLACES[0]!);
  const src = mapsJsConfigured()
    ? mapsEmbedUrl(place.q)
    : `https://maps.google.com/maps?q=${encodeURIComponent(place.q)}&z=${place.z}&output=embed`;
  return (
    <div className="card card-full" style={{ marginBottom: 24 }}>
      <div className="topbar">
        <div>
          <h3 style={{ margin: 0 }}>Punjab, Pakistan</h3>
          <p className="muted small" style={{ margin: 0 }}>
            Explore cities and areas across Punjab
          </p>
        </div>
      </div>
      <div className="block-tabs" style={{ flexWrap: "wrap", marginBottom: 12 }}>
        {PUNJAB_PLACES.map((p) => (
          <Button
            variant="legacy"
            key={p.label}
            className={`tab${p.label === place.label ? " active" : ""}`}
            onClick={() => setPlace(p)}
          >
            {p.label}
          </Button>
        ))}
      </div>
      <iframe
        title={`Map of ${place.label}`}
        src={src}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        style={{ width: "100%", height: "min(70vh, 520px)", border: 0, borderRadius: 12 }}
        allowFullScreen
      />
    </div>
  );
}

export const Route = createFileRoute("/map-view")({
  head: () => pageHead("Map View"),
  component: RoutePage,
});
function RoutePage() {
  const onNavigate = useAppNavigation();
  return (
    <PageFrame publicPage>
      <MapView onNavigate={onNavigate} />
    </PageFrame>
  );
}
