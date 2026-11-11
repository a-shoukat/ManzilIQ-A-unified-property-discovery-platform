/** Supabase errors are plain objects, not Error instances; surface their message.
 *  Pass a translated fallback from the caller (English text stays identical when lang=en).
 */
export function errorText(err: unknown, fallback: string, permissionSuffix = 'permission denied for this account.'): string {
  if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
    const m = (err as { message: string }).message;
    return m.includes('row-level security') ? `${fallback}: ${permissionSuffix}` : m;
  }
  return fallback;
}
