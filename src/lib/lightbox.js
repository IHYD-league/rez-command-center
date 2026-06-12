// lightbox.js — pub/sub for the full-screen photo viewer.
//
// Anywhere we render a photo (proof, gift, book/song cover, album),
// the wrapping component calls `lightbox.open({ src, alt })` on tap.
// A single PhotoLightboxOverlay mounted at App root subscribes and
// renders the overlay. Tap backdrop or the X (top-right) closes.
//
// Module-level singleton — same pattern as juice + starBurst. No
// React context, no provider plumbing, no prop drilling. Any handler
// in any component can call lightbox.open().
//
// Zoom: handled by the browser via touch-action: pinch-zoom on the
// image. Double-tap toggles 1× ↔ 2.5× via CSS transform as a
// keyboard/mouse-friendly fallback. Escape key closes.

let listeners = new Set();
let current = null; // { src, alt } | null

function notify() {
  for (const fn of listeners) {
    try { fn(current); } catch (e) { /* listener errors don't break each other */ }
  }
}

export const lightbox = {
  open({ src, alt = "" }) {
    if (!src) return;
    current = { src, alt };
    notify();
  },
  close() {
    if (!current) return;
    current = null;
    notify();
  },
  subscribe(fn) {
    listeners.add(fn);
    // Send the current state immediately so a fresh mount picks up an
    // already-open lightbox (rare but possible during HMR).
    try { fn(current); } catch (e) {}
    return () => listeners.delete(fn);
  },
};
