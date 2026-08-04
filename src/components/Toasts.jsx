import { CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

export default function Toasts({ toasts, onDismiss, onAction }) {
  if (!toasts.length) return null;
  const actions = (t) => (t.actions && t.actions.length ? t.actions : t.action ? [t.action] : null);
  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((t) => {
        const acts = actions(t);
        return (
          <div key={t.id} className={`toast toast-${t.type}`}>
            {t.type === 'success' ? <CheckCircle2 size={17} /> : t.type === 'warning' ? <AlertTriangle size={17} /> : <Info size={17} />}
            <span className="toast-msg">{t.message}</span>
            {acts && (
              <span className="toast-actions">
                {acts.map((a, i) => (
                  <button key={i} type="button" className="toast-action" onClick={() => onAction(t, a)}>
                    {a.label}
                  </button>
                ))}
              </span>
            )}
            <button type="button" className="toast-close" onClick={() => onDismiss(t.id)} aria-label="Dismiss">
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}