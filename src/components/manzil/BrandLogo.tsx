import { useState } from "react";
import { brandLogoSrcAt, BRAND_LOGO_CANDIDATES } from "@/lib/manzil/brand-logo";

type Props = {
  className?: string;
  /** When true, show compact icon-sized branding (login). */
  compact?: boolean;
};

/**
 * Brand mark with local public assets + text wordmark fallback.
 * Avoids Lovable `/__l5e/...` asset URLs that 404 outside that host.
 */
export function BrandLogo({ className, compact }: Props) {
  const [idx, setIdx] = useState(0);
  const src = brandLogoSrcAt(idx);
  const showWordmark = !src || idx >= BRAND_LOGO_CANDIDATES.length;

  if (showWordmark) {
    return (
      <span className={`brand-wordmark${compact ? " compact" : ""}${className ? ` ${className}` : ""}`} aria-label="ManzilIQ">
        <span className="brand-mark" aria-hidden>
          M
        </span>
        <span className="brand-text">ManzilIQ</span>
      </span>
    );
  }

  return (
    <img
      src={src}
      alt="ManzilIQ"
      className={className ?? "brand-logo"}
      onError={() => setIdx((i) => i + 1)}
    />
  );
}
