import { useMemo, useState } from 'react';
import { Users, Plus, Pencil, Trash2, CalendarCheck, CheckSquare, UserRound, CalendarDays, Link2 } from 'lucide-react';
import { teamLeaveActive } from '../utils/constants';
import TeamLeaveModal from './TeamLeaveModal.jsx';

const reasonColor = {
  PTO: '#10b981',
  Sick: '#f43f5e',
  Training: '#06b6d4',
  Personal: '#8b5cf6',
  Holiday: '#f59e0b',
  Other: '#94a3b8',
};

export const TABS = [
  { id: 'today', label: 'On leave today' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'inactive', label: 'Inactive' },
];

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Categorize one record: 'today' (active now), 'upcoming', or 'inactive'. */
export function classifyLeave(e, todayISO) {
  if (teamLeaveActive(e, todayISO)) return 'today';
  if (e.startDate && e.startDate > todayISO) return 'upcoming';
  return 'inactive';
}

export default function TeamLeaveView({ tasks, entries, onToast, onAdd, onUpdate, onDelete, onToggleCover, onToggleTask }) {
  const [modal, setModal] = useState({ open: false, editing: null });
  const [tab, setTab] = useState('today');
  const todayISO = new Date().toISOString().slice(0, 10);

  const memberNames = useMemo(() => {
    const seen = new Set();
    return entries.filter((e) => !seen.has(e.member.toLowerCase()) && seen.add(e.member.toLowerCase())).map((e) => e.member);
  }, [entries]);

  const counts = useMemo(() => {
    const c = { today: 0, upcoming: 0, inactive: 0 };
    for (const e of entries) c[classifyLeave(e, todayISO)]++;
    return c;
  }, [entries, todayISO]);

  const list = useMemo(
    () =>
      entries
        .filter((e) => classifyLeave(e, todayISO) === tab)
        .sort((a, b) => String(b.startDate || '').localeCompare(String(a.startDate || ''))),
    [entries, tab, todayISO],
  );

  const stats = useMemo(() => {
    const active = entries.filter((e) => teamLeaveActive(e, todayISO));
    const toCover = active.reduce((n, e) => n + (e.coverTasks || []).filter((c) => !c.done).length, 0);
    return { onLeave: active.length, toCover };
  }, [entries, todayISO]);

  const isLinked = (item) => !!(item.linked && (tasks || []).some((t) => t.id === item.id));

  const toggleCover = (leaveId, item) => {
    onToggleCover(leaveId, item.id);
    // Auto-complete the linked task when the cover item is checked off.
    if (!item.done && isLinked(item) && onToggleTask) onToggleTask(item.id);
  };

  const remove = (e) => {
    if (!window.confirm(`Remove ${e.member}'s leave record?`)) return;
    onDelete(e.id);
    onToast?.('Leave record removed', 'success');
  };

  return (
    <div className="team-leave-page">
      <div className="tl-toolbar">
        <div className="tl-stats">
          <span className="stat-chip"><span className="stat-dot" style={{ background: 'var(--primary)' }} /> {stats.onLeave} on leave today</span>
          <span className="stat-chip"><span className="stat-dot" style={{ background: stats.toCover ? 'var(--warning)' : 'var(--success)' }} /> {stats.toCover} cover task{stats.toCover !== 1 ? 's' : ''} pending</span>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setModal({ open: true, editing: null })}>
          <Plus size={15} /> Log team leave
        </button>
      </div>

      {memberNames.length > 0 && (
        <div className="tl-members">
          <span className="tl-members-label"><Users size={13} /> Your team</span>
          {memberNames.map((n) => (
            <span key={n} className="chip chip-btn tl-member-chip">{n}</span>
          ))}
        </div>
      )}

      <div className="tl-tabs" role="tablist" aria-label="Team leave scope">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`tl-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {counts[t.id] > 0 && <span className="tl-tab-count">{counts[t.id]}</span>}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><CalendarCheck size={30} /></div>
          <h3>Nothing here</h3>
          <p>
            {tab === 'today'
              ? 'No one in your team is on leave today. Nice and quiet.'
              : tab === 'upcoming'
                ? 'No upcoming leave logged yet.'
                : 'No past leave records yet.'}
          </p>
          {tab !== 'inactive' && (
            <button type="button" className="btn btn-primary" onClick={() => setModal({ open: true, editing: null })}>
              <Plus size={15} /> Log team leave
            </button>
          )}
        </div>
      ) : (
        <div className="tl-list">
          {list.map((e) => {
            const active = teamLeaveActive(e, todayISO);
            const pending = (e.coverTasks || []).filter((c) => !c.done);
            const rc = reasonColor[e.reason] || (e.reason ? '#94a3b8' : 'transparent');
            return (
              <section key={e.id} className={`panel tl-card ${active ? 'active' : ''}`}>
                <div className="tl-card-head">
                  <span className="tl-avatar"><UserRound size={16} /></span>
                  <div className="tl-card-title">
                    <strong>{e.member}</strong>
                    <span className="tl-dates">
                      <CalendarDays size={12} /> {fmtDate(e.startDate)}{e.endDate ? ` – ${fmtDate(e.endDate)}` : ''}
                    </span>
                  </div>
                  {e.reason && <span className="tl-reason" style={rc ? { background: rc + '22', color: rc, borderColor: rc } : undefined}>{e.reason}</span>}
                  {active && <span className="tl-badge">On leave</span>}
                  <div className="tl-card-actions">
                    <button type="button" className="icon-btn sm" onClick={() => setModal({ open: true, editing: e })} aria-label="Edit">
                      <Pencil size={15} />
                    </button>
                    <button type="button" className="icon-btn sm" onClick={() => remove(e)} aria-label="Delete">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {e.note && <p className="tl-note">{e.note}</p>}

                {(e.coverTasks || []).length > 0 ? (
                  <div className="tl-cover-block">
                    <div className="tl-cover-label">
                      <CheckSquare size={13} /> To cover
                      {pending.length > 0 && <span className="tl-pending">{pending.length} pending</span>}
                    </div>
                    <ul className="tl-cover-list">
                      {(e.coverTasks || []).map((c) => (
                        <li key={c.id} className={c.done ? 'done' : ''}>
                          <button
                            type="button"
                            className="tl-cover-check"
                            onClick={() => toggleCover(e.id, c)}
                            aria-label={c.done ? 'Mark not covered' : 'Mark covered'}
                          >
                            {c.done ? '✓' : ''}
                          </button>
                          {isLinked(c) && <Link2 size={12} className="tl-link-icon" aria-label="Linked to your task list" />}
                          <span className="tl-cover-title">{c.title}</span>
                          <span className="tl-cover-state">{c.done ? 'covered' : ''}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="tl-no-cover">No tasks added to cover — tap Edit to add some.</p>
                )}
              </section>
            );
          })}
        </div>
      )}

      <TeamLeaveModal
        open={modal.open}
        initial={modal.editing}
        memberNames={memberNames}
        tasks={tasks}
        onSave={(data) => {
          if (modal.editing) {
            onUpdate(modal.editing.id, data);
            onToast?.(`${data.member}'s leave updated`, 'success');
          } else {
            onAdd(data);
            onToast?.(`${data.member}'s leave added`, 'success');
          }
          setModal({ open: false, editing: null });
        }}
        onClose={() => setModal({ open: false, editing: null })}
      />
    </div>
  );
}