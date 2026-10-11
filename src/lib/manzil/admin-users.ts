import { createClient } from '@supabase/supabase-js';
import { getSupabase } from './supabase';
import type { UserRole } from './types';

/**
 * Creates a sign-in account with a temporary password, then the signed-in super admin
 * sets its role and approval. Uses a throwaway client so the admin's own session is untouched.
 */
export async function createUserAsAdmin(input: { name: string; email: string; role: UserRole; password: string }): Promise<void> {
  const db = getSupabase();
  if (!db) throw new Error('Database not connected');
  const url = (db as unknown as { supabaseUrl: string }).supabaseUrl;
  const key = (db as unknown as { supabaseKey: string }).supabaseKey;
  const temp = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, storageKey: 'manziliq-admin-create' } });
  const { data, error } = await temp.auth.signUp({ email: input.email.trim(), password: input.password, options: { data: { full_name: input.name, role: input.role } } });
  if (error) throw error;
  const id = data.user?.id;
  if (!id) throw new Error('Account was not created.');
  if (data.user && (data.user.identities?.length ?? 0) === 0) throw new Error('An account with this email already exists.');
  await temp.auth.signOut();
  const { error: upErr } = await db.from('profiles').upsert(
    { id, email: input.email.trim(), full_name: input.name || null, role: input.role, verification_status: 'approved' },
    { onConflict: 'id' },
  );
  if (upErr) throw upErr;
}
