import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { loadState, saveState } from '../utils/storage';
import { DASHBOARDS_KEY, DEMO_DASHBOARD_ID, uid } from '../utils/constants';

function seedDashboards() {
  return [
    {
      id: DEMO_DASHBOARD_ID,
      name: 'Sales Performance',
      description: 'Monthly revenue, pipeline and win-rate tracking.',
      url: '',
      workspace: 'Analytics',
      status: 'in-progress',
      progress: 60,
      dueDate: '',
      createdAt: new Date().toISOString(),
    },
    {
      id: uid(),
      name: 'Operations KPI',
      description: 'Team utilisation and SLA adherence.',
      url: '',
      workspace: 'BI Team',
      status: 'planning',
      progress: 15,
      dueDate: '',
      createdAt: new Date().toISOString(),
    },
  ];
}

const toRow = (d, userId) => ({
  id: d.id,
  user_id: userId,
  name: d.name,
  description: d.description || '',
  url: d.url || null,
  workspace: d.workspace || null,
  status: d.status || 'planning',
  progress: Math.max(0, Math.min(100, Number(d.progress) || 0)),
  due_date: d.dueDate || null,
  created_at: d.createdAt,
});

const fromRow = (r) => ({
  id: r.id,
  name: r.name,
  description: r.description || '',
  url: r.url || '',
  workspace: r.workspace || '',
  status: r.status || 'planning',
  progress: Number(r.progress) || 0,
  dueDate: r.due_date || '',
  createdAt: r.created_at,
});

export function useDashboards() {
  const { session } = useAuth();
  const userId = session?.user?.id || null;
  const backend = !!supabase && !!userId;

  const [dashboards, setDashboards] = useState(() => {
    const existing = loadState(DASHBOARDS_KEY, null);
    if (existing == null) {
      const seeded = seedDashboards();
      saveState(DASHBOARDS_KEY, seeded);
      return seeded;
    }
    return existing || [];
  });
  const [syncing, setSyncing] = useState(false);
  const didSeedRef = useRef(false);

  const dashboardsRef = useRef(dashboards);
  dashboardsRef.current = dashboards;

  // Load from backend when authed.
  useEffect(() => {
    let active = true;
    if (!backend) {
      setSyncing(false);
      return;
    }
    setSyncing(true);
    (async () => {
      const { data, error } = await supabase
        .from('dashboards')
        .select('*')
        .order('created_at', { ascending: true });
      if (!active) return;
      if (error) setDashboards((prev) => prev);
      const rows = data || [];
      if (rows.length === 0 && !didSeedRef.current) {
        didSeedRef.current = true;
        const seeded = seedDashboards();
        const { error: ie } = await supabase
          .from('dashboards')
          .insert(seeded.map((s) => toRow(s, userId)));
        if (!active) return;
        if (!ie) setDashboards(seeded);
      } else {
        setDashboards(rows.map(fromRow));
      }
      setSyncing(false);
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backend, userId]);

  // Realtime sync.
  useEffect(() => {
    if (!backend) return;
    const refetch = async () => {
      const { data } = await supabase.from('dashboards').select('*').order('created_at', { ascending: true });
      if (data) setDashboards(data.map(fromRow));
    };
    const channel = supabase
      .channel('focusly-dashboards')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dashboards', filter: `user_id=eq.${userId}` }, refetch)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [backend, userId]);

  useEffect(() => saveState(DASHBOARDS_KEY, dashboards), [dashboards]);

  const persist = useCallback(
    (d) => {
      if (!backend) return Promise.resolve();
      return supabase.from('dashboards').upsert(toRow(d, userId));
    },
    [backend, userId],
  );

  const addDashboard = useCallback(
    (data) => {
      const d = {
        id: uid(),
        status: 'planning',
        progress: 0,
        createdAt: new Date().toISOString(),
        ...data,
      };
      setDashboards((prev) => [...prev, d]);
      persist(d);
      return d;
    },
    [persist],
  );

  const updateDashboard = useCallback(
    (id, patch) => {
      const target = dashboardsRef.current.find((d) => d.id === id);
      setDashboards((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
      if (target) persist({ ...target, ...patch });
    },
    [persist],
  );

  const deleteDashboard = useCallback(
    (id) => {
      const target = dashboardsRef.current.find((d) => d.id === id);
      setDashboards((prev) => prev.filter((d) => d.id !== id));
      if (backend) supabase.from('dashboards').delete().eq('id', id);
      return target;
    },
    [backend],
  );

  return {
    dashboards,
    syncing,
    addDashboard,
    updateDashboard,
    deleteDashboard,
  };
}
