import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bell, BellOff, Loader2, LayoutDashboard, Sun, Moon } from 'lucide-react';
import { useTheme } from './hooks/useTheme';
import { useNow } from './hooks/useNow';
import { useTasks } from './hooks/useTasks';
import { useDashboards } from './hooks/useDashboards';
import { useLilo } from './hooks/useLilo';
import { useTrackerConfig } from './hooks/useTrackerConfig';
import { useAppConfig } from './hooks/useAppConfig';
import { useTeamLeave } from './hooks/useTeamLeave';
import { useAuth } from './context/AuthContext';
import { useNotifications, showSystemNotification } from './hooks/useNotifications';
import { playReminderBeep } from './utils/audio';
import { downloadCSV, downloadJSON, todayStamp } from './utils/export';
import { computeTrackers } from './utils/trackers';
import { useAppLock } from './hooks/useAppLock';
import FocusTimer from './components/FocusTimer.jsx';
import AuthPage from './components/AuthPage.jsx';
import { isDueToday, isOverdue, isDueTomorrow, isThisWeek, todayStr, greeting, shiftNow } from './utils/dates';
import Sidebar from './components/Sidebar.jsx';
import MobileNav from './components/MobileNav.jsx';
import UserMenu from './components/UserMenu.jsx';
import MoreSheet from './components/MoreSheet.jsx';
import Header, { viewMeta } from './components/Header.jsx';
import TaskTabsBar from './components/TaskTabsBar.jsx';
import StatsBar from './components/StatsBar.jsx';
import TaskList from './components/TaskList.jsx';
import TaskModal from './components/TaskModal.jsx';
import DashboardModal from './components/DashboardModal.jsx';
import DashboardsView from './components/DashboardsView.jsx';
import DashboardDetail from './components/DashboardDetail.jsx';
import LiloView from './components/LiloView.jsx';
import TrackersView from './components/TrackersView.jsx';
import AdminView from './components/AdminView.jsx';
import LabelManager from './components/LabelManager.jsx';
import ConfirmDialog from './components/ConfirmDialog.jsx';
import ProfileModal from './components/ProfileModal.jsx';
import Toasts from './components/Toasts.jsx';
import ShiftStartBanner from './components/ShiftStartBanner.jsx';
import CalendarView from './components/CalendarView.jsx';
import ReportsView from './components/ReportsView.jsx';
import OnboardingTour from './components/OnboardingTour.jsx';
import AppLock from './components/AppLock.jsx';
import TeamLeaveView from './components/TeamLeaveView.jsx';
import TeamLeaveCard from './components/TeamLeaveCard.jsx';
import { SettingsProvider } from './context/SettingsContext.jsx';
import { DashboardTypesProvider } from './context/DashboardTypesContext.jsx';

export default function App() {
  return (
    <SettingsProvider>
      <DashboardTypesProvider>
        <AppShell />
      </DashboardTypesProvider>
    </SettingsProvider>
  );
}

function AppShell() {
  const { theme, toggleTheme } = useTheme();
  const now = useNow();
  const { session, user, profile, loading, backend, signOut, blocked } = useAuth();
  const {
    tasks,
    labels,
    toasts,
    syncing,
    addTask,
    updateTask,
    deleteTask,
    toggleComplete,
    togglePin,
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
  const { config: appConfig } = useAppConfig();
  const {
    entries: teamLeave,
    addLeave: addTeamLeave,
    updateLeave: updateTeamLeave,
    deleteLeave: deleteTeamLeave,
    toggleCoverTask,
  } = useTeamLeave(pushToast);
  const { isAdmin } = useAuth();

  // Shift-aware "now": keeps today's tasks pending through overnight shifts
  // plus the configured overtime allowance (Tracker settings).
  const todayNow = useMemo(
    () => shiftNow(now, profile?.custom_fields?.shift_schedule, trackerConfig.overtimeAllowance),
    [now, profile, trackerConfig.overtimeAllowance],
  );

  const [view, setView] = useState({ type: 'inbox', labelId: null });
  const [search, setSearch] = useState('');

  const [modal, setModal] = useState({ open: false, initial: null, defaultDate: todayStr(), defaultDashboardIds: [], defaultType: 'task' });
  const [dashboardModal, setDashboardModal] = useState({ open: false, initial: null });
  const [selectedDashboardId, setSelectedDashboardId] = useState(null);
  const [labelManagerOpen, setLabelManagerOpen] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const searchRef = useRef(null);
  const snoozeRef = useRef(null);
  const [tourStep, setTourStep] = useState(0);
  const [lockBypass, setLockBypass] = useState(false);
  const useLock = useAppLock();
  const TOUR_KEY = 'focusly-tour-done';

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

  const onFire = useCallback(
    ({ title, body, taskId }) => {
      playReminderBeep();
      showSystemNotification(title, body);
      const task = tasks.find((t) => t.id === taskId);
      if (task) {
        pushToast(`${title} · ${body}`, 'success', [
          { label: 'Snooze 10m', fn: () => snoozeRef.current(task, 10) },
          { label: 'Snooze 1h', fn: () => snoozeRef.current(task, 60) },
          { label: 'Later today', fn: () => snoozeRef.current(task, 'later-today') },
          { label: 'Open task', fn: () => openEditTask(task) },
        ]);
      } else {
        pushToast(`${title} · ${body}`, 'success');
      }
    },
    [pushToast, tasks, openEditTask],
  );

  const onTimerComplete = useCallback(() => {
    showSystemNotification('Focus session complete', 'Great job — take a break.');
    pushToast('Focus session complete — well done!', 'success');
  }, [pushToast]);

  const { prefs, requestPermission, toggleEnabled, snooze } = useNotifications({ tasks, now, onFire, teamLeaves: teamLeave });
  snoozeRef.current = snooze;

  // Mark reminders as fired once the notification hook signals it.
  useEffect(() => {
    const handler = (e) => {
      const { taskId, at } = e.detail;
      updateTask(taskId, { reminder: { ...(tasks.find((t) => t.id === taskId)?.reminder || {}), notifiedAt: at } });
    };
    window.addEventListener('focusly:markNotified', handler);
    return () => window.removeEventListener('focusly:markNotified', handler);
  }, [tasks, updateTask]);

  // First-run onboarding tour.
  useEffect(() => {
    if (backend && session && !localStorage.getItem(TOUR_KEY)) setTourStep(1);
  }, [backend, session, TOUR_KEY]);

  const navigate = useCallback((type, labelId = null) => {
    setView({ type, labelId });
    setSelectedDashboardId(null);
    setSearch('');
    setMoreOpen(false);
    window.scrollTo({ top: 0 });
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
      window.scrollTo({ top: 0 });
    },
    [],
  );

  const saveDashboard = useCallback(
    async (data) => {
      if (dashboardModal.initial) {
        const res = await updateDashboard(dashboardModal.initial.id, data);
        if (res && res.error) pushToast(`Couldn't save dashboard: ${res.error.message}`, 'warning');
        else pushToast('Dashboard updated', 'success');
      } else {
        const res = await addDashboard(data);
        if (res && res.error) pushToast(`Couldn't save dashboard: ${res.error.message}`, 'warning');
        else pushToast('Dashboard added', 'success');
      }
      setDashboardModal({ open: false, initial: null });
    },
    [dashboardModal.initial, addDashboard, updateDashboard, pushToast],
  );

  const removeDashboard = useCallback(
    async (id) => {
      const res = await deleteDashboard(id);
      if (res && res.error) {
        pushToast(`Couldn't delete dashboard: ${res.error.message} — it may reappear on refresh.`, 'warning');
        return;
      }
      setDashboardModal({ open: false, initial: null });
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
        setMoreOpen(false);
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
      if (isOverdue(t, todayNow) || isDueToday(t, todayNow)) c.today++;
      if (isDueTomorrow(t, todayNow) || isThisWeek(t, todayNow)) c.upcoming++;
      for (const lid of t.labels || []) {
        c['label-' + lid] = (c['label-' + lid] || 0) + 1;
      }
    }
    return c;
  }, [tasks, todayNow, dashboards.length]);

  const stats = useMemo(() => {
    const completedToday = tasks.filter(
      (t) => t.completed && t.completedAt && t.completedAt.slice(0, 10) === todayStr(),
    ).length;
    return {
      overdue: counts.today - tasks.filter((t) => !t.completed && isDueToday(t, todayNow)).length,
      dueToday: tasks.filter((t) => !t.completed && isDueToday(t, todayNow)).length,
      completedToday,
      active: counts.inbox,
    };
  }, [tasks, counts, todayNow]);

  const reportsConfig = useMemo(() => {
    const status = computeTrackers(liloEntries, todayNow.format('YYYY-MM'), trackerConfig);
    return {
      ...trackerConfig,
      ptoUsed: status.ptoUsed,
      ptoLimit: status.ptoEffectiveLimit,
      sickUsed: status.sickUsed,
      sickLimit: status.sickEffectiveLimit,
    };
  }, [liloEntries, todayNow, trackerConfig]);

  const meta =
    activeView.type === 'reports'
      ? { title: 'Reports', subtitle: 'Completion trends & analytics' }
      : activeView.type === 'teamleave'
        ? { title: 'Team Leave', subtitle: 'Who is away and what needs covering' }
        : activeView.type === 'calendar'
        ? { title: 'Calendar', subtitle: 'Month view of tasks & LILO schedule' }
        : activeView.type === 'dashboards'
          ? { title: 'Dashboards', subtitle: 'Power BI inventory & progress tracker' }
          : activeView.type === 'lilo'
            ? { title: 'LILO Tracker', subtitle: 'Monthly leave-in / leave-out sheet' }
            : activeView.type === 'tracker'
              ? { title: 'Leave & RTO Tracker', subtitle: 'Office days vs your RTO and leave targets' }
              : activeView.type === 'admin'
                ? { title: 'Admin', subtitle: 'Users, roles & application configuration' }
                : viewMeta(activeView.type === 'label' ? activeView : { type: activeView.search ? 'search' : activeView.type, labelId: null }, labels, todayNow);
  const title =
    activeView.type === 'dashboards' ||
    activeView.type === 'lilo' ||
    activeView.type === 'tracker' ||
    activeView.type === 'admin' ||
    activeView.type === 'reports' ||
    activeView.type === 'calendar' ||
    activeView.type === 'teamleave'
      ? meta.title
      : activeView.search
        ? 'Search results'
        : meta.title;

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

  if (backend && blocked) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-brand">
            <div className="brand-mark">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
                <path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1>Account disabled</h1>
            <p>This account has been disabled by an administrator. Contact support to restore access.</p>
          </div>
          <button type="button" className="btn btn-primary btn-block" onClick={async () => { await signOut(); }}>
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {appConfig && (appConfig.maintenance || appConfig.announcement) && (
        <div className="app-banner">
          {appConfig.maintenance && <strong>Maintenance in progress.</strong>} {appConfig.announcement}
        </div>
      )}

      <div className="app">
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
        isAdmin={isAdmin}
      />

      <main className="main">
        <div className="mobile-topbar">
          <div className="mobile-brand">
            <div className="brand-mark">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
                <path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <strong className="mobile-brand-text">Focusly</strong>
          </div>
          <div className="mobile-top-actions">
            <button
              className="icon-btn"
              onClick={() => (prefs.enabled ? toggleEnabled() : requestPermission())}
              aria-label={prefs.enabled ? 'Reminders on' : 'Enable reminders'}
              title={prefs.enabled ? 'Reminders on' : 'Enable reminders'}
            >
              {prefs.enabled ? <Bell size={18} /> : <BellOff size={18} />}
            </button>
            <button className="icon-btn" onClick={toggleTheme} aria-label="Toggle theme" title="Toggle theme">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <UserMenu
              user={user}
              backend={backend}
              isAdmin={isAdmin}
              onOpenProfile={() => setProfileOpen(true)}
              onOpenAdmin={() => navigate('admin')}
              onSignOut={signOut}
              compact
            />
          </div>
        </div>

        <div className="mobile-greeting">
          <span className="mg-date">{now.format('dddd, MMMM D').toUpperCase()}</span>
          <span className="mg-hello">
            {greeting(now)}, {profile?.custom_fields?.first_name || user?.email?.split('@')[0] || 'there'}!
          </span>
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
          onOpenProfile={() => setProfileOpen(true)}
          onOpenAdmin={() => navigate('admin')}
          isAdmin={isAdmin}
        />

        {!activeView.search && <TaskTabsBar activeView={activeView} activeLabel={view.labelId} labels={labels} counts={counts} onNavigate={navigate} />}

        {!activeView.search && view.type === 'today' && <StatsBar stats={stats} />}
        {!activeView.search && view.type === 'today' && (
          <ShiftStartBanner tasks={tasks} now={todayNow} profile={profile} onShowToday={() => navigate('today')} />
        )}

        {!activeView.search && (view.type === 'today' || view.type === 'inbox') && (
          <TeamLeaveCard entries={teamLeave} onOpen={() => navigate('teamleave')} />
        )}

        <div
          className={`content ${
            view.type === 'dashboards' || view.type === 'lilo' || view.type === 'tracker' || view.type === 'admin' || view.type === 'reports' || view.type === 'calendar' || view.type === 'teamleave'
              ? 'content-wide'
              : ''
          }`}
        >
          <FocusTimer onComplete={onTimerComplete} />
          {view.type === 'reports' ? (
            <ReportsView
              tasks={tasks}
              labels={labels}
              dashboards={dashboards}
              liloEntries={liloEntries}
              trackerConfig={reportsConfig}
              trackerMonth={todayNow.format('YYYY-MM')}
            />
          ) : view.type === 'calendar' ? (
            <CalendarView
              tasks={tasks}
              liloEntries={liloEntries}
              todayNow={todayNow}
              onAddTask={(date) => openNewTask(date)}
              onOpenTask={openEditTask}
              onToggle={toggleComplete}
            />
          ) : view.type === 'teamleave' ? (
            <TeamLeaveView
              tasks={tasks}
              entries={teamLeave}
              onToast={pushToast}
              onAdd={addTeamLeave}
              onUpdate={updateTeamLeave}
              onDelete={deleteTeamLeave}
              onToggleCover={toggleCoverTask}
              onToggleTask={toggleComplete}
            />
          ) : view.type === 'lilo' ? (
            <LiloView
              entries={liloEntries}
              submissions={liloSubmissions}
              onUpdate={updateEntry}
              onAddEntries={addEntries}
              onRemove={removeEntry}
              onReset={resetMonth}
              onSetSubmitted={setSubmitted}
              onToast={pushToast}
              onOpenProfile={() => setProfileOpen(true)}
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
                onToast={pushToast}
              />
            ) : (
              <DashboardsView
                dashboards={dashboards}
                tasks={tasks}
                now={todayNow}
                onNew={() => setDashboardModal({ open: true, initial: null })}
                onEdit={(d) => setDashboardModal({ open: true, initial: d })}
                onDelete={removeDashboard}
                onOpen={openDashboard}
              />
            )
            ) : view.type === 'admin' ? (
              <AdminView onToast={pushToast} />
            ) : (
              <>
                <TaskList
                tasks={tasks}
                labels={labels}
                dashboards={dashboards}
                now={todayNow}
                view={activeView}
                onToggle={toggleComplete}
                onEdit={openEditTask}
                onDelete={deleteTask}
                onTogglePin={togglePin}
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

      {view.type !== 'lilo' && view.type !== 'tracker' && view.type !== 'admin' && view.type !== 'reports' && view.type !== 'teamleave' && (
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

      <MobileNav
        activeView={view.type}
        counts={counts}
        onNavigate={navigate}
        onNewTask={() => openNewTask(defaultDateForView)}
        onNewBoard={() => setDashboardModal({ open: true, initial: null })}
        onSearch={() => {
          setView((v) => (v.type === 'dashboards' || v.type === 'lilo' || v.type === 'tracker' || v.type === 'admin' || v.type === 'reports' || v.type === 'calendar' || v.type === 'teamleave' ? { type: 'inbox', labelId: null } : v));
          setSearch('');
          requestAnimationFrame(() => searchRef.current?.focus());
        }}
        onOpenMore={() => setMoreOpen(true)}
      />

      <MoreSheet
        open={moreOpen}
        activeView={view.type}
        activeLabel={view.labelId}
        labels={labels}
        counts={counts}
        quickLinks={dashboards}
        onClose={() => setMoreOpen(false)}
        onNavigate={navigate}
        onManageLabels={() => {
          setMoreOpen(false);
          setLabelManagerOpen(true);
        }}
        isAdmin={isAdmin}
      />

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
        onToast={pushToast}
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

      <ProfileModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        onToast={pushToast}
      />

      <Toasts
        toasts={toasts}
        onDismiss={dismissToast}
        onAction={(t, a) => {
          (a?.fn || t?.action?.fn)?.();
          dismissToast(t.id);
        }}
      />

      <OnboardingTour
        step={tourStep}
        onNext={setTourStep}
        onClose={() => {
          setTourStep(0);
          localStorage.setItem(TOUR_KEY, '1');
        }}
      />

      {useLock.locked && !lockBypass && <AppLock useLock={useLock} onClose={() => setLockBypass(true)} />}
      </div>
    </>
  );
}
