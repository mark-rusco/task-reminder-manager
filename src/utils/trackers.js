import { LILO_LOCATIONS } from './constants';

export const TRACKER_KEY = 'tracker-config';

/** Office/RTO locations are the non-WFH options in LILO. */
export const OFFICE_LOCATIONS = LILO_LOCATIONS.filter((l) => l !== 'WFH' && l !== 'Rest Day');

/**
 * Tracker configuration.
 * - RTO: number of office (return-to-office) days required, per month or per week.
 * - Leaves: max PTO and Sick days allowed per month OR per fiscal year.
 *   With 'year' period, the count resets at the end of the fiscal year
 *   (i.e. the day before `fiscalYearMonth` of the next year). Exceeding a
 *   limit is "over".
 */
export const DEFAULT_TRACKER_CONFIG = {
  rtoEnabled: true,
  rtoPeriod: 'month', // 'month' | 'week'
  rtoTarget: 8,
  rtoLocations: [...OFFICE_LOCATIONS],
  leavePeriod: 'year', // 'month' | 'year'
  fiscalYearMonth: 1, // 1-12, month the fiscal year starts on (e.g. 9 for Sep 1)
  overtimeAllowance: 60, // minutes past shift end that today's tasks stay pending
  ptoEnabled: true,
  ptoLimit: 12,
  sickEnabled: true,
  sickLimit: 12,
};

export function normalizeConfig(cfg) {
  const d = DEFAULT_TRACKER_CONFIG;
  const c = cfg && typeof cfg === 'object' ? cfg : {};
  const locations = Array.isArray(c.rtoLocations) && c.rtoLocations.length ? c.rtoLocations : [...OFFICE_LOCATIONS];
  return {
    rtoEnabled: c.rtoEnabled ?? d.rtoEnabled,
    rtoPeriod: c.rtoPeriod === 'week' ? 'week' : 'month',
    rtoTarget: Math.max(0, Number(c.rtoTarget) || d.rtoTarget),
    rtoLocations: locations,
    leavePeriod: c.leavePeriod === 'month' ? 'month' : 'year',
    fiscalYearMonth: Math.min(12, Math.max(1, Number(c.fiscalYearMonth) || d.fiscalYearMonth)),
    overtimeAllowance: Math.max(0, Number(c.overtimeAllowance) || d.overtimeAllowance),
    ptoEnabled: c.ptoEnabled ?? d.ptoEnabled,
    ptoLimit: Math.max(0, Number(c.ptoLimit) || d.ptoLimit),
    sickEnabled: c.sickEnabled ?? d.sickEnabled,
    sickLimit: Math.max(0, Number(c.sickLimit) || d.sickLimit),
  };
}

/**
 * Fiscal year bounds (inclusive) that contain the given YYYY-MM month, where
 * the fiscal year starts on `fiscalMonth` (1-12). Example: fiscalMonth 9 and
 * month 2025-01 → start 2024-09-01, end 2025-08-31.
 */
export function fiscalYearRange(month, fiscalMonth) {
  const [y, m] = String(month).split('-').map(Number);
  const fyStartYear = m >= fiscalMonth ? y : y - 1;
  const start = new Date(fyStartYear, fiscalMonth - 1, 1);
  const end = new Date(fyStartYear + 1, fiscalMonth - 1, 0); // last day before next start
  const pad = (n) => String(n).padStart(2, '0');
  const toDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return { start: toDate(start), end: toDate(end) };
}

/** ISO week number for a YYYY-MM-DD date. */
export function isoWeek(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = (d.getDay() + 6) % 7; // Mon = 0
  d.setDate(d.getDate() - day + 3);
  const firstThu = d.getTime();
  d.setMonth(0, 1);
  if (d.getDay() !== 4) d.setMonth(0, 1 + ((4 - d.getDay()) + 7) % 7);
  return 1 + Math.round((firstThu - d.getTime()) / 604800000);
}

/**
 * Compute tracker status for a month from LILO entries + config.
 * RTO is always counted for the selected month. PTO / Sick leave is counted
 * for the selected month, or for the whole fiscal year when leavePeriod is
 * 'year', and resets when the fiscal year ends.
 */
export function computeTrackers(entries, month, config) {
  const cfg = normalizeConfig(config);
  const me = (entries || []).filter((e) => e.month === month && e.date);

  const scheduledOffice = me.filter(
    (e) => e.status === 'Scheduled' && cfg.rtoLocations.includes(e.location),
  );

  const inLeaveWindow = (e) => {
    if (cfg.leavePeriod !== 'year') return e.month === month;
    const fy = fiscalYearRange(month, cfg.fiscalYearMonth);
    return e.date >= fy.start && e.date <= fy.end;
  };
  const leave = (entries || []).filter((e) => e.date && inLeaveWindow(e));
  const ptoUsed = leave.filter((e) => e.status === 'PTO').length;
  const sickUsed = leave.filter((e) => e.status === 'Sick').length;

  let rtoGot;
  let rtoTarget;
  if (cfg.rtoPeriod === 'week') {
    const today = new Date();
    const week = isoWeek(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`);
    rtoGot = scheduledOffice.filter((e) => isoWeek(e.date) === week).length;
    rtoTarget = cfg.rtoTarget;
  } else {
    rtoGot = scheduledOffice.length;
    rtoTarget = cfg.rtoTarget;
  }

  return {
    cfg,
    rtoGot,
    rtoTarget,
    rtoMet: cfg.rtoEnabled ? rtoGot >= rtoTarget : false,
    rtoRemaining: cfg.rtoEnabled ? Math.max(0, rtoTarget - rtoGot) : 0,
    ptoUsed,
    ptoLimit: cfg.ptoLimit,
    ptoEnabled: cfg.ptoEnabled,
    ptoOver: cfg.ptoEnabled ? ptoUsed > cfg.ptoLimit : false,
    ptoRemaining: cfg.ptoEnabled ? Math.max(0, cfg.ptoLimit - ptoUsed) : 0,
    sickUsed,
    sickLimit: cfg.sickLimit,
    sickEnabled: cfg.sickEnabled,
    sickOver: cfg.sickEnabled ? sickUsed > cfg.sickLimit : false,
    sickRemaining: cfg.sickEnabled ? Math.max(0, cfg.sickLimit - sickUsed) : 0,
  };
}

/** Text summary used for the toast when a threshold is crossed. */
export function describeAlert(status, monthLabel) {
  const msgs = [];
  const periodLabel = status.cfg.leavePeriod === 'year' ? 'this fiscal year' : `${monthLabel}`;
  if (status.rtoEnabled && status.rtoMet) {
    msgs.push(`RTO met for ${monthLabel}: ${status.rtoGot}/${status.rtoTarget} office ${status.rtoGot === 1 ? 'day' : 'days'}.`);
  }
  if (status.ptoEnabled && status.ptoOver) {
    msgs.push(`PTO exceeded for ${periodLabel}: used ${status.ptoUsed}, limit ${status.ptoLimit}.`);
  }
  if (status.sickEnabled && status.sickOver) {
    msgs.push(`Sick leave exceeded for ${periodLabel}: used ${status.sickUsed}, limit ${status.sickLimit}.`);
  }
  return msgs.join(' ');
}