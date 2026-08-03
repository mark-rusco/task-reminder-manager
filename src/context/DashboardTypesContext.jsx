import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { DASHBOARD_TYPES } from '../utils/constants';

const DashboardTypesContext = createContext(null);

/**
 * Admin-managed dashboard type list (Power BI / Excel / SharePoint …), loaded
 * from the `dashboard_types` table and kept in sync via realtime so changes
 * made in the admin panel appear everywhere instantly. Falls back to the
 * built-in defaults if the table isn't set up yet.
 */
export function DashboardTypesProvider({ children }) {
  const [types, setTypes] = useState(DASHBOARD_TYPES);

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;

    const load = async () => {
      const { data } = await supabase
        .from('dashboard_types')
        .select('*')
        .order('sort_order', { ascending: true });
      if (!mounted) return;
      if (Array.isArray(data) && data.length) {
        const active = data
          .filter((t) => t.active !== false)
          .map((t) => ({ value: t.key, label: t.label, color: t.color || '#6366f1', icon: t.icon || 'layout' }));
        if (active.length) setTypes(active);
      }
    };

    load();
    const channel = supabase
      .channel('focusly-dashboard-types')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dashboard_types' }, load)
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel).catch(() => {});
    };
  }, []);

  const typeMeta = useCallback(
    (value) => {
      const found = types.find((t) => t.value === value);
      if (found) return found;
      const baked = DASHBOARD_TYPES.find((t) => t.value === value);
      return baked || DASHBOARD_TYPES[0];
    },
    [types],
  );

  const value = useMemo(() => ({ types, typeMeta }), [types, typeMeta]);

  return <DashboardTypesContext.Provider value={value}>{children}</DashboardTypesContext.Provider>;
}

export function useDashboardTypes() {
  const ctx = useContext(DashboardTypesContext);
  if (!ctx) throw new Error('useDashboardTypes must be used within a DashboardTypesProvider');
  return ctx;
}