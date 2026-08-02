import { useEffect, useRef, useState } from 'react';
import { X, Trash2, Calendar, Flag, Users, Briefcase, Upload, ExternalLink, Loader2 } from 'lucide-react';
import { PRIORITIES, priorityMeta, TASK_TYPES } from '../utils/constants';
import RecurrenceEditor from './RecurrenceEditor.jsx';
import ReminderEditor from './ReminderEditor.jsx';
import TimePicker from './TimePicker.jsx';
import { DEFAULT_RECURRENCE } from '../utils/recurrence';
import { todayStr, formatDueDateTime } from '../utils/dates';
import { fileToDataUrl } from '../utils/image';

const EMPTY_FORM = {
  title: '',
  notes: '',
  dueDate: '',
  dueTime: '',
  priority: 'none',
  labels: [],
  recurrence: DEFAULT_RECURRENCE(),
  reminder: { enabled: false, minutes: 10, notifiedAt: null },
  taskType: 'task',
  meetingNotes: '',
  screenshot: null,
  dashboardId: null,
};

export default function TaskModal({
  open,
  initial,
  labels,
  dashboards,
  defaultDate,
  onClose,
  onSave,
  onDelete,
  onOpenDashboard,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [uploading, setUploading] = useState(false);
  const titleRef = useRef(null);
  const fileRef = useRef(null);
  const editing = !!initial;

  useEffect(() => {
    if (open) {
      setConfirmDelete(false);
      setUploading(false);
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
          taskType: initial.taskType || 'task',
          meetingNotes: initial.meetingNotes || '',
          screenshot: initial.screenshot || null,
          dashboardId: initial.dashboardId || null,
        });
      } else {
        setForm({ ...EMPTY_FORM, dueDate: defaultDate || todayStr() });
      }
      window.setTimeout(() => titleRef.current?.focus(), 60);
    }
  }, [open, initial, defaultDate]);

  if (!open) return null;

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const isMeeting = form.taskType === 'meeting';

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
      taskType: form.taskType,
      meetingNotes: form.meetingNotes.trim(),
      screenshot: form.screenshot,
      dashboardId: form.dashboardId || null,
    });
  };

  const onPickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      set({ screenshot: dataUrl });
    } catch {
      /* ignore invalid files */
    } finally {
      setUploading(false);
    }
  };

  const linkedDashboard = dashboards.find((d) => d.id === form.dashboardId);

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
            <div className="seg task-type-seg" role="group" aria-label="Task type">
              {TASK_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  className={form.taskType === t.value ? 'on' : ''}
                  onClick={() => set({ taskType: t.value })}
                >
                  {t.value === 'meeting' ? <Users size={14} /> : <Briefcase size={14} />}
                  {t.label}
                </button>
              ))}
            </div>

            <input
              ref={titleRef}
              className="input input-title"
              placeholder={isMeeting ? 'Meeting title — e.g. Stakeholder sync' : 'What needs to be done?'}
              value={form.title}
              onChange={(e) => set({ title: e.target.value })}
              required
            />

            <textarea
              className="input"
              rows={2}
              placeholder={isMeeting ? 'Agenda (optional)' : 'Add notes (optional)'}
              value={form.notes}
              onChange={(e) => set({ notes: e.target.value })}
            />

            <div className="form-section">
              <label className="form-label">Due date & time</label>
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
              </div>
              <TimePicker value={form.dueTime} onChange={(v) => set({ dueTime: v })} />
            </div>

            {isMeeting && (
              <div className="form-section meeting-section">
                <label className="form-label">
                  <Users size={13} /> Meeting recap & attachments
                </label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="Log your notes — decisions, action items, next steps…"
                  value={form.meetingNotes}
                  onChange={(e) => set({ meetingNotes: e.target.value })}
                />

                <div className="screenshot-upload">
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onPickFile} />
                  <button type="button" className="btn" onClick={() => fileRef.current?.click()} disabled={uploading}>
                    {uploading ? <Loader2 size={15} className="spin" /> : <Upload size={15} />}
                    {form.screenshot ? 'Replace screenshot' : 'Upload screenshot'}
                  </button>
                  {form.screenshot && (
                    <div className="screenshot-preview">
                      <img src={form.screenshot} alt="Meeting screenshot preview" />
                      <button type="button" className="icon-btn sm" onClick={() => set({ screenshot: null })} title="Remove screenshot">
                        <X size={13} />
                      </button>
                    </div>
                  )}
                </div>

                <label className="form-label">Link to dashboard</label>
                <div className="link-dashboard-row">
                  <select
                    className="input"
                    value={form.dashboardId || ''}
                    onChange={(e) => set({ dashboardId: e.target.value || null })}
                    aria-label="Link to dashboard"
                  >
                    <option value="">No dashboard</option>
                    {dashboards.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                  {linkedDashboard && (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => onOpenDashboard && onOpenDashboard(linkedDashboard.id)}
                      title="Open dashboard"
                    >
                      <ExternalLink size={14} /> Open
                    </button>
                  )}
                </div>
                {linkedDashboard && (
                  <p className="form-hint">Recap this meeting from “{linkedDashboard.name}” in the Dashboards view.</p>
                )}
              </div>
            )}

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
                {editing ? 'Save changes' : isMeeting ? 'Add meeting' : 'Add task'}
              </button>
            </div>
          </div>
        </form>

        {confirmDelete && (
          <div className="confirm-overlay">
            <div className="confirm-box">
              <h3>Delete this {isMeeting ? 'meeting' : 'task'}?</h3>
              <p>Notes and screenshots will be removed too.</p>
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
