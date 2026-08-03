import { ClipboardList, CalendarRange, Plus, X, ShieldCheck } from 'lucide-react';

const SECONDARY = [
  { id: 'lilo', label: 'LILO Tracker', icon: ClipboardList },
  { id: 'tracker', label: 'Leave & RTO', icon: CalendarRange },
];

/**
 * Mobile "More" bottom sheet. Slides up from the bottom and lists the
 * secondary views plus the user's categories, so every feature and shortcut
 * stays reachable without the desktop sidebar.
 */
export default function MoreSheet({
  open,
  activeView,
  activeLabel,
  onClose,
  onNavigate,
  onManageLabels,
  labels,
  counts,
  quickLinks,
  isAdmin,
}) {
  if (!open) return null;

  const go = (type, id) => {
    onNavigate(type, id ?? null);
    onClose();
  };

  const quick = (quickLinks || []).filter((d) => d.url && d.url.trim()).sort((a, b) => a.name.localeCompare(b.name));
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
              const active = activeView === item.id && !activeLabel;
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

          <div className="sheet-group">
            <div className="sheet-group-head">
              <span className="sheet-group-label">Categories</span>
              <button type="button" className="icon-btn sm" onClick={onManageLabels} title="Manage categories">
                <Plus size={16} />
              </button>
            </div>
            {labels.length === 0 ? (
              <p className="sheet-empty">No categories yet — tap + to add one.</p>
            ) : (
              labels.map((l) => {
                const active = activeLabel === l.id;
                return (
                  <button key={l.id} type="button" className={`sheet-row ${active ? 'active' : ''}`} onClick={() => go('label', l.id)}>
                    <span className="label-dot" style={{ background: l.color }} />
                    <span>{l.name}</span>
                    <span className="sheet-count">{counts['label-' + l.id] || 0}</span>
                  </button>
                );
              })
            )}
          </div>

          {quickLinks.length > 0 && (
            <div className="sheet-group">
              <span className="sheet-group-label">Quick links</span>
              {quickLinks.map((d) => (
                <a key={d.id} className="sheet-row" href={d.url} target="_blank" rel="noreferrer">
                  <span className="label-dot" style={{ background: '#6366f1' }} />
                  <span className="sheet-link-label">{d.name}</span>
                  <span className="sheet-arrow">↗</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}