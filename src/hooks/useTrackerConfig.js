import { useCallback } from 'react';
import { useSettings } from '../context/SettingsContext';
import { DEFAULT_TRACKER_CONFIG, normalizeConfig } from '../utils/trackers';

export function useTrackerConfig() {
  const { settings, setSetting } = useSettings();
  const config = normalizeConfig(settings.tracker);

  const updateConfig = useCallback(
    (patch) => {
      setSetting('tracker', (prev) => normalizeConfig({ ...(prev || {}), ...patch }));
    },
    [setSetting],
  );

  return { config, updateConfig };
}

/** Fresh default used when the user wants to reset. */
export function defaultTrackerConfig() {
  return DEFAULT_TRACKER_CONFIG;
}