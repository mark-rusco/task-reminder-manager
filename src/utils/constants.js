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

export const TASK_TYPES = [
  { value: 'task', label: 'Task' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'refresh', label: 'Refresh' },
];

export const DASHBOARD_STATUSES = [
  { value: 'planning', label: 'Planning', color: '#94a3b8' },
  { value: 'in-progress', label: 'In Progress', color: '#f59e0b' },
  { value: 'in-review', label: 'In Review', color: '#8b5cf6' },
  { value: 'published', label: 'Published', color: '#10b981' },
  { value: 'deprecated', label: 'Deprecated', color: '#f43f5e' },
];

export function dashboardStatusMeta(value) {
  return DASHBOARD_STATUSES.find((s) => s.value === value) || DASHBOARD_STATUSES[0];
}

export const DASHBOARD_TYPES = [
  { value: 'powerbi', label: 'Power BI Dashboard', color: '#f2c811', icon: 'bar-chart' },
  { value: 'excel', label: 'Excel', color: '#217346', icon: 'file-spreadsheet' },
  { value: 'sharepoint', label: 'SharePoint Folder', color: '#0078d4', icon: 'folder' },
];

/** Fallback lookup used when the DB-backed dashboard type list isn't loaded. */
export function dashboardTypeMeta(value) {
  return DASHBOARD_TYPES.find((t) => t.value === value) || DASHBOARD_TYPES[0];
}

export function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export const SETTINGS_KEY = 'user-settings';
export const THEME_KEY = 'theme';
export const NOTIF_KEY = 'notifications';
export const LABELS_KEY = 'labels';
export const TASKS_KEY = 'tasks';
export const DASHBOARDS_KEY = 'dashboards';
export const SNOOZE_KEY = 'snoozed';
export const LILO_KEY = 'lilo';
export const LILO_SUBMISSIONS_KEY = 'lilo-submissions';
export const WORKSPACES_KEY = 'workspaces';
export const TEAM_LEAVE_KEY = 'team-leave';
/** Set once a user's tasks have been loaded/uploaded to the backend, so the
 *  app never re-seeds demo tasks for an established account (which would
 *  resurrect deleted tasks on refresh). */
export const ONBOARDED_KEY = 'onboarded';
/** Same guard for the dashboards inventory. */
export const DASHBOARDS_ONBOARDED_KEY = 'dashboards-onboarded';

/** Shared stable UUID used by the demo dashboard + its linked sample meeting. */
export const DEMO_DASHBOARD_ID = '00000000-0000-4000-8000-000000000001';

// ---- LILO Tracker ----

export const LILO_STATUSES = ['Scheduled', 'Rest Day', 'PTO', 'Sick'];

export const LILO_LOCATIONS = ['WFH', 'Office - Manila', 'Office - Muntinlupa'];

export const LILO_DEFAULTS = {
  brgType: 'Non-BAU BRG',
  schedType: '5 X 9',
  eid: 'mark.rusco',
  startTime: '04:00 PM',
  endTime: '01:00 AM',
  location: 'WFH',
  remarks: '',
};

/** Rest day on weekends, scheduled on weekdays. */
export function liloDefaultStatus(dateISO) {
  const d = new Date(dateISO + 'T00:00:00');
  const day = d.getDay();
  return day === 0 || day === 6 ? 'Rest Day' : 'Scheduled';
}

// ---- Team Leave Tracker ----

export const TEAM_LEAVE_REASONS = ['PTO', 'Sick', 'Training', 'Personal', 'Holiday', 'Other'];

/** True if the leave window includes `todayISO` (a date string). */
export function teamLeaveActive(leave, todayISO) {
  const s = leave.startDate || leave.start_date;
  const e = leave.endDate || leave.end_date;
  if (!s) return false;
  if (!e) return s <= todayISO;
  return s <= todayISO && todayISO <= e;
}
