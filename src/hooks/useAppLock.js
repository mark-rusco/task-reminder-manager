import { useCallback, useEffect, useRef, useState } from 'react';

const KEY = 'app-lock';

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    const c = raw ? JSON.parse(raw) : {};
    return { enabled: !!c.enabled, pin: c.pin || '' };
  } catch {
    return { enabled: false, pin: '' };
  }
}

function save(config) {
  try {
    localStorage.setItem(KEY, JSON.stringify(config));
  } catch {
    /* best-effort */
  }
}

let bio = null;
let bioP = null;
function NativeBiometric() {
  if (!bioP) {
    bioP = (async () => {
      try {
        const m = await import('capacitor-native-biometric');
        bio = m?.NativeBiometric ?? null;
      } catch {
        bio = null;
      }
      return bio;
    })();
  }
  return bioP;
}

async function biometricAvailable() {
  const nb = await NativeBiometric();
  if (!nb) return false;
  try {
    const r = await nb.isAvailable();
    return !!r?.isAvailable;
  } catch {
    return false;
  }
}

async function authenticateBiometric() {
  const nb = await NativeBiometric();
  if (!nb) return false;
  try {
    await nb.authenticate({
      title: 'Unlock Focusly',
      subtitle: 'Verify to open the app',
      reasonText: 'Authenticate to access your tasks',
      cancelButtonText: 'Use PIN',
    });
    return true;
  } catch {
    return false;
  }
}

/** Simple convenience lock (device). Storage is local — treat it as a screen lock, not encryption. */
export function useAppLock() {
  const [config, setConfig] = useState(() => load());
  const [locked, setLocked] = useState(() => config.enabled);
  const [bioReady, setBioReady] = useState(false);

  useEffect(() => {
    let active = true;
    biometricAvailable().then((ok) => active && setBioReady(ok));
    return () => {
      active = false;
    };
  }, []);

  const setConfigSafe = useCallback((next) => {
    setConfig(next);
    save(next);
  }, []);

  const enable = useCallback(
    (pin) => {
      setConfigSafe({ enabled: true, pin: pin || '' });
    },
    [setConfigSafe],
  );

  const disable = useCallback(() => {
    setConfigSafe({ enabled: false, pin: '' });
    setLocked(false);
  }, [setConfigSafe]);

  const lockNow = useCallback(() => {
    if (config.enabled) setLocked(true);
  }, [config.enabled]);

  /** Returns true if unlocked. Tries biometric when available, else verifies PIN. */
  const unlock = useCallback(
    async (pin) => {
      if (bioReady) {
        const ok = await authenticateBiometric();
        if (ok) {
          setLocked(false);
          return true;
        }
      }
      if (config.pin && pin === config.pin) {
        setLocked(false);
        return true;
      }
      return false;
    },
    [bioReady, config.pin],
  );

  return { enabled: config.enabled, hasBio: bioReady, locked, enable, disable, lockNow, unlock };
}