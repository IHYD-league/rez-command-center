import React, { useEffect, useRef, useState } from "react";
import { starBurst } from "./lib/starBurst.js";

// StarBurstLayer — full-viewport fixed overlay that listens for
// starBurst events and renders an animated star arc from (from) to
// (to). Lives once in the app at the top of the tree; multiple bursts
// can be in flight at the same time. pointer-events: none so it never
// blocks taps.

export default function StarBurstLayer() {
  const [bursts, setBursts] = useState([]);

  useEffect(() => {
    return starBurst.subscribe((ev) => {
      setBursts((prev) => [...prev, ev]);
      // GC slightly after the longest possible per-burst lifetime
      // (~80ms cascade + 800ms flight + 100ms safety).
      setTimeout(() => {
        setBursts((prev) => prev.filter((b) => b.key !== ev.key));
      }, 1200);
    });
  }, []);

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 9999,
        overflow: "hidden",
      }}
    >
      {bursts.map((b) => (
        <Burst key={b.key} from={b.from} to={b.to} value={b.value} />
      ))}
    </div>
  );
}

function Burst({ from, to, value }) {
  // Star count scales with the value but caps at 12 — past that it
  // becomes visual noise rather than feeling more rewarding.
  const n = Math.max(3, Math.min(12, value));
  const stars = Array.from({ length: n }, (_, i) => i);
  return (
    <>
      {stars.map((i) => (
        <Star key={i} index={i} total={n} from={from} to={to} />
      ))}
    </>
  );
}

function Star({ index, total, from, to }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof el.animate !== "function") return;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    // Per-star jitter so they don't fly as a single sprite — angular
    // spread at launch, slight target jitter at landing.
    const angle = ((index / Math.max(1, total - 1)) - 0.5) * 1.2; // -0.6 .. 0.6 rad
    const burst = 60; // launch radius
    const launchX = Math.sin(angle) * burst;
    const launchY = -Math.abs(Math.cos(angle)) * burst - 10;
    const landJitter = ((index * 37) % 17 - 8);
    const arcHeight = Math.min(140, Math.abs(dy) * 0.35 + 60);
    // Midpoint pulled up for the parabolic arc feel.
    const midX = launchX + (dx - launchX) * 0.5 + landJitter;
    const midY = launchY + (dy - launchY) * 0.5 - arcHeight;
    const dur = 700 + (index % 5) * 40;
    const delay = index * 35;
    const anim = el.animate(
      [
        { transform: "translate(0px, 0px) scale(0.3) rotate(0deg)", opacity: 0 },
        { offset: 0.10, transform: `translate(${launchX}px, ${launchY}px) scale(1.1) rotate(60deg)`, opacity: 1 },
        { offset: 0.55, transform: `translate(${midX}px, ${midY}px) scale(1) rotate(180deg)`, opacity: 1 },
        { offset: 0.92, transform: `translate(${dx + landJitter * 0.3}px, ${dy}px) scale(0.7) rotate(320deg)`, opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.2) rotate(360deg)`, opacity: 0 },
      ],
      { duration: dur, delay, easing: "cubic-bezier(.45,.05,.55,1)", fill: "forwards" }
    );
    return () => { try { anim.cancel(); } catch {} };
  }, [from.x, from.y, to.x, to.y, index, total]);

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        left: from.x - 14,
        top: from.y - 14,
        width: 28,
        height: 28,
        display: "grid",
        placeItems: "center",
        fontSize: 22,
        lineHeight: 1,
        willChange: "transform, opacity",
        filter: "drop-shadow(0 2px 8px rgba(250, 204, 21, 0.7))",
        userSelect: "none",
      }}
    >
      ⭐
    </div>
  );
}
