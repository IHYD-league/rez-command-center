import React, { useEffect, useRef, useState } from "react";
import { Star, Flame, Trophy, Crown, Target, Sparkles, MapPin, Menu, Map } from "lucide-react";
import { useSignedUrl } from "./lib/storage.js";

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

function MainQuestTile({ q, onTap }) {
  const done = q.done;
  const tappable = !!onTap && !done;
  return (
    <div
      onClick={tappable ? () => onTap(q.id) : undefined}
      role={tappable ? "button" : undefined}
      tabIndex={tappable ? 0 : undefined}
      className={`rounded-3xl p-4 border-2 transition ${
        done
          ? "bg-emerald-50 border-emerald-300"
          : "bg-white border-slate-200 " + (tappable ? "cursor-pointer active:scale-[0.98] hover:border-indigo-300" : "")
      }`}
    >
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

function SideQuestRow({ q, onTap }) {
  const tappable = !!onTap && !q.done;
  return (
    <div
      onClick={tappable ? () => onTap(q.id) : undefined}
      role={tappable ? "button" : undefined}
      tabIndex={tappable ? 0 : undefined}
      className={`flex items-center justify-between bg-white border border-slate-100 rounded-2xl px-3 py-2.5 ${tappable ? "cursor-pointer active:scale-[0.98] hover:border-indigo-200" : ""}`}
    >
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

export default function KidGameHome({ data, onStartQuests, onOpenMenu, onTapQuest, onTapStars, onOpenBoard, onTapBadges }) {
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

  const firstUndone = mainQuests.find((q) => !q.done);
  // For the "Up next" widget: pick a required quest if any remain, else
  // the first un-done extra so the suggestion never goes blank while
  // there's still anything to do. Hidden entirely once everything's done.
  const upNext = firstUndone || sideQuests.find((q) => !q.done);
  const upNextIsRequired = !!firstUndone;

  return (
    <div className="px-4 pt-4 pb-6 space-y-4">
      {/* HERO: avatar + stars + streak */}
      <div
        className="rounded-3xl p-5 text-white relative overflow-hidden"
        style={{ background: "linear-gradient(135deg,#6366f1,#a855f7 55%,#ec4899)" }}
      >
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
                <div data-star-bank className="text-2xl font-extrabold leading-none mt-1"><AnimatedNumber value={stars} /></div>
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
          <div className="bg-white/15 backdrop-blur rounded-2xl px-3 py-2 border border-white/10">
            <div className="text-[10px] uppercase tracking-wider text-white/70 font-bold flex items-center gap-1">
              <Flame size={11} className="text-orange-300" /> Drum streak
            </div>
            <div className="text-2xl font-extrabold leading-none mt-1">
              <AnimatedNumber value={streak?.current ?? 0} />
              <span className="text-xs font-bold text-white/60 ml-1">/ {streak?.milestone ?? 365}</span>
            </div>
            <div className="mt-1.5">
              <ProgressBar have={streak?.current ?? 0} need={streak?.milestone ?? 365} color="#fb923c" />
            </div>
          </div>
        </div>

        {level && (
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

      {/* NEXT BADGE — pull-forward card. Reads the closest unearned trophy
          from the canonical ACHIEVEMENTS list so Reznor sees what's almost
          in reach. Nothing stored; recomputes on every render. */}
      {nextBadge && (
        <button
          type="button"
          onClick={onTapBadges}
          className="w-full rounded-2xl bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-200 p-3 flex items-center gap-3 active:scale-[0.98] transition shadow-sm"
        >
          <div className="text-4xl shrink-0">{nextBadge.emoji}</div>
          <div className="flex-1 min-w-0 text-left">
            <div className="text-[10px] uppercase tracking-widest text-amber-700 font-bold">
              Almost there
            </div>
            <div className="text-sm font-extrabold text-slate-800 truncate">
              {nextBadge.title}
            </div>
            <div className="text-[11px] text-slate-500 truncate">{nextBadge.desc}</div>
            <div className="mt-1.5 h-1.5 bg-amber-200/60 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all"
                style={{ width: `${nextBadge.pct}%` }}
              />
            </div>
            <div className="text-[10px] text-amber-700 font-bold mt-0.5">
              {nextBadge.value} / {nextBadge.goal}
            </div>
          </div>
        </button>
      )}

      {/* UP NEXT — single-tap "what to do right now" card. Derived from
          the canonical todaysTasks via the mainQuests/sideQuests already
          on kidData. Tap → opens the same TaskSheet a tile would. Hidden
          when everything is done; the bottom CTA shows the celebration. */}
      {upNext && (
        <button
          type="button"
          onClick={() => onTapQuest?.(upNext.id)}
          className="w-full rounded-3xl p-3.5 flex items-center gap-3 active:scale-[0.98] transition border-2 border-emerald-200 shadow-sm"
          style={{
            background: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 60%, #ccfbf1 100%)",
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

      {/* DAILY ADVENTURE BOARD entry — sits right under the hero so the kid
          can jump straight to the board without scrolling to the bottom nav. */}
      {onOpenBoard && (
        <button
          type="button"
          onClick={onOpenBoard}
          className="w-full rounded-3xl p-3.5 flex items-center gap-3 active:scale-[0.98] transition relative overflow-hidden border-2 border-white/15 shadow-lg"
          style={{
            background: "linear-gradient(135deg, #1e293b 0%, #4338ca 35%, #7c3aed 70%, #ec4899 100%)",
          }}
        >
          {/* sprinkle of stars baked into the gradient */}
          <span aria-hidden="true" className="absolute pointer-events-none" style={{ left: "18%", top: "22%", color: "rgba(255,255,255,0.5)", fontSize: 10 }}>✦</span>
          <span aria-hidden="true" className="absolute pointer-events-none" style={{ left: "44%", top: "68%", color: "rgba(255,255,255,0.4)", fontSize: 9 }}>✦</span>
          <span aria-hidden="true" className="absolute pointer-events-none" style={{ left: "72%", top: "30%", color: "rgba(255,255,255,0.5)", fontSize: 11 }}>✦</span>
          <span aria-hidden="true" className="absolute pointer-events-none" style={{ left: "86%", top: "60%", color: "rgba(255,255,255,0.35)", fontSize: 8 }}>✦</span>
          <div className="w-12 h-12 rounded-2xl bg-white/15 grid place-items-center backdrop-blur border border-white/25 shrink-0 relative z-10">
            <span className="text-2xl">🚀</span>
          </div>
          <div className="flex-1 text-left relative z-10 min-w-0">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/80 font-bold">Space Quest</div>
            <div className="text-base font-extrabold text-white tracking-tight leading-tight mt-0.5">
              Daily Adventure Board
            </div>
            <div className="text-[11px] text-white/80 mt-0.5 truncate">
              Fly your rocket through today's missions →
            </div>
          </div>
          <Map size={20} className="text-white/80 relative z-10 shrink-0" />
        </button>
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
