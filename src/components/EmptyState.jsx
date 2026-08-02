import { Inbox, Sun, CalendarClock, CheckCheck, Tags, Search, Plus } from 'lucide-react';

const CONFIG = {
  inbox: { icon: Inbox, title: 'All caught up', body: 'No open tasks. Add one to get started or enjoy the calm.' },
  today: { icon: Sun, title: 'Nothing due today', body: 'Enjoy your day — or plan ahead with the Upcoming view.' },
  upcoming: { icon: CalendarClock, title: 'Nothing upcoming', body: 'Your future looks clear. Add a task to plan ahead.' },
  completed: { icon: CheckCheck, title: 'No completed tasks yet', body: 'Finish a task and it will show up here.' },
  label: { icon: Tags, title: 'No tasks in this category', body: 'Assign this category to a task to see it here.' },
  search: { icon: Search, title: 'No matches found', body: 'Try a different keyword or clear the search.' },
};

export default function EmptyState({ view, hasTasks, onCreate }) {
  const cfg = CONFIG[view.type] || CONFIG.inbox;
  const Icon = cfg.icon;
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Icon size={30} />
      </div>
      <h3>{cfg.title}</h3>
      <p>{cfg.body}</p>
      {!hasTasks && view.type !== 'search' && (
        <button type="button" className="btn btn-primary" onClick={onCreate}>
          <Plus size={16} />
          Create your first task
        </button>
      )}
    </div>
  );
}
