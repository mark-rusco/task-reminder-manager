import { useEffect, useState } from 'react';
import { X, Building2, CalendarPlus, RotateCcw } from 'lucide-react';
import { DEFAULT_TRACKER_CONFIG, OFFICE_LOCATIONS } from '../utils/trackers';

function Toggle({ checked, onChange, label, hint }) {
  return (
    <label className="toggle-row form-toggle">
      <input type="checkbox" className="toggle-check" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <strong>{label}</strong>
        {hint && <small>{hint}</small>}
      </span>
    </label>
  );
}

export default function TrackerConfigModal({ open, config, onSave, onClose }) {
  const [form, setForm] = useState(DEFAULT_TRACKER_CONFIG);

  useEffect(() => {
    if (open) {
      setForm({
        ...DEFAULT_TRACKER_CONFIG,
        ...(config || {}),
      });
    }
  }, [open, config]);

  if (!open) return null;

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const toggleOffice = (loc) => {
    const cur = form.rtoLocations || [];
    const next = cur.includes(loc) ? cur.filter((l) => l !== loc) : [...cur, loc];
    set({ rtoLocations: next.length ? next : DEFAULT_TRACKER_CONFIG.rtoLocations });
  };

  const save = (e) => {
    e.preventDefault();
    onSave({
      rtoEnabled: form.rtoEnabled,
      rtoPeriod: form.rtoPeriod,
      rtoTarget: Math.max(0, Number(form.rtoTarget) || 0),
      rtoLocations: form.rtoLocations?.length ? form.rtoLocations : OFFICE_LOCATIONS,
      leavePeriod: form.leavePeriod,
      fiscalYearMonth: Math.min(12, Math.max(1, Number(form.fiscalYearMonth) || 1)),
      overtimeAllowance: Math.max(0, Number(form.overtimeAllowance) || 0),
      ptoEnabled: form.ptoEnabled,
      ptoLimit: Math.max(0, Number(form.ptoLimit) || 0),
      sickEnabled: form.sickEnabled,
      sickLimit: Math.max(0, Number(form.sickLimit) || 0),
    });
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Configure Leave & RTO tracker">
        <div className="modal-head">
          <h2>Tracker settings</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={save}>
          <div className="modal-body">
            <section className="form-section">
              <label className="form-label">
                <Building2 size={13} /> Return-to-office (RTO)
              </label>
              <Toggle
                checked={form.rtoEnabled}
                onChange={(v) => set({ rtoEnabled: v })}
                label="Track RTO"
                hint="Counts your office days against a required target"
              />
              {form.rtoEnabled && (
                <>
                  <div className="form-grid-2">
                    <div className="form-section">
                      <label className="form-label">Office days required</label>
                      <input
                        type="number"
                        min="0"
                        className="input"
                        value={form.rtoTarget}
                        onChange={(e) => set({ rtoTarget: e.target.value })}
                        aria-label="RTO days required"
                      />
                    </div>
                    <div className="form-section">
                      <label className="form-label">Period</label>
                      <select
                        className="input"
                        value={form.rtoPeriod}
                        onChange={(e) => set({ rtoPeriod: e.target.value })}
                        aria-label="RTO period"
                      >
                        <option value="month">Per month</option>
                        <option value="week">Per week</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-section">
                    <label className="form-label">Count as office</label>
                    <div className="status-row">
                      {OFFICE_LOCATIONS.map((loc) => (
                        <button
                          type="button"
                          key={loc}
                          className={`chip chip-btn ${form.rtoLocations?.includes(loc) ? 'on' : ''}`}
                          onClick={() => toggleOffice(loc)}
                        >
                          {loc}
                        </button>
                      ))}
                    </div>
                    <p className="form-hint">Scheduled days at these locations count toward your RTO target.</p>
                  </div>
                </>
              )}
            </section>

            <section className="form-section">
              <label className="form-label">
                <CalendarPlus size={13} /> Leave entitlements
              </label>
              <div className="form-grid-2">
                <div className="form-section">
                  <label className="form-label">Reset period</label>
                  <select
                    className="input"
                    value={form.leavePeriod}
                    onChange={(e) => set({ leavePeriod: e.target.value })}
                    aria-label="Leave reset period"
                  >
                    <option value="year">Per year (fiscal)</option>
                    <option value="month">Per month</option>
                  </select>
                  {form.leavePeriod === 'year' && (
                    <div className="form-section">
                      <label className="form-label">Fiscal year starts</label>
                      <select
                        className="input"
                        value={form.fiscalYearMonth}
                        onChange={(e) => set({ fiscalYearMonth: e.target.value })}
                        aria-label="Fiscal year start month"
                      >
                        {Array.from({ length: 12 }, (_, i) => {
                          const m = i + 1;
                          const name = new Date(2026, i, 1).toLocaleString('en-US', { month: 'long' });
                          return (
                            <option key={m} value={m}>
                              {name} 1
                            </option>
                          );
                        })}
                      </select>
                      <p className="form-hint">
                        The leave count resets the day before this month starts.
                      </p>
                    </div>
                  )}
                </div>
                <div className="form-section">
                  <div className="form-grid-2">
                    <div className="form-section">
                      <Toggle
                        checked={form.ptoEnabled}
                        onChange={(v) => set({ ptoEnabled: v })}
                        label="PTO allowed"
                        hint="Paid time off"
                      />
                      {form.ptoEnabled && (
                        <>
                          <label className="form-label">Limit (days)</label>
                          <input
                            type="number"
                            min="0"
                            className="input"
                            value={form.ptoLimit}
                            onChange={(e) => set({ ptoLimit: e.target.value })}
                            aria-label="PTO days allowed"
                          />
                        </>
                      )}
                    </div>
                    <div className="form-section">
                      <Toggle
                        checked={form.sickEnabled}
                        onChange={(v) => set({ sickEnabled: v })}
                        label="Sick leave allowed"
                        hint="Sick days"
                      />
                      {form.sickEnabled && (
                        <>
                          <label className="form-label">Limit (days)</label>
                          <input
                            type="number"
                            min="0"
                            className="input"
                            value={form.sickLimit}
                            onChange={(e) => set({ sickLimit: e.target.value })}
                            aria-label="Sick days allowed"
                          />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <p className="form-hint">
                {form.leavePeriod === 'year'
                  ? `Counts apply for the whole fiscal year and reset at its end.`
                  : `You&apos;ll be notified when you pass a limit (PTO / Sick) or hit your RTO target.`}
              </p>
            </section>

            <section className="form-section">
              <label className="form-label">Task grace period</label>
              <div className="form-section">
                <label className="form-label">Overtime allowance (minutes)</label>
                <input
                  type="number"
                  min="0"
                  step="15"
                  className="input"
                  value={form.overtimeAllowance}
                  onChange={(e) => set({ overtimeAllowance: e.target.value })}
                  aria-label="Overtime allowance in minutes"
                />
                <p className="form-hint">
                  Tasks due &quot;today&quot; stay pending until your shift ends plus this many minutes — even when your shift runs past midnight (e.g. 4:00 PM – 1:00 AM).
                </p>
              </div>
            </section>
          </div>

          <div className="modal-foot">
            <button type="button" className="btn btn-ghost" onClick={() => setForm({ ...DEFAULT_TRACKER_CONFIG })}>
              <RotateCcw size={15} /> Reset
            </button>
            <div className="modal-foot-right">
              <button type="button" className="btn" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save settings
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}