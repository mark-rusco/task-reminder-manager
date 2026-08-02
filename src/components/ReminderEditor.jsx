import { REMINDER_PRESETS } from '../utils/constants';

export default function ReminderEditor({ reminder, onChange }) {
  const set = (patch) => onChange({ ...reminder, ...patch });

  return (
    <div className="form-section">
      <label className="form-label">
        <input
          type="checkbox"
          checked={reminder.enabled}
          onChange={(e) => set({ enabled: e.target.checked })}
        />
        Remind me
      </label>

      {reminder.enabled && (
        <select
          className="input"
          value={reminder.minutes}
          onChange={(e) => set({ minutes: Number(e.target.value) })}
          aria-label="Reminder timing"
        >
          {REMINDER_PRESETS.map((r) => (
            <option key={r.minutes} value={r.minutes}>
              {r.label}
            </option>
          ))}
        </select>
      )}
      {reminder.enabled && (
        <p className="form-hint">
          Example: due at 1:00 AM with &ldquo;10 minutes before&rdquo; reminds you at 12:50 AM. Reminders appear as a
          toast, a sound, and a browser notification while Focusly is open.
        </p>
      )}
    </div>
  );
}
