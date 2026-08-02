import { useEffect, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Plus,
  ChevronUp,
  ChevronDown,
  Timer,
  Volume2,
  X,
} from 'lucide-react';
import { useFocusTimer, formatMs } from '../hooks/useFocusTimer';
import { setReminderSoundEnabled } from '../utils/audio';
import { loadState, saveState } from '../utils/storage';

export default function FocusTimer({ onComplete }) {
  const timer = useFocusTimer(onComplete);
  const [open, setOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [minutes, setMinutes] = useState('');
  const [label, setLabel] = useState('');
  const [reminderSound, setReminderSound] = useState(() => loadState('focus:reminderSound', true));

  useEffect(() => {
    saveState('focus:reminderSound', reminderSound);
    setReminderSoundEnabled(reminderSound);
  }, [reminderSound]);

  useEffect(() => {
    if (timer.alarming) setOpen(true);
  }, [timer.alarming]);

  const toggleRun = () => (timer.state.running ? timer.pause() : timer.start());

  const runCustom = () => {
    const m = Number(minutes);
    if (m > 0 && m <= 1440) {
      timer.setMinutes(m);
      setMinutes('');
      setCustomOpen(false);
    }
  };

  const saveCustom = () => {
    const m = Number(minutes);
    if (m > 0 && m <= 1440 && timer.addPreset(label, m)) {
      setMinutes('');
      setLabel('');
      setCustomOpen(false);
    }
  };

  return (
    <div className={`focus-timer ${open ? 'open' : ''} ${timer.alarming ? 'alarming' : ''}`}>
      {open ? (
        <div className="focus-panel">
          <div className="focus-head">
            <span className="focus-title">
              <Timer size={16} />
              Focus Timer
            </span>
            <button type="button" className="icon-btn sm" onClick={() => setOpen(false)} title="Collapse">
              <ChevronDown size={16} />
            </button>
          </div>

          {timer.alarming && (
            <div className="focus-alarm">
              <Volume2 size={18} />
              <span>Time&apos;s up! The alarm is ringing.</span>
              <button type="button" className="btn btn-danger sm" onClick={timer.stopAlarm}>
                Stop sound
              </button>
            </div>
          )}

          <div className="focus-time big" aria-live="polite">
            {formatMs(timer.state.remainingMs)}
          </div>

          <div className="focus-controls">
            {!timer.state.running ? (
              <button type="button" className="btn btn-primary" onClick={timer.start}>
                <Play size={15} />
                {timer.state.remainingMs < timer.state.durationMs ? 'Resume' : 'Start'}
              </button>
            ) : (
              <button type="button" className="btn" onClick={timer.pause}>
                <Pause size={15} /> Pause
              </button>
            )}
            <button type="button" className="btn" onClick={timer.reset}>
              <RotateCcw size={15} /> Reset
            </button>
          </div>

          <div className="focus-presets">
            {timer.presets.map((p) => {
              const active = timer.state.durationMs === p.minutes * 60000;
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`chip chip-btn ${active ? 'on' : ''}`}
                  onClick={() => timer.setMinutes(p.minutes)}
                >
                  {p.label} · {p.minutes}m
                  <span
                    className="preset-x"
                    role="button"
                    tabIndex={0}
                    title="Remove preset"
                    onClick={(e) => {
                      e.stopPropagation();
                      timer.removePreset(p.id);
                    }}
                  >
                    <X size={11} />
                  </span>
                </button>
              );
            })}
            <button type="button" className="chip chip-btn" onClick={() => setCustomOpen((v) => !v)} title="Add preset">
              <Plus size={13} />
            </button>
          </div>

          {customOpen && (
            <div className="focus-custom">
              <div className="focus-custom-row">
                <input
                  type="number"
                  min="1"
                  max="1440"
                  className="input"
                  placeholder="Minutes — e.g. 110 for 1h50m"
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && runCustom()}
                />
                <button type="button" className="btn" onClick={runCustom} title="Run this duration once">
                  <Play size={14} /> Run
                </button>
              </div>
              <div className="focus-custom-row">
                <input
                  type="text"
                  className="input"
                  placeholder="Preset name (optional)"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
                <button type="button" className="btn btn-primary" onClick={saveCustom} title="Save as a preset">
                  <Plus size={14} /> Save
                </button>
              </div>
            </div>
          )}

          <div className="focus-options">
            <span className="focus-opt-label">Alarm</span>
            <div className="seg" role="group" aria-label="Alarm style">
              <button
                type="button"
                className={timer.state.alarm === 'double' ? 'on' : ''}
                onClick={() => timer.setAlarmStyle('double')}
              >
                Two beeps
              </button>
              <button
                type="button"
                className={timer.state.alarm === 'repeat' ? 'on' : ''}
                onClick={() => timer.setAlarmStyle('repeat')}
              >
                Repeat until stopped
              </button>
            </div>
          </div>

          <div className="focus-toggles">
            <label>
              <input
                type="checkbox"
                checked={timer.state.notify}
                onChange={(e) => timer.setNotify(e.target.checked)}
              />
              Notify when done
            </label>
            <label>
              <input
                type="checkbox"
                checked={reminderSound}
                onChange={(e) => setReminderSound(e.target.checked)}
              />
              Beep for task reminders
            </label>
          </div>
        </div>
      ) : (
        <div
          className="focus-pill"
          role="button"
          tabIndex={0}
          onClick={() => setOpen(true)}
          onKeyDown={(e) => e.key === 'Enter' && setOpen(true)}
          title="Open focus timer"
        >
          <span className={`pill-dot ${timer.state.running ? 'running' : ''} ${timer.alarming ? 'alarm' : ''}`} />
          <Timer size={15} />
          <span className="focus-pill-time">{formatMs(timer.state.remainingMs)}</span>
          <button
            type="button"
            className="pill-play"
            onClick={(e) => {
              e.stopPropagation();
              toggleRun();
            }}
            aria-label={timer.state.running ? 'Pause timer' : 'Start timer'}
            title={timer.state.running ? 'Pause timer' : 'Start timer'}
          >
            {timer.state.running ? <Pause size={13} /> : <Play size={13} />}
          </button>
          <ChevronUp size={13} />
        </div>
      )}
    </div>
  );
}
