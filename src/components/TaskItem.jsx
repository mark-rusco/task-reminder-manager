import { timeBucket, formatDueDate, isOverdue } from '../utils/dates';
import { priorityMeta } from '../utils/constants';
import { hasRecurrence, describeRecurrence } from '../utils/recurrence';
import { Repeat2, Bell, Flag, Pencil, Trash2 } from 'lucide-react';

export default function TaskItem({ task, labels, now, onToggle, onEdit, onDelete }) {
  const bucket = timeBucket(task, now);
  const overdue = isOverdue(task, now);
  const prio = priorityMeta(task.priority);
  const taskLabels = (task.labels || []).map((id) => labels.find((l) => l.id === id)).filter(Boolean);
  const recurring = hasRecurrence(task.recurrence);
  const hasReminder = task.reminder?.enabled;

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
            {task.priority !== 'none' && task.priority !== 'low' && (
              <Flag className="task-flag" size={14} style={{ color: prio.color }} aria-label={`${prio.label} priority`} />
            )}
            <span className="task-title">{task.title}</span>
          </div>

          {(task.notes || taskLabels.length || task.dueDate || recurring || hasReminder) && (
            <div className="task-meta">
              {task.dueDate && (
                <span className={`task-due ${dueClass}`}>
                  {formatDueDate(task.dueDate)}
                  {task.dueTime ? ` · ${task.dueTime}` : ''}
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
