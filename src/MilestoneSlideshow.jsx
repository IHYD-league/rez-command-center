import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, Play, Pause, ChevronLeft, ChevronRight, Heart, Calendar as CalIcon, Sparkles, Drum, Trophy, Image as ImageIcon } from "lucide-react";
import { useSignedUrl } from "./lib/storage.js";
import { computeDrumSessionMinutes } from "./lib/drumMinutes.js";

/* =====================================================================
   MilestoneSlideshow — Phase 5.

   Pure read-only celebratory player over already-loaded shared props.
   Three ranges (Monthly · 6-month · 1-year) auto-assemble from the
   same combined photo source PhotoGallery uses:
     - completions.proof[]  → schoolwork  (date = completion_date)
     - album_photos         → memories    (date = taken_at)
   And the same Insights groupings drive the stat interlude cards.

   HONEST FRAMING (non-negotiable per the v5 brief):
     - Photo count is computed live per range.
     - Ranges below a threshold are greyed out with "Coming as the album
       grows" — never render an empty 1-year recap implying missing data.
     - "Tracking since {earliestDate}" footer always present.

   No new tables, no new shared state, no schema changes. Future v2:
   parent-curated highlights via a small slideshow_picks table.
   ===================================================================== */

const TYPE_TO_ACT = {
  Drums: "a_drums",
  "English reading": "a_eng_read",
  "Spanish reading": "a_spa_read",
  "Spanish practice": "a_spanish",
  Duolingo: "a_duo",
  Writing: "a_write",
  Math: "a_math",
  Art: "a_art",
  Movement: "a_move",
  Swim: "a_swim",
  Taekwondo: "a_tkd",
  "Hip Hop Dance": "a_dance",
  Chores: "a_chores",
  "Field trips": "a_field",
  Church: "a_church",
  Basketball: "a_bball",
};

// Below this count, a range is "too sparse to play" and gets greyed
// out in the chooser. Chosen generously low so June 2026 (which has 2
// proof photos) still surfaces something — we just label it honestly
// ("Just 2 photos — early days") rather than refuse.
const MIN_PHOTOS_TO_PLAY = 1;
// How long each photo holds before auto-advance.
const SLIDE_MS = 4000;
// How often to drop in a stat interlude card. Every Nth slide.
const INTERLUDE_EVERY = 6;

function fmtDateLong(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T12:00");
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}
function fmtDateShort(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T12:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function todayDate() {
  return new Date();
}
function toIso(d) {
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}
function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function monthsBack(d, n) {
  return new Date(d.getFullYear(), d.getMonth() - n, d.getDate());
}
function monthName(d) {
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

// One photo slide — lifted out so each tile gets its own useSignedUrl
// hook (the cache works per-path; nested calls would over-fetch).
function SlidePhoto({ photo, visible }) {
  const url = useSignedUrl(photo.path);
  if (!url) {
    return (
      <div className="absolute inset-0 grid place-items-center text-white/40 text-sm transition-opacity duration-700"
           style={{ opacity: visible ? 1 : 0 }}>
        Loading…
      </div>
    );
  }
  return (
    <img
      src={url}
      alt=""
      draggable={false}
      className="absolute inset-0 w-full h-full object-contain transition-opacity duration-700"
      style={{ opacity: visible ? 1 : 0 }}
    />
  );
}

// Preloader — instantiates useSignedUrl off-screen so the URL hits the
// cache before the slide is shown. One hook per upcoming path.
function Preload({ paths }) {
  // Cap the preload window; we typically only need the next 2.
  const slice = (paths || []).slice(0, 3);
  return (
    <div aria-hidden style={{ display: "none" }}>
      {slice.map((p) => (
        <PreloadOne key={p} path={p} />
      ))}
    </div>
  );
}
function PreloadOne({ path }) {
  useSignedUrl(path);
  return null;
}

export default function MilestoneSlideshow({
  completions = [],
  tasks = [],
  activities = [],
  users = [],
  songs = [],
  songPlays = [],
  books = [],
  albumPhotos = [],
}) {
  // ----- Derive the combined photo list (same shape PhotoGallery uses) -----
  const allPhotos = useMemo(() => {
    const out = [];
    for (const c of completions || []) {
      const t = (tasks || []).find((x) => x.id === c.taskId);
      const aid = t?.activityId || TYPE_TO_ACT[t?.activityType];
      const activity = (activities || []).find((a) => a.id === aid) || null;
      const proof = Array.isArray(c.proof) ? c.proof : [];
      for (const p of proof) {
        if (!p || p.type !== "photo" || !p.path) continue;
        out.push({
          key: `c:${c.id}|${p.path}`,
          source: "schoolwork",
          path: p.path,
          date: c.completionDate || c.completion_date || null,
          activity,
          taskTitle: t?.title || "",
          caption: "",
          uploader: (users || []).find((u) => u.id === p.by)?.name || null,
        });
      }
    }
    for (const a of albumPhotos || []) {
      if (!a?.path) continue;
      const activity = (activities || []).find((x) => x.id === a.activityId) || null;
      out.push({
        key: `a:${a.id}`,
        source: "memories",
        path: a.path,
        date: a.takenAt || null,
        activity,
        taskTitle: "",
        caption: a.caption || "",
        uploader: (users || []).find((u) => u.id === a.uploadedBy)?.name || null,
      });
    }
    // Drop any photo without a date — slideshows are time-ordered.
    return out.filter((p) => !!p.date).sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  }, [completions, tasks, activities, users, albumPhotos]);

  // ----- Earliest tracked date (for the honest "tracking since" copy). -----
  const earliest = useMemo(() => {
    if (allPhotos.length === 0) return null;
    return allPhotos[0].date;
  }, [allPhotos]);

  // ----- Three range definitions. -----
  const ranges = useMemo(() => {
    const today = todayDate();
    const monthStart = toIso(startOfMonth(today));
    const monthEnd = toIso(endOfMonth(today));
    const sixMoStart = toIso(monthsBack(today, 6));
    const yearStart = toIso(monthsBack(today, 12));
    const todayIso = toIso(today);
    const monthly  = { id: "month", label: `${monthName(today)}`, sub: "This month's recap", from: monthStart, to: monthEnd };
    const sixmo    = { id: "6mo",   label: "Last 6 months",       sub: "Half-year progression",  from: sixMoStart, to: todayIso };
    const year     = { id: "year",  label: "Last year",           sub: "The full journey",       from: yearStart, to: todayIso };
    return [monthly, sixmo, year].map((r) => ({
      ...r,
      photos: allPhotos.filter((p) => p.date >= r.from && p.date <= r.to),
    }));
  }, [allPhotos]);

  // ----- Stats for the interlude cards (per range). -----
  function computeStatsFor(range) {
    let drumMin = 0;
    let approved = 0;
    let pendingCount = 0;
    const cats = new Map();
    // Drum minutes via the single source of truth so the slideshow
    // headline agrees with Insights / DetailSheet / CompletionDetailSheet
    // — Drumeo + Melodics + song-play durations on the session date.
    const drumDatesInRange = new Set();
    for (const c of completions || []) {
      const d = c.completionDate || c.completion_date;
      if (!d || d < range.from || d > range.to) continue;
      if (c.status === "approved") {
        approved += 1;
        const t = (tasks || []).find((x) => x.id === c.taskId);
        if (t?.category) cats.set(t.category, (cats.get(t.category) || 0) + 1);
      } else if (c.status === "pending") {
        pendingCount += 1;
      }
      if (Number(c?.extra?.drumeo) > 0 || Number(c?.extra?.melodics) > 0) {
        drumMin += computeDrumSessionMinutes(c, songPlays, songs).total;
        drumDatesInRange.add(d);
      }
    }
    let plays = 0;
    for (const sp of songPlays || []) {
      const d = sp.playedOn || sp.played_on;
      if (!d) continue;
      if (d >= range.from && d <= range.to) {
        plays += 1;
        // Song-play days without a drums completion still contribute
        // to drum minutes — sum once per orphan date.
        if (!drumDatesInRange.has(d)) {
          drumMin += computeDrumSessionMinutes({ completionDate: d, extra: {} }, songPlays, songs).total;
          drumDatesInRange.add(d);
        }
      }
    }
    let booksTouched = 0;
    for (const b of books || []) {
      const d = b.started || (b.createdAt ? b.createdAt.slice(0, 10) : null);
      if (!d) continue;
      if (d >= range.from && d <= range.to) booksTouched += 1;
    }
    return {
      drumMin,
      approved,
      catTop: [...cats.entries()].sort((a, b) => b[1] - a[1])[0] || null,
      plays,
      booksTouched,
    };
  }

  // ----- Build the play sequence: photos with interlude stat cards
  //       interleaved every N slides. Final card always sits at the end. -----
  function buildSequence(range) {
    const photos = range.photos;
    if (photos.length === 0) return [];
    const stats = computeStatsFor(range);
    const out = [];
    for (let i = 0; i < photos.length; i++) {
      out.push({ kind: "photo", photo: photos[i] });
      if ((i + 1) % INTERLUDE_EVERY === 0 && i < photos.length - 1) {
        out.push({ kind: "interlude", stats, range, photoIdx: i + 1 });
      }
    }
    out.push({ kind: "final", stats, range, photoCount: photos.length });
    return out;
  }

  // ----- Chooser state vs Player state. -----
  const [openRange, setOpenRange] = useState(null);
  const sequence = useMemo(() => (openRange ? buildSequence(openRange) : []), [openRange]);

  return (
    <div className="px-4 pt-4 pb-12">
      {/* Header card */}
      <div className="rounded-2xl p-4 text-white mb-4 relative overflow-hidden"
           style={{ background: "linear-gradient(135deg, #4338ca 0%, #7c3aed 55%, #ec4899 100%)" }}>
        <Sparkles size={64} className="absolute -right-4 -top-4 text-white/15" />
        <div className="text-xs uppercase tracking-wider font-bold opacity-85">Milestone Slideshows</div>
        <div className="text-xl font-extrabold mt-0.5">Look how he's grown</div>
        <div className="text-[11px] opacity-85 mt-2 leading-snug">
          Auto-assembled from the photos already in his gallery. Tap a range
          to play. The album fills out as you keep using the app.
        </div>
      </div>

      {/* Chooser tiles */}
      <div className="grid grid-cols-1 gap-2 mb-3">
        {ranges.map((r) => {
          const playable = r.photos.length >= MIN_PHOTOS_TO_PLAY;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => playable && setOpenRange(r)}
              disabled={!playable}
              className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition ${
                playable
                  ? "border-indigo-500 bg-white shadow-sm hover:shadow active:scale-[0.99]"
                  : "border-slate-200 bg-slate-50 opacity-70"
              }`}
            >
              <div
                className={`shrink-0 w-12 h-12 rounded-2xl grid place-items-center ${
                  playable ? "bg-indigo-100 text-indigo-700" : "bg-slate-200 text-slate-400"
                }`}
              >
                <Play size={20} fill={playable ? "currentColor" : "none"} />
              </div>
              <div className="flex-1 min-w-0">
                <div className={`font-extrabold text-base ${playable ? "text-slate-800" : "text-slate-500"}`}>
                  {r.label}
                </div>
                <div className="text-[11px] text-slate-500">{r.sub}</div>
                <div className="text-[11px] mt-1">
                  {playable ? (
                    <span className="font-bold text-indigo-600">
                      {r.photos.length} {r.photos.length === 1 ? "photo" : "photos"}
                    </span>
                  ) : (
                    <span className="font-semibold text-slate-400">
                      Coming as the album grows
                    </span>
                  )}
                </div>
              </div>
              {playable && <ChevronRight size={18} className="text-slate-400 shrink-0" />}
            </button>
          );
        })}
      </div>

      {/* Honest "tracking since" footer */}
      <div className="text-[11px] text-slate-500 mt-3 px-1 leading-snug">
        Tracking photo logs since{" "}
        <b className="text-slate-700">{earliest ? fmtDateLong(earliest) : "—"}</b>.{" "}
        The streaks go further back than the photos do — that's honest,
        not a bug. The 6-month and 1-year shows fill out as you keep
        adding memories.
      </div>

      {openRange && (
        <Player
          range={openRange}
          sequence={sequence}
          onClose={() => setOpenRange(null)}
        />
      )}
    </div>
  );
}

/* ---------- Full-screen Player ---------- */

function Player({ range, sequence, onClose }) {
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const timerRef = useRef(null);
  const dragRef = useRef({ x: 0, active: false });

  // Auto-advance ticker. Paused when playing=false or the user is
  // mid-drag. Cleans up on unmount + on index changes (so a tap-to-
  // pause resets the clock when they tap to resume).
  useEffect(() => {
    if (!playing) return;
    if (idx >= sequence.length - 1) return;
    timerRef.current = setTimeout(() => setIdx((i) => Math.min(i + 1, sequence.length - 1)), SLIDE_MS);
    return () => clearTimeout(timerRef.current);
  }, [idx, playing, sequence.length]);

  // Keyboard controls (desktop): arrows + space + escape.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") setIdx((i) => Math.max(0, i - 1));
      else if (e.key === "ArrowRight") setIdx((i) => Math.min(sequence.length - 1, i + 1));
      else if (e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, sequence.length]);

  const current = sequence[idx];
  const next = sequence[idx + 1];

  // Preload paths — the next two photos so the crossfade is instant.
  const preloadPaths = useMemo(() => {
    const out = [];
    for (let i = idx + 1; i < Math.min(sequence.length, idx + 3); i++) {
      const s = sequence[i];
      if (s?.kind === "photo" && s.photo?.path) out.push(s.photo.path);
    }
    return out;
  }, [idx, sequence]);

  const onPointerDown = (e) => {
    dragRef.current = { x: e.clientX, active: true };
  };
  const onPointerUp = (e) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.x;
    dragRef.current.active = false;
    if (dx > 60) setIdx((i) => Math.max(0, i - 1));
    else if (dx < -60) setIdx((i) => Math.min(sequence.length - 1, i + 1));
  };

  if (!current) {
    return (
      <div className="fixed inset-0 z-50 bg-black/95 grid place-items-center text-white" onClick={onClose}>
        <div className="text-sm opacity-70">No slides.</div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex flex-col text-white select-none"
      style={{ touchAction: "pan-y" }}
      onClick={onClose}
    >
      <Preload paths={preloadPaths} />

      {/* Top: progress dots + close */}
      <div className="flex items-center gap-2 px-3 py-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex-1 flex items-center gap-0.5 overflow-hidden">
          {sequence.map((s, i) => (
            <span
              key={i}
              className="h-1 rounded-full flex-1"
              style={{
                background:
                  i < idx ? "rgba(255,255,255,0.9)"
                    : i === idx ? "rgba(255,255,255,0.9)"
                    : "rgba(255,255,255,0.22)",
                maxWidth: 24,
              }}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          className="w-9 h-9 rounded-full bg-white/15 grid place-items-center active:scale-95"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/15 grid place-items-center active:scale-95"
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>

      {/* Stage */}
      <div
        className="flex-1 relative px-4"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onClick={(e) => e.stopPropagation()}
      >
        {current.kind === "photo" && (
          <>
            <SlidePhoto photo={current.photo} visible={true} />
            {/* next slide layered for crossfade — only an img when the
                NEXT slide is also a photo. Stat cards crossfade differently. */}
            {next?.kind === "photo" && (
              <SlidePhoto key={`next-${idx + 1}`} photo={next.photo} visible={false} />
            )}
          </>
        )}
        {current.kind === "interlude" && (
          <InterludeCard data={current} />
        )}
        {current.kind === "final" && (
          <FinalCard data={current} />
        )}
      </div>

      {/* Bottom strip — date · activity · caption (only for photos) */}
      {current.kind === "photo" && (
        <div className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2 text-sm font-bold">
            {current.photo.source === "memories" && <Heart size={14} className="text-pink-400" fill="currentColor" />}
            {current.photo.activity && (
              <span
                className="inline-block w-3 h-3 rounded-full shrink-0"
                style={{ background: current.photo.activity.color || "#64748b" }}
              />
            )}
            <span className="truncate">
              {current.photo.caption || current.photo.activity?.name || (current.photo.source === "memories" ? "Memory" : "Photo")}
            </span>
          </div>
          <div className="text-[12px] text-white/70 mt-1 flex items-center gap-2 flex-wrap">
            <CalIcon size={12} />
            {fmtDateLong(current.photo.date)}
            {current.photo.uploader && <span className="text-white/50">· by {current.photo.uploader}</span>}
          </div>
        </div>
      )}

      {/* Side prev/next on desktop */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setIdx((i) => Math.max(0, i - 1)); }}
        className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 items-center justify-center text-white"
        aria-label="Previous"
      >
        <ChevronLeft size={22} />
      </button>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setIdx((i) => Math.min(sequence.length - 1, i + 1)); }}
        className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 items-center justify-center text-white"
        aria-label="Next"
      >
        <ChevronRight size={22} />
      </button>
    </div>
  );
}

function InterludeCard({ data }) {
  const { stats, range } = data;
  return (
    <div className="absolute inset-0 grid place-items-center px-6 text-center">
      <div className="max-w-md w-full rounded-3xl p-6 text-white relative overflow-hidden"
           style={{ background: "linear-gradient(135deg,#312e81 0%,#4338ca 50%,#7c3aed 100%)" }}>
        <Sparkles size={56} className="absolute -right-4 -top-4 text-white/15" />
        <div className="text-[11px] uppercase tracking-wider font-bold opacity-80">{range.label}</div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Stat icon={Trophy} label="approved" value={stats.approved} />
          <Stat icon={Drum} label="minutes" value={stats.drumMin} />
          <Stat icon={ImageIcon} label="songs played" value={stats.plays} />
          <Stat icon={Heart} label="books touched" value={stats.booksTouched} />
        </div>
        {stats.catTop && (
          <div className="text-sm opacity-90 mt-4">
            Most-done category: <b>{stats.catTop[0]}</b> · {stats.catTop[1]}
          </div>
        )}
      </div>
    </div>
  );
}

function FinalCard({ data }) {
  const { stats, range, photoCount } = data;
  return (
    <div className="absolute inset-0 grid place-items-center px-6 text-center">
      <div className="max-w-md w-full rounded-3xl p-6 text-white relative overflow-hidden"
           style={{ background: "linear-gradient(135deg,#be185d 0%,#7c3aed 50%,#0f766e 100%)" }}>
        <Sparkles size={72} className="absolute -right-2 -top-2 text-white/15" />
        <div className="text-[11px] uppercase tracking-wider font-bold opacity-85">{range.label}</div>
        <div className="text-3xl font-extrabold mt-2 leading-tight">✨ Beautiful run ✨</div>
        <div className="text-[12px] opacity-90 mt-2 leading-snug">
          {photoCount} {photoCount === 1 ? "photo" : "photos"} ·{" "}
          {stats.approved} approved ·{" "}
          {stats.drumMin} min of drums
        </div>
        <div className="text-[11px] opacity-70 mt-4 italic">
          Keep going. The next chapter writes itself one day at a time.
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl bg-white/10 backdrop-blur p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold opacity-70">
        <Icon size={11} /> {label}
      </div>
      <div className="text-2xl font-extrabold leading-none mt-1">{value}</div>
    </div>
  );
}
