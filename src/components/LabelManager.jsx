import { useEffect, useRef, useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

const PALETTE = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b',
  '#f97316', '#10b981', '#14b8a6', '#06b6d4', '#3b82f6',
];

export default function LabelManager({ open, labels, onClose, onAdd, onUpdate, onDelete }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(PALETTE[0]);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setName('');
      setColor(PALETTE[0]);
      window.setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open]);

  if (!open) return null;

  const submit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd({ name: trimmed, color });
    setName('');
    setColor(PALETTE[0]);
    inputRef.current?.focus();
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Manage categories">
        <div className="modal-head">
          <h2>Categories</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <form onSubmit={submit} className="label-add-form">
            <input
              ref={inputRef}
              className="input"
              placeholder="New category name…"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <div className="color-row">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`color-swatch ${color === c ? 'on' : ''}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
            <button type="submit" className="btn btn-primary" disabled={!name.trim()}>
              <Plus size={15} />
              Add
            </button>
          </form>

          <ul className="label-list">
            {labels.map((l) => (
              <li key={l.id} className="label-row">
                <span className="chip-dot" style={{ background: l.color }} />
                <span className="label-name">{l.name}</span>
                <button
                  type="button"
                  className="icon-btn sm"
                  title="Delete category"
                  onClick={() => onDelete(l.id)}
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
            {labels.length === 0 && <p className="form-hint">No categories yet. Create your first one above.</p>}
          </ul>
        </div>
      </div>
    </div>
  );
}
