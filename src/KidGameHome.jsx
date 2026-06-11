import React, { useEffect, useRef, useState } from "react";
import { Star, Flame, Trophy, Crown, Target, Sparkles, MapPin, Menu, Map } from "lucide-react";
import { useSignedUrl } from "./lib/storage.js";
import { starBurst } from "./lib/starBurst.js";
import { prefersReducedMotion } from "./lib/motion.js";

/* =====================================================================
   KidGameHome — Reznor's "game mode" home.
   Pure presentational component. Receives a prepared `data` blob from
   App.jsx and two callbacks. Mirrors how the grandparent "Easy Mode"
   is a swap-in alternate view; parent/grandma/helper untouched.
   ===================================================================== */

function Pct({ have, need }) {
  const v = need > 0 ? Math.min(100, Math.round((have / need) * 100)) : 0;
  return v;
}

function ProgressBar({ have, need, color = "#f59e0b" }) {
  const pct = Pct({ have, need });
  return (
    <div className="w-full h-2.5 bg-white/20 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

function Avatar({ avatar, size = 64 }) {
  const isDirectUrl = typeof avatar === "string" && /^(https?:|data:|blob:|\/)/.test(avatar);
  const isStoragePath = typeof avatar === "string" && !isDirectUrl && avatar.includes("/");
  const signed = useSignedUrl(isStoragePath ? avatar : null);
  const src = isDirectUrl ? avatar : (isStoragePath ? signed : null);
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className="rounded-2xl object-cover shrink-0 border-2 border-white/40"
        style={{ width: size, height: size }}
      />
    );
  }
  const display = isStoragePath ? "🧑‍🚀" : (avatar || "🧑‍🚀");
  return (
    <div
      className="rounded-2xl grid place-items-center shrink-0 border-2 border-white/40 bg-white/15 overflow-hidden"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.55) }}
    >
      {display}
    </div>
  );
}

// CosmicAura — ambient starfield + aurora gradient that sits behind the
// hero card's gradient background. Triggers from canonical-derived
// "today is special" state (streak milestone day, all-quests-done).
// Pure presentation — nothing about being "in cosmic mode" is stored.
// Rendered inside the hero card's existing `relative overflow-hidden`
// frame, so it auto-clips at the rounded corners and never bleeds
// into the layout above or below.
function CosmicAura({ intensity = 1 }) {
  // Particles generated once at mount with randomized motion params so
  // every render of the aura feels alive (no two cycles identical). The
  // count scales with `intensity` for future "victory + milestone same
  // day" double-up. Under reduced motion we skip particle generation
  // entirely — the @media keyframe override would hide them anyway,
  // but spawning 22+ DOM nodes that never animate is wasted layout.
  const reduced = useRef(prefersReducedMotion()).current;
  const particles = useRef(
    reduced ? [] : makeCosmicParticles(Math.round(22 * intensity))
  );
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
        borderRadius: "inherit",
      }}
    >
      {/* Aurora — two overlapping radial gradients that slowly drift in
          opposing directions. Reads as a moving light field behind the
          card's existing fixed gradient. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 25% 75%, rgba(167,139,250,0.38), transparent 55%), radial-gradient(circle at 75% 30%, rgba(56,189,248,0.30), transparent 55%)",
          animation: "kgh-aurora 14s ease-in-out infinite",
          mixBlendMode: "screen",
        }}
      />
      {/* Drifting stars rising slowly from below to above the card. */}
      {particles.current.map((p, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            bottom: "-12%",
            fontSize: p.size,
            opacity: p.opacity,
            color: p.color,
            animation: `kgh-cosmic-rise ${p.dur}ms linear ${p.delay}ms infinite`,
            willChange: "transform, opacity",
            textShadow: "0 0 6px rgba(255,255,255,0.5)",
          }}
        >
          {p.glyph}
        </span>
      ))}
    </div>
  );
}

function makeCosmicParticles(n) {
  const glyphs = ["✦", "✧", "·", "•", "✺"];
  const palette = ["rgba(255,255,255,0.95)", "rgba(253,224,71,0.95)", "rgba(167,243,208,0.85)", "rgba(196,181,253,0.85)"];
  return Array.from({ length: n }, (_, i) => ({
    x: Math.random() * 100,
    // Negative delay seeds the loop at a random phase so the field is
    // already in motion at mount — no synchronized "first wave".
    delay: -Math.floor(Math.random() * 10000),
    dur: 7000 + Math.floor(Math.random() * 8000),
    size: 8 + Math.floor(Math.random() * 14),
    opacity: 0.45 + Math.random() * 0.5,
    glyph: glyphs[i % glyphs.length],
    color: palette[i % palette.length],
  }));
}

// Tracks done → fires `justDone=true` for ~1.4s on the transition only.
// Lets a tile play a one-shot sparkle the moment its quest becomes done,
// without sparkling forever after. Pure transition detector — no state
// other than the boolean flag; the underlying `done` prop is still the
// canonical truth.
function useJustDone(done) {
  const prev = useRef(done);
  const [justDone, setJustDone] = useState(false);
  useEffect(() => {
    if (!prev.current && done) {
      setJustDone(true);
      const t = setTimeout(() => setJustDone(false), 1400);
      prev.current = done;
      return () => clearTimeout(t);
    }
    prev.current = done;
  }, [done]);
  return justDone;
}

function MainQuestTile({ q, onTap }) {
  const done = q.done;
  const tappable = !!onTap && !done;
  const justDone = useJustDone(done);
  return (
    <div
      onClick={tappable ? () => onTap(q.id) : undefined}
      role={tappable ? "button" : undefined}
      tabIndex={tappable ? 0 : undefined}
      className={`relative overflow-hidden rounded-3xl p-4 border-2 transition-all duration-200 ${
        done
          ? "bg-emerald-50 border-emerald-300"
          : "bg-white border-slate-200 shadow-sm " +
            (tappable
              ? "cursor-pointer active:scale-[0.97] hover:border-indigo-300 hover:shadow-md hover:-translate-y-0.5"
              : "")
      }`}
      style={
        justDone
          ? {
              boxShadow:
                "0 0 0 4px rgba(16,185,129,0.18), 0 10px 30px -8px rgba(16,185,129,0.45)",
              animation: "kgh-justdone 700ms ease-out 1",
            }
          : undefined
      }
    >
      {justDone && <JustDoneSparkles />}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className={`font-extrabold text-base ${done ? "text-emerald-700" : "text-slate-800"}`}>
            {q.title}
          </div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mt-0.5">
            {done ? "Complete" : "Quest"}
          </div>
        </div>
        <div
          className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${
            done ? "bg-emerald-200 text-emerald-800" : "bg-amber-100 text-amber-700"
          }`}
        >
          <Sparkles size={12} /> +{q.xp} XP
        </div>
      </div>
      {q.subtasks && q.subtasks.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {q.subtasks.map((s) => (
            <div
              key={s.id}
              className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
                s.done
                  ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                  : "bg-slate-50 text-slate-400 border-slate-200"
              }`}
            >
              {s.done ? "✓ " : "○ "}
              {s.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Tiny sparkle field rendered inside a tile that just transitioned done.
// 6 emojis fly outward from the center over ~1s, then fade. Absolute
// positioned inside the tile's `relative overflow-hidden`. Pointer-events
// none so the tile is still tappable through the sparkles (it isn't
// while done, but defensive).
function JustDoneSparkles() {
  const items = useRef(
    Array.from({ length: 6 }, (_, i) => ({
      angle: (i / 6) * Math.PI * 2 + Math.random() * 0.5,
      delay: i * 35,
      dist: 60 + Math.random() * 30,
      size: 14 + Math.random() * 10,
      emoji: ["✨", "⭐", "💫"][i % 3],
    }))
  );
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "visible",
      }}
    >
      {items.current.map((p, i) => {
        const dx = Math.cos(p.angle) * p.dist;
        const dy = Math.sin(p.angle) * p.dist - 10;
        return (
          <span
            key={i}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              fontSize: p.size,
              transform: "translate(-50%, -50%)",
              animation: `kgh-sparkle 1100ms cubic-bezier(.2,.7,.3,1) ${p.delay}ms forwards`,
              ["--kgh-dx"]: `${dx}px`,
              ["--kgh-dy"]: `${dy}px`,
              willChange: "transform, opacity",
              opacity: 0,
              filter: "drop-shadow(0 0 6px rgba(16,185,129,0.6))",
            }}
          >
            {p.emoji}
          </span>
        );
      })}
    </div>
  );
}

function SideQuestRow({ q, onTap }) {
  const tappable = !!onTap && !q.done;
  const justDone = useJustDone(q.done);
  return (
    <div
      onClick={tappable ? () => onTap(q.id) : undefined}
      role={tappable ? "button" : undefined}
      tabIndex={tappable ? 0 : undefined}
      className={`relative overflow-hidden flex items-center justify-between bg-white border border-slate-100 rounded-2xl px-3 py-2.5 transition-all duration-200 ${tappable ? "cursor-pointer active:scale-[0.98] hover:border-indigo-200 hover:shadow-sm" : ""}`}
      style={
        justDone
          ? {
              boxShadow: "0 0 0 3px rgba(16,185,129,0.15), 0 6px 18px -8px rgba(16,185,129,0.4)",
              animation: "kgh-justdone 700ms ease-out 1",
            }
          : undefined
      }
    >
      {justDone && <JustDoneSparkles />}
      <div className="flex items-center gap-2 min-w-0">
        <div
          className={`w-6 h-6 rounded-full grid place-items-center text-[11px] font-bold ${
            q.done ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
          }`}
        >
          {q.done ? "✓" : "+"}
        </div>
        <div className="text-sm font-semibold text-slate-700 truncate">{q.title}</div>
      </div>
      <div className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
        +{q.xp} XP
      </div>
    </div>
  );
}

function MapStop({ stop }) {
  const pct = Math.min(100, Math.round(stop.progress));
  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-10 h-10 rounded-2xl grid place-items-center shrink-0 ${
              stop.done ? "bg-emerald-100" : "bg-indigo-100"
            }`}
          >
            <span className="text-xl">{stop.icon}</span>
          </div>
          <div className="min-w-0">
            <div className="font-extrabold text-sm text-slate-800 truncate">{stop.title}</div>
            <div className="text-[11px] text-slate-400">{stop.description}</div>
          </div>
        </div>
        <div
          className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
            stop.done ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
          }`}
        >
          {stop.done ? "Unlocked" : `${pct}%`}
        </div>
      </div>
      <div className="mt-3 w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${stop.done ? "bg-emerald-500" : "bg-indigo-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// Counts smoothly from prev → current whenever `value` changes.
// Display-only; the canonical number lives in props.
function AnimatedNumber({ value, duration = 700 }) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);
  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    if (from === to) return;
    const start = performance.now();
    let raf = 0;
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(step);
      else prevRef.current = to;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return display;
}

// Lightweight "you completed a mission!" burst. Confetti emojis fall, a big
// star pulses out, and a "+N ⭐" rises and fades. Purely visual — no data.
// Triggered by parent `KidGameHome` when stars tick up. `id` keys the
// component so React re-mounts a fresh animation each time.
function MissionCelebration({ id, amount }) {
  if (!id) return null;
  const pieces = [];
  const palette = ["#f59e0b", "#ef4444", "#22c55e", "#6366f1", "#ec4899", "#0ea5e9"];
  const emojis = ["⭐", "✨", "🎉", "💫", "⚡"];
  for (let i = 0; i < 18; i++) {
    const dx = (Math.random() - 0.5) * 320;
    const left = 50 + (Math.random() - 0.5) * 24;
    const top = 38 + (Math.random() - 0.5) * 18;
    const dur = 900 + Math.random() * 700;
    const delay = i * 35;
    pieces.push(
      <span
        key={i}
        className="absolute text-2xl"
        style={{
          left: `${left}%`,
          top: `${top}%`,
          color: palette[i % palette.length],
          // CSS vars consumed by the keyframe below
          ["--dx"]: `${dx}px`,
          animation: `mcConfetti ${dur}ms ease-out ${delay}ms forwards`,
          willChange: "transform, opacity",
        }}
      >
        {emojis[i % emojis.length]}
      </span>
    );
  }
  return (
    <div
      key={id}
      className="fixed inset-0 z-30 flex items-center justify-center pointer-events-none"
      aria-hidden="true"
    >
      <style>{`
        @keyframes mcBurst {
          0%   { transform: scale(0.3); opacity: 0; }
          25%  { transform: scale(1.3); opacity: 1; }
          70%  { transform: scale(1.05); opacity: 0.9; }
          100% { transform: scale(1); opacity: 0; }
        }
        @keyframes mcRise {
          0%   { transform: translateY(0); opacity: 0; }
          15%  { opacity: 1; }
          100% { transform: translateY(-140px); opacity: 0; }
        }
        @keyframes mcConfetti {
          0%   { transform: translate(0, -10vh) rotate(0deg); opacity: 0; }
          12%  { opacity: 1; }
          100% { transform: translate(var(--dx), 55vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
      <div
        className="text-7xl drop-shadow-lg"
        style={{ animation: "mcBurst 900ms ease-out forwards" }}
      >
        ⭐
      </div>
      {amount > 0 && (
        <div
          className="absolute text-3xl font-extrabold text-amber-500"
          style={{
            animation: "mcRise 1100ms ease-out forwards",
            textShadow: "0 2px 10px rgba(0,0,0,0.25)",
          }}
        >
          +{amount} ⭐
        </div>
      )}
      {pieces}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">{label}</div>
      <div className="text-base font-extrabold text-slate-800 mt-0.5">{value}</div>
    </div>
  );
}

export default function KidGameHome({ data, onStartQuests, onOpenMenu, onTapQuest, onTapStars, onOpenBoard, onTapBadges, onTapHeroLevel }) {
  if (!data) return null;
  const {
    name,
    avatar,
    stars,
    streak,
    nextReward,
    mainQuests = [],
    sideQuests = [],
    stats = [],
    mapStops = [],
    level,
    nextBadge,
    treasureStreak = 0,
  } = data;

  // Fire the celebration when the canonical star total ticks up. We derive
  // "a mission was completed" from data, not a separate flag — keeps source
  // of truth in Supabase. The animation is purely visual.
  const [celebration, setCelebration] = useState(null);
  const prevStarsRef = useRef(stars);
  useEffect(() => {
    if (stars > prevStarsRef.current) {
      const gained = stars - prevStarsRef.current;
      setCelebration({ id: Date.now(), amount: gained });
      const t = setTimeout(() => setCelebration(null), 1700);
      prevStarsRef.current = stars;
      return () => clearTimeout(t);
    }
    prevStarsRef.current = stars;
  }, [stars]);

  // Bank-pop on burst arrival. The starBurst dispatcher fires `landed`
  // after the longest in-flight star reaches the destination. When that
  // happens we imperatively restart a CSS animation on the bank number
  // — animating via a ref + force-reflow so the AnimatedNumber tween
  // underneath isn't disrupted (a key-based remount would jump it).
  const bankRef = useRef(null);
  useEffect(() => {
    return starBurst.onLanded(() => {
      const el = bankRef.current;
      if (!el) return;
      el.style.animation = "none";
      // Force reflow so the next assignment counts as a state change.
      void el.offsetWidth;
      el.style.animation = "kgh-bank-pop 600ms ease-out";
    });
  }, []);

  const firstUndone = mainQuests.find((q) => !q.done);
  // For the "Up next" widget: pick a required quest if any remain, else
  // the first un-done extra so the suggestion never goes blank while
  // there's still anything to do. Hidden entirely once everything's done.
  const upNext = firstUndone || sideQuests.find((q) => !q.done);
  const upNextIsRequired = !!firstUndone;

  // "Today is special" — derived ambient state. Two independent
  // triggers; either lights up the cosmic aura behind the hero card.
  // ARCHITECTURE §3: both are pure derivations from canonical data,
  // nothing stored about being "in cosmic mode".
  const allMainDone = mainQuests.length > 0 && mainQuests.every((q) => q.done);
  const streakMilestone = !!(streak?.current && streak.current >= 30 && streak.current % 30 === 0);
  const cosmicActive = allMainDone || streakMilestone;
  const cosmicIntensity = allMainDone && streakMilestone ? 1.6 : 1;

  return (
    <div className="px-4 pt-4 pb-6 space-y-4">
      {/* Local keyframes for the quest tile / Up Next micro-juice. Scoped
          to this screen — `kgh-*` prefix avoids collision with the
          existing rocket animations in BoardGame.jsx and the level-up
          overlay's `lu-*` rules. */}
      <style>{`
        @keyframes kgh-justdone {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.02); }
          100% { transform: scale(1); }
        }
        @keyframes kgh-sparkle {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.4); }
          25%  { opacity: 1; transform: translate(calc(-50% + var(--kgh-dx) * 0.3), calc(-50% + var(--kgh-dy) * 0.3)) scale(1.1); }
          80%  { opacity: 1; transform: translate(calc(-50% + var(--kgh-dx) * 0.95), calc(-50% + var(--kgh-dy) * 0.95)) scale(0.85); }
          100% { opacity: 0; transform: translate(calc(-50% + var(--kgh-dx)), calc(-50% + var(--kgh-dy))) scale(0.5); }
        }
        @keyframes kgh-breathe {
          0%, 100% { box-shadow: 0 4px 12px -4px rgba(16,185,129,0.25); }
          50%      { box-shadow: 0 8px 28px -6px rgba(16,185,129,0.55), 0 0 0 4px rgba(16,185,129,0.10); }
        }
        /* Streak fire — flame flicker + sway + heat-glow pulse. The
           flame combines two independent keyframes at coprime durations
           (1.1s + 1.7s) so the motion never visibly loops. */
        @keyframes kgh-flame-flicker {
          0%, 100% { transform: scaleY(1)    scaleX(1)    skewX(0deg);   filter: brightness(1); }
          22%      { transform: scaleY(1.12) scaleX(0.94) skewX(-1.5deg); filter: brightness(1.15); }
          48%      { transform: scaleY(0.92) scaleX(1.06) skewX(1deg);   filter: brightness(0.92); }
          70%      { transform: scaleY(1.08) scaleX(0.97) skewX(-0.5deg); filter: brightness(1.1); }
        }
        @keyframes kgh-flame-sway {
          0%, 100% { transform: rotate(0deg);  }
          33%      { transform: rotate(-3deg); }
          66%      { transform: rotate(3deg);  }
        }
        @keyframes kgh-heat {
          0%, 100% { opacity: 0.7; transform: translateY(0)    scale(1);    }
          50%      { opacity: 1;   transform: translateY(-2px) scale(1.05); }
        }
        /* Cosmic ambient — slow rising stars + drifting aurora that
           activate on streak milestone days or after a daily clear. */
        @keyframes kgh-cosmic-rise {
          0%   { transform: translate3d(0, 0, 0)        scale(0.7) rotate(0deg);   opacity: 0; }
          10%  { opacity: 1; }
          50%  { transform: translate3d(8px, -110%, 0)  scale(1)   rotate(180deg); opacity: 1; }
          90%  { opacity: 0.6; }
          100% { transform: translate3d(-6px, -220%, 0) scale(0.6) rotate(360deg); opacity: 0; }
        }
        @keyframes kgh-aurora {
          0%, 100% { transform: translate(0, 0)    scale(1);    opacity: 0.7; }
          33%      { transform: translate(8%, -4%) scale(1.10); opacity: 1;   }
          66%      { transform: translate(-6%, 3%) scale(1.05); opacity: 0.85;}
        }
        /* Bank-pop — the Stars count's overshoot bounce when a starBurst
           lands. Brief yellow flash + scale-up + tiny shake. Tuned to
           ~600ms so two back-to-back approvals stay distinct. */
        @keyframes kgh-bank-pop {
          0%   { transform: scale(1);    color: inherit;          text-shadow: none; }
          25%  { transform: scale(1.28); color: #fde047;
                 text-shadow: 0 0 14px rgba(253,224,71,0.85), 0 0 28px rgba(251,191,36,0.6); }
          55%  { transform: scale(0.96); color: #fef3c7;
                 text-shadow: 0 0 10px rgba(253,224,71,0.5); }
          80%  { transform: scale(1.06); color: inherit;          text-shadow: 0 0 6px rgba(253,224,71,0.3); }
          100% { transform: scale(1);    color: inherit;          text-shadow: none; }
        }

        /* Reduced-motion: replace each kgh-* keyframe with a motionless
           version so anything still referencing the animation name gets
           a calm fallback. Sounds + haptics are unaffected — only
           visible motion is dialed back. Cosmic particles stay hidden;
           the flame and aurora stay still; the bank-pop becomes a
           brief color flash without scale. */
        @media (prefers-reduced-motion: reduce) {
          @keyframes kgh-justdone     { 0%, 100% { transform: none; } }
          @keyframes kgh-sparkle      { 0% { opacity: 0; } 30%, 100% { opacity: 1; transform: translate(-50%, -50%); } }
          @keyframes kgh-breathe      { 0%, 100% { box-shadow: 0 4px 12px -4px rgba(16,185,129,0.25); } }
          @keyframes kgh-flame-flicker{ 0%, 100% { transform: none; filter: none; } }
          @keyframes kgh-flame-sway   { 0%, 100% { transform: none; } }
          @keyframes kgh-heat         { 0%, 100% { opacity: 0.85; transform: none; } }
          @keyframes kgh-bank-pop {
            0%   { color: inherit; }
            30%  { color: #fde047; text-shadow: 0 0 10px rgba(253,224,71,0.6); }
            100% { color: inherit; text-shadow: none; }
          }
          @keyframes kgh-cosmic-rise  { 0%, 100% { opacity: 0; } }
          @keyframes kgh-aurora       { 0%, 100% { transform: none; opacity: 0.7; } }
        }
      `}</style>

      {/* DAILY ADVENTURE BOARD — TOP OF THE STACK. Reznor's stated
          pick: he wants to see and tap into the board first thing,
          above the hero card. Most prominent thing on the home. */}
      {onOpenBoard && (
        <button
          type="button"
          onClick={onOpenBoard}
          className="w-full rounded-3xl p-4 flex items-center gap-3 active:scale-[0.98] transition relative overflow-hidden border-2 border-white/15 shadow-xl"
          style={{
            background: "linear-gradient(135deg, #1e293b 0%, #4338ca 35%, #7c3aed 70%, #ec4899 100%)",
          }}
        >
          {/* sprinkle of stars baked into the gradient */}
          <span aria-hidden="true" className="absolute pointer-events-none" style={{ left: "18%", top: "22%", color: "rgba(255,255,255,0.5)", fontSize: 12 }}>✦</span>
          <span aria-hidden="true" className="absolute pointer-events-none" style={{ left: "44%", top: "68%", color: "rgba(255,255,255,0.4)", fontSize: 10 }}>✦</span>
          <span aria-hidden="true" className="absolute pointer-events-none" style={{ left: "72%", top: "30%", color: "rgba(255,255,255,0.5)", fontSize: 12 }}>✦</span>
          <span aria-hidden="true" className="absolute pointer-events-none" style={{ left: "86%", top: "60%", color: "rgba(255,255,255,0.35)", fontSize: 9 }}>✦</span>
          <div className="w-14 h-14 rounded-2xl bg-white/15 grid place-items-center backdrop-blur border border-white/25 shrink-0 relative z-10">
            <span className="text-3xl">🚀</span>
          </div>
          <div className="flex-1 text-left relative z-10 min-w-0">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/80 font-bold">Today's Quest</div>
            <div className="text-lg font-extrabold text-white tracking-tight leading-tight mt-0.5">
              Daily Adventure Board
            </div>
            <div className="text-[11px] text-white/80 mt-0.5 truncate">
              Tap to play through today's missions →
            </div>
          </div>
          <Map size={22} className="text-white/80 relative z-10 shrink-0" />
        </button>
      )}

      {/* HERO: avatar + stars + streak */}
      <div
        className="rounded-3xl p-5 text-white relative overflow-hidden"
        style={{ background: "linear-gradient(135deg,#6366f1,#a855f7 55%,#ec4899)" }}
      >
        {/* Cosmic ambient — only mounts when today is special. Sits
            between the gradient bg and the content; clipped by the
            card's `overflow-hidden` to the rounded corners. */}
        {cosmicActive && <CosmicAura intensity={cosmicIntensity} />}
        <Sparkles className="absolute -right-4 -top-4 opacity-20" size={120} />
        <div className="flex items-center gap-3">
          <Avatar avatar={avatar} size={64} />
          <div className="min-w-0 flex-1">
            <div className="text-[11px] uppercase tracking-widest text-white/70 font-bold">Hero</div>
            <div className="text-2xl font-extrabold tracking-tight leading-tight truncate">
              {name}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {(() => {
            const tappable = !!onTapStars;
            const inner = (
              <>
                <div className="text-[10px] uppercase tracking-wider text-white/70 font-bold flex items-center justify-between gap-1">
                  <span className="flex items-center gap-1">
                    <Star size={11} className="fill-current text-amber-300" /> Stars
                  </span>
                  {tappable && <span className="text-white/40 text-[10px]">›</span>}
                </div>
                <div ref={bankRef} data-star-bank className="text-2xl font-extrabold leading-none mt-1" style={{ display: "inline-block", transformOrigin: "left center" }}><AnimatedNumber value={stars} /></div>
              </>
            );
            return tappable ? (
              <button
                type="button"
                onClick={onTapStars}
                className="bg-white/15 backdrop-blur rounded-2xl px-3 py-2 border border-white/10 text-left active:scale-[0.97] transition hover:bg-white/25"
                title="See where these stars came from"
              >
                {inner}
              </button>
            ) : (
              <div className="bg-white/15 backdrop-blur rounded-2xl px-3 py-2 border border-white/10">{inner}</div>
            );
          })()}
          <div className="bg-white/15 backdrop-blur rounded-2xl px-3 py-2 border border-white/10 relative overflow-hidden">
            {/* Heat glow — radial orange aura behind the number that
                pulses subtly. Pointer-events none so the chip stays
                inert (it's not tappable). */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "radial-gradient(circle at 22% 62%, rgba(251,146,60,0.45), rgba(239,68,68,0.18) 35%, transparent 65%)",
                animation: "kgh-heat 2200ms ease-in-out infinite",
                pointerEvents: "none",
              }}
            />
            <div className="relative text-[10px] uppercase tracking-wider text-white/70 font-bold flex items-center gap-1">
              <Flame size={11} className="text-orange-300" /> Drum streak
            </div>
            <div className="relative text-2xl font-extrabold leading-none mt-1 flex items-baseline gap-1">
              <span
                aria-hidden
                style={{
                  // Outer span owns the sway (rotate). Inner owns the
                  // flicker (scale/skew). CSS animations don't compose
                  // transforms, so we split across two elements to get
                  // independent motion at coprime durations — reads as
                  // an organic flame instead of a strobe.
                  display: "inline-block",
                  transformOrigin: "50% 80%",
                  animation: "kgh-flame-sway 1700ms ease-in-out infinite",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    fontSize: "1em",
                    lineHeight: 1,
                    transformOrigin: "50% 70%",
                    animation: "kgh-flame-flicker 1100ms ease-in-out infinite",
                    filter:
                      "drop-shadow(0 0 4px rgba(251,146,60,0.85)) drop-shadow(0 0 10px rgba(239,68,68,0.5))",
                  }}
                >
                  🔥
                </span>
              </span>
              <span
                style={{
                  textShadow:
                    "0 0 8px rgba(251,146,60,0.55), 0 0 16px rgba(239,68,68,0.35)",
                }}
              >
                <AnimatedNumber value={streak?.current ?? 0} />
              </span>
              <span className="text-xs font-bold text-white/60">/ {streak?.milestone ?? 365}</span>
            </div>
            <div className="relative mt-1.5">
              <ProgressBar have={streak?.current ?? 0} need={streak?.milestone ?? 365} color="#fb923c" />
            </div>
          </div>
        </div>

        {level && (
          // Tappable when onTapHeroLevel is wired — replays the level-up
          // cinematic so the kid can re-experience it after the parent
          // approved the qualifying completion on their own screen.
          onTapHeroLevel ? (
            <button
              type="button"
              onClick={onTapHeroLevel}
              className="w-full text-left mt-3 bg-white/15 backdrop-blur rounded-2xl px-3 py-2.5 border border-white/10 active:scale-[0.99] transition"
              aria-label={`Replay level ${level.value} celebration`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-white/70 font-bold">
                  <Crown size={12} className="text-amber-300" /> Hero level
                </div>
                <div className="text-[11px] font-bold text-white/90">
                  {level.xpIntoLevel} / {level.xpToNext} XP
                </div>
              </div>
              <div className="text-sm font-extrabold mt-0.5">
                Lv {level.value} · {level.title}
              </div>
              <div className="mt-1.5">
                <ProgressBar have={level.xpIntoLevel} need={level.xpToNext} color="#fcd34d" />
              </div>
              <div className="mt-1 text-[10px] text-white/60 font-bold uppercase tracking-wider">
                Tap to replay 🎉
              </div>
            </button>
          ) : (
            <div className="mt-3 bg-white/15 backdrop-blur rounded-2xl px-3 py-2.5 border border-white/10">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-white/70 font-bold">
                  <Crown size={12} className="text-amber-300" /> Hero level
                </div>
                <div className="text-[11px] font-bold text-white/90">
                  {level.xpIntoLevel} / {level.xpToNext} XP
                </div>
              </div>
              <div className="text-sm font-extrabold mt-0.5">
                Lv {level.value} · {level.title}
              </div>
              <div className="mt-1.5">
                <ProgressBar have={level.xpIntoLevel} need={level.xpToNext} color="#fcd34d" />
              </div>
            </div>
          )
        )}

        {/* Treasure-day streak — celebrates consecutive days where
            Reznor opened the daily treasure (= cleared his Top 8).
            Renders inside the hero card alongside Hero Level / Next
            Reward so the kid sees the long-term flame right where
            the daily stats live. */}
        {treasureStreak > 0 && (
          <div className="mt-3 bg-white/15 backdrop-blur rounded-2xl px-3 py-2.5 border border-white/10">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-white/70 font-bold">
                <Trophy size={12} className="text-amber-300" /> Treasure streak
              </div>
              <div className="text-[11px] font-bold text-white/90 tabular-nums">
                {treasureStreak} day{treasureStreak === 1 ? "" : "s"}
              </div>
            </div>
            <div className="text-sm font-extrabold mt-0.5">
              🗝️ {treasureStreak === 1
                ? "1 day in a row"
                : `${treasureStreak} days in a row opening the chest`}
            </div>
            {treasureStreak >= 3 && (
              <div className="mt-0.5 text-[11px] text-amber-200 font-bold">
                {treasureStreak >= 30 ? "👑 Treasure King!" :
                 treasureStreak >= 14 ? "💎 Treasure Fortnight unlocked!" :
                 treasureStreak >= 7 ? "🏆 Week of Treasures!" :
                 "🗝️ Treasure Trio unlocked!"}
              </div>
            )}
          </div>
        )}

        {nextReward && (
          <div className="mt-3 bg-white/15 backdrop-blur rounded-2xl px-3 py-2.5 border border-white/10">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-white/70 font-bold">
                <Trophy size={12} className="text-amber-300" /> Next reward
              </div>
              <div className="text-[11px] font-bold text-white/90">
                {nextReward.have} / {nextReward.cost} ⭐
              </div>
            </div>
            <div className="text-sm font-extrabold mt-0.5">{nextReward.title}</div>
            <div className="mt-1.5">
              <ProgressBar have={nextReward.have} need={nextReward.cost} color="#fde047" />
            </div>
          </div>
        )}
      </div>

      {/* Cream "Almost There · 1 Year of Drums" next-badge card REMOVED.
          It was showing the exact same 312/365 stat as the orange "A Year
          of Drums" card below, plus the streak chip in the hero — three
          places, one fact. Single source kept: orange card lower in the
          stack. The onTapBadges prop is still passed for future use
          (badges screen) but no longer fires from here.

          Orange "A Year of Drums" card moved BELOW Up Next per the new
          layout: Board → Hero → Up Next → Drums streak → Today's Quests. */}

      {/* UP NEXT — single-tap "what to do right now" card. Derived from
          the canonical todaysTasks via the mainQuests/sideQuests already
          on kidData. Tap → opens the same TaskSheet a tile would. Hidden
          when everything is done; the bottom CTA shows the celebration. */}
      {upNext && (
        <button
          type="button"
          onClick={() => onTapQuest?.(upNext.id)}
          className="w-full rounded-3xl p-3.5 flex items-center gap-3 active:scale-[0.98] transition border-2 border-emerald-200 hover:-translate-y-0.5 hover:shadow-lg"
          style={{
            background: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 60%, #ccfbf1 100%)",
            // Gentle breathing glow draws the eye without thrashing. ~2.6s
            // cycle reads as "alive", not "urgent".
            animation: "kgh-breathe 2600ms ease-in-out infinite",
          }}
        >
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 grid place-items-center shrink-0">
            <Target size={26} className="text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="text-[10px] uppercase tracking-widest text-emerald-700 font-bold">
              Up next {upNextIsRequired ? "" : "· extra"}
            </div>
            <div className="text-base font-extrabold text-slate-800 truncate leading-tight">
              {upNext.title}
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
              <Sparkles size={11} className="text-amber-500" />
              +{upNext.xp} XP
              {upNext.subtasks && upNext.subtasks.length > 0 && (
                <>
                  <span className="text-slate-300">·</span>
                  <span>
                    {upNext.subtasks.filter((s) => s.done).length} / {upNext.subtasks.length} parts
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="text-2xl text-emerald-600 shrink-0">▶</div>
        </button>
      )}

      {/* A YEAR OF DRUMS — the single dedicated streak card. Sits between
          Up Next and Today's Quests so it reads as a daily motivator
          right where the kid's eye is heading to start work. */}
      {streak && (
        <div
          className="rounded-3xl p-4 text-white relative overflow-hidden border-2 border-orange-500/30"
          style={{
            background:
              "linear-gradient(135deg,#7f1d1d 0%, #c2410c 35%, #ea580c 65%, #facc15 100%)",
            boxShadow: "0 12px 30px -10px rgba(249, 115, 22, 0.55)",
          }}
        >
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(circle at 20% 70%, rgba(254,243,199,0.35), transparent 55%), radial-gradient(circle at 80% 30%, rgba(239,68,68,0.30), transparent 55%)",
              animation: "kgh-heat 2400ms ease-in-out infinite",
              pointerEvents: "none",
            }}
          />
          <div className="flex items-center gap-3 relative">
            <div
              aria-hidden
              className="shrink-0 w-16 h-16 rounded-2xl bg-white/10 backdrop-blur grid place-items-center text-5xl"
              style={{
                transformOrigin: "50% 80%",
                animation: "kgh-flame-sway 1700ms ease-in-out infinite",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  transformOrigin: "50% 70%",
                  animation: "kgh-flame-flicker 1100ms ease-in-out infinite",
                  filter:
                    "drop-shadow(0 0 8px rgba(251,146,60,0.85)) drop-shadow(0 0 18px rgba(239,68,68,0.6))",
                }}
              >
                🔥
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/80 font-bold flex items-center gap-1.5">
                <Flame size={11} className="text-amber-200" />
                A Year of Drums
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span
                  className="text-4xl font-extrabold leading-none"
                  style={{
                    textShadow:
                      "0 0 10px rgba(253,224,71,0.65), 0 0 22px rgba(251,146,60,0.5)",
                  }}
                >
                  <AnimatedNumber value={streak?.current ?? 0} />
                </span>
                <span className="text-base font-bold text-white/80 leading-none">
                  / {streak?.milestone ?? 365}
                </span>
              </div>
              <div className="mt-2">
                <ProgressBar
                  have={streak?.current ?? 0}
                  need={streak?.milestone ?? 365}
                  color="#fde047"
                />
              </div>
              <div className="text-[11px] text-white/85 font-semibold mt-1.5">
                {(streak?.current ?? 0) >= (streak?.milestone ?? 365)
                  ? "🏆 You did it!"
                  : `Don't break the chain · ${Math.max(0, (streak?.milestone ?? 365) - (streak?.current ?? 0))} days to go`}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN QUESTS */}
      <div>
        <div className="flex items-center justify-between px-1 mb-2">
          <div className="flex items-center gap-2 font-extrabold text-slate-800 text-base">
            <Target size={16} className="text-indigo-500" /> Today's Quests
          </div>
          <div className="text-[11px] font-bold text-slate-400">
            {mainQuests.filter((q) => q.done).length} / {mainQuests.length}
          </div>
        </div>
        <div className="space-y-2">
          {mainQuests.length === 0 ? (
            <div className="text-center text-sm text-slate-400 py-6 bg-white rounded-2xl border border-slate-100">
              No quests today. Free day! 🎉
            </div>
          ) : (
            mainQuests.map((q) => <MainQuestTile key={q.id} q={q} onTap={onTapQuest} />)
          )}
        </div>
      </div>

      {/* SIDE QUESTS */}
      {sideQuests.length > 0 && (
        <div>
          <div className="flex items-center gap-2 font-extrabold text-slate-800 text-base px-1 mb-2">
            <Sparkles size={16} className="text-amber-500" /> Side Quests
            <span className="text-[11px] font-bold text-slate-400">(extra XP)</span>
          </div>
          <div className="space-y-1.5">
            {sideQuests.map((q) => (
              <SideQuestRow key={q.id} q={q} onTap={onTapQuest} />
            ))}
          </div>
        </div>
      )}

      {/* WORLD MAP */}
      {mapStops.length > 0 && (
        <div>
          <div className="flex items-center gap-2 font-extrabold text-slate-800 text-base px-1 mb-2">
            <MapPin size={16} className="text-rose-500" /> World Map
          </div>
          <div className="space-y-2">
            {mapStops.map((s) => (
              <MapStop key={s.id} stop={s} />
            ))}
          </div>
        </div>
      )}

      {/* STATS */}
      {stats.length > 0 && (
        <div>
          <div className="flex items-center gap-2 font-extrabold text-slate-800 text-base px-1 mb-2">
            <Crown size={16} className="text-violet-500" /> Stats
          </div>
          <div className="grid grid-cols-2 gap-2">
            {stats.map((s, i) => (
              <StatCard key={i} label={s.label} value={s.value} />
            ))}
          </div>
        </div>
      )}

      {/* CTAs */}
      <div className="grid grid-cols-[1fr_auto] gap-2 pt-1">
        <button
          onClick={onStartQuests}
          disabled={!firstUndone}
          className={`rounded-3xl py-4 font-extrabold text-white text-base shadow-lg transition active:scale-95 ${
            firstUndone
              ? "bg-gradient-to-r from-indigo-500 to-violet-600"
              : "bg-slate-300 text-slate-500"
          }`}
        >
          {firstUndone ? `▶ Start Quest: ${firstUndone.title}` : "All quests done! 🎉"}
        </button>
        <button
          onClick={onOpenMenu}
          className="rounded-3xl px-4 bg-white border border-slate-200 grid place-items-center active:scale-95"
          title="Menu"
        >
          <Menu size={20} className="text-slate-600" />
        </button>
      </div>

      {/* Visual-only celebration when stars tick up. Mounted last so it
          paints over the rest of the screen; pointer-events:none keeps it
          from blocking taps. */}
      {celebration && <MissionCelebration id={celebration.id} amount={celebration.amount} />}
    </div>
  );
}
