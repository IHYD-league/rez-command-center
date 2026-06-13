// toast.js — module-level pub/sub for soft notifications.
//
// Replaces native window.alert() on the photo / cover / avatar upload
// failure paths. alert() is jarring on mobile, can't be styled, blocks
// the page, and isn't localizable. A small in-app pill at the bottom
// is much less aggressive and disappears on its own.
//
// API:
//   toast.error(message, opts?)   — amber pill, default 5s
//   toast.success(message, opts?) — emerald pill, default 3s
//   toast.info(message, opts?)    — slate pill, default 3.5s
//   toast.subscribe(fn)           — used by the App's <ToastLayer />
//
// Same module-level singleton pattern as lightbox / giftEditor.

let listeners = new Set();
let nextId = 1;

function notify(toast) {
  for (const fn of listeners) {
    try { fn(toast); } catch (_) {}
  }
}

function emit(kind, message, opts = {}) {
  const id = nextId++;
  const t = {
    id,
    kind,
    message: String(message || ""),
    duration: opts.duration ?? (kind === "error" ? 5000 : kind === "info" ? 3500 : 3000),
  };
  notify(t);
  return id;
}

export const toast = {
  error: (m, o) => emit("error", m, o),
  success: (m, o) => emit("success", m, o),
  info: (m, o) => emit("info", m, o),
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
