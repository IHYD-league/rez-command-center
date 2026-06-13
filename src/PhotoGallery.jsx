import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight, Calendar as CalIcon, Image as ImageIcon, Heart, Plus, Camera } from "lucide-react";
import { useSignedUrl, uploadFamilyPhoto } from "./lib/storage.js";
import { toast } from "./lib/toast.js";
import { tOf } from "./lib/i18n.js";
const t = (k, fb) => tOf(k, fb);

/* =====================================================================
   PhotoGallery — Phase 1 + Phase 2 (Memories).

   READ-ONLY display layer over existing data PLUS parent-added album
   photos:
     - Schoolwork source: completions.proof[] (type === "photo", path set).
       Date = completion_date. Activity from task → activityId/Type.
     - Memories source: album_photos rows (Phase 2). Date = taken_at.
       Activity = optional activity_id the parent tagged on upload.
     - Filter pill: All / Schoolwork / Memories (source filter).
     - Activity chips: still work on the combined set (a tagged memory
       shows up under its activity too).
     - Inline "+ Add a memory" form at the top, PARENT-ONLY. Server-
       side gate is hard — the album_photos RLS policy requires
       is_parent(). UI gate is the soft secondary.
     - Lightbox: caption (memories) + uploader + date + activity, plus
       swipe / arrow keys / Escape to close.
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
  const isMemory = photo.source === "memories";
  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative aspect-square rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 active:scale-[0.98] transition group"
      aria-label={`${activity?.name || t("pg_photo_aria", "Photo")} — ${fmtDate(photo.date)}`}
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
      {/* Memory badge — small pink heart in the top corner so the kind
          reads at a glance without colliding with the date label below. */}
      {isMemory && (
        <div
          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-pink-500/95 grid place-items-center text-white shadow"
          aria-label={t("pg_memory_aria", "Memory")}
          title={t("pg_memory_aria", "Memory")}
        >
          <Heart size={12} fill="currentColor" />
        </div>
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
          {t("pg_lightbox_index", "{i} of {n}").replaceAll("{i}", index + 1).replaceAll("{n}", photos.length)}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/15 grid place-items-center active:scale-95"
          aria-label={t("pg_lightbox_close", "Close")}
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
          <div className="text-white/60 text-sm">{t("pg_lightbox_loading", "Loading…")}</div>
        )}
      </div>

      {/* Footer + side arrows */}
      <div className="px-4 pb-6 pt-3 text-white shrink-0" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 text-sm font-bold">
          {photo.source === "memories" && (
            <Heart size={14} className="text-pink-400 shrink-0" fill="currentColor" />
          )}
          {photo.activity && (
            <span
              className="inline-block w-3 h-3 rounded-full shrink-0"
              style={{ background: photo.activity.color || "#64748b" }}
              aria-hidden="true"
            />
          )}
          <span className="truncate">
            {photo.caption || photo.activity?.name || (photo.source === "memories" ? t("pg_memory_aria", "Memory") : t("pg_photo_aria", "Photo"))}
          </span>
        </div>
        <div className="text-[12px] text-white/75 mt-1 flex items-center gap-2 flex-wrap">
          <CalIcon size={12} />
          {fmtDate(photo.date)}
          {photo.time && <span className="text-white/55">· {photo.time}</span>}
          {photo.uploader && <span className="text-white/55">· {t("pg_by_label", "by {name}").replaceAll("{name}", photo.uploader)}</span>}
          {photo.activity && photo.caption && (
            <span className="text-white/55">· {photo.activity.name}</span>
          )}
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
        aria-label={t("pg_lightbox_prev", "Previous")}
      >
        <ChevronLeft size={22} />
      </button>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onNext(); }}
        className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 items-center justify-center text-white"
        aria-label={t("pg_lightbox_next", "Next")}
      >
        <ChevronRight size={22} />
      </button>
    </div>
  );
}

// AddMemoryForm — collapsible inline upload at the top of the gallery.
// Parent-only (PhotoGallery gates rendering). Uploads to
// <familyId>/album/... via uploadFamilyPhoto({ kind: "album" }) and
// pushes a new row into albumPhotos through onSave; the synced setter
// upserts to album_photos. The hard server gate is the table's RLS:
// is_parent() guards every insert.
function AddMemoryForm({ activities, user, familyId, onSave }) {
  const [open, setOpen] = useState(false);
  const [caption, setCaption] = useState("");
  const [takenAt, setTakenAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [activityId, setActivityId] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const activeActivities = (activities || []).filter((a) => a.status === "active");
  const reset = () => {
    setCaption("");
    setTakenAt(new Date().toISOString().slice(0, 10));
    setActivityId("");
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
  };
  const pickFile = () => fileRef.current?.click();
  const onPick = async (e) => {
    const f = e.target.files?.[0];
    if (!f || busy) return;
    setBusy(true);
    try {
      const { path } = await uploadFamilyPhoto({ file: f, familyId, kind: "album" });
      const row = {
        id: "ap_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
        uploadedBy: user?.id || null,
        path,
        caption: caption.trim(),
        takenAt,
        activityId: activityId || null,
      };
      onSave(row);
      reset();
      setOpen(false);
    } catch (err) {
      toast.error(t("pg_upload_fail", "Upload failed: {msg}").replaceAll("{msg}", err.message || err));
      setBusy(false);
    }
  };
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full mb-3 rounded-2xl border-2 border-dashed border-pink-300 bg-pink-50 text-pink-700 py-3 font-extrabold text-sm flex items-center justify-center gap-2 active:scale-[0.99]"
      >
        <Plus size={16} /> {t("pg_add_memory", "Add a memory")}
        <Heart size={14} className="text-pink-500" />
      </button>
    );
  }
  return (
    <div className="mb-3 rounded-2xl bg-white border-2 border-pink-200 p-3 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-extrabold uppercase tracking-wider text-pink-600 flex items-center gap-1.5">
          <Heart size={12} /> {t("pg_new_memory", "New Memory")}
        </div>
        <button
          type="button"
          onClick={() => { reset(); setOpen(false); }}
          className="text-slate-400 p-1"
          aria-label={t("pg_cancel_aria", "Cancel")}
        >
          <X size={16} />
        </button>
      </div>
      <input
        type="text"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder={t("pg_caption_ph", "Caption — what's this from? (optional)")}
        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm mb-2"
      />
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">{t("pg_date_label", "Date")}</label>
          <input
            type="date"
            value={takenAt}
            onChange={(e) => setTakenAt(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-2 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">{t("pg_activity_optional", "Activity (optional)")}</label>
          <select
            value={activityId}
            onChange={(e) => setActivityId(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-2 py-2 text-sm bg-white"
          >
            <option value="">{t("pg_activity_none", "— none —")}</option>
            {activeActivities.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={onPick}
        className="hidden"
      />
      <button
        type="button"
        onClick={pickFile}
        disabled={busy}
        className={`w-full py-3 rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2 ${
          busy ? "bg-slate-200 text-slate-400" : "bg-pink-600 text-white active:scale-95"
        }`}
      >
        <Camera size={16} /> {busy ? t("pg_uploading", "Uploading…") : t("pg_pick_photo", "Pick a photo")}
      </button>
      <div className="text-[11px] text-slate-400 mt-2 text-center">
        {t("pg_privacy_hint", "Photos are private to your family. The album lives in the same gallery as Schoolwork.")}
      </div>
    </div>
  );
}

export default function PhotoGallery({ completions = [], tasks = [], activities = [], users = [], user, familyId, albumPhotos = [], setAlbumPhotos }) {
  // Derive the canonical flat photo list from BOTH sources:
  //   - completions.proof[]  → source: "schoolwork"
  //   - album_photos[]       → source: "memories"
  // Each entry carries everything the tile/lightbox needs.
  const photos = useMemo(() => {
    const out = [];
    // Schoolwork (proof photos).
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
          key: `c:${c.id}|${p.path}`,
          source: "schoolwork",
          path: p.path,
          date: c.completionDate || c.completion_date || null,
          time: p.time || null,
          uploader,
          activity,
          activityId: activity?.id || null,
          taskTitle,
          caption: "",
        });
      }
    }
    // Memories (parent-added album photos).
    for (const a of albumPhotos || []) {
      if (!a?.path) continue;
      const activity = (activities || []).find((x) => x.id === a.activityId) || null;
      const uploader = (users || []).find((u) => u.id === a.uploadedBy)?.name || null;
      out.push({
        key: `a:${a.id}`,
        source: "memories",
        path: a.path,
        date: a.takenAt || null,
        time: null,
        uploader,
        activity,
        activityId: activity?.id || null,
        taskTitle: "",
        caption: a.caption || "",
      });
    }
    return out;
  }, [completions, tasks, activities, users, albumPhotos]);

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
  const [sourceFilter, setSourceFilter] = useState("all"); // "all" | "schoolwork" | "memories"
  const [openIdx, setOpenIdx] = useState(null);

  const isParent = user?.role === "parent";
  const schoolworkCount = photos.filter((p) => p.source === "schoolwork").length;
  const memoriesCount = photos.filter((p) => p.source === "memories").length;

  const filtered = useMemo(() => {
    let subset = photos;
    if (sourceFilter !== "all") subset = subset.filter((p) => p.source === sourceFilter);
    if (activeActivity) subset = subset.filter((p) => p.activityId === activeActivity);
    const cmp = sortDir === "desc"
      ? (a, b) => (b.date || "").localeCompare(a.date || "")
      : (a, b) => (a.date || "").localeCompare(b.date || "");
    return [...subset].sort(cmp);
  }, [photos, activeActivity, sortDir, sourceFilter]);

  return (
    <div className="px-4 pt-4 pb-12">
      {/* Parent-only "+ Add a memory" upload form. Server-side gate is
          the album_photos RLS policy (with check (is_parent())); this
          UI gate is the secondary courtesy. Helper/kid never see the
          control, which means they never see "Permission denied"
          errors from the server. */}
      {isParent && setAlbumPhotos && (
        <AddMemoryForm
          activities={activities}
          user={user}
          familyId={familyId}
          onSave={(row) => setAlbumPhotos((prev) => [...(prev || []), row])}
        />
      )}

      {/* Source filter pill — All / Schoolwork / Memories. Only renders
          when there are any memories to switch to (otherwise the only
          thing it could do is show 0). */}
      {memoriesCount > 0 && (
        <div className="flex items-center gap-1 bg-slate-100 rounded-2xl p-1 mb-3 text-[11px] font-bold">
          {[
            { k: "all",        label: t("pg_filter_all", "All"),               count: photos.length },
            { k: "schoolwork", label: t("pg_filter_schoolwork", "Schoolwork"), count: schoolworkCount },
            { k: "memories",   label: t("pg_filter_memories", "Memories"),     count: memoriesCount },
          ].map((s) => (
            <button
              key={s.k}
              type="button"
              onClick={() => setSourceFilter(s.k)}
              className={`flex-1 py-1.5 rounded-xl transition ${
                sourceFilter === s.k ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"
              }`}
            >
              {s.label} · {s.count}
            </button>
          ))}
        </div>
      )}

      {/* Header / count + sort */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="text-sm text-slate-500">
          <span className="font-extrabold text-slate-800">{filtered.length}</span>
          {" "}{filtered.length === 1 ? t("pg_count_one", "photo") : t("pg_count_many", "photos")}
          {activeActivity && (
            <button
              type="button"
              onClick={() => setActiveActivity(null)}
              className="ml-2 text-[11px] font-bold text-indigo-600"
            >
              {t("pg_clear_filter", "clear filter")}
            </button>
          )}
        </div>
        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
          <button
            type="button"
            onClick={() => setSortDir("desc")}
            className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${sortDir === "desc" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}
          >
            {t("pg_sort_newest", "Newest")}
          </button>
          <button
            type="button"
            onClick={() => setSortDir("asc")}
            className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${sortDir === "asc" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}
          >
            {t("pg_sort_oldest", "Oldest")}
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
            {t("pg_filter_all", "All")} · {photos.length}
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
            {photos.length === 0 ? t("pg_empty_none", "No photos yet.") : t("pg_empty_filter", "No photos in this filter.")}
          </div>
          <div className="text-[11px] mt-1">
            {photos.length === 0
              ? t("pg_empty_hint_none", "Tap a chore that asks for a photo — proofs show up here.")
              : t("pg_empty_hint_filter", "Pick another activity above, or clear the filter.")}
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
