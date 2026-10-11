import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { getSupabase } from './supabase';
import { useAuth } from './auth';

interface WishlistState { ids: Set<string>; has: (id: string) => boolean; toggle: (id: string) => Promise<void>; ready: boolean }
const Ctx = createContext<WishlistState>({ ids: new Set(), has: () => false, toggle: async () => {}, ready: false });
export const useWishlist = () => useContext(Ctx);

/** Saved properties, stored per signed-in account in the `wishlist` table. */
export function WishlistProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setIds(new Set()); setReady(false);
    const db = getSupabase();
    if (!db || !userId) return;
    void db.from('wishlist').select('property_id').eq('user_id', userId).then(({ data }) => {
      setIds(new Set(((data as { property_id: string }[]) ?? []).map((r) => r.property_id)));
      setReady(true);
    });
  }, [userId]);

  const toggle = useCallback(async (propertyId: string) => {
    const db = getSupabase();
    if (!db || !userId) { toast.info('Sign in to save properties to your wishlist.'); return; }
    if (propertyId.startsWith('demo-')) { toast.info('Sample listings cannot be saved.'); return; }
    const saved = ids.has(propertyId);
    setIds((prev) => { const n = new Set(prev); if (saved) n.delete(propertyId); else n.add(propertyId); return n; });
    const { error } = saved
      ? await db.from('wishlist').delete().eq('user_id', userId).eq('property_id', propertyId)
      : await db.from('wishlist').insert({ user_id: userId, property_id: propertyId });
    if (error) {
      setIds((prev) => { const n = new Set(prev); if (saved) n.add(propertyId); else n.delete(propertyId); return n; });
      toast.error('Could not update wishlist.');
    } else toast.success(saved ? 'Removed from wishlist' : 'Saved to wishlist');
  }, [ids, userId]);

  return <Ctx.Provider value={{ ids, has: (id) => ids.has(id), toggle, ready }}>{children}</Ctx.Provider>;
}
