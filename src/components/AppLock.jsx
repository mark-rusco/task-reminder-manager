import { useEffect, useState } from 'react';
import { Fingerprint, Lock, X } from 'lucide-react';

export default function AppLock({ useLock, onClose }) {
  const { locked, unlock, hasBio } = useLock;
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!locked) return;
    // Reset the pad each time the lock reappears.
    setPin('');
    setError(false);
  }, [locked]);

  if (!locked) return null;

  const press = (d) => {
    if (error) setError(false);
    setPin((p) => (p + d).slice(0, 6));
  };

  const submit = () => {
    if (pin.length < 4) return;
    unlock(pin).then((ok) => {
      if (!ok) {
        setError(true);
        setPin('');
      }
    });
  };

  return (
    <div className="app-lock">
      <div className="app-lock-box">
        <div className="app-lock-icon"><Lock size={28} /></div>
        <h2>Focusly is locked</h2>
        <p>Enter your PIN{hasBio ? ' or use your fingerprint' : ''} to continue.</p>

        {hasBio && (
          <button type="button" className="btn btn-primary" onClick={() => unlock('').then((ok) => !ok && setError(true))}>
            <Fingerprint size={16} /> Unlock with biometrics
          </button>
        )}

        <div className="pin-dots">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <span key={i} className={`pin-dot ${i < pin.length ? 'filled' : ''}`} />
          ))}
        </div>

        <div className="pin-pad">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'x'].map((k, i) =>
            k === '' ? (
              <span key={i} />
            ) : k === 'x' ? (
              <button key={i} type="button" className="pin-key" onClick={() => setPin((p) => p.slice(0, -1))} aria-label="Delete">
                <X size={18} />
              </button>
            ) : (
              <button key={i} type="button" className="pin-key" onClick={() => press(k)}>
                {k}
              </button>
            ),
          )}
        </div>

        <button type="button" className="btn btn-primary btn-block" onClick={submit} disabled={pin.length < 4}>
          Unlock
        </button>

        {error && <p className="pin-error">Incorrect PIN — try again.</p>}

        <button type="button" className="toast-action" onClick={onClose}>
          Not now
        </button>
      </div>
    </div>
  );
}