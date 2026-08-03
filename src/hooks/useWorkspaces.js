import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { loadState, saveState } from '../utils/storage';
import { WORKSPACES_KEY, uid } from '../utils/constants';

export function useWorkspaces(onToast) {
  const { session } = useAuth();
  const userId = session?.user?.id || null;
  const backend = !!supabase && !!userId;

  const [workspaces, setWorkspaces] = useState(() => loadState(WORKSPACES_KEY, []));
  const workspacesRef = useRef(workspaces);
  workspacesRef.current = workspaces;

  const push = useCallback(
    (message) => {
      if (typeof onToast === 'function') onToast(message, 'warning');
      else console.warn(message);
    },
    [onToast],
  );

  const load = useCallback(async () => {
    if (!backend) return;
    const { data, error } = await supabase.from('workspaces').select('*').order('name', { ascending: true });
    if (error) {
      push(`Couldn't load workspaces: ${error.message}`);
      return;
    }
    const db = data || [];
    if (db.length > 0) {
      setWorkspaces(db.map((w) => ({ id: w.id, name: w.name })));
      saveState(WORKSPACES_KEY, db.map((w) => ({ id: w.id, name: w.name })));
    } else if (workspacesRef.current.length > 0) {
      // Backend empty but local has workspaces — adopt them so they persist
      // across devices instead of living only in localStorage.
      const local = workspacesRef.current;
      const { error: ie } = await supabase.from('workspaces').upsert(local.map((w) => ({ user_id: userId, name: w.name })));
      if (ie && ie.code !== '23505') push(`Couldn't upload your workspaces: ${ie.message}`);
    }
  }, [backend, userId, push]);

  useEffect(() => {
    if (!backend) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backend, userId]);

  useEffect(() => {
    if (!backend) return;
    const channel = supabase
      .channel('focusly-workspaces')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workspaces', filter: `user_id=eq.${userId}` }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel).catch(() => {});
    };
  }, [backend, userId, load]);

  useEffect(() => saveState(WORKSPACES_KEY, workspaces), [workspaces]);

  const addWorkspace = useCallback(
    async (name) => {
      const trimmed = (name || '').trim();
      if (!trimmed) return null;
      const existing = workspacesRef.current.find((w) => w.name.toLowerCase() === trimmed.toLowerCase());
      if (existing) return existing;
      const ws = { id: uid(), name: trimmed };
      setWorkspaces((prev) => [...prev, ws].sort((a, b) => a.name.localeCompare(b.name)));
      if (backend) {
        const { error } = await supabase.from('workspaces').insert({ id: ws.id, user_id: userId, name: trimmed });
        if (error) {
          push(`Couldn't save workspace: ${error.message}`);
          setWorkspaces((prev) => prev.filter((w) => w.id !== ws.id));
          return null;
        }
      }
      return ws;
    },
    [backend, userId, push],
  );

  const deleteWorkspace = useCallback(
    async (id) => {
      const target = workspacesRef.current.find((w) => w.id === id);
      setWorkspaces((prev) => prev.filter((w) => w.id !== id));
      if (!backend) return;
      const { data, error } = await supabase.from('workspaces').delete().eq('id', id).select();
      if (error) {
        push(`Couldn't delete workspace: ${error.message}`);
        setWorkspaces((prev) => (target && !prev.some((w) => w.id === id) ? [target, ...prev] : prev));
        return;
      }
      if (!data || data.length === 0) {
        push("Couldn't delete workspace from the server — it may reappear on refresh.");
        setWorkspaces((prev) => (target && !prev.some((w) => w.id === id) ? [target, ...prev] : prev));
      }
    },
    [backend, push],
  );

  return { workspaces, addWorkspace, deleteWorkspace };
}