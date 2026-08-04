import { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, CalendarPlus, CalendarOff, Settings2, CheckCircle2, Info, AlertTriangle } from 'lucide-react';
import { computeTrackers, describeAlert, fiscalYearRange } from '../utils/trackers';
import { currentMonth, formatMonth } from '../utils/lilo';
import TrackerConfigModal from './TrackerConfigModal.jsx';

export default function TrackersView({ entries, config, onUpdateConfig, onToast, onOpenLilo }) {
  const [month, setMonth] = useState(() => currentMonth());
  const [configOpen, setConfigOpen] = useState(false);
  const status = useMemo(() => computeTrackers(entries, month, config), [entries, month, config]);
  const lastAlert = useRef('');

  // Notify on threshold crossings (met RTO / exceeded PTO or Sick).
  useEffect(() => {
    const sig = `${status.rtoMet}|${status.ptoOver}|${status.sickOver}`;
    if (sig === lastAlert.current) return;
    lastAlert.current = sig;
    const msg = describeAlert(status, formatMonth(month));
    if (msg) onToast?.(msg, status.sickOver || status.ptoOver ? 'warning' : 'success');
  }, [status, month, onToast]);

  const pct = (used, limit) => (limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0);
  const rtoPct = status.rtoTarget > 0 ? Math.min(100, Math.round((status.rtoGot / status.rtoTarget) * 100)) : 0;
  const periodLabel = status.cfg.leavePeriod === 'year' ? 'fiscal year' : 'month';
  const fy = status.cfg.leavePeriod === 'year' ? fiscalYearRange(month, status.cfg.fiscalYearMonth) : null;

  return (
    <div className="lilo-page tracker-page">
      <div className="lilo-toolbar">
        <label className="lilo-month">
          <span>Month</span>
          <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
        </label>
        <button type="button" className="btn" onClick={() => setConfigOpen(true)}>
          <Settings2 size={15} /> Configure
        </button>
        {typeof onOpenLilo === 'function' && (
          <button type="button" className="btn btn-primary" onClick={onOpenLilo}>
            <CalendarPlus size={15} /> Open in LILO
          </button>
        )}
      </div>

      <div className="lilo-banner">
        <Info size={15} />
        {status.cfg.leavePeriod === 'year' && fy
          ? `Leave counts span the fiscal year ${fy.start} to ${fy.end} (resets at the end). RTO is based on your LILO for ${formatMonth(month)} — edit days in the LILO Tracker to update these numbers.`
          : `Based on your LILO for ${formatMonth(month)} — edit days in the LILO Tracker to update these numbers.`}
      </div>

      <div className="tracker-grid">
        <section className={`panel tracker-card ${status.rtoMet ? 'ok' : ''}`}>
          <div className="panel-title">
            <span className="panel-title-text">
              <Building2 size={15} /> RTO
              <span className="chip chip-metric">{status.cfg.rtoPeriod === 'week' ? 'per week' : 'per month'}</span>
            </span>
            {status.rtoMet ? (
              <CheckCircle2 size={18} className="ok-icon" />
            ) : (
              <span className="tracker-badge">{status.rtoRemaining} to go</span>
            )}
          </div>
          <p className="tracker-card-note">{status.cfg.rtoLocations.join(' · ')}</p>
          <div className="tracker-number">
            <strong>{status.rtoGot}</strong>
            <span>/ {status.rtoTarget} office days</span>
          </div>
          <div className="dashboard-progress">
            <div className="dashboard-progress-track">
              <div className="dashboard-progress-fill" style={{ width: `${rtoPct}%`, background: status.rtoMet ? 'var(--success)' : 'var(--primary)' }} />
            </div>
          </div>
          {status.rtoMet ? (
            <p className="tracker-status ok">Target met</p>
          ) : (
            <p className="tracker-status">{status.rtoRemaining} more to reach your target.</p>
          )}
        </section>

        <section className={`panel tracker-card ${status.ptoOver ? 'over' : ''}`}>
          <div className="panel-title">
            <span className="panel-title-text">
              <CalendarOff size={15} /> PTO
            </span>
            {status.ptoOver ? (
              <AlertTriangle size={16} className="warn-icon" />
            ) : (
              <span className="tracker-badge">{status.ptoRemaining} left</span>
            )}
          </div>
          <p className="tracker-card-note">
            Paid time off used this {periodLabel}
            {status.ptoOpening > 0 ? ` (opening +${status.ptoOpening})` : ''}
          </p>
          <div className="tracker-number">
            <strong>{status.ptoUsed}</strong>
            <span>/{status.ptoEffectiveLimit} days</span>
          </div>
          <div className="dashboard-progress">
            <div className="dashboard-progress-track">
              <div className="dashboard-progress-fill" style={{ width: `${pct(status.ptoUsed, status.ptoEffectiveLimit)}%`, background: status.ptoOver ? 'var(--danger)' : 'var(--success)' }} />
            </div>
          </div>
          {!status.ptoEnabled ? (
            <p className="tracker-status muted">PTO tracking is off.</p>
          ) : status.ptoOver ? (
            <p className="tracker-status over">Exceeded by {status.ptoUsed - status.ptoEffectiveLimit}.</p>
          ) : (
            <p className="tracker-status">{status.ptoRemaining} days remaining.</p>
          )}
        </section>

        <section className={`panel tracker-card ${status.sickOver ? 'over' : ''}`}>
          <div className="panel-title">
            <span className="panel-title-text">
              <CalendarOff size={15} /> Sick leave
            </span>
            {status.sickOver ? (
              <AlertTriangle size={16} className="warn-icon" />
            ) : (
              <span className="tracker-badge">{status.sickRemaining} left</span>
            )}
          </div>
          <p className="tracker-card-note">
            Sick days this {periodLabel}
            {status.sickOpening > 0 ? ` (opening +${status.sickOpening})` : ''}
          </p>
          <div className="tracker-number">
            <strong>{status.sickUsed}</strong>
            <span>/{status.sickEffectiveLimit} days</span>
          </div>
          <div className="dashboard-progress">
            <div className="dashboard-progress-track">
              <div className="dashboard-progress-fill" style={{ width: `${pct(status.sickUsed, status.sickEffectiveLimit)}%`, background: status.sickOver ? 'var(--danger)' : 'var(--success)' }} />
            </div>
          </div>
          {!status.sickEnabled ? (
            <p className="tracker-status muted">Sick leave tracking is off.</p>
          ) : status.sickOver ? (
            <p className="tracker-status over">Exceeded by {status.sickUsed - status.sickEffectiveLimit}.</p>
          ) : (
            <p className="tracker-status">{status.sickRemaining} days remaining.</p>
          )}
        </section>
      </div>

      <TrackerConfigModal
        open={configOpen}
        config={config}
        onSave={(cfg) => {
          onUpdateConfig(cfg);
          onToast?.('Tracker settings saved', 'success');
          setConfigOpen(false);
        }}
        onClose={() => setConfigOpen(false)}
      />
    </div>
  );
}