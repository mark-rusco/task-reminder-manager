import { RECURRENCE_FREQS, WEEKDAYS, describeRecurrence } from '../utils/recurrence';

export default function RecurrenceEditor({ recurrence, onChange }) {
  const set = (patch) => onChange({ ...recurrence, ...patch });

  return (
    <div className="form-section">
      <label className="form-label">Repeat</label>
      <div className="form-grid-2">
        <select value={recurrence.freq} onChange={(e) => set({ freq: e.target.value })} className="input">
          {RECURRENCE_FREQS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>

        {recurrence.freq === 'custom' && (
          <div className="input-suffix">
            <input
              type="number"
              min="1"
              max="365"
              className="input"
              value={recurrence.interval}
              onChange={(e) => set({ interval: e.target.value })}
              aria-label="Repeat every days"
            />
            <span className="suffix">days</span>
          </div>
        )}

        {recurrence.freq === 'weekly' && (
          <div className="weekday-picker">
            {WEEKDAYS.map((d) => {
              const on = (recurrence.weekdays || []).includes(d.value);
              return (
                <button
                  key={d.value}
                  type="button"
                  className={`weekday ${on ? 'on' : ''}`}
                  onClick={() => {
                    const cur = recurrence.weekdays || [];
                    set({ weekdays: on ? cur.filter((v) => v !== d.value) : [...cur, d.value] });
                  }}
                  title={d.long}
                >
                  {d.short}
                </button>
              );
            })}
          </div>
        )}

        {recurrence.freq === 'monthly' && (
          <div className="input-suffix">
            <input
              type="number"
              min="1"
              max="31"
              className="input"
              value={recurrence.monthDay || 1}
              onChange={(e) => set({ monthDay: e.target.value })}
              aria-label="Day of month"
            />
            <span className="suffix">of month</span>
          </div>
        )}
      </div>

      {recurrence.freq !== 'none' && (
        <>
          <label className="form-label" htmlFor="recur-end">End repeat</label>
          <input
            id="recur-end"
            type="date"
            className="input"
            value={recurrence.endDate || ''}
            onChange={(e) => set({ endDate: e.target.value || null })}
          />
          <p className="form-hint">{describeRecurrence(recurrence)}</p>
        </>
      )}
    </div>
  );
}
