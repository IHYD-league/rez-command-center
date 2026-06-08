// levelUp.js — pub/sub for the level-up cinematic takeover.
//
// App.jsx detects a level transition (derived from starBank) and calls
// levelUp.show({ level, prevLevel, title }). The LevelUpLayer component
// subscribes and renders the overlay. Module-level singleton — same
// pattern as starBurst.js.

let listeners = new Set();
let seq = 0;

export const levelUp = {
  show({ level, prevLevel, title } = {}) {
    const event = {
      level,
      prevLevel,
      title: title || "",
      key: `lvl_${++seq}_${Date.now()}`,
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

export default levelUp;
