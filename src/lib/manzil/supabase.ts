import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Public (publishable) connection details for the existing ManzilIQ project.
const supabaseUrl = ((import.meta.env['VITE_SUPABASE_URL'] as string | undefined) ||
  'https://ctctmtgwfibuxyzemkee.supabase.co') as string;
const supabaseAnonKey = ((import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'] || import.meta.env['VITE_SUPABASE_ANON_KEY']) as string | undefined) ||
  'sb_publishable_n0Fv19C41yHXgHYDkuBwGw_LJUS8VKo';

export const isSupabaseConfigured = (): boolean =>
  !!supabaseUrl &&
  !!supabaseAnonKey &&
  !supabaseUrl.includes('your-project-id') &&
  !supabaseAnonKey.includes('your-anon-key');

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured() || typeof window === 'undefined') return null;
  if (!client) {
    client = createClient(supabaseUrl as string, supabaseAnonKey as string, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return client;
}
