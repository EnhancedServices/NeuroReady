import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseAnonKey);
};

/** Paused Postgres (e.g. Supabase free / scale-to-zero) often needs ~30–60s to wake; shorter timeouts falsely report unreachable. */
export const checkDbHealth = async (timeoutMs = 65000): Promise<boolean> => {
  if (!supabaseUrl || !supabaseAnonKey) return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const { error } = await supabase.from('admins').select('id').limit(1).abortSignal(controller.signal);
    return !error;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
};
