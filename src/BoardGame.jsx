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
//   tokenWalkImgs     Optional [walkA, walkB] frames rendered ONLY while
//                     the token is animating along the path. Frames
//                     alternate every ~170ms. Themes without this just
//                     keep showing rest/fly during travel. (Dino themes
//                     use this for a stride/dust running animation.)
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

// Space Quest — keeps the rocket emoji token, but now sits on a painted
// starfield bg.png with painted-chest treasure. No waypoints; falls
// through to the procedural snake so the chip positions feel familiar
// to v3 users while gaining the immersive backdrop.
const SPACE_QUEST = {
  id: "space_quest",
  name: "Space Quest",
  background: "radial-gradient(ellipse at top, #1e3a8a 0%, #0f172a 65%, #020617 100%)",
  bgImg: "/board/themes/space-world/bg.png",
  bgAspect: 1.9,    // 1729 / 910
  pathStroke: "rgba(255,255,255,0.22)",
  pathGlow: "rgba(99,102,241,0.35)",
  tokenEmoji: "🚀",
  tokenRestImg: null,
  tokenFlyImg: null,
  treasureEmoji: "🏆",
  treasureLockedImg: "/board/themes/space-world/treasure-locked.png",
  treasureOpenImg: "/board/themes/space-world/treasure-open.png",
  treasureLabel: "Mission Treasure",
  startEmoji: "🛸",
  startImg: null,
  startLabel: "Start",
  spaceTileImg: null,
  fallbackColor: "#6366f1",
  // Pin treasure to the painted spot near the top of the starfield;
  // start at the bottom. No waypoints → procedural snake handles the
  // task spaces, which is fine: bg is mostly empty starfield, no
  // painted pedestals to align to.
  treasureAnchor: { x: 50, y: 12 },
  startAnchor:    { x: 50, y: 92 },
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
  bgAspect: 1.900,  // 1729 / 910 — drives the board's viewBox height
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
  treasureAnchor: { x: 50, y: 10 },
  startAnchor:    { x: 50, y: 92 },
  // Painted-position SNAP — 11 coords matching the 11 baked pedestals
  // in bg.png at the actual painted positions (verified by overlaying
  // these % coords onto the 1023×1537 image). With the new viewBox
  // height matching the bg's aspect ratio (1.502), these waypoints
  // land EXACTLY on each fire-circle ring.
  // Snake order from bottom: BL → BC → BR → MR → MC → ML → TL → TC → TR.
  pathWaypoints: [
    { x: 50, y: 92 },  // START — bottom fire-emblem pedestal
    { x: 21, y: 70 },  // bottom-left
    { x: 50, y: 70 },  // bottom-center
    { x: 79, y: 70 },  // bottom-right
    { x: 82, y: 47 },  // middle-right
    { x: 50, y: 47 },  // middle-center
    { x: 18, y: 47 },  // middle-left
    { x: 21, y: 25 },  // top-left
    { x: 50, y: 25 },  // top-center
    { x: 79, y: 25 },  // top-right
    { x: 50, y: 10 },  // TREASURE — smiling volcano face
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
  bgAspect: 1.5,    // 1536 / 1024
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
  bgAspect: 1.9,    // 1729 / 910
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

// Water World — friendly shark cruising a sunken-treasure reef. No
// alt-state art yet, so the rest token doubles as the fly/cheer state
// (transition still works; the crossfade just stays on the same sprite).
const WATER_WORLD = {
  id: "water_world",
  name: "Water World",
  background: "radial-gradient(ellipse at top, #0c4a6e 0%, #082f49 60%, #020617 100%)",
  bgImg: "/board/themes/water-world/bg.png",
  bgAspect: 2.162,  // 1844 / 853 — tall portrait coral reef
  pathStroke: "rgba(125,211,252,0.50)",
  pathGlow: "rgba(56,189,248,0.40)",
  tokenEmoji: "🦈",
  tokenRestImg: "/board/themes/water-world/token.png",
  tokenFlyImg: "/board/themes/water-world/token-swim.png",
  treasureEmoji: "🏆",
  treasureLockedImg: "/board/themes/water-world/treasure-locked.png",
  treasureOpenImg: "/board/themes/water-world/treasure-open.png",
  treasureLabel: "Sunken Treasure",
  startEmoji: "🌊",
  startImg: null,
  startLabel: "Start",
  spaceTileImg: null,
  fallbackColor: "#0ea5e9",
  treasureAnchor: { x: 50, y: 12 },
  startAnchor:    { x: 50, y: 93 },
  // Zigzag through the reef. Y values tuned for the 1:2.16 portrait
  // — bg is tall, so positions span wider Y range.
  pathWaypoints: [
    { x: 50, y: 93 },
    { x: 22, y: 80 },
    { x: 78, y: 68 },
    { x: 25, y: 54 },
    { x: 75, y: 40 },
    { x: 32, y: 26 },
    { x: 50, y: 12 },
  ],
};

// Dino World — friendly cartoon dino in a prehistoric jungle. Has a
// proper roar alt sprite for the motion crossfade.
const DINO_WORLD = {
  id: "dino_world",
  name: "Dino World",
  background: "radial-gradient(ellipse at top, #14532d 0%, #052e16 65%, #020617 100%)",
  bgImg: "/board/themes/dino-world/bg.png",
  bgAspect: 1.903,  // 1730 / 909
  pathStroke: "rgba(190,242,100,0.50)",
  pathGlow: "rgba(132,204,22,0.40)",
  tokenEmoji: "🦖",
  tokenRestImg: "/board/themes/dino-world/token.png",
  tokenFlyImg: "/board/themes/dino-world/token-roar.png",
  // Walk-cycle frames — only rendered WHILE animating along the path.
  // Two strides alternated at walkFrameMs interval read as "running
  // through the jungle." Idle + tap behavior is untouched (still uses
  // tokenRestImg / tokenFlyImg crossfade).
  tokenWalkImgs: [
    "/board/themes/dino-world/token-walk-1.png",
    "/board/themes/dino-world/token-walk-2.png",
  ],
  treasureEmoji: "🏆",
  treasureLockedImg: "/board/themes/dino-world/treasure-locked.png",
  treasureOpenImg: "/board/themes/dino-world/treasure-open.png",
  treasureLabel: "Fossil Hoard",
  startEmoji: "🌴",
  startImg: null,
  startLabel: "Start",
  spaceTileImg: null,
  fallbackColor: "#84cc16",
  treasureAnchor: { x: 50, y: 14 },
  startAnchor:    { x: 50, y: 92 },
  pathWaypoints: [
    { x: 50, y: 92 },
    { x: 22, y: 80 },
    { x: 78, y: 68 },
    { x: 25, y: 54 },
    { x: 75, y: 40 },
    { x: 35, y: 25 },
    { x: 50, y: 14 },
  ],
};

// Dino Desert — same character family as Dino World but a dusty
// canyon biome instead of lush jungle. Has token-roar alt sprite.
const DINO_DESERT = {
  id: "dino_desert",
  name: "Dino Desert",
  background: "radial-gradient(ellipse at top, #fbbf24 0%, #b45309 60%, #422006 100%)",
  bgImg: "/board/themes/dino-desert/bg.png",
  bgAspect: 1.903,  // 1730 / 909
  pathStroke: "rgba(254,215,170,0.55)",
  pathGlow: "rgba(249,115,22,0.40)",
  tokenEmoji: "🦖",
  tokenRestImg: "/board/themes/dino-desert/token.png",
  tokenFlyImg: "/board/themes/dino-desert/token-roar.png",
  // Same walk-cycle pattern as Dino World — Reznor wanted both dino
  // themes to share the running-stride animation.
  tokenWalkImgs: [
    "/board/themes/dino-desert/token-walk-1.png",
    "/board/themes/dino-desert/token-walk-2.png",
  ],
  treasureEmoji: "🏆",
  treasureLockedImg: "/board/themes/dino-desert/treasure-locked.png",
  treasureOpenImg: "/board/themes/dino-desert/treasure-open.png",
  treasureLabel: "Desert Hoard",
  startEmoji: "🌵",
  startImg: null,
  startLabel: "Start",
  spaceTileImg: null,
  fallbackColor: "#f97316",
  treasureAnchor: { x: 50, y: 14 },
  startAnchor:    { x: 50, y: 92 },
  pathWaypoints: [
    { x: 50, y: 92 },
    { x: 22, y: 80 },
    { x: 78, y: 68 },
    { x: 25, y: 54 },
    { x: 75, y: 40 },
    { x: 35, y: 25 },
    { x: 50, y: 14 },
  ],
};

// Sky City — floating clouds + spire city. Token-wink alt sprite
// (matches the Enchanted Forest pattern: alt slot is "alt during
// motion", here it's a wink/wave variant). Has space-tile art.
const SKY_CITY = {
  id: "sky_city",
  name: "Sky City",
  background: "radial-gradient(ellipse at top, #bae6fd 0%, #0284c7 55%, #0c4a6e 100%)",
  bgImg: "/board/themes/sky-city/bg.png",
  bgAspect: 1.900,  // 1729 / 910
  pathStroke: "rgba(186,230,253,0.55)",
  pathGlow: "rgba(56,189,248,0.45)",
  tokenEmoji: "🦅",
  tokenRestImg: "/board/themes/sky-city/token.png",
  tokenFlyImg: "/board/themes/sky-city/token-wink.png",
  treasureEmoji: "🏰",
  treasureLockedImg: "/board/themes/sky-city/treasure-locked.png",
  treasureOpenImg: "/board/themes/sky-city/treasure-open.png",
  treasureLabel: "Cloud Citadel",
  startEmoji: "☁️",
  startImg: null,
  startLabel: "Start",
  spaceTileImg: "/board/themes/sky-city/space-tile.png",
  fallbackColor: "#38bdf8",
  treasureAnchor: { x: 50, y: 14 },
  startAnchor:    { x: 50, y: 92 },
  pathWaypoints: [
    { x: 50, y: 92 },
    { x: 22, y: 80 },
    { x: 78, y: 68 },
    { x: 25, y: 54 },
    { x: 75, y: 40 },
    { x: 35, y: 25 },
    { x: 50, y: 14 },
  ],
};

export const BOARD_THEMES = {
  space_quest: SPACE_QUEST,
  volcano_peaks: VOLCANO_PEAKS,
  enchanted_forest: ENCHANTED_FOREST,
  candy_concert: CANDY_CONCERT,
  water_world: WATER_WORLD,
  dino_world: DINO_WORLD,
  dino_desert: DINO_DESERT,
  sky_city: SKY_CITY,
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
    const waypoints = theme.pathWaypoints;
    const toView = (p) => ({ x: p.x, y: (p.y / 100) * viewBoxH });
    let positions;

    if (waypoints.length === count) {
      // SNAP MODE — waypoint count matches space count exactly. Each
      // space lands on its painted pedestal 1:1.
      positions = waypoints.map(toView);
    } else if (waypoints.length > count && count >= 3) {
      // PARTIAL-SNAP MODE — fewer spaces than painted pedestals (typical
      // when daily cap < painted count, e.g., 8 tasks today vs 9
      // painted task pedestals). Use START + TREASURE waypoints
      // verbatim and sample the middle task pedestals so the kid still
      // lands on real painted rings instead of floating between them.
      const taskWPs = waypoints.slice(1, -1);
      const need = count - 2;
      const stride = taskWPs.length / need;
      positions = [toView(waypoints[0])];
      for (let i = 0; i < need; i++) {
        const idx = Math.min(Math.floor(i * stride), taskWPs.length - 1);
        positions.push(toView(taskWPs[idx]));
      }
      positions.push(toView(waypoints[waypoints.length - 1]));
    } else {
      // INTERPOLATE MODE — more spaces than painted pedestals (parent
      // dialed cap above the painted count). Arc-length distribution
      // along the polyline so spaces still trace the painted geography.
      const pct = positionsAlongPolyline(count, waypoints);
      positions = pct.map(toView);
    }
    // Anchor overrides — idempotent in snap mode, insurance in the
    // other two. Keeps treasure exactly on its painted pedestal.
    if (theme.startAnchor) positions[0] = toView(theme.startAnchor);
    if (theme.treasureAnchor) positions[count - 1] = toView(theme.treasureAnchor);
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

// BoardLoader — fun preload screen shown while the theme's bg + token
// + treasure images decode. The board itself doesn't render until
// every asset is ready, so when the loader vanishes the board is
// crisp and instant. Mike's rule: "we don't want to see it load,
// that breaks the fun."
//
// Visual: theme gradient background (cheap CSS, no download), a big
// emoji that wobbles, three bouncing dots, and a short message. No
// network dependency on the loader itself — must be paint-on-render.
function BoardLoader({ theme }) {
  // Pick an emoji that fits the theme. Falls back to a generic sparkle
  // if the theme doesn't suggest one.
  const themeEmoji = (() => {
    const t = (theme?.id || theme?.name || "").toLowerCase();
    if (t.includes("dino")) return "🦖";
    if (t.includes("volcano")) return "🌋";
    if (t.includes("water")) return "🐠";
    if (t.includes("forest")) return "🌳";
    if (t.includes("candy")) return "🍭";
    if (t.includes("space") || t.includes("sky")) return "🚀";
    return "✨";
  })();
  return (
    <div
      className="min-h-screen px-4 pt-6 pb-24 text-white relative overflow-hidden flex flex-col items-center justify-center"
      style={{
        background: theme?.background || "linear-gradient(180deg,#0f172a,#312e81)",
        fontFamily: "ui-rounded, 'SF Pro Rounded', system-ui, sans-serif",
      }}
    >
      <style>{`
        @keyframes rcc-board-wobble {
          0%, 100% { transform: translateY(0) rotate(-6deg); }
          50%      { transform: translateY(-14px) rotate(8deg); }
        }
        @keyframes rcc-board-dot {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40%           { transform: translateY(-10px); opacity: 1; }
        }
      `}</style>
      <div
        className="text-7xl mb-4"
        style={{ animation: "rcc-board-wobble 1.4s ease-in-out infinite" }}
      >
        {themeEmoji}
      </div>
      <div className="text-lg font-extrabold tracking-tight mb-1">
        Loading the adventure…
      </div>
      <div className="text-sm text-white/70 mb-6">
        Setting the stage for today's treasure hunt.
      </div>
      <div className="flex items-center gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-3 h-3 rounded-full bg-white"
            style={{
              animation: `rcc-board-dot 1.2s ease-in-out infinite`,
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// Replay pill — bottom-of-board button that lets the kid re-watch the
// catch-up journey. Tap = normal pace (~3× slower than the original
// fast pace; Reza & Krissie wanted to actually see the journey).
// Long-press OR right-click = extra-slow walk-pace (for enjoying the
// dino walk-cycle land on every space). Long-press fires on pointer-up
// after a 500ms hold; right-click fires onContextMenu. A small badge
// appears under the pill while holding so the gesture has feedback.
function ReplayPill({ onFast, onSlow }) {
  const [holding, setHolding] = useState(false);
  const heldRef = useRef(false);
  const timerRef = useRef(null);
  const onDown = (e) => {
    e.stopPropagation();
    heldRef.current = false;
    setHolding(true);
    timerRef.current = setTimeout(() => {
      heldRef.current = true;
    }, 500);
  };
  const finish = (e) => {
    e?.stopPropagation();
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    const wasHeld = heldRef.current;
    heldRef.current = false;
    setHolding(false);
    if (wasHeld) onSlow();
    else onFast();
  };
  const cancel = (e) => {
    e?.stopPropagation();
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    heldRef.current = false;
    setHolding(false);
  };
  return (
    <div className="absolute bottom-2 left-0 right-0 text-center z-40 pointer-events-none">
      <button
        type="button"
        onPointerDown={onDown}
        onPointerUp={finish}
        onPointerLeave={cancel}
        onPointerCancel={cancel}
        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onSlow(); }}
        className={`pointer-events-auto inline-flex items-center gap-1 text-[11px] font-extrabold px-3 py-1.5 rounded-full shadow-lg ${holding ? "bg-amber-300 text-slate-900 scale-105" : "bg-white/95 text-slate-900"} transition`}
        style={{
          WebkitTapHighlightColor: "transparent",
          border: 0,
          touchAction: "none",
          userSelect: "none",
        }}
        aria-label="Replay journey. Tap to walk it, hold or right-click for extra-slow."
      >
        {holding ? "🐢 Extra slow…" : "▶ Start again"}
      </button>
    </div>
  );
}

function BoardPop({ id, kind, label, sub, big }) {
  if (!id) return null;
  // BIG = first-time-board-cleared treasure payoff. Three knobs amp up
  // proportionally: piece count, throw distance, and an extra ray
  // flash behind the trophy emoji.
  const palette =
    kind === "treasure"
      ? ["#fde047", "#facc15", "#f59e0b", "#fb923c", "#22d3ee", "#a78bfa", "#f472b6", "#34d399"]
      : ["#22d3ee", "#a78bfa", "#f472b6", "#fde047", "#34d399"];
  const emojis = kind === "treasure"
    ? ["🏆", "✨", "⭐", "🎉", "💫", "🎊", "💎", "🌟"]
    : ["⭐", "✨", "🎉", "💫", "🚀"];
  const count = big ? 90 : kind === "treasure" ? 36 : 18;
  const burst = big ? "11rem" : kind === "treasure" ? "8rem" : "5rem";
  const throwRange = big ? 760 : kind === "treasure" ? 480 : 280;
  const pieces = [];
  for (let i = 0; i < count; i++) {
    const dx = (Math.random() - 0.5) * throwRange;
    const left = 50 + (Math.random() - 0.5) * (big ? 32 : 24);
    const top = 38 + (Math.random() - 0.5) * (big ? 24 : 18);
    pieces.push(
      <span
        key={i}
        className="absolute text-2xl"
        style={{
          left: `${left}%`,
          top: `${top}%`,
          color: palette[i % palette.length],
          ["--dx"]: `${dx}px`,
          animation: `bpConfetti ${900 + Math.random() * 900}ms ease-out ${i * (big ? 12 : 28)}ms forwards`,
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
        @keyframes bpBurstBig { 0% { transform: scale(0.2) rotate(-12deg); opacity: 0; } 22% { transform: scale(1.55) rotate(4deg); opacity: 1; } 55% { transform: scale(1.18) rotate(-2deg); opacity: 1; } 100% { transform: scale(1.05) rotate(0deg); opacity: 0; } }
        @keyframes bpRise { 0% { transform: translateY(8px); opacity: 0; } 15% { opacity: 1; } 100% { transform: translateY(-140px); opacity: 0; } }
        @keyframes bpConfetti { 0% { transform: translate(0, -10vh) rotate(0deg); opacity: 0; } 12% { opacity: 1; } 100% { transform: translate(var(--dx), 60vh) rotate(720deg); opacity: 0; } }
        @keyframes bpRays { 0% { transform: scale(0.4) rotate(0deg); opacity: 0; } 20% { opacity: 0.9; } 100% { transform: scale(1.6) rotate(180deg); opacity: 0; } }
      `}</style>
      {big && (
        <div
          aria-hidden="true"
          className="absolute"
          style={{
            width: 600, height: 600,
            background: "radial-gradient(circle, rgba(253,224,71,0.55) 0%, rgba(251,191,36,0.25) 35%, rgba(0,0,0,0) 70%)",
            animation: "bpRays 1800ms ease-out forwards",
            mixBlendMode: "screen",
          }}
        />
      )}
      <div
        className="drop-shadow-lg"
        style={{
          animation: big
            ? "bpBurstBig 2000ms ease-out forwards"
            : `bpBurst ${kind === "treasure" ? 1300 : 950}ms ease-out forwards`,
          fontSize: burst,
          filter: big ? "drop-shadow(0 0 24px rgba(253,224,71,0.85))" : undefined,
        }}
      >
        {kind === "treasure" ? "🏆" : "⭐"}
      </div>
      <div
        className="absolute font-extrabold text-amber-300"
        style={{
          animation: "bpRise 1400ms ease-out forwards",
          textShadow: "0 2px 14px rgba(0,0,0,0.55)",
          fontSize: big ? "2.6rem" : "1.5rem",
          top: big ? "62%" : undefined,
        }}
      >
        {label}
      </div>
      {sub && (
        <div
          className="absolute font-bold text-white"
          style={{
            animation: "bpRise 1400ms ease-out 80ms forwards",
            textShadow: "0 2px 10px rgba(0,0,0,0.6)",
            fontSize: big ? "1.1rem" : "0.875rem",
            marginTop: big ? "8rem" : "4rem",
          }}
        >
          {sub}
        </div>
      )}
      {pieces}
    </div>
  );
}

function SpaceMarker({ space, x, y, viewBoxH, onTap, theme, activities, pulseKey = 0, index, onWalkTo }) {
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
    } else if (theme.bgImg) {
      // Themed board with NO painted space-tile art — use a soft dark
      // disc + floating emoji so the painted background reads through.
      // Bright colored chips (like Volcano's orange) shout "UI" and
      // break immersion; this matches the subtle feel of Candy/Forest.
      // State cues stay via ring color + glow, not full chip color.
      size = "w-10 h-10 sm:w-12 sm:h-12";
      if (state === "completed") {
        bg = "radial-gradient(circle, rgba(16,185,129,0.92) 0%, rgba(4,120,87,0.78) 100%)";
        ring = "rgba(255,255,255,0.32)";
      } else {
        bg = "radial-gradient(circle, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.28) 78%, rgba(0,0,0,0.12) 100%)";
        ring = "rgba(255,255,255,0.22)";
      }
      if (state === "pending") { glow = true; ring = "#f59e0b"; }
      else if (state === "needs-fix") { glow = true; ring = "#ef4444"; }
      content = (
        <span className="text-xl sm:text-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)]">
          {emoji}
        </span>
      );
    } else {
      // Procedural board (Space Quest) — keep the bright colored chip.
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
        // 1.5px border on themed boards keeps the dark disc subtle
        // against painted artwork; 3px on procedural Space Quest where
        // the chip is the primary visual element.
        border: `${theme.bgImg ? 1.5 : 3}px solid ${ring}`,
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
        <button
          type="button"
          onClick={() => {
            // Completed spaces: walk the token there (replay journey).
            // All other states: open the task sheet so the kid can act.
            if (space.state === "completed" && onWalkTo) onWalkTo(index);
            else onTap?.(task);
          }}
          title={label}
          className="active:scale-95 focus:outline-none"
          style={{
            border: 0,
            padding: 0,
            background: "transparent",
            outline: "none",
            WebkitTapHighlightColor: "transparent",
          }}
        >
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

// Thin wrapper that handles asset preloading + theme resolution. Renders
// the loader while images decode, then swaps to BoardGameInner. This
// has to be a separate component because BoardGameInner has ~30+ hooks
// (useState/useRef/useEffect/useMemo) and an early return BEFORE those
// hooks would violate rules-of-hooks (React error #310: "Rendered fewer
// hooks than expected"). Mounting BoardGameInner only when ready means
// its hook count is stable across every render.
export default function BoardGame(props) {
  const theme = BOARD_THEMES[props.boardTheme] || BOARD_THEMES[DEFAULT_BOARD_THEME];
  const themeImageUrls = useMemo(() => {
    const urls = [];
    if (theme.bgImg) urls.push(theme.bgImg);
    if (theme.tokenImg) urls.push(theme.tokenImg);
    if (theme.tokenAltImg) urls.push(theme.tokenAltImg);
    if (Array.isArray(theme.tokenWalkImgs)) urls.push(...theme.tokenWalkImgs);
    if (theme.treasureLockedImg) urls.push(theme.treasureLockedImg);
    if (theme.treasureOpenImg) urls.push(theme.treasureOpenImg);
    if (theme.spaceImg) urls.push(theme.spaceImg);
    if (theme.startImg) urls.push(theme.startImg);
    return [...new Set(urls.filter(Boolean))];
  }, [theme]);
  const [assetsReady, setAssetsReady] = useState(themeImageUrls.length === 0);
  useEffect(() => {
    if (themeImageUrls.length === 0) {
      setAssetsReady(true);
      return;
    }
    setAssetsReady(false);
    let cancelled = false;
    // Parallel preload via Image() — populates the browser's HTTP cache
    // so subsequent CSS-background and <img> uses are instant.
    Promise.all(themeImageUrls.map((u) => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false); // broken file shouldn't block the loader forever
      img.src = u;
    }))).then(() => {
      if (!cancelled) setAssetsReady(true);
    });
    return () => { cancelled = true; };
  }, [themeImageUrls]);
  if (!assetsReady) return <BoardLoader theme={theme} />;
  return <BoardGameInner {...props} theme={theme} />;
}

function BoardGameInner({
  todaysTasks,
  todaysTopEight,
  compByTask,
  completions,
  activities,
  setOpenTask,
  user,
  boardTheme,
  boardDailyCap,
  theme,
}) {
  // Source of truth: parent-curated Top 8 in order. Falls back to the
  // wider todaysTasks only if no Top 8 is set (legacy / brand-new install
  // before bootstrap), preserving back-compat. When Top 8 is in play,
  // boardDailyCap is intentionally ignored — the Top 8 list IS the cap,
  // and it can grow past 8 if parents add ad-hoc items so the soft 8 is
  // a default expectation, not a hard limit.
  const hasTopEight = Array.isArray(todaysTopEight) && todaysTopEight.length > 0;
  const rawTasks = hasTopEight ? todaysTopEight : (todaysTasks || []);
  const safeTasks = (() => {
    if (hasTopEight) return rawTasks; // Top 8 is already the curated list.
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
  // For themed boards, the viewBox height matches the bg image's aspect
  // so waypoint coordinates align with painted pedestals 1:1. Each theme
  // declares bgAspect = (image height / image width). When missing we
  // default to 1.5 (a reasonable mobile-portrait ratio).
  const VIEWBOX_H = theme?.bgImg ? (theme.bgAspect || 1.5) * 100 : rowCount * 38;
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
  const boardRef = useRef(null); // inner board container — drag coord space
  const dragRef = useRef({ active: false, moved: false, pointerId: null });

  const [tokenXY, setTokenXY] = useState(() => {
    // Always start at the theme's START anchor so the token is
    // visually at START even if positions[0] is stale on first render.
    if (theme?.startAnchor) {
      return {
        x: theme.startAnchor.x,
        y: (theme.startAnchor.y / 100) * VIEWBOX_H,
      };
    }
    const p = positions[0] || { x: 50, y: VIEWBOX_H * 0.92 };
    return { x: p.x, y: p.y };
  });
  // Sync token to the canonical position whenever theme or viewBox
  // changes (e.g., parent switches themes, daily cap changes). Skipped
  // mid-animation so we don't snap-cut a moving token.
  useEffect(() => {
    if (animRef.current) return;
    const safeIdx = Math.min(Math.max(0, tokenIdxRef.current), positions.length - 1);
    const p = positions[safeIdx];
    if (p) setTokenXY({ x: p.x, y: p.y });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme?.id, VIEWBOX_H, positions.length]);
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
  // `isAnimating` mirrors animRef.current's lifetime in state so the
  // render layer (Replay button visibility, walk-cycle frame swap)
  // can react to it. Refs alone don't trigger re-renders.
  const [isAnimating, setIsAnimating] = useState(false);
  // Walk-cycle frame index. Flips between 0/1 every WALK_FRAME_MS
  // while `isAnimating` is true AND the theme provides tokenWalkImgs.
  // Themes without walk frames just keep showing the rest sprite —
  // a no-op for the frame-swap path.
  const [walkFrame, setWalkFrame] = useState(0);
  useEffect(() => {
    if (!isAnimating || !theme?.tokenWalkImgs) return;
    const id = setInterval(() => setWalkFrame((w) => (w === 0 ? 1 : 0)), 170);
    return () => clearInterval(id);
  }, [isAnimating, theme?.tokenWalkImgs]);
  // Token facing direction. Sprites are painted facing RIGHT by
  // convention; when motion turns left we mirror via scaleX(-1)
  // so the character always faces forward. Ref + state mirror —
  // ref for instant frame-to-frame compares (no render lag),
  // state for the actual transform.
  const [facing, setFacing] = useState("right");
  const facingRef = useRef("right");
  const lastTokenXRef = useRef(null);
  const updateFacingFromX = (newX) => {
    const prev = lastTokenXRef.current;
    lastTokenXRef.current = newX;
    if (prev == null) return;
    const dx = newX - prev;
    // Threshold avoids jitter on tiny path bobs (Q/C curves wiggle
    // ~0.5%) — only flip when motion is meaningfully directional.
    if (Math.abs(dx) < 0.4) return;
    const next = dx > 0 ? "right" : "left";
    if (next !== facingRef.current) {
      facingRef.current = next;
      setFacing(next);
    }
  };
  // Holds the post-land "cheer" timer so a quick re-launch cancels it
  // cleanly instead of double-flipping the flying state.
  const cheerTimerRef = useRef(null);
  // Treasure reveal gate. The chest stays VISUALLY locked even after
  // every task is approved — only flips open after the token actually
  // arrives at the treasure space and finishes its cheer animation.
  // The whole point: don't spoil the reveal. Reznor's first time
  // clearing the board (and every replay) gets the full "arrive →
  // animate → chest opens → big celebration" sequence in order.
  const [treasureRevealed, setTreasureRevealed] = useState(false);
  // Cancels in-flight reveal timers if the kid taps undo on the last
  // task mid-reveal — keeps state consistent.
  const revealTimerRef = useRef(null);

  const triggerTreasureReveal = () => {
    // Sequence:
    //  t=0           token has just snapped to BESIDE the chest. The
    //                animateAlong end-frame already started the cheer
    //                (alt sprite + 650ms timer).
    //  t≈700ms       chest opens (treasureRevealed → true)
    //  t≈700ms       multi-SFX chime chain + heavy haptic + BoardPop
    //                with extra confetti density. The audio chain
    //                (treasure→streak→levelUp) reads as a "bell, then
    //                fanfare" without writing new SFX code.
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    revealTimerRef.current = setTimeout(() => {
      setTreasureRevealed(true);
      juice.haptic("success");
      juice.sfx("treasure");
      setTimeout(() => juice.sfx("streak"), 260);
      setTimeout(() => juice.sfx("levelUp"), 560);
      setPop({
        id: Date.now(),
        kind: "treasure",
        label: "TREASURE!!! 🏆",
        sub: "You did the WHOLE board!",
        big: true,
      });
    }, 700);
  };

  // Token tap — Reznor loves making the dragon/butterfly/lollipop do
  // its thing on demand. Each tap fires the alt-sprite crossfade for
  // 600ms + plays a soft tap chime. Independent from animateAlong, so
  // it works any time the token is at rest. If the token is already
  // mid-cheer/mid-fly, the timer is just reset.
  const onTokenTap = () => {
    juice.haptic("light");
    juice.sfx("tap");
    if (cheerTimerRef.current) clearTimeout(cheerTimerRef.current);
    setFlying(true);
    cheerTimerRef.current = setTimeout(() => setFlying(false), 600);
  };

  // Drag-the-token: Reznor can grab the token and slide it up/down the
  // completed path. Pointer Y maps to nearest chip index in [0,targetIdx]
  // (treasure included once unlocked). On release, the index snaps to
  // the nearest chip and the token sits there — no animation needed,
  // the drag itself IS the animation. Cancels any running animateAlong
  // so we never fight the catch-up replay.
  const dragNearestIdx = (clientX, clientY) => {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const xPct = ((clientX - rect.left) / rect.width) * 100;
    const yViewBox = ((clientY - rect.top) / rect.height) * VIEWBOX_H;
    const maxIdx = Math.min(targetIdx, positions.length - 1);
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i <= maxIdx; i++) {
      const dx = positions[i].x - xPct;
      const dy = positions[i].y - yViewBox;
      const d = dx * dx + dy * dy;
      if (d < bestDist) { bestDist = d; best = i; }
    }
    return best;
  };
  const onTokenPointerDown = (e) => {
    // Only draggable once the catch-up replay has fired (otherwise the
    // launch tap is consumed) AND there's somewhere to drag TO.
    if (!launched || targetIdx <= 0) return;
    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
      setIsAnimating(false);
    }
    e.stopPropagation();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    dragRef.current = { active: true, moved: false, pointerId: e.pointerId };
    juice.haptic("light");
  };
  const onTokenPointerMove = (e) => {
    if (!dragRef.current.active) return;
    if (e.pointerId !== dragRef.current.pointerId) return;
    const idx = dragNearestIdx(e.clientX, e.clientY);
    if (idx == null) return;
    dragRef.current.moved = true;
    if (idx !== tokenIdxRef.current) {
      tokenIdxRef.current = idx;
      const p = positions[idx];
      updateFacingFromX(p.x);
      setTokenXY({ x: p.x, y: p.y });
      // Soft tick haptic on each chip cross so the drag feels physical.
      juice.haptic("light");
    }
  };
  const onTokenPointerUp = (e) => {
    if (!dragRef.current.active) return;
    if (e.pointerId !== dragRef.current.pointerId) return;
    const wasDragged = dragRef.current.moved;
    dragRef.current = { active: false, moved: false, pointerId: null };
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
    if (wasDragged) {
      // Land cheer on whichever chip we ended on.
      e.stopPropagation();
      setFlying(true);
      if (cheerTimerRef.current) clearTimeout(cheerTimerRef.current);
      cheerTimerRef.current = setTimeout(() => setFlying(false), 600);
      juice.sfx("tap");
    } else {
      // No drag → it's a tap; fire the tap-cheer.
      onTokenTap();
    }
  };

  // Replay journey — Reznor's "Start again" button. Snaps the token
  // back to START, then walks through every completed space to
  // wherever the canonical position currently is. Pure visual,
  // no data changes, no celebration replay (so it can be re-run
  // without re-firing the treasure pop — that lives on its own gate).
  //
  // mode = "normal" (default tap) → ~1200ms/space, soft cap 30s. Reza
  //                                  and Krissie want to enjoy the
  //                                  token landing on each space; the
  //                                  earlier 9s cap was averaging the
  //                                  per-space pace right back to the
  //                                  old fast feel on longer boards.
  //                                  The cap now is just a safety
  //                                  upper bound, not a target.
  //        "slow" (long-press / right-click) → ~2400ms/space, soft cap
  //                                60s. Full cinematic walk-cycle pass.
  const replayJourney = (mode = "normal") => {
    if (isAnimating) return;
    if (targetIdx === 0) return;
    tokenIdxRef.current = 0;
    const p0 = positions[0];
    if (p0) setTokenXY({ x: p0.x, y: p0.y });
    juice.haptic("light");
    juice.sfx("swipe");
    const perSpace = mode === "slow" ? 2400 : 1200;
    const cap     = mode === "slow" ? 60000 : 30000;
    const base    = mode === "slow" ? 1800 : 1200;
    setTimeout(() => {
      animateAlong(0, targetIdx, {
        duration: Math.min(cap, base + targetIdx * perSpace),
      });
    }, 280);
  };

  // Walk-the-token: tapping a COMPLETED space animates the token from
  // wherever it currently is back to that space. Reznor can replay his
  // own journey — up to but not past the last canonical completion.
  // No data mutation; this is pure visual exploration.
  //
  // Speeds match the new replayJourney baseline (~3× slower than the
  // original) — Reza and Krissie said the old fast pace was too quick
  // to watch the walk cycle land on each space.
  const walkToCompleted = (toIdx) => {
    if (toIdx < 0 || toIdx >= spaces.length) return;
    // Guard: never move past targetIdx (the canonical "real" position).
    if (toIdx > targetIdx) return;
    if (toIdx === tokenIdxRef.current) {
      // Already there — just animate in place via tap-cheer.
      onTokenTap();
      return;
    }
    // Speed scales with distance — ~1200ms per space matches the new
    // replayJourney pace so a tap-to-walk and the full replay feel
    // like the same animation, just different lengths.
    const dist = Math.abs(toIdx - tokenIdxRef.current);
    animateAlong(tokenIdxRef.current, toIdx, {
      duration: Math.min(18000, 900 + dist * 1200),
    });
  };

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

  // Camera follow — keep the destination centered while the token
  // animates so the kid never scrolls and misses the treasure opening
  // (or any landing on a tall portrait bg). The board is taller than
  // the viewport on most phones; without this, a 700ms animation
  // could end with the chest entirely off-screen above.
  const scrollToBoardY = (boardYPct) => {
    const board = boardRef.current;
    if (!board) return;
    let scrollEl = board.parentElement;
    while (scrollEl && scrollEl !== document.body) {
      const cs = window.getComputedStyle(scrollEl);
      if (cs.overflowY === "auto" || cs.overflowY === "scroll") break;
      scrollEl = scrollEl.parentElement;
    }
    if (!scrollEl) return;
    const boardRect = board.getBoundingClientRect();
    const scrollRect = scrollEl.getBoundingClientRect();
    const boardY = boardRect.height * boardYPct;
    const targetInScroll = (boardRect.top - scrollRect.top) + boardY;
    // Put the focal point ~45% from the top of the visible area so
    // there's still some "look-ahead" room above. Pure center reads
    // too tight when the token is approaching the top of the board.
    const visibleH = scrollRect.height;
    const desiredScrollTop = scrollEl.scrollTop + targetInScroll - visibleH * 0.45;
    const maxScroll = scrollEl.scrollHeight - visibleH;
    const clamped = Math.max(0, Math.min(maxScroll, desiredScrollTop));
    try {
      scrollEl.scrollTo({ top: clamped, behavior: "smooth" });
    } catch {
      scrollEl.scrollTop = clamped;
    }
  };

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
    // Camera follow: kick off a smooth scroll toward the destination at
    // the START of the animation. The browser's native smooth-scroll
    // runs concurrent with our token rAF — the page pans up while the
    // token climbs the path, both arriving together. Critical for the
    // treasure reveal on tall portrait bgs (volcano/dino/water/sky etc.):
    // without this the chest opens off-screen above the viewport.
    const dest = positions[toIdx];
    if (dest) scrollToBoardY(dest.y / VIEWBOX_H);
    setIsAnimating(true);
    setFlying(true);
    const pathEl = pathRef.current;
    const total = pathEl.getTotalLength();
    const lenAt = (idx) => total * (idx / (positions.length - 1));
    const startLen = lenAt(fromIdx);
    const endLen = lenAt(toIdx);
    const startedAt = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - startedAt) / duration);
      // Linear pacing — every space gets equal time. The previous
      // cubic ease-out made the token cover ~70% of the path in the
      // first 30% of time, so even a 30-second sweep felt fast at
      // the start. For Reza & Krissie's "watch it land on each
      // space" experience we want constant velocity.
      const eased = t;
      const len = startLen + (endLen - startLen) * eased;
      const pt = pathEl.getPointAtLength(len);
      updateFacingFromX(pt.x);
      setTokenXY({ x: pt.x, y: pt.y });
      if (t < 1) {
        animRef.current = requestAnimationFrame(tick);
      } else {
        animRef.current = null;
        setIsAnimating(false);
        tokenIdxRef.current = toIdx;
        // SNAP to the exact chip position. EXCEPTION: treasure
        // landing — the chest is the visual hero, so the token
        // sits BESIDE it (offset down-left) instead of ON it.
        // For every other space, snap-on-chip prevents the
        // "stuck between two tiles" bug from v4.4.
        const dest = positions[toIdx];
        const isTreasureLand = spaces[toIdx]?.kind === "treasure";
        const final = isTreasureLand && dest
          ? { x: Math.max(10, dest.x - 22), y: Math.min(VIEWBOX_H * 0.99, dest.y + 6) }
          : dest;
        if (final) setTokenXY({ x: final.x, y: final.y });
        setFlying(false);
        // "Made it!" cheer — flip the token back to its alt sprite
        // for 650ms after the move finishes so every successful
        // arrival has a visible celebration (every submit, every
        // tap-to-walk). Cancelled if another animateAlong starts.
        if (cheerTimerRef.current) clearTimeout(cheerTimerRef.current);
        setFlying(true);
        cheerTimerRef.current = setTimeout(() => setFlying(false), 650);
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
      // Catch-up sweep — matches replayJourney "normal" pace so the
      // first impression of the board doesn't blast past every space
      // in a half-second. Reza and Krissie called this out: tap to
      // replay was perfect speed, but the launch catch-up was still
      // the old fast pace and made them think the slow setting hadn't
      // landed.
      animateAlong(0, targetIdx, {
        duration: Math.min(30000, 1200 + targetIdx * 1200),
        onLand: () => {
          seenIdsRef.current = new Set(approvedIds);
          // Catch-up reloads still need the full payoff at the end.
          // If we landed on treasure, fire the reveal sequence here
          // too — chest opens + celebration play after the cheer.
          if (spaces[targetIdx]?.kind === "treasure") {
            triggerTreasureReveal();
          }
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

    // Animate to the new last-completed space and pop once. Pace
    // matches replayJourney "normal" so a freshly approved chore
    // delivers the same satisfying walk every time, instead of
    // snapping the token a quarter-second ahead.
    animateAlong(tokenIdxRef.current, targetIdx, {
      duration: Math.min(6000, 900 + Math.max(0, targetIdx - tokenIdxRef.current) * 1200),
      onLand: () => {
        const landed = spaces[targetIdx];
        // Pulse the space the rocket just arrived on — visible
        // "you made it here" feedback. The timestamp is the key so
        // back-to-back landings on the same space (rare; would be
        // an undo→redo) each re-trigger the pulse.
        setLastLanded({ idx: targetIdx, t: Date.now() });
        if (landed?.kind === "treasure") {
          // Treasure landing — DON'T pop/celebrate yet. The full
          // reveal sequence (closed chest → token cheer → chest
          // opens → big celebration) is handled by
          // triggerTreasureReveal so the sequence stays in order
          // every time.
          triggerTreasureReveal();
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

  // Reset the chest-open gate when the board's no-longer-fully-done
  // (e.g., a parent undoes one of today's approvals, or a new task
  // gets added). Means a future re-arrival plays the full reveal
  // sequence again — no stuck-open chest after an undo.
  useEffect(() => {
    if (spaces[spaces.length - 1]?.state !== "treasure-open") {
      setTreasureRevealed(false);
    }
  }, [spaces]);

  // Auto-clear the pop after its CSS animation finishes. The big
  // treasure variant hangs around longer — that's the moment Mom and
  // Dad get the screenshot, the kid's eyes are wide, give it room.
  useEffect(() => {
    if (!pop) return;
    const ms = pop.big ? 3400 : pop.kind === "treasure" ? 2200 : 1500;
    const t = setTimeout(() => setPop(null), ms);
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
      className="relative overflow-hidden"
      style={{
        // Outer hugs the inner board EXACTLY — no min-h-screen, no
        // padding-bottom. Previously those two together forced the
        // outer to be taller than the inner, exposing a slab of
        // solid theme-gradient color BELOW the painted scene
        // ("off the board" in the user's words). The fixed
        // BottomNav at viewport z-50 already supplies its own
        // clearance via the scroll container's pb-24; we don't
        // need extra room here. Inner board ends → painted scene
        // ends → BottomNav overlays the last sliver.
        background: theme.background,
        fontFamily: "ui-rounded, 'SF Pro Rounded', system-ui, sans-serif",
        WebkitTapHighlightColor: "transparent",
        WebkitUserSelect: "none",
        userSelect: "none",
      }}
    >
      {/* Procedural starfield — only renders when there's no painted
          bg. With Space Quest now using a painted starfield bg, the
          random white dots would just be noise on top of art. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ display: theme.bgImg ? "none" : undefined }}>
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

      <div
        ref={boardRef}
        className="relative z-10 w-full overflow-hidden"
        style={{
          // Full-bleed: no maxWidth, no borderRadius. The map IS the
          // viewport's playable surface, edge-to-edge. The earlier
          // 520px-centered tile created dark gradient bars at every
          // wider screen size — full-bleed is what the user means by
          // "the bg image covered the entire board area, bleeding to
          // all edges." Every theme, present and future, lands the
          // same way through this branch — no per-theme overrides
          // needed for layout.
          aspectRatio: `100 / ${VIEWBOX_H}`,
          // cover (vs 100% 100%) gracefully handles the cases where
          // the viewport aspect-ratio rounding doesn't perfectly
          // match the bg's bgAspect. cover always fills the frame,
          // cropping as needed; chips still land at viewBox % coords
          // because the container's aspect matches the bg's aspect
          // 1:1, so the crop is zero in the common case.
          background: theme.bgImg
            ? `url(${theme.bgImg}) center / cover no-repeat, ${theme.background}`
            : undefined,
          outline: "none",
          WebkitTapHighlightColor: "transparent",
        }}
        onClick={launchNow}
      >
        {/* Minimal chrome header. The big "Daily Adventure" banner
            used to sit here and overlap the treasure art at the top
            of the board (the Dragon's Hoard / Cloud Citadel / etc.
            are all painted near y=12-14% — a multi-line title
            sitting at top would cover the chest). Now: just a single
            tight line — theme name • progress — held at the very
            top edge with a soft text-shadow. The art is the hero. */}
        <div
          className="absolute top-1 left-0 right-0 text-center z-20 pointer-events-none px-3 flex items-center justify-center gap-2"
          style={{ textShadow: "0 1px 6px rgba(0,0,0,0.75)" }}
        >
          <span className="text-[10px] uppercase tracking-[0.18em] text-white/90 font-extrabold">
            {theme.name}
          </span>
          <span className="text-white/40 text-[10px]">·</span>
          <span className="text-[10px] text-white font-bold">
            {doneCount} of {safeTasks.length} cleared
            {pendingCount > 0 ? ` · ${pendingCount} ⏳` : ""}
          </span>
        </div>
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

        {spaces.map((s, i) => {
          // Treasure space holds its CLOSED art until the token has
          // arrived + cheered. The canonical `spaces` array still
          // says "treasure-open" once everything's approved (that's
          // the data truth used to decide WHEN the reveal fires),
          // but the rendered chip stays locked-looking until
          // `treasureRevealed` flips. No spoiler.
          const renderSpace = (s.kind === "treasure" && !treasureRevealed)
            ? { ...s, state: "treasure-locked" }
            : s;
          return (
            <SpaceMarker
              key={`${s.kind}-${s.task?.id || s.kind}-${i}`}
              space={renderSpace}
              x={positions[i].x}
              y={positions[i].y}
              viewBoxH={VIEWBOX_H}
              onTap={setOpenTask}
              theme={theme}
              activities={activities}
              pulseKey={lastLanded.idx === i ? lastLanded.t : 0}
              index={i}
              onWalkTo={walkToCompleted}
            />
          );
        })}

        {/* Chest-anchored sparkles. Renders ONLY when the reveal gate
            flips, layered over the open-chest art at the treasure
            space's exact position. Adds to (not replaces) the existing
            fullscreen BoardPop burst. Reads as light/magic radiating
            out of the chest itself — the "this thing just opened up
            and treasure is pouring out" moment. */}
        {treasureRevealed && positions.length > 0 && (() => {
          const treasureIdx = spaces.length - 1;
          const p = positions[treasureIdx];
          if (!p) return null;
          const leftPct = p.x;
          const topPct = (p.y / VIEWBOX_H) * 100;
          const sparkles = [];
          const sparkleEmojis = ["✨", "⭐", "💫", "🌟", "💎", "🎉"];
          for (let i = 0; i < 18; i++) {
            const angle = (i / 18) * Math.PI * 2 + Math.random() * 0.4;
            const dist = 40 + Math.random() * 40;
            const dx = Math.cos(angle) * dist;
            const dy = Math.sin(angle) * dist - 18; // bias upward
            sparkles.push(
              <span
                key={i}
                className="absolute text-xl"
                style={{
                  left: 0, top: 0,
                  transform: "translate(-50%, -50%)",
                  ["--dx"]: `${dx}px`,
                  ["--dy"]: `${dy}px`,
                  animation: `chestSpark ${1200 + Math.random() * 700}ms ease-out ${i * 35}ms forwards`,
                  willChange: "transform, opacity",
                  textShadow: "0 0 6px rgba(253,224,71,0.7)",
                  pointerEvents: "none",
                }}
              >
                {sparkleEmojis[i % sparkleEmojis.length]}
              </span>
            );
          }
          return (
            <div
              aria-hidden="true"
              className="absolute pointer-events-none"
              style={{
                left: `${leftPct}%`,
                top: `${topPct}%`,
                width: 0, height: 0,
                zIndex: 18,
              }}
            >
              <style>{`
                @keyframes chestSpark {
                  0%   { transform: translate(-50%, -50%) scale(0.4); opacity: 0; }
                  20%  { opacity: 1; }
                  100% { transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(1.1) rotate(360deg); opacity: 0; }
                }
                @keyframes chestGlow {
                  0%   { transform: translate(-50%, -50%) scale(0.4); opacity: 0; }
                  35%  { transform: translate(-50%, -50%) scale(1.6); opacity: 0.85; }
                  100% { transform: translate(-50%, -50%) scale(2.4); opacity: 0; }
                }
                @keyframes chestRay {
                  0%   { transform: translate(-50%, -50%) scale(0.5) rotate(0deg); opacity: 0; }
                  40%  { opacity: 0.6; }
                  100% { transform: translate(-50%, -50%) scale(1.4) rotate(180deg); opacity: 0; }
                }
              `}</style>
              {/* Soft golden glow disc behind the chest */}
              <div
                className="absolute rounded-full"
                style={{
                  left: 0, top: 0,
                  width: 180, height: 180,
                  background: "radial-gradient(circle, rgba(253,224,71,0.75) 0%, rgba(251,191,36,0.35) 45%, rgba(0,0,0,0) 70%)",
                  animation: "chestGlow 1800ms ease-out forwards",
                  mixBlendMode: "screen",
                }}
              />
              {/* Rotating ray flare */}
              <div
                className="absolute"
                style={{
                  left: 0, top: 0,
                  width: 220, height: 220,
                  background: "conic-gradient(from 0deg, rgba(253,224,71,0) 0deg, rgba(253,224,71,0.5) 20deg, rgba(253,224,71,0) 40deg, rgba(253,224,71,0) 60deg, rgba(253,224,71,0.5) 80deg, rgba(253,224,71,0) 100deg, rgba(253,224,71,0) 120deg, rgba(253,224,71,0.5) 140deg, rgba(253,224,71,0) 160deg, rgba(253,224,71,0) 180deg, rgba(253,224,71,0.5) 200deg, rgba(253,224,71,0) 220deg, rgba(253,224,71,0) 240deg, rgba(253,224,71,0.5) 260deg, rgba(253,224,71,0) 280deg, rgba(253,224,71,0) 300deg, rgba(253,224,71,0.5) 320deg, rgba(253,224,71,0) 340deg)",
                  borderRadius: "50%",
                  animation: "chestRay 2000ms ease-out forwards",
                  mixBlendMode: "screen",
                }}
              />
              {sparkles}
            </div>
          );
        })()}

        <div
          className="absolute"
          style={{
            left: `${tokenLeftPct}%`,
            top: `${tokenTopPct}%`,
            // scaleX(-1) mirrors the sprite when walking leftward so
            // the character always faces the direction of travel. The
            // existing 80ms transition does a quick "squish-and-flip"
            // through scaleX 1 → 0 → -1 that reads naturally as a
            // turn-around. Sprites are painted facing RIGHT by
            // convention; flip only on left motion.
            transform: `translate(-50%, -50%) scaleX(${facing === "left" ? -1 : 1})`,
            zIndex: 20,
            transition: "transform 80ms linear",
            // Wrapper itself doesn't capture pointer — only the inner
            // button does, so non-button area (the 80×80 hit zone
            // around the token) still lets chip-taps + drags pass.
            pointerEvents: "none",
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
          {/* Token: tap to animate, DRAG (after launch) to slide up/down
              the completed path. Drag handlers convert pointer-Y to the
              nearest chip index in [0,targetIdx]. Pre-launch the parent
              container's onClick handles launchNow; we just guard. */}
          <button
            type="button"
            onPointerDown={(e) => {
              if (!launched) { return; }
              onTokenPointerDown(e);
            }}
            onPointerMove={onTokenPointerMove}
            onPointerUp={onTokenPointerUp}
            onPointerCancel={onTokenPointerUp}
            onClick={(e) => {
              e.stopPropagation();
              // PRE-LAUNCH: tapping the character launches the catch-up
              // replay. This is the FUN cue — kid sees the pulsing,
              // glowing dragon/fairy/shark and naturally taps it.
              if (!launched) {
                launchNow();
                return;
              }
              // POST-LAUNCH: pointer-up handler already decides tap vs
              // drag (drag triggers cheer; tap fires onTokenTap). Just
              // swallow the click so the outer container's launchNow
              // doesn't re-fire on every tap.
            }}
            className="text-5xl sm:text-6xl drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)] relative active:scale-95 transition-transform"
            aria-label="Tap or drag your character"
            style={{
              animation:
                !launched && targetIdx > 0
                  ? "rocketReady 900ms ease-in-out infinite"
                  : "rocketHover 2400ms ease-in-out infinite",
              filter:
                !launched && targetIdx > 0
                  ? "drop-shadow(0 0 18px rgba(253,224,71,0.7))"
                  : undefined,
              cursor: launched && targetIdx > 0 ? "grab" : "pointer",
              border: 0,
              padding: 0,
              background: "transparent",
              touchAction: "none", // pointer drag instead of browser scroll
              pointerEvents: "auto", // re-enable: parent wrapper is none
              outline: "none",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {theme.tokenRestImg ? (
              <div className="relative w-20 h-20 sm:w-24 sm:h-24">
                {/* Layered token frames. Z-order top to bottom:
                    1. Walk-cycle frames (only visible WHILE moving) —
                       fully replaces rest+fly during animation. Both
                       frames mount; we toggle opacity so the swap
                       between them is instant (no transition) — that's
                       the cadence that sells "running."
                    2. Rest sprite (idle).
                    3. Fly/alt sprite (cheer crossfade on tap + on land). */}
                <img
                  src={theme.tokenRestImg}
                  alt=""
                  draggable={false}
                  className="absolute inset-0 w-full h-full object-contain transition-opacity duration-200 ease-out"
                  style={{
                    opacity: (isAnimating && theme.tokenWalkImgs)
                      ? 0
                      : (flying && theme.tokenFlyImg ? 0 : 1),
                  }}
                />
                {theme.tokenFlyImg && (
                  <img
                    src={theme.tokenFlyImg}
                    alt=""
                    draggable={false}
                    className="absolute inset-0 w-full h-full object-contain transition-opacity duration-200 ease-out"
                    style={{
                      opacity: (isAnimating && theme.tokenWalkImgs) ? 0 : (flying ? 1 : 0),
                    }}
                  />
                )}
                {theme.tokenWalkImgs && theme.tokenWalkImgs.map((src, i) => (
                  <img
                    key={src}
                    src={src}
                    alt=""
                    draggable={false}
                    className="absolute inset-0 w-full h-full object-contain"
                    style={{
                      opacity: isAnimating && walkFrame === i ? 1 : 0,
                    }}
                  />
                ))}
              </div>
            ) : (
              theme.tokenEmoji
            )}
          </button>
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
              👆 Tap your character to launch!
            </div>
          </div>
        )}

        {/* Start again — Reznor's replay button.
              - Tap          → FAST replay (default; Reznor's pick)
              - Long-press   → SLOW walk replay (hold ≥ 500ms then release)
              - Right-click  → SLOW walk replay (desktop alternate)
            The slow mode lets Mike (or anyone) enjoy the journey at
            stride pace — useful when there's a dino theme with the
            running animation to watch. */}
        {launched && targetIdx > 0 && !isAnimating && (
          <ReplayPill onFast={() => replayJourney("normal")} onSlow={() => replayJourney("slow")} />
        )}
      </div>

      {pop && <BoardPop id={pop.id} kind={pop.kind} label={pop.label} sub={pop.sub} big={pop.big} />}
    </div>
  );
}
