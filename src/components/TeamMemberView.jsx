import { X, Plus, CalendarDays, CheckCircle2, ListChecks, AlertCircle, CalendarClock } from 'lucide-react';
import { teamLeaveActive } from '../utils/constants';
import { avatarColor, initials } from '../utils/avatar';

const todayISO = () => new Date().toISOString().slice(0, 10);

function fmtShort(iso) {
  if (!iso) return '';
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Member drill-in: shows a team member's open assigned tasks so the user can
 * tick the ones to cover for their current/upcoming leave — or log leave and
 * add new tasks for that member. Open tasks are linked to the user's task list.
 */
export default function TeamMemberView({ open, member, tasks, entries, onClose, onAddTaskFor, onToggleCover, onLogLeave }) {
  if (!open || !member) return null;

  const name = member.trim();
  const mEntries = (entries || [])
    .filter((e) => e.member.toLowerCase() === name.toLowerCase())
    .sort((a, b) => String(b.startDate || '').localeCompare(String(a.startDate || '')));
  const active = mEntries.find((e) => teamLeaveActive(e, todayISO()));
  const upcoming = !active ? mEntries.find((e) => e.startDate && e.startDate > todayISO()) : null;
  const target = active || upcoming;
  const assigned = (tasks || []).filter(
    (t) => t.assignedMember && !t.completed && t.assignedMember.toLowerCase() === name.toLowerCase(),
  );
  const isCovered = (id) => target && (target.coverTasks || []).some((c) => c.id === id);

  const toggle = (task) => {
    if (!target) {
      onLogLeave?.(name);
      return;
    }
    onToggleCover(task, target);
  };

  const ac = avatarColor(name);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal tm-modal" role="dialog" aria-modal="true" aria-label={`${name}'s tasks`}>
        <div className="modal-head">
          <h2>
            <span className="tm-avatar" style={{ background: `${ac}22`, color: ac }}>{initials(name)}</span>
            {name}
          </h2>
          <button type="button" className="icon-btn sm" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {active ? (
            <p className="tm-banner ok">
              <CheckCircle2 size={14} /> On leave today{active.endDate ? ` until ${fmtShort(active.endDate)}` : ''}
            </p>
          ) : upcoming ? (
            <p className="tm-banner next">
              <CalendarClock size={14} /> Leave starts {fmtShort(upcoming.startDate)}
            </p>
          ) : (
            <p className="tm-banner muted">
              <AlertCircle size={14} /> No leave logged for {name} yet.
            </p>
          )}

          <div className="tm-section">
            <div className="tl-cover-label">
              <ListChecks size={13} /> Their open tasks
              <span className="tl-progress none">{assigned.length}</span>
            </div>

            {assigned.length === 0 ? (
              <div className="tl-cover-empty">
                <ListChecks size={18} />
                <span>No open tasks assigned to {name} yet.</span>
                {onAddTaskFor && (
                  <button type="button" className="btn sm" onClick={() => onAddTaskFor(name)}>
                    <Plus size={13} /> Add task for {name}
                  </button>
                )}
              </div>
            ) : (
              <ul className="tl-cover-list tm-task-list">
                {assigned.map((t) => {
                  const covered = isCovered(t.id);
                  return (
                    <li key={t.id} className={covered ? 'added' : ''}>
                      <button
                        type="button"
                        className="tl-cover-check"
                        aria-pressed={covered}
                        aria-label={covered ? 'Remove from cover list' : target ? 'Add to cover list' : 'Log leave then add to cover'}
                        onClick={() => toggle(t)}
                      >
                        {covered ? '✓' : ''}
                      </button>
                      <span className="tl-cover-title">{t.title}</span>
                      {t.dueDate && <span className="tm-task-meta">{fmtShort(t.dueDate)}</span>}
                      <span className={`tl-cover-state ${covered ? '' : 'pending'}`}>
                        {covered ? 'cover' : target ? 'tap' : 'leave first'}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}

            <p className="tm-hint">
              Tick a task to add it to {name}&apos;s cover list — it stays linked to your task list.
              {!target ? ' Log leave for them first to unlock coverage.' : ''}
            </p>
          </div>
        </div>

        <div className="modal-foot">
          {!target && (
            <button type="button" className="btn" onClick={() => onLogLeave?.(name)}>
              <CalendarDays size={14} /> Log leave
            </button>
          )}
          <div className="modal-foot-right">
            {onAddTaskFor && (
              <button type="button" className="btn btn-primary" onClick={() => onAddTaskFor(name)}>
                <Plus size={14} /> Add task for {name}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}