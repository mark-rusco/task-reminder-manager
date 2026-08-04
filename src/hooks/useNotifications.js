import { useCallback, useEffect, useRef, useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { dueMoment } from '../utils/dates';
import { uid } from '../utils/constants';
import {
  notificationsSupported,
  requestNotificationPermission,
  scheduleNotification,
  cancelNotification,
  cancelAllNotifications,
} from '../lib/notify';
import dayjs from 'dayjs';

const ICON_URL =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='#4f46e5' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M9 11l3 3L22 4'/><path d='M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11'/></svg>`,
  );

/** Next occurrence of `hour`:00 today (or tomorrow if already past). */
function nextAtHour(hour = 16) {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
  return d.getTime();
}

export function useNotifications({ tasks, now, onFire, teamLeaves }) {
  const { settings, setSetting } = useSettings();
  const prefs = settings.notifications || { enabled: false, granted: false };
  const [snoozes, setSnoozes] = useState([]);
  const snoozesRef = useRef(snoozes);
  snoozesRef.current = snoozes;
  const nativeRef = useRef(false);

  const setPrefs = useCallback(
    (updater) => {
      setSetting('notifications', (prev) => {
        const base = prev || { enabled: false, granted: false };
        return typeof updater === 'function' ? updater(base) : updater;
      });
    },
    [setSetting],
  );

  // Detect native (Capacitor) notification support once.
  useEffect(() => {
    let active = true;
    notificationsSupported().then((ok) => {
      if (active) nativeRef.current = ok;
    });
    return () => {
      active = false;
    };
  }, []);

  const requestPermission = useCallback(async () => {
    const ok = await requestNotificationPermission();
    setPrefs((p) => ({ ...p, enabled: true, granted: ok }));
    if (ok) onFire({ title: 'Reminders on', body: 'You will be notified at your chosen times.' });
    else onFire({ title: 'Reminders', body: 'In-app reminders will still appear while Focusly is open.' });
  }, [setPrefs, onFire]);

  const toggleEnabled = useCallback(() => {
    setPrefs((p) => {
      if (!p.enabled && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        return { ...p, enabled: true, granted: true };
      }
      return { ...p, enabled: !p.enabled };
    });
  }, []);

  // ---- In-app reminder loop (fires once per task per due instance) ----
  useEffect(() => {
    if (!prefs.enabled) return;
    const nowMs = now.valueOf();
    for (const task of tasks) {
      if (task.completed) continue;
      if (!task.reminder || !task.reminder.enabled) continue;
      if (!task.dueDate) continue;
      const due = dueMoment(task);
      if (!due) continue;
      const minutes = Number(task.reminder.minutes) || 0;
      const remindAt = due.subtract(minutes, 'minute');
      const notifiedAt = task.reminder.notifiedAt;
      if (notifiedAt) continue;
      if (nowMs >= remindAt.valueOf() && nowMs <= due.add(30, 'minute').valueOf()) {
        onFire({ title: task.title, body: due.format('ddd, MMM D · h:mm A'), taskId: task.id });
        // Mark notified without waiting for round-trip state update.
        window.dispatchEvent(
          new CustomEvent('focusly:markNotified', { detail: { taskId: task.id, at: new Date().toISOString() } }),
        );
      }
    }
  }, [tasks, now, prefs.enabled, onFire]);

  // ---- Native scheduler: keep local notifications in sync with tasks/snoozes ----
  useEffect(() => {
    if (!nativeRef.current) return;
    let active = true;
    (async () => {
      await cancelAllNotifications();
      if (!active) return;
      if (!prefs.enabled) return;
      for (const task of tasks) {
        if (task.completed) continue;
        if (!task.reminder?.enabled) continue;
        if (!task.dueDate) continue;
        if (task.reminder.notifiedAt) continue;
        const due = dueMoment(task);
        if (!due) continue;
        const remindAt = due.subtract(Number(task.reminder.minutes) || 0, 'minute');
        await scheduleNotification({
          id: 'task-' + task.id,
          title: task.title,
          body: 'Due ' + due.format('ddd, MMM D · h:mm A'),
          atMs: remindAt.valueOf(),
        });
      }
      for (const s of snoozesRef.current) {
        if (s.at <= Date.now()) continue;
        await scheduleNotification({ id: s.id, title: s.title, body: s.body, atMs: s.at });
      }
    })();
    return () => {
      active = false;
    };
  }, [prefs.enabled, tasks, snoozes]);

  // ---- Snoozed reminders fire when their time arrives (web + foreground) ----
  useEffect(() => {
    const nowMs = now.valueOf();
    const due = snoozes.filter((s) => s.at <= nowMs);
    if (!due.length) return;
    for (const s of due) {
      onFire({ title: s.title, body: s.body, taskId: s.taskId });
      cancelNotification(s.id);
    }
    setSnoozes((prev) => prev.filter((s) => s.at > nowMs));
  }, [now, snoozes, onFire]);

  // ---- Team-leave reminders: fire once on the day a teammate's leave starts ----
  const leaveNotifiedRef = useRef({});
  useEffect(() => {
    if (!prefs.enabled) return;
    const today = now.format('YYYY-MM-DD');
    const seen = leaveNotifiedRef.current;
    // Drop flags from previous days so renewed leaves can remind again.
    for (const k of Object.keys(seen)) {
      if (seen[k] !== today) delete seen[k];
    }
    for (const lv of teamLeaves || []) {
      if (!lv.startDate || lv.startDate !== today) continue;
      const key = `${lv.id}:${today}`;
      if (seen[key]) continue;
      seen[key] = today;
      onFire({ title: `${lv.member} is on leave today`, body: 'Check what needs to be covered.' });
    }
  }, [teamLeaves, now, prefs.enabled, onFire]);

  /** Snooze a task reminder for `minutes` (or "later today"). */
  const snooze = useCallback(
    (task, minutes) => {
      const at = minutes === 'later-today' ? nextAtHour(16) : Date.now() + Number(minutes) * 60000;
      const entry = {
        id: 'snooze-' + uid(),
        taskId: task.id,
        title: task.title,
        body: minutes === 'later-today' ? 'Reminder snoozed to later today' : `Snoozed ${minutes} min`,
        at,
      };
      setSnoozes((prev) => [...prev, entry]);
      // Stop the original reminder from re-firing.
      window.dispatchEvent(
        new CustomEvent('focusly:markNotified', { detail: { taskId: task.id, at: new Date().toISOString() } }),
      );
      if (nativeRef.current) scheduleNotification({ id: entry.id, title: entry.title, body: entry.body, atMs: at });
      return at;
    },
    [],
  );

  return { prefs, requestPermission, toggleEnabled, snooze };
}

export function showSystemNotification(title, body) {
  if (typeof Notification === 'undefined') return;
  if (Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, icon: ICON_URL, tag: `focusly-${Date.now()}` });
  } catch {
    /* some browsers throw in worker contexts */
  }
}