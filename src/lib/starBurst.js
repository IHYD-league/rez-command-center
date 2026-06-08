// starBurst.js — pub/sub for the star fly-to-bank animation.
//
// Anywhere stars actually land (auto-approved submit, parent approve),
// call starBurst.fly({ value }). The dispatcher:
//   1. Picks a source point — the last tap location captured by the
//      global pointer listener (fresh = within last 2s), else the
//      explicit `fromEl` if passed, else viewport center as fallback.
//   2. Picks a destination — finds the first element with the
//      `data-star-bank` attribute via querySelector and uses the
//      center of its bounding rect. If no such element is in the DOM
//      (e.g. parent screen, login, etc.), the fly is silently skipped.
//   3. Notifies subscribers (the StarBurstLayer) with { from, to,
//      value, key } so each burst can render.
//
// The layer GC's bursts after their animation finishes. Module-level
// singleton, no React context — call it from any handler.

let listeners = new Set();
let lastTap = null;

if (typeof window !== "undefined") {
  const onTap = (e) => {
    const t = e.touches?.[0];
    const x = e.clientX ?? t?.clientX;
    const y = e.clientY ?? t?.clientY;
    if (typeof x === "number" && typeof y === "number") {
      lastTap = { x, y, at: Date.now() };
    }
  };
  window.addEventListener("pointerdown", onTap, { passive: true });
  window.addEventListener("touchstart", onTap, { passive: true });
}

function rectCenter(el) {
  if (!el?.getBoundingClientRect) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

let burstSeq = 0;

export const starBurst = {
  fly({ value = 1, fromEl = null } = {}) {
    if (typeof document === "undefined") return;
    const target = document.querySelector("[data-star-bank]");
    const to = rectCenter(target);
    if (!to) return; // No bank on screen → silent no-op.
    let from = rectCenter(fromEl);
    if (!from && lastTap && Date.now() - lastTap.at < 2000) {
      from = { x: lastTap.x, y: lastTap.y };
    }
    if (!from) {
      from = { x: window.innerWidth / 2, y: window.innerHeight * 0.6 };
    }
    const event = {
      from,
      to,
      value: Math.max(1, Math.round(value)),
      key: `b_${++burstSeq}_${Date.now()}`,
    };
    listeners.forEach((fn) => {
      try { fn(event); } catch {}
    });
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

export default starBurst;
