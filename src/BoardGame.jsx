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

// Theme contract (additive — emoji themes still work):
//   background        CSS gradient/color — fallback if bgImg fails to load.
//   bgImg             Optional absolute path under /board/themes/<id>/.
//                     Layered over the gradient as a cover image.
//   tokenEmoji        Emoji fallback (used if tokenRestImg is null).
//   tokenRestImg      Optional resting-state token PNG.
//   tokenFlyImg       Optional flying-state token PNG (animation swap).
//   startEmoji        Required.
//   startImg          Optional PNG for the START marker.
//   treasureEmoji     Required.
//   treasureLockedImg / treasureOpenImg  Optional state-swapped art.
//   spaceTileImg      Optional per-space tile art (not yet rendered).
//   fallbackColor     For any task space whose activity has no color.
//   treasureAnchor    {x, y} 0-100 percentage coords inside the board's
//                     viewBox. When set, the TREASURE space ALWAYS lands
//                     here regardless of space count — keeps it on the
//                     painted pedestal of the artwork. (NEW in v3.)
//   startAnchor       {x, y} same shape — pins START. (NEW in v3.)
//   pathWaypoints     [{x, y}, ...] anchor points the path snakes through,
//                     bottom-up. When set, calcPositions distributes the
//                     task spaces evenly along a polyline through these
//                     waypoints; the path follows the painted geography
//                     instead of the procedural snake. (NEW in v3.)
// See docs/BOARD-THEMES.md for the full spec.

const SPACE_QUEST = {
  id: "space_quest",
  name: "Space Quest",
  background: "radial-gradient(ellipse at top, #1e3a8a 0%, #0f172a 65%, #020617 100%)",
  bgImg: null,
  pathStroke: "rgba(255,255,255,0.22)",
  pathGlow: "rgba(99,102,241,0.35)",
  tokenEmoji: "🚀",
  tokenRestImg: null,
  tokenFlyImg: null,
  treasureEmoji: "🏆",
  treasureLockedImg: null,
  treasureOpenImg: null,
  treasureLabel: "Mission Treasure",
  startEmoji: "🛸",
  startImg: null,
  startLabel: "Start",
  spaceTileImg: null,
  fallbackColor: "#6366f1",
  treasureAnchor: null,
  startAnchor: null,
  pathWaypoints: null,
};

// Friendly cartoon volcano + dragon. PNG assets in
// public/board/themes/volcano-peaks/. Treasure anchored to the painted
// jack-o-lantern volcano at top-center; path winds up the lava rivers
// (artwork has stone pedestals at the points marked by the waypoints).
const VOLCANO_PEAKS = {
  id: "volcano_peaks",
  name: "Volcano Peaks",
  background: "radial-gradient(ellipse at top, #7c2d12 0%, #431407 65%, #1c0a05 100%)",
  bgImg: "/board/themes/volcano-peaks/bg.png",
  pathStroke: "rgba(255,180,90,0.50)",
  pathGlow: "rgba(239,68,68,0.40)",
  tokenEmoji: "🐉",
  tokenRestImg: "/board/themes/volcano-peaks/token.png",
  tokenFlyImg: "/board/themes/volcano-peaks/token-flying.png",
  treasureEmoji: "🏆",
  treasureLockedImg: "/board/themes/volcano-peaks/treasure-locked.png",
  treasureOpenImg: "/board/themes/volcano-peaks/treasure-open.png",
  treasureLabel: "Dragon's Hoard",
  startEmoji: "🌋",
  startImg: "/board/themes/volcano-peaks/start.png",
  startLabel: "Start",
  spaceTileImg: null,
  fallbackColor: "#f97316",
  treasureAnchor: { x: 50, y: 16 },
  startAnchor:    { x: 50, y: 93 },
  // Mario-Party-style zigzag. Waypoints pushed to the edges of the
  // painted geography so the player visibly travels left/right across
  // the world, not just up the center spine.
  pathWaypoints: [
    { x: 50, y: 93 },  // start (bottom-center pedestal)
    { x: 22, y: 82 },  // FAR LEFT — sweep along left lava river
    { x: 78, y: 72 },  // FAR RIGHT — cross to right river
    { x: 25, y: 58 },  // LEFT pedestal
    { x: 75, y: 46 },  // RIGHT pedestal
    { x: 30, y: 32 },  // LEFT final approach
    { x: 50, y: 22 },  // center
    { x: 50, y: 16 },  // treasure (smiling volcano)
  ],
};

// Glowing fairy clearing, mushroom houses, glowing crystals. Assets in
// public/board/themes/enchanted-forest/. Token "fly" alt is the winking
// variant — semantically the same crossfade-on-animate slot, just a
// different motion for a non-flying character.
const ENCHANTED_FOREST = {
  id: "enchanted_forest",
  name: "Enchanted Forest",
  background: "radial-gradient(ellipse at center, #14532d 0%, #052e16 65%, #020617 100%)",
  bgImg: "/board/themes/enchanted-forest/bg.png",
  pathStroke: "rgba(196,181,253,0.45)",
  pathGlow: "rgba(168,85,247,0.40)",
  tokenEmoji: "🦋",
  tokenRestImg: "/board/themes/enchanted-forest/token.png",
  tokenFlyImg: "/board/themes/enchanted-forest/token-wink.png",
  treasureEmoji: "✨",
  treasureLockedImg: "/board/themes/enchanted-forest/treasure-locked.png",
  treasureOpenImg: "/board/themes/enchanted-forest/treasure-open.png",
  treasureLabel: "Fairy Trove",
  startEmoji: "🍄",
  startImg: "/board/themes/enchanted-forest/start.png",
  startLabel: "Start",
  spaceTileImg: "/board/themes/enchanted-forest/space-tile.png",
  fallbackColor: "#a78bfa",
  treasureAnchor: { x: 50, y: 18 },
  startAnchor:    { x: 50, y: 92 },
  // Wide zigzag through the painted clearing.
  pathWaypoints: [
    { x: 50, y: 92 },  // start at bottom clearing
    { x: 22, y: 80 },  // FAR LEFT — past the mushroom houses
    { x: 78, y: 68 },  // FAR RIGHT — across the stream
    { x: 25, y: 54 },  // LEFT clearing
    { x: 75, y: 40 },  // RIGHT clearing
    { x: 35, y: 26 },  // LEFT final approach
    { x: 50, y: 18 },  // treasure (top center)
  ],
};

// Candy Concert — pastel candy kingdom with a castle at the top, peppermint
// + cupcake + cake pedestals along the cookie path. Token "fly" alt is
// the cheering variant. Full asset set including space-tile.png.
const CANDY_CONCERT = {
  id: "candy_concert",
  name: "Candy Concert",
  background: "radial-gradient(ellipse at top, #fbcfe8 0%, #f9a8d4 55%, #be185d 100%)",
  bgImg: "/board/themes/candy-concert/bg.png",
  pathStroke: "rgba(244,114,182,0.55)",
  pathGlow: "rgba(236,72,153,0.45)",
  tokenEmoji: "🍭",
  tokenRestImg: "/board/themes/candy-concert/token.png",
  tokenFlyImg: "/board/themes/candy-concert/token-cheer.png",
  treasureEmoji: "🏰",
  treasureLockedImg: "/board/themes/candy-concert/treasure-locked.png",
  treasureOpenImg: "/board/themes/candy-concert/treasure-open.png",
  treasureLabel: "Candy Castle",
  startEmoji: "🧁",
  startImg: "/board/themes/candy-concert/start.png",
  startLabel: "Start",
  spaceTileImg: "/board/themes/candy-concert/space-tile.png",
  fallbackColor: "#ec4899",
  treasureAnchor: { x: 50, y: 14 },
  startAnchor:    { x: 50, y: 92 },
  // Wide zigzag through the candy biomes — each pedestal anchored to
  // a painted area: purple biome left, teal/yellow cake right, etc.
  pathWaypoints: [
    { x: 50, y: 92 },  // start at bottom cupcake
    { x: 22, y: 80 },  // FAR LEFT — purple biome
    { x: 78, y: 68 },  // FAR RIGHT — yellow/lemon biome
    { x: 25, y: 54 },  // LEFT — peppermint
    { x: 75, y: 40 },  // RIGHT — teal cake
    { x: 35, y: 25 },  // LEFT approach
    { x: 50, y: 14 },  // castle (treasure)
  ],
};

export const BOARD_THEMES = {
  space_quest: SPACE_QUEST,
  volcano_peaks: VOLCANO_PEAKS,
  enchanted_forest: ENCHANTED_FOREST,
  candy_concert: CANDY_CONCERT,
};

export const DEFAULT_BOARD_THEME = "space_quest";

// Distribute `count` points evenly along a polyline through `waypoints`.
// count includes START at index 0 and TREASURE at index count-1.
// Returns positions[count]; positions[0] = waypoints[0],
// positions[count-1] = waypoints[last], task spaces interpolated along
// the polyline length so density matches the path's arc length, not
// just the waypoint count.
function positionsAlongPolyline(count, waypoints) {
  if (count <= 0) return [];
  if (count === 1) return [{ ...waypoints[0] }];
  // Precompute cumulative arc length so distribution respects geometry,
  // not waypoint index — keeps spaces evenly spaced even when bends
  // bunch waypoints close together.
  const cum = [0];
  for (let i = 1; i < waypoints.length; i++) {
    const dx = waypoints[i].x - waypoints[i - 1].x;
    const dy = waypoints[i].y - waypoints[i - 1].y;
    cum.push(cum[i - 1] + Math.hypot(dx, dy));
  }
  const total = cum[cum.length - 1] || 1;
  const positions = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const target = t * total;
    // Find the segment containing this arc-length target.
    let seg = 0;
    while (seg < cum.length - 1 && cum[seg + 1] < target) seg++;
    const segStart = cum[seg];
    const segEnd = cum[seg + 1] ?? segStart;
    const segLen = segEnd - segStart || 1;
    const frac = Math.min(1, Math.max(0, (target - segStart) / segLen));
    const a = waypoints[seg];
    const b = waypoints[Math.min(seg + 1, waypoints.length - 1)];
    positions.push({
      x: a.x + (b.x - a.x) * frac,
      y: a.y + (b.y - a.y) * frac,
    });
  }
  return positions;
}

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

function calcPositions(count, viewBoxH, theme) {
  // Theme-anchored path: distribute spaces along the painted geography
  // and pin treasure/start to the artwork's anchor points. Falls back to
  // the procedural snake for themes that don't supply waypoints.
  if (theme?.pathWaypoints && theme.pathWaypoints.length >= 2 && count >= 2) {
    // viewBox is in % units (0-100 by convention here), so we scale the
    // waypoint Y values to the actual viewBoxH at the end.
    const pct = positionsAlongPolyline(count, theme.pathWaypoints);
    const positions = pct.map((p) => ({
      x: p.x,
      y: (p.y / 100) * viewBoxH,
    }));
    // Anchor overrides — keep treasure exactly on its painted pedestal,
    // start at its mark. Without these the interpolation can drift a
    // couple of percent on edge cases (count=2, etc.).
    if (theme.startAnchor) {
      positions[0] = {
        x: theme.startAnchor.x,
        y: (theme.startAnchor.y / 100) * viewBoxH,
      };
    }
    if (theme.treasureAnchor) {
      positions[count - 1] = {
        x: theme.treasureAnchor.x,
        y: (theme.treasureAnchor.y / 100) * viewBoxH,
      };
    }
    return positions;
  }

  // Procedural snake — wider lanes than v1 for Mario-Party-style
  // visible horizontal travel. The middle lane still exists for
  // diagonal sweep but the outer lanes are pushed to 15/85 so each
  // row sweep is clearly side-to-side, not a wobble at center.
  const cols = 3;
  const xLanes = [15, 50, 85];
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
  // Smaller default chip — more world artwork visible, less "checklist"
  // feel. Treasure stays larger because it's the goal of the journey.
  let size = "w-11 h-11 sm:w-12 sm:h-12";
  // The painted art layer for this space (background image). When set,
  // the rounded-full chip background + 4px border are suppressed so the
  // tile reads as the space itself, not "art behind a UI chip."
  let spaceArt = null;
  let spaceArtSize = null;

  if (kind === "start") {
    label = theme.startLabel;
    labelClass = "text-white/80 uppercase tracking-widest text-[9px]";
    bg = "linear-gradient(135deg, #1f2937, #0f172a)";
    ring = "rgba(255,255,255,0.4)";
    if (theme.startImg) {
      spaceArt = theme.startImg;
      spaceArtSize = "w-14 h-14 sm:w-16 sm:h-16";
      size = "w-14 h-14 sm:w-16 sm:h-16";
      content = null;
    } else {
      content = <span className="text-xl">{theme.startEmoji}</span>;
    }
  } else if (kind === "treasure") {
    const open = state === "treasure-open";
    const treasureImg = open ? theme.treasureOpenImg : theme.treasureLockedImg;
    label = theme.treasureLabel;
    labelClass = "text-white/90 text-[10px] font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]";
    size = "w-20 h-20 sm:w-24 sm:h-24";
    if (treasureImg) {
      // Painted chest: NO chip background. The art is the space.
      spaceArt = treasureImg;
      spaceArtSize = "w-20 h-20 sm:w-24 sm:h-24";
      content = null;
    } else {
      content = <span className="text-3xl sm:text-4xl">{theme.treasureEmoji}</span>;
      if (open) {
        bg = "radial-gradient(circle, #fef3c7 0%, #f59e0b 100%)";
        ring = "rgba(253,224,71,0.95)";
        glow = true;
      } else {
        bg = "radial-gradient(circle, #475569 0%, #1e293b 100%)";
        ring = "rgba(255,255,255,0.18)";
      }
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
    tappable = true;
    const palette = {
      available: { bg: color, ring: "rgba(255,255,255,0.4)" },
      pending: { bg: color, ring: "#f59e0b" },
      completed: { bg: "#0f5132", ring: "rgba(255,255,255,0.2)" },
      "needs-fix": { bg: color, ring: "#ef4444" },
    };
    const p = palette[state] || palette.available;
    if (theme.spaceTileImg) {
      // Painted tile IS the space. Activity emoji floats on top.
      // Completed/pending/needs-fix states get a small color halo
      // (boxShadow) instead of the full colored ring — keeps attention
      // cues without breaking the painted-tile illusion.
      spaceArt = theme.spaceTileImg;
      spaceArtSize = "w-12 h-12 sm:w-14 sm:h-14";
      size = "w-12 h-12 sm:w-14 sm:h-14";
      const dim = state === "completed" ? 0.55 : 1;
      content = (
        <span
          className="text-xl sm:text-2xl drop-shadow-[0_2px_3px_rgba(0,0,0,0.6)]"
          style={{
            opacity: dim,
            filter: state === "completed" ? "grayscale(0.4)" : undefined,
          }}
        >
          {emoji}
        </span>
      );
      // Halo color for state cue (subtle)
      if (state === "pending") {
        glow = true; ring = "#f59e0b";
      } else if (state === "needs-fix") {
        glow = true; ring = "#ef4444";
      }
    } else {
      // No theme art for spaces — use the original colored circle.
      bg = p.bg;
      ring = p.ring;
      content = <span className="text-xl sm:text-2xl">{emoji}</span>;
    }

    // Status badges (top-right corner)
    if (state === "completed") {
      badge = (
        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 grid place-items-center text-white text-[10px] font-extrabold border-2 border-slate-900">
          ✓
        </div>
      );
    } else if (state === "pending") {
      badge = (
        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 grid place-items-center text-white text-[9px] font-extrabold border-2 border-slate-900">
          ⏳
        </div>
      );
    } else if (state === "needs-fix") {
      badge = (
        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 grid place-items-center text-white text-[9px] font-extrabold border-2 border-slate-900">
          ↺
        </div>
      );
    }
  }

  // Painted-art mode: chip is transparent, art floats. Otherwise: classic
  // rounded-full chip with bg + border.
  const inner = spaceArt ? (
    <div
      ref={markerRef}
      className={`relative ${size} grid place-items-center transition`}
      style={{
        boxShadow: glow
          ? `0 0 18px ${ring}, 0 4px 12px rgba(0,0,0,0.45)`
          : "0 4px 10px rgba(0,0,0,0.45)",
        borderRadius: "50%",
      }}
    >
      <img
        src={spaceArt}
        alt=""
        draggable={false}
        className={`absolute inset-0 ${spaceArtSize || "w-full h-full"} object-contain pointer-events-none`}
        style={{ filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.5))" }}
      />
      {content && (
        <span className="relative z-10 grid place-items-center w-full h-full">
          {content}
        </span>
      )}
      {badge}
    </div>
  ) : (
    <div
      ref={markerRef}
      className={`relative ${size} rounded-full grid place-items-center transition`}
      style={{
        background: bg,
        border: `3px solid ${ring}`,
        boxShadow: glow ? `0 0 24px ${ring}` : "0 4px 12px rgba(0,0,0,0.4)",
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
      <div
        className={`text-[9px] sm:text-[10px] font-bold text-center mt-1 leading-tight ${labelClass} drop-shadow-[0_1px_2px_rgba(0,0,0,0.75)]`}
        style={{
          maxWidth: 72,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
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
  boardTheme,
  boardDailyCap,
}) {
  // Theme resolution: parent picks via familySetting("boardTheme", ...).
  // Unknown id or missing → DEFAULT_BOARD_THEME so the board never blanks.
  const theme = BOARD_THEMES[boardTheme] || BOARD_THEMES[DEFAULT_BOARD_THEME];
  // Daily cap — parent-controlled via familySetting("boardDailyCap", N).
  // null / undefined / non-positive = uncapped (all of today's tasks).
  // When capped, we pick required tasks first (must-do), then extras —
  // canonical task.required field drives the priority. Already-completed
  // tasks count toward the cap so the kid sees what was done plus what's
  // left, totaling N. If completed already exceeds N (parent lowered cap
  // mid-day), we still show all completed + the cap-capped remaining.
  const rawTasks = todaysTasks || [];
  const safeTasks = (() => {
    const cap = Number(boardDailyCap) > 0 ? Math.floor(Number(boardDailyCap)) : null;
    if (!cap || rawTasks.length <= cap) return rawTasks;
    const required = rawTasks.filter((t) => t.required);
    const extras = rawTasks.filter((t) => !t.required);
    return [...required, ...extras].slice(0, cap);
  })();
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
          background: theme.bgImg
            ? `url(${theme.bgImg}) center top / cover no-repeat, ${theme.background}`
            : theme.background,
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

  // Themes with bgImg get a fixed-aspect viewBox so the painted geography
  // stays proportional. Procedural themes still scale viewBoxH with space
  // count so the snake doesn't squash.
  const rowCount = Math.max(1, Math.ceil(spaces.length / 3));
  const VIEWBOX_H = theme?.bgImg ? 180 : rowCount * 38;
  const positions = useMemo(
    () => calcPositions(spaces.length, VIEWBOX_H, theme),
    [spaces.length, VIEWBOX_H, theme]
  );
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
  // Token mid-flight state — drives the rest/fly image swap. Themes
  // without flying art (or themes that only set tokenRestImg) treat
  // the same art as both states; this state is harmless for emoji-only
  // themes. Reset to false on every land.
  const [flying, setFlying] = useState(false);

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
    setFlying(true);
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
        setFlying(false);
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
        // bgImg layers ON TOP of the gradient — the gradient stays as a
        // fallback if the PNG fails to load and as the bottom layer
        // through any transparent edges of the painted background.
        background: theme.bgImg
          ? `url(${theme.bgImg}) center top / cover no-repeat, ${theme.background}`
          : theme.background,
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
              into the slower rocketHover bob — continuous, never static.
              When the theme provides art, render both rest + fly PNGs and
              crossfade via opacity (single-tree avoids any DOM thrash that
              would interrupt the inherited rocketHover animation). */}
          <div
            className="text-5xl sm:text-6xl drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)] relative"
            style={{
              animation:
                !launched && targetIdx > 0
                  ? "rocketReady 900ms ease-in-out infinite"
                  : "rocketHover 2400ms ease-in-out infinite",
              filter:
                !launched && targetIdx > 0
                  ? "drop-shadow(0 0 18px rgba(253,224,71,0.7))"
                  : undefined,
            }}
          >
            {theme.tokenRestImg ? (
              <div className="relative w-20 h-20 sm:w-24 sm:h-24">
                <img
                  src={theme.tokenRestImg}
                  alt=""
                  draggable={false}
                  className="absolute inset-0 w-full h-full object-contain transition-opacity duration-200 ease-out"
                  style={{ opacity: flying && theme.tokenFlyImg ? 0 : 1 }}
                />
                {theme.tokenFlyImg && (
                  <img
                    src={theme.tokenFlyImg}
                    alt=""
                    draggable={false}
                    className="absolute inset-0 w-full h-full object-contain transition-opacity duration-200 ease-out"
                    style={{ opacity: flying ? 1 : 0 }}
                  />
                )}
              </div>
            ) : (
              theme.tokenEmoji
            )}
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
