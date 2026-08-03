import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { loadState, saveState } from '../utils/storage';
import { uid } from '../utils/constants';

const toRow = (n, userId) => ({
  id: n.id,
  dashboard_id: n.dashboardId,
  user_id: userId,
  note_date: n.noteDate,
  content: n.content || '',
  created_at: n.createdAt,
});

const fromRow = (r) => ({
  id: r.id,
  dashboardId: r.dashboard_id,
  noteDate: r.note_date,
  content: r.content || '',
  createdAt: r.created_at,
});

export function useDashboardNotes(dashboardId, onToast) {
  const { session } = useAuth();
  const userId = session?.user?.id || null;
  const backend = !!supabase && !!userId && !!dashboardId;

  const storageKey = `dashboard-notes-${dashboardId || 'none'}`;
  const [notes, setNotes] = useState(() => loadState(storageKey, []));
  const notesRef = useRef(notes);
  notesRef.current = notes;

  const push = useCallback(
    (message) => {
      if (typeof onToast === 'function') onToast(message, 'warning');
      else console.warn(message);
    },
    [onToast],
  );

  const sortNotes = useCallback((list) => {
    return [...list].sort((a, b) => {
      const d = (b.noteDate || '').localeCompare(a.noteDate || '');
      if (d !== 0) return d;
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
  }, []);

  const load = useCallback(async () => {
    if (!backend) return;
    const { data, error } = await supabase
      .from('dashboard_notes')
      .select('*')
      .eq('dashboard_id', dashboardId)
      .order('note_date', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) {
      push(`Couldn't load dashboard notes: ${error.message}`);
      return;
    }
    const dbNotes = (data || []).map(fromRow);
    if (dbNotes.length > 0) {
      setNotes(sortNotes(dbNotes));
      saveState(storageKey, sortNotes(dbNotes));
    } else if (notesRef.current.length > 0) {
      // Backend empty but local has notes — adopt them so they persist across
      // devices instead of living only in localStorage.
      const local = notesRef.current;
      const { error: ie } = await supabase
        .from('dashboard_notes')
        .upsert(local.map((n) => toRow(n, userId)));
      if (ie) push(`Couldn't upload your dashboard notes: ${ie.message}`);
    }
  }, [backend, dashboardId, userId, push, sortNotes, storageKey]);

  // Initial load.
  useEffect(() => {
    if (!backend) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backend, dashboardId, userId]);

  // Realtime sync across devices/tabs.
  useEffect(() => {
    if (!backend) return;
    const channel = supabase
      .channel(`focusly-notes-${dashboardId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dashboard_notes', filter: `user_id=eq.${userId}` }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel).catch(() => {});
    };
  }, [backend, dashboardId, userId, load]);

  // Local cache.
  useEffect(() => saveState(storageKey, notes), [notes, storageKey]);

  const addNote = useCallback(
    async ({ noteDate, content }) => {
      const note = {
        id: uid(),
        dashboardId,
        noteDate: noteDate || '',
        content: content || '',
        createdAt: new Date().toISOString(),
      };
      setNotes((prev) => sortNotes([note, ...prev]));
      if (!backend) return note;
      const { error } = await supabase.from('dashboard_notes').insert(toRow(note, userId));
      if (error) {
        push(`Couldn't save note: ${error.message}`);
        setNotes((prev) => prev.filter((n) => n.id !== note.id));
      }
      return note;
    },
    [backend, dashboardId, userId, push, sortNotes],
  );

  const updateNote = useCallback(
    async (id, patch) => {
      const target = notesRef.current.find((n) => n.id === id);
      if (!target) return;
      const next = { ...target, ...patch };
      setNotes((prev) => sortNotes(prev.map((n) => (n.id === id ? next : n))));
      if (!backend) return;
      const { error } = await supabase
        .from('dashboard_notes')
        .update({ note_date: next.noteDate, content: next.content })
        .eq('id', id);
      if (error) {
        push(`Couldn't update note: ${error.message}`);
        setNotes((prev) => sortNotes(prev.map((n) => (n.id === id ? target : n))));
      }
    },
    [backend, push, sortNotes],
  );

  const deleteNote = useCallback(
    async (id) => {
      const target = notesRef.current.find((n) => n.id === id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
      if (!backend) return;
      const { data, error } = await supabase
        .from('dashboard_notes')
        .delete()
        .eq('id', id)
        .select();
      if (error) {
        push(`Couldn't delete note: ${error.message}`);
        setNotes((prev) => (target && !prev.some((n) => n.id === id) ? sortNotes([target, ...prev]) : prev));
        return;
      }
      if (!data || data.length === 0) {
        push("Couldn't delete note from the server — it may reappear on refresh.", 'warning');
        setNotes((prev) => (target && !prev.some((n) => n.id === id) ? sortNotes([target, ...prev]) : prev));
      }
    },
    [backend, push, sortNotes],
  );

  return { notes, addNote, updateNote, deleteNote };
}