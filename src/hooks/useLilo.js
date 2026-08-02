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

export function useLilo(onToast) {
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

  // Surface backend failures instead of silently swallowing them.
  const push = useCallback(
    (message) => {
      if (typeof onToast === 'function') {
        onToast(message, 'warning');
      } else {
        console.warn(message);
      }
    },
    [onToast],
  );

  const runWrite = useCallback(
    async (label, fn) => {
      try {
        const { error } = await fn();
        if (!error) return true;
        push(error?.message ? `Couldn't sync to Supabase (${label}): ${error.message}` : `Couldn't sync to Supabase (${label}).`);
        return false;
      } catch (err) {
        push(`Couldn't sync to Supabase (${label}): ${err && err.message ? err.message : err}`);
        return false;
      }
    },
    [push],
  );

  const refetch = useCallback(async () => {
    if (!backend) return;
    let es, subs;
    try {
      const [{ data: e0, error: e1 }, { data: s0, error: s1 }] = await Promise.all([
        supabase.from('lilo_entries').select('*'),
        supabase.from('lilo_submissions').select('*'),
      ]);
      es = e0;
      subs = s0;
      if (e1 && /relation|does not exist|permission denied/i.test(e1.message || '')) {
        push(`Couldn't load LILO from Supabase: ${e1.message}`);
      } else if (e1) {
        push(`Couldn't load LILO entries: ${e1.message}`);
      }
      if (s1 && (s1.message || '') !== '') {
        push(`Couldn't load LILO submissions: ${s1.message}`);
      }
    } catch (err) {
      push(`Couldn't load LILO from Supabase: ${err && err.message ? err.message : err}`);
      return;
    }
    // Never clobber a valid local cache with an empty backend result. The backend
    // can appear empty when its tables/migrations aren't set up or writes didn't
    // persist, while the user still has legitimately generated entries locally.
    if (es && (es.length || entriesRef.current.length === 0)) setEntries(es.map(fromRow));
    if (subs && subs.length) {
      const map = {};
      for (const s of subs) if (s.submitted_at) map[s.month] = s.submitted_at;
      setSubmissions(map);
    }
  }, [backend, push]);

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
    if (batch.length) runWrite('edit entries', () => supabase.from('lilo_entries').upsert(batch.map((e) => toRow(e, userId))));
  }, [backend, userId, runWrite]);

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
      // Move the dedupe out of the state updater so the DB write isn't a
      // side-effect inside React's setState (and avoids StrictMode double-runs).
      const existing = new Set(entriesRef.current.map((e) => e.date));
      const fresh = list.filter((e) => !existing.has(e.date));
      if (!fresh.length) return 0;
      setEntries((prev) => [...prev, ...fresh]);
      if (backend) runWrite('add month', () => supabase.from('lilo_entries').upsert(fresh.map((e) => toRow(e, userId))));
      return fresh.length;
    },
    [backend, userId, runWrite],
  );

  const removeEntry = useCallback(
    (id) => {
      setEntries((prev) => prev.filter((e) => e.id !== id));
      if (backend) runWrite('remove day', () => supabase.from('lilo_entries').delete().eq('id', id));
    },
    [backend, runWrite],
  );

  const resetMonth = useCallback(
    (month) => {
      const ids = entriesRef.current.filter((e) => e.month === month).map((e) => e.id);
      setEntries((prev) => prev.filter((e) => e.month !== month));
      if (backend && ids.length) runWrite('reset month', () => supabase.from('lilo_entries').delete().in('id', ids));
      if (didSeedRef.current) didSeedRef.current = false;
    },
    [backend, runWrite],
  );

  const setSubmitted = useCallback(
    (month, submitted) => {
      if (submitted) {
        const at = new Date().toISOString();
        setSubmissions((prev) => ({ ...prev, [month]: at }));
        if (backend) runWrite('mark submitted', () => supabase.from('lilo_submissions').upsert({ user_id: userId, month, submitted_at: at }));
      } else {
        setSubmissions((prev) => {
          const n = { ...prev };
          delete n[month];
          return n;
        });
        if (backend) runWrite('unmark submitted', () => supabase.from('lilo_submissions').delete().eq('user_id', userId).eq('month', month));
      }
    },
    [backend, userId, runWrite],
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
