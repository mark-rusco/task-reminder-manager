import dayjs from 'dayjs';

export const RECURRENCE_FREQS = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekdays', label: 'Every weekday' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'custom', label: 'Custom interval' },
];

export const WEEKDAYS = [
  { value: 1, short: 'Mo', long: 'Monday' },
  { value: 2, short: 'Tu', long: 'Tuesday' },
  { value: 3, short: 'We', long: 'Wednesday' },
  { value: 4, short: 'Th', long: 'Thursday' },
  { value: 5, short: 'Fr', long: 'Friday' },
  { value: 6, short: 'Sa', long: 'Saturday' },
  { value: 0, short: 'Su', long: 'Sunday' },
];

export const DEFAULT_RECURRENCE = () => ({
  freq: 'none',
  interval: 1,
  weekdays: [],
  endDate: null,
});

export function hasRecurrence(recurrence) {
  return !!recurrence && recurrence.freq && recurrence.freq !== 'none';
}

/**
 * Compute the next occurrence of a recurring task from a reference date.
 * Returns a 'YYYY-MM-DD' string or null if the recurrence has ended.
 */
export function nextOccurrence(recurrence, fromDateStr) {
  if (!hasRecurrence(recurrence)) return null;
  const from = dayjs(fromDateStr);
  const interval = Math.max(1, Number(recurrence.interval) || 1);
  let next;

  switch (recurrence.freq) {
    case 'daily':
      next = from.add(interval, 'day');
      break;
    case 'weekdays': {
      next = from.add(1, 'day');
      while (next.day() === 0 || next.day() === 6) next = next.add(1, 'day');
      break;
    }
    case 'weekly': {
      if (recurrence.weekdays && recurrence.weekdays.length) {
        // Advance to next occurrence of any selected weekday.
        const selected = new Set(recurrence.weekdays.map((d) => Number(d)));
        for (let i = 1; i <= 8; i++) {
          const cand = from.add(i, 'day');
          if (selected.has(cand.day())) {
            next = cand;
            break;
          }
        }
        if (!next) next = from.add(interval * 7, 'day');
      } else {
        next = from.add(interval * 7, 'day');
      }
      break;
    }
    case 'monthly': {
      next = from.add(interval, 'month');
      const anchorDay = Number(recurrence.monthDay) || from.date();
      const clamped = Math.min(anchorDay, next.daysInMonth());
      next = next.date(clamped);
      break;
    }
    case 'yearly':
      next = from.add(interval, 'year');
      break;
    case 'custom':
      next = from.add(interval, 'day');
      break;
    default:
      return null;
  }

  if (recurrence.endDate && next.isAfter(dayjs(recurrence.endDate))) {
    return null;
  }
  return next.format('YYYY-MM-DD');
}

/** Human-readable description of a recurrence rule. */
export function describeRecurrence(recurrence) {
  if (!hasRecurrence(recurrence)) return '';
  const interval = Math.max(1, Number(recurrence.interval) || 1);
  switch (recurrence.freq) {
    case 'daily':
      return interval === 1 ? 'Repeats daily' : `Repeats every ${interval} days`;
    case 'weekdays':
      return 'Repeats every weekday';
    case 'weekly':
      if (recurrence.weekdays && recurrence.weekdays.length) {
        const days = WEEKDAYS.filter((d) => recurrence.weekdays.includes(d.value))
          .map((d) => d.long)
          .join(', ');
        return interval === 1 ? `Repeats weekly on ${days}` : `Repeats every ${interval} weeks on ${days}`;
      }
      return interval === 1 ? 'Repeats weekly' : `Repeats every ${interval} weeks`;
    case 'monthly': {
      const day = Number(recurrence.monthDay) || 'day';
      return interval === 1 ? `Repeats monthly on day ${day}` : `Repeats every ${interval} months on day ${day}`;
    }
    case 'yearly':
      return interval === 1 ? 'Repeats yearly' : `Repeats every ${interval} years`;
    case 'custom':
      return `Repeats every ${interval} day${interval > 1 ? 's' : ''}`;
    default:
      return '';
  }
}
