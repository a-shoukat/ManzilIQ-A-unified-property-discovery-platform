import { getSupabase } from './supabase';

/**
 * Upload a file to the `documents` bucket under the user's own folder.
 * Returns the storage path (e.g. "<uid>/noc.pdf").
 */
export async function uploadDocument(file: File): Promise<string> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Database not connected');
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error('Not signed in');

  const ext = file.name.split('.').pop() || 'bin';
  const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from('documents')
    .upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}

/** Get a short-lived signed URL for a stored document path. */
export async function getDocumentUrl(path: string): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase || !path) return null;
  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(path, 3600);
  if (error) return null;
  return data.signedUrl;
}
