import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', onConfirm, onCancel, tone = 'danger' }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal confirm-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className="modal-close" onClick={onCancel} aria-label="Close">
          <X size={18} />
        </button>
        <div className="confirm-icon">
          <AlertTriangle size={26} />
        </div>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="confirm-actions">
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className={`btn btn-${tone}`} onClick={onConfirm} autoFocus>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
