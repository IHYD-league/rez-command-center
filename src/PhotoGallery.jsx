import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight, Calendar as CalIcon, Image as ImageIcon } from "lucide-react";
import { useSignedUrl } from "./lib/storage.js";

/* =====================================================================
   PhotoGallery — Phase 1.

   READ-ONLY display layer over existing data:
     - Derives a flat photos[] from completions.proof[] (every entry with
       type === "photo" and a path). No new tables, no writes.
     - Sorts by completion_date (the canonical "when the work was done"
       date, not upload time).
     - Filters by activity using the existing task → activity chain.
     - Renders thumbnails with the persistent signed-URL cache so a
       reload doesn't re-fetch every URL.
     - Lightbox: full-screen overlay, swipe / arrow keys / × to close.

   Scope per the v1 brief: proof photos only. Awards, avatars, parent-
   added album photos are later phases — explicitly NOT here.
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

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T12:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });
}

// Single thumbnail tile. Lifted out so each call gets its own
// useSignedUrl hook — required for the synchronous cache initializer
// to fire one path at a time. <img loading="lazy"> means off-screen
// tiles don't fetch until the user scrolls toward them.
function PhotoTile({ photo, activity, onOpen }) {
  const url = useSignedUrl(photo.path);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative aspect-square rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 active:scale-[0.98] transition group"
      aria-label={`${activity?.name || "Photo"} — ${fmtDate(photo.date)}`}
    >
      {url ? (
        <img
          src={url}
          alt=""
          loading="lazy"
          className="w-full h-full object-cover transition-transform group-hover:scale-[1.03]"
          draggable={false}
        />
      ) : (
        <div className="w-full h-full grid place-items-center text-slate-300 text-xs">…</div>
      )}
      {/* Bottom gradient overlay with date + activity color dot */}
      <div className="absolute left-0 right-0 bottom-0 px-2 py-1.5 flex items-center gap-1.5 text-white text-[10px] font-bold"
           style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.75) 100%)" }}>
        {activity && (
          <span
            className="inline-block w-2 h-2 rounded-full shrink-0"
            style={{ background: activity.color || "#64748b" }}
            aria-hidden="true"
          />
        )}
        <span className="truncate">{shortDate(photo.date)}</span>
      </div>
    </button>
  );
}

function shortDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T12:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Lightbox — full-screen overlay with the active photo. Swipe via
// pointer drag, ←/→ arrow keys, Escape to close. Tap outside the
// image (on the dark backdrop) also closes.
function Lightbox({ photos, index, onClose, onPrev, onNext }) {
  const photo = photos[index];
  const signed = useSignedUrl(photo?.path);
  const dragRef = useRef({ x: 0, active: false });

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") onPrev();
      else if (e.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onPrev, onNext]);

  const onPointerDown = (e) => {
    dragRef.current = { x: e.clientX, active: true };
  };
  const onPointerUp = (e) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.x;
    dragRef.current.active = false;
    if (dx > 60) onPrev();
    else if (dx < -60) onNext();
  };

  if (!photo) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex flex-col"
      style={{ touchAction: "pan-y" }}
      onClick={onClose}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 text-white shrink-0" onClick={(e) => e.stopPropagation()}>
        <div className="text-xs text-white/70 font-semibold">
          {index + 1} of {photos.length}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/15 grid place-items-center active:scale-95"
          aria-label="Close"
        >
          <X size={20} />
        </button>
      </div>

      {/* Image stage */}
      <div
        className="flex-1 grid place-items-center px-4 select-none"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onClick={(e) => e.stopPropagation()}
      >
        {signed ? (
          <img
            src={signed}
            alt=""
            draggable={false}
            className="max-w-full max-h-full object-contain rounded-xl"
            style={{ touchAction: "pan-y" }}
          />
        ) : (
          <div className="text-white/60 text-sm">Loading…</div>
        )}
      </div>

      {/* Footer + side arrows */}
      <div className="px-4 pb-6 pt-3 text-white shrink-0" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 text-sm font-bold">
          {photo.activity && (
            <span
              className="inline-block w-3 h-3 rounded-full shrink-0"
              style={{ background: photo.activity.color || "#64748b" }}
              aria-hidden="true"
            />
          )}
          <span className="truncate">{photo.activity?.name || "Photo"}</span>
        </div>
        <div className="text-[12px] text-white/75 mt-1 flex items-center gap-2 flex-wrap">
          <CalIcon size={12} />
          {fmtDate(photo.date)}
          {photo.time && <span className="text-white/55">· {photo.time}</span>}
          {photo.uploader && <span className="text-white/55">· by {photo.uploader}</span>}
        </div>
        {photo.taskTitle && (
          <div className="text-[12px] text-white/55 mt-1 truncate">
            {photo.taskTitle}
          </div>
        )}
      </div>

      {/* Side prev/next buttons (desktop). Hidden on small screens; mobile uses swipe. */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onPrev(); }}
        className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 items-center justify-center text-white"
        aria-label="Previous"
      >
        <ChevronLeft size={22} />
      </button>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onNext(); }}
        className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 items-center justify-center text-white"
        aria-label="Next"
      >
        <ChevronRight size={22} />
      </button>
    </div>
  );
}

export default function PhotoGallery({ completions = [], tasks = [], activities = [], users = [] }) {
  // Derive the canonical flat photo list ONCE per render. Each entry
  // carries everything the tile/lightbox needs — no upstream lookups
  // during render.
  const photos = useMemo(() => {
    const out = [];
    for (const c of completions || []) {
      const t = (tasks || []).find((x) => x.id === c.taskId);
      const aid = t?.activityId || TYPE_TO_ACT[t?.activityType];
      const activity = (activities || []).find((a) => a.id === aid) || null;
      const taskTitle = t?.title || "";
      const proof = Array.isArray(c.proof) ? c.proof : [];
      for (const p of proof) {
        if (!p || p.type !== "photo" || !p.path) continue;
        const uploader = (users || []).find((u) => u.id === p.by)?.name || null;
        out.push({
          key: `${c.id}|${p.path}`,
          path: p.path,
          date: c.completionDate || c.completion_date || null,
          time: p.time || null,
          uploader,
          activity,
          activityId: activity?.id || null,
          taskTitle,
        });
      }
    }
    return out;
  }, [completions, tasks, activities, users]);

  // Activity facets — only show chips for activities that actually
  // have photos. Sorted by photo count desc so the deepest visual
  // streams (Writing, Math) bubble to the top.
  const facets = useMemo(() => {
    const counts = new Map();
    for (const p of photos) {
      if (!p.activityId) continue;
      counts.set(p.activityId, (counts.get(p.activityId) || 0) + 1);
    }
    return [...counts.entries()]
      .map(([id, count]) => {
        const a = activities.find((x) => x.id === id);
        return a ? { id, name: a.name, color: a.color, count } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.count - a.count);
  }, [photos, activities]);

  const [activeActivity, setActiveActivity] = useState(null); // null = All
  const [sortDir, setSortDir] = useState("desc"); // "desc" newest first, "asc" oldest first
  const [openIdx, setOpenIdx] = useState(null);

  const filtered = useMemo(() => {
    const subset = activeActivity
      ? photos.filter((p) => p.activityId === activeActivity)
      : photos;
    const cmp = sortDir === "desc"
      ? (a, b) => (b.date || "").localeCompare(a.date || "")
      : (a, b) => (a.date || "").localeCompare(b.date || "");
    return [...subset].sort(cmp);
  }, [photos, activeActivity, sortDir]);

  return (
    <div className="px-4 pt-4 pb-12">
      {/* Header / count + sort */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="text-sm text-slate-500">
          <span className="font-extrabold text-slate-800">{filtered.length}</span>
          {" "}{filtered.length === 1 ? "photo" : "photos"}
          {activeActivity && (
            <button
              type="button"
              onClick={() => setActiveActivity(null)}
              className="ml-2 text-[11px] font-bold text-indigo-600"
            >
              clear filter
            </button>
          )}
        </div>
        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
          <button
            type="button"
            onClick={() => setSortDir("desc")}
            className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${sortDir === "desc" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}
          >
            Newest
          </button>
          <button
            type="button"
            onClick={() => setSortDir("asc")}
            className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${sortDir === "asc" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}
          >
            Oldest
          </button>
        </div>
      </div>

      {/* Activity filter chips. Only renders when there's at least one
          facet (i.e., at least one photo with a resolvable activity). */}
      {facets.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-4 px-4 mb-3"
             style={{ scrollbarWidth: "thin" }}>
          <button
            type="button"
            onClick={() => setActiveActivity(null)}
            className={`shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-full border-2 transition ${
              activeActivity === null
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-600 border-slate-200"
            }`}
          >
            All · {photos.length}
          </button>
          {facets.map((f) => {
            const on = activeActivity === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveActivity(f.id)}
                className={`shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-full border-2 transition flex items-center gap-1.5 ${
                  on ? "text-white" : "bg-white text-slate-700"
                }`}
                style={{
                  borderColor: f.color || "#cbd5e1",
                  background: on ? (f.color || "#1f2937") : undefined,
                }}
              >
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ background: on ? "white" : (f.color || "#64748b") }}
                  aria-hidden="true"
                />
                {f.name} · {f.count}
              </button>
            );
          })}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-3xl bg-slate-50 border border-slate-100 p-10 text-center text-slate-400">
          <ImageIcon size={32} className="mx-auto mb-2 text-slate-300" />
          <div className="text-sm font-semibold">
            {photos.length === 0 ? "No photos yet." : "No photos in this filter."}
          </div>
          <div className="text-[11px] mt-1">
            {photos.length === 0
              ? "Tap a chore that asks for a photo — proofs show up here."
              : "Pick another activity above, or clear the filter."}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1.5">
          {filtered.map((p, i) => (
            <PhotoTile
              key={p.key}
              photo={p}
              activity={p.activity}
              onOpen={() => setOpenIdx(i)}
            />
          ))}
        </div>
      )}

      {openIdx !== null && (
        <Lightbox
          photos={filtered}
          index={openIdx}
          onClose={() => setOpenIdx(null)}
          onPrev={() => setOpenIdx((i) => (i > 0 ? i - 1 : filtered.length - 1))}
          onNext={() => setOpenIdx((i) => (i + 1) % filtered.length)}
        />
      )}
    </div>
  );
}
