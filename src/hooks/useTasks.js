import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { loadState, saveState } from '../utils/storage';
import {
  DEFAULT_LABELS,
  LABELS_KEY,
  SNOOZE_KEY,
  TASKS_KEY,
  uid,
} from '../utils/constants';
import { nextOccurrence } from '../utils/recurrence';
import { todayStr } from '../utils/dates';

function seedTasks() {
  const now = todayStr();
  const inDays = (n) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  };
  return [
    {
      id: uid(),
      title: 'Welcome to Focusly — click a task to edit it',
      notes: 'This is a sample task. Try completing it, or add your own with the + New Task button.',
      dueDate: now,
      dueTime: '09:00',
      priority: 'medium',
      labels: ['lbl-personal'],
      recurrence: null,
      reminder: { enabled: false, minutes: 10, notifiedAt: null },
      completed: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: uid(),
      title: 'Daily standup meeting',
      notes: 'Every weekday at 9:30.',
      dueDate: now,
      dueTime: '09:30',
      priority: 'high',
      labels: ['lbl-work'],
      recurrence: { freq: 'weekdays', interval: 1, weekdays: [], endDate: null },
      reminder: { enabled: true, minutes: 5, notifiedAt: null },
      completed: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: uid(),
      title: 'Renew gym membership',
      notes: 'Monthly recurring bill.',
      dueDate: inDays(3),
      dueTime: null,
      priority: 'low',
      labels: ['lbl-fitness'],
      recurrence: { freq: 'monthly', interval: 1, monthDay: new Date().getDate(), endDate: null },
      reminder: { enabled: false, minutes: 0, notifiedAt: null },
      completed: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: uid(),
      title: 'Plan weekend trip',
      notes: '',
      dueDate: inDays(5),
      dueTime: null,
      priority: 'none',
      labels: ['lbl-personal'],
      recurrence: null,
      reminder: { enabled: false, minutes: 0, notifiedAt: null },
      completed: false,
      createdAt: new Date().toISOString(),
    },
  ];
}

// ---- DB row <-> task object mapping ----
const toRow = (t, userId) => ({
  id: t.id,
  user_id: userId,
  title: t.title,
  notes: t.notes || '',
  due_date: t.dueDate || null,
  due_time: t.dueTime || null,
  priority: t.priority || 'none',
  labels: t.labels || [],
  recurrence: t.recurrence || null,
  reminder: t.reminder || null,
  completed: !!t.completed,
  completed_at: t.completedAt || null,
  created_at: t.createdAt,
});

const fromRow = (r) => ({
  id: r.id,
  title: r.title,
  notes: r.notes || '',
  dueDate: r.due_date,
  dueTime: r.due_time,
  priority: r.priority || 'none',
  labels: r.labels || [],
  recurrence: r.recurrence,
  reminder: r.reminder,
  completed: r.completed,
  completedAt: r.completed_at,
  createdAt: r.created_at,
});

export function useTasks() {
  const { session } = useAuth();
  const userId = session?.user?.id || null;
  const backend = !!supabase && !!userId;

  const [tasks, setTasks] = useState(() => loadState(TASKS_KEY, null));
  const [labels, setLabels] = useState(() => loadState(LABELS_KEY, DEFAULT_LABELS));
  const [snoozed, setSnoozed] = useState(() => loadState(SNOOZE_KEY, []));
  const [toasts, setToasts] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const toastSeq = useRef(0);

  const pushToast = useCallback((message, type = 'info', action = null) => {
    const id = ++toastSeq.current;
    setToasts((prev) => [...prev, { id, message, type, action }]);
    if (!action) {
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    }
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Initial load: from Supabase when authed, otherwise from localStorage.
  useEffect(() => {
    let active = true;
    const loadLocal = () => {
      if (loadState(TASKS_KEY, null) == null) {
        const seeded = seedTasks();
        saveState(TASKS_KEY, seeded);
        if (active) setTasks(seeded);
      } else if (active) {
        setTasks(loadState(TASKS_KEY, null));
      }
    };

    if (!backend) {
      loadLocal();
      if (active) setSyncing(false);
      return;
    }

    setSyncing(true);
    (async () => {
      const { data: t, error: te } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });
      const { data: l, error: le } = await supabase.from('labels').select('*').order('created_at', { ascending: true });
      if (!active) return;

      if (te) pushToast('Could not load tasks: ' + te.message, 'warning');
      if (le) pushToast('Could not load categories: ' + le.message, 'warning');

      const dbTasks = (t || []).map(fromRow);
      const dbLabels = l || [];

      if (dbTasks.length === 0 && dbLabels.length === 0) {
        // First login for this user — seed the demo tasks into the DB.
        const seeded = seedTasks();
        const { error: ie } = await supabase
          .from('tasks')
          .insert(seeded.map((s) => toRow(s, userId)));
        if (!active) return;
        if (ie) {
          pushToast('Could not create starter tasks: ' + ie.message, 'warning');
        } else {
          setTasks(seeded);
        }
      } else {
        setTasks(dbTasks);
      }
      setLabels(dbLabels);
      setSyncing(false);
    })();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backend, userId]);

  // Realtime sync across devices/tabs.
  useEffect(() => {
    if (!backend) return;
    const refetch = async () => {
      const { data: t } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
      const { data: l } = await supabase.from('labels').select('*').order('created_at', { ascending: true });
      if (t) setTasks(t.map(fromRow));
      if (l) setLabels(l);
    };
    const channel = supabase
      .channel('focusly-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` }, refetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'labels', filter: `user_id=eq.${userId}` }, refetch)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [backend, userId]);

  // Local persistence cache.
  useEffect(() => saveState(TASKS_KEY, tasks), [tasks]);
  useEffect(() => saveState(LABELS_KEY, labels), [labels]);
  useEffect(() => saveState(SNOOZE_KEY, snoozed), [snoozed]);

  const persistTask = useCallback(
    (task) => {
      if (!backend) return Promise.resolve();
      return supabase.from('tasks').upsert(toRow(task, userId));
    },
    [backend, userId],
  );

  const persistLabel = useCallback(
    (label) => {
      if (!backend) return Promise.resolve();
      return supabase
        .from('labels')
        .upsert({ id: label.id, user_id: userId, name: label.name, color: label.color });
    },
    [backend, userId],
  );

  const addTask = useCallback(
    (data) => {
      const task = {
        id: uid(),
        completed: false,
        createdAt: new Date().toISOString(),
        reminder: { enabled: false, minutes: 0, notifiedAt: null },
        recurrence: null,
        ...data,
      };
      setTasks((prev) => [task, ...prev]);
      persistTask(task);
      return task;
    },
    [persistTask],
  );

  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;
  const labelsRef = useRef(labels);
  labelsRef.current = labels;

  const updateTask = useCallback(
    (id, patch) => {
      const target = tasksRef.current.find((t) => t.id === id);
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
      if (target) persistTask({ ...target, ...patch });
    },
    [persistTask],
  );

  const deleteTask = useCallback(
    (id) => {
      const target = tasksRef.current.find((t) => t.id === id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
      if (backend) supabase.from('tasks').delete().eq('id', id);
      pushToast('Task deleted', 'info', {
        label: 'Undo',
        fn: () => {
          if (target) {
            setTasks((prev) => [target, ...prev]);
            persistTask(target);
          }
        },
      });
    },
    [backend, persistTask, pushToast],
  );

  const toggleComplete = useCallback(
    (id) => {
      const task = tasksRef.current.find((t) => t.id === id);
      if (!task) return;
      if (task.completed) {
        updateTask(id, { completed: false, completedAt: null });
        return;
      }
      if (task.recurrence && task.recurrence.freq !== 'none') {
        const nextDate = nextOccurrence(task.recurrence, task.dueDate || todayStr());
        setTasks((prev) =>
          prev.map((t) =>
            t.id === id ? { ...t, completed: true, completedAt: new Date().toISOString() } : t,
          ),
        );
        if (backend) supabase.from('tasks').update({ completed: true, completed_at: new Date().toISOString() }).eq('id', id);
        if (nextDate) {
          const next = {
            ...task,
            id: uid(),
            completed: false,
            completedAt: null,
            dueDate: nextDate,
            reminder: task.reminder ? { ...task.reminder, notifiedAt: null } : null,
            createdAt: new Date().toISOString(),
          };
          setTasks((prev) => [next, ...prev]);
          persistTask(next);
        } else {
          pushToast('Series completed — no more occurrences');
        }
      } else {
        updateTask(id, { completed: true, completedAt: new Date().toISOString() });
      }
    },
    [backend, updateTask, persistTask, pushToast],
  );

  const addLabel = useCallback(
    ({ name, color }) => {
      const id = uid();
      const label = { id, name, color };
      setLabels((prev) => [...prev, label]);
      persistLabel(label);
      return id;
    },
    [persistLabel],
  );

  const updateLabel = useCallback(
    (id, patch) => {
      const target = labelsRef.current.find((l) => l.id === id);
      setLabels((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
      if (target) persistLabel({ ...target, ...patch });
    },
    [persistLabel],
  );

  const deleteLabel = useCallback(
    (id) => {
      setLabels((prev) => prev.filter((l) => l.id !== id));
      setTasks((prev) =>
        prev.map((t) => ({ ...t, labels: (t.labels || []).filter((l) => l !== id) })),
      );
      if (backend) supabase.from('labels').delete().eq('id', id);
    },
    [backend],
  );

  const clearCompleted = useCallback(() => {
    const done = tasksRef.current.filter((t) => t.completed);
    if (!done.length) return;
    setTasks((prev) => prev.filter((t) => !t.completed));
    if (backend && done.length) {
      supabase.from('tasks').delete().in('id', done.map((t) => t.id));
    }
    pushToast(`${done.length} completed task${done.length > 1 ? 's' : ''} cleared`);
  }, [backend, pushToast]);

  const snoozeUntil = useCallback((id, dateStr) => {
    setSnoozed((prev) => [...prev.filter((s) => s.id !== id), { id, until: dateStr }]);
  }, []);

  const unsnooze = useCallback((id) => {
    setSnoozed((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return {
    tasks,
    labels,
    toasts,
    snoozed,
    syncing,
    backend,
    addTask,
    updateTask,
    deleteTask,
    toggleComplete,
    addLabel,
    updateLabel,
    deleteLabel,
    clearCompleted,
    snoozeUntil,
    unsnooze,
    pushToast,
    dismissToast,
  };
}
