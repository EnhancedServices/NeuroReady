import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseAnonKey);
};

/** Matches the default auth storage key used by createClient(supabaseUrl, ...). */
export function clearPersistedSupabaseSession(): void {
  if (typeof window === 'undefined' || !supabaseUrl) return;
  try {
    const baseUrl = new URL(supabaseUrl);
    const key = `sb-${baseUrl.hostname.split('.')[0]}-auth-token`;
    localStorage.removeItem(key);
    localStorage.removeItem(`${key}-code-verifier`);
    localStorage.removeItem(`${key}-user`);
  } catch {
    /* invalid URL or storage unavailable */
  }
}
