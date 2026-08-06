import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Users, Plus, CalendarCheck, CheckSquare, CalendarDays, Link2, MoreVertical, ListChecks, Pencil, Trash2, UserRound,
} from 'lucide-react';
import { teamLeaveActive } from '../utils/constants';
import { avatarColor, initials, REASON_COLORS as reasonColor } from '../utils/avatar';
import TeamLeaveModal from './TeamLeaveModal.jsx';
import TeamMemberView from './TeamMemberView.jsx';

export const TABS = [
  { id: 'today', label: 'On leave today' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'inactive', label: 'Inactive' },
];

/** Compact, readable date: "Aug 5", "Aug 5–9", "Aug 28 – Sep 2". */
function fmtCompact(start, end) {
  const year = new Date().getFullYear();
  const s = start ? new Date(start + 'T00:00:00') : null;
  const e = end ? new Date(end + 'T00:00:00') : null;
  if (!s) return '';
  const md = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const eFull = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const yr = (d) => (d.getFullYear() === year ? '' : `, ${d.getFullYear()}`);
  if (!e || start === end) return md(s) + yr(s);
  if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()) {
    return `${md(s)}–${e.getDate()}` + yr(e);
  }
  return `${md(s)} – ${e.getFullYear() === year ? md(e) : eFull(e)}`;
}

/** Categorize one record: 'today' (active now), 'upcoming', or 'inactive'. */
export function classifyLeave(e, todayISO) {
  if (teamLeaveActive(e, todayISO)) return 'today';
  if (e.startDate && e.startDate > todayISO) return 'upcoming';
  return 'inactive';
}

export default function TeamLeaveView({ tasks, entries, onToast, onAdd, onUpdate, onDelete, onToggleCover, onReplaceCoverTasks, onToggleTask, onAddTaskFor }) {
  const [modal, setModal] = useState({ open: false, editing: null, member: null });
  const [tab, setTab] = useState('today');
  const [menuOpen, setMenuOpen] = useState(null);
  const [memberView, setMemberView] = useState({ open: false, member: null });
  const menuRef = useRef(null);
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

  // Close the overflow menu on outside click / Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (ev) => {
      if (menuRef.current && !menuRef.current.contains(ev.target)) setMenuOpen(null);
    };
    const onKey = (ev) => {
      if (ev.key === 'Escape') setMenuOpen(null);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

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

  const openMember = (name) => setMemberView({ open: true, member: name });

  const logLeaveFor = (member) => {
    setModal({ open: true, editing: null, member });
  };

  // Add/remove an open assigned task as a linked cover item on the member's
  // current (or next upcoming) leave entry.
  const toggleMemberCover = (task, entry) => {
    const items = entry.coverTasks || [];
    const exists = items.some((c) => c.id === task.id);
    const coverTasks = exists ? items.filter((c) => c.id !== task.id) : [...items, { id: task.id, title: task.title, done: false, linked: true }];
    if (onReplaceCoverTasks) onReplaceCoverTasks(entry.id, coverTasks);
    else onUpdate(entry.id, { coverTasks });
    onToast?.(exists ? `Removed "${task.title}" from cover` : `"${task.title}" added to cover`, 'success');
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
            <button key={n} type="button" className="chip chip-btn tl-member-chip" onClick={() => openMember(n)}>
              {n}
            </button>
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
            const coverItems = e.coverTasks || [];
            const coverTotal = coverItems.length;
            const coverDone = coverItems.filter((c) => c.done).length;
            const rc = reasonColor[e.reason] || (e.reason ? '#94a3b8' : 'transparent');
            const ac = avatarColor(e.member);
            const assignedOpen = (tasks || []).filter(
              (t) => t.assignedMember && !t.completed && t.assignedMember.toLowerCase() === e.member.toLowerCase(),
            );
            const assignedMissing = assignedOpen.filter((t) => !coverItems.some((c) => c.id === t.id)).length;
            return (
              <section key={e.id} className={`panel tl-card ${active ? 'active' : ''}`}>
                {/* Hierarchy: name → date → leave type → (badge) → actions */}
                <div className="tl-card-head">
                  <span className="tl-avatar" style={{ background: `${ac}22`, color: ac }}>{initials(e.member)}</span>
                  <div className="tl-card-title">
                    <button type="button" className="tl-member-link" onClick={() => openMember(e.member)}>
                      {e.member}
                    </button>
                    <span className="tl-dates"><CalendarDays size={12} /> {fmtCompact(e.startDate, e.endDate)}</span>
                  </div>
                  {e.reason && (
                    <span className="tl-reason" style={rc ? { background: rc + '22', color: rc, borderColor: rc } : undefined}>{e.reason}</span>
                  )}
                  {active && <span className="tl-badge">On leave</span>}
                  <div className="tl-menu-wrap" ref={menuOpen === e.id ? menuRef : null}>
                    <button
                      type="button"
                      className="icon-btn sm"
                      aria-label={`Actions for ${e.member}`}
                      aria-haspopup="menu"
                      aria-expanded={menuOpen === e.id}
                      onClick={() => setMenuOpen(menuOpen === e.id ? null : e.id)}
                    >
                      <MoreVertical size={16} />
                    </button>
                    {menuOpen === e.id && (
                      <div className="tl-menu" role="menu">
                        {onAddTaskFor && (
                          <button type="button" role="menuitem" onClick={() => { setMenuOpen(null); onAddTaskFor(e.member); }}>
                            <Plus size={14} /> Add task for {e.member}
                          </button>
                        )}
                        <button type="button" role="menuitem" onClick={() => { setMenuOpen(null); setModal({ open: true, editing: e }); }}>
                          <Pencil size={14} /> Edit
                        </button>
                        <button type="button" role="menuitem" className="danger" onClick={() => { setMenuOpen(null); remove(e); }}>
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {e.note && <p className="tl-note">{e.note}</p>}

                {assignedMissing > 0 && (
                  <p className="tl-assigned-line">
                    <UserRound size={12} />
                    <span>
                      <strong>{assignedMissing}</strong> of {e.member}&apos;s assigned task{assignedMissing !== 1 ? 's' : ''} not on this list — tap Edit to add them
                    </span>
                  </p>
                )}

                {/* List of tasks to cover */}
                <div className="tl-cover-block">
                  <div className="tl-cover-label">
                    <CheckSquare size={13} /> Tasks to cover
                    {coverTotal > 0 ? (
                      <span className={`tl-progress ${coverDone === coverTotal ? 'ok' : ''}`}>
                        {coverDone}/{coverTotal} covered
                      </span>
                    ) : (
                      <span className="tl-progress none">none yet</span>
                    )}
                  </div>
                  {coverTotal > 0 ? (
                    <ul className="tl-cover-list">
                      {coverItems.map((c) => (
                        <li key={c.id} className={c.done ? 'done' : ''}>
                          <button
                            type="button"
                            className="tl-cover-check"
                            onClick={() => toggleCover(e.id, c)}
                            aria-label={c.done ? 'Mark not covered' : 'Mark covered'}
                          >
                            {c.done ? '✓' : ''}
                          </button>
                          {isLinked(c) && <Link2 size={13} className="tl-link-icon" aria-label="Linked to your task list" />}
                          <span className="tl-cover-title">{c.title}</span>
                          <span className={`tl-cover-state ${c.done ? '' : 'pending'}`}>{c.done ? 'covered' : 'pending'}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="tl-cover-empty">
                      <ListChecks size={18} />
                      <span>No tasks to cover yet.</span>
                      <button type="button" className="btn sm" onClick={() => setModal({ open: true, editing: e })}>
                        <Plus size={13} /> Add tasks
                      </button>
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <TeamMemberView
        open={memberView.open}
        member={memberView.member}
        tasks={tasks}
        entries={entries}
        onClose={() => setMemberView({ open: false, member: null })}
        onAddTaskFor={onAddTaskFor}
        onToggleCover={toggleMemberCover}
        onLogLeave={logLeaveFor}
      />

      <TeamLeaveModal
        open={modal.open}
        initial={modal.editing}
        defaultMember={modal.member}
        memberNames={memberNames}
        tasks={tasks}
        onAddTaskFor={onAddTaskFor}
        onSave={(data) => {
          if (modal.editing) {
            onUpdate(modal.editing.id, data);
            onToast?.(`${data.member}'s leave updated`, 'success');
          } else {
            onAdd(data);
            onToast?.(`${data.member}'s leave added`, 'success');
          }
          setModal({ open: false, editing: null, member: null });
        }}
        onClose={() => setModal({ open: false, editing: null, member: null })}
      />
    </div>
  );
}