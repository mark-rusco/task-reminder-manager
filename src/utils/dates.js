import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { parseShiftSchedule, to24h } from './lilo';

dayjs.extend(customParseFormat);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

export const DAY_MS = 24 * 60 * 60 * 1000;

export function todayStr() {
  return dayjs().format('YYYY-MM-DD');
}

export function todayLocal() {
  return dayjs().startOf('day');
}

export function toDateStr(d) {
  return d ? dayjs(d).format('YYYY-MM-DD') : null;
}

/** Time buckets for the "categorization by time" feature. */
export function timeBucket(task, now = dayjs()) {
  if (!task.dueDate) return 'someday';
  const due = dayjs(task.dueDate).startOf('day');
  const today = now.startOf('day');
  const diff = due.diff(today, 'day');
  if (diff < 0) return 'overdue';
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  if (due.isSameOrBefore(today.add(6, 'day'), 'day')) return 'week';
  return 'later';
}

export const BUCKET_LABELS = {
  overdue: 'Overdue',
  today: 'Today',
  tomorrow: 'Tomorrow',
  week: 'This Week',
  later: 'Later',
  someday: 'No Due Date',
};

export const BUCKET_ORDER = ['overdue', 'today', 'tomorrow', 'week', 'later', 'someday'];

export function isOverdue(task, now = dayjs()) {
  if (task.completed || !task.dueDate) return false;
  return dayjs(task.dueDate).startOf('day').isBefore(now.startOf('day'));
}

export function isDueToday(task, now = dayjs()) {
  if (task.completed || !task.dueDate) return false;
  return dayjs(task.dueDate).startOf('day').isSame(now.startOf('day'));
}

export function isDueTomorrow(task, now = dayjs()) {
  if (task.completed || !task.dueDate) return false;
  return dayjs(task.dueDate).startOf('day').isSame(now.add(1, 'day').startOf('day'));
}

export function isThisWeek(task, now = dayjs()) {
  if (task.completed || !task.dueDate) return false;
  const due = dayjs(task.dueDate).startOf('day');
  const today = now.startOf('day');
  return due.isAfter(today.add(1, 'day')) && due.isSameOrBefore(today.add(7, 'day'));
}

export function formatDueDate(dateStr) {
  if (!dateStr) return '';
  const d = dayjs(dateStr);
  const today = todayLocal();
  if (d.isSame(today, 'day')) return 'Today';
  if (d.isSame(today.add(1, 'day'), 'day')) return 'Tomorrow';
  if (d.isSame(today.subtract(1, 'day'), 'day')) return 'Yesterday';
  if (d.year() === dayjs().year()) return d.format('ddd, MMM D');
  return d.format('ddd, MMM D, YYYY');
}

export function formatDueDateTime(dateStr, timeStr) {
  let out = formatDueDate(dateStr);
  if (dateStr && timeStr) out += ` at ${timeStr}`;
  return out;
}

/** Full due datetime as a dayjs object, or null. */
export function dueMoment(task) {
  if (!task.dueDate) return null;
  const base = dayjs(task.dueDate);
  if (task.dueTime) {
    const [h, m] = task.dueTime.split(':').map(Number);
    return base.hour(h).minute(m).second(0).millisecond(0);
  }
  return base.hour(23).minute(59).second(59).millisecond(0);
}

export function timeUntilLabel(moment) {
  if (!moment) return '';
  const now = dayjs();
  const mins = moment.diff(now, 'minute');
  if (mins <= 0) return 'Due now';
  if (mins < 60) return `in ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `in ${hours}h`;
  const days = Math.floor(hours / 24);
  return `in ${days}d`;
}

export function greeting(now = dayjs()) {
  const h = now.hour();
  if (h < 5) return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/** Minutes since midnight for a 'HH:MM' 24h string. */
function minutesOfDay(t24) {
  const m = String(t24).match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/**
 * Shift-aware "now". When the user's shift schedule crosses midnight
 * (e.g. "04:00 PM - 01:00 AM") and it is still before the shift's end time
 * plus an overtime allowance, the current workday has not rolled over yet —
 * tasks due "yesterday" stay in Today instead of flipping to Overdue.
 */
export function shiftNow(now = dayjs(), shiftSchedule, overtimeMin = 0) {
  const shift = parseShiftSchedule(shiftSchedule);
  if (!shift) return now;
  const start = minutesOfDay(to24h(shift.startTime));
  const end = minutesOfDay(to24h(shift.endTime));
  if (start == null || end == null) return now;
  // Same-day shift (end after start) rolls over at midnight as usual.
  if (end >= start) return now;
  const nowMin = now.hour() * 60 + now.minute();
  const cutoff = end + Math.max(0, overtimeMin);
  if (nowMin < cutoff) {
    // Still inside the overnight shift (plus overtime grace) → previous day.
    return now.subtract(1, 'day');
  }
  return now;
}

/**
 * Effective "today" start respecting the shift window. Tasks due on this
 * date should remain pending. When an overnight shift + overtime allowance
 * is still in progress, the workday is the previous calendar day.
 */
export function effectiveToday(now = dayjs(), shiftSchedule, overtimeMin = 0) {
  return shiftNow(now, shiftSchedule, overtimeMin).startOf('day');
}
