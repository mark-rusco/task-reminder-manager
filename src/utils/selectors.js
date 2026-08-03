import dayjs from 'dayjs';
import { BUCKET_ORDER, BUCKET_LABELS, timeBucket } from '../utils/dates';

export function filterTasks(tasks, view, now = dayjs()) {
  const labelId = view.labelId;
  const search = (view.search || '').trim().toLowerCase();

  let list = Array.isArray(tasks) ? tasks : [];
  if (labelId) list = list.filter((t) => (t.labels || []).includes(labelId));
  if (search) {
    list = list.filter(
      (t) =>
        t.title.toLowerCase().includes(search) ||
        (t.notes || '').toLowerCase().includes(search) ||
        (t.labels || []).some((id) => id.toLowerCase().includes(search)),
    );
  }

  switch (view.type) {
    case 'inbox':
      return list.filter((t) => !t.completed);
    case 'today':
      return list.filter((t) => {
        if (t.completed) return false;
        const b = timeBucket(t, now);
        return b === 'overdue' || b === 'today';
      });
    case 'upcoming':
      return list.filter((t) => {
        if (t.completed) return false;
        const b = timeBucket(t, now);
        return b === 'tomorrow' || b === 'week' || b === 'later';
      });
    case 'someday':
      return list.filter((t) => !t.completed && !t.dueDate);
    case 'completed':
      return list.filter((t) => t.completed);
    default:
      return list.filter((t) => !t.completed);
  }
}

export function groupByBucket(tasks, now = dayjs()) {
  const groups = BUCKET_ORDER.map((bucket) => ({ bucket, tasks: [] }));
  for (const task of tasks) {
    const b = timeBucket(task, now);
    const g = groups.find((g) => g.bucket === b) || groups[groups.length - 1];
    g.tasks.push(task);
  }
  // Sort within each group: pinned first, then priority desc, then due time, then created.
  for (const g of groups) {
    g.tasks.sort((a, b) => {
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
      const pw = priorityWeight(b) - priorityWeight(a);
      if (pw !== 0) return pw;
      const at = a.dueTime || '99:99';
      const bt = b.dueTime || '99:99';
      if (at !== bt) return at < bt ? -1 : 1;
      return a.createdAt < b.createdAt ? -1 : 1;
    });
  }
  return groups;
}

function priorityWeight(t) {
  if (t.priority === 'high') return 3;
  if (t.priority === 'medium') return 2;
  if (t.priority === 'low') return 1;
  return 0;
}

export function bucketFor(t) {
  return BUCKET_LABELS[timeBucket(t)];
}