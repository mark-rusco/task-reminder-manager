import { Search, Sun, Moon, Bell, BellOff, X, Cloud, CloudOff } from 'lucide-react';
import { greeting } from '../utils/dates';
import UserMenu from './UserMenu.jsx';

export default function Header({
  viewTitle,
  viewSubtitle,
  search,
  onSearchChange,
  onClearSearch,
  theme,
  onToggleTheme,
  notifPrefs,
  onToggleNotifications,
  onRequestNotifications,
  searchRef,
  user,
  syncing,
  backend,
  onSignOut,
  onOpenProfile,
  onOpenAdmin,
  isAdmin,
}) {
  return (
    <header className="app-header">
      <div className="header-title">
        <h1>{viewTitle}</h1>
        <p className="header-subtitle">{viewSubtitle}</p>
      </div>

      <div className="header-actions">
        <div className="search-box">
          <Search size={16} />
          <input
            ref={searchRef}
            type="search"
            placeholder="Search tasks…  ( / )"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Search tasks"
          />
          {search && (
            <button className="icon-btn sm" onClick={onClearSearch} title="Clear search">
              <X size={14} />
            </button>
          )}
        </div>

        <div className={`sync-badge ${backend ? 'cloud' : 'local'}`} title={backend ? 'Tasks are synced to your Supabase account' : 'Local mode — connect Supabase to sync across devices'}>
          {syncing ? <Cloud size={13} className="pulse" /> : backend ? <Cloud size={13} /> : <CloudOff size={13} />}
          {syncing ? 'Syncing' : backend ? 'Synced' : 'Local'}
        </div>

        <div className="notif-toggle" title={notifPrefs.enabled ? 'Reminders are on' : 'Reminders are off'}>
          {notifPrefs.enabled ? (
            <button className="icon-btn active" onClick={onToggleNotifications}>
              <Bell size={17} />
            </button>
          ) : (
            <button className="icon-btn" onClick={onRequestNotifications}>
              <BellOff size={17} />
            </button>
          )}
        </div>

        <button className="icon-btn" onClick={onToggleTheme} title="Toggle theme">
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        <UserMenu
          user={user}
          backend={backend}
          isAdmin={isAdmin}
          onOpenProfile={onOpenProfile}
          onOpenAdmin={onOpenAdmin}
          onSignOut={onSignOut}
        />
      </div>
    </header>
  );
}

export function viewMeta(view, now) {
  const date = now.format('dddd, MMMM D');
  switch (view.type) {
    case 'inbox':
      return { title: 'Inbox', subtitle: `${greeting(now)} — every task, all in one place` };
    case 'today':
      return { title: 'Today', subtitle: date };
    case 'upcoming':
      return { title: 'Upcoming', subtitle: 'What is coming next' };
    case 'completed':
      return { title: 'Completed', subtitle: 'Everything you finished' };
    default:
      return { title: 'Tasks', subtitle: '' };
  }
}
