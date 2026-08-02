import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { loadState, saveState } from '../utils/storage';
import { LILO_KEY, LILO_SUBMISSIONS_KEY } from '../utils/constants';

const toRow = (e, userId) => ({
  id: e.id,
  user_id: userId,
  month: e.month,
  date: e.date,
  brg_type: e.brgType,
  sched_type: e.schedType,
  eid: e.eid,
  status: e.status,
  start_time: e.startTime,
  end_time: e.endTime,
  location: e.location,
  remarks: e.remarks || '',
});

const fromRow = (r) => ({
  id: r.id,
  month: r.month,
  date: r.date,
  brgType: r.brg_type,
  schedType: r.sched_type,
  eid: r.eid,
  status: r.status,
  startTime: r.start_time,
  endTime: r.end_time,
  location: r.location,
  remarks: r.remarks || '',
});

export function useLilo() {
  const { session } = useAuth();
  const userId = session?.user?.id || null;
  const backend = !!supabase && !!userId;

  const [entries, setEntries] = useState(() => loadState(LILO_KEY, []));
  const [submissions, setSubmissions] = useState(() => loadState(LILO_SUBMISSIONS_KEY, {}));

  const entriesRef = useRef(entries);
  entriesRef.current = entries;

  const pending = useRef({});
  const timer = useRef(null);
  const didSeedRef = useRef(false);

  const refetch = useCallback(async () => {
    if (!backend) return;
    const [{ data: es }, { data: subs }] = await Promise.all([
      supabase.from('lilo_entries').select('*'),
      supabase.from('lilo_submissions').select('*'),
    ]);
    // Never clobber a valid local cache with an empty backend result. The backend
    // can appear empty when its tables/migrations aren't set up or writes didn't
    // persist, while the user still has legitimately generated entries locally.
    if (es && (es.length || entriesRef.current.length === 0)) setEntries(es.map(fromRow));
    if (subs && subs.length) {
      const map = {};
      for (const s of subs) if (s.submitted_at) map[s.month] = s.submitted_at;
      setSubmissions(map);
    }
  }, [backend]);

  // Load from backend when authed.
  useEffect(() => {
    if (!backend) return;
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backend, userId]);

  // Realtime sync (own writes + other devices).
  useEffect(() => {
    if (!backend) return;
    const channel = supabase
      .channel('focusly-lilo')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lilo_entries', filter: `user_id=eq.${userId}` }, refetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lilo_submissions', filter: `user_id=eq.${userId}` }, refetch)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [backend, userId, refetch]);

  // Local cache.
  useEffect(() => saveState(LILO_KEY, entries), [entries]);
  useEffect(() => saveState(LILO_SUBMISSIONS_KEY, submissions), [submissions]);

  const flush = useCallback(() => {
    if (!backend) return;
    const batch = Object.values(pending.current);
    pending.current = {};
    if (batch.length) supabase.from('lilo_entries').upsert(batch.map((e) => toRow(e, userId)));
  }, [backend, userId]);

  useEffect(() => () => {
    clearTimeout(timer.current);
    flush();
  }, [flush]);

  const updateEntry = useCallback(
    (id, patch) => {
      const updated = entriesRef.current.map((e) => (e.id === id ? { ...e, ...patch } : e));
      setEntries(updated);
      const target = updated.find((e) => e.id === id);
      if (target) {
        pending.current[id] = target;
        clearTimeout(timer.current);
        timer.current = setTimeout(flush, 500);
      }
    },
    [flush],
  );

  const addEntries = useCallback(
    (list) => {
      if (!list.length) return 0;
      let added = 0;
      setEntries((prev) => {
        const existing = new Set(prev.map((e) => e.date));
        const fresh = list.filter((e) => !existing.has(e.date));
        added = fresh.length;
        if (backend && fresh.length) supabase.from('lilo_entries').upsert(fresh.map((e) => toRow(e, userId)));
        return [...prev, ...fresh];
      });
      return added;
    },
    [backend, userId],
  );

  const removeEntry = useCallback(
    (id) => {
      setEntries((prev) => prev.filter((e) => e.id !== id));
      if (backend) supabase.from('lilo_entries').delete().eq('id', id);
    },
    [backend],
  );

  const resetMonth = useCallback(
    (month) => {
      const ids = entriesRef.current.filter((e) => e.month === month).map((e) => e.id);
      setEntries((prev) => prev.filter((e) => e.month !== month));
      if (backend && ids.length) supabase.from('lilo_entries').delete().in('id', ids);
      if (didSeedRef.current) didSeedRef.current = false;
    },
    [backend],
  );

  const setSubmitted = useCallback(
    (month, submitted) => {
      if (submitted) {
        const at = new Date().toISOString();
        setSubmissions((prev) => ({ ...prev, [month]: at }));
        if (backend) supabase.from('lilo_submissions').upsert({ user_id: userId, month, submitted_at: at });
      } else {
        setSubmissions((prev) => {
          const n = { ...prev };
          delete n[month];
          return n;
        });
        if (backend) supabase.from('lilo_submissions').delete().eq('user_id', userId).eq('month', month);
      }
    },
    [backend, userId],
  );

  return {
    entries,
    submissions,
    updateEntry,
    addEntries,
    removeEntry,
    resetMonth,
    setSubmitted,
  };
}
