import React, { useEffect, useMemo, useRef, useState } from "react";
import { juice } from "./lib/juice.js";

/* =====================================================================
   BoardGame — Daily Adventure Board, Phase 2.5 (pre-themes).

   ARCHITECTURE-clean. The path is derived purely from canonical data:
     - Approved completions for TODAY, sorted by creation timestamp
       (id = "cmp_" + Date.now() lexicographically sorts as time), drive
       the order of "completed" spaces along the path.
     - Un-approved today's tasks fill the rest of the path (required
       first, then extras, original order within each).
     - The rocket's destination is the last completed space; the rocket
       lives at START until the first approval lands.
     - Tap a space → setOpenTask(task) → existing TaskSheet → submitTask.
       Star/streak/reward logic untouched.

   Behaviour rules per the latest prompt:
     1. Completion-order path. No more "current"/"locked" — order of the
        remaining ones doesn't matter, only filling them all does.
     2. Celebrations are gated on the completion IDENTITY (its id), not on
        a space-index high-water mark. Redoing a task creates a fresh id →
        the celebration fires again. No "already today" gate.
     3. On every board open, the rocket starts at START and animates a
        smooth victory lap through every completed space to the current
        position. ONE sweep, no per-space confetti. Tap anywhere to skip.
   ===================================================================== */

const SPACE_QUEST = {
  id: "space-quest",
  name: "Space Quest",
  background: "radial-gradient(ellipse at top, #1e3a8a 0%, #0f172a 65%, #020617 100%)",
  pathStroke: "rgba(255,255,255,0.22)",
  pathGlow: "rgba(99,102,241,0.35)",
  tokenEmoji: "🚀",
  treasureEmoji: "🏆",
  treasureLabel: "Mission Treasure",
  startEmoji: "🛸",
  startLabel: "Start",
  fallbackColor: "#6366f1",
};

const ACTIVITY_EMOJI = {
  Drums: "🥁",
  "English reading": "📚",
  "Spanish reading": "📖",
  "Spanish practice": "🇪🇸",
  Duolingo: "🦉",
  Writing: "✏️",
  Math: "🧮",
  Art: "🎨",
  Movement: "🏃",
  Swim: "🏊",
  Taekwondo: "🥋",
  "Hip Hop Dance": "💃",
  Chores: "🧹",
  "Field trips": "🗺️",
  Church: "⛪",
  Basketball: "🏀",
};

function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Completion-order path:
//   [START, ...completed today in completion order, ...remaining tasks
//    (required first, then extras, original order within), TREASURE]
function deriveSpaces({ todaysTasks, compByTask, completions }) {
  const TODAY_ISO = todayIso();
  // Today's approved completions, sorted by creation time (id is
  // "cmp_<Date.now()>", so a lexicographic sort matches time order).
  const approvedToday = (completions || [])
    .filter(
      (c) =>
        c.status === "approved" &&
        c.completionDate === TODAY_ISO &&
        // Stick to today's-task ids — a completion for an unrelated task
        // doesn't belong on this board.
        todaysTasks.some((t) => t.id === c.taskId)
    )
    .sort((a, b) => (a.id || "").localeCompare(b.id || ""));
  const completedTaskIds = approvedToday.map((c) => c.taskId);
  const completedSet = new Set(completedTaskIds);

  const out = [{ kind: "start", state: "start" }];

  for (const tid of completedTaskIds) {
    const t = todaysTasks.find((x) => x.id === tid);
    if (t) out.push({ kind: "task", task: t, state: "completed" });
  }

  // Remaining: required first, then extras. State derives from compByTask
  // — pending or needs-fix for ones the kid has touched; available otherwise.
  // No gating, no "current" highlight — the rocket tells you where you are.
  const remaining = todaysTasks.filter((t) => !completedSet.has(t.id));
  const remRequired = remaining.filter((t) => t.required);
  const remExtras = remaining.filter((t) => !t.required);
  for (const t of [...remRequired, ...remExtras]) {
    const c = compByTask[t.id];
    const state =
      c?.status === "pending"
        ? "pending"
        : c?.status === "needs_fix"
        ? "needs-fix"
        : "available";
    out.push({ kind: "task", task: t, state });
  }

  const allApproved =
    todaysTasks.length > 0 && completedTaskIds.length === todaysTasks.length;
  out.push({ kind: "treasure", state: allApproved ? "treasure-open" : "treasure-locked" });

  return out;
}

function calcPositions(count, viewBoxH) {
  const cols = 3;
  const xLanes = [22, 50, 78];
  const rowCount = Math.max(1, Math.ceil(count / cols));
  const usableY = viewBoxH - 12;
  const positions = [];
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols);
    const colIdx = i % cols;
    const col = row % 2 === 0 ? colIdx : cols - 1 - colIdx;
    const x = xLanes[col];
    const y = 6 + (row + 0.5) * (usableY / rowCount);
    positions.push({ x, y });
  }
  return positions;
}

function buildPathD(positions) {
  if (positions.length === 0) return "";
  let d = `M ${positions[0].x} ${positions[0].y}`;
  for (let i = 1; i < positions.length; i++) {
    const prev = positions[i - 1];
    const curr = positions[i];
    const sameRow = Math.abs(prev.y - curr.y) < 0.5;
    if (sameRow) {
      const mx = (prev.x + curr.x) / 2;
      const my = prev.y - 1.5;
      d += ` Q ${mx} ${my} ${curr.x} ${curr.y}`;
    } else {
      const right = prev.x > 50;
      const outX = right ? Math.min(95, prev.x + 12) : Math.max(5, prev.x - 12);
      d += ` C ${outX} ${prev.y}, ${outX} ${curr.y}, ${curr.x} ${curr.y}`;
    }
  }
  return d;
}

function BoardPop({ id, kind, label, sub }) {
  if (!id) return null;
  const palette =
    kind === "treasure"
      ? ["#fde047", "#facc15", "#f59e0b", "#fb923c", "#22d3ee", "#a78bfa"]
      : ["#22d3ee", "#a78bfa", "#f472b6", "#fde047", "#34d399"];
  const emojis = kind === "treasure" ? ["🏆", "✨", "⭐", "🎉", "💫"] : ["⭐", "✨", "🎉", "💫", "🚀"];
  const count = kind === "treasure" ? 36 : 18;
  const burst = kind === "treasure" ? "8rem" : "5rem";
  const pieces = [];
  for (let i = 0; i < count; i++) {
    const dx = (Math.random() - 0.5) * (kind === "treasure" ? 480 : 280);
    const left = 50 + (Math.random() - 0.5) * 24;
    const top = 38 + (Math.random() - 0.5) * 18;
    pieces.push(
      <span
        key={i}
        className="absolute text-2xl"
        style={{
          left: `${left}%`,
          top: `${top}%`,
          color: palette[i % palette.length],
          ["--dx"]: `${dx}px`,
          animation: `bpConfetti ${900 + Math.random() * 700}ms ease-out ${i * 28}ms forwards`,
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
        @keyframes bpBurst { 0% { transform: scale(0.25); opacity: 0; } 30% { transform: scale(1.35); opacity: 1; } 70% { transform: scale(1.08); opacity: 0.95; } 100% { transform: scale(1); opacity: 0; } }
        @keyframes bpRise { 0% { transform: translateY(8px); opacity: 0; } 15% { opacity: 1; } 100% { transform: translateY(-140px); opacity: 0; } }
        @keyframes bpConfetti { 0% { transform: translate(0, -10vh) rotate(0deg); opacity: 0; } 12% { opacity: 1; } 100% { transform: translate(var(--dx), 55vh) rotate(720deg); opacity: 0; } }
      `}</style>
      <div
        className="drop-shadow-lg"
        style={{
          animation: `bpBurst ${kind === "treasure" ? 1300 : 950}ms ease-out forwards`,
          fontSize: burst,
        }}
      >
        {kind === "treasure" ? "🏆" : "⭐"}
      </div>
      <div
        className="absolute text-2xl font-extrabold text-amber-300"
        style={{ animation: "bpRise 1200ms ease-out forwards", textShadow: "0 2px 14px rgba(0,0,0,0.45)" }}
      >
        {label}
      </div>
      {sub && (
        <div
          className="absolute text-sm font-bold text-white/90 mt-16"
          style={{ animation: "bpRise 1200ms ease-out 80ms forwards", textShadow: "0 2px 10px rgba(0,0,0,0.5)" }}
        >
          {sub}
        </div>
      )}
      {pieces}
    </div>
  );
}

function SpaceMarker({ space, x, y, viewBoxH, onTap, theme, activities, pulseKey = 0 }) {
  // Arrival pulse — when pulseKey transitions to a fresh (non-zero)
  // value, imperatively restart a one-shot CSS animation on the marker.
  // Same force-reflow pattern as the bank-pop on KidGameHome so the
  // animation can re-trigger if the rocket lands here again later
  // (undo + redo, or a second day visit).
  const markerRef = useRef(null);
  useEffect(() => {
    if (!pulseKey) return;
    const el = markerRef.current;
    if (!el) return;
    el.style.animation = "none";
    void el.offsetWidth;
    el.style.animation = "bgSpaceLand 700ms ease-out";
  }, [pulseKey]);
  const { kind, state, task } = space;
  const xPct = x;
  const yPct = (y / viewBoxH) * 100;
  let content;
  let label;
  let labelClass = "text-white";
  let tappable = false;
  let ring = "rgba(255,255,255,0.35)";
  let bg = "rgba(255,255,255,0.12)";
  let badge = null;
  let glow = false;
  let size = "w-14 h-14 sm:w-16 sm:h-16";

  if (kind === "start") {
    content = <span className="text-2xl">{theme.startEmoji}</span>;
    label = theme.startLabel;
    bg = "linear-gradient(135deg, #1f2937, #0f172a)";
    ring = "rgba(255,255,255,0.4)";
    labelClass = "text-white/70 uppercase tracking-widest text-[9px]";
  } else if (kind === "treasure") {
    const open = state === "treasure-open";
    content = <span className="text-3xl sm:text-4xl">{theme.treasureEmoji}</span>;
    label = theme.treasureLabel;
    labelClass = "text-white/80 text-[10px] font-bold";
    size = "w-20 h-20 sm:w-24 sm:h-24";
    if (open) {
      bg = "radial-gradient(circle, #fef3c7 0%, #f59e0b 100%)";
      ring = "rgba(253,224,71,0.95)";
      glow = true;
    } else {
      bg = "radial-gradient(circle, #475569 0%, #1e293b 100%)";
      ring = "rgba(255,255,255,0.18)";
    }
  } else {
    const a =
      (activities || []).find(
        (x) =>
          x.id ===
          (task.activityId || task.activityType?.toLowerCase().replace(/\s/g, "_"))
      ) || {};
    const color = a.color || theme.fallbackColor;
    const emoji = ACTIVITY_EMOJI[task.activityType] || "⭐";
    label = task.title;
    const palette = {
      available: { bg: color, opacity: 1, ring: "rgba(255,255,255,0.4)" },
      pending: { bg: color, opacity: 0.92, ring: "#f59e0b" },
      completed: { bg: "#0f5132", opacity: 0.72, ring: "rgba(255,255,255,0.2)" },
      "needs-fix": { bg: color, opacity: 0.92, ring: "#ef4444" },
    };
    const p = palette[state] || palette.available;
    bg = p.bg;
    ring = p.ring;
    tappable = true;
    content = <span className="text-2xl sm:text-3xl">{emoji}</span>;
    if (state === "completed") {
      badge = (
        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 grid place-items-center text-white text-xs font-extrabold border-2 border-slate-900">
          ✓
        </div>
      );
    } else if (state === "pending") {
      badge = (
        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-500 grid place-items-center text-white text-[11px] font-extrabold border-2 border-slate-900">
          ⏳
        </div>
      );
    } else if (state === "needs-fix") {
      badge = (
        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-rose-500 grid place-items-center text-white text-[10px] font-extrabold border-2 border-slate-900">
          ↺
        </div>
      );
    }
  }

  const inner = (
    <div
      ref={markerRef}
      className={`relative ${size} rounded-full grid place-items-center transition`}
      style={{
        background: bg,
        border: `4px solid ${ring}`,
        boxShadow: glow ? `0 0 28px ${ring}` : "0 4px 14px rgba(0,0,0,0.4)",
      }}
    >
      {content}
      {badge}
    </div>
  );

  return (
    <div
      className="absolute flex flex-col items-center"
      style={{
        left: `${xPct}%`,
        top: `${yPct}%`,
        transform: "translate(-50%, -50%)",
        width: "max-content",
      }}
    >
      {tappable ? (
        <button type="button" onClick={() => onTap?.(task)} title={label} className="active:scale-95">
          {inner}
        </button>
      ) : (
        inner
      )}
      <div className={`text-[10px] sm:text-[11px] font-bold text-center mt-1.5 leading-tight ${labelClass}`} style={{ maxWidth: 96 }}>
        {label}
      </div>
    </div>
  );
}

export default function BoardGame({
  todaysTasks,
  compByTask,
  completions,
  activities,
  setOpenTask,
  user,
}) {
  const theme = SPACE_QUEST;
  const safeTasks = todaysTasks || [];
  const safeComp = compByTask || {};
  const safeCompletions = completions || [];

  const stars = useMemo(
    () =>
      Array.from({ length: 42 }).map((_, i) => ({
        key: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.6 + 0.25,
      })),
    []
  );

  if (safeTasks.length === 0) {
    return (
      <div
        className="min-h-screen px-4 pt-6 pb-24 text-white relative overflow-hidden"
        style={{
          background: theme.background,
          fontFamily: "ui-rounded, 'SF Pro Rounded', system-ui, sans-serif",
        }}
      >
        <div className="text-center mt-12 max-w-xs mx-auto">
          <div className="text-6xl mb-3">🚀</div>
          <div className="text-lg font-extrabold">No missions today</div>
          <div className="text-sm text-white/70 mt-2">Free flight! Take a break.</div>
        </div>
      </div>
    );
  }

  const spaces = useMemo(
    () => deriveSpaces({ todaysTasks: safeTasks, compByTask: safeComp, completions: safeCompletions }),
    [safeTasks, safeComp, safeCompletions]
  );

  const rowCount = Math.max(1, Math.ceil(spaces.length / 3));
  const VIEWBOX_H = rowCount * 38;
  const positions = useMemo(() => calcPositions(spaces.length, VIEWBOX_H), [spaces.length, VIEWBOX_H]);
  const pathD = useMemo(() => buildPathD(positions), [positions]);

  // Where the rocket SHOULD live right now: index of the last completed
  // space. Since the path is built completion-order-first, that's just
  // the count of completed task spaces (START is index 0).
  const targetIdx = useMemo(() => {
    let last = 0;
    for (let i = 1; i < spaces.length; i++) {
      if (spaces[i].kind === "task" && spaces[i].state === "completed") last = i;
      else break;
    }
    if (spaces[spaces.length - 1].state === "treasure-open") last = spaces.length - 1;
    return last;
  }, [spaces]);

  // Canonical "what's approved right now" — used to detect new completions
  // (including redos of previously-undone tasks, which get fresh ids).
  const approvedIds = useMemo(() => {
    const TODAY_ISO = todayIso();
    return safeCompletions
      .filter((c) => c.status === "approved" && c.completionDate === TODAY_ISO)
      .map((c) => c.id);
  }, [safeCompletions]);

  const pathRef = useRef(null);
  const animRef = useRef(null);
  const seenIdsRef = useRef(null); // null until catch-up replay finishes
  const tokenIdxRef = useRef(0);
  const outerRef = useRef(null); // for scroll reset on mount

  const [tokenXY, setTokenXY] = useState(() => {
    const p = positions[0] || { x: 50, y: 0 };
    return { x: p.x, y: p.y };
  });
  // `launched` = the kid has tapped to launch the catch-up replay.
  // Until it flips to true, the rocket sits at START and pulses.
  // We auto-launch when there's nothing to replay (targetIdx === 0).
  const [launched, setLaunched] = useState(false);
  const [pop, setPop] = useState(null);
  // Last landing — { idx, t } where idx is the space the rocket just
  // arrived at and t is a timestamp keying a one-shot pulse animation.
  // Lets the landed space react instead of being a passive destination.
  const [lastLanded, setLastLanded] = useState({ idx: -1, t: 0 });

  // Fix the "scrolled to the bottom" problem: when the user taps the
  // Board tab, the outer scroll container in App.jsx still holds the
  // scroll position from whatever tab was active before. Walk up to
  // that container on mount and reset it.
  useEffect(() => {
    let el = outerRef.current?.parentElement;
    while (el && el !== document.body) {
      const cs = window.getComputedStyle(el);
      if (cs.overflowY === "auto" || cs.overflowY === "scroll") {
        el.scrollTop = 0;
        break;
      }
      el = el.parentElement;
    }
  }, []);

  // Animate the token along the SVG path from one logical index to another.
  // Pure visual — never touches canonical data.
  const animateAlong = (fromIdx, toIdx, { duration, onLand } = {}) => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (!pathRef.current || positions.length < 2 || fromIdx === toIdx) {
      const p = positions[toIdx] || positions[0];
      setTokenXY({ x: p.x, y: p.y });
      tokenIdxRef.current = toIdx;
      onLand?.();
      return;
    }
    const pathEl = pathRef.current;
    const total = pathEl.getTotalLength();
    const lenAt = (idx) => total * (idx / (positions.length - 1));
    const startLen = lenAt(fromIdx);
    const endLen = lenAt(toIdx);
    const startedAt = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const len = startLen + (endLen - startLen) * eased;
      const pt = pathEl.getPointAtLength(len);
      setTokenXY({ x: pt.x, y: pt.y });
      if (t < 1) {
        animRef.current = requestAnimationFrame(tick);
      } else {
        animRef.current = null;
        tokenIdxRef.current = toIdx;
        onLand?.();
      }
    };
    animRef.current = requestAnimationFrame(tick);
  };

  // If there's nothing to catch up (no completed tasks today), auto-launch
  // so the live-update effect is armed immediately for the first completion.
  useEffect(() => {
    if (launched) return;
    if (targetIdx === 0) setLaunched(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Catch-up replay: only fires AFTER the user has tapped to launch. The
  // rocket starts at START and animates through every completed space to
  // the current target. One smooth sweep, no per-space confetti.
  useEffect(() => {
    if (!launched) return;
    if (seenIdsRef.current !== null) return; // already replayed once
    const start = positions[0] || { x: 50, y: 0 };
    setTokenXY({ x: start.x, y: start.y });
    tokenIdxRef.current = 0;
    if (targetIdx === 0) {
      seenIdsRef.current = new Set(approvedIds);
      return;
    }
    const tm = setTimeout(() => {
      // Quick sweep: cap at 700ms so the kid sees it but doesn't wait.
      animateAlong(0, targetIdx, {
        duration: Math.min(700, 320 + targetIdx * 70),
        onLand: () => {
          seenIdsRef.current = new Set(approvedIds);
        },
      });
    }, 80);
    return () => {
      clearTimeout(tm);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [launched]);

  // Live updates: a new approved id appeared (a fresh completion or a redo
  // of a previously-undone task) → animate to the new target + celebrate.
  // A removed id (undo) → snap back, no celebration.
  useEffect(() => {
    if (!launched || seenIdsRef.current === null) return;
    const current = new Set(approvedIds);
    const newIds = approvedIds.filter((id) => !seenIdsRef.current.has(id));
    const removed = [...seenIdsRef.current].some((id) => !current.has(id));
    seenIdsRef.current = current;

    if (newIds.length === 0) {
      if (removed) {
        animateAlong(tokenIdxRef.current, targetIdx, { duration: 0 });
      }
      return;
    }

    // Animate to the new last-completed space and pop once.
    animateAlong(tokenIdxRef.current, targetIdx, {
      duration: Math.min(900, 350 + Math.max(0, targetIdx - tokenIdxRef.current) * 250),
      onLand: () => {
        const landed = spaces[targetIdx];
        // Pulse the space the rocket just arrived on — visible
        // "you made it here" feedback. The timestamp is the key so
        // back-to-back landings on the same space (rare; would be
        // an undo→redo) each re-trigger the pulse.
        setLastLanded({ idx: targetIdx, t: Date.now() });
        if (landed?.kind === "treasure") {
          // Treasure landing — big juice. Same `treasure` SFX as a
          // reward redemption + a success haptic to signal "this is
          // the big one".
          juice.burst("success", "treasure");
          setPop({
            id: Date.now(),
            kind: "treasure",
            label: "TREASURE! 🏆",
            sub: "All missions complete!",
          });
        } else if (landed?.kind === "task") {
          // Per-space landing — softer juice so the treasure ending
          // still feels distinct after multiple of these.
          juice.burst("medium", "approve");
          const starsCount = landed.task?.starValue || 0;
          setPop({
            id: Date.now(),
            kind: "space",
            label: starsCount > 0 ? `+${starsCount} ⭐` : "Mission complete!",
            sub: landed.task?.title || "",
          });
        }
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approvedIds.join("|"), targetIdx, launched]);

  // Auto-clear the pop after its CSS animation finishes.
  useEffect(() => {
    if (!pop) return;
    const t = setTimeout(() => setPop(null), pop.kind === "treasure" ? 2200 : 1500);
    return () => clearTimeout(t);
  }, [pop]);

  // First tap launches the catch-up replay. After that this is a no-op,
  // so wiring it on both the container AND letting space taps bubble
  // through is safe — the kid never has to tap twice.
  const launchNow = () => {
    if (launched) return;
    // Lift-off juice — soft whoosh + light buzz. Distinct from the
    // per-space landings so the kid can tell "I started" from "I
    // arrived somewhere".
    juice.burst("light", "swipe");
    setLaunched(true);
  };

  const doneCount = safeTasks.filter((t) => safeComp[t.id]?.status === "approved").length;
  const pendingCount = safeTasks.filter((t) => safeComp[t.id]?.status === "pending").length;

  const tokenLeftPct = tokenXY.x;
  const tokenTopPct = (tokenXY.y / VIEWBOX_H) * 100;

  return (
    <div
      ref={outerRef}
      className="min-h-screen px-3 pt-4 pb-24 relative overflow-hidden"
      style={{
        background: theme.background,
        fontFamily: "ui-rounded, 'SF Pro Rounded', system-ui, sans-serif",
      }}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {stars.map((s) => (
          <div
            key={s.key}
            className="absolute rounded-full bg-white"
            style={{
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: s.size,
              height: s.size,
              opacity: s.opacity,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 text-center mb-3">
        <div className="text-[10px] uppercase tracking-[0.18em] text-white/60 font-bold">
          {theme.name}
        </div>
        <div className="text-2xl font-extrabold text-white tracking-tight mt-0.5">
          Daily Adventure
        </div>
        <div className="text-[11px] text-white/70 mt-1">
          {doneCount} of {safeTasks.length} cleared
          {pendingCount > 0 ? ` · ${pendingCount} pending ⏳` : ""}
        </div>
      </div>

      <div
        className="relative z-10 mx-auto"
        style={{ maxWidth: 420, aspectRatio: `100 / ${VIEWBOX_H}` }}
        onClick={launchNow}
      >
        <svg
          viewBox={`0 0 100 ${VIEWBOX_H}`}
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full pointer-events-none"
        >
          <path d={pathD} stroke={theme.pathGlow} strokeWidth="6" fill="none" strokeLinecap="round" />
          <path
            ref={pathRef}
            d={pathD}
            stroke={theme.pathStroke}
            strokeWidth="2.4"
            fill="none"
            strokeLinecap="round"
            strokeDasharray="3 2.2"
          />
        </svg>

        {spaces.map((s, i) => (
          <SpaceMarker
            key={`${s.kind}-${s.task?.id || s.kind}-${i}`}
            space={s}
            x={positions[i].x}
            y={positions[i].y}
            viewBoxH={VIEWBOX_H}
            onTap={setOpenTask}
            theme={theme}
            activities={activities}
            // pulseKey changes when THIS space just had a landing —
            // the SpaceMarker effect re-triggers its arrival animation
            // each time the key flips.
            pulseKey={lastLanded.idx === i ? lastLanded.t : 0}
          />
        ))}

        <div
          className="absolute pointer-events-none"
          style={{
            left: `${tokenLeftPct}%`,
            top: `${tokenTopPct}%`,
            transform: "translate(-50%, -130%)",
            zIndex: 20,
            transition: "transform 80ms linear",
          }}
        >
          <style>{`
            @keyframes rocketReady {
              0%, 100% { transform: translateY(0) scale(1); }
              50%      { transform: translateY(-8px) scale(1.18); }
            }
            @keyframes rocketHover {
              0%, 100% { transform: translateY(0); }
              50%      { transform: translateY(-4px); }
            }
            @keyframes hintBob {
              0%, 100% { transform: translateY(0); }
              50%      { transform: translateY(-4px); }
            }
            /* Space arrival pulse — fired imperatively on the marker
               when the rocket lands. Scale overshoot + bright halo
               that decays. 700ms total. */
            @keyframes bgSpaceLand {
              0%   { transform: scale(1);    box-shadow: 0 4px 14px rgba(0,0,0,0.4); }
              30%  { transform: scale(1.22); box-shadow: 0 0 0 8px rgba(253,224,71,0.45), 0 0 28px rgba(253,224,71,0.7); }
              60%  { transform: scale(0.96); box-shadow: 0 0 0 4px rgba(253,224,71,0.25), 0 0 18px rgba(253,224,71,0.4); }
              100% { transform: scale(1);    box-shadow: 0 4px 14px rgba(0,0,0,0.4); }
            }
            @media (prefers-reduced-motion: reduce) {
              @keyframes rocketReady   { 0%, 100% { transform: none; } }
              @keyframes rocketHover   { 0%, 100% { transform: none; } }
              @keyframes hintBob       { 0%, 100% { transform: none; } }
              @keyframes bgSpaceLand   {
                0%   { box-shadow: 0 4px 14px rgba(0,0,0,0.4); }
                40%  { box-shadow: 0 0 0 6px rgba(253,224,71,0.45); }
                100% { box-shadow: 0 4px 14px rgba(0,0,0,0.4); }
              }
            }
          `}</style>
          {/* A rocket should always look like it's flying. Pre-launch it
              gets the BIG pulse+glow "tap me" cue. After launch it settles
              into the slower rocketHover bob — continuous, never static. */}
          <div
            className="text-3xl sm:text-4xl drop-shadow-[0_3px_6px_rgba(0,0,0,0.55)]"
            style={{
              animation:
                !launched && targetIdx > 0
                  ? "rocketReady 900ms ease-in-out infinite"
                  : "rocketHover 2400ms ease-in-out infinite",
              filter:
                !launched && targetIdx > 0
                  ? "drop-shadow(0 0 14px rgba(253,224,71,0.6))"
                  : undefined,
            }}
          >
            {theme.tokenEmoji}
          </div>
        </div>

        {/* Tap-to-launch invitation — appears only when there's a catch-up
            to do (something completed today) and the kid hasn't tapped yet.
            Non-interactive so it never eats the tap; the container's
            onClick handles the actual launch. */}
        {!launched && targetIdx > 0 && (
          <div className="absolute bottom-2 left-0 right-0 text-center pointer-events-none z-40">
            <div
              className="inline-block bg-amber-300 text-slate-900 text-[11px] font-extrabold px-3 py-1.5 rounded-full shadow-lg"
              style={{ animation: "hintBob 900ms ease-in-out infinite" }}
            >
              👆 Tap to launch the rocket!
            </div>
          </div>
        )}
      </div>

      <div className="relative z-10 text-center text-[10px] text-white/40 mt-6 max-w-xs mx-auto leading-snug">
        Mission Control + Checklist still live — this is just a fun way to see today's
        missions. Same stars, same streaks.
      </div>

      {pop && <BoardPop id={pop.id} kind={pop.kind} label={pop.label} sub={pop.sub} />}
    </div>
  );
}
