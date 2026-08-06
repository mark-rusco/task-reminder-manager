import {
  Inbox,
  Sun,
  CalendarClock,
  CheckCheck,
  LayoutDashboard,
  ClipboardList,
  CalendarRange,
  CalendarDays,
  BarChart3,
  Users,
  Plus,
  ShieldCheck,
} from 'lucide-react';

const NAV = [
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'today', label: 'Today', icon: Sun },
  { id: 'upcoming', label: 'Upcoming', icon: CalendarClock },
  { id: 'completed', label: 'Completed', icon: CheckCheck },
  { id: 'dashboards', label: 'Dashboards', icon: LayoutDashboard },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'lilo', label: 'LILO Tracker', icon: ClipboardList },
  { id: 'tracker', label: 'Leave & RTO', icon: CalendarRange },
  { id: 'teamleave', label: 'Team Leave', icon: Users },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
];

export default function Sidebar({
  activeView,
  onNavigate,
  onNewTask,
  counts,
  isAdmin,
}) {
  const navItems = isAdmin ? [...NAV, { id: 'admin', label: 'Admin', icon: ShieldCheck }] : NAV;
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
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeView === item.id;
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
