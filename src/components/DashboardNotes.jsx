import { useState } from 'react';
import { Plus, Pencil, Trash2, History, X } from 'lucide-react';
import { useDashboardNotes } from '../hooks/useDashboardNotes';
import { todayStr, formatDueDate } from '../utils/dates';

export default function DashboardNotes({ dashboardId, onToast }) {
  const { notes, addNote, updateNote, deleteNote } = useDashboardNotes(dashboardId, onToast);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ noteDate: todayStr(), content: '' });

  const startAdd = () => {
    setEditing(null);
    setForm({ noteDate: todayStr(), content: '' });
    setOpen(true);
  };

  const startEdit = (note) => {
    setEditing(note);
    setForm({ noteDate: note.noteDate || todayStr(), content: note.content || '' });
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    const content = form.content.trim();
    if (!content) return;
    if (editing) {
      await updateNote(editing.id, { noteDate: form.noteDate, content });
      onToast?.('Note updated', 'success');
    } else {
      await addNote({ noteDate: form.noteDate, content });
      onToast?.('Note added', 'success');
    }
    setOpen(false);
  };

  const remove = async (note) => {
    if (!window.confirm('Delete this note?')) return;
    await deleteNote(note.id);
    onToast?.('Note deleted', 'success');
  };

  return (
    <section className="panel">
      <h3 className="panel-title">
        <span className="panel-title-text"><History size={15} /> Update &amp; change log ({notes.length})</span>
        <button type="button" className="icon-btn sm" onClick={startAdd} title="Add note">
          <Plus size={15} />
        </button>
      </h3>

      {notes.length === 0 ? (
        <p className="panel-empty">No notes yet. Track updates, change log entries or reminders here.</p>
      ) : (
        <ul className="note-list">
          {notes.map((n) => (
            <li key={n.id} className="note-item">
              <div className="note-item-head">
                <span className="note-date">{formatDueDate(n.noteDate)}</span>
                <div className="note-item-actions">
                  <button type="button" className="icon-btn sm" onClick={() => startEdit(n)} title="Edit note">
                    <Pencil size={13} />
                  </button>
                  <button type="button" className="icon-btn sm danger" onClick={() => remove(n)} title="Delete note">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <p className="note-content">{n.content}</p>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal modal-sm" role="dialog" aria-modal="true" aria-label={editing ? 'Edit note' : 'Add note'}>
            <div className="modal-head">
              <h2>{editing ? 'Edit note' : 'Add note'}</h2>
              <button className="modal-close" onClick={() => setOpen(false)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={submit}>
              <div className="modal-body">
                <div className="form-section">
                  <label className="form-label">Date</label>
                  <input
                    type="date"
                    className="input"
                    value={form.noteDate}
                    onChange={(e) => setForm((f) => ({ ...f, noteDate: e.target.value }))}
                  />
                </div>
                <div className="form-section">
                  <label className="form-label">Note</label>
                  <textarea
                    className="input"
                    rows={5}
                    placeholder="What changed? Any important updates or reminders…"
                    value={form.content}
                    onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                    autoFocus
                  />
                </div>
              </div>
              <div className="modal-foot">
                <span className="modal-foot-spacer" />
                <div className="modal-foot-right">
                  <button type="button" className="btn" onClick={() => setOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={!form.content.trim()}>
                    {editing ? 'Save changes' : 'Add note'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}