import { useMemo, useState } from 'react';
import { Users, Plus, Pencil, Trash2, CalendarCheck, CheckSquare, UserRound, CalendarDays } from 'lucide-react';
import { useTeamLeave } from '../hooks/useTeamLeave';
import { TEAM_LEAVE_REASONS, teamLeaveActive } from '../utils/constants';
import TeamLeaveModal from './TeamLeaveModal.jsx';

const reasonColor = {
  PTO: '#10b981',
  Sick: '#f43f5e',
  Training: '#06b6d4',
  Personal: '#8b5cf6',
  Holiday: '#f59e0b',
  Other: '#94a3b8',
};

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function TeamLeaveView({ tasks, onToast }) {
  const { entries, addLeave, updateLeave, deleteLeave, toggleCoverTask, uniqueMembers } = useTeamLeave(onToast);
  const [modal, setModal] = useState({ open: false, editing: null });
  const todayISO = new Date().toISOString().slice(0, 10);

  const memberNames = useMemo(() => uniqueMembers(), [uniqueMembers, entries]);

  const stats = useMemo(() => {
    const active = entries.filter((e) => teamLeaveActive(e, todayISO));
    const toCover = active.reduce((n, e) => n + (e.coverTasks || []).filter((c) => !c.done).length, 0);
    const totalCover = entries.reduce((n, e) => n + (e.coverTasks || []).length, 0);
    return { onLeave: active.length, toCover, totalCover };
  }, [entries, todayISO]);

  const sorted = useMemo(
    () => [...entries].sort((a, b) => String(b.startDate || '').localeCompare(String(a.startDate || ''))),
    [entries],
  );

  const remove = (e) => {
    if (!window.confirm(`Remove ${e.member}'s leave record?`)) return;
    deleteLeave(e.id);
    onToast?.('Leave record removed', 'success');
  };

  return (
    <div className="team-leave-page">
      <div className="tl-toolbar">
        <div className="tl-stats">
          <span className="stat-chip"><span className="stat-dot" style={{ background: 'var(--primary)' }} /> {stats.onLeave} on leave now</span>
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

      {sorted.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><CalendarCheck size={30} /></div>
          <h3>No team leave logged</h3>
          <p>Log a team member&apos;s leave and add the tasks you&apos;ll need to cover while they&apos;re away.</p>
          <button type="button" className="btn btn-primary" onClick={() => setModal({ open: true, editing: null })}>
            <Plus size={15} /> Log team leave
          </button>
        </div>
      ) : (
        <div className="tl-list">
          {sorted.map((e) => {
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
                          onClick={() => toggleCoverTask(e.id, c.id)}
                          aria-label={c.done ? 'Mark not covered' : 'Mark covered'}
                        >
                          {c.done ? '✓' : ''}
                        </button>
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
            updateLeave(modal.editing.id, data);
            onToast?.(`${data.member}'s leave updated`, 'success');
          } else {
            addLeave(data);
            onToast?.(`${data.member}'s leave added`, 'success');
          }
          setModal({ open: false, editing: null });
        }}
        onClose={() => setModal({ open: false, editing: null })}
      />
    </div>
  );
}