import { timeBucket, formatDueDate, isOverdue } from '../utils/dates';
import { priorityMeta } from '../utils/constants';
import { hasRecurrence, describeRecurrence } from '../utils/recurrence';
import { Repeat2, Bell, Flag, Pencil, Trash2, Users, Link2, Image as ImageIcon } from 'lucide-react';

export default function TaskItem({ task, labels, dashboards, now, onToggle, onEdit, onDelete }) {
  const bucket = timeBucket(task, now);
  const overdue = isOverdue(task, now);
  const prio = priorityMeta(task.priority);
  const taskLabels = (task.labels || []).map((id) => labels.find((l) => l.id === id)).filter(Boolean);
  const recurring = hasRecurrence(task.recurrence);
  const hasReminder = task.reminder?.enabled;
  const isMeeting = task.taskType === 'meeting';
  const linkedDashboard = dashboards.find((d) => d.id === task.dashboardId);

  const dueClass =
    task.completed ? 'due-done' : overdue ? 'due-overdue' : bucket === 'today' ? 'due-today' : '';

  return (
    <li className={`task-item ${task.completed ? 'is-completed' : ''} prio-${task.priority}`}>
      <div className="task-row">
        <button
          type="button"
          className={`task-check ${task.completed ? 'checked' : ''}`}
          onClick={() => onToggle(task.id)}
          aria-label={task.completed ? 'Mark as not done' : 'Mark as done'}
          title={task.completed ? 'Mark as not done' : 'Mark as done'}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="task-body" onClick={() => onEdit(task)} role="button" tabIndex={0}>
          <div className="task-title-row">
            {isMeeting && (
              <span className="chip chip-meeting" title="Meeting">
                <Users size={12} />
                Meeting
              </span>
            )}
            {task.priority !== 'none' && task.priority !== 'low' && (
              <Flag className="task-flag" size={14} style={{ color: prio.color }} aria-label={`${prio.label} priority`} />
            )}
            <span className="task-title">{task.title}</span>
          </div>

          {(task.notes || taskLabels.length || task.dueDate || recurring || hasReminder || linkedDashboard || task.meetingNotes || task.screenshot) && (
            <div className="task-meta">
              {task.dueDate && (
                <span className={`task-due ${dueClass}`}>
                  {formatDueDate(task.dueDate)}
                  {task.dueTime ? ` · ${task.dueTime}` : ''}
                </span>
              )}
              {linkedDashboard && (
                <span className="chip chip-dash" title={`Linked to ${linkedDashboard.name}`}>
                  <Link2 size={11} />
                  {linkedDashboard.name}
                </span>
              )}
              {task.screenshot && (
                <span className="chip chip-shot" title="Screenshot attached">
                  <ImageIcon size={11} />
                  Shot
                </span>
              )}
              {recurring && (
                <span className="chip chip-recur" title={describeRecurrence(task.recurrence)}>
                  <Repeat2 size={11} />
                  {describeRecurrence(task.recurrence).replace('Repeats ', '').replace('Repeats every ', 'Every ')}
                </span>
              )}
              {hasReminder && (
                <span className="chip chip-reminder" title="Reminder set">
                  <Bell size={11} />
                </span>
              )}
              {taskLabels.map((l) => (
                <span className="chip chip-label" key={l.id}>
                  <span className="chip-dot" style={{ background: l.color }} />
                  {l.name}
                </span>
              ))}
            </div>
          )}

          {isMeeting && (task.meetingNotes || task.screenshot) && (
            <div className="task-meeting-excerpt">
              {task.meetingNotes && <p className="task-excerpt-notes">{task.meetingNotes}</p>}
              {task.screenshot && <img src={task.screenshot} alt={`Screenshot for ${task.title}`} className="task-excerpt-shot" />}
            </div>
          )}
        </div>

        <div className="task-actions">
          <button className="icon-btn" onClick={() => onEdit(task)} title="Edit task">
            <Pencil size={15} />
          </button>
          <button className="icon-btn danger" onClick={() => onDelete(task.id)} title="Delete task">
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </li>
  );
}
