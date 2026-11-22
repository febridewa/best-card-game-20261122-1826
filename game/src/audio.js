// Ember Court — synthesised sound.
// No audio files: every effect is a small WebAudio patch (oscillator +
// gain envelope), so the game ships zero bytes of sound and still feels
// alive. Everything is guarded: in a headless screenshot run there is no
// AudioContext and every call is a silent no-op.

let ctx = null;
let muted = false;

export function setMuted(value) {
  muted = value;
}

export function isMuted() {
  return muted;
}

function audio() {
  if (muted) return null;
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq, dur, type = 'sine', vol = 0.12, when = 0, slideTo = null) {
  const ac = audio();
  if (!ac) return;
  try {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    const t0 = ac.currentTime + when;
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  } catch {
    // Sound never blocks the game.
  }
}

export const sfx = {
  click() {
    tone(660, 0.06, 'triangle', 0.07);
  },
  deal() {
    tone(520, 0.07, 'triangle', 0.08);
    tone(780, 0.08, 'triangle', 0.06, 0.05);
  },
  playCard() {
    tone(392, 0.1, 'sawtooth', 0.05);
    tone(523, 0.12, 'triangle', 0.09, 0.04);
  },
  hit() {
    tone(180, 0.14, 'square', 0.1, 0, 90);
  },
  heal() {
    tone(523, 0.16, 'sine', 0.08);
    tone(784, 0.2, 'sine', 0.07, 0.08);
  },
  draw() {
    tone(880, 0.06, 'sine', 0.05);
  },
  turn() {
    tone(440, 0.09, 'triangle', 0.08);
    tone(587, 0.12, 'triangle', 0.07, 0.07);
  },
  win() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.28, 'triangle', 0.1, i * 0.11));
  },
  lose() {
    [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, 'sawtooth', 0.05, i * 0.13));
  },
};
