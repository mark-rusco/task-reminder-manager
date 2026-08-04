import { useEffect, useState } from 'react';
import { X, Loader2, UserCog, Fingerprint, LockKeyhole } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useAppLock } from '../hooks/useAppLock';
import { parseShiftSchedule, to24h, to12h } from '../utils/lilo';

export default function ProfileModal({ open, onClose, onToast }) {
  const { user, profile, saveOwnCustomFields } = useAuth();
  const lock = useAppLock();
  const [armLock, setArmLock] = useState(false);
  const [lockPin, setLockPin] = useState('');
  const [lockPin2, setLockPin2] = useState('');
  const [fields, setFields] = useState(null);
  const [values, setValues] = useState({});
  const [range, setRange] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setArmLock(lock.enabled);
    setLockPin('');
    setLockPin2('');
  }, [open, lock.enabled]);

  useEffect(() => {
    if (!open || !supabase) return;
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from('profile_fields')
        .select('*')
        .eq('active', true)
        .order('sort_order', { ascending: true });
      if (!mounted) return;
      setFields(data || []);
      const cur = profile?.custom_fields || {};
      setValues((prev) => ({
        ...prev,
        ...Object.fromEntries((data || []).filter((f) => f.key in cur).map((f) => [f.key, cur[f.key]])),
      }));
      setRange((prev) => {
        const next = { ...prev };
        for (const f of data || []) {
          if (f.key === 'shift_schedule' || f.type === 'timerange') {
            const p = parseShiftSchedule(cur[f.key]);
            next[f.key] = { start: to24h(p?.startTime), end: to24h(p?.endTime) };
          }
        }
        return next;
      });
    })();
    return () => {
      mounted = false;
    };
  }, [open, profile]);

  const setField = (key, val) => setValues((v) => ({ ...v, [key]: val }));

  const setRangeField = (key, start, end) => {
    setRange((prev) => ({ ...prev, [key]: { start, end } }));
    const s = to12h(start);
    const e = to12h(end);
    if (s && e) setField(key, `${s} - ${e}`);
    else if (s || e) setField(key, `${s || ''}${e ? ` - ${e}` : ''}`);
  };

  const save = async () => {
    setBusy(true);
    const payload = {};
    for (const f of fields || []) {
      let v = values[f.key];
      if ((f.key === 'shift_schedule' || f.type === 'timerange') && v && !v.includes(' - ')) {
        v = '';
      }
      if (v === undefined || v === null || v === '') {
        if (f.required) {
          onToast?.(`${f.label} is required`, 'warning');
          setBusy(false);
          return;
        }
        continue;
      }
      if (f.type === 'boolean') payload[f.key] = !!v;
      else if (f.type === 'number') payload[f.key] = Number(v);
      else payload[f.key] = String(v);
    }
    const err = await saveOwnCustomFields(payload);
    setBusy(false);
    if (err) {
      onToast?.('Could not save your profile: ' + err.message, 'warning');
      return;
    }
    onToast?.('Profile updated', 'success');
    onClose();
  };

  const toggleLock = () => {
    if (lock.enabled) {
      lock.disable();
      onToast?.('App lock turned off', 'success');
      return;
    }
    setArmLock((v) => !v);
    setLockPin('');
    setLockPin2('');
  };

  const saveLock = () => {
    if (!/^\d{4,6}$/.test(lockPin)) return onToast?.('PIN must be 4–6 digits', 'warning');
    if (lockPin !== lockPin2) return onToast?.('PINs do not match', 'warning');
    lock.enable(lockPin);
    setArmLock(true);
    onToast?.('App lock enabled', 'success');
  };

  if (!open) return null;

  const renderField = (f) => {
    const label = (
      <label className="form-label" htmlFor={`pf-${f.key}`}>
        {f.label}
        {f.required && <span className="label-req"> *</span>}
      </label>
    );
    // Shift schedule is always a start/end time-range picker, regardless of
    // how the field is currently typed in the database.
    if (f.key === 'shift_schedule' || f.type === 'timerange') {
      const current = range[f.key] || { start: '', end: '' };
      const onStart = (v) => setRangeField(f.key, v, current.end);
      const onEnd = (v) => setRangeField(f.key, current.start, v);
      return (
        <div className="modal-field" key={f.key}>
          {label}
          <div className="time-range">
            <input
              id={`pf-${f.key}-start`}
              type="time"
              className="input"
              aria-label={`${f.label} start`}
              value={current.start}
              onChange={(e) => onStart(e.target.value)}
            />
            <span className="time-range-sep">to</span>
            <input
              id={`pf-${f.key}-end`}
              type="time"
              className="input"
              aria-label={`${f.label} end`}
              value={current.end}
              onChange={(e) => onEnd(e.target.value)}
            />
          </div>
        </div>
      );
    }
    switch (f.type) {
      case 'textarea':
        return (
          <div className="modal-field" key={f.key}>
            {label}
            <textarea
              id={`pf-${f.key}`}
              className="input"
              rows={3}
              placeholder={f.label}
              value={values[f.key] || ''}
              onChange={(e) => setField(f.key, e.target.value)}
            />
          </div>
        );
      case 'date':
        return (
          <div className="modal-field" key={f.key}>
            {label}
            <input id={`pf-${f.key}`} type="date" className="input" value={values[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} />
          </div>
        );
      case 'boolean':
        return (
          <div className="modal-field" key={f.key}>
            <label className="admin-toggle">
              <input id={`pf-${f.key}`} type="checkbox" checked={!!values[f.key]} onChange={(e) => setField(f.key, e.target.checked)} />
              <span>{f.label}</span>
            </label>
          </div>
        );
      case 'select': {
        const opts = Array.isArray(f.options) ? f.options : (f.options?.options || []);
        return (
          <div className="modal-field" key={f.key}>
            {label}
            <select id={`pf-${f.key}`} className="input" value={values[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)}>
              <option value="">—</option>
              {opts.map((o) => (
                <option key={String(o)} value={String(o)}>
                  {o}
                </option>
              ))}
            </select>
          </div>
        );
      }
      case 'number':
        return (
          <div className="modal-field" key={f.key}>
            {label}
            <input id={`pf-${f.key}`} type="number" className="input" value={values[f.key] ?? ''} onChange={(e) => setField(f.key, e.target.value)} />
          </div>
        );
      default:
        return (
          <div className="modal-field" key={f.key}>
            {label}
            <input id={`pf-${f.key}`} type="text" className="input" placeholder={f.label} value={values[f.key] || ''} onChange={(e) => setField(f.key, e.target.value)} />
          </div>
        );
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-sm" role="dialog" aria-modal="true" aria-label="My profile">
        <div className="modal-head">
          <h2>
            <UserCog size={17} /> My profile
          </h2>
          <button type="button" className="icon-btn sm" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div className="profile-email">{user?.email}</div>
          {!fields ? (
            <p className="admin-loading">Loading your profile…</p>
          ) : fields.length === 0 ? (
            <p className="sidebar-empty">No profile fields have been configured yet.</p>
          ) : (
            <div className="profile-fields">{fields.filter((f) => f.active !== false).map(renderField)}</div>
          )}

          <div className="profile-lock">
            <div className="panel-title">
              <LockKeyhole size={15} /> App lock
            </div>
            <label className="admin-toggle">
              <input type="checkbox" checked={lock.enabled || armLock} onChange={toggleLock} />
              <span>
                <strong>Require unlock to open Focusly</strong>
                <small>
                  Locks with a 4–6 digit PIN{lock.hasBio ? ' or your fingerprint' : ''} when the app is launched.
                </small>
              </span>
            </label>
            {!lock.enabled && armLock && (
              <div className="lock-setup">
                <input
                  type="password"
                  className="input"
                  placeholder="New PIN (4–6 digits)"
                  inputMode="numeric"
                  value={lockPin}
                  onChange={(e) => setLockPin(e.target.value.replace(/\D/g, ''))}
                />
                <input
                  type="password"
                  className="input"
                  placeholder="Confirm PIN"
                  inputMode="numeric"
                  value={lockPin2}
                  onChange={(e) => setLockPin2(e.target.value.replace(/\D/g, ''))}
                />
                <button type="button" className="btn btn-primary" onClick={saveLock}>
                  {lock.hasBio && <Fingerprint size={15} />}
                  Set lock
                </button>
              </div>
            )}
            {lock.enabled && lock.hasBio && (
              <p className="form-hint">
                <Fingerprint size={13} /> Biometric unlock is available on this device.
              </p>
            )}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={save} disabled={busy || !fields}>
              {busy && <Loader2 size={15} className="spin" />}
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}