import React, { useEffect, useRef, useState } from "react";
import { useSignedUrl } from "./lib/storage.js";
import { juice } from "./lib/juice.js";
import { prefersReducedMotion } from "./lib/motion.js";

// OnboardingOverlay — single welcome moment per profile. Shows when
// currentPrefs.onboarded is falsy; the dismiss tap sets it true via
// the supplied onDismiss callback (which routes through setPref →
// user_prefs sync). Cinematic but calm — this is "welcome", not
// "celebration".

const ROLE_MESSAGES = {
  kid:         { sub: "This is your command center. Earn stars. Crush quests.", cue: "Tap to begin your adventure" },
  parent:      { sub: "Approvals, rewards, and everyone's day in one place.", cue: "Tap to continue" },
  grandparent: { sub: "Today's checklist + family notes, ready when you are.", cue: "Tap to continue" },
  helper:      { sub: "Today's checklist + handoff notes for the family.", cue: "Tap to continue" },
  guest:       { sub: "Quick checklist for today.", cue: "Tap to continue" },
};

export default function OnboardingOverlay({ user, onDismiss }) {
  const reduced = useRef(prefersReducedMotion()).current;
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const dismiss = () => {
    if (closing) return;
    setClosing(true);
    // Welcoming chime + medium haptic on the very first tap. This
    // moment also coincides with juice.unlock() from App.jsx's
    // global pointer listener, so the audio context lights up here
    // for the rest of the session.
    juice.haptic("medium");
    juice.sfx("streak");
    setTimeout(onDismiss, reduced ? 0 : 320);
  };

  const photoUrl = useSignedUrl(user?.photo);
  const hasPhoto = !!photoUrl;
  const msg = ROLE_MESSAGES[user?.role] || ROLE_MESSAGES.helper;
  const pieces = useRef(reduced ? [] : makeParticles(28));

  const showing = visible && !closing;

  return (
    <div
      role="dialog"
      aria-label="Welcome"
      onClick={dismiss}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10001,
        display: "grid",
        placeItems: "center",
        cursor: "pointer",
        background:
          "radial-gradient(circle at 50% 35%, rgba(99,102,241,0.55) 0%, rgba(15,23,42,0.88) 65%, rgba(15,23,42,0.96) 100%)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        opacity: showing ? 1 : 0,
        transition: `opacity ${reduced ? 0 : 320}ms ease-out`,
        overflow: "hidden",
        // Critical: once the dismiss animation starts, stop catching
        // taps so the kid's next tap goes through to the app underneath
        // instead of hitting the invisible overlay. Without this, the
        // 320ms fade-out window swallowed clicks.
        pointerEvents: closing ? "none" : "auto",
      }}
    >
      <style>{KEYFRAMES}</style>

      {/* Ambient cosmic particles drifting up behind everything */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {pieces.current.map((p, i) => (
          <span
            key={i}
            style={{
              position: "absolute",
              left: `${p.x}%`,
              bottom: "-10%",
              fontSize: p.size,
              color: p.color,
              opacity: 0.85,
              animation: `ob-rise ${p.dur}ms linear ${p.delay}ms infinite`,
              willChange: "transform, opacity",
              textShadow: "0 0 6px rgba(255,255,255,0.45)",
            }}
          >
            {p.glyph}
          </span>
        ))}
      </div>

      <div
        onClick={(e) => e.stopPropagation() || dismiss()}
        style={{
          position: "relative",
          textAlign: "center",
          color: "white",
          padding: "0 24px",
          maxWidth: "92vw",
        }}
      >
        {/* Avatar with pulse halo. Entry uses ob-fade (opacity 0 → 1,
            350ms) so the avatar reveals on mount; the slower ob-halo
            cycle adds a continuous glow afterward. Under reduced motion
            the halo holds still and only the fade runs. */}
        <div
          style={{
            margin: "0 auto",
            width: 132,
            height: 132,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            background:
              "radial-gradient(circle, rgba(251,191,36,0.35), rgba(99,102,241,0.15) 70%, transparent)",
            opacity: 0,
            animation: reduced
              ? "ob-fade 280ms ease-out forwards"
              : "ob-halo 2400ms ease-in-out 360ms infinite, ob-fade 350ms ease-out forwards",
          }}
        >
          {hasPhoto ? (
            <img
              src={photoUrl}
              alt=""
              style={{
                width: 108,
                height: 108,
                borderRadius: "50%",
                objectFit: "cover",
                border: "3px solid rgba(255,255,255,0.55)",
                boxShadow: "0 8px 30px rgba(0,0,0,0.45)",
              }}
            />
          ) : (
            <div
              style={{
                width: 108,
                height: 108,
                borderRadius: "50%",
                background: "linear-gradient(135deg,#6366f1,#a855f7 55%,#ec4899)",
                display: "grid",
                placeItems: "center",
                fontSize: 56,
                border: "3px solid rgba(255,255,255,0.55)",
                boxShadow: "0 8px 30px rgba(0,0,0,0.45)",
              }}
            >
              {user?.emoji || "🧑‍🚀"}
            </div>
          )}
        </div>

        {/* Greeting */}
        <div
          style={{
            marginTop: 22,
            fontSize: "clamp(28px, 8vw, 44px)",
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: "-0.01em",
            background: "linear-gradient(180deg, #fff 0%, #fde68a 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            opacity: 0,
            animation: reduced ? "ob-fade 250ms 80ms forwards" : "ob-rise-text 500ms ease-out 200ms both",
          }}
        >
          Hi, {user?.name || "friend"}!
        </div>

        <div
          style={{
            marginTop: 12,
            fontSize: "clamp(15px, 4.4vw, 19px)",
            color: "rgba(255,255,255,0.82)",
            fontWeight: 600,
            lineHeight: 1.35,
            opacity: 0,
            animation: reduced ? "ob-fade 250ms 160ms forwards" : "ob-rise-text 500ms ease-out 480ms both",
          }}
        >
          {msg.sub}
        </div>

        <div
          style={{
            marginTop: 36,
            fontSize: 13,
            color: "rgba(255,255,255,0.5)",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            opacity: 0,
            animation: reduced ? "ob-fade 250ms 240ms forwards" : "ob-rise-text 500ms ease-out 1100ms both",
          }}
        >
          {msg.cue}
        </div>
      </div>
    </div>
  );
}

function makeParticles(n) {
  const glyphs = ["✦", "✧", "·", "•", "✺"];
  const palette = [
    "rgba(255,255,255,0.95)",
    "rgba(253,224,71,0.95)",
    "rgba(167,243,208,0.85)",
    "rgba(196,181,253,0.85)",
  ];
  return Array.from({ length: n }, (_, i) => ({
    x: Math.random() * 100,
    delay: -Math.floor(Math.random() * 12000),
    dur: 9000 + Math.floor(Math.random() * 8000),
    size: 10 + Math.floor(Math.random() * 14),
    glyph: glyphs[i % glyphs.length],
    color: palette[i % palette.length],
  }));
}

const KEYFRAMES = `
@keyframes ob-fade {
  to { opacity: 1; transform: none; }
}
@keyframes ob-rise-text {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes ob-halo {
  0%, 100% { box-shadow: 0 0 0 0 rgba(251,191,36,0.30); transform: scale(1);    }
  50%      { box-shadow: 0 0 0 24px rgba(251,191,36,0); transform: scale(1.04); }
}
@keyframes ob-rise {
  0%   { transform: translate3d(0, 0,      0) scale(0.7) rotate(0deg);   opacity: 0; }
  10%  { opacity: 1; }
  50%  { transform: translate3d(6px, -120vh, 0) scale(1)   rotate(180deg); opacity: 1; }
  90%  { opacity: 0.5; }
  100% { transform: translate3d(-4px, -220vh, 0) scale(0.6) rotate(360deg); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  @keyframes ob-rise-text { to { opacity: 1; transform: none; } }
  @keyframes ob-halo      { 0%, 100% { transform: none; box-shadow: 0 0 0 6px rgba(251,191,36,0.25); } }
  @keyframes ob-rise      { 0%, 100% { opacity: 0; } }
}
`;
