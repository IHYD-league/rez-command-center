import React, { useMemo, useState } from "react";
import { Download, Calendar as CalIcon, Filter, FileText, Image as ImageIcon } from "lucide-react";
import JSZip from "jszip";
import { signedUrlFor } from "./lib/storage.js";
import { toast } from "./lib/toast.js";

/* =====================================================================
   DataExport — Phase 4 (CSV-only).

   Pure derived view + Blob download. Reads already-loaded shared props
   (completions, tasks, activities, songs, songPlays, books). No queries
   from the new code, no schema, no writes.

   Datasets:
     completions     — every approved/pending/needs-fix row with task,
                       activity, stars, dates, who-did-what, notes
     songs_and_plays — joined: one row per play, song title + artist
                       resolved
     practice_min    — drum-practice extras flattened: drumeo + melodics
                       per completion, with total
     books           — full book records with status/lang/level/dates

   Filters (per dataset):
     Date range: applies to the dataset's canonical date column
                 (completion_date / played_on / started or created_at)
     Activity:   only shown for completions; chips of activities
                 actually present in the data
     Status:     only shown for books; reading/finished/wishlist/dropped

   Honest framing: granular logging started ~Jun 2026 — past data is
   sparse. Row-count preview reflects exactly what hits the file.

   Photo ZIP intentionally NOT in this round. Tabular CSVs are the
   lower-risk first ship on iPhone. Photo bundle comes next.
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

// CSV cell escaping. RFC 4180-ish: quote when the cell contains a
// comma, quote, CR, or LF; doubled quotes inside the cell. No BOM
// (some Excel installs prefer one; iOS Numbers handles without).
function csvCell(v) {
  if (v == null) return "";
  const s = typeof v === "string" ? v : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
function toCsv(rows, headers) {
  const head = headers.map((h) => csvCell(h.label)).join(",");
  const body = rows.map((r) => headers.map((h) => csvCell(h.value(r))).join(",")).join("\n");
  return rows.length === 0 ? head + "\n" : head + "\n" + body + "\n";
}

function downloadCsv(filename, csv) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  // Detach + revoke after the click lands so iOS Safari can hand the
  // blob to its share sheet before the URL goes away.
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 250);
}

function todayIso() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}

function clampDate(iso, from, to) {
  // Returns true if iso (YYYY-MM-DD) falls within [from, to] inclusive.
  // null/empty iso → fails the filter (excluded) — caller decides whether
  // to keep rows with no date by filtering before this is called.
  if (!iso) return false;
  if (from && iso < from) return false;
  if (to && iso > to) return false;
  return true;
}

const DATASETS = [
  { id: "completions",      label: "Completions",       sub: "Every approved/pending row + task + stars + dates",  icon: "✅" },
  { id: "songs_and_plays",  label: "Songs & Plays",     sub: "One row per play, song title + artist resolved",     icon: "🎵" },
  { id: "practice_min",     label: "Practice Minutes",  sub: "Drumeo + Melodics per drum-practice session",        icon: "🥁" },
  { id: "books",            label: "Books",             sub: "Title · language · level · status · dates",          icon: "📚" },
];

const BOOK_STATUSES = ["reading", "finished", "wishlist", "dropped"];

export default function DataExport({
  completions = [],
  tasks = [],
  activities = [],
  songs = [],
  songPlays = [],
  books = [],
  users = [],
  awards = [],
  albumPhotos = [],
  gifted = [],
}) {
  const [datasetId, setDatasetId] = useState("completions");
  const [from, setFrom] = useState("");      // empty = no lower bound
  const [to, setTo]     = useState(todayIso());
  const [activeActs, setActiveActs] = useState(new Set()); // empty = all
  const [bookStatuses, setBookStatuses] = useState(new Set()); // empty = all
  // When a date range is set, backlog (pre-tracking) books are excluded
  // by default — they have no real date. Parents can opt them back in.
  const [includeBacklog, setIncludeBacklog] = useState(false);

  // Activity facets for the completions dataset — only show activities
  // actually present in the data (so the chip row stays short).
  const activityFacets = useMemo(() => {
    const seen = new Set();
    for (const c of completions || []) {
      const t = (tasks || []).find((x) => x.id === c.taskId);
      const aid = t?.activityId || TYPE_TO_ACT[t?.activityType];
      if (aid) seen.add(aid);
    }
    return (activities || []).filter((a) => seen.has(a.id));
  }, [completions, tasks, activities]);

  function activityFor(taskId) {
    const t = (tasks || []).find((x) => x.id === taskId);
    const aid = t?.activityId || TYPE_TO_ACT[t?.activityType];
    return (activities || []).find((a) => a.id === aid) || null;
  }
  function userName(id) {
    return (users || []).find((u) => u.id === id)?.name || id || "";
  }

  /* ----- per-dataset filtered rows + CSV headers --------------------- */

  const completionsFiltered = useMemo(() => {
    return (completions || []).filter((c) => {
      const date = c.completionDate || c.completion_date || "";
      if (!clampDate(date, from, to)) return false;
      if (activeActs.size > 0) {
        const act = activityFor(c.taskId);
        if (!act || !activeActs.has(act.id)) return false;
      }
      return true;
    });
  }, [completions, from, to, activeActs, tasks, activities]);

  const songPlaysFiltered = useMemo(() => {
    return (songPlays || []).filter((sp) => {
      const date = sp.playedOn || sp.played_on || sp.date || "";
      return clampDate(date, from, to);
    });
  }, [songPlays, from, to]);

  const practiceFiltered = useMemo(() => {
    // One row per completion with non-zero minutes logged.
    const out = [];
    for (const c of completions || []) {
      const date = c.completionDate || c.completion_date || "";
      if (!clampDate(date, from, to)) continue;
      const d = Number(c?.extra?.drumeo || 0);
      const m = Number(c?.extra?.melodics || 0);
      if (d + m <= 0) continue;
      out.push({ c, d, m, date });
    }
    return out;
  }, [completions, from, to]);

  const booksFiltered = useMemo(() => {
    return (books || []).filter((b) => {
      const isBacklog = !!b.preTracking;
      const hasFilter = from || to;
      // Backlog rule: when ANY date filter is active, backlog books are
      // excluded by default (they have no real date — we don't fake one).
      // The `includeBacklog` checkbox flips them back in honestly.
      if (hasFilter && isBacklog && !includeBacklog) return false;
      // Tracked rows: clamp by date as before.
      if (hasFilter && !isBacklog) {
        const date = b.started || b.createdAt || b.created_at || "";
        if (!date) return false;
        if (!clampDate(date.slice(0, 10), from, to)) return false;
      }
      if (bookStatuses.size > 0 && !bookStatuses.has(b.status || "reading")) return false;
      return true;
    });
  }, [books, from, to, bookStatuses, includeBacklog]);

  function buildCsv() {
    if (datasetId === "completions") {
      const headers = [
        { label: "completion_id",   value: (c) => c.id },
        { label: "task_id",         value: (c) => c.taskId },
        { label: "task_title",      value: (c) => ((tasks || []).find((t) => t.id === c.taskId)?.title) || "" },
        { label: "activity",        value: (c) => activityFor(c.taskId)?.name || "" },
        { label: "status",          value: (c) => c.status || "" },
        { label: "awarded_stars",   value: (c) => c.awardedStars ?? 0 },
        { label: "pending_stars",   value: (c) => c.pendingStars ?? 0 },
        { label: "completion_date", value: (c) => c.completionDate || c.completion_date || "" },
        { label: "submitted_by",    value: (c) => userName(c.submittedBy) },
        { label: "approved_by",     value: (c) => userName(c.approvedBy) },
        { label: "notes",           value: (c) => c.notes || "" },
      ];
      return toCsv(completionsFiltered, headers);
    }
    if (datasetId === "songs_and_plays") {
      const headers = [
        { label: "play_id",      value: (sp) => sp.id },
        { label: "song_id",      value: (sp) => sp.songId || sp.song_id },
        { label: "title",        value: (sp) => (songs || []).find((s) => s.id === (sp.songId || sp.song_id))?.title || "" },
        { label: "artist",       value: (sp) => (songs || []).find((s) => s.id === (sp.songId || sp.song_id))?.artist || "" },
        { label: "played_on",    value: (sp) => sp.playedOn || sp.played_on || "" },
        { label: "played_by",    value: (sp) => userName(sp.playedBy || sp.played_by) },
        { label: "notes",        value: (sp) => sp.notes || "" },
      ];
      return toCsv(songPlaysFiltered, headers);
    }
    if (datasetId === "practice_min") {
      const headers = [
        { label: "completion_id", value: (r) => r.c.id },
        { label: "date",          value: (r) => r.date },
        { label: "task",          value: (r) => ((tasks || []).find((t) => t.id === r.c.taskId)?.title) || "" },
        { label: "drumeo_min",    value: (r) => r.d },
        { label: "melodics_min",  value: (r) => r.m },
        { label: "total_min",     value: (r) => r.d + r.m },
        { label: "song_list",     value: (r) => r.c?.extra?.songList || "" },
        { label: "notes",         value: (r) => r.c.notes || "" },
      ];
      return toCsv(practiceFiltered, headers);
    }
    if (datasetId === "books") {
      const headers = [
        { label: "book_id",      value: (b) => b.id },
        { label: "title",        value: (b) => b.title || "" },
        { label: "lang",         value: (b) => b.lang || "" },
        { label: "level",        value: (b) => b.level || "" },
        { label: "status",       value: (b) => b.status || "" },
        { label: "started",      value: (b) => b.started || "" },
        { label: "finished",     value: (b) => b.finished || "" },
        { label: "rating",       value: (b) => b.rating ?? "" },
        { label: "pre_tracking", value: (b) => (b.preTracking ? "true" : "false") },
        { label: "era_label",    value: (b) => b.eraLabel || "" },
        { label: "notes",        value: (b) => b.notes || "" },
      ];
      return toCsv(booksFiltered, headers);
    }
    return "";
  }

  const rowCount = (() => {
    if (datasetId === "completions") return completionsFiltered.length;
    if (datasetId === "songs_and_plays") return songPlaysFiltered.length;
    if (datasetId === "practice_min") return practiceFiltered.length;
    if (datasetId === "books") return booksFiltered.length;
    return 0;
  })();

  function onExport() {
    if (rowCount === 0) return;
    const csv = buildCsv();
    const range = `${from || "all"}_to_${to || "all"}`;
    // Filename derives from the first kid's name so each family's
    // exports are self-labeled. Falls back to "family" when the
    // family hasn't created a kid profile yet.
    const kid = (users || []).find((u) => u.role === "kid");
    const slug = (kid?.name || "family").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "family";
    const fname = `${slug}-${datasetId.replace(/_/g, "-")}-${range}.csv`;
    downloadCsv(fname, csv);
  }

  const toggleSet = (set, setSetter, key) => {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSetter(next);
  };

  return (
    <div className="px-4 pt-4 pb-12">
      {/* Header card */}
      <div className="rounded-2xl p-4 text-white mb-4 relative overflow-hidden"
           style={{ background: "linear-gradient(135deg, #0f766e 0%, #0891b2 55%, #6366f1 100%)" }}>
        <Download size={64} className="absolute -right-4 -top-4 text-white/15" />
        <div className="text-xs uppercase tracking-wider font-bold opacity-85">Data Export</div>
        <div className="text-xl font-extrabold mt-0.5">Own your data</div>
        <div className="text-[11px] opacity-85 mt-2 leading-snug">
          Pick a dataset and filters, see the row count, and download a CSV
          you can open in Numbers, Excel, or Google Sheets. Family data
          belongs to the family.
        </div>
      </div>

      {/* Dataset chooser */}
      <div className="text-[11px] uppercase tracking-wider font-bold text-slate-500 px-1 mb-1.5">Dataset</div>
      <div className="grid grid-cols-1 gap-1.5 mb-4">
        {DATASETS.map((d) => {
          const on = datasetId === d.id;
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => setDatasetId(d.id)}
              className={`flex items-center gap-3 p-3 rounded-2xl border-2 text-left transition ${
                on ? "border-teal-500 bg-teal-50" : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <span className="text-2xl shrink-0">{d.icon}</span>
              <span className="flex-1 min-w-0">
                <span className={`block font-extrabold text-sm ${on ? "text-teal-800" : "text-slate-800"}`}>
                  {d.label}
                </span>
                <span className="block text-[11px] text-slate-500 truncate">{d.sub}</span>
              </span>
              {on && (
                <span className="text-[10px] font-bold uppercase tracking-wider bg-teal-600 text-white px-2 py-0.5 rounded-full shrink-0">
                  Chosen
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Date range */}
      <div className="text-[11px] uppercase tracking-wider font-bold text-slate-500 px-1 mb-1.5 flex items-center gap-1.5">
        <CalIcon size={12} /> Date range
      </div>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <label className="rounded-xl border border-slate-200 bg-white px-3 py-2 flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">From</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            max={to || undefined}
            className="text-sm font-semibold text-slate-800 bg-transparent outline-none"
          />
        </label>
        <label className="rounded-xl border border-slate-200 bg-white px-3 py-2 flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">To</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            min={from || undefined}
            className="text-sm font-semibold text-slate-800 bg-transparent outline-none"
          />
        </label>
      </div>
      <button
        type="button"
        onClick={() => { setFrom(""); setTo(""); }}
        className="text-[11px] font-bold text-teal-700 -mt-3 mb-4 px-1"
      >
        Clear date range (all time)
      </button>

      {/* Activity filter (completions only) */}
      {datasetId === "completions" && activityFacets.length > 0 && (
        <>
          <div className="text-[11px] uppercase tracking-wider font-bold text-slate-500 px-1 mb-1.5 flex items-center gap-1.5">
            <Filter size={12} /> Activity {activeActs.size > 0 && <span className="text-teal-700">· {activeActs.size} selected</span>}
          </div>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {activityFacets.map((a) => {
              const on = activeActs.has(a.id);
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => toggleSet(activeActs, setActiveActs, a.id)}
                  className={`text-[11px] font-bold px-2.5 py-1.5 rounded-full border-2 transition flex items-center gap-1.5 ${
                    on ? "text-white" : "bg-white text-slate-700"
                  }`}
                  style={{
                    borderColor: a.color || "#cbd5e1",
                    background: on ? (a.color || "#1f2937") : undefined,
                  }}
                >
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ background: on ? "white" : (a.color || "#64748b") }}
                  />
                  {a.name}
                </button>
              );
            })}
            {activeActs.size > 0 && (
              <button
                type="button"
                onClick={() => setActiveActs(new Set())}
                className="text-[11px] font-bold text-slate-500 px-2 py-1.5"
              >
                Clear
              </button>
            )}
          </div>
        </>
      )}

      {/* Book status filter (books only) */}
      {datasetId === "books" && (
        <>
          <div className="text-[11px] uppercase tracking-wider font-bold text-slate-500 px-1 mb-1.5 flex items-center gap-1.5">
            <Filter size={12} /> Status {bookStatuses.size > 0 && <span className="text-teal-700">· {bookStatuses.size} selected</span>}
          </div>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {BOOK_STATUSES.map((s) => {
              const on = bookStatuses.has(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSet(bookStatuses, setBookStatuses, s)}
                  className={`text-[11px] font-bold px-2.5 py-1.5 rounded-full border-2 transition ${
                    on
                      ? "border-teal-600 bg-teal-600 text-white"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  {s}
                </button>
              );
            })}
            {bookStatuses.size > 0 && (
              <button
                type="button"
                onClick={() => setBookStatuses(new Set())}
                className="text-[11px] font-bold text-slate-500 px-2 py-1.5"
              >
                Clear
              </button>
            )}
          </div>
          {(from || to) && (
            <label className="flex items-center gap-2 mb-4 px-1 cursor-pointer">
              <input
                type="checkbox"
                checked={includeBacklog}
                onChange={(e) => setIncludeBacklog(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-[11px] text-slate-600">
                Include backlog (pre-tracking, no real date)
              </span>
            </label>
          )}
        </>
      )}

      {/* Row-count preview */}
      <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3 mb-3 flex items-center justify-between">
        <div className="text-sm">
          <span className="font-extrabold text-slate-800">{rowCount}</span>
          {" "}
          <span className="text-slate-500">{rowCount === 1 ? "row" : "rows"} will be exported</span>
        </div>
        <FileText size={18} className="text-slate-400" />
      </div>

      {/* Export button */}
      <button
        type="button"
        onClick={onExport}
        disabled={rowCount === 0}
        className={`w-full py-3.5 rounded-2xl font-extrabold flex items-center justify-center gap-2 active:scale-95 transition ${
          rowCount === 0
            ? "bg-slate-200 text-slate-400"
            : "bg-teal-600 text-white shadow"
        }`}
      >
        <Download size={18} />
        {rowCount === 0 ? "Nothing to export with these filters" : "Download CSV"}
      </button>

      {/* Mobile-Safari note + framing */}
      <div className="text-[11px] text-slate-500 mt-4 leading-snug px-1">
        <span className="font-bold">On iPhone:</span> the file lands in your <b>Files app</b> (or a share-sheet
        with "Save to Files" / "Open in Numbers" / AirDrop). On desktop it goes to your normal Downloads folder.
      </div>
      <PhotoBundleCard
        completions={completions}
        albumPhotos={albumPhotos}
        books={books}
        songs={songs}
        users={users}
        awards={awards}
        gifted={gifted}
        tasks={tasks}
      />
    </div>
  );
}

// Collect every storage path the family has uploaded across the
// whole app. Mike's framing: "Export Data should include all photos
// you have uploaded across the entire app. Accomplishments, Photo
// gallery. Anywhere." Buckets each path under a folder so the parent
// downloads a single ZIP and can immediately see what's what:
//   proof/   — completion proof shots
//   album/   — album / memory photos
//   covers/  — book + song custom covers
//   avatars/ — profile photos
//   awards/  — accomplishment uploads
//   gifts/   — bonus-star photo proofs
//
// Returns [{ path, folder, name, sourceRef }]. sourceRef is a short
// human-readable label that lands in the manifest CSV so the parent
// can reconcile each file with its DB row.
function collectAllPhotoPaths({ completions = [], albumPhotos = [], books = [], songs = [], users = [], awards = [], gifted = [], tasks = [] }) {
  const out = [];
  const taskById = Object.fromEntries(tasks.map((t) => [t.id, t]));
  // Completion proofs
  for (const c of completions) {
    if (!Array.isArray(c.proof)) continue;
    for (const p of c.proof) {
      if (!p?.path) continue;
      const task = taskById[c.taskId];
      out.push({
        path: p.path,
        folder: "proof",
        name: p.name || basenameOf(p.path),
        sourceRef: `completion ${c.id} · ${task?.title || c.taskId} · ${c.completionDate || ""}`,
      });
    }
  }
  // Album / memory photos
  for (const a of albumPhotos) {
    if (!a?.path) continue;
    out.push({
      path: a.path,
      folder: "album",
      name: a.caption ? `${a.caption.slice(0, 40)}.jpg` : basenameOf(a.path),
      sourceRef: `album ${a.id} · ${a.caption || ""} · ${a.takenAt || ""}`,
    });
  }
  // Book covers (custom uploads only — Open Library URLs aren't ours)
  for (const b of books) {
    if (!b?.customCoverPath) continue;
    out.push({
      path: b.customCoverPath,
      folder: "covers",
      name: `book-${slugify(b.canonicalTitle || b.title) || b.id}.jpg`,
      sourceRef: `book ${b.id} · ${b.canonicalTitle || b.title || ""}`,
    });
  }
  // Song covers (custom uploads only)
  for (const s of songs) {
    if (!s?.customCoverPath) continue;
    out.push({
      path: s.customCoverPath,
      folder: "covers",
      name: `song-${slugify(s.canonicalTitle || s.title) || s.id}.jpg`,
      sourceRef: `song ${s.id} · ${s.canonicalTitle || s.title || ""}`,
    });
  }
  // Profile avatars
  for (const u of users) {
    if (!u?.photo) continue;
    // Skip external URLs (data:, https://) — only export our own storage.
    if (/^(https?|data|blob):/.test(u.photo)) continue;
    out.push({
      path: u.photo,
      folder: "avatars",
      name: `${slugify(u.name) || u.id}.jpg`,
      sourceRef: `avatar ${u.id} · ${u.name || ""}`,
    });
  }
  // Awards / accomplishments
  for (const a of awards) {
    if (!a?.filePath) continue;
    out.push({
      path: a.filePath,
      folder: "awards",
      name: `award-${slugify(a.title) || a.id}.jpg`,
      sourceRef: `award ${a.id} · ${a.title || ""}`,
    });
  }
  // Gift bonus photo proofs
  for (const g of gifted) {
    const p = g?.extra?.photoPath;
    if (!p) continue;
    out.push({
      path: p,
      folder: "gifts",
      name: `gift-${slugify(g.label) || g.id}.jpg`,
      sourceRef: `gift ${g.id} · ${g.label || ""} · ${g.date || ""}`,
    });
  }
  // Dedupe — content-hashing means many surfaces can reference the
  // same path. Keep the first occurrence's folder; record the rest as
  // alternate sourceRefs so the manifest is complete.
  const byPath = new Map();
  for (const item of out) {
    const existing = byPath.get(item.path);
    if (!existing) {
      byPath.set(item.path, { ...item, altRefs: [] });
    } else {
      existing.altRefs.push(item.sourceRef);
    }
  }
  return [...byPath.values()];
}

function basenameOf(path) {
  const seg = (path || "").split("/").pop() || "photo";
  return seg.includes(".") ? seg : `${seg}.jpg`;
}
function slugify(s) {
  return (s || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
}

function PhotoBundleCard(props) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const items = useMemo(() => collectAllPhotoPaths(props), [props]);
  const total = items.length;
  const buildZip = async () => {
    if (busy || total === 0) return;
    setBusy(true);
    setProgress(0);
    try {
      const zip = new JSZip();
      const usedNames = new Set();
      // Manifest CSV documents every entry so the parent can trace a
      // file back to the DB row it came from. Written first so it
      // lives at the root of the zip regardless of fetch failures.
      const manifestRows = [
        ["folder", "filename", "source_ref", "alt_refs", "storage_path"],
      ];
      let downloaded = 0;
      let failed = 0;
      // Fetch in parallel batches so we don't hammer the network but
      // also don't take forever on slow connections. 4 at a time is a
      // safe baseline for Supabase signed-URL bandwidth.
      const BATCH = 4;
      for (let i = 0; i < items.length; i += BATCH) {
        const batch = items.slice(i, i + BATCH);
        await Promise.all(batch.map(async (it) => {
          // Disambiguate filenames within a folder so two completions
          // with the same proof name don't collide in the zip.
          let name = it.name;
          let n = 1;
          while (usedNames.has(`${it.folder}/${name}`)) {
            const dot = name.lastIndexOf(".");
            const stem = dot > 0 ? name.slice(0, dot) : name;
            const ext = dot > 0 ? name.slice(dot) : "";
            name = `${stem}-${n}${ext}`;
            n += 1;
          }
          usedNames.add(`${it.folder}/${name}`);
          try {
            const url = await signedUrlFor(it.path);
            if (!url) throw new Error("no signed URL");
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const blob = await res.blob();
            zip.file(`${it.folder}/${name}`, blob);
            downloaded += 1;
            manifestRows.push([it.folder, name, it.sourceRef, (it.altRefs || []).join(" | "), it.path]);
          } catch (err) {
            failed += 1;
            // Eat the failure — partial bundles are still useful.
            manifestRows.push([it.folder, name, `MISSING (${err.message || err}) — ${it.sourceRef}`, (it.altRefs || []).join(" | "), it.path]);
          }
          setProgress(downloaded + failed);
        }));
      }
      const manifestCsv = manifestRows
        .map((row) => row.map((cell) => {
          const s = String(cell ?? "");
          return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        }).join(","))
        .join("\n");
      zip.file("manifest.csv", manifestCsv);
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `command-center-photos-${stamp}.zip`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 1000);
      if (failed > 0) {
        toast.info?.(`Bundle ready: ${downloaded} photo${downloaded === 1 ? "" : "s"} downloaded, ${failed} couldn't be reached. See manifest.csv inside the zip.`);
      } else {
        toast.success?.(`Bundle ready — ${downloaded} photo${downloaded === 1 ? "" : "s"} 📸`);
      }
    } catch (err) {
      toast.error?.("Photo bundle failed: " + (err?.message || err));
    } finally {
      setBusy(false);
      setProgress(0);
    }
  };
  return (
    <div className="mt-6 rounded-3xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-pink-50 p-4">
      <div className="flex items-center gap-2 mb-1">
        <ImageIcon size={18} className="text-violet-600" />
        <div className="text-sm font-extrabold text-slate-800">Photo bundle</div>
      </div>
      <div className="text-[11px] text-slate-600 leading-snug mb-3">
        Downloads every photo your family has uploaded across the whole app — proof shots, album memories, book covers, song covers, accomplishment files, gift photo proofs, profile avatars. Each lands in a sensibly named folder inside one .zip. A manifest.csv inside the zip ties each file back to the row it came from.
      </div>
      <div className="rounded-2xl bg-white border border-violet-100 p-3 mb-3 flex items-center justify-between">
        <div className="text-sm">
          <span className="font-extrabold text-slate-800 tabular-nums">{total}</span>
          {" "}
          <span className="text-slate-500">{total === 1 ? "photo" : "photos"} ready to bundle</span>
        </div>
        {busy && total > 0 && (
          <div className="text-[12px] font-bold text-violet-700 tabular-nums">{progress} / {total}</div>
        )}
      </div>
      <button
        type="button"
        onClick={buildZip}
        disabled={busy || total === 0}
        className={`w-full py-3.5 rounded-2xl font-extrabold flex items-center justify-center gap-2 active:scale-95 transition ${
          busy || total === 0
            ? "bg-slate-200 text-slate-400"
            : "bg-violet-600 text-white shadow"
        }`}
      >
        <Download size={18} />
        {busy ? `Bundling… (${progress} / ${total})` : (total === 0 ? "No photos to bundle yet" : "Download photo bundle (.zip)")}
      </button>
      <div className="text-[10px] text-slate-500 mt-2 leading-snug">
        Large bundles may take a minute. The zip lands wherever your browser puts downloads.
        On iPhone, expect a Save-to-Files prompt.
      </div>
    </div>
  );
}
