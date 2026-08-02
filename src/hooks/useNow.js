import { useEffect, useState } from 'react';
import dayjs from 'dayjs';

/** Ticks periodically so due/overdue states stay fresh. */
export function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(() => dayjs());
  useEffect(() => {
    const t = window.setInterval(() => setNow(dayjs()), intervalMs);
    return () => window.clearInterval(t);
  }, [intervalMs]);
  return now;
}
