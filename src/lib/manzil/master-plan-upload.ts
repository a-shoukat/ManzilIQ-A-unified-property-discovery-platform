export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export const MAP_ACCEPT = ["application/pdf", ...IMAGE_TYPES].join(",");

export type MasterPlanFileCheck = { ok: true; kind: "pdf" | "image" } | { ok: false; reason: string };

/** Validate master-plan upload before storage (PNG/JPG/WEBP ≤10MB, PDF ≤25MB). */
export function validateMasterPlanFile(file: { type: string; size: number }): MasterPlanFileCheck {
  const isPdf = file.type === "application/pdf";
  const isImage = (IMAGE_TYPES as readonly string[]).includes(file.type);
  if (!isPdf && !isImage) return { ok: false, reason: "Please choose a PDF, PNG, JPG or WEBP file" };
  if (isPdf && file.size > 25 * 1024 * 1024) return { ok: false, reason: "PDF must be under 25 MB" };
  if (isImage && file.size > 10 * 1024 * 1024) return { ok: false, reason: "Image must be under 10 MB" };
  return { ok: true, kind: isPdf ? "pdf" : "image" };
}
