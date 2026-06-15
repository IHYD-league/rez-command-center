// milestone.js — pub/sub for the treasure-chest celebration cinematic.
//
// Fired imperatively from App.jsx when a streak crosses a milestone
// (7, 14, 30, 50, 100, 200, 300, 365, 500, 730, 1000 days) or any
// activity sets a new personal best beyond 30. MilestoneCelebrate
// component subscribes and renders the chest takeover. Same singleton
// pattern as levelUp.js / starBurst.js.

let listeners = new Set();
let seq = 0;

export const milestone = {
  show({ title, subtitle, kind = "streak" } = {}) {
    const event = {
      title: title || "",
      subtitle: subtitle || "",
      kind,
      key: `mil_${++seq}_${Date.now()}`,
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

export default milestone;
