import { useCallback, useState } from 'react';
import { loadState, saveState } from '../utils/storage';
import { DEFAULT_TRACKER_CONFIG, normalizeConfig, TRACKER_KEY } from '../utils/trackers';

export function useTrackerConfig() {
  const [config, setConfig] = useState(() => normalizeConfig(loadState(TRACKER_KEY, null)));

  const updateConfig = useCallback((patch) => {
    setConfig((prev) => {
      const next = normalizeConfig({ ...prev, ...patch });
      saveState(TRACKER_KEY, next);
      return next;
    });
  }, []);

  return { config, updateConfig };
}

/** Fresh default used when the user wants to reset. */
export function defaultTrackerConfig() {
  return DEFAULT_TRACKER_CONFIG;
}