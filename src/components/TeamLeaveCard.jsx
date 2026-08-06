import { CalendarCheck, CheckCircle2, ChevronRight } from 'lucide-react';
import { teamLeaveActive } from '../utils/constants';
import { avatarColor, initials, REASON_COLORS } from '../utils/avatar';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(iso, n) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function shortDate(iso) {
  if (!iso) return '';
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Glanceable "who is on leave" card for the Inbox & Today pages.
 * Only rendered when someone is on leave today OR starts leave on the next
 * shift day. Whole surface is one button (spans only, valid HTML) that jumps
 * to Team Leave. Status-driven: warning when coverage is open, success when
 * clear.
 */
export default function TeamLeaveCard({ entries, onOpen, today = todayISO(), tomorrow = addDays(todayISO(), 1) }) {
  const active = entries.filter((e) => teamLeaveActive(e, today));
  const starting = entries.filter((e) => e.startDate === tomorrow);
  if (active.length === 0 && starting.length === 0) return null;

  const mode = active.length > 0 ? 'today' : 'next';
  const shown = mode === 'today' ? active : starting;
  const pending = shown.reduce((n, e) => n + (e.coverTasks || []).filter((c) => !c.done).length, 0);
  const status = pending > 0 ? 'open' : 'done';
  const label = new Date((mode === 'today' ? today : tomorrow) + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
  const visible = shown.slice(0, 4);
  const hidden = shown.length - visible.length;

  const perPerson = (p) => {
    const open = (p.coverTasks || []).filter((c) => !c.done).length;
    const c = avatarColor(p.member);
    return { open, color: c, rc: REASON_COLORS[p.reason] || null };
  };

  return (
    <button type="button" className={`tl-card-today ${status}`} onClick={onOpen} aria-label="Open team leave">
      <span className="tl-today-top">
        <span className="tl-today-stack">
          {visible.map((p, i) => {
            const { color } = perPerson(p);
            return (
              <span key={p.id} className="tl-today-overlay" style={{ zIndex: 4 - i, background: `${color}26`, color, borderColor: color }}>
                {initials(p.member)}
              </span>
            );
          })}
          {hidden > 0 && <span className="tl-today-more">+{hidden}</span>}
        </span>
        <span className="tl-today-titles">
          <strong>{mode === 'today' ? 'On leave today' : 'On leave next shift'}</strong>
          <small>{label}</small>
        </span>
        <span className="tl-today-chev"><ChevronRight size={17} /></span>
      </span>

      <span className="tl-today-summary">
        <span className="tl-today-big">{shown.length}</span>
        <span className="tl-today-summary-text">
          <strong className="tl-today-away">
            {mode === 'today'
              ? shown.length === 1 ? 'person away' : 'people away'
              : shown.length === 1 ? 'person starting' : 'people starting'}
          </strong>
          <small>
            {status === 'done' ? (
              <>
                <CheckCircle2 size={12} /> everything covered
              </>
            ) : (
              `${pending} cover task${pending !== 1 ? 's' : ''} open`
            )}
          </small>
        </span>
        <span className={`tl-today-flag ${status}`}>
          {status === 'done' ? <CheckCircle2 size={13} /> : <span className="tl-today-flag-dot" />}
          {status === 'open' ? `${pending} to cover` : 'clear'}
        </span>
      </span>

      <span className="tl-today-people">
        {visible.map((p) => {
          const { open, color, rc } = perPerson(p);
          return (
            <span key={p.id} className="tl-today-person">
              <span className="tl-today-avatar" style={{ background: `${color}22`, color, borderColor: `${color}55` }}>
                {initials(p.member)}
              </span>
              <span className="tl-today-pname">
                <strong>{p.member}</strong>
                <small>
                  {p.reason && <span style={{ color: rc || undefined }}>{p.reason}</span>}
                  <span className="tl-today-window">
                    {shortDate(p.startDate)}{p.endDate ? `–${shortDate(p.endDate)}` : ''}
                  </span>
                </small>
              </span>
              <span className={`tl-today-cov ${open ? 'open' : 'ok'}`}>
                {open ? `${open} open` : <CheckCircle2 size={13} />}
              </span>
            </span>
          );
        })}
        {hidden > 0 && (
          <span className="tl-today-person more">
            <CalendarCheck size={13} /> {hidden} more on leave — tap to view
          </span>
        )}
      </span>
    </button>
  );
}