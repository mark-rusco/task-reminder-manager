import { ClipboardList, CalendarRange, CalendarDays, BarChart3, Users, X, ShieldCheck } from 'lucide-react';

const SECONDARY = [
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'lilo', label: 'LILO Tracker', icon: ClipboardList },
  { id: 'tracker', label: 'Leave & RTO', icon: CalendarRange },
  { id: 'teamleave', label: 'Team Leave', icon: Users },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
];

/**
 * Mobile "More" bottom sheet. Slides up from the bottom and lists the
 * secondary views plus the user's categories, so every feature and shortcut
 * stays reachable without the desktop sidebar.
 */
export default function MoreSheet({
  open,
  activeView,
  onClose,
  onNavigate,
  counts,
  isAdmin,
}) {
  if (!open) return null;

  const go = (type, id) => {
    onNavigate(type, id ?? null);
    onClose();
  };

  const views = isAdmin ? [...SECONDARY, { id: 'admin', label: 'Admin', icon: ShieldCheck }] : SECONDARY;

  return (
    <div className="sheet-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Browse">
        <div className="sheet-handle" />
        <div className="sheet-head">
          <strong>Browse</strong>
          <button type="button" className="icon-btn sm" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="sheet-body">
          <div className="sheet-group">
            <span className="sheet-group-label">Views</span>
            {views.map((item) => {
              const Icon = item.icon;
              const active = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`sheet-row ${active ? 'active' : ''}`}
                  onClick={() => go(item.id)}
                >
                  <Icon size={19} />
                  <span>{item.label}</span>
                  {counts[item.id] > 0 && <span className="sheet-count">{counts[item.id]}</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}