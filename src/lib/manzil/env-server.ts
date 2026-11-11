/** Server-only env helpers. Never import from client components. */
export function serverEnv(k: string): string | undefined {
  const v = process.env[k];
  return v && v.trim() ? v.trim() : undefined;
}

export function normPhonePk(p: string): string {
  const d = p.replace(/\D/g, "");
  if (d.startsWith("92")) return `+${d}`;
  if (d.startsWith("0")) return `+92${d.slice(1)}`;
  return d ? `+${d}` : "";
}
