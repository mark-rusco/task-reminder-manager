import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const DEFAULT_CONFIG = { registration_open: true, maintenance: false, announcement: '' };

// Shared, singleton realtime channel. supabase.channel(name) returns the SAME
// instance for a given name, so calling it again (React StrictMode double-mount,
// or multiple consumers like AuthPage + AppShell) would add postgres_changes
// callbacks to an already-subscribed channel and throw. Creating it once here
// and fanning updates out to listeners avoids that entirely.
let sharedChannel = null;
let current = DEFAULT_CONFIG;
const listeners = new Set();

async function loadAndEmit() {
  if (!supabase) return;
  const { data } = await supabase.from('app_config').select('config').eq('id', true).maybeSingle();
  current = { ...DEFAULT_CONFIG, ...(data?.config || {}) };
  for (const fn of listeners) fn(current);
}

function ensureChannel() {
  if (sharedChannel || !supabase) return;
  sharedChannel = supabase
    .channel('app-config')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'app_config' }, () => loadAndEmit())
    .subscribe();
  loadAndEmit();
}

/**
 * Reads the shared app_config row (id = true) live from Supabase.
 * Returns { config, loading }. Falls back to defaults in local mode.
 */
export function useAppConfig() {
  const [config, setConfig] = useState(current);
  const [loading, setLoading] = useState(!!supabase);

  useEffect(() => {
    listeners.add(setConfig);
    if (supabase) {
      ensureChannel();
      loadAndEmit().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
    return () => {
      listeners.delete(setConfig);
    };
  }, []);

  return { config, loading };
}