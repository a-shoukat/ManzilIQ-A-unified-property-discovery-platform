/** Supabase errors are plain objects, not Error instances; surface their message. */
export function errorText(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
    const m = (err as { message: string }).message;
    return m.includes('row-level security') ? `${fallback}: permission denied for this account.` : m;
  }
  return fallback;
}
