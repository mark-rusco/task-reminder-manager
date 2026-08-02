import { CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

export default function Toasts({ toasts, onDismiss, onAction }) {
  if (!toasts.length) return null;
  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          {t.type === 'success' ? <CheckCircle2 size={17} /> : t.type === 'warning' ? <AlertTriangle size={17} /> : <Info size={17} />}
          <span className="toast-msg">{t.message}</span>
          {t.action && (
            <button
              type="button"
              className="toast-action"
              onClick={() => {
                onAction(t);
              }}
            >
              {t.action.label}
            </button>
          )}
          <button type="button" className="toast-close" onClick={() => onDismiss(t.id)} aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
