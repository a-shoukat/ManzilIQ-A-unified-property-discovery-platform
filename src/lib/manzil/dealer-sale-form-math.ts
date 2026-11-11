import { z } from "zod";

/** Whole-rupee non-negative amount. */
export const rupeeSchema = z
  .union([z.number(), z.string()])
  .transform((v) => (typeof v === "string" ? Number(v.replace(/,/g, "")) : v))
  .pipe(z.number().finite().nonnegative().multipleOf(1));

export function computeTotals(input: {
  token_received: number;
  previous_amount: number;
  total_price: number;
}): { total_received: number; balance_amount: number } {
  const token = Math.round(input.token_received);
  const prev = Math.round(input.previous_amount);
  const total = Math.round(input.total_price);
  const total_received = token + prev;
  const balance_amount = total - total_received;
  return { total_received, balance_amount };
}

/** Detect whether stored totals differ from auto formula. */
export function totalsWereEdited(
  row: {
    token_received: number;
    previous_amount: number;
    total_price: number;
    total_received: number;
    balance_amount: number;
  },
): boolean {
  const auto = computeTotals(row);
  return (
    Math.round(row.total_received) !== auto.total_received ||
    Math.round(row.balance_amount) !== auto.balance_amount
  );
}

export function formatRupeeUr(n: number): string {
  const abs = Math.round(Math.abs(n));
  const formatted = abs.toLocaleString("en-PK");
  const sign = n < 0 ? "-" : "";
  return `${sign}${formatted} روپے`;
}

/** Normalize Pakistani mobile to +92… for wa.me */
export function normalizePkPhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  let n = digits;
  if (n.startsWith("00")) n = n.slice(2);
  if (n.startsWith("92") && n.length >= 12) return `+${n}`;
  if (n.startsWith("0") && n.length === 11) return `+92${n.slice(1)}`;
  if (n.length === 10 && n.startsWith("3")) return `+92${n}`;
  if (n.length >= 10) return `+${n}`;
  return null;
}

export function makeShareToken(): string {
  const bytes = new Uint8Array(24);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Concurrent-safe serial allocator mock for tests (mirrors SQL semantics). */
export function allocateSerialInMemory(state: { next_serial: number }): number {
  const serial = state.next_serial;
  state.next_serial = serial + 1;
  return serial;
}

export async function allocateSerialsConcurrent(
  state: { next_serial: number },
  count: number,
): Promise<number[]> {
  // Simulate serialized transactions with a mutex queue
  const out: number[] = [];
  let chain = Promise.resolve();
  const jobs = Array.from({ length: count }, () => {
    chain = chain.then(() => {
      out.push(allocateSerialInMemory(state));
    });
    return chain;
  });
  await Promise.all(jobs);
  return out;
}
