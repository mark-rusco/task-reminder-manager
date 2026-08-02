import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { loadState, saveState } from '../utils/storage';
import { SETTINGS_KEY } from '../utils/constants';

const SettingsContext = createContext(null);

/**
 * Holds all app preferences in a single object writable under top-level
 * namespaces (e.g. `theme`, `notifications`, `tracker`). Values are cached in
 * localStorage and, when a Supabase session is present, synced to the
 * `user_settings` table so they survive across devices and sign-ins.
 */
export function SettingsProvider({ children }) {
  const { backend, user } = useAuth();
  const userId = user?.id ?? null;
  const [settings, setSettingsState] = useState(() => loadState(SETTINGS_KEY, {}));
  const [hydrated, setHydrated] = useState(false);

  const hydratedRef = useRef(hydrated);
  hydratedRef.current = hydrated;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // 1) Load from the DB (source of truth) for the active user, seeding any local
  //    (e.g. previously anonymous) settings so nothing is lost.
  useEffect(() => {
    let mounted = true;
    setHydrated(false);

    if (!backend || !userId) {
      setHydrated(true);
      return;
    }

    (async () => {
      const { data, error } = await supabase
        .from('user_settings')
        .select('settings')
        .eq('user_id', userId)
        .maybeSingle();

      if (!mounted) return;

      if (error) {
        // Table likely not created yet — keep local cache, stay functional.
        console.warn('[settings] failed to load from DB', error);
        setHydrated(true);
        return;
      }

      if (data) {
        const dbSettings = data.settings && typeof data.settings === 'object' ? data.settings : {};
        setSettingsState(dbSettings);
        saveState(SETTINGS_KEY, dbSettings);
      } else {
        const local = settingsRef.current;
        if (local && Object.keys(local).length) {
          // Seed anonymous/local prefs into the DB for this user.
          await supabase
            .from('user_settings')
            .upsert({ user_id: userId, settings: local }, { onConflict: 'user_id' })
            .catch((e) => console.warn('[settings] failed to seed', e));
        }
      }
      setHydrated(true);
    })();

    return () => {
      mounted = false;
    };
  }, [backend, userId]);

  // 2) Realtime: reflect DB changes (e.g. from another tab / device).
  useEffect(() => {
    if (!backend || !userId) return;
    const channel = supabase
      .channel('user_settings_changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'user_settings', filter: `user_id=eq.${userId}` },
        (payload) => {
          const dbSettings = payload.new?.settings || {};
          setSettingsState(dbSettings);
          saveState(SETTINGS_KEY, dbSettings);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel).catch(() => {});
    };
  }, [backend, userId]);

  // 3) Escalate local writer: update state, mirror to localStorage.
  const setSetting = useCallback((key, value) => {
    setSettingsState((prev) => {
      const current = prev || {};
      const nextVal = typeof value === 'function' ? value(current[key]) : value;
      const next = { ...current, [key]: nextVal };
      saveState(SETTINGS_KEY, next);
      return next;
    });
  }, []);

  // 4) Debounced push to the DB whenever hydrated settings change.
  useEffect(() => {
    if (!backend || !userId || !hydrated) return;
    const t = setTimeout(() => {
      const local = settingsRef.current;
      supabase
        .from('user_settings')
        .upsert({ user_id: userId, settings: local }, { onConflict: 'user_id' })
        .then(({ error }) => {
          if (error) console.warn('[settings] failed to sync', error);
        });
    }, 400);
    return () => clearTimeout(t);
  }, [settings, backend, userId, hydrated]);

  return (
    <SettingsContext.Provider value={{ settings, setSetting, hydrated }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider');
  return ctx;
}