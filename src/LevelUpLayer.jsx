import React, { useEffect, useRef, useState } from "react";
import { levelUp } from "./lib/levelUp.js";
import { prefersReducedMotion } from "./lib/motion.js";

// LevelUpLayer — full-screen cinematic takeover for hero level-ups.
// Subscribes to the levelUp dispatcher; when an event arrives, renders
// a backdrop + animated banner + confetti + auto-dismiss timer. Tap
// anywhere to dismiss early. Only one takeover at a time — back-to-back
// level-ups (rare; would need ≥150 stars in one approval) replace the
// previous one. Lives once in App.jsx alongside StarBurstLayer.

const AUTO_DISMISS_MS = 4200;

export default function LevelUpLayer() {
  const [event, setEvent] = useState(null);
  const dismissRef = useRef(null);

  useEffect(() => {
    return levelUp.subscribe((ev) => {
      setEvent(ev);
      clearTimeout(dismissRef.current);
      dismissRef.current = setTimeout(() => setEvent(null), AUTO_DISMISS_MS);
    });
  }, []);

  useEffect(() => () => clearTimeout(dismissRef.current), []);

  if (!event) return null;
  return (
    <Takeover
      key={event.key}
      level={event.level}
      prevLevel={event.prevLevel}
      title={event.title}
      onDismiss={() => {
        clearTimeout(dismissRef.current);
        setEvent(null);
      }}
    />
  );
}

function Takeover({ level, prevLevel, title, onDismiss }) {
  // Confetti pieces are spawned once at mount; each falls + rotates with
  // its own randomized timing so the field doesn't pulse together.
  // Under reduced motion we skip them entirely — the cinematic lands on
  // the banner cascade alone, no falling debris, no spinning sunburst.
  const reduced = useRef(prefersReducedMotion()).current;
  const pieces = useRef(reduced ? [] : makePieces(36));
  return (
    <div
      onClick={onDismiss}
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "grid",
        placeItems: "center",
        cursor: "pointer",
        animation: "lu-fade-in 220ms ease-out both",
        background:
          "radial-gradient(circle at 50% 40%, rgba(99,102,241,0.55) 0%, rgba(15,23,42,0.85) 70%, rgba(15,23,42,0.95) 100%)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        overflow: "hidden",
      }}
    >
      <style>{KEYFRAMES}</style>

      {/* Confetti / sparkles layer — behind the banner */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {pieces.current.map((p, i) => (
          <span
            key={i}
            style={{
              position: "absolute",
              left: `${p.x}%`,
              top: `-10%`,
              fontSize: p.size,
              animation: `lu-fall ${p.dur}ms cubic-bezier(.3,.7,.4,1) ${p.delay}ms forwards`,
              willChange: "transform, opacity",
              textShadow: "0 0 8px rgba(255,255,255,0.4)",
              filter: `hue-rotate(${p.hue}deg)`,
            }}
          >
            {p.emoji}
          </span>
        ))}
      </div>

      {/* Sunburst rays — skipped under reduced motion (the spin would
          dominate the kid's field of view and there's no calm
          alternative that still reads as rays). */}
      {!reduced && (
        <div
          style={{
            position: "absolute",
            width: "180vmin",
            height: "180vmin",
            left: "50%",
            top: "50%",
            marginLeft: "-90vmin",
            marginTop: "-90vmin",
            background:
              "conic-gradient(from 0deg, transparent 0deg, rgba(255,255,255,0.10) 8deg, transparent 16deg, transparent 30deg, rgba(255,255,255,0.10) 38deg, transparent 46deg, transparent 60deg, rgba(255,255,255,0.10) 68deg, transparent 76deg, transparent 90deg, rgba(255,255,255,0.10) 98deg, transparent 106deg, transparent 120deg, rgba(255,255,255,0.10) 128deg, transparent 136deg, transparent 150deg, rgba(255,255,255,0.10) 158deg, transparent 166deg, transparent 180deg, rgba(255,255,255,0.10) 188deg, transparent 196deg, transparent 210deg, rgba(255,255,255,0.10) 218deg, transparent 226deg, transparent 240deg, rgba(255,255,255,0.10) 248deg, transparent 256deg, transparent 270deg, rgba(255,255,255,0.10) 278deg, transparent 286deg, transparent 300deg, rgba(255,255,255,0.10) 308deg, transparent 316deg, transparent 330deg, rgba(255,255,255,0.10) 338deg, transparent 346deg, transparent 360deg)",
            animation: "lu-spin 18s linear infinite",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Banner */}
      <div
        style={{
          position: "relative",
          textAlign: "center",
          color: "white",
          padding: "0 24px",
          maxWidth: "90vw",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            fontSize: 14,
            letterSpacing: "0.4em",
            fontWeight: 800,
            color: "#fbbf24",
            opacity: 0,
            animation: "lu-rise 500ms ease-out 80ms both",
            marginBottom: 8,
          }}
        >
          {prevLevel ? `LV ${prevLevel} → LV ${level}` : `LV ${level}`}
        </div>

        <div
          style={{
            fontSize: "clamp(48px, 14vw, 88px)",
            fontWeight: 900,
            lineHeight: 0.95,
            letterSpacing: "-0.02em",
            background: "linear-gradient(180deg, #fff 0%, #fbbf24 60%, #f97316 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            textShadow: "0 8px 30px rgba(251, 191, 36, 0.5)",
            opacity: 0,
            animation: "lu-pop 600ms cubic-bezier(.34,1.56,.64,1) 200ms both",
            filter: "drop-shadow(0 4px 20px rgba(251,191,36,0.6))",
          }}
        >
          LEVEL UP!
        </div>

        <div
          style={{
            marginTop: 18,
            fontSize: "clamp(22px, 6vw, 34px)",
            fontWeight: 800,
            color: "white",
            opacity: 0,
            animation: "lu-rise 500ms ease-out 520ms both",
          }}
        >
          {title || `Level ${level}`}
        </div>

        <div
          style={{
            marginTop: 6,
            fontSize: 13,
            color: "rgba(255,255,255,0.65)",
            opacity: 0,
            animation: "lu-rise 500ms ease-out 700ms both",
            letterSpacing: "0.08em",
          }}
        >
          NEW TITLE UNLOCKED
        </div>

        <div
          style={{
            marginTop: 28,
            fontSize: 12,
            color: "rgba(255,255,255,0.45)",
            letterSpacing: "0.15em",
            opacity: 0,
            animation: "lu-rise 500ms ease-out 1400ms both",
          }}
        >
          TAP TO DISMISS
        </div>
      </div>

      {/* Big shadow star behind the banner */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          fontSize: "min(60vmin, 360px)",
          color: "rgba(251, 191, 36, 0.10)",
          pointerEvents: "none",
          animation: "lu-pulse 2.4s ease-in-out infinite",
          textShadow: "0 0 80px rgba(251,191,36,0.3)",
        }}
      >
        ⭐
      </div>
    </div>
  );
}

function makePieces(n) {
  const emojis = ["⭐", "✨", "🎉", "💫", "⚡", "🌟"];
  const pieces = [];
  for (let i = 0; i < n; i++) {
    pieces.push({
      x: Math.random() * 100,
      size: 16 + Math.random() * 28,
      emoji: emojis[i % emojis.length],
      delay: Math.random() * 600,
      dur: 1800 + Math.random() * 1600,
      hue: Math.floor(Math.random() * 360),
    });
  }
  return pieces;
}

const KEYFRAMES = `
@keyframes lu-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes lu-pop {
  0%   { transform: scale(0.4) translateY(20px); opacity: 0; }
  60%  { transform: scale(1.15) translateY(0);   opacity: 1; }
  100% { transform: scale(1)   translateY(0);    opacity: 1; }
}
@keyframes lu-rise {
  from { transform: translateY(14px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
@keyframes lu-fall {
  0%   { transform: translateY(0)        rotate(0deg)   scale(0.6); opacity: 0; }
  10%  { opacity: 1; }
  100% { transform: translateY(120vh) rotate(720deg) scale(1);     opacity: 1; }
}
@keyframes lu-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes lu-pulse {
  0%, 100% { transform: scale(1)   rotate(-6deg); }
  50%      { transform: scale(1.1) rotate(6deg);  }
}
@media (prefers-reduced-motion: reduce) {
  @keyframes lu-pop   { 0% { opacity: 0; } 100% { opacity: 1; transform: none; } }
  @keyframes lu-rise  { 0% { opacity: 0; } 100% { opacity: 1; transform: none; } }
  @keyframes lu-fall  { 0%, 100% { opacity: 0; } }
  @keyframes lu-spin  { 0%, 100% { transform: none; } }
  @keyframes lu-pulse { 0%, 100% { transform: none; } }
}
`;
