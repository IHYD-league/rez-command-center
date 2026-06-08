// juice.js — haptics + synthesized SFX. Module-level singleton; import where needed.
//
// SFX is generated with WebAudio oscillators, so there are no asset
// downloads to manage. iOS Safari requires an AudioContext to be created
// (or resumed) from inside a user-gesture handler — call juice.unlock()
// from a top-level pointerdown listener after auth so the first task tap
// already has a live context.
//
// Haptics use navigator.vibrate where available (Android, some PWAs).
// iOS Safari ignores it silently. That's fine — the SFX channel still
// fires on iOS, and Android gets both.
//
// Per-profile prefs (mute, haptic on/off) are pushed in via setEnabled.
// The kid's hub Sound module is the UI for it; this module just respects
// whatever it was last told.

let ctx = null;
let unlocked = false;
let enabled = { sfx: true, haptic: true };

function ensureCtx() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch { return null; }
  }
  return ctx;
}

function now() {
  const c = ensureCtx();
  return c ? c.currentTime : 0;
}

// One generic blip: a sine/triangle with a snappy attack and an exp decay.
// Kept short (≤180ms) so even a rapid tap sequence doesn't smear.
function blip({ freq = 880, dur = 0.12, type = "sine", peak = 0.18, slideTo = null }) {
  const c = ensureCtx();
  if (!c || !enabled.sfx) return;
  const t0 = now();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function chord(notes, opts = {}) {
  notes.forEach((freq, i) => {
    setTimeout(() => blip({ freq, ...opts }), i * (opts.spread ?? 60));
  });
}

const SFX = {
  // Single soft tap — confirms a UI touch landed.
  tap: () => blip({ freq: 720, dur: 0.06, type: "triangle", peak: 0.10 }),
  // Quest submit — uplifting two-note "blip-blop".
  submit: () => {
    blip({ freq: 660, dur: 0.08, type: "triangle", peak: 0.16 });
    setTimeout(() => blip({ freq: 990, dur: 0.10, type: "triangle", peak: 0.16 }), 70);
  },
  // Quest approved / stars earned — Mario-coin style ascending arpeggio.
  approve: () => chord([784, 988, 1318, 1568], { dur: 0.10, type: "triangle", peak: 0.16, spread: 55 }),
  // Streak milestone hit — bright sustained chime.
  streak: () => {
    blip({ freq: 880, dur: 0.18, type: "sine", peak: 0.20 });
    setTimeout(() => blip({ freq: 1320, dur: 0.26, type: "sine", peak: 0.20 }), 80);
  },
  // Level up — heroic four-note rising fanfare.
  levelUp: () => chord([523, 659, 784, 1047], { dur: 0.18, type: "sawtooth", peak: 0.14, spread: 110 }),
  // Reward redeemed / treasure — descending sparkle.
  treasure: () => chord([1568, 1318, 1047, 1568, 2093], { dur: 0.16, type: "triangle", peak: 0.16, spread: 70 }),
  // Soft rejection — single low blip; never anything that feels punitive.
  nope: () => blip({ freq: 220, dur: 0.14, type: "sine", peak: 0.12, slideTo: 160 }),
  // Sheet/modal open — soft rising glissando. Quick (130ms) so it
  // doesn't compete with the kid's next input.
  swipe: () => blip({ freq: 320, dur: 0.13, type: "sine", peak: 0.13, slideTo: 760 }),
};

// Vibration patterns. navigator.vibrate accepts a number (ms) or array
// (on/off/on/off…). Patterns are tuned to feel distinct from each other
// without being long enough to be annoying.
const HAPTIC = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [20, 40, 30],
  warning: [15, 30, 15],
  error: [40, 60, 40, 60, 60],
};

export const juice = {
  // Call once from inside a user-gesture handler (pointerdown / click).
  // Idempotent — safe to call from a global listener that fires on
  // every tap, the work only happens once.
  unlock() {
    if (unlocked) return;
    const c = ensureCtx();
    if (!c) return;
    if (c.state === "suspended") c.resume().catch(() => {});
    unlocked = true;
  },
  setEnabled(next) {
    enabled = { sfx: !!next?.sfx, haptic: !!next?.haptic };
  },
  isEnabled() {
    return { ...enabled };
  },
  sfx(name) {
    const fn = SFX[name];
    if (!fn) return;
    if (!enabled.sfx) return;
    try { fn(); } catch {}
  },
  haptic(level) {
    if (!enabled.haptic) return;
    if (typeof navigator === "undefined" || !navigator.vibrate) return;
    const pattern = HAPTIC[level] ?? level;
    try { navigator.vibrate(pattern); } catch {}
  },
  // Combo helper for the most common case: both channels with matching meaning.
  burst(level, sfxName) {
    this.haptic(level);
    this.sfx(sfxName);
  },
};

export default juice;
