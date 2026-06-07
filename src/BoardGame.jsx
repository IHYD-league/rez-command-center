import React, { useEffect, useMemo, useRef, useState } from "react";
import { Lock } from "lucide-react";

/* =====================================================================
   BoardGame — Daily Adventure Board, Phase 2.

   What changed from Phase 1 (ARCHITECTURE compliant — see BOARD-GAME.md):
     - Layout: grid → connected winding PATH. One trail from a START
       marker, snaking through task spaces, ending at the TREASURE.
       Spaces sit ON the path; SVG draws the trail behind them.
     - Token animates: when canonical data says the kid has cleared a
       new space, the rocket smoothly travels along the SVG path from
       its old position (board_state.lastPosition) to the new position
       (computed from compByTask). Uses path.getPointAtLength so it
       follows the curve, not a straight line.
     - Celebrations fire on landing — small board-flavored confetti for
       a space, big treasure-flavored celebration for the final space.
     - One new table: board_state (per-profile lastPosition +
       treasureClaimedOn). Nothing else changes.

   Still pure-skin over canonical data:
     - Task list, completion status, stars, streaks, approvals — all
       read from props. submitTask is the only mutation path on tap.
     - Token position the kid SHOULD be at is recomputed from
       canonical compByTask every render. board_state only remembers
       where the token WAS so we can animate the diff.
     - Removing board_state would leave the rest of the app working.
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

// Build the list of "logical" spaces from canonical task data.
// Index 0 = START marker. Indices 1..N = task spaces (required first,
// extras last). Index N+1 = TREASURE. All state derived from compByTask
// + the task's required flag; nothing stored here.
function deriveSpaces({ todaysTasks, compByTask }) {
  const required = todaysTasks.filter((t) => t.required);
  const extras = todaysTasks.filter((t) => !t.required);

  let currentTaskId = null;
  for (const t of [...required, ...extras]) {
    if ((compByTask[t.id]?.status || null) !== "approved") {
      currentTaskId = t.id;
      break;
    }
  }

  const out = [{ kind: "start", state: "start" }];

  for (let i = 0; i < required.length; i++) {
    const t = required[i];
    const c = compByTask[t.id];
    let locked = false;
    if (i > 0) {
      const prev = required[i - 1];
      const pc = compByTask[prev.id];
      const submitted = pc?.status === "approved" || pc?.status === "pending";
      if (!submitted) locked = true;
    }
    const state = locked
      ? "locked"
      : c?.status === "approved"
      ? "completed"
      : c?.status === "pending"
      ? "pending"
      : c?.status === "needs_fix"
      ? "needs-fix"
      : t.id === currentTaskId
      ? "current"
      : "available";
    out.push({ kind: "task", task: t, state });
  }
  for (const t of extras) {
    const c = compByTask[t.id];
    const state =
      c?.status === "approved"
        ? "completed"
        : c?.status === "pending"
        ? "pending"
        : c?.status === "needs_fix"
        ? "needs-fix"
        : t.id === currentTaskId
        ? "current"
        : "available";
    out.push({ kind: "task", task: t, state });
  }

  const allApproved = todaysTasks.length > 0 && todaysTasks.every(
    (t) => compByTask[t.id]?.status === "approved"
  );
  out.push({ kind: "treasure", state: allApproved ? "treasure-open" : "treasure-locked" });

  return out;
}

// Distribute the spaces along a winding snake path. Returns positions in
// SVG viewBox units (0..100 x, 0..VIEWBOX_H y).
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

// Build an SVG path string: straight-ish along rows, U-turns between rows.
function buildPathD(positions) {
  if (positions.length === 0) return "";
  let d = `M ${positions[0].x} ${positions[0].y}`;
  for (let i = 1; i < positions.length; i++) {
    const prev = positions[i - 1];
    const curr = positions[i];
    const sameRow = Math.abs(prev.y - curr.y) < 0.5;
    if (sameRow) {
      // Within a row — a gentle horizontal arc so it doesn't look ruler-straight.
      const mx = (prev.x + curr.x) / 2;
      const my = prev.y - 1.5;
      d += ` Q ${mx} ${my} ${curr.x} ${curr.y}`;
    } else {
      // Between rows — a U-curve that swings outward off the edge.
      const right = prev.x > 50;
      const outX = right ? Math.min(95, prev.x + 12) : Math.max(5, prev.x - 12);
      const c1 = { x: outX, y: prev.y };
      const c2 = { x: outX, y: curr.y };
      d += ` C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${curr.x} ${curr.y}`;
    }
  }
  return d;
}

// Small lightweight confetti when the token lands on a space. Distinct
// from KidGameHome's MissionCelebration so the board has its own feel.
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
        @keyframes bpBurst {
          0%   { transform: scale(0.25); opacity: 0; }
          30%  { transform: scale(1.35); opacity: 1; }
          70%  { transform: scale(1.08); opacity: 0.95; }
          100% { transform: scale(1); opacity: 0; }
        }
        @keyframes bpRise {
          0%   { transform: translateY(8px); opacity: 0; }
          15%  { opacity: 1; }
          100% { transform: translateY(-140px); opacity: 0; }
        }
        @keyframes bpConfetti {
          0%   { transform: translate(0, -10vh) rotate(0deg); opacity: 0; }
          12%  { opacity: 1; }
          100% { transform: translate(var(--dx), 55vh) rotate(720deg); opacity: 0; }
        }
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
        style={{
          animation: "bpRise 1200ms ease-out forwards",
          textShadow: "0 2px 14px rgba(0,0,0,0.45)",
        }}
      >
        {label}
      </div>
      {sub && (
        <div
          className="absolute text-sm font-bold text-white/90 mt-16"
          style={{
            animation: "bpRise 1200ms ease-out 80ms forwards",
            textShadow: "0 2px 10px rgba(0,0,0,0.5)",
          }}
        >
          {sub}
        </div>
      )}
      {pieces}
    </div>
  );
}

// SpaceMarker — renders one node on the path. Positions itself absolutely
// using SVG-unit coordinates translated to %.
function SpaceMarker({ space, x, y, viewBoxH, onTap, theme, activities }) {
  const { kind, state, task } = space;
  const xPct = x; // viewBox x is 0..100
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
    // task
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
      locked: { bg: "rgba(255,255,255,0.06)", opacity: 0.45, ring: "rgba(255,255,255,0.12)" },
      available: { bg: color, opacity: 1, ring: "rgba(255,255,255,0.4)" },
      current: { bg: color, opacity: 1, ring: "rgba(255,255,255,0.9)" },
      pending: { bg: color, opacity: 0.92, ring: "#f59e0b" },
      completed: { bg: "#0f5132", opacity: 0.7, ring: "rgba(255,255,255,0.2)" },
      "needs-fix": { bg: color, opacity: 0.92, ring: "#ef4444" },
    };
    const p = palette[state] || palette.available;
    bg = p.bg;
    ring = p.ring;
    tappable = state !== "locked";
    glow = state === "current";

    content =
      state === "locked" ? (
        <Lock size={18} className="text-white/40" />
      ) : (
        <span className="text-2xl sm:text-3xl">{emoji}</span>
      );

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

    labelClass = state === "locked" ? "text-white/35" : "text-white";
  }

  const inner = (
    <div
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
        <button
          type="button"
          onClick={() => onTap?.(task)}
          title={label}
          className="active:scale-95"
        >
          {inner}
        </button>
      ) : (
        inner
      )}
      <div
        className={`text-[10px] sm:text-[11px] font-bold text-center mt-1.5 leading-tight ${labelClass}`}
        style={{ maxWidth: 96 }}
      >
        {label}
      </div>
    </div>
  );
}

export default function BoardGame({
  todaysTasks,
  compByTask,
  activities,
  setOpenTask,
  user,
  boardState,
  setBoardLastPosition,
  setTreasureClaimed,
}) {
  const theme = SPACE_QUEST;

  // Stable star sprites for the bg.
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

  const safeTasks = todaysTasks || [];
  const safeComp = compByTask || {};

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

  const spaces = deriveSpaces({ todaysTasks: safeTasks, compByTask: safeComp });

  // Target index — where the token SHOULD be right now per canonical
  // compByTask. Conceptually: the last index whose space is in a "done"
  // bucket (approved). The token sits ON that done space; the NEXT space
  // is the one being worked on (current). Treasure is the absolute end.
  const targetIdx = useMemo(() => {
    // Index 0 = START. Token sits on START if nothing is approved yet.
    let lastDoneIdx = 0;
    for (let i = 1; i < spaces.length; i++) {
      const s = spaces[i];
      if (s.kind === "task" && s.state === "completed") lastDoneIdx = i;
    }
    // If everything is approved (treasure-open), park the token on the treasure.
    if (spaces[spaces.length - 1].state === "treasure-open") {
      lastDoneIdx = spaces.length - 1;
    }
    return lastDoneIdx;
  }, [spaces]);

  // Sizing — vertical board, scrolls if needed. Aspect chosen for mobile.
  const rowCount = Math.max(1, Math.ceil(spaces.length / 3));
  const VIEWBOX_H = rowCount * 38; // viewBox height in svg units
  const positions = useMemo(() => calcPositions(spaces.length, VIEWBOX_H), [spaces.length, VIEWBOX_H]);
  const pathD = useMemo(() => buildPathD(positions), [positions]);

  // We measure the rendered path in PIXELS so the token's x/y use the
  // same coordinate system as the SVG (after preserveAspectRatio=none
  // stretching). That way getPointAtLength gives us positions in
  // viewBox units we can convert to %.
  const pathRef = useRef(null);
  const containerRef = useRef(null);

  // Token state — animated x,y in viewBox-unit space.
  const [tokenXY, setTokenXY] = useState(() => {
    const p = positions[0] || { x: 50, y: 0 };
    return { x: p.x, y: p.y };
  });
  const [animKey, setAnimKey] = useState(0);
  const [pop, setPop] = useState(null);

  const profileId = user?.id;
  const savedLastPos = profileId ? boardState?.[profileId]?.lastPosition ?? 0 : 0;
  const treasureClaimedOn = profileId ? boardState?.[profileId]?.treasureClaimedOn : null;

  // Effect — animate token along the path from savedLastPos → targetIdx
  // when canonical data advances. Updates board_state when finished so a
  // reload picks up where we left off (no re-animation, no re-celebration).
  useEffect(() => {
    if (!pathRef.current || positions.length === 0) return;

    // From-index is whichever is bigger between saved and current visual.
    // If kid hard-reloads mid-animation we still resume from saved.
    const fromIdx = Math.max(0, Math.min(savedLastPos, positions.length - 1));
    const toIdx = Math.max(0, Math.min(targetIdx, positions.length - 1));

    // No diff — just place the token and bail.
    if (fromIdx === toIdx) {
      const p = positions[toIdx];
      setTokenXY({ x: p.x, y: p.y });
      return;
    }

    // Reverse jump (someone undid a task): no animation, just snap. No pop.
    if (toIdx < fromIdx) {
      const p = positions[toIdx];
      setTokenXY({ x: p.x, y: p.y });
      setBoardLastPosition?.(profileId, toIdx);
      return;
    }

    // Forward: animate along the SVG path between the two indices.
    const pathEl = pathRef.current;
    const total = pathEl.getTotalLength();
    const lenAt = (idx) => total * (idx / (positions.length - 1));
    const startLen = lenAt(fromIdx);
    const endLen = lenAt(toIdx);
    const duration = Math.min(900, 350 + (toIdx - fromIdx) * 250);
    const startedAt = performance.now();
    let raf = 0;

    const tick = (now) => {
      const t = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const len = startLen + (endLen - startLen) * eased;
      const pt = pathEl.getPointAtLength(len);
      setTokenXY({ x: pt.x, y: pt.y });
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        // Landed. Decide which pop to fire.
        const landed = spaces[toIdx];
        if (landed?.kind === "treasure" && treasureClaimedOn !== TODAY_ISO_GLOBAL()) {
          setPop({ id: Date.now(), kind: "treasure", label: "TREASURE! 🏆", sub: "All missions complete!" });
          setTreasureClaimed?.(profileId, TODAY_ISO_GLOBAL());
        } else if (landed?.kind === "task") {
          const stars = landed.task?.starValue || 0;
          setPop({
            id: Date.now(),
            kind: "space",
            label: stars > 0 ? `+${stars} ⭐` : "Mission complete!",
            sub: landed.task?.title || "",
          });
        }
        setBoardLastPosition?.(profileId, toIdx);
      }
    };
    raf = requestAnimationFrame(tick);
    setAnimKey((k) => k + 1);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetIdx, positions.length, profileId]);

  // Auto-clear the pop after its animation runs.
  useEffect(() => {
    if (!pop) return;
    const t = setTimeout(() => setPop(null), pop.kind === "treasure" ? 2200 : 1500);
    return () => clearTimeout(t);
  }, [pop]);

  const doneCount = safeTasks.filter((t) => safeComp[t.id]?.status === "approved").length;
  const pendingCount = safeTasks.filter((t) => safeComp[t.id]?.status === "pending").length;

  // Convert token's viewBox-unit coords to % for HTML positioning.
  const tokenLeftPct = tokenXY.x;
  const tokenTopPct = (tokenXY.y / VIEWBOX_H) * 100;

  return (
    <div
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

      {/* Board container — relative; the SVG and the spaces and the token
          all live inside, positioned in the SAME % coordinate system. */}
      <div
        ref={containerRef}
        className="relative z-10 mx-auto"
        style={{
          maxWidth: 420,
          // Height in CSS units — matches viewBox h-aspect so % positions match
          aspectRatio: `100 / ${VIEWBOX_H}`,
        }}
      >
        {/* The path — drawn behind the markers. */}
        <svg
          viewBox={`0 0 100 ${VIEWBOX_H}`}
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full"
        >
          {/* Glow halo behind the path */}
          <path
            d={pathD}
            stroke={theme.pathGlow}
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
          />
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

        {/* Spaces */}
        {spaces.map((s, i) => (
          <SpaceMarker
            key={i}
            space={s}
            x={positions[i].x}
            y={positions[i].y}
            viewBoxH={VIEWBOX_H}
            onTap={setOpenTask}
            theme={theme}
            activities={activities}
          />
        ))}

        {/* Token — absolute, animated via state, positioned in same % system */}
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
          <div
            className="text-3xl sm:text-4xl drop-shadow-[0_3px_6px_rgba(0,0,0,0.55)]"
            key={animKey}
          >
            {theme.tokenEmoji}
          </div>
        </div>
      </div>

      <div className="relative z-10 text-center text-[10px] text-white/40 mt-6 max-w-xs mx-auto leading-snug">
        Mission Control + Checklist still live — this is just a fun way to see today's
        missions. Same stars, same streaks.
      </div>

      {pop && <BoardPop id={pop.id} kind={pop.kind} label={pop.label} sub={pop.sub} />}
    </div>
  );
}

// We don't have a direct import to TODAY_ISO from App.jsx without coupling
// the file; recompute the local-date ISO the same way (matches App.jsx).
function TODAY_ISO_GLOBAL() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
