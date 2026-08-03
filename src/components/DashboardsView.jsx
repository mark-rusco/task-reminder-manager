import { useMemo, useState } from 'react';
import { Search, Plus, LayoutDashboard, ExternalLink, Pencil, Trash2, Link2, CalendarClock } from 'lucide-react';
import { DASHBOARD_STATUSES, dashboardStatusMeta, dashboardTypeMeta } from '../utils/constants';
import { formatDueDate, isOverdue } from '../utils/dates';
import DashboardTypeIcon from './DashboardTypeIcon.jsx';

export default function DashboardsView({
  dashboards,
  tasks,
  now,
  onNew,
  onEdit,
  onDelete,
  onOpen,
}) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const linkedCount = useMemo(() => {
    const map = {};
    for (const t of tasks) {
      (t.dashboardIds || []).forEach((id) => {
        if (id) map[id] = (map[id] || 0) + 1;
      });
    }
    return map;
  }, [tasks]);

  const stats = useMemo(() => {
    const published = dashboards.filter((d) => d.status === 'published').length;
    const inProgress = dashboards.filter((d) => d.status === 'in-progress').length;
    const avg = dashboards.length ? Math.round(dashboards.reduce((s, d) => s + (Number(d.progress) || 0), 0) / dashboards.length) : 0;
    return { total: dashboards.length, published, inProgress, avg };
  }, [dashboards]);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return dashboards
      .filter((d) => (filter === 'all' ? true : d.status === filter))
      .filter((d) =>
        !q
          ? true
          : d.name.toLowerCase().includes(q) ||
            (d.description || '').toLowerCase().includes(q) ||
            (d.workspace || '').toLowerCase().includes(q) ||
            dashboardTypeMeta(d.type).label.toLowerCase().includes(q),
      );
  }, [dashboards, filter, search]);

  return (
    <div className="dashboards-page">
      <div className="dashboards-toolbar">
        <div className="search-box">
          <Search size={16} />
          <input
            type="search"
            placeholder="Search dashboards…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search dashboards"
          />
        </div>
        <div className="status-filters">
          <button type="button" className={`chip chip-btn ${filter === 'all' ? 'on' : ''}`} onClick={() => setFilter('all')}>
            All ({dashboards.length})
          </button>
          {DASHBOARD_STATUSES.map((s) => {
            const n = dashboards.filter((d) => d.status === s.value).length;
            if (!n) return null;
            return (
              <button
                key={s.value}
                type="button"
                className={`chip chip-btn ${filter === s.value ? 'on' : ''}`}
                onClick={() => setFilter(s.value)}
              >
                <span className="chip-dot" style={{ background: s.color }} />
                {s.label} ({n})
              </button>
            );
          })}
        </div>
        <button type="button" className="btn btn-primary" onClick={onNew}>
          <Plus size={16} />
          New Dashboard
        </button>
      </div>

      <div className="stats-bar dash-stats">
        <div className="stat">
          <LayoutDashboard size={16} />
          <div>
            <strong>{stats.total}</strong>
            <span>Dashboards</span>
          </div>
        </div>
        <div className="stat">
          <span className="chip-dot" style={{ background: '#f59e0b' }} />
          <div>
            <strong>{stats.inProgress}</strong>
            <span>In progress</span>
          </div>
        </div>
        <div className="stat">
          <span className="chip-dot" style={{ background: '#10b981' }} />
          <div>
            <strong>{stats.published}</strong>
            <span>Published</span>
          </div>
        </div>
        <div className="stat">
          <span className="chip-dot" style={{ background: '#8b5cf6' }} />
          <div>
            <strong>{stats.avg}%</strong>
            <span>Avg progress</span>
          </div>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <LayoutDashboard size={30} />
          </div>
          <h3>{dashboards.length ? 'No dashboards match' : 'No dashboards yet'}</h3>
          <p>{dashboards.length ? 'Try a different filter or search.' : 'Track your Power BI inventory and progress from one place.'}</p>
          {!dashboards.length && (
            <button type="button" className="btn btn-primary" onClick={onNew}>
              <Plus size={16} /> Create your first dashboard
            </button>
          )}
        </div>
      ) : (
        <div className="dashboard-grid">
          {list.map((d) => {
            const sm = dashboardStatusMeta(d.status);
            const overdue = d.dueDate && !['published', 'deprecated'].includes(d.status) && isOverdue({ dueDate: d.dueDate }, now);
            const linked = linkedCount[d.id] || 0;
            return (
              <article key={d.id} className="dashboard-card" onClick={() => onOpen(d.id)} role="button" tabIndex={0}>
                <div className="dashboard-card-head">
                  <div className="dashboard-card-title">
                    <div className="dashboard-card-name-row">
                      <DashboardTypeIcon type={d.type} size={16} />
                      <h3>{d.name}</h3>
                    </div>
                    {d.workspace && <span className="dashboard-workspace">{d.workspace}</span>}
                  </div>
                  <span className="status-badge" style={{ background: `${sm.color}1f`, color: sm.color }}>
                    <span className="chip-dot" style={{ background: sm.color }} />
                    {sm.label}
                  </span>
                </div>

                <p className="dashboard-card-desc">{d.description || 'No description.'}</p>

                <div className="dashboard-progress">
                  <div className="dashboard-progress-track">
                    <div className="dashboard-progress-fill" style={{ width: `${d.progress}%`, background: sm.color }} />
                  </div>
                  <span className="dashboard-progress-pct">{d.progress}%</span>
                </div>

                <div className="dashboard-card-meta">
                  {linked > 0 && (
                    <span className="chip chip-meeting">
                      <Link2 size={11} /> {linked} linked
                    </span>
                  )}
                  {d.dueDate && (
                    <span className={`chip ${overdue ? 'due-overdue' : ''}`}>
                      <CalendarClock size={11} /> {formatDueDate(d.dueDate)}
                    </span>
                  )}
                </div>

                <div className="dashboard-card-actions" onClick={(e) => e.stopPropagation()}>
                  {d.url && (
                    <a className="icon-btn" href={d.url} target="_blank" rel="noreferrer" title="Open in Power BI">
                      <ExternalLink size={15} />
                    </a>
                  )}
                  <button className="icon-btn" onClick={() => onEdit(d)} title="Edit dashboard">
                    <Pencil size={15} />
                  </button>
                  <button className="icon-btn danger" onClick={() => onDelete(d.id)} title="Delete dashboard">
                    <Trash2 size={15} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
