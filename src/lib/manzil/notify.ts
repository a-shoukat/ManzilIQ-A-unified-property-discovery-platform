import { getSupabase } from './supabase';
import type { MessageTemplate, Notification } from '@/lib/manzil/types';

/** Write an in-app notification. External channels (SMS/Email/FCM)
 *  plug in here once API keys are configured. */
export async function notify(
  userIds: string | string[],
  title: string,
  body: string,
  type: string,
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const ids = Array.isArray(userIds) ? userIds : [userIds];
  const uniq = [...new Set(ids.filter(Boolean))];
  if (uniq.length === 0) return;
  const { error } = await supabase
    .from('notifications')
    .insert(uniq.map((user_id) => ({ user_id, title, body, type })));
  if (error) console.error('notify failed:', error.message);
}

export async function fetchInbox(userId: string): Promise<Notification[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);
  return (data as Notification[]) ?? [];
}

export async function unreadCount(userId: string): Promise<number> {
  const supabase = getSupabase();
  if (!supabase) return 0;
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);
  return count ?? 0;
}

export async function markRead(id: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.from('notifications').update({ read: true }).eq('id', id);
}

export async function markAllRead(userId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
}

// ---- broadcast recipient lists ----

export async function societyCustomerIds(societyId: string): Promise<string[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data } = await supabase.from('bookings').select('customer_id').eq('society_id', societyId);
  return [...new Set(((data as { customer_id: string }[]) ?? []).map((r) => r.customer_id).filter(Boolean))];
}

export async function societyDealerIds(societyId: string): Promise<string[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data } = await supabase.from('dealer_requests').select('dealer_id').eq('society_id', societyId).eq('status', 'approved');
  return [...new Set(((data as { dealer_id: string }[]) ?? []).map((r) => r.dealer_id))];
}

export async function allSocietyIds(): Promise<string[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data } = await supabase.from('profiles').select('id').eq('role', 'society_admin').eq('verification_status', 'approved');
  return ((data as { id: string }[]) ?? []).map((r) => r.id);
}

export async function allUserIds(): Promise<string[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data } = await supabase.from('profiles').select('id');
  return ((data as { id: string }[]) ?? []).map((r) => r.id);
}

// ---- templates ----

export async function fetchTemplates(ownerId: string | null): Promise<MessageTemplate[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from('message_templates')
    .select('*')
    .or(`owner_id.is.null${ownerId ? `,owner_id.eq.${ownerId}` : ''}`)
    .order('created_at', { ascending: false });
  return (data as MessageTemplate[]) ?? [];
}

export async function saveTemplate(ownerId: string, title: string, body: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Database not connected');
  const { error } = await supabase.from('message_templates').insert({ owner_id: ownerId, title, body });
  if (error) throw error;
}

export async function deleteTemplate(id: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.from('message_templates').delete().eq('id', id);
}
