import { createClient } from '@supabase/supabase-js';

// Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see .env.example).
// When missing, the app runs in fully local mode (no auth / no backend).
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = (() => {
  if (!url || !anonKey) return null;
  try {
    return createClient(url, anonKey);
  } catch {
    console.warn('Supabase client could not be created — falling back to local mode.');
    return null;
  }
})();

/** True when a Supabase project is configured. */
export const isSupabaseConfigured = !!supabase;
