import { useEffect, useState } from 'react';
import { X, Plus, UserRound, Users, CheckSquare } from 'lucide-react';
import { TEAM_LEAVE_REASONS, uid } from '../utils/constants';

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function TeamLeaveModal({ open, memberNames, tasks, initial, onSave, onClose }) {
  const [member, setMember] = useState('');
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('PTO');
  const [note, setNote] = useState('');
  const [coverTasks, setCoverTasks] = useState([]);
  const [pickId, setPickId] = useState('');
  const [customTitle, setCustomTitle] = useState('');

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setMember(initial.member || '');
      setStartDate(initial.startDate || todayISO());
      setEndDate(initial.endDate || '');
      setReason(initial.reason || 'PTO');
      setNote(initial.note || '');
      setCoverTasks(initial.coverTasks || []);
    } else {
      setMember('');
      setStartDate(todayISO());
      setEndDate('');
      setReason('PTO');
      setNote('');
      setCoverTasks([]);
    }
    setPickId('');
    setCustomTitle('');
  }, [open, initial]);

  if (!open) return null;

  const known = memberNames || [];
  const taskOptions = (tasks || []).filter((t) => !coverTasks.some((c) => c.id === t.id));

  const addFromTasks = () => {
    if (!pickId) return;
    const t = (tasks || []).find((x) => x.id === pickId);
    if (t) setCoverTasks((prev) => [...prev, { id: t.id, title: t.title, done: false, linked: true }]);
    setPickId('');
  };

  const addCustom = () => {
    const title = customTitle.trim();
    if (!title) return;
    setCoverTasks((prev) => [...prev, { id: uid(), title, done: false }]);
    setCustomTitle('');
  };

  const removeCover = (id) => setCoverTasks((prev) => prev.filter((c) => c.id !== id));
  const toggleCover = (id) => setCoverTasks((prev) => prev.map((c) => (c.id === id ? { ...c, done: !c.done } : c)));

  const save = (e) => {
    e.preventDefault();
    const name = member.trim();
    if (!name) return;
    onSave({
      member: name,
      startDate,
      endDate: endDate || null,
      reason,
      note,
      coverTasks,
    });
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Log team leave">
        <div className="modal-head">
          <h2>
            <UserRound size={17} /> {initial ? 'Edit leave' : 'Log team leave'}
          </h2>
          <button type="button" className="icon-btn sm" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={save}>
          <div className="modal-body">
            <div className="modal-field">
              <label className="form-label" htmlFor="tl-member">
                Team member <span className="label-req"> *</span>
              </label>
              <input
                id="tl-member"
                type="text"
                className="input"
                list="team-members-datalist"
                placeholder="Type a name or pick one below"
                value={member}
                onChange={(e) => setMember(e.target.value)}
                required
              />
              <datalist id="team-members-datalist">
                {known.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
              {known.length > 0 && (
                <div className="status-row tl-name-chips">
                  <Users size={13} />
                  {known.map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`chip chip-btn ${member === n ? 'on' : ''}`}
                      onClick={() => setMember(n)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              )}
              <p className="form-hint">Names you add here are only visible to you.</p>
            </div>

            <div className="form-grid-2">
              <div className="modal-field">
                <label className="form-label" htmlFor="tl-start">From</label>
                <input id="tl-start" type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="modal-field">
                <label className="form-label" htmlFor="tl-end">To</label>
                <input id="tl-end" type="date" className="input" min={startDate || undefined} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>

            <div className="modal-field">
              <label className="form-label" htmlFor="tl-reason">Reason</label>
              <select id="tl-reason" className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
                {TEAM_LEAVE_REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div className="modal-field">
              <label className="form-label" htmlFor="tl-note">Note (optional)</label>
              <textarea id="tl-note" className="input" rows={2} placeholder="Anything to remember" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>

            <div className="modal-field">
              <label className="form-label">
                <CheckSquare size={13} /> Tasks to cover
              </label>
              <p className="form-hint">Things to pick up while this member is away. Tasks added from your list are linked — ticking them covered also completes them in your task list.</p>

              {coverTasks.length > 0 && (
                <ul className="tl-cover-list">
                  {coverTasks.map((c) => (
                    <li key={c.id} className={c.done ? 'done' : ''}>
                      <button
                        type="button"
                        className="tl-cover-check"
                        aria-label={c.done ? 'Mark not covered' : 'Mark covered'}
                        onClick={() => toggleCover(c.id)}
                      >
                        {c.done ? '✓' : ''}
                      </button>
                      <span className="tl-cover-title">{c.title}</span>
                      <button type="button" className="icon-btn sm" onClick={() => removeCover(c.id)} aria-label="Remove">
                        <X size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="tl-cover-add">
                {taskOptions.length > 0 && (
                  <>
                    <select className="input" value={pickId} onChange={(e) => setPickId(e.target.value)} aria-label="Pick a task">
                      <option value="">Pick one of your tasks…</option>
                      {taskOptions.map((t) => (
                        <option key={t.id} value={t.id}>{t.title}</option>
                      ))}
                    </select>
                    <button type="button" className="btn sm" onClick={addFromTasks} disabled={!pickId}>
                      <Plus size={14} /> Add
                    </button>
                  </>
                )}
                <div className="tl-custom-add">
                  <input
                    type="text"
                    className="input"
                    placeholder="Or type a custom item to cover…"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCustom();
                      }
                    }}
                  />
                  <button type="button" className="btn sm" onClick={addCustom} disabled={!customTitle.trim()}>
                    <Plus size={14} /> Add
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="modal-foot">
            <div className="modal-foot-right">
              <button type="button" className="btn" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary">{initial ? 'Save changes' : 'Add leave'}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}