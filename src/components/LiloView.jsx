import { useMemo, useState } from 'react';
import {
  Download,
  ClipboardCopy,
  CalendarPlus,
  RotateCcw,
  Trash2,
  CheckCircle2,
  Circle,
  Sparkles,
  UserCog,
} from 'lucide-react';
import { LILO_STATUSES, LILO_LOCATIONS } from '../utils/constants';
import { useAuth } from '../context/AuthContext';
import {
  monthDays,
  buildMonthEntries,
  isModified,
  to24h,
  to12h,
  liloToCSV,
  formatMonth,
  currentMonth,
  liloDefaultsFromProfile,
} from '../utils/lilo';

function downloadCSV(csv, month) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `LILO_${month}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function LiloView({ entries, submissions, onUpdate, onAddEntries, onRemove, onReset, onSetSubmitted, onToast, onOpenProfile }) {
  const { profile } = useAuth();
  const [month, setMonth] = useState(() => currentMonth());
  const [resetArmed, setResetArmed] = useState(false);

  // Defaults come from the signed-in user's profile (EID + shift schedule).
  const defaults = useMemo(() => liloDefaultsFromProfile(profile?.custom_fields), [profile]);

  const monthEntries = useMemo(
    () => entries.filter((e) => e.month === month).sort((a, b) => (a.date < b.date ? -1 : 1)),
    [entries, month],
  );

  const stats = useMemo(() => {
    const s = { Scheduled: 0, 'Rest Day': 0, PTO: 0, Sick: 0 };
    for (const e of monthEntries) s[e.status] = (s[e.status] || 0) + 1;
    return s;
  }, [monthEntries]);

  const submitted = !!submissions[month];
  const days = monthDays(month);
  const modifiedCount = monthEntries.filter((e) =>
    ['brgType', 'schedType', 'eid', 'status', 'startTime', 'endTime', 'location', 'remarks'].some((f) => isModified(f, e, defaults)),
  ).length;

  const generate = () => {
    const existing = new Set(monthEntries.map((e) => e.date));
    const toAdd = buildMonthEntries(month, {}, defaults).filter((e) => !existing.has(e.date));
    const n = onAddEntries(toAdd);
    onToast?.(n > 0 ? `Generated ${n} day${n !== 1 ? 's' : ''} for ${formatMonth(month)}` : `${formatMonth(month)} is already complete`);
  };

  const copyTable = async () => {
    const csv = liloToCSV(monthEntries);
    try {
      await navigator.clipboard.writeText(csv);
      onToast?.('Copied LILO table to clipboard', 'success');
    } catch {
      const ta = document.createElement('textarea');
      ta.value = csv;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      onToast?.('Copied LILO table to clipboard', 'success');
    }
  };

  const exportCSV = () => {
    downloadCSV(liloToCSV(monthEntries), month);
    onToast?.('LILO CSV downloaded', 'success');
  };

  const toggleSubmitted = () => {
    onSetSubmitted(month, !submitted);
    onToast?.(submitted ? `Marked ${formatMonth(month)} as not submitted` : `${formatMonth(month)} marked as submitted`, 'success');
  };

  return (
    <div className="lilo-page">
      <div className="lilo-toolbar">
        <label className="lilo-month">
          <span>Month</span>
          <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
        </label>

        <button type="button" className="btn btn-primary" onClick={generate}>
          <CalendarPlus size={16} />
          Generate month
        </button>

        <button
          type="button"
          className={`btn btn-ghost danger-text ${resetArmed ? 'armed' : ''}`}
          onClick={() => {
            if (!resetArmed) {
              setResetArmed(true);
              window.setTimeout(() => setResetArmed(false), 3000);
              return;
            }
            setResetArmed(false);
            onReset(month);
            onToast?.(`Reset ${formatMonth(month)} — regenerate to start fresh`, 'success');
          }}
          disabled={monthEntries.length === 0}
          title="Delete all rows for this month so you can regenerate"
        >
          <RotateCcw size={15} />
          {resetArmed ? 'Confirm reset?' : 'Reset month'}
        </button>

        <div className="lilo-export">
          <button type="button" className="btn" onClick={exportCSV} disabled={!monthEntries.length}>
            <Download size={15} />
            Export CSV
          </button>
          <button type="button" className="btn" onClick={copyTable} disabled={!monthEntries.length}>
            <ClipboardCopy size={15} />
            Copy table
          </button>
        </div>

        <button
          type="button"
          className={`btn ${submitted ? 'btn-submitted' : 'btn-primary'}`}
          onClick={toggleSubmitted}
        >
          {submitted ? <CheckCircle2 size={16} /> : <Circle size={16} />}
          {submitted ? 'Submitted — tap to undo' : 'Mark Submitted'}
        </button>
      </div>

      <div className="lilo-banner">
        <UserCog size={15} />
        EID and shift times default to your profile
        {profile?.custom_fields?.eid ? ` (${profile.custom_fields.eid}, ${defaults.startTime}–${defaults.endTime})` : ''}.
        {onOpenProfile && (
          <button type="button" className="lilo-link" onClick={onOpenProfile}>
            Edit profile
          </button>
        )}
      </div>

      {submitted && (
        <div className="lilo-banner submitted">
          <CheckCircle2 size={16} />
          Submitted for {formatMonth(month)}
        </div>
      )}
      {monthEntries.length > 0 && !submitted && (
        <div className="lilo-banner">
          <Circle size={15} />
          Not yet submitted for {formatMonth(month)} — export the CSV and mark it submitted once done.
        </div>
      )}

      <div className="lilo-stats">
        <span className="stat-pill">Total {days.length} days</span>
        {LILO_STATUSES.map((s) => (
          <span key={s} className={`stat-pill st-${s.replace(/\s+/g, '-').toLowerCase()}`}>
            {s} {stats[s] || 0}
          </span>
        ))}
        {modifiedCount > 0 && <span className="stat-pill edited">Edited {modifiedCount}</span>}
      </div>

      {monthEntries.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <Sparkles size={30} />
          </div>
          <h3>No LILO for {formatMonth(month)} yet</h3>
          <p>Weekdays will be Scheduled and weekends Rest Day automatically, using your profile's EID and shift schedule. Generate the month, then edit any PTO / Sick / overtime.</p>
          <button type="button" className="btn btn-primary" onClick={generate}>
            <CalendarPlus size={16} /> Generate {formatMonth(month)}
          </button>
        </div>
      ) : (
        <>
          <div className="lilo-legend">
            <span className="legend-swatch edited" /> Edited from default — amber cells show where you changed the template values.
          </div>
          <div className="lilo-table-wrap">
            <table className="lilo-table">
              <thead>
                <tr>
                  <th className="col-date">Date</th>
                  <th>Status</th>
                  <th>Start Time</th>
                  <th>End Time</th>
                  <th>Location</th>
                  <th>BRG Type</th>
                  <th>Sched Type</th>
                  <th>EID</th>
                  <th>Remarks</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {monthEntries.map((e) => {
                  const isWeekend = [0, 6].includes(new Date(e.date + 'T00:00:00').getDay());
                  const dayMeta = days.find((d) => d.date === e.date);
                  return (
                    <tr key={e.id} className={isWeekend ? 'is-weekend' : ''}>
                      <td className="col-date">
                        <strong>{dayMeta?.day ?? e.date.slice(8)}</strong>
                        <span>{dayMeta?.weekday ?? ''}</span>
                      </td>
                      <td>
                        <select
                          className={`lilo-cell ${isModified('status', e, defaults) ? 'edit' : ''}`}
                          value={e.status}
                          onChange={(ev) => onUpdate(e.id, { status: ev.target.value })}
                        >
                          {LILO_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="time"
                          className={`lilo-cell ${isModified('startTime', e, defaults) ? 'edit' : ''}`}
                          value={to24h(e.startTime)}
                          onChange={(ev) => onUpdate(e.id, { startTime: to12h(ev.target.value) })}
                        />
                      </td>
                      <td>
                        <input
                          type="time"
                          className={`lilo-cell ${isModified('endTime', e, defaults) ? 'edit' : ''}`}
                          value={to24h(e.endTime)}
                          onChange={(ev) => onUpdate(e.id, { endTime: to12h(ev.target.value) })}
                        />
                      </td>
                      <td>
                        <select
                          className={`lilo-cell ${isModified('location', e, defaults) ? 'edit' : ''}`}
                          value={e.location}
                          onChange={(ev) => onUpdate(e.id, { location: ev.target.value })}
                        >
                          {LILO_LOCATIONS.map((l) => (
                            <option key={l} value={l}>
                              {l}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          className={`lilo-cell ${isModified('brgType', e, defaults) ? 'edit' : ''}`}
                          value={e.brgType}
                          onChange={(ev) => onUpdate(e.id, { brgType: ev.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          className={`lilo-cell ${isModified('schedType', e, defaults) ? 'edit' : ''}`}
                          value={e.schedType}
                          onChange={(ev) => onUpdate(e.id, { schedType: ev.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          className={`lilo-cell ${isModified('eid', e, defaults) ? 'edit' : ''}`}
                          value={e.eid}
                          onChange={(ev) => onUpdate(e.id, { eid: ev.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          className={`lilo-cell remarks ${isModified('remarks', e, defaults) ? 'edit' : ''}`}
                          placeholder="—"
                          value={e.remarks}
                          onChange={(ev) => onUpdate(e.id, { remarks: ev.target.value })}
                        />
                      </td>
                      <td className="col-actions">
                        <button type="button" className="icon-btn sm danger" onClick={() => onRemove(e.id)} title="Remove day">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
