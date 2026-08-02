export const PRIORITIES = [
  { value: 'none', label: 'No priority', weight: 0 },
  { value: 'low', label: 'Low', weight: 1 },
  { value: 'medium', label: 'Medium', weight: 2 },
  { value: 'high', label: 'High', weight: 3 },
];

export function priorityMeta(value) {
  return PRIORITIES.find((p) => p.value === value) || PRIORITIES[0];
}

export const DEFAULT_LABELS = [
  { id: 'lbl-work', name: 'Work', color: '#6366f1' },
  { id: 'lbl-personal', name: 'Personal', color: '#ec4899' },
  { id: 'lbl-urgent', name: 'Urgent', color: '#f43f5e' },
  { id: 'lbl-fitness', name: 'Fitness', color: '#10b981' },
  { id: 'lbl-home', name: 'Home', color: '#f59e0b' },
  { id: 'lbl-errands', name: 'Errands', color: '#06b6d4' },
];

export const REMINDER_PRESETS = [
  { label: 'At due time', minutes: 0 },
  { label: '5 minutes before', minutes: 5 },
  { label: '10 minutes before', minutes: 10 },
  { label: '30 minutes before', minutes: 30 },
  { label: '1 hour before', minutes: 60 },
  { label: '1 day before', minutes: 1440 },
];

export function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export const THEME_KEY = 'theme';
export const NOTIF_KEY = 'notifications';
export const LABELS_KEY = 'labels';
export const TASKS_KEY = 'tasks';
export const SNOOZE_KEY = 'snoozed';
