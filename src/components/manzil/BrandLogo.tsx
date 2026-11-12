import { useState } from "react";
import { brandLogoCandidateCount, brandLogoSrcAt } from "@/lib/manzil/brand-logo";

type Props = {
  className?: string;
  /** When true, show compact icon-sized branding (login / forgot). */
  compact?: boolean;
};

/**
 * Brand mark with local public assets + text wordmark fallback.
 * Avoids Lovable `/__l5e/...` asset URLs that 404 outside that host.
 */
export function BrandLogo({ className, compact }: Props) {
  const [idx, setIdx] = useState(0);
  const src = brandLogoSrcAt(idx, !!compact);
  const showWordmark = !src || idx >= brandLogoCandidateCount(!!compact);

  if (showWordmark) {
    return (
      <span
        className={`brand-wordmark${compact ? " compact" : ""}${className ? ` ${className}` : ""}`}
        aria-label="ManzilIQ"
      >
        <span className="brand-mark" aria-hidden>
          M
        </span>
        {!compact && <span className="brand-text">ManzilIQ</span>}
        {compact && <span className="sr-only">ManzilIQ</span>}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt="ManzilIQ"
      className={className ?? (compact ? "brand-logo brand-logo-compact" : "brand-logo")}
      width={compact ? 55 : undefined}
      height={compact ? 55 : undefined}
      onError={() => setIdx((i) => i + 1)}
    />
  );
}
