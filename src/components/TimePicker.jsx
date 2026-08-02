import { useEffect, useRef, useState } from 'react';
import { Minus, Plus, X } from 'lucide-react';

const SIZE = 230;
const C = SIZE / 2;
const R = C - 14;

/**
 * Analog clock time picker. Emits a 24h 'HH:mm' string via onChange
 * so it is a drop-in replacement for the native time input.
 */
export default function TimePicker({ value, onChange }) {
  const [hour12, setHour12] = useState(12);
  const [minute, setMinute] = useState(0);
  const [ampm, setAmpm] = useState('AM');
  const [mode, setMode] = useState('hour');
  const [dragging, setDragging] = useState(false);
  const svgRef = useRef(null);

  useEffect(() => {
    if (!value) return;
    const [h, m] = value.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return;
    setAmpm(h < 12 ? 'AM' : 'PM');
    setHour12(h % 12 === 0 ? 12 : h % 12);
    setMinute(m);
  }, [value]);

  const emit = (h12, m, ap) => {
    let h = h12 % 12;
    if (ap === 'PM') h += 12;
    onChange(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  };

  const angleFromEvent = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    let angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    if (angle < 0) angle += 360;
    return angle;
  };

  const apply = (e) => {
    const angle = angleFromEvent(e);
    if (mode === 'hour') {
      const h = Math.round(angle / 30) % 12;
      const h12 = h === 0 ? 12 : h;
      setHour12(h12);
      emit(h12, minute, ampm);
    } else {
      const m = Math.round(angle / 6) % 60;
      setMinute(m);
      emit(hour12, m, ampm);
    }
  };

  const onPointerDown = (e) => {
    e.preventDefault();
    setDragging(true);
    apply(e);
    const move = (ev) => apply(ev);
    const up = () => {
      setDragging(false);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const nudge = (delta) => {
    if (mode === 'hour') {
      const next = (((hour12 - 1 + delta) % 12) + 12) % 12 + 1;
      setHour12(next);
      emit(next, minute, ampm);
    } else {
      const next = (((minute + delta) % 60) + 60) % 60;
      setMinute(next);
      emit(hour12, next, ampm);
    }
  };

  const hourAngle = ((hour12 % 12) / 12) * 360;
  const minuteAngle = (minute / 60) * 360;
  const activeAngle = mode === 'hour' ? hourAngle : minuteAngle;

  const display = `${hour12}:${String(minute).padStart(2, '0')} ${ampm}`;

  return (
    <div className="time-picker">
      <div className="time-picker-display">
        <strong>{display}</strong>
        {value && (
          <button type="button" className="icon-btn sm" onClick={() => onChange('')} title="Clear time">
            <X size={14} />
          </button>
        )}
      </div>

      <svg
        ref={svgRef}
        className="time-picker-clock"
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        onPointerDown={onPointerDown}
        style={{ cursor: dragging ? 'grabbing' : 'grab' }}
        role="img"
        aria-label="Analog clock to pick a time"
      >
        <circle cx={C} cy={C} r={R + 10} className="clock-rim" />
        <circle cx={C} cy={C} r={R} className="clock-face" />

        {/* Minute ticks */}
        {Array.from({ length: 60 }).map((_, i) => {
          const a = (i / 60) * 360 - 90;
          const major = i % 5 === 0;
          const r1 = R - (major ? 13 : 6);
          const r2 = R - 2;
          return (
            <line
              key={i}
              x1={C + r1 * Math.cos((a * Math.PI) / 180)}
              y1={C + r1 * Math.sin((a * Math.PI) / 180)}
              x2={C + r2 * Math.cos((a * Math.PI) / 180)}
              y2={C + r2 * Math.sin((a * Math.PI) / 180)}
              className={major ? 'tick-major' : 'tick-minor'}
            />
          );
        })}

        {/* Hour labels */}
        {Array.from({ length: 12 }).map((_, i) => {
          const label = i === 0 ? 12 : i;
          const a = (i / 12) * 360 - 90;
          const x = C + (R - 26) * Math.cos((a * Math.PI) / 180);
          const y = C + (R - 26) * Math.sin((a * Math.PI) / 180) + 5;
          return (
            <text key={i} x={x} y={y} textAnchor="middle" className="clock-hour-label">
              {label}
            </text>
          );
        })}

        {/* Minute hand */}
        <g transform={`rotate(${minuteAngle} ${C} ${C})`} className="hand-minute">
          <line x1={C} y1={C + 8} x2={C} y2={C - (R - 24)} />
        </g>
        {/* Hour hand */}
        <g transform={`rotate(${hourAngle} ${C} ${C})`} className="hand-hour">
          <line x1={C} y1={C + 8} x2={C} y2={C - (R - 52)} />
        </g>
        <circle cx={C} cy={C} r={6} className="clock-center" />

        {/* Active-mode highlight ring follows pointer target */}
        <circle
          cx={C}
          cy={C}
          r={R - (mode === 'hour' ? 26 : 2)}
          className={`clock-mode-ring ${dragging ? 'dragging' : ''}`}
        />
      </svg>

      <div className="time-picker-controls">
        <div className="seg" role="group" aria-label="Clock mode">
          <button type="button" className={mode === 'hour' ? 'on' : ''} onClick={() => setMode('hour')}>
            Hour
          </button>
          <button type="button" className={mode === 'minute' ? 'on' : ''} onClick={() => setMode('minute')}>
            Minute
          </button>
        </div>
        <div className="seg" role="group" aria-label="AM or PM">
          <button
            type="button"
            className={ampm === 'AM' ? 'on' : ''}
            onClick={() => {
              setAmpm('AM');
              emit(hour12, minute, 'AM');
            }}
          >
            AM
          </button>
          <button
            type="button"
            className={ampm === 'PM' ? 'on' : ''}
            onClick={() => {
              setAmpm('PM');
              emit(hour12, minute, 'PM');
            }}
          >
            PM
          </button>
        </div>
        <div className="time-nudge">
          <button type="button" className="icon-btn sm" onClick={() => nudge(-1)} title={`${mode === 'hour' ? 'Hour' : 'Minute'} back`}>
            <Minus size={13} />
          </button>
          <span className="time-nudge-label">{mode === 'hour' ? 'Hour' : 'Min'}</span>
          <button type="button" className="icon-btn sm" onClick={() => nudge(1)} title={`${mode === 'hour' ? 'Hour' : 'Minute'} forward`}>
            <Plus size={13} />
          </button>
        </div>
      </div>
      <p className="form-hint time-picker-hint">
        Select <strong>Hour</strong>, then <strong>Minute</strong>, and drag on the clock face.
      </p>
    </div>
  );
}
