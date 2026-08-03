import { useMemo } from 'react';
import { filterTasks, groupByBucket } from '../utils/selectors';
import { BUCKET_LABELS, BUCKET_ORDER } from '../utils/dates';
import TaskItem from './TaskItem.jsx';
import EmptyState from './EmptyState.jsx';

const BUCKET_ICON = {
  overdue: 'overdue',
  today: 'today',
  tomorrow: 'tomorrow',
  week: 'week',
  later: 'later',
  someday: 'someday',
};

export default function TaskList({ tasks, labels, dashboards, now, onToggle, onEdit, onDelete, onTogglePin, view, onOpenDashboard, onCreate }) {
  const groups = useMemo(() => groupByBucket(filterTasks(tasks, view, now), now), [tasks, view, now]);
  const hasAny = groups.some((g) => g.tasks.length > 0);

  if (!hasAny) {
    return <EmptyState view={view} hasTasks={tasks.length > 0} onCreate={onCreate} />;
  }

  return (
    <div className="task-groups">
      {groups.map((group) =>
        group.tasks.length === 0 ? null : (
          <section className="task-group" key={group.bucket}>
            <header className="task-group-header">
              <span className={`bucket-dot bucket-${BUCKET_ICON[group.bucket]}`} />
              <h3>{BUCKET_LABELS[group.bucket]}</h3>
              <span className="task-group-count">{group.tasks.length}</span>
            </header>
            <ul className="task-list">
              {group.tasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  labels={labels}
                  dashboards={dashboards}
                  now={now}
                  onToggle={onToggle}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onTogglePin={onTogglePin}
                  onOpenDashboard={onOpenDashboard}
                />
              ))}
            </ul>
          </section>
        ),
      )}
    </div>
  );
}
