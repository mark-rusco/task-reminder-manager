import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Menu, Bell, BellOff, Loader2, LayoutDashboard } from 'lucide-react';
import { useTheme } from './hooks/useTheme';
import { useNow } from './hooks/useNow';
import { useTasks } from './hooks/useTasks';
import { useDashboards } from './hooks/useDashboards';
import { useLilo } from './hooks/useLilo';
import { useTrackerConfig } from './hooks/useTrackerConfig';
import { useAuth } from './context/AuthContext';
import { useNotifications, showSystemNotification } from './hooks/useNotifications';
import { playReminderBeep } from './utils/audio';
import FocusTimer from './components/FocusTimer.jsx';
import AuthPage from './components/AuthPage.jsx';
import { isDueToday, isOverdue, isDueTomorrow, isThisWeek, todayStr } from './utils/dates';
import Sidebar from './components/Sidebar.jsx';
import Header, { viewMeta } from './components/Header.jsx';
import StatsBar from './components/StatsBar.jsx';
import TaskList from './components/TaskList.jsx';
import TaskModal from './components/TaskModal.jsx';
import DashboardModal from './components/DashboardModal.jsx';
import DashboardsView from './components/DashboardsView.jsx';
import DashboardDetail from './components/DashboardDetail.jsx';
import LiloView from './components/LiloView.jsx';
import TrackersView from './components/TrackersView.jsx';
import LabelManager from './components/LabelManager.jsx';
import ConfirmDialog from './components/ConfirmDialog.jsx';
import Toasts from './components/Toasts.jsx';
import { SettingsProvider } from './context/SettingsContext.jsx';

export default function App() {
  return (
    <SettingsProvider>
      <AppShell />
    </SettingsProvider>
  );
}

function AppShell() {
  const { theme, toggleTheme } = useTheme();
  const now = useNow();
  const { session, user, loading, backend, signOut } = useAuth();
  const {
    tasks,
    labels,
    toasts,
    syncing,
    addTask,
    updateTask,
    deleteTask,
    toggleComplete,
    addLabel,
    deleteLabel,
    clearCompleted,
    pushToast,
    dismissToast,
  } = useTasks();
  const {
    dashboards,
    addDashboard,
    updateDashboard,
    deleteDashboard,
  } = useDashboards();
  const {
    entries: liloEntries,
    submissions: liloSubmissions,
    updateEntry,
    addEntries,
    removeEntry,
    resetMonth,
    setSubmitted,
  } = useLilo(pushToast);
  const { config: trackerConfig, updateConfig: updateTrackerConfig } = useTrackerConfig();

  const [view, setView] = useState({ type: 'inbox', labelId: null });
  const [search, setSearch] = useState('');

  const [modal, setModal] = useState({ open: false, initial: null, defaultDate: todayStr(), defaultDashboardIds: [], defaultType: 'task' });
  const [dashboardModal, setDashboardModal] = useState({ open: false, initial: null });
  const [selectedDashboardId, setSelectedDashboardId] = useState(null);
  const [labelManagerOpen, setLabelManagerOpen] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const searchRef = useRef(null);

  const onFire = useCallback(
    ({ title, body }) => {
      playReminderBeep();
      showSystemNotification(title, body);
      pushToast(`${title} · ${body}`, 'success');
    },
    [pushToast],
  );

  const onTimerComplete = useCallback(() => {
    showSystemNotification('Focus session complete', 'Great job — take a break.');
    pushToast('Focus session complete — well done!', 'success');
  }, [pushToast]);

  const { prefs, requestPermission, toggleEnabled } = useNotifications({ tasks, now, onFire });

  // Mark reminders as fired once the notification hook signals it.
  useEffect(() => {
    const handler = (e) => {
      const { taskId, at } = e.detail;
      updateTask(taskId, { reminder: { ...(tasks.find((t) => t.id === taskId)?.reminder || {}), notifiedAt: at } });
    };
    window.addEventListener('focusly:markNotified', handler);
    return () => window.removeEventListener('focusly:markNotified', handler);
  }, [tasks, updateTask]);

  const navigate = useCallback((type, labelId = null) => {
    setView({ type, labelId });
    setSelectedDashboardId(null);
    setSearch('');
    setMenuOpen(false);
    window.scrollTo({ top: 0 });
  }, []);

  const openNewTask = useCallback((date, opts = {}) => {
    setModal({
      open: true,
      initial: null,
      defaultDate: date || todayStr(),
      defaultDashboardIds: opts.dashboardIds || [],
      defaultType: opts.type || 'task',
    });
  }, []);

  const openEditTask = useCallback((task) => {
    setModal({ open: true, initial: task, defaultDate: task.dueDate || todayStr() });
  }, []);

  const saveTask = useCallback(
    (data) => {
      if (modal.initial) {
        updateTask(modal.initial.id, data);
        pushToast('Task updated', 'success');
      } else {
        addTask(data);
        pushToast('Task added', 'success');
      }
      setModal({ open: false, initial: null, defaultDate: todayStr() });
    },
    [modal.initial, addTask, updateTask, pushToast],
  );

  const removeTask = useCallback(
    (id) => {
      setModal({ open: false, initial: null, defaultDate: todayStr() });
      deleteTask(id);
    },
    [deleteTask],
  );

  const openDashboard = useCallback(
    (id) => {
      setSelectedDashboardId(id);
      setView({ type: 'dashboards', labelId: null });
      setMenuOpen(false);
      window.scrollTo({ top: 0 });
    },
    [],
  );

  const saveDashboard = useCallback(
    (data) => {
      if (dashboardModal.initial) {
        updateDashboard(dashboardModal.initial.id, data);
        pushToast('Dashboard updated', 'success');
      } else {
        addDashboard(data);
        pushToast('Dashboard added', 'success');
      }
      setDashboardModal({ open: false, initial: null });
    },
    [dashboardModal.initial, addDashboard, updateDashboard, pushToast],
  );

  const removeDashboard = useCallback(
    (id) => {
      setDashboardModal({ open: false, initial: null });
      deleteDashboard(id);
      if (selectedDashboardId === id) setSelectedDashboardId(null);
      pushToast('Dashboard deleted', 'success');
    },
    [deleteDashboard, selectedDashboardId, pushToast],
  );

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e) => {
      const target = e.target;
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT');
      if (e.key === 'Escape') {
        setModal((m) => ({ ...m, open: false }));
        setDashboardModal((m) => ({ ...m, open: false }));
        setLabelManagerOpen(false);
        setMenuOpen(false);
        return;
      }
      if (typing) return;
      if (modal.open) return;
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        openNewTask();
      } else if (e.key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === 't' || e.key === 'T') {
        navigate('today');
      } else if (e.key === 'i' || e.key === 'I') {
        navigate('inbox');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openNewTask, navigate, modal.open]);

  const activeView = useMemo(() => ({ ...view, search }), [view, search]);

  const counts = useMemo(() => {
    const c = { inbox: 0, today: 0, upcoming: 0, completed: 0, dashboards: dashboards.length };
    for (const t of tasks) {
      if (t.completed) {
        c.completed++;
        continue;
      }
      c.inbox++;
      if (isOverdue(t, now) || isDueToday(t, now)) c.today++;
      if (isDueTomorrow(t, now) || isThisWeek(t, now)) c.upcoming++;
      for (const lid of t.labels || []) {
        c['label-' + lid] = (c['label-' + lid] || 0) + 1;
      }
    }
    return c;
  }, [tasks, now, dashboards.length]);

  const stats = useMemo(() => {
    const completedToday = tasks.filter(
      (t) => t.completed && t.completedAt && t.completedAt.slice(0, 10) === todayStr(),
    ).length;
    return {
      overdue: counts.today - tasks.filter((t) => !t.completed && isDueToday(t, now)).length,
      dueToday: tasks.filter((t) => !t.completed && isDueToday(t, now)).length,
      completedToday,
      active: counts.inbox,
    };
  }, [tasks, counts, now]);

  const meta =
    activeView.type === 'dashboards'
      ? { title: 'Dashboards', subtitle: 'Power BI inventory & progress tracker' }
      : activeView.type === 'lilo'
        ? { title: 'LILO Tracker', subtitle: 'Monthly leave-in / leave-out sheet' }
        : activeView.type === 'tracker'
          ? { title: 'Leave & RTO Tracker', subtitle: 'Office days vs your RTO and leave targets' }
          : viewMeta(activeView.type === 'label' ? activeView : { type: activeView.search ? 'search' : activeView.type, labelId: null }, labels, now);
  const title = activeView.type === 'dashboards' || activeView.type === 'lilo' || activeView.type === 'tracker' ? meta.title : activeView.search ? 'Search results' : meta.title;

  const defaultDateForView = activeView.type === 'upcoming' ? new Date(Date.now() + 86400000).toISOString().slice(0, 10) : todayStr();
  const selectedDashboard = dashboards.find((d) => d.id === selectedDashboardId);

  if (loading) {
    return (
      <div className="splash">
        <div className="brand-mark">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
            <path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <Loader2 size={26} className="spin" />
      </div>
    );
  }

  if (backend && !session) {
    return <AuthPage />;
  }

  return (
    <div className={`app ${menuOpen ? 'sidebar-open' : ''}`}>
      <Sidebar
        activeView={view.type}
        activeLabel={view.labelId}
        labels={labels}
        counts={counts}
        dashboards={dashboards}
        onNavigate={navigate}
        onSelectLabel={(id) => navigate('label', id)}
        onNewTask={() => openNewTask(defaultDateForView)}
        onManageLabels={() => setLabelManagerOpen(true)}
      />

      {menuOpen && <div className="scrim" onClick={() => setMenuOpen(false)} />}

      <main className="main">
        <div className="mobile-topbar">
          <button className="icon-btn" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>
          <strong className="mobile-brand">Focusly</strong>
          <button
            className="icon-btn"
            onClick={() => requestPermission()}
            aria-label={prefs.enabled ? 'Reminders on' : 'Enable reminders'}
            title={prefs.enabled ? 'Reminders on' : 'Enable reminders'}
          >
            {prefs.enabled ? <Bell size={18} /> : <BellOff size={18} />}
          </button>
        </div>

        <Header
          viewTitle={title}
          viewSubtitle={meta.subtitle}
          search={search}
          onSearchChange={setSearch}
          onClearSearch={() => setSearch('')}
          theme={theme}
          onToggleTheme={toggleTheme}
          notifPrefs={prefs}
          onToggleNotifications={toggleEnabled}
          onRequestNotifications={requestPermission}
          searchRef={searchRef}
          user={user}
          syncing={syncing}
          backend={backend}
          onSignOut={signOut}
        />

        {!activeView.search && view.type === 'today' && <StatsBar stats={stats} />}

        <div className={`content ${view.type === 'dashboards' || view.type === 'lilo' || view.type === 'tracker' ? 'content-wide' : ''}`}>
          {view.type === 'lilo' ? (
            <LiloView
              entries={liloEntries}
              submissions={liloSubmissions}
              onUpdate={updateEntry}
              onAddEntries={addEntries}
              onRemove={removeEntry}
              onReset={resetMonth}
              onSetSubmitted={setSubmitted}
              onToast={pushToast}
            />
          ) : view.type === 'tracker' ? (
            <TrackersView
              entries={liloEntries}
              config={trackerConfig}
              onUpdateConfig={updateTrackerConfig}
              onToast={pushToast}
              onOpenLilo={() => navigate('lilo')}
            />
          ) : view.type === 'dashboards' ? (
            selectedDashboard ? (
              <DashboardDetail
                dashboard={selectedDashboard}
                tasks={tasks}
                onBack={() => setSelectedDashboardId(null)}
                onEdit={(d) => setDashboardModal({ open: true, initial: d })}
                onOpenTask={openEditTask}
                onNewTask={(type) => openNewTask(todayStr(), { dashboardIds: [selectedDashboard.id], type })}
                onToggleTask={toggleComplete}
                onUpdateProgress={(id, v) => updateDashboard(id, { progress: v })}
                onUpdateStatus={(id, v) => updateDashboard(id, { status: v })}
              />
            ) : (
              <DashboardsView
                dashboards={dashboards}
                tasks={tasks}
                now={now}
                onNew={() => setDashboardModal({ open: true, initial: null })}
                onEdit={(d) => setDashboardModal({ open: true, initial: d })}
                onDelete={removeDashboard}
                onOpen={openDashboard}
              />
            )
          ) : (
            <>
              <TaskList
                tasks={tasks}
                labels={labels}
                dashboards={dashboards}
                now={now}
                view={activeView}
                onToggle={toggleComplete}
                onEdit={openEditTask}
                onDelete={deleteTask}
                onOpenDashboard={openDashboard}
                onCreate={() => openNewTask(defaultDateForView)}
              />

              {view.type === 'completed' && counts.completed > 0 && (
                <div className="content-footer">
                  <button type="button" className="btn btn-ghost" onClick={() => setClearConfirmOpen(true)}>
                    Clear completed
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {view.type !== 'lilo' && view.type !== 'tracker' && (
        <button
          className="fab"
          onClick={() => (view.type === 'dashboards' ? setDashboardModal({ open: true, initial: null }) : openNewTask(defaultDateForView))}
          aria-label={view.type === 'dashboards' ? 'New dashboard' : 'New task'}
          title={view.type === 'dashboards' ? 'New dashboard' : 'New task (N)'}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </button>
      )}

      <FocusTimer onComplete={onTimerComplete} />

      <TaskModal
        open={modal.open}
        initial={modal.initial}
        labels={labels}
        dashboards={dashboards}
        defaultDate={modal.defaultDate}
        defaultDashboardIds={modal.defaultDashboardIds}
        defaultType={modal.defaultType}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
        onSave={saveTask}
        onDelete={removeTask}
      />

      <DashboardModal
        open={dashboardModal.open}
        initial={dashboardModal.initial}
        onClose={() => setDashboardModal((m) => ({ ...m, open: false }))}
        onSave={saveDashboard}
        onDelete={removeDashboard}
      />

      <LabelManager
        open={labelManagerOpen}
        labels={labels}
        onClose={() => setLabelManagerOpen(false)}
        onAdd={addLabel}
        onDelete={deleteLabel}
      />

      <ConfirmDialog
        open={clearConfirmOpen}
        title="Clear completed tasks?"
        message={`This will permanently delete ${counts.completed} completed task${counts.completed !== 1 ? 's' : ''}.`}
        confirmLabel="Clear all"
        onConfirm={() => {
          clearCompleted();
          setClearConfirmOpen(false);
        }}
        onCancel={() => setClearConfirmOpen(false)}
      />

      <Toasts
        toasts={toasts}
        onDismiss={dismissToast}
        onAction={(t) => {
          t.action?.fn?.();
          dismissToast(t.id);
        }}
      />
    </div>
  );
}
