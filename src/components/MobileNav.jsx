import { Inbox, LayoutDashboard, Search, Ellipsis, Plus } from 'lucide-react';

const PRIMARY = [
  { id: '__tasks', label: 'Tasks', icon: Inbox, hub: true },
  { id: 'dashboards', label: 'Boards', icon: LayoutDashboard },
  { id: '__new', label: 'New', icon: Plus, action: true },
  { id: '__search', label: 'Search', icon: Search, action: 'search' },
  { id: '__more', label: 'More', icon: Ellipsis, action: 'more' },
];

/** Views that live inside the "Tasks" hub (tab bar). */
const TASK_VIEWS = new Set(['inbox', 'today', 'upcoming', 'completed', 'label', 'search']);

/** Secondary views reachable through the "More" sheet. */
const MORE_VIEWS = new Set(['calendar', 'lilo', 'tracker', 'teamleave', 'reports', 'admin']);

/**
 * Fixed bottom navigation bar, shown on mobile (≤960px) only.
 * Tasks is a hub (All/Today/Upcoming/Completed live in the in-page tab bar),
 * the center "+" opens quick-create (or a new board on the Boards view),
 * Search focuses the header search, and "More" holds the trackers,
 * categories and quick links.
 */
export default function MobileNav({ activeView, counts, onNavigate, onNewTask, onNewBoard, onSearch, onOpenMore }) {
  const tasksActive = TASK_VIEWS.has(activeView);
  const moreActive = MORE_VIEWS.has(activeView);

  const renderButton = (item) => {
    const Icon = item.icon;

    if (item.action) {
      const isMore = item.id === '__more';
      const isCenter = item.id === '__new';
      const isSearch = item.id === '__search';
      const active = isMore ? moreActive : false;
      const fire = isMore
        ? onOpenMore
        : isSearch
          ? () => onSearch?.()
          : activeView === 'dashboards'
            ? () => onNewBoard?.()
            : onNewTask;
      return (
        <button
          key={item.id}
          type="button"
          className={`mobile-nav-btn ${active ? 'active' : ''}${isCenter ? ' center' : ''}`}
          onClick={fire}
          aria-label={item.label}
        >
          <span className="mobile-nav-ico">
            <Icon size={isCenter ? 26 : 22} strokeWidth={2.1} />
            {isCenter && <span className="mobile-nav-badge center" aria-hidden="true" />}
          </span>
          <span className="mobile-nav-label">{item.label}</span>
        </button>
      );
    }

    if (item.hub) {
      const count = counts.today || 0;
      return (
        <button
          key={item.id}
          type="button"
          className={`mobile-nav-btn ${tasksActive ? 'active' : ''}`}
          onClick={() => !tasksActive && onNavigate('today')}
          aria-label={item.label}
          aria-current={tasksActive ? 'page' : undefined}
        >
          <span className="mobile-nav-ico">
            <Icon size={22} strokeWidth={tasksActive ? 2.3 : 1.9} />
            {count > 0 && <span className="mobile-nav-badge alert">{count}</span>}
          </span>
          <span className="mobile-nav-label">{item.label}</span>
        </button>
      );
    }

    const active = activeView === item.id;
    return (
      <button
        key={item.id}
        type="button"
        className={`mobile-nav-btn ${active ? 'active' : ''}`}
        onClick={() => onNavigate(item.id)}
        aria-label={item.label}
        aria-current={active ? 'page' : undefined}
      >
        <span className="mobile-nav-ico">
          <Icon size={22} strokeWidth={active ? 2.3 : 1.9} />
          {counts[item.id] > 0 && <span className="mobile-nav-badge">{counts[item.id]}</span>}
        </span>
        <span className="mobile-nav-label">{item.label}</span>
      </button>
    );
  };

  return (
    <nav className="mobile-nav" aria-label="Primary">
      {PRIMARY.map(renderButton)}
    </nav>
  );
}