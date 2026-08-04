import { Users, CalendarCheck, CheckSquare } from 'lucide-react';
import { teamLeaveActive } from '../utils/constants';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/** Compact "who is on leave today" card shown on the Inbox and Today pages. */
export default function TeamLeaveCard({ entries, onOpen }) {
  const active = entries.filter((e) => teamLeaveActive(e, todayISO()));
  const pending = active.reduce((n, e) => n + (e.coverTasks || []).filter((c) => !c.done).length, 0);

  return (
    <button type="button" className="tl-card-today" onClick={onOpen}>
      <span className="tl-card-today-icon"><Users size={16} /></span>
      <span className="tl-card-today-body">
        <strong>On leave today</strong>
        {active.length === 0 ? (
          <span className="tl-card-today-muted">No one is on leave today.</span>
        ) : (
          <span className="tl-card-today-names">
            {active.map((e) => (
              <span key={e.id} className="tl-card-today-name">{e.member}{e.reason ? ` · ${e.reason}` : ''}</span>
            ))}
          </span>
        )}
      </span>
      {pending > 0 ? (
        <span className="tl-card-today-meta"><CheckSquare size={13} /> {pending} to cover</span>
      ) : active.length > 0 ? (
        <span className="tl-card-today-meta ok"><CalendarCheck size={13} /> All covered</span>
      ) : null}
    </button>
  );
}