import { Inbox, Sun, LayoutDashboard, Ellipsis, Plus } from 'lucide-react';

const PRIMARY = [
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'today', label: 'Today', icon: Sun },
  { id: '__new', label: 'New', icon: Plus, action: true },
  { id: 'dashboards', label: 'Boards', icon: LayoutDashboard },
  { id: '__more', label: 'More', icon: Ellipsis, action: 'more' },
];

/** Secondary views reachable through the "More" sheet. */
const MORE_VIEWS_KEY = new Set(['upcoming', 'completed', 'lilo', 'tracker', 'label', 'search']);

/**
 * Fixed bottom navigation bar, shown on mobile (≤960px) only.
 * Primary views sit in the bar; the center "+" opens quick-create and "More"
 * opens the full drawer (Upcoming/Completed/LILO/Tracker + labels + quick links).
 */
export default function MobileNav({ activeView, counts, onNavigate, onNewTask, onOpenMore }) {
  const moreActive = MORE_VIEWS_KEY.has(activeView);

  return (
    <nav className="mobile-nav" aria-label="Primary">
      {PRIMARY.map((item) => {
        const Icon = item.icon;

        if (item.action) {
          const isMore = item.id === '__more';
          const isCenter = item.id === '__new';
          const active = isMore && moreActive;
          const fire = isMore ? onOpenMore : onNewTask;
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
              {item.id !== 'dashboards' && counts[item.id] > 0 && (
                <span className={`mobile-nav-badge${item.id === 'today' ? ' alert' : ''}`}>{counts[item.id]}</span>
              )}
            </span>
            <span className="mobile-nav-label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}