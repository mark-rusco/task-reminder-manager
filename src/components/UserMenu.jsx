import { useEffect, useRef, useState } from 'react';
import { ChevronDown, LogOut, UserCog, ShieldCheck } from 'lucide-react';

/** Avatar + dropdown (profile / admin / sign out). Shared by desktop header and mobile topbar. */
export default function UserMenu({ user, backend, isAdmin, onOpenProfile, onOpenAdmin, onSignOut, compact }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const email = user?.email || 'Guest';
  const initials =
    email
      .split('@')[0]
      .split(/[.\-_]/)
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'G';

  return (
    <div className="user-menu" ref={ref}>
      <button className={`user-chip${compact ? ' compact' : ''}`} onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open}>
        <span className="avatar">{initials}</span>
        {!compact && (
          <>
            <span className="user-chip-email">{email}</span>
            <ChevronDown size={13} className={open ? 'rotated' : ''} />
          </>
        )}
      </button>
      {open && (
        <div className="user-dropdown" role="menu">
          <div className="user-drop-head">
            <span className="avatar">{initials}</span>
            <div>
              <strong>{email}</strong>
              <span>{backend ? 'Cloud account' : 'Local session'}</span>
            </div>
          </div>
          {backend && (
            <button type="button" role="menuitem" onClick={() => { setOpen(false); onOpenProfile?.(); }}>
              <UserCog size={14} />
              My profile
            </button>
          )}
          {isAdmin && (
            <button type="button" role="menuitem" onClick={() => { setOpen(false); onOpenAdmin?.(); }}>
              <ShieldCheck size={14} />
              Admin
            </button>
          )}
          {backend && (
            <button type="button" role="menuitem" onClick={onSignOut}>
              <LogOut size={14} />
              Sign out
            </button>
          )}
        </div>
      )}
    </div>
  );
}
