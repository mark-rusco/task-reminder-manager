import { useEffect, useRef, useState } from 'react';
import { Search, Sun, Moon, Bell, BellOff, X, Cloud, CloudOff, LogOut, ChevronDown } from 'lucide-react';
import { greeting } from '../utils/dates';

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
}) {
  const [userOpen, setUserOpen] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    if (!userOpen) return;
    const close = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [userOpen]);

  const email = user?.email || 'Guest';
  const initials = email
    .split('@')[0]
    .split(/[.\-_]/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'G';

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

        <div className="user-menu" ref={userMenuRef}>
          <button className="user-chip" onClick={() => setUserOpen((v) => !v)} aria-haspopup="menu" aria-expanded={userOpen}>
            <span className="avatar">{initials}</span>
            <span className="user-chip-email">{email}</span>
            <ChevronDown size={13} className={userOpen ? 'rotated' : ''} />
          </button>
          {userOpen && (
            <div className="user-dropdown" role="menu">
              <div className="user-drop-head">
                <span className="avatar">{initials}</span>
                <div>
                  <strong>{email}</strong>
                  <span>{backend ? 'Cloud account' : 'Local session'}</span>
                </div>
              </div>
              {backend && (
                <button type="button" role="menuitem" onClick={onSignOut}>
                  <LogOut size={14} />
                  Sign out
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export function viewMeta(view, labels, now) {
  const label = labels.find((l) => l.id === view.labelId);
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
    case 'label':
      return { title: label ? label.name : 'Category', subtitle: 'Tasks in this category' };
    default:
      return { title: 'Tasks', subtitle: '' };
  }
}
