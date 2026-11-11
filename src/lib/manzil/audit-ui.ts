import { z } from "zod";
import { fetchAuditLogs } from "./audit";
import { downloadCSV } from "./analytics";

export const auditFilterSchema = z.object({
  table: z.string().trim().optional(),
  user: z.string().trim().optional(),
  action: z.string().trim().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export type AuditRow = Awaited<ReturnType<typeof fetchAuditLogs>>[number];

export function filterAuditLogs(
  rows: AuditRow[],
  filters: z.infer<typeof auditFilterSchema>,
): AuditRow[] {
  const f = auditFilterSchema.parse(filters);
  return rows.filter((r) => {
    if (f.table && !(r.entity_type ?? "").toLowerCase().includes(f.table.toLowerCase())) return false;
    if (f.action && !r.action.toLowerCase().includes(f.action.toLowerCase())) return false;
    if (f.user && !(r.actor_id ?? "").toLowerCase().includes(f.user.toLowerCase())) return false;
    const t = new Date(r.created_at).getTime();
    if (f.from && t < new Date(f.from).getTime()) return false;
    if (f.to) {
      const end = new Date(f.to);
      end.setHours(23, 59, 59, 999);
      if (t > end.getTime()) return false;
    }
    return true;
  });
}

export function paginate<T>(rows: T[], page: number, pageSize: number): { slice: T[]; pages: number } {
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const p = Math.min(Math.max(1, page), pages);
  const start = (p - 1) * pageSize;
  return { slice: rows.slice(start, start + pageSize), pages };
}

export function exportAuditCsv(rows: AuditRow[]): void {
  downloadCSV(
    `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`,
    rows.map((r) => ({
      created_at: r.created_at,
      actor_id: r.actor_id ?? "",
      action: r.action,
      entity_type: r.entity_type ?? "",
      entity_id: r.entity_id ?? "",
      meta: JSON.stringify(r.meta ?? {}),
    })),
  );
}

/** Expand meta into old vs new when present. */
export function metaDiff(meta: Record<string, unknown>): { oldVal: string; newVal: string } {
  const oldVal =
    meta["old"] !== undefined
      ? JSON.stringify(meta["old"], null, 2)
      : meta["before"] !== undefined
        ? JSON.stringify(meta["before"], null, 2)
        : "—";
  const newVal =
    meta["new"] !== undefined
      ? JSON.stringify(meta["new"], null, 2)
      : meta["after"] !== undefined
        ? JSON.stringify(meta["after"], null, 2)
        : JSON.stringify(meta, null, 2);
  return { oldVal, newVal };
}

export { fetchAuditLogs };
