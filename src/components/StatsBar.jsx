import { AlertCircle, Sun, CheckCheck, Sparkles } from 'lucide-react';

export default function StatsBar({ stats }) {
  if (!stats) return null;
  return (
    <div className="stats-bar">
      <div className="stat stat-overdue">
        <AlertCircle size={16} />
        <div>
          <strong>{stats.overdue}</strong>
          <span>Overdue</span>
        </div>
      </div>
      <div className="stat">
        <Sun size={16} />
        <div>
          <strong>{stats.dueToday}</strong>
          <span>Due today</span>
        </div>
      </div>
      <div className="stat">
        <CheckCheck size={16} />
        <div>
          <strong>{stats.completedToday}</strong>
          <span>Done today</span>
        </div>
      </div>
      <div className="stat stat-active">
        <Sparkles size={16} />
        <div>
          <strong>{stats.active}</strong>
          <span>Active tasks</span>
        </div>
      </div>
    </div>
  );
}
