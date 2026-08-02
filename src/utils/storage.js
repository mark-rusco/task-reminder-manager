const NS = 'focusly:';

export function loadState(key, fallback) {
  try {
    const raw = localStorage.getItem(NS + key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function saveState(key, value) {
  try {
    localStorage.setItem(NS + key, JSON.stringify(value));
  } catch {
    /* storage unavailable (e.g. private mode) */
  }
}

export function removeState(key) {
  try {
    localStorage.removeItem(NS + key);
  } catch {
    /* ignore */
  }
}
