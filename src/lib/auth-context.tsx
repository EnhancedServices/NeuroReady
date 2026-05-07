import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, clearPersistedSupabaseSession } from './supabase';
import { Profile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string, userEmail: string) => {
    let { data } = await supabase
      .from('neuro_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (data) return data;

    const { data: adminRow } = await supabase
      .from('admins')
      .select('id')
      .eq('email', userEmail.toLowerCase())
      .maybeSingle();

    let hasAccess = !!adminRow;
    const role = adminRow ? 'admin' : 'athlete';

    if (!adminRow) {
      const { data: athlete } = await supabase
        .from('athletes')
        .select('id')
        .eq('email', userEmail.toLowerCase())
        .maybeSingle();

      if (athlete) {
        const { data: access } = await supabase
          .from('athlete_app_access')
          .select('id')
          .eq('athlete_id', athlete.id)
          .eq('app_name', 'neuroready')
          .maybeSingle();

        hasAccess = !!access;
      }
    }

    if (!hasAccess) return null;

    const { data: sharedAthlete } = await supabase
      .from('athletes')
      .select('id')
      .eq('email', userEmail.toLowerCase())
      .maybeSingle();

    const { data: newProfile, error: insertErr } = await supabase
      .from('neuro_profiles')
      .insert({
        id: userId,
        email: userEmail.toLowerCase(),
        role,
        shared_athlete_id: sharedAthlete?.id || null,
      })
      .select('*')
      .single();

    if (insertErr) {
      console.error('Error creating neuro profile:', insertErr);
      return null;
    }

    return newProfile;
  };

  const refreshProfile = async () => {
    if (user?.email) {
      const prof = await fetchProfile(user.id, user.email);
      setProfile(prof);
    }
  };

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);

      if (session?.user) {
        const userId = session.user.id;
        const prof = await fetchProfile(userId, session.user.email!);
        const { data: { session: latest } } = await supabase.auth.getSession();
        if (latest?.user?.id === userId) {
          setProfile(prof);
        }
      }

      setLoading(false);
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void (async () => {
        if (!session?.user) {
          setUser(null);
          setProfile(null);
          return;
        }

        const userId = session.user.id;
        const email = session.user.email!;

        setUser(session.user);

        const prof = await fetchProfile(userId, email);

        const { data: { session: latest } } = await supabase.auth.getSession();
        if (!latest?.user || latest.user.id !== userId) {
          return;
        }

        setProfile(prof);
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      const profile = await fetchProfile(data.user.id, data.user.email!);
      if (!profile) {
        try {
          const { error: soErr } = await supabase.auth.signOut();
          if (soErr) clearPersistedSupabaseSession();
        } catch {
          clearPersistedSupabaseSession();
        }
        throw new Error('Access denied');
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        clearPersistedSupabaseSession();
      }
    } catch {
      clearPersistedSupabaseSession();
    } finally {
      setUser(null);
      setProfile(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
