import { useMemo } from 'react';
import { Sun, Pin, Clock } from 'lucide-react';
import { parseShiftSchedule } from '../utils/lilo';
import { isOverdue, isDueToday } from '../utils/dates';

export default function ShiftStartBanner({ tasks, now, profile, onShowToday }) {
  const shift = parseShiftSchedule(profile?.custom_fields?.shift_schedule);

  const { pinned, overdue, dueToday } = useMemo(() => {
    const list = Array.isArray(tasks) ? tasks : [];
    return {
      pinned: list.filter((t) => !t.completed && t.pinned),
      overdue: list.filter((t) => !t.completed && isOverdue(t, now)),
      dueToday: list.filter((t) => !t.completed && isDueToday(t, now)),
    };
  }, [tasks, now]);

  const headline = shift ? `Shift starts ${shift.startTime}` : 'Your day';
  const focus = [...pinned.slice(0, 3), ...overdue.slice(0, 3)].reduce((acc, t) => {
    if (!acc.find((x) => x.id === t.id)) acc.push(t);
    return acc;
  }, []);

  if (!pinned.length && !overdue.length && !dueToday.length) return null;

  return (
    <div className="shift-banner">
      <div className="shift-banner-head">
        <span className="shift-banner-title">
          <Sun size={16} /> {headline}
        </span>
        <span className="shift-banner-counts">
          {pinned.length > 0 && (
            <span className="shift-count">
              <Pin size={13} /> {pinned.length} pinned
            </span>
          )}
          {overdue.length > 0 && <span className="shift-count">{overdue.length} overdue</span>}
          <span className="shift-count">{dueToday.length} due today</span>
        </span>
      </div>

      {focus.length > 0 && (
        <ul className="shift-banner-list">
          {focus.map((t) => (
            <li key={t.id} className="shift-banner-item">
              <span className={`shift-dot ${isOverdue(t, now) ? 'overdue' : t.pinned ? 'pinned' : ''}`} />
              <Clock size={12} className="shift-item-clock" />
              <span className="shift-item-title">{t.title}</span>
            </li>
          ))}
        </ul>
      )}

      <button type="button" className="shift-banner-cta" onClick={onShowToday}>
        Open Today
      </button>
    </div>
  );
}