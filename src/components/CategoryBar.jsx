import { Plus, Settings2 } from 'lucide-react';

/**
 * Horizontal category filter bar for the task list. Categories are toggled
 * in/out (multi-select) and tasks are filtered to any enabled category within
 * the current scope (Inbox / Today / Upcoming / Completed).
 */
export default function CategoryBar({ labels, counts, labelIds, onToggle, onManage }) {
  const activeCount = (labelIds || []).length;

  if ((labels || []).length === 0) {
    return (
      <div className="cat-bar" aria-label="Categories">
        <button type="button" className="cat-chip cat-add" onClick={onManage}>
          <Plus size={13} /> Add a category
        </button>
      </div>
    );
  }

  return (
    <div className="cat-bar" aria-label="Category filters">
      <button
        type="button"
        className={`cat-chip ${activeCount === 0 ? 'on' : ''}`}
        aria-pressed={activeCount === 0}
        onClick={() => onToggle(null)}
      >
        All
        {counts.inbox > 0 && <span className="cat-count">{counts.inbox}</span>}
      </button>

      {labels.map((l) => {
        const active = (labelIds || []).includes(l.id);
        const count = counts['label-' + l.id] || 0;
        return (
          <button
            key={l.id}
            type="button"
            className={`cat-chip ${active ? 'on' : ''}`}
            aria-pressed={active}
            onClick={() => onToggle(l.id)}
          >
            <span className="label-dot" style={{ background: l.color }} />
            <span className="cat-name">{l.name}</span>
            {count > 0 && <span className="cat-count">{count}</span>}
          </button>
        );
      })}

      <button
        type="button"
        className="cat-chip manage"
        onClick={onManage}
        title="Manage categories"
        aria-label="Manage categories"
      >
        <Settings2 size={13} />
      </button>
    </div>
  );
}