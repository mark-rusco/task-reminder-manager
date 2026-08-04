// Unified notifications: uses Capacitor local notifications on the APK,
// and falls back to the browser Notification API + in-page events on the web.

let nativeCaps = null;
let capsPromise = null;

async function LocalNotifications() {
  if (!capsPromise) {
    capsPromise = (async () => {
      try {
        const mod = await import('@capacitor/local-notifications');
        return mod?.LocalNotifications ?? null;
      } catch {
        return null;
      }
    })();
  }
  nativeCaps ??= await capsPromise;
  return nativeCaps;
}

export function isNativePlatform() {
  return (
    typeof window !== 'undefined' &&
    window.Capacitor?.isNativePlatform?.() === true
  );
}

/** True when the running platform can schedule foreground/background reminders. */
export async function notificationsSupported() {
  if (!isNativePlatform()) return false;
  const mod = await LocalNotifications();
  return !!mod;
}

let channelReady = false;
async function ensureChannel(mod) {
  if (channelReady || typeof mod?.createChannel !== 'function') return;
  try {
    await mod.createChannel({
      id: 'focusly-reminders',
      name: 'Task reminders',
      description: 'Reminders for your tasks',
      importance: 5,
      visibility: 1,
    });
  } catch {
    /* channel already exists or unsupported — safe to ignore */
  }
  channelReady = true;
}

export async function requestNotificationPermission() {
  const mod = await LocalNotifications();
  if (mod && isNativePlatform()) {
    try {
      await ensureChannel(mod);
      const p = await mod.requestPermissions();
      const perm = p?.permissions?.display ?? p?.display ?? p?.notifications;
      return perm === 'granted' || perm === 'prompt-with-rationale' || perm === 'prompt';
    } catch {
      return false;
    }
  }
  if (typeof Notification === 'undefined') return false;
  if (Notification.permission === 'granted') return true;
  try {
    return (await Notification.requestPermission()) === 'granted';
  } catch {
    return false;
  }
}

/** Stable 31-bit integer id from a string seed (LocalNotifications needs ints). */
function intId(seed) {
  let h = 2166136261;
  const s = String(seed);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 2147483647;
}

const webTimers = new Map();

export async function scheduleNotification({ id, title, body, atMs }) {
  const nid = intId(id);
  const delay = Math.max(0, atMs - Date.now());
  const mod = await LocalNotifications();

  if (mod && isNativePlatform()) {
    try {
      await ensureChannel(mod);
      await mod.schedule({
        notifications: [
          {
            id: nid,
            title,
            body,
            schedule: { at: new Date(atMs), allowWhileIdle: true },
            channelId: 'focusly-reminders',
          },
        ],
      });
      return true;
    } catch {
      return false;
    }
  }

  // Web fallback: browser notification after a timer; also emits an in-app event.
  const fire = () => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        new Notification(title, { body, tag: 'focusly-' + nid });
      } catch {
        /* best-effort */
      }
    }
    window.dispatchEvent(new CustomEvent('focusly:webReminder', { detail: { id, title, body } }));
    webTimers.delete(nid);
  };
  const t = window.setTimeout(fire, delay);
  webTimers.set(nid, t);
  return true;
}

export async function cancelNotification(id) {
  const nid = intId(id);
  const mod = await LocalNotifications();
  if (mod && isNativePlatform()) {
    try {
      await mod.cancel({ notifications: [{ id: nid }] });
    } catch {
      /* best-effort */
    }
    return;
  }
  const t = webTimers.get(nid);
  if (t) {
    window.clearTimeout(t);
    webTimers.delete(nid);
  }
}

export async function cancelAllNotifications() {
  const mod = await LocalNotifications();
  if (mod && isNativePlatform()) {
    try {
      await mod.cancelAll();
    } catch {
      /* best-effort */
    }
    return;
  }
  for (const t of webTimers.values()) window.clearTimeout(t);
  webTimers.clear();
}