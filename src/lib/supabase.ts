import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseAnonKey);
};

export const checkDbHealth = async (timeoutMs = 8000): Promise<boolean> => {
  if (!supabaseUrl || !supabaseAnonKey) return false;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const { error } = await supabase.from('admins').select('id').limit(1).abortSignal(controller.signal);
    clearTimeout(timer);
    return !error;
  } catch {
    return false;
  }
};
