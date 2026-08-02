import { LILO_DEFAULTS, liloDefaultStatus, uid } from './constants';

/** Returns the ISO day list for a 'YYYY-MM' month. */
export function monthDays(monthStr) {
  const [y, m] = monthStr.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  const days = [];
  for (let d = 1; d <= last; d++) {
    const date = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({
      date,
      day: d,
      weekday: new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' }),
      weekend: [0, 6].includes(new Date(date + 'T00:00:00').getDay()),
    });
  }
  return days;
}

/** Builds default entries for every day of a month. */
export function buildMonthEntries(monthStr, overrides = {}) {
  return monthDays(monthStr).map(({ date }) => ({
    id: uid(),
    month: monthStr,
    date,
    brgType: overrides.brgType ?? LILO_DEFAULTS.brgType,
    schedType: overrides.schedType ?? LILO_DEFAULTS.schedType,
    eid: overrides.eid ?? LILO_DEFAULTS.eid,
    status: overrides.status ?? liloDefaultStatus(date),
    startTime: overrides.startTime ?? LILO_DEFAULTS.startTime,
    endTime: overrides.endTime ?? LILO_DEFAULTS.endTime,
    location: overrides.location ?? LILO_DEFAULTS.location,
    remarks: overrides.remarks ?? LILO_DEFAULTS.remarks,
  }));
}

/** True when the given entry field differs from its default (used for highlighting). */
export function isModified(field, entry) {
  switch (field) {
    case 'status':
      return entry.status !== liloDefaultStatus(entry.date);
    case 'remarks':
      return (entry.remarks || '') !== LILO_DEFAULTS.remarks;
    default:
      return entry[field] !== LILO_DEFAULTS[field];
  }
}

/** '04:00 PM' -> '16:00' */
export function to24h(ap) {
  if (!ap) return '';
  const m = String(ap).match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return ap;
  let h = Number(m[1]) % 12;
  if (/PM/i.test(m[3])) h += 12;
  return `${String(h).padStart(2, '0')}:${m[2]}`;
}

/** '16:00' -> '04:00 PM' */
export function to12h(t24) {
  if (!t24) return '';
  const m = String(t24).match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return t24;
  let h = Number(m[1]);
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${String(h).padStart(2, '0')}:${m[2]} ${ap}`;
}

function quote(v) {
  return `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
}

function formatMDY(iso) {
  const [y, m, d] = iso.split('-');
  return `${m}/${d}/${y}`;
}

/** Renders the month as CSV in the exact template format. */
export function liloToCSV(entries) {
  const header = 'BRG Type,Sched Type,EID,Date,Status,Start Time,End Time,Location,Remarks';
  const rows = [...entries]
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((e) =>
      [e.brgType, e.schedType, e.eid, formatMDY(e.date), e.status, e.startTime, e.endTime, e.location, e.remarks || '']
        .map(quote)
        .join(','),
    );
  return [header, ...rows].join('\r\n');
}

/** '2026-08' -> 'August 2026' */
export function formatMonth(monthStr) {
  const [y, m] = monthStr.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
