// Web Audio alarm + reminder sounds. No external assets required.

let audioCtx = null;
let repeatTimer = null;
let reminderSoundEnabled = true;

function ctx() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!audioCtx) {
    audioCtx = new AC();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

/** Unlock the AudioContext on a user gesture (autoplay policies). */
export function primeAudio() {
  ctx();
}

function beep({ freq = 880, duration = 0.3, gain = 0.28, when = 0 } = {}) {
  const c = ctx();
  if (!c) return;
  try {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const t = c.currentTime + when;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(g);
    g.connect(c.destination);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  } catch {
    /* audio unavailable */
  }
}

/** Two distinct beeps (default timer alarm). */
export function playAlarmDouble() {
  beep({ freq: 990, duration: 0.5, gain: 0.3 });
  beep({ freq: 740, duration: 0.5, gain: 0.3, when: 0.5 });
}

/** Repeating alarm until stopRepeatAlarm() is called. */
export function startRepeatAlarm() {
  stopRepeatAlarm();
  const loop = () => {
    beep({ freq: 990, duration: 0.42, gain: 0.3 });
    beep({ freq: 660, duration: 0.42, gain: 0.3, when: 0.5 });
    repeatTimer = window.setTimeout(loop, 1600);
  };
  loop();
}

export function stopRepeatAlarm() {
  if (repeatTimer) {
    window.clearTimeout(repeatTimer);
    repeatTimer = null;
  }
}

export function setReminderSoundEnabled(v) {
  reminderSoundEnabled = v;
}

export function isReminderSoundEnabled() {
  return reminderSoundEnabled;
}

/** Single soft beep used when a task reminder fires. */
export function playReminderBeep() {
  if (!reminderSoundEnabled) return;
  beep({ freq: 660, duration: 0.35, gain: 0.2 });
}
