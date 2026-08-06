import { useEffect, useRef, useState } from 'react';
import { X, Trash2, Calendar, Flag, Users, Briefcase, Upload, Loader2, ChevronDown, RefreshCw, Link2, Pin } from 'lucide-react';
import { PRIORITIES, priorityMeta, TASK_TYPES } from '../utils/constants';
import RecurrenceEditor from './RecurrenceEditor.jsx';
import ReminderEditor from './ReminderEditor.jsx';
import TimePicker from './TimePicker.jsx';
import { DEFAULT_RECURRENCE } from '../utils/recurrence';
import { todayStr, formatDueDateTime } from '../utils/dates';
import { fileToDataUrl } from '../utils/image';

const EMPTY_IDS = [];

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
  dashboardIds: [],
  pinned: false,
  assignedMember: '',
};

const TYPE_ICON = {
  task: Briefcase,
  meeting: Users,
  refresh: RefreshCw,
};

export default function TaskModal({
  open,
  initial,
  labels,
  dashboards,
  defaultDate,
  defaultDashboardIds = EMPTY_IDS,
  defaultType = 'task',
  defaultMember,
  memberNames,
  onClose,
  onSave,
  onDelete,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [titleTouched, setTitleTouched] = useState(false);
  const titleRef = useRef(null);
  const fileRef = useRef(null);
  const prevTimeRef = useRef('');
  const editing = !!initial;

  useEffect(() => {
    if (open) {
      setConfirmDelete(false);
      setUploading(false);
      setTimePickerOpen(false);
      setTitleTouched(false);
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
          dashboardIds: initial.dashboardIds || [],
          pinned: !!initial.pinned,
          assignedMember: initial.assignedMember || '',
        });
      } else {
        setForm({ ...EMPTY_FORM, dueDate: defaultDate || todayStr(), taskType: defaultType, dashboardIds: defaultDashboardIds, assignedMember: defaultMember || '' });
      }
      window.setTimeout(() => titleRef.current?.focus(), 60);
    }
  }, [open, initial, defaultDate, defaultDashboardIds, defaultType, defaultMember]);

  if (!open) return null;

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const isMeeting = form.taskType === 'meeting';
  const isRefresh = form.taskType === 'refresh';

  const toggleLabel = (id) => {
    set({ labels: form.labels.includes(id) ? form.labels.filter((l) => l !== id) : [...form.labels, id] });
  };

  const submit = (e) => {
    e.preventDefault();
    const title = form.title.trim();
    if (!title) {
      setTitleTouched(true);
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
      dashboardIds: form.dashboardIds || [],
      pinned: form.pinned,
      assignedMember: form.assignedMember.trim() || null,
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

  const dashboardPicker = (
    <div className="form-section">
      <label className="form-label">
        <Link2 size={13} /> Link reports / dashboards
      </label>
      {dashboards.length === 0 ? (
        <p className="form-hint">No dashboards yet — add them from the Dashboards view.</p>
      ) : (
        <>
          <select
            multiple
            size={Math.min(dashboards.length, 4) || 4}
            className="input dashboard-picker"
            value={form.dashboardIds}
            onChange={(e) => set({ dashboardIds: Array.from(e.target.selectedOptions).map((o) => o.value) })}
            aria-label="Link reports or dashboards"
          >
            {dashboards.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
                {d.workspace ? ` — ${d.workspace}` : ''}
              </option>
            ))}
          </select>
          <p className="form-hint">Ctrl&#47;Cmd-click to select multiple reports or dashboards.</p>
        </>
      )}
    </div>
  );

  const openTimePicker = () => {
    prevTimeRef.current = form.dueTime;
    setTimePickerOpen(true);
  };

  const cancelTime = () => {
    set({ dueTime: prevTimeRef.current });
    setTimePickerOpen(false);
  };

  const confirmTime = () => setTimePickerOpen(false);

  const formatTime12 = (t) => {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return t;
    const ap = h < 12 ? 'AM' : 'PM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ap}`;
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
            <div className="seg task-type-seg" role="group" aria-label="Task type">
              {TASK_TYPES.map((t) => {
                const Icon = TYPE_ICON[t.value] || Briefcase;
                return (
                  <button
                    key={t.value}
                    type="button"
                    className={form.taskType === t.value ? 'on' : ''}
                    onClick={() => set({ taskType: t.value })}
                  >
                    <Icon size={14} />
                    {t.label}
                  </button>
                );
              })}
            </div>

            <input
              ref={titleRef}
              className={`input input-title ${titleTouched && !form.title.trim() ? 'input-error' : ''}`}
              placeholder={
                isMeeting
                  ? 'Meeting title — e.g. Stakeholder sync'
                  : isRefresh
                    ? 'Report or dashboard to refresh — e.g. Sales Power BI'
                    : 'What needs to be done?'
              }
              value={form.title}
              onChange={(e) => set({ title: e.target.value })}
              aria-invalid={titleTouched && !form.title.trim()}
              aria-describedby="task-title-error"
              required
            />
            {titleTouched && !form.title.trim() && (
              <p className="field-error" id="task-title-error" role="alert">
                Please give your {isMeeting ? 'meeting' : isRefresh ? 'refresh' : 'task'} a title.
              </p>
            )}

            <textarea
              className="input"
              rows={2}
              placeholder={isMeeting ? 'Agenda (optional)' : isRefresh ? 'What needs refreshing? (optional)' : 'Add notes (optional)'}
              value={form.notes}
              onChange={(e) => set({ notes: e.target.value })}
            />

            {isRefresh && dashboardPicker}

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
                <button
                  type="button"
                  className={`input time-field-btn ${form.dueTime ? 'has-value' : ''} ${timePickerOpen ? 'open' : ''}`}
                  onClick={openTimePicker}
                  aria-haspopup="dialog"
                >
                  <span className="time-field-label">{form.dueTime ? formatTime12(form.dueTime) : 'Set a time'}</span>
                  {form.dueTime && (
                    <span
                      className="time-field-clear"
                      role="button"
                      aria-label="Clear time"
                      onClick={(e) => {
                        e.stopPropagation();
                        set({ dueTime: '' });
                      }}
                    >
                      <X size={13} />
                    </span>
                  )}
                  <ChevronDown size={15} className={`time-field-chevron ${timePickerOpen ? 'rotated' : ''}`} />
                </button>
              </div>
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
                {dashboardPicker}
              </div>
            )}

            <div className="form-section">
              <label className="form-label">Pin</label>
              <button
                type="button"
                className={`chip chip-btn pin-toggle ${form.pinned ? 'on' : ''}`}
                onClick={() => set({ pinned: !form.pinned })}
                aria-pressed={form.pinned}
              >
                <Pin size={13} />
                {form.pinned ? 'Pinned — first on your next shift' : 'Pin this task'}
              </button>
            </div>

            <div className="form-section">
              <label className="form-label" htmlFor="task-member">
                <Users size={13} /> Team member
              </label>
              <input
                id="task-member"
                type="text"
                className="input"
                list="task-members-datalist"
                placeholder="Unassigned — type a name or pick one"
                value={form.assignedMember || ''}
                onChange={(e) => set({ assignedMember: e.target.value })}
              />
              <datalist id="task-members-datalist">
                {(memberNames || []).map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
              {(memberNames || []).length > 0 && (
                <div className="status-row tl-name-chips">
                  <Users size={13} />
                  {(memberNames || []).map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`chip chip-btn ${form.assignedMember === n ? 'on' : ''}`}
                      onClick={() => set({ assignedMember: form.assignedMember === n ? '' : n })}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              )}
              <p className="form-hint">
                Assigning a team member auto-lists this task for coverage when they&apos;re on leave.
              </p>
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
                {editing ? 'Save changes' : isMeeting ? 'Add meeting' : isRefresh ? 'Add refresh' : 'Add task'}
              </button>
            </div>
          </div>
        </form>

        {confirmDelete && (
          <div className="confirm-overlay">
            <div className="confirm-box">
              <h3>Delete this {isMeeting ? 'meeting' : isRefresh ? 'refresh' : 'task'}?</h3>
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

        {timePickerOpen && (
          <div className="time-popover-overlay" onMouseDown={(e) => e.target === e.currentTarget && cancelTime()}>
            <TimePicker
              value={form.dueTime}
              onChange={(v) => set({ dueTime: v })}
              onCancel={cancelTime}
              onConfirm={confirmTime}
            />
          </div>
        )}
      </div>
    </div>
  );
}
