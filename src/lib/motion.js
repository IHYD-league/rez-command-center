// motion.js — single-call read for the user's OS-level "reduce motion"
// preference. iOS: Settings → Accessibility → Motion → Reduce Motion.
// macOS: System Settings → Accessibility → Display → Reduce motion.
// Android / Windows have equivalents.
//
// Used by the JS-driven animations (StarBurstLayer Web Animations API,
// conditional confetti spawn, CosmicAura particle gate) to pick a calm
// fallback. CSS-only animations are handled by @media blocks in their
// own scoped style sheets — those auto-update if the OS setting flips
// mid-session.

export function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export default prefersReducedMotion;
