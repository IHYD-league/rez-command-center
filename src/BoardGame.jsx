import React, { useMemo } from "react";
import { Lock } from "lucide-react";

/* =====================================================================
   BoardGame — Daily Adventure Board, Phase 1.

   Pure render layer over canonical data (ARCHITECTURE §1, §2):
   - Reads today's real tasks + compByTask from props.
   - Tapping a space calls the existing setOpenTask → opens TaskSheet →
     submit goes through submitTask. Same path as KidGameHome quest tiles.
   - Stars / streaks / approvals — never touched here.
   - Space states are derived per render from task.required + compByTask;
     nothing is stored. If you removed this whole file, canonical data
     would be unchanged.

   Phase 1 scope (per BOARD-GAME.md):
   - One theme: Space Quest (starfield gradient, rocket token, trophy
     treasure). All visuals are CSS + emoji; no image assets.
   - ~15 spaces: today's required tasks first (sequenced gate), then
     extras (loose), then a treasure space at the end.
   - Treasure is ALWAYS dim — threshold logic lands in Phase 3.
   - Token (🚀) is positioned on the current space. No animation yet.
   ===================================================================== */

const SPACE_QUEST = {
  id: "space-quest",
  name: "Space Quest",
  background: "radial-gradient(ellipse at top, #1e3a8a 0%, #0f172a 65%, #020617 100%)",
  tokenEmoji: "🚀",
  treasureEmoji: "🏆",
  treasureLabel: "Mission Treasure",
  // Color for fallback when a task has no activity color.
  fallbackColor: "#6366f1",
};

// Activity-type → emoji mapping. Kid-readable shorthand for each space.
// Activities not in this map fall back to ⭐ so nothing renders blank.
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

// Lay out today's tasks as a sequence of space records. State for each
// space is purely derived from compByTask + the task's position in the
// sequence. NOT stored anywhere.
function deriveSpaces({ todaysTasks, compByTask }) {
  const required = todaysTasks.filter((t) => t.required);
  const extras = todaysTasks.filter((t) => !t.required);

  // First not-approved task in priority order (required, then extras).
  // That's where the rocket sits.
  let currentTaskId = null;
  for (const t of [...required, ...extras]) {
    if ((compByTask[t.id]?.status || null) !== "approved") {
      currentTaskId = t.id;
      break;
    }
  }
  const everythingDone = !currentTaskId;

  const spaces = [];
  // Required: strict sequencing — each is locked until the previous
  // required has been submitted (approved OR pending). needs_fix means
  // the kid has to fix that one first; next stays locked.
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
    spaces.push({ kind: "task", task: t, state });
  }
  // Extras: loose — never gated on each other.
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
    spaces.push({ kind: "task", task: t, state });
  }
  // Treasure: Phase 1 always dim. Threshold lands in Phase 3.
  spaces.push({ kind: "treasure", state: "treasure-locked", everythingDone });
  return { spaces, currentTaskId };
}

function BoardSpace({ space, onTap, theme, activities }) {
  const { kind, state, task } = space;

  if (kind === "treasure") {
    return (
      <div className="flex flex-col items-center">
        <div
          className="w-20 h-20 rounded-full grid place-items-center text-4xl shadow-lg border-4 border-white/15"
          style={{
            background: "radial-gradient(circle, #475569 0%, #1e293b 100%)",
            opacity: 0.55,
          }}
        >
          {theme.treasureEmoji}
        </div>
        <div className="text-[10px] text-white/70 font-bold mt-1.5 text-center">
          {theme.treasureLabel}
        </div>
        <div className="text-[9px] text-white/40 font-semibold mt-0.5 text-center">
          locked
        </div>
      </div>
    );
  }

  // Task space.
  const a =
    (activities || []).find(
      (x) =>
        x.id === (task.activityId || task.activityType?.toLowerCase().replace(/\s/g, "_"))
    ) || {};
  const color = a.color || theme.fallbackColor;
  const emoji = ACTIVITY_EMOJI[task.activityType] || "⭐";

  const palette = {
    locked: { bg: "rgba(255,255,255,0.06)", opacity: 0.45, ring: "rgba(255,255,255,0.12)" },
    available: { bg: color, opacity: 1, ring: "rgba(255,255,255,0.35)" },
    current: { bg: color, opacity: 1, ring: "rgba(255,255,255,0.85)" },
    pending: { bg: color, opacity: 0.9, ring: "#f59e0b" },
    completed: { bg: "#0f5132", opacity: 0.7, ring: "rgba(255,255,255,0.18)" },
    "needs-fix": { bg: color, opacity: 0.9, ring: "#ef4444" },
  };
  const p = palette[state] || palette.available;
  const tappable = state !== "locked";

  return (
    <div className="flex flex-col items-center relative">
      {state === "current" && (
        <div className="absolute -top-7 z-10 text-3xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
          {theme.tokenEmoji}
        </div>
      )}
      <button
        type="button"
        disabled={!tappable}
        onClick={() => tappable && onTap?.(task)}
        title={task.title + (state === "locked" ? " — finish the previous mission first" : "")}
        className={`relative w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full grid place-items-center text-2xl sm:text-3xl transition ${
          tappable ? "active:scale-95 cursor-pointer" : "cursor-not-allowed"
        }`}
        style={{
          background: p.bg,
          opacity: p.opacity,
          border: `4px solid ${p.ring}`,
          boxShadow: state === "current" ? `0 0 28px ${color}cc` : "0 4px 12px rgba(0,0,0,0.35)",
        }}
      >
        {state === "locked" ? <Lock size={18} className="text-white/40" /> : emoji}
        {state === "completed" && (
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 grid place-items-center text-white text-xs font-extrabold border-2 border-slate-900">
            ✓
          </div>
        )}
        {state === "pending" && (
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-500 grid place-items-center text-white text-[11px] font-extrabold border-2 border-slate-900">
            ⏳
          </div>
        )}
        {state === "needs-fix" && (
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-rose-500 grid place-items-center text-white text-[10px] font-extrabold border-2 border-slate-900">
            ↺
          </div>
        )}
      </button>
      <div
        className={`text-[10px] sm:text-[11px] font-bold text-center mt-1.5 max-w-[88px] leading-tight ${
          state === "locked" ? "text-white/35" : "text-white"
        }`}
      >
        {task.title}
      </div>
    </div>
  );
}

export default function BoardGame({ todaysTasks, compByTask, activities, setOpenTask, user }) {
  const theme = SPACE_QUEST;

  // Stable star sprites for the starfield background.
  const stars = useMemo(
    () =>
      Array.from({ length: 36 }).map((_, i) => ({
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

  // Empty-board fallback — no tasks today.
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
          <div className="text-sm text-white/70 mt-2">
            Free flight! Take a break or play something for fun.
          </div>
        </div>
      </div>
    );
  }

  const { spaces } = deriveSpaces({ todaysTasks: safeTasks, compByTask: safeComp });

  // Snake layout — 3 cols, alternating direction per row.
  const positioned = spaces.map((s, i) => {
    const row = Math.floor(i / 3);
    const colIdx = i % 3;
    const col = row % 2 === 0 ? colIdx : 2 - colIdx;
    return { ...s, _row: row + 1, _col: col + 1 };
  });

  const doneCount = safeTasks.filter((t) => safeComp[t.id]?.status === "approved").length;
  const pendingCount = safeTasks.filter((t) => safeComp[t.id]?.status === "pending").length;

  return (
    <div
      className="min-h-screen px-3 pt-4 pb-24 relative overflow-hidden"
      style={{
        background: theme.background,
        fontFamily: "ui-rounded, 'SF Pro Rounded', system-ui, sans-serif",
      }}
    >
      {/* Starfield */}
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

      {/* Header */}
      <div className="relative z-10 text-center mb-5">
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

      {/* Board grid */}
      <div className="relative z-10 grid grid-cols-3 gap-y-7 gap-x-2 max-w-md mx-auto">
        {positioned.map((s, i) => (
          <div key={i} style={{ gridRow: s._row, gridColumn: s._col }} className="flex justify-center">
            <BoardSpace space={s} onTap={setOpenTask} theme={theme} activities={activities} />
          </div>
        ))}
      </div>

      {/* Footer disclaimer */}
      <div className="relative z-10 text-center text-[10px] text-white/40 mt-6 max-w-xs mx-auto leading-snug">
        Mission Control + Checklist still live — this is just a fun way to see today's
        missions. Same stars, same streaks.
      </div>
    </div>
  );
}
