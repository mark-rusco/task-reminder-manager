import { useEffect, useRef, useState } from 'react';
import { X, Trash2, Calendar, Clock, Flag } from 'lucide-react';
import { PRIORITIES, priorityMeta } from '../utils/constants';
import RecurrenceEditor from './RecurrenceEditor.jsx';
import ReminderEditor from './ReminderEditor.jsx';
import { DEFAULT_RECURRENCE } from '../utils/recurrence';
import { todayStr, formatDueDateTime } from '../utils/dates';

const EMPTY_FORM = {
  title: '',
  notes: '',
  dueDate: '',
  dueTime: '',
  priority: 'none',
  labels: [],
  recurrence: DEFAULT_RECURRENCE(),
  reminder: { enabled: false, minutes: 10, notifiedAt: null },
};

export default function TaskModal({ open, initial, labels, defaultDate, onClose, onSave, onDelete }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const titleRef = useRef(null);
  const editing = !!initial;

  useEffect(() => {
    if (open) {
      setConfirmDelete(false);
      if (initial) {
        setForm({
          title: initial.title || '',
          notes: initial.notes || '',
          dueDate: initial.dueDate || '',
          dueTime: initial.dueTime || '',
          priority: initial.priority || 'none',
          labels: initial.labels || [],
          recurrence: initial.recurrence
            ? { ...DEFAULT_RECURRENCE(), ...initial.recurrence }
            : DEFAULT_RECURRENCE(),
          reminder: initial.reminder
            ? { enabled: !!initial.reminder.enabled, minutes: initial.reminder.minutes || 10, notifiedAt: null }
            : { enabled: false, minutes: 10, notifiedAt: null },
        });
      } else {
        setForm({ ...EMPTY_FORM, dueDate: defaultDate || todayStr() });
      }
      window.setTimeout(() => titleRef.current?.focus(), 60);
    }
  }, [open, initial, defaultDate]);

  if (!open) return null;

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const toggleLabel = (id) => {
    set({ labels: form.labels.includes(id) ? form.labels.filter((l) => l !== id) : [...form.labels, id] });
  };

  const submit = (e) => {
    e.preventDefault();
    const title = form.title.trim();
    if (!title) {
      titleRef.current?.focus();
      return;
    }
    onSave({
      title,
      notes: form.notes.trim(),
      dueDate: form.dueDate || null,
      dueTime: form.dueTime || null,
      priority: form.priority,
      labels: form.labels,
      recurrence: form.recurrence,
      reminder: form.reminder,
    });
  };

  const quickDates = [
    { label: 'Today', value: todayStr() },
    { label: 'Tomorrow', value: new Date(Date.now() + 86400000).toISOString().slice(0, 10) },
  ];

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={editing ? 'Edit task' : 'New task'}>
        <div className="modal-head">
          <h2>{editing ? 'Edit task' : 'New task'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit}>
          <div className="modal-body">
            <input
              ref={titleRef}
              className="input input-title"
              placeholder="What needs to be done?"
              value={form.title}
              onChange={(e) => set({ title: e.target.value })}
              required
            />

            <textarea
              className="input"
              rows={2}
              placeholder="Add notes (optional)"
              value={form.notes}
              onChange={(e) => set({ notes: e.target.value })}
            />

            <div className="form-section">
              <label className="form-label">Due date</label>
              <div className="quick-date-row">
                {quickDates.map((q) => (
                  <button
                    type="button"
                    key={q.value}
                    className={`chip chip-btn ${form.dueDate === q.value ? 'on' : ''}`}
                    onClick={() => set({ dueDate: q.value })}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
              <div className="form-grid-2">
                <div className="input-icon">
                  <Calendar size={15} />
                  <input
                    type="date"
                    className="input"
                    value={form.dueDate}
                    onChange={(e) => set({ dueDate: e.target.value })}
                  />
                </div>
                <div className="input-icon">
                  <Clock size={15} />
                  <input
                    type="time"
                    className="input"
                    value={form.dueTime}
                    onChange={(e) => set({ dueTime: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <label className="form-label">Priority</label>
              <div className="prio-row">
                {PRIORITIES.map((p) => {
                  const pm = priorityMeta(p.value);
                  const on = form.priority === p.value;
                  return (
                    <button
                      type="button"
                      key={p.value}
                      className={`chip chip-btn prio-chip prio-${p.value} ${on ? 'on' : ''}`}
                      onClick={() => set({ priority: p.value })}
                    >
                      <Flag size={13} style={{ color: on ? pm.color : 'currentColor' }} />
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="form-section">
              <label className="form-label">Categories</label>
              <div className="label-picker">
                {labels.map((l) => {
                  const on = form.labels.includes(l.id);
                  return (
                    <button
                      type="button"
                      key={l.id}
                      className={`chip chip-btn label-chip ${on ? 'on' : ''}`}
                      onClick={() => toggleLabel(l.id)}
                    >
                      <span className="chip-dot" style={{ background: l.color }} />
                      {l.name}
                      {on && <span className="chip-check">✓</span>}
                    </button>
                  );
                })}
                {labels.length === 0 && (
                  <p className="form-hint">No categories yet — you can add them from the sidebar.</p>
                )}
              </div>
            </div>

            <RecurrenceEditor recurrence={form.recurrence} onChange={(r) => set({ recurrence: r })} />
            <ReminderEditor reminder={form.reminder} onChange={(r) => set({ reminder: r })} />

            {form.dueDate && (
              <p className="form-due-preview">
                <Calendar size={13} />
                {formatDueDateTime(form.dueDate || null, form.dueTime || null)}
              </p>
            )}
          </div>

          <div className="modal-foot">
            {editing ? (
              <button
                type="button"
                className="btn btn-ghost danger-text"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 size={15} />
                Delete
              </button>
            ) : (
              <span className="modal-foot-spacer" />
            )}
            <div className="modal-foot-right">
              <button type="button" className="btn" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {editing ? 'Save changes' : 'Add task'}
              </button>
            </div>
          </div>
        </form>

        {confirmDelete && (
          <div className="confirm-overlay">
            <div className="confirm-box">
              <h3>Delete this task?</h3>
              <p>This cannot be undone.</p>
              <div className="confirm-actions">
                <button type="button" className="btn" onClick={() => setConfirmDelete(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => {
                    setConfirmDelete(false);
                    onDelete(initial.id);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
