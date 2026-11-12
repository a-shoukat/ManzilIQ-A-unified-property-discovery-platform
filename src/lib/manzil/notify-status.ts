/** Pure delivery-log status helpers (safe for client + server). */

export function deliveryStatusFromResult(ok: boolean, detail: string): "sent" | "skipped" | "failed" {
  if (ok) return "sent";
  if (
    detail.includes("not_configured") ||
    detail.startsWith("skipped") ||
    detail === "invalid_phone"
  ) {
    return "skipped";
  }
  return "failed";
}
