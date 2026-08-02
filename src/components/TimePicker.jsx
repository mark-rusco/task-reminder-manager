import { useEffect, useRef, useState } from 'react';

const SIZE = 240;
const C = SIZE / 2;
const R = 106;
const NR = R - 32;

const pad = (n) => String(n).padStart(2, '0');

const pt = (deg) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [C + NR * Math.cos(a), C + NR * Math.sin(a)];
};

/**
 * Material Design time picker dialog.
 * Select an hour, then it auto-advances to the minute ring.
 * Emits 24h 'HH:mm' via onChange; onCancel/onConfirm close the dialog.
 */
export default function TimePicker({ value, onChange, onCancel, onConfirm }) {
  const [hour12, setHour12] = useState(12);
  const [minute, setMinute] = useState(0);
  const [ampm, setAmpm] = useState('AM');
  const [mode, setMode] = useState('hour');
  const svgRef = useRef(null);
  const okRef = useRef(null);
  const stateRef = useRef({ hour12, minute, ampm, mode });

  useEffect(() => {
    stateRef.current = { hour12, minute, ampm, mode };
  }, [hour12, minute, ampm, mode]);

  useEffect(() => {
    let h = 12;
    let m = 0;
    if (value) {
      const parts = value.split(':').map(Number);
      if (!Number.isNaN(parts[0]) && !Number.isNaN(parts[1])) {
        h = parts[0];
        m = parts[1];
      }
    } else {
      const d = new Date();
      h = d.getHours();
      m = d.getMinutes();
    }
    setAmpm(h < 12 ? 'AM' : 'PM');
    setHour12(h % 12 === 0 ? 12 : h % 12);
    setMinute(m);
  }, [value]);

  // Escape cancels the dialog without bubbling to the app-level handler.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        onCancel?.();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onCancel]);

  useEffect(() => {
    okRef.current?.focus();
  }, []);

  const emit = (h12, m, ap) => {
    let h = h12 % 12;
    if (ap === 'PM') h += 12;
    onChange(`${pad(h)}:${pad(m)}`);
  };

  const angleFromEvent = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let angle = (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI + 90;
    if (angle < 0) angle += 360;
    return angle;
  };

  const apply = (e) => {
    const { hour12, minute, ampm, mode } = stateRef.current;
    const angle = angleFromEvent(e);
    if (mode === 'hour') {
      const h = Math.round(angle / 30) % 12;
      const h12 = h === 0 ? 12 : h;
      setHour12(h12);
      setMode('minute');
      emit(h12, minute, ampm);
    } else {
      const m = Math.round(angle / 6) % 60;
      setMinute(m);
      emit(hour12, m, ampm);
    }
  };

  const onPointerDown = (e) => {
    e.preventDefault();
    apply(e);
    const move = (ev) => apply(ev);
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const hourAngle = (hour12 % 12) * 30;
  const minuteAngle = minute * 6;
  const nearest5 = Math.round(minute / 5) * 5;
  const selAngle = mode === 'hour' ? hourAngle : nearest5 * 6;
  const [selX, selY] = pt(selAngle);
  const handAngle = mode === 'hour' ? hourAngle : minuteAngle;
  const [handX, handY] = pt(handAngle);

  const hourNums = Array.from({ length: 12 }, (_, i) => ({ v: i === 0 ? 12 : i, deg: i * 30 }));
  const minuteNums = Array.from({ length: 12 }, (_, i) => ({ v: i * 5, deg: i * 30 }));

  const tickPos = (deg, r) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return [C + r * Math.cos(a), C + r * Math.sin(a)];
  };

  return (
    <div className="mp-card" role="dialog" aria-modal="true" aria-label="Pick a time">
      <header className="mp-header">
        <div className="mp-time">
          <button
            type="button"
            className={`mp-time-seg ${mode === 'hour' ? 'on' : ''}`}
            onClick={() => setMode('hour')}
            aria-pressed={mode === 'hour'}
          >
            {hour12}
          </button>
          <span className="mp-colon">:</span>
          <button
            type="button"
            className={`mp-time-seg ${mode === 'minute' ? 'on' : ''}`}
            onClick={() => setMode('minute')}
            aria-pressed={mode === 'minute'}
          >
            {pad(minute)}
          </button>
          <span className="mp-ampm-label">{ampm}</span>
        </div>
      </header>

      <div className="mp-body">
        <svg
          ref={svgRef}
          className="mp-clock"
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          onPointerDown={onPointerDown}
          role="img"
          aria-label="Pick on the clock"
        >
          <circle cx={C} cy={C} r={R} className="mp-face" />

          {Array.from({ length: 60 }).map((_, i) => {
            const major = i % 5 === 0;
            const r1 = major ? R - 22 : R - 10;
            const r2 = major ? R - 12 : R - 4;
            const [x1, y1] = tickPos(i * 6, r1);
            const [x2, y2] = tickPos(i * 6, r2);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} className={major ? 'mp-tick mp-tick-major' : 'mp-tick'} />;
          })}

          {(mode === 'hour' ? hourNums : minuteNums).map(({ v, deg }) => {
            const [x, y] = pt(deg);
            const selected = mode === 'hour' ? v === hour12 : v === nearest5;
            return (
              <g key={v}>
                <circle cx={x} cy={y} r={18} className={selected ? 'mp-select mp-select-on' : 'mp-select'} />
                <text x={x} y={y + 5} textAnchor="middle" className={selected ? 'mp-num mp-num-on' : 'mp-num'}>
                  {mode === 'minute' ? pad(v) : v}
                </text>
              </g>
            );
          })}

          <line x1={C} y1={C} x2={handX} y2={handY} className="mp-hand" />
          <circle cx={selX} cy={selY} r={3} className="mp-hand-dot" />
          <circle cx={C} cy={C} r={6} className="mp-center" />
        </svg>

        <div className="mp-ampm" role="group" aria-label="AM or PM">
          {['AM', 'PM'].map((ap) => (
            <button
              key={ap}
              type="button"
              className={ampm === ap ? 'on' : ''}
              onClick={() => {
                setAmpm(ap);
                emit(hour12, minute, ap);
              }}
            >
              {ap}
            </button>
          ))}
        </div>
      </div>

      <footer className="mp-foot">
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button ref={okRef} type="button" className="btn btn-primary" onClick={onConfirm}>
          OK
        </button>
      </footer>
    </div>
  );
}
