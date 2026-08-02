import { useMemo } from 'react';
import { ArrowLeft, ExternalLink, Pencil, Users, Calendar, StickyNote, Image as ImageIcon, CheckCheck } from 'lucide-react';
import { DASHBOARD_STATUSES, dashboardStatusMeta } from '../utils/constants';
import { formatDueDate } from '../utils/dates';

export default function DashboardDetail({
  dashboard,
  tasks,
  onBack,
  onEdit,
  onOpenTask,
  onToggleTask,
  onUpdateProgress,
  onUpdateStatus,
}) {
  const sm = dashboardStatusMeta(dashboard.status);

  const linked = useMemo(
    () =>
      (tasks || [])
        .filter((t) => t.dashboardId === dashboard.id)
        .sort((a, b) => (a.completed ? 1 : 0) - (b.completed ? 1 : 0) || (a.createdAt < b.createdAt ? -1 : 1)),
    [tasks, dashboard.id],
  );

  const meetings = linked.filter((t) => t.taskType === 'meeting');
  const others = linked.filter((t) => t.taskType !== 'meeting');

  return (
    <div className="dashboard-detail">
      <button type="button" className="btn btn-ghost back-btn" onClick={onBack}>
        <ArrowLeft size={16} /> All dashboards
      </button>

      <div className="dashboard-detail-head">
        <div>
          <div className="dashboard-detail-title-row">
            <h2>{dashboard.name}</h2>
            <span className="status-badge" style={{ background: `${sm.color}1f`, color: sm.color }}>
              <span className="chip-dot" style={{ background: sm.color }} />
              {sm.label}
            </span>
          </div>
          <p className="dashboard-detail-sub">
            {dashboard.workspace && <><strong>{dashboard.workspace}</strong> · </>}
            {dashboard.description || 'No description.'}
          </p>
        </div>
        <div className="dashboard-detail-actions">
          {dashboard.url && (
            <a className="btn btn-primary" href={dashboard.url} target="_blank" rel="noreferrer">
              <ExternalLink size={16} /> Open in Power BI
            </a>
          )}
          <button type="button" className="btn" onClick={() => onEdit(dashboard)}>
            <Pencil size={15} /> Edit
          </button>
        </div>
      </div>

      <div className="dashboard-detail-panels">
        <section className="panel">
          <h3 className="panel-title">Progress tracker</h3>
          <div className="big-progress">
            <div className="dashboard-progress-track">
              <div className="dashboard-progress-fill" style={{ width: `${dashboard.progress}%`, background: sm.color }} />
            </div>
            <span className="dashboard-progress-pct">{dashboard.progress}%</span>
          </div>
          <label className="form-label" style={{ marginTop: 14 }}>Update progress</label>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            className="progress-slider"
            value={dashboard.progress}
            onChange={(e) => onUpdateProgress(dashboard.id, Number(e.target.value))}
          />
          <div className="progress-scale">
            <span>0</span>
            <span>50</span>
            <span>100</span>
          </div>

          <label className="form-label" style={{ marginTop: 16 }}>Status</label>
          <div className="status-row">
            {DASHBOARD_STATUSES.map((s) => {
              const on = dashboard.status === s.value;
              return (
                <button
                  key={s.value}
                  type="button"
                  className={`chip chip-btn ${on ? 'on' : ''}`}
                  style={on ? { borderColor: s.color, color: s.color, background: 'transparent' } : undefined}
                  onClick={() => onUpdateStatus(dashboard.id, s.value)}
                >
                  <span className="chip-dot" style={{ background: s.color }} />
                  {s.label}
                </button>
              );
            })}
          </div>

          {dashboard.dueDate && (
            <p className="panel-note">
              <Calendar size={14} /> Due {formatDueDate(dashboard.dueDate)}
            </p>
          )}
        </section>

        <section className="panel">
          <h3 className="panel-title">
            <Users size={15} /> Meetings & recap ({meetings.length})
          </h3>
          {meetings.length === 0 ? (
            <p className="panel-empty">No meetings linked yet. Open a meeting task and link it to this dashboard.</p>
          ) : (
            <div className="meeting-list">
              {meetings.map((m) => (
                <article key={m.id} className={`meeting-card ${m.completed ? 'done' : ''}`}>
                  <div className="meeting-card-head">
                    <button type="button" className={`task-check ${m.completed ? 'checked' : ''}`} onClick={() => onToggleTask(m.id)} aria-label="Toggle done">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
                        <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <div className="meeting-card-title" onClick={() => onOpenTask(m)}>
                      <strong>{m.title}</strong>
                      <span className="meeting-card-meta">
                        {m.dueDate && <>{formatDueDate(m.dueDate)}{m.dueTime ? ` at ${m.dueTime}` : ''} · </>}
                        {m.completed ? 'Completed' : 'Open'}
                      </span>
                    </div>
                  </div>

                  {(m.meetingNotes || m.screenshot) && (
                    <div className="meeting-card-body" onClick={() => onOpenTask(m)}>
                      {m.meetingNotes && (
                        <p className="meeting-notes">
                          <StickyNote size={13} /> {m.meetingNotes}
                        </p>
                      )}
                      {m.screenshot && (
                        <img src={m.screenshot} alt={`Screenshot for ${m.title}`} className="meeting-shot" />
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        {others.length > 0 && (
          <section className="panel">
            <h3 className="panel-title">
              <CheckCheck size={15} /> Linked to-dos ({others.length})
            </h3>
            <ul className="linked-task-list">
              {others.map((t) => (
                <li key={t.id} className={`linked-task ${t.completed ? 'done' : ''}`}>
                  <button type="button" className={`task-check ${t.completed ? 'checked' : ''}`} onClick={() => onToggleTask(t.id)} aria-label="Toggle done">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
                      <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <span className="linked-task-label" onClick={() => onOpenTask(t)}>{t.title}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      <span className="panel-note"><ImageIcon size={14} /> Screenshots appear above for quick recap.</span>
    </div>
  );
}
