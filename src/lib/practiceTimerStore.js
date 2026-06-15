// practiceTimerStore — module-level singleton for the practice timer so
// it survives navigation away from More → Practice Timer. The timer
// only stops when the user explicitly taps Stop & save (or Cancel) on
// the practice page itself. A floating banner pinned below the TopBar
// uses subscribe() to show "still running" from any tab, with a tap to
// jump back.
//
// PER-FAMILY NAMESPACE (privacy)
// localStorage entries are scoped by familyId so a timer started by
// one family on a shared browser can NEVER show up in another
// family's UI. Mike's bug report 2026-06-15: a timer he started on
// his Lynch profile was visible after logging out and signing into a
// Burden test account. That's a breach of family-data isolation.
//
// App.jsx calls `setNamespace(familyId)` whenever the active family
// changes. Without a namespace set, `start()` is a no-op — defensive
// against being called before the user finishes signing in.
//
// LEGACY KEY CLEANUP
// The previous version used a single global key `rcc_practice_timer_v1`
// shared across every signed-in account on the same browser. On
// module load we delete that key one-time so any in-flight leak
// gets purged. Any in-progress timer at the moment of the fix
// deploy is lost — accepting that one-time data loss to close the
// privacy hole immediately.

const NEW_PREFIX = "rcc_practice_timer_v2";
const LEGACY_KEY = "rcc_practice_timer_v1";

let listeners = new Set();
let state = null;
let currentKey = null;

// One-time legacy cleanup. Runs the first time the new build executes
// in this browser — kills any cross-family timer state left behind.
try {
  if (typeof localStorage !== "undefined") localStorage.removeItem(LEGACY_KEY);
} catch {}

function keyFor(familyId) {
  return familyId ? `${NEW_PREFIX}:${familyId}` : null;
}

function readStateFromStorage(key) {
  if (!key) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.startedAt === "number") return parsed;
    return null;
  } catch {
    return null;
  }
}

function persist() {
  if (!currentKey) return;
  try {
    if (state) localStorage.setItem(currentKey, JSON.stringify(state));
    else localStorage.removeItem(currentKey);
  } catch {}
}

function emit() {
  listeners.forEach((fn) => { try { fn(state); } catch {} });
}

export const practiceTimerStore = {
  // Called by App.jsx whenever the signed-in family changes. Loading
  // the new namespace's stored state + emitting to subscribers ensures
  // the banner reflects only THIS family's running timer.
  setNamespace(familyId) {
    const newKey = keyFor(familyId);
    if (newKey === currentKey) return;
    currentKey = newKey;
    state = readStateFromStorage(currentKey);
    emit();
  },
  start({ activityId, profileId } = {}) {
    if (!currentKey) return null;
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
