import { LILO_LOCATIONS } from './constants';

export const TRACKER_KEY = 'tracker-config';

/** Office/RTO locations are the non-WFH options in LILO. */
export const OFFICE_LOCATIONS = LILO_LOCATIONS.filter((l) => l !== 'WFH' && l !== 'Rest Day');

/**
 * Tracker configuration.
 * - RTO: number of office (return-to-office) days required, per month or per week.
 * - Leaves: max PTO and Sick days allowed per month. Exceeding a limit is "over".
 */
export const DEFAULT_TRACKER_CONFIG = {
  rtoEnabled: true,
  rtoPeriod: 'month', // 'month' | 'week'
  rtoTarget: 8,
  rtoLocations: [...OFFICE_LOCATIONS],
  ptoEnabled: true,
  ptoLimit: 6,
  sickEnabled: true,
  sickLimit: 6,
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
    ptoEnabled: c.ptoEnabled ?? d.ptoEnabled,
    ptoLimit: Math.max(0, Number(c.ptoLimit) || d.ptoLimit),
    sickEnabled: c.sickEnabled ?? d.sickEnabled,
    sickLimit: Math.max(0, Number(c.sickLimit) || d.sickLimit),
  };
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
 * Returns counts and cross-threshold flags.
 */
export function computeTrackers(entries, month, config) {
  const cfg = normalizeConfig(config);
  const me = (entries || []).filter((e) => e.month === month && e.date);

  const scheduledOffice = me.filter(
    (e) => e.status === 'Scheduled' && cfg.rtoLocations.includes(e.location),
  );
  const ptoUsed = me.filter((e) => e.status === 'PTO').length;
  const sickUsed = me.filter((e) => e.status === 'Sick').length;

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
  if (status.rtoEnabled && status.rtoMet) {
    msgs.push(`RTO met for ${monthLabel}: ${status.rtoGot}/${status.rtoTarget} office ${status.rtoGot === 1 ? 'day' : 'days'}.`);
  }
  if (status.ptoEnabled && status.ptoOver) {
    msgs.push(`PTO exceeded for ${monthLabel}: used ${status.ptoUsed}, limit ${status.ptoLimit}.`);
  }
  if (status.sickEnabled && status.sickOver) {
    msgs.push(`Sick leave exceeded for ${monthLabel}: used ${status.sickUsed}, limit ${status.sickLimit}.`);
  }
  return msgs.join(' ');
}