import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';

const LILO_COLORS = {
  PTO: 'var(--danger)',
  Sick: '#a855f7',
  'Rest Day': 'var(--text-3)',
  WFH: 'var(--success)',
  'Office - Manila': 'var(--primary)',
  'Office - Muntinlupa': 'var(--warning)',
};

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function CalendarView({ tasks, liloEntries, todayNow, onAddTask, onOpenTask, onToggle }) {
  const [cursor, setCursor] = useState(() => dayjs().startOf('month'));
  const [selected, setSelected] = useState(() => dayjs().format('YYYY-MM-DD'));

  const cells = useMemo(() => {
    const start = cursor.startOf('month');
    const leading = (start.day() + 6) % 7; // Monday-first
    const total = 42;
    const arr = [];
    for (let i = 0; i < total; i++) {
      const d = start.subtract(leading, 'day').add(i, 'day');
      arr.push(d);
    }
    return arr;
  }, [cursor]);

  const byDay = useMemo(() => {
    const map = {};
    for (const t of tasks) if (t.dueDate) (map[t.dueDate] ||= []).push(t);
    return map;
  }, [tasks]);

  const liloByDate = useMemo(() => {
    const map = {};
    for (const e of liloEntries || []) if (e.date) map[e.date] = e;
    return map;
  }, [liloEntries]);

  const selectedTasks = byDay[selected] || [];
  const selectedLilo = liloByDate[selected];

  const shiftMonth = (n) => setCursor((c) => c.startOf('month').add(n, 'month'));

  return (
    <div className="calendar-page">
      <div className="calendar-toolbar">
        <div className="calendar-nav">
          <button type="button" className="icon-btn" onClick={() => shiftMonth(-1)} aria-label="Previous month">
            <ChevronLeft size={18} />
          </button>
          <span className="calendar-title">{cursor.format('MMMM YYYY')}</span>
          <button type="button" className="icon-btn" onClick={() => shiftMonth(1)} aria-label="Next month">
            <ChevronRight size={18} />
          </button>
          <button type="button" className="btn sm" onClick={() => { setCursor(dayjs().startOf('month')); setSelected(dayjs().format('YYYY-MM-DD')); }}>
            Today
          </button>
        </div>
      </div>

      <div className="calendar-grid">
        {WEEKDAYS.map((w) => (
          <div key={w} className="calendar-dow">{w}</div>
        ))}
        {cells.map((d) => {
          const ds = d.format('YYYY-MM-DD');
          const dayTasks = byDay[ds] || [];
          const lilo = liloByDate[ds];
          const outside = d.month() !== cursor.month();
          const isSel = ds === selected;
          const isToday = d.isSame(todayNow, 'day');
          const markers = dayTasks.slice(0, 3).map((t) => ({ cls: t.pinned ? 'pinned' : 'task' }));
          if (lilo) {
            const c = LILO_COLORS[lilo.status];
            if (c) markers.push({ cls: 'lilo', color: c });
          }
          return (
            <button
              key={ds}
              type="button"
              className={`calendar-day ${outside ? 'outside' : ''} ${isSel ? 'selected' : ''} ${isToday ? 'today' : ''}`}
              onClick={() => setSelected(ds)}
            >
              <span className="calendar-day-num">{d.date()}</span>
              <span className="calendar-markers">
                {markers.map((m, i) => (
                  <span key={i} className={`cal-marker ${m.cls}`} style={m.color ? { background: m.color } : undefined} />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <div className="calendar-legend">
        <span><span className="cal-marker task" /> Task due</span>
        <span><span className="cal-marker pinned" /> Pinned</span>
        {Object.entries(LILO_COLORS).map(([k, c]) => (
          <span key={k}><span className="cal-marker" style={{ background: c }} /> {k}</span>
        ))}
      </div>

      <section className="panel calendar-day-panel">
        <div className="panel-title">
          {dayjs(selected).format('dddd, MMMM D')}
          <button type="button" className="btn sm" onClick={() => onAddTask && onAddTask(selected)}>
            <Plus size={14} /> Add task
          </button>
        </div>
        {selectedLilo && (
          <p className="calendar-lilo-line">
            <span className="cal-marker" style={{ background: LILO_COLORS[selectedLilo.status] }} /> {selectedLilo.status}
            {selectedLilo.location ? ` · ${selectedLilo.location}` : ''}
            {selectedLilo.startTime ? ` · ${selectedLilo.startTime}` : ''}
          </p>
        )}
        {selectedTasks.length === 0 ? (
          <p className="report-empty">Nothing due this day.</p>
        ) : (
          <ul className="calendar-task-list">
            {selectedTasks.map((t) => (
              <li key={t.id} className={t.completed ? 'done' : ''}>
                <button type="button" className="cal-check" onClick={() => onToggle && onToggle(t.id)} aria-label="Toggle done">
                  {t.completed ? '✓' : ''}
                </button>
                <span className="cal-task-title" role="button" tabIndex={0} onClick={() => onOpenTask && onOpenTask(t)}>
                  {t.title}
                </span>
                {t.dueTime && <span className="cal-task-time">{t.dueTime}</span>}
                {t.pinned && <span className="cal-pin">📌</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}