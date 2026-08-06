import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { DASHBOARD_CATEGORIES } from '../utils/constants';

const DashboardCategoriesContext = createContext(null);

/**
 * Admin-managed dashboard category list (Dashboards / Reports / Excel / …),
 * loaded from the `dashboard_categories` table and kept in sync via realtime
 * so changes made in the admin panel appear everywhere instantly. Falls back
 * to the built-in defaults if the table isn't set up yet.
 */
export function DashboardCategoriesProvider({ children }) {
  const [categories, setCategories] = useState(DASHBOARD_CATEGORIES);

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;

    const load = async () => {
      const { data } = await supabase
        .from('dashboard_categories')
        .select('*')
        .order('sort_order', { ascending: true });
      if (!mounted) return;
      if (Array.isArray(data) && data.length) {
        const active = data
          .filter((c) => c.active !== false)
          .map((c) => ({ value: c.value, label: c.label, color: c.color || '#6366f1', icon: c.icon || 'layout' }));
        if (active.length) setCategories(active);
      }
    };

    load();
    const channel = supabase
      .channel('focusly-dashboard-categories')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dashboard_categories' }, load)
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel).catch(() => {});
    };
  }, []);

  const categoryMeta = useCallback(
    (value) => {
      const found = categories.find((c) => c.value === value);
      if (found) return found;
      const baked = DASHBOARD_CATEGORIES.find((c) => c.value === value);
      return baked || DASHBOARD_CATEGORIES[0];
    },
    [categories],
  );

  const value = useMemo(() => ({ categories, categoryMeta }), [categories, categoryMeta]);

  return <DashboardCategoriesContext.Provider value={value}>{children}</DashboardCategoriesContext.Provider>;
}

export function useDashboardCategories() {
  const ctx = useContext(DashboardCategoriesContext);
  if (!ctx) throw new Error('useDashboardCategories must be used within a DashboardCategoriesProvider');
  return ctx;
}
