import { useCallback, useEffect, useRef, useState } from 'react';
import { loadState, saveState } from '../utils/storage';
import { useSettings } from '../context/SettingsContext';
import { uid } from '../utils/constants';
import { playAlarmDouble, startRepeatAlarm, stopRepeatAlarm, primeAudio } from '../utils/audio';

const STORE = 'focus:timer';
const PRESETS_STORE = 'focus:presets';

export const DEFAULT_PRESETS = [
  { id: 'p15', label: 'Quick focus', minutes: 15 },
  { id: 'p25', label: 'Focus', minutes: 25 },
  { id: 'p50', label: 'Deep work', minutes: 50 },
  { id: 'p90', label: 'Extended', minutes: 90 },
];

const defaultTimer = () => ({
  durationMs: 25 * 60 * 1000,
  remainingMs: 25 * 60 * 1000,
  running: false,
  endAt: null,
  alarm: 'double',
  notify: true,
});

export function formatMs(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * Global focus timer. State is persisted to localStorage so it keeps running
 * across page navigations AND browser refreshes.
 *
 * @param {Function} [onComplete]  invoked (only when `notify` is on) when a session ends.
 */
export function useFocusTimer(onComplete) {
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const { settings, setSetting } = useSettings();

  const [presets, setPresets] = useState(() => {
    const synced = settings.focus?.presets;
    if (Array.isArray(synced) && synced.length) return synced;
    return loadState(PRESETS_STORE, DEFAULT_PRESETS);
  });
  const [state, setState] = useState(() => ({ ...defaultTimer(), ...loadState(STORE, null) }));
  const [alarming, setAlarming] = useState(false);

  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => saveState(PRESETS_STORE, presets), [presets]);
  useEffect(() => setSetting('focus', (prev) => ({ ...(prev || {}), presets })), [presets, setSetting]);
  useEffect(() => saveState(STORE, state), [state]);
  useEffect(() => () => stopRepeatAlarm(), []);

  const complete = useCallback(() => {
    setState((prev) => ({ ...prev, running: false, remainingMs: 0, endAt: null }));
    setAlarming(true);
    if (stateRef.current.alarm === 'repeat') startRepeatAlarm();
    else playAlarmDouble();
    if (stateRef.current.notify) onCompleteRef.current?.();
  }, []);

  // If the tab was closed mid-session and the end time already passed, finish now.
  useEffect(() => {
    const s = stateRef.current;
    if (s.running && s.endAt && Date.now() >= new Date(s.endAt).getTime()) {
      complete();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Countdown ticker (endAt-based for accuracy across refresh).
  useEffect(() => {
    if (!state.running || !state.endAt) return;
    const id = window.setInterval(() => {
      const remain = Math.max(0, new Date(state.endAt).getTime() - Date.now());
      if (remain <= 0) {
        complete();
      } else {
        setState((prev) => (prev.running ? { ...prev, remainingMs: remain } : prev));
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [state.running, state.endAt, complete]);

  const start = useCallback(() => {
    primeAudio();
    stopRepeatAlarm();
    setAlarming(false);
    setState((prev) => {
      const base = prev.remainingMs > 0 ? prev.remainingMs : prev.durationMs;
      return { ...prev, running: true, endAt: new Date(Date.now() + base).toISOString(), remainingMs: base };
    });
  }, []);

  const pause = useCallback(() => {
    setState((prev) => {
      if (!prev.running || !prev.endAt) return prev;
      return {
        ...prev,
        running: false,
        remainingMs: Math.max(0, new Date(prev.endAt).getTime() - Date.now()),
        endAt: null,
      };
    });
  }, []);

  const reset = useCallback(() => {
    stopRepeatAlarm();
    setAlarming(false);
    setState((prev) => ({ ...prev, running: false, endAt: null, remainingMs: prev.durationMs }));
  }, []);

  const stopAlarm = useCallback(() => {
    stopRepeatAlarm();
    setAlarming(false);
  }, []);

  const setMinutes = useCallback((minutes) => {
    const ms = Math.max(1, Math.round(minutes)) * 60 * 1000;
    stopRepeatAlarm();
    setAlarming(false);
    setState((prev) =>
      prev.running ? prev : { ...prev, durationMs: ms, remainingMs: ms, endAt: null },
    );
  }, []);

  const addPreset = useCallback((label, minutes) => {
    const mins = Math.round(minutes);
    if (!(mins > 0) || mins > 1440) return false;
    setPresets((prev) => [
      ...prev,
      { id: uid(), label: label.trim() || `${mins} min`, minutes: mins },
    ]);
    setMinutes(mins);
    return true;
  }, [setMinutes]);

  const removePreset = useCallback((id) => {
    setPresets((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const setAlarmStyle = useCallback((alarm) => setState((prev) => ({ ...prev, alarm })), []);
  const setNotify = useCallback((notify) => setState((prev) => ({ ...prev, notify })), []);

  return {
    state,
    presets,
    alarming,
    start,
    pause,
    reset,
    stopAlarm,
    setMinutes,
    addPreset,
    removePreset,
    setAlarmStyle,
    setNotify,
  };
}
