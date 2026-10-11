import { useAuth } from './auth';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Property } from '@/lib/manzil/types';

interface CompareState {
  items: Property[];
  toggle: (p: Property) => void;
  clear: () => void;
  has: (id: string) => boolean;
}

const CompareContext = createContext<CompareState>({
  items: [],
  toggle: () => {},
  clear: () => {},
  has: () => false,
});

export const useCompare = () => useContext(CompareContext);

export const compareKey = (userId: string | null | undefined) => `manziliq_compare:${userId ?? 'guest'}`;

export function CompareProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Property[]>([]);
  const [ready, setReady] = useState(false);
  const { session, loading } = useAuth();
  const userId = session?.user.id ?? null;
  const KEY = compareKey(userId);
  const [prevUser, setPrevUser] = useState<string | null>(null);
  useEffect(() => {
    if (loading) return;
    setReady(false);
    if (prevUser && !userId) localStorage.removeItem(compareKey(prevUser));
    setPrevUser(userId);
    localStorage.removeItem('manziliq_compare');
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? '[]');
      if (Array.isArray(saved)) setItems(saved.slice(0, 3));
    } catch {
      setItems([]);
    }
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [KEY, loading]);

  useEffect(() => {
    if (ready) localStorage.setItem(KEY, JSON.stringify(items));
  }, [items, ready, KEY]);

  const toggle = (p: Property) => {
    setItems((prev) => {
      if (prev.some((x) => x.id === p.id)) return prev.filter((x) => x.id !== p.id);
      if (prev.length >= 3) return prev; // WBS: up to 3 plots
      return [...prev, p];
    });
  };

  const clear = () => setItems([]);
  const has = (id: string) => items.some((x) => x.id === id);

  return (
    <CompareContext.Provider value={{ items, toggle, clear, has }}>
      {children}
    </CompareContext.Provider>
  );
}
