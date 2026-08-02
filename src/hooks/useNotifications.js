import { useCallback, useEffect, useState } from 'react';
import { loadState, saveState } from '../utils/storage';
import { NOTIF_KEY } from '../utils/constants';
import { dueMoment } from '../utils/dates';
import dayjs from 'dayjs';

const ICON_URL =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='#4f46e5' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M9 11l3 3L22 4'/><path d='M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11'/></svg>`,
  );

export function useNotifications({ tasks, now, onFire }) {
  const [prefs, setPrefs] = useState(() => loadState(NOTIF_KEY, { enabled: false, granted: false }));

  useEffect(() => saveState(NOTIF_KEY, prefs), [prefs]);

  const requestPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') {
      setPrefs((p) => ({ ...p, enabled: true }));
      onFire({ title: 'Reminders on', body: 'Browser notifications are not supported — showing in-app reminders.' });
      return;
    }
    if (Notification.permission === 'granted') {
      setPrefs((p) => ({ ...p, enabled: true, granted: true }));
      onFire({ title: 'Reminders on', body: 'You will be notified at your chosen times.' });
      return;
    }
    const perm = await Notification.requestPermission();
    const granted = perm === 'granted';
    setPrefs((p) => ({ ...p, enabled: granted, granted }));
    if (granted) {
      onFire({ title: 'Reminders on', body: 'You will be notified at your chosen times.' });
    } else {
      onFire({ title: 'Reminders blocked', body: 'In-app reminders will still appear while Focusly is open.' });
    }
  }, [onFire]);

  const toggleEnabled = useCallback(() => {
    setPrefs((p) => {
      if (!p.enabled && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        return { ...p, enabled: true, granted: true };
      }
      return { ...p, enabled: !p.enabled };
    });
  }, []);

  // Reminder scheduler: fire once per task per due instance.
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
        onFire({
          title: task.title,
          body: due.format('ddd, MMM D · h:mm A'),
          taskId: task.id,
        });
        // Mark notified without waiting for round-trip state update.
        window.dispatchEvent(
          new CustomEvent('focusly:markNotified', { detail: { taskId: task.id, at: new Date().toISOString() } }),
        );
      }
    }
  }, [tasks, now, prefs.enabled, onFire]);

  return { prefs, requestPermission, toggleEnabled };
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
