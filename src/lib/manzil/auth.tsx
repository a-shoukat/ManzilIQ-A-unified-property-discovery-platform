import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabase } from './supabase';
import type {
  CustomerDetails,
  DealerDetails,
  Profile,
  SocietyDetails,
  UserRole,
} from '@/lib/manzil/types';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  details: SocietyDetails | DealerDetails | CustomerDetails | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  session: null,
  profile: null,
  details: null,
  loading: true,
  refresh: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const DETAIL_TABLE: Record<UserRole, string> = {
  buyer: 'customer_details',
  dealer: 'dealer_details',
  society_admin: 'society_details',
  super_admin: 'customer_details',
};

async function loadProfile(userId: string): Promise<{
  profile: Profile | null;
  details: SocietyDetails | DealerDetails | CustomerDetails | null;
}> {
  const supabase = getSupabase();
  if (!supabase) return { profile: null, details: null };

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  let profileRow = profile;
  if (!profileRow) {
    const { data: u } = await supabase.auth.getUser();
    const meta = (u.user?.user_metadata ?? {}) as { role?: string; full_name?: string };
    const role: UserRole = meta.role === 'dealer' || meta.role === 'society_admin' ? meta.role : 'buyer';
    if (u.user?.id === userId && u.user.email) {
      const { data: created } = await supabase
        .from('profiles')
        .insert({ id: userId, email: u.user.email, role, verification_status: 'pending' })
        .select('*')
        .single();
      profileRow = created;
    }
  }
  if (!profileRow) return { profile: null, details: null };
  const profileData = profileRow;

  const table = DETAIL_TABLE[profileData.role as UserRole] ?? 'customer_details';
  const { data: details } = await supabase
    .from(table)
    .select('*')
    .eq('profile_id', userId)
    .maybeSingle();

  return { profile: profileData as Profile, details: details ?? null };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [details, setDetails] = useState<
    SocietyDetails | DealerDetails | CustomerDetails | null
  >(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    if (data.session?.user) {
      const { profile: p, details: d } = await loadProfile(data.session.user.id);
      setProfile(p);
      setDetails(d);
    } else {
      setProfile(null);
      setDetails(null);
    }
  };

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }
    refresh().finally(() => setLoading(false));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user) {
        setTimeout(() => {
          loadProfile(s.user.id).then(({ profile: p, details: d }) => {
            setProfile(p);
            setDetails(d);
          });
        }, 0);
      } else {
        setProfile(null);
        setDetails(null);
      }
    });
    return () => listener.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = async () => {
    setLoading(true);
    const supabase = getSupabase();
    if (supabase) await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setDetails(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{ session, profile, details, loading, refresh, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}
