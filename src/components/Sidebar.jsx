import {
  Inbox,
  Sun,
  CalendarClock,
  CheckCheck,
  LayoutDashboard,
  ClipboardList,
  Plus,
  MoreHorizontal,
  ExternalLink,
} from 'lucide-react';

const NAV = [
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'today', label: 'Today', icon: Sun },
  { id: 'upcoming', label: 'Upcoming', icon: CalendarClock },
  { id: 'completed', label: 'Completed', icon: CheckCheck },
  { id: 'dashboards', label: 'Dashboards', icon: LayoutDashboard },
  { id: 'lilo', label: 'LILO Tracker', icon: ClipboardList },
];

export default function Sidebar({
  activeView,
  onNavigate,
  labels,
  activeLabel,
  onSelectLabel,
  onNewTask,
  onManageLabels,
  counts,
  dashboards,
}) {
  const quickLinks = (dashboards || []).filter((d) => d.url && d.url.trim()).sort((a, b) => a.name.localeCompare(b.name));
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
            <path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="brand-text">
          <strong>Focusly</strong>
          <span>Task &amp; Reminder</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = activeView === item.id && !activeLabel;
          return (
            <button
              key={item.id}
              type="button"
              className={`nav-item ${active ? 'active' : ''}`}
              onClick={() => onNavigate(item.id)}
            >
              <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
              <span className="nav-label">{item.label}</span>
              {counts[item.id] > 0 && <span className="nav-count">{counts[item.id]}</span>}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-section-head">
        <span>Quick links</span>
      </div>
      <nav className="sidebar-nav quick-nav">
        {quickLinks.length === 0 ? (
          <p className="sidebar-empty">Pin a dashboard from Dashboards to jump straight to it.</p>
        ) : (
          quickLinks.map((d) => (
            <a
              key={d.id}
              className="nav-item"
              href={d.url}
              target="_blank"
              rel="noreferrer"
              title={`Open ${d.name}`}
            >
              <ExternalLink size={16} strokeWidth={1.8} />
              <span className="nav-label">{d.name}</span>
            </a>
          ))
        )}
      </nav>

      <div className="sidebar-section-head">
        <span>Categories</span>
        <button type="button" className="icon-btn sm" onClick={onManageLabels} title="Manage categories">
          <MoreHorizontal size={15} />
        </button>
      </div>

      <nav className="sidebar-nav labels">
        {labels.map((l) => {
          const active = activeLabel === l.id;
          return (
            <button
              key={l.id}
              type="button"
              className={`nav-item ${active ? 'active' : ''}`}
              onClick={() => onSelectLabel(l.id)}
            >
              <span className="label-dot" style={{ background: l.color }} />
              <span className="nav-label">{l.name}</span>
              <span className="nav-count">{counts['label-' + l.id] || 0}</span>
            </button>
          );
        })}
        {labels.length === 0 && <p className="sidebar-empty">No categories yet.</p>}
      </nav>

      <div className="sidebar-footer">
        <button type="button" className="btn btn-primary btn-block" onClick={onNewTask}>
          <Plus size={18} />
          New Task
        </button>
        <p className="sidebar-hint">Shortcut: <kbd>N</kbd></p>
      </div>
    </aside>
  );
}
