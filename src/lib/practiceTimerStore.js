// practiceTimerStore — module-level singleton for the practice timer so
// it survives navigation away from More → Practice Timer. The timer
// only stops when the user explicitly taps Stop & save (or Cancel) on
// the practice page itself. A floating banner pinned below the TopBar
// uses subscribe() to show "still running" from any tab, with a tap to
// jump back. Same pub/sub style as milestone.js / juice.js, plus
// localStorage backing so it also survives a page reload.

const STORAGE_KEY = "rcc_practice_timer_v1";

let listeners = new Set();
let state = null;

try {
  const raw = typeof localStorage !== "undefined" && localStorage.getItem(STORAGE_KEY);
  if (raw) {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.startedAt === "number") state = parsed;
  }
} catch {}

function persist() {
  try {
    if (state) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

function emit() {
  listeners.forEach((fn) => { try { fn(state); } catch {} });
}

export const practiceTimerStore = {
  start({ activityId, profileId } = {}) {
    state = { activityId: activityId || "", profileId: profileId || null, startedAt: Date.now() };
    persist();
    emit();
    return state;
  },
  stop() {
    const ended = state;
    state = null;
    persist();
    emit();
    return ended;
  },
  get() {
    return state;
  },
  subscribe(fn) {
    listeners.add(fn);
    try { fn(state); } catch {}
    return () => listeners.delete(fn);
  },
};

export default practiceTimerStore;
