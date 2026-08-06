import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { loadState, saveState } from '../utils/storage';
import { TEAM_LEAVE_KEY, uid } from '../utils/constants';

const toRow = (e, userId) => ({
  id: e.id,
  user_id: userId,
  member: e.member,
  start_date: e.startDate || null,
  end_date: e.endDate || null,
  reason: e.reason || '',
  note: e.note || '',
  cover_tasks: e.coverTasks || [],
});

const fromRow = (r) => ({
  id: r.id,
  member: r.member,
  startDate: r.start_date || null,
  endDate: r.end_date || null,
  reason: r.reason || '',
  note: r.note || '',
  coverTasks: Array.isArray(r.cover_tasks) ? r.cover_tasks : [],
});

/**
 * Per-user team leave tracker. Every record is owned by the signing-in user
 * (RLS: auth.uid() = user_id), so a user's team data is only theirs. Falls
 * back to localStorage when not using the backend.
 */
export function useTeamLeave(onToast) {
  const { session } = useAuth();
  const userId = session?.user?.id || null;
  const backend = !!supabase && !!userId;

  const [entries, setEntries] = useState(() => loadState(TEAM_LEAVE_KEY, []));
  const entriesRef = useRef(entries);
  entriesRef.current = entries;

  const push = useCallback(
    (message) => {
      if (typeof onToast === 'function') onToast(message, 'warning');
      else console.warn(message);
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
    let data;
    try {
      const res = await supabase.from('team_leave').select('*').order('start_date', { ascending: false, nullsFirst: false });
      data = res.data;
      if (res.error && /relation|does not exist|permission denied/i.test(res.error.message || '')) {
        push(`Couldn't load team leave: ${res.error.message}`);
      } else if (res.error) {
        push(`Couldn't load team leave: ${res.error.message}`);
      }
    } catch (err) {
      push(`Couldn't load team leave from Supabase: ${err && err.message ? err.message : err}`);
      return;
    }
    // Backend is the source of truth when it has data; adopt local-only items
    // when it's empty so they sync and can be deleted server-side.
    if (data && data.length) {
      setEntries(data.map(fromRow));
    } else if (data && entriesRef.current.length > 0) {
      const local = entriesRef.current;
      const { error: ie } = await supabase.from('team_leave').upsert(local.map((e) => toRow(e, userId)));
      if (ie) push(`Couldn't upload your team leave: ${ie.message}`);
    } else if (data) {
      setEntries([]);
    }
  }, [backend, push, userId]);

  useEffect(() => {
    if (!backend) return;
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backend, userId]);

  // Realtime sync (own devices only).
  useEffect(() => {
    if (!backend) return;
    const channel = supabase
      .channel('focusly-team-leave')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_leave', filter: `user_id=eq.${userId}` }, refetch)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [backend, userId, refetch]);

  useEffect(() => saveState(TEAM_LEAVE_KEY, entries), [entries]);

  const addLeave = useCallback(
    (data) => {
      const record = {
        id: uid(),
        member: (data.member || '').trim(),
        startDate: data.startDate || null,
        endDate: data.endDate || null,
        reason: data.reason || '',
        note: (data.note || '').trim(),
        coverTasks: data.coverTasks || [],
      };
      if (!record.member) return null;
      setEntries((prev) => [record, ...prev]);
      if (backend) runWrite('add leave', () => supabase.from('team_leave').upsert(toRow(record, userId)));
      return record;
    },
    [backend, userId, runWrite],
  );

  const updateLeave = useCallback(
    (id, patch) => {
      setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
      const target = entriesRef.current.find((e) => e.id === id) || { id };
      if (backend) runWrite('save leave', () => supabase.from('team_leave').update(toRow(target, userId)).eq('id', id));
    },
    [backend, userId, runWrite],
  );

  const deleteLeave = useCallback(
    (id) => {
      setEntries((prev) => prev.filter((e) => e.id !== id));
      if (backend) runWrite('remove leave', () => supabase.from('team_leave').delete().eq('id', id));
    },
    [backend, runWrite],
  );

  /** Toggle "covered" on one task inside a leave record's cover list. */
  const toggleCoverTask = useCallback(
    (leaveId, taskId) => {
      setEntries((prev) => {
        const next = prev.map((e) => {
          if (e.id !== leaveId) return e;
          return { ...e, coverTasks: (e.coverTasks || []).map((c) => (c.id === taskId ? { ...c, done: !c.done } : c)) };
        });
        const target = next.find((e) => e.id === leaveId);
        if (target && backend) {
          supabase.from('team_leave').update({ cover_tasks: target.coverTasks }).eq('id', leaveId).then(({ error }) => {
            if (error) push(`Couldn't update cover task: ${error.message}`);
          });
        }
        return next;
      });
    },
    [backend, push],
  );

  const uniqueMembers = useCallback(() => {
    const seen = new Set();
    return entriesRef.current.filter((e) => !seen.has(e.member.toLowerCase()) && seen.add(e.member.toLowerCase())).map((e) => e.member);
  }, []);

  /** Replace a leave record's cover list (add/remove items) and sync. */
  const replaceCoverTasks = useCallback(
    (leaveId, coverTasks) => {
      setEntries((prev) => prev.map((e) => (e.id === leaveId ? { ...e, coverTasks } : e)));
      if (backend) {
        supabase.from('team_leave').update({ cover_tasks: coverTasks }).eq('id', leaveId).then(({ error }) => {
          if (error) push(`Couldn't update cover list: ${error.message}`);
        });
      }
    },
    [backend, push],
  );

  return {
    entries,
    addLeave,
    updateLeave,
    deleteLeave,
    toggleCoverTask,
    replaceCoverTasks,
    uniqueMembers,
  };
}