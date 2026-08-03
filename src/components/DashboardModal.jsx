import { useEffect, useRef, useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import { DASHBOARD_STATUSES } from '../utils/constants';
import { useDashboardTypes } from '../context/DashboardTypesContext';
import DashboardTypeIcon from './DashboardTypeIcon.jsx';

const EMPTY = {
  name: '',
  description: '',
  url: '',
  workspace: '',
  status: 'planning',
  progress: 0,
  dueDate: '',
  type: 'powerbi',
  notes: '',
};

export default function DashboardModal({ open, initial, onClose, onSave, onDelete }) {
  const { types } = useDashboardTypes();
  const [form, setForm] = useState(EMPTY);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const nameRef = useRef(null);
  const editing = !!initial;

  useEffect(() => {
    if (open) {
      setConfirmDelete(false);
      if (initial) {
        setForm({
          name: initial.name || '',
          description: initial.description || '',
          url: initial.url || '',
          workspace: initial.workspace || '',
          status: initial.status || 'planning',
          progress: Number(initial.progress) || 0,
          dueDate: initial.dueDate || '',
          type: initial.type || 'powerbi',
          notes: initial.notes || '',
        });
      } else {
        setForm({ ...EMPTY });
      }
      window.setTimeout(() => nameRef.current?.focus(), 60);
    }
  }, [open, initial]);

  if (!open) return null;

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const submit = (e) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) {
      nameRef.current?.focus();
      return;
    }
    onSave({
      name,
      description: form.description.trim(),
      url: form.url.trim(),
      workspace: form.workspace.trim(),
      status: form.status,
      progress: Number(form.progress),
      dueDate: form.dueDate || null,
      type: form.type,
      notes: form.notes.trim(),
    });
  };
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={editing ? 'Edit dashboard' : 'New dashboard'}>
        <div className="modal-head">
          <h2>{editing ? 'Edit dashboard' : 'New dashboard'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit}>
          <div className="modal-body">
            <input
              ref={nameRef}
              className="input input-title"
              placeholder="Dashboard name — e.g. Sales Performance"
              value={form.name}
              onChange={(e) => set({ name: e.target.value })}
              required
            />
            <textarea
              className="input"
              rows={2}
              placeholder="What does this dashboard track? (optional)"
              value={form.description}
              onChange={(e) => set({ description: e.target.value })}
            />

            <div className="form-section">
              <label className="form-label">Type</label>
              <div className="type-row">
                {types.map((t) => {
                  const on = form.type === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      className={`chip chip-btn ${on ? 'on' : ''}`}
                      style={on ? { borderColor: t.color, color: t.color, background: `${t.color}1f` } : undefined}
                      onClick={() => set({ type: t.value })}
                    >
                      <DashboardTypeIcon type={t.value} size={13} />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <textarea
              className="input"
              rows={3}
              placeholder="Notes — links, refresh schedule, owners, quirks… (optional)"
              value={form.notes}
              onChange={(e) => set({ notes: e.target.value })}
            />

            <div className="form-grid-2">
              <div className="form-section">
                <label className="form-label">Workspace</label>
                <input
                  className="input"
                  placeholder="e.g. Finance BI"
                  value={form.workspace}
                  onChange={(e) => set({ workspace: e.target.value })}
                />
              </div>
              <div className="form-section">
                <label className="form-label">Due date</label>
                <input
                  type="date"
                  className="input"
                  value={form.dueDate}
                  onChange={(e) => set({ dueDate: e.target.value })}
                />
              </div>
            </div>

            <div className="form-section">
              <label className="form-label">Report / file link (optional)</label>
              <input
                className="input"
                placeholder="https://…"
                value={form.url}
                onChange={(e) => set({ url: e.target.value })}
              />
            </div>

            <div className="form-section">
              <label className="form-label">Status</label>
              <div className="status-row">
                {DASHBOARD_STATUSES.map((s) => {
                  const on = form.status === s.value;
                  return (
                    <button
                      key={s.value}
                      type="button"
                      className={`chip chip-btn ${on ? 'on' : ''}`}
                      style={on ? { borderColor: s.color, color: s.color, background: `${s.color}1f` } : undefined}
                      onClick={() => set({ status: s.value })}
                    >
                      <span className="chip-dot" style={{ background: s.color }} />
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="form-section">
              <label className="form-label">
                Progress — {form.progress}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                className="progress-slider"
                value={form.progress}
                onChange={(e) => set({ progress: e.target.value })}
              />
              <div className="progress-scale">
                <span>0</span>
                <span>25</span>
                <span>50</span>
                <span>75</span>
                <span>100</span>
              </div>
            </div>
          </div>

          <div className="modal-foot">
            {editing ? (
              <button type="button" className="btn btn-ghost danger-text" onClick={() => setConfirmDelete(true)}>
                <Trash2 size={15} /> Delete
              </button>
            ) : (
              <span className="modal-foot-spacer" />
            )}
            <div className="modal-foot-right">
              <button type="button" className="btn" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {editing ? 'Save changes' : 'Add dashboard'}
              </button>
            </div>
          </div>
        </form>

        {confirmDelete && (
          <div className="confirm-overlay">
            <div className="confirm-box">
              <h3>Delete this dashboard?</h3>
              <p>Linked tasks will keep their notes but lose the link.</p>
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
