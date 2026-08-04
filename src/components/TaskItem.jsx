import { timeBucket, formatDueDate, isOverdue } from '../utils/dates';
import { priorityMeta } from '../utils/constants';
import { hasRecurrence, describeRecurrence } from '../utils/recurrence';
import { Flag, Pencil, Trash2, Link2, Image as ImageIcon, Pin } from 'lucide-react';

export default function TaskItem({ task, labels, dashboards, now, onToggle, onEdit, onDelete, onOpenDashboard, onTogglePin }) {
  const bucket = timeBucket(task, now);
  const overdue = isOverdue(task, now);
  const prio = priorityMeta(task.priority);
  const taskLabels = (task.labels || []).map((id) => labels.find((l) => l.id === id)).filter(Boolean);
  const recurring = hasRecurrence(task.recurrence);
  const hasReminder = task.reminder?.enabled;
  const isMeeting = task.taskType === 'meeting';
  const isRefresh = task.taskType === 'refresh';
  const linkedDashboards = (task.dashboardIds || []).map((id) => dashboards.find((d) => d.id === id)).filter(Boolean);
  const workspaces = [...new Set(linkedDashboards.map((d) => d.workspace).filter(Boolean))];

  const dueClass =
    task.completed ? 'due-done' : overdue ? 'due-overdue' : bucket === 'today' ? 'due-today' : '';

  const dueText = task.dueDate
    ? formatDueDate(task.dueDate) + (task.dueTime ? ` · ${task.dueTime}` : '')
    : '';
  const recurText = recurring
    ? describeRecurrence(task.recurrence).replace(/^Repeats /, '').replace(/^every /, 'Every ')
    : '';

  // Subtitle line 1: Pinned • Workspace
  const subMain = [];
  if (task.pinned) subMain.push('Pinned');
  subMain.push(...workspaces);

  // Subtitle line 2: Today • every weekday • Meeting
  const subMeta = [];
  if (dueText) subMeta.push(dueText);
  if (recurText) subMeta.push(recurText);
  if (isMeeting) subMeta.push('Meeting');
  if (isRefresh) subMeta.push('Refresh');
  if (hasReminder) subMeta.push('Reminder');
  const subMetaRest = subMeta.filter((s) => s !== dueText);

  return (
    <li className={`task-item ${task.completed ? 'is-completed' : ''} ${task.pinned ? 'is-pinned' : ''} prio-${task.priority}`}>
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

        <div
          className="task-body"
          onClick={() => onEdit(task)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onEdit(task);
            }
          }}
        >
          <div className="task-title-row">
            {task.priority !== 'none' && (
              <Flag className="task-flag" size={15} style={{ color: prio.color }} aria-label={`${prio.label} priority`} />
            )}
            <span className="task-title">{task.title}</span>
          </div>

          {(subMain.length > 0 || subMeta.length > 0) && (
            <div className="task-sub">
              {subMain.length > 0 && <span className="task-sub-line task-sub-main">{subMain.join(' • ')}</span>}
              {subMeta.length > 0 && (
                <span className="task-sub-line task-sub-meta">
                  {dueText && <span className={`sub-due ${dueClass}`}>{dueText}</span>}
                  {dueText && subMetaRest.length > 0 && <span className="sub-sep">{' • '}</span>}
                  {subMetaRest.join(' • ')}
                </span>
              )}
            </div>
          )}

          {(taskLabels.length || linkedDashboards.length || task.screenshot) && (
            <div className="task-meta">
              {linkedDashboards.map((d) => (
                <a
                  key={d.id}
                  className="chip chip-dash"
                  href={d.url || undefined}
                  target={d.url ? '_blank' : undefined}
                  rel="noreferrer"
                  title={d.url ? `Open ${d.name}` : `Open ${d.name} in Dashboards`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!d.url) {
                      e.preventDefault();
                      onOpenDashboard && onOpenDashboard(d.id);
                    }
                  }}
                >
                  <Link2 size={11} />
                  {d.name}
                </a>
              ))}
              {task.screenshot && (
                <span className="chip chip-shot" title="Screenshot attached">
                  <ImageIcon size={11} />
                  Shot
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
          <button
            className={`icon-btn ${task.pinned ? 'active' : ''}`}
            onClick={() => onTogglePin && onTogglePin(task.id)}
            title={task.pinned ? 'Unpin task' : 'Pin task — top of your list on the next shift'}
            aria-label={task.pinned ? 'Unpin task' : 'Pin task'}
          >
            <Pin size={15} />
          </button>
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
