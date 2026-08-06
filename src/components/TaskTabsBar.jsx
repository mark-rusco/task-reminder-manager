import { Sun, Inbox, CheckCheck, CalendarClock } from 'lucide-react';

const TABS = [
  { id: 'today', label: 'Today', icon: Sun },
  { id: 'all', label: 'All', icon: Inbox },
  { id: 'upcoming', label: 'Upcoming', icon: CalendarClock },
  { id: 'completed', label: 'Completed', icon: CheckCheck },
];

/** Task tabs are unreachable defaults; "all" also covers search. */
const ALL_ACTIVE = new Set(['inbox', 'search']);

/**
 * Mobile task-scope switcher. Shown only on small screens in place of
 * separate nav entries for the task list, matching the grouping used by
 * Todoist / Google Tasks. Desktop keeps the full sidebar for these views.
 */
export default function TaskTabsBar({ activeView, counts, onNavigate }) {
  if (activeView.type === 'dashboards' || activeView.type === 'lilo' || activeView.type === 'tracker' || activeView.type === 'teamleave' || activeView.type === 'reports' || activeView.type === 'calendar' || activeView.type === 'admin') {
    return null;
  }
  return (
    <div className="task-tabs-wrap">
      <div className="task-tabs" role="tablist" aria-label="Task list scope">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = tab.id === 'all' ? ALL_ACTIVE.has(activeView.type) : activeView.type === tab.id;
          const count = tab.id === 'all' ? counts.inbox : counts[tab.id];
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`task-tab ${active ? 'active' : ''}`}
              onClick={() => onNavigate(tab.id === 'all' ? 'inbox' : tab.id)}
            >
              <Icon size={16} strokeWidth={active ? 2.2 : 1.8} />
              <span>{tab.label}</span>
              {count > 0 && <span className="task-tab-count">{count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}