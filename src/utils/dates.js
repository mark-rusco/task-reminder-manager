import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

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
