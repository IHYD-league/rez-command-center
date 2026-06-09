import React, { useMemo, useState, useEffect, useRef } from "react";
import { Drum, Music, BookOpen, Image as ImageIcon, Heart, TrendingUp, Sparkles, Check, X, RotateCcw, Camera, Save } from "lucide-react";
import { searchOpenLibrary, pickFirstMatch as pickBookMatch } from "./lib/enrichBook.js";
import { searchMusicBrainz, pickFirstMatch as pickSongMatch } from "./lib/enrichSong.js";
import { uploadFamilyPhoto, useSignedUrl } from "./lib/storage.js";

/* =====================================================================
   Insights — Phase 3.

   Pure read-only display layer. Every number is a useMemo over already-
   loaded shared props (completions, tasks, activities, books, songs,
   songPlays, albumPhotos). No queries, no writes, no schema.

   Honest framing: granular logging started ~June 2026. Every time-based
   card surfaces "Tracking since {date}" so charts can't imply data we
   don't have. Per-card date is the minimum of the underlying source so
   each section is honest on its own terms.

   Out of scope per the v3 brief: data export, slideshows, album-art
   enrichment, fancier chart libraries. Inline SVG for the only chart.
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
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtShort(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T12:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function todayIso() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}
function daysBack(n) {
  // Returns array of YYYY-MM-DD strings, oldest → newest, of the last n days.
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    out.push([d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-"));
  }
  return out;
}

// Small section heading with optional "tracking since" note.
function SectionHead({ icon: Icon, title, since, color = "#6366f1" }) {
  return (
    <div className="flex items-baseline justify-between gap-2 mb-2 mt-5 px-1 first:mt-0">
      <div className="flex items-center gap-2 font-extrabold text-slate-800 text-base">
        {Icon && (
          <span
            className="inline-flex w-6 h-6 rounded-lg items-center justify-center"
            style={{ background: color + "22", color }}
          >
            <Icon size={14} />
          </span>
        )}
        {title}
      </div>
      {since && (
        <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
          since {fmtShort(since)}
        </div>
      )}
    </div>
  );
}

function Card({ children, className = "" }) {
  return (
    <div className={`rounded-2xl bg-white border border-slate-100 shadow-sm p-4 ${className}`}>
      {children}
    </div>
  );
}

// Inline 14-day mini bar graph. height in px; values: array of {date, value}.
function DayBars({ data, color = "#7c3aed", suffix = "" }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const H = 56;
  return (
    <div className="mt-3">
      <div className="flex items-end gap-1 h-14">
        {data.map((d) => {
          const h = (d.value / max) * H;
          const today = d.date === todayIso();
          return (
            <div key={d.date} className="flex-1 flex flex-col items-center justify-end" title={`${fmtShort(d.date)} · ${d.value}${suffix}`}>
              <div
                className="w-full rounded-t"
                style={{
                  height: Math.max(d.value > 0 ? 4 : 0, h),
                  background: d.value > 0 ? color : "#f1f5f9",
                  border: today ? `1px solid ${color}` : "none",
                  borderBottom: "none",
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1 mt-1">
        {data.map((d, i) => (
          <div key={d.date} className="flex-1 text-center text-[9px] text-slate-400 font-bold">
            {i === 0 || i === data.length - 1 || i === Math.floor(data.length / 2) ? fmtShort(d.date) : ""}
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyLine({ children }) {
  return <div className="text-[12px] text-slate-400 italic">{children}</div>;
}

// Single book row that renders its cover thumbnail (when enriched),
// auto-enriches on first render if match_status === "unmatched", and
// shows Confirm / Pick another / Skip CTAs when status === "auto".
// Updates persist through updateBook(id, patch) — same synced setter
// the Reading Library uses, so a single call replicates to Supabase
// and back into shared state.
function EnrichedBookRow({ b, updateBook }) {
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  // Auto-enrich on first render. Idempotent: pickFirstMatch de-dupes
  // concurrent calls, and we guard on match_status so a row only
  // ever fetches once per family-life. Effects don't fire when
  // updateBook is missing (e.g. some preview viewers); the row still
  // renders correctly with whatever cached fields it has.
  useEffect(() => {
    if (!updateBook) return;
    if (b.matchStatus && b.matchStatus !== "unmatched") return;
    if (!b.title) return;
    let cancelled = false;
    (async () => {
      const match = await pickBookMatch(b.title, b.canonicalAuthor || "");
      if (cancelled || !match) return;
      updateBook(b.id, {
        coverUrl:        match.coverUrl,
        canonicalTitle:  match.title,
        canonicalAuthor: match.author,
        externalSource:  match.externalSource,
        externalId:      match.externalId,
        enrichedAt:      new Date().toISOString(),
        matchStatus:     "auto",
      });
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [b.id, b.matchStatus, b.title]);

  const statusBadge = (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
      b.status === "finished" ? "bg-emerald-100 text-emerald-700"
        : b.status === "wishlist" ? "bg-violet-100 text-violet-700"
        : b.status === "dropped" ? "bg-slate-200 text-slate-500"
        : "bg-amber-100 text-amber-700"
    }`}>{b.status || "reading"}</span>
  );

  const onConfirm = () => updateBook && updateBook(b.id, { matchStatus: "confirmed" });
  const onSkip    = () => updateBook && updateBook(b.id, { matchStatus: "rejected", coverUrl: "" });

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-2">
      <div className="flex items-center gap-2">
        {b.coverUrl ? (
          <img
            src={b.coverUrl}
            alt=""
            draggable={false}
            className="w-10 h-14 object-cover rounded-md border border-slate-200 shrink-0 bg-slate-100"
            loading="lazy"
          />
        ) : (
          <div className="w-10 h-14 rounded-md bg-slate-100 border border-slate-200 grid place-items-center shrink-0 text-slate-300">
            <BookOpen size={16} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-slate-800 truncate">
            {b.canonicalTitle || b.title || "(untitled)"}
          </div>
          <div className="text-[11px] text-slate-500 truncate">
            {b.canonicalAuthor || ""}
            {b.canonicalAuthor && (b.lang || b.level) ? " · " : ""}
            {b.lang}{b.lang && b.level ? " · " : ""}{b.level}
          </div>
        </div>
        {statusBadge}
      </div>
      {b.matchStatus === "auto" && updateBook && !picking && (
        <div className="flex gap-1 mt-2">
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 text-[11px] font-bold px-2 py-1.5 rounded-lg bg-emerald-500 text-white active:scale-95 flex items-center justify-center gap-1"
          >
            <Check size={12} /> Looks right
          </button>
          <button
            type="button"
            onClick={() => setPicking(true)}
            className="flex-1 text-[11px] font-bold px-2 py-1.5 rounded-lg bg-slate-100 text-slate-700 active:scale-95 flex items-center justify-center gap-1"
          >
            <RotateCcw size={12} /> Pick another
          </button>
          <button
            type="button"
            onClick={onSkip}
            disabled={busy}
            className="text-[11px] font-bold px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 active:scale-95"
            aria-label="Skip enrichment"
          >
            Skip
          </button>
        </div>
      )}
      {picking && (
        <BookMatchPicker
          b={b}
          updateBook={updateBook}
          busy={busy}
          setBusy={setBusy}
          onClose={() => setPicking(false)}
        />
      )}
    </div>
  );
}

// Inline picker — fetches up to 5 Open Library candidates for the
// free-typed title + author and renders them as tap-to-select rows.
// On select, writes the chosen result fields onto the row and locks
// match_status = "confirmed".
function BookMatchPicker({ b, updateBook, busy, setBusy, onClose }) {
  const [candidates, setCandidates] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    (async () => {
      try {
        const out = await searchOpenLibrary(b.title, b.canonicalAuthor || "", 5);
        if (!cancelled) setCandidates(out);
      } catch (e) {
        if (!cancelled) setError(e?.message || "search failed");
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => { cancelled = true; };
  }, [b.title]);

  const pick = (c) => {
    if (!updateBook) return;
    updateBook(b.id, {
      coverUrl:        c.coverUrl,
      canonicalTitle:  c.title,
      canonicalAuthor: c.author,
      externalSource:  c.externalSource,
      externalId:      c.externalId,
      enrichedAt:      new Date().toISOString(),
      matchStatus:     "confirmed",
    });
    onClose();
  };

  return (
    <div className="mt-2 rounded-lg bg-slate-50 border border-slate-200 p-2">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
          Pick the right match
        </div>
        <button onClick={onClose} className="text-slate-400" aria-label="Cancel">
          <X size={14} />
        </button>
      </div>
      {busy && <div className="text-[12px] text-slate-400">Searching Open Library…</div>}
      {error && <div className="text-[12px] text-rose-500">Search failed: {error}</div>}
      {candidates && candidates.length === 0 && (
        <div className="text-[12px] text-slate-400">No matches found.</div>
      )}
      {candidates && candidates.length > 0 && (
        <div className="space-y-1">
          {candidates.map((c, i) => (
            <button
              key={c.externalId || i}
              type="button"
              onClick={() => pick(c)}
              className="w-full flex items-center gap-2 p-1.5 rounded-lg bg-white border border-slate-200 hover:border-indigo-300 active:scale-[0.99] text-left"
            >
              {c.coverThumbUrl ? (
                <img src={c.coverThumbUrl} alt="" className="w-8 h-12 object-cover rounded shrink-0 bg-slate-100" />
              ) : (
                <div className="w-8 h-12 rounded bg-slate-100 grid place-items-center shrink-0 text-slate-300">
                  <BookOpen size={12} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-bold text-slate-800 truncate">{c.title}</div>
                <div className="text-[10px] text-slate-500 truncate">
                  {c.author}{c.year ? ` · ${c.year}` : ""}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Single song row that renders its album cover (when enriched),
// auto-enriches on first render if match_status === "unmatched", and
// shows Confirm / Pick another / Skip CTAs when status === "auto".
// Mirrors EnrichedBookRow line-for-line so the two domains stay
// readable side-by-side. MusicBrainz fetches are queued at 1 req/sec
// by the enrichSong helper — a list of 12 unmatched rows that mount
// at once will drain over ~13 seconds, not burst.
function EnrichedSongRow({ s, rank, maxCount, updateSong, familyId }) {
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  // Custom cover takes precedence over MB. Hook is called
  // unconditionally with whatever path we have — when empty, it's a
  // no-op and returns "".
  const customCoverSigned = useSignedUrl(s.customCoverPath || "");
  const displayCover = customCoverSigned || s.coverUrl || "";

  useEffect(() => {
    if (!updateSong) return;
    if (s.matchStatus && s.matchStatus !== "unmatched") return;
    if (!s.title) return;
    let cancelled = false;
    (async () => {
      const match = await pickSongMatch(s.title, s.canonicalArtist || s.artist || "");
      if (cancelled || !match) return;
      updateSong(s.id, {
        coverUrl:        match.coverUrl,
        canonicalTitle:  match.title,
        canonicalArtist: match.artist,
        externalSource:  match.externalSource,
        externalId:      match.externalId,
        enrichedAt:      new Date().toISOString(),
        matchStatus:     "auto",
      });
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.id, s.matchStatus, s.title]);

  const onConfirm = () => updateSong && updateSong(s.id, { matchStatus: "confirmed" });
  const onSkip    = () => updateSong && updateSong(s.id, { matchStatus: "rejected", coverUrl: "" });

  // Parent uploads their own album cover — overrides whatever MB found.
  // Library OR camera (no capture attr) — these are always retroactive.
  const onUpload = async (e) => {
    const f = e.target.files?.[0];
    if (!f || uploading || !updateSong || !familyId) return;
    setUploading(true);
    try {
      const { path } = await uploadFamilyPhoto({ file: f, familyId, kind: "cover" });
      updateSong(s.id, { customCoverPath: path });
    } catch (err) {
      alert("Cover upload failed: " + (err.message || err));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onClearCustom = () => updateSong && updateSong(s.id, { customCoverPath: "" });

  const displayTitle  = s.canonicalTitle  || s.title  || "(unknown)";
  const displayArtist = s.canonicalArtist || s.artist || "";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-2">
      <div className="flex items-center gap-2">
        <span className="w-5 text-right text-[11px] font-bold text-slate-400 shrink-0">#{rank}</span>
        {displayCover ? (
          <img
            src={displayCover}
            alt=""
            draggable={false}
            className="w-9 h-9 object-cover rounded-md border border-slate-200 shrink-0 bg-slate-100"
            loading="lazy"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        ) : (
          <div className="w-9 h-9 rounded-md bg-slate-100 border border-slate-200 grid place-items-center shrink-0 text-slate-300">
            <Music size={14} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-slate-800 truncate">{displayTitle}</div>
          <div className="text-[11px] text-slate-500 truncate">
            {displayArtist}
            {displayArtist && s.last ? " · " : ""}
            {s.last ? `last ${fmtShort(s.last)}` : ""}
          </div>
        </div>
        <span className="relative w-16 h-2 bg-slate-100 rounded-full overflow-hidden shrink-0">
          <span
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ width: `${(s.count / maxCount) * 100}%`, background: "#0891b2" }}
          />
        </span>
        <span className="text-sm font-bold text-cyan-700 w-6 text-right tabular-nums shrink-0">{s.count}</span>
      </div>
      {s.matchStatus === "auto" && updateSong && !picking && (
        <div className="flex gap-1 mt-2">
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 text-[11px] font-bold px-2 py-1.5 rounded-lg bg-emerald-500 text-white active:scale-95 flex items-center justify-center gap-1"
          >
            <Check size={12} /> Looks right
          </button>
          <button
            type="button"
            onClick={() => setPicking(true)}
            className="flex-1 text-[11px] font-bold px-2 py-1.5 rounded-lg bg-slate-100 text-slate-700 active:scale-95 flex items-center justify-center gap-1"
          >
            <RotateCcw size={12} /> Pick another
          </button>
          <button
            type="button"
            onClick={onSkip}
            disabled={busy}
            className="text-[11px] font-bold px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 active:scale-95"
            aria-label="Skip enrichment"
          >
            Skip
          </button>
        </div>
      )}
      {/* Cover-override controls — always available when we can write.
          Tap "Replace cover" to upload a custom image; if a custom cover
          is in place, "Use MB cover" reverts to the auto-matched one. */}
      {updateSong && familyId && !picking && (
        <div className="flex gap-1 mt-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={onUpload}
            className="hidden"
            aria-label="Upload album cover"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className={`flex-1 text-[11px] font-bold px-2 py-1.5 rounded-lg flex items-center justify-center gap-1 ${
              uploading
                ? "bg-slate-200 text-slate-400"
                : "bg-white border border-slate-200 text-slate-600 active:scale-95"
            }`}
          >
            <Camera size={12} /> {uploading ? "Uploading…" : s.customCoverPath ? "Replace cover" : "Use my cover"}
          </button>
          {s.customCoverPath && (
            <button
              type="button"
              onClick={onClearCustom}
              className="text-[11px] font-bold px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 active:scale-95"
              aria-label="Use the auto-matched cover instead"
            >
              Use MB cover
            </button>
          )}
        </div>
      )}
      {picking && (
        <SongMatchPicker
          s={s}
          updateSong={updateSong}
          busy={busy}
          setBusy={setBusy}
          onClose={() => setPicking(false)}
        />
      )}
    </div>
  );
}

// Inline picker — fetches up to 5 MusicBrainz candidates for the
// free-typed title + artist and renders them as tap-to-select rows.
// Goes through the same 1-req/sec queue as auto-enrich.
function SongMatchPicker({ s, updateSong, busy, setBusy, onClose }) {
  const [candidates, setCandidates] = useState(null);
  const [error, setError] = useState("");
  // Editable refinement inputs — pre-filled with what we have, so the
  // first search uses the user-typed title + the auto-matched (or
  // user-typed) artist as a starting point. User can fix typos
  // ("Ariels" → "Aerials") and type the band ("System of a Down") so
  // famous songs disambiguate from random covers.
  const [titleQuery, setTitleQuery] = useState(s.title || "");
  const [artistQuery, setArtistQuery] = useState(s.canonicalArtist || s.artist || "");

  const runSearch = (t, a) => {
    setBusy(true);
    setError("");
    setCandidates(null);
    let cancelled = false;
    (async () => {
      try {
        const out = await searchMusicBrainz(t, a, 5);
        if (!cancelled) setCandidates(out);
      } catch (e) {
        if (!cancelled) setError(e?.message || "search failed");
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => { cancelled = true; };
  };

  // Auto-fire one search on open with the pre-filled values.
  useEffect(() => {
    const cancel = runSearch(s.title || "", s.canonicalArtist || s.artist || "");
    return cancel;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.id]);

  const onSubmit = (e) => {
    e.preventDefault();
    if (busy) return;
    if (!titleQuery.trim()) return;
    runSearch(titleQuery, artistQuery);
  };

  const pick = (c) => {
    if (!updateSong) return;
    updateSong(s.id, {
      coverUrl:        c.coverUrl,
      canonicalTitle:  c.title,
      canonicalArtist: c.artist,
      externalSource:  c.externalSource,
      externalId:      c.externalId,
      enrichedAt:      new Date().toISOString(),
      matchStatus:     "confirmed",
    });
    onClose();
  };

  return (
    <div className="mt-2 rounded-lg bg-slate-50 border border-slate-200 p-2">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
          Pick the right match
        </div>
        <button onClick={onClose} className="text-slate-400" aria-label="Cancel">
          <X size={14} />
        </button>
      </div>
      <form onSubmit={onSubmit} className="flex flex-col gap-1.5 mb-2">
        <div className="grid grid-cols-2 gap-1.5">
          <input
            type="text"
            value={titleQuery}
            onChange={(e) => setTitleQuery(e.target.value)}
            placeholder="Song title"
            className="text-[12px] px-2 py-1.5 rounded-md border border-slate-200 bg-white"
            aria-label="Song title"
          />
          <input
            type="text"
            value={artistQuery}
            onChange={(e) => setArtistQuery(e.target.value)}
            placeholder="Artist / band (helps disambiguate)"
            className="text-[12px] px-2 py-1.5 rounded-md border border-slate-200 bg-white"
            aria-label="Artist or band"
          />
        </div>
        <button
          type="submit"
          disabled={busy || !titleQuery.trim()}
          className={`text-[11px] font-bold px-2 py-1.5 rounded-md flex items-center justify-center gap-1 ${
            busy || !titleQuery.trim()
              ? "bg-slate-200 text-slate-400"
              : "bg-cyan-600 text-white active:scale-95"
          }`}
        >
          {busy ? "Searching…" : "Search MusicBrainz"}
        </button>
      </form>
      {error && <div className="text-[12px] text-rose-500 mb-1">Search failed: {error}</div>}
      {candidates && candidates.length === 0 && !busy && (
        <div className="text-[12px] text-slate-400 mb-1">No matches — try the band name above, or save the values as-is below.</div>
      )}
      {/* Manual override — save the typed title + artist as canonical
          without any MB result. For songs MB just doesn't have, or
          when the user already knows the right values. */}
      {updateSong && titleQuery.trim() && (
        <button
          type="button"
          onClick={() => {
            updateSong(s.id, {
              canonicalTitle:  titleQuery.trim(),
              canonicalArtist: artistQuery.trim(),
              matchStatus:     "confirmed",
              enrichedAt:      new Date().toISOString(),
            });
            onClose();
          }}
          className="w-full text-[11px] font-bold px-2 py-1.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 active:scale-95 flex items-center justify-center gap-1 mb-2"
        >
          <Save size={12} /> Save "{titleQuery.trim()}"{artistQuery.trim() ? ` by ${artistQuery.trim()}` : ""}
        </button>
      )}
      {candidates && candidates.length > 0 && (
        <div className="space-y-1">
          {candidates.map((c, i) => (
            <button
              key={c.externalId || i}
              type="button"
              onClick={() => pick(c)}
              className="w-full flex items-center gap-2 p-1.5 rounded-lg bg-white border border-slate-200 hover:border-indigo-300 active:scale-[0.99] text-left"
            >
              {c.coverThumbUrl ? (
                <img
                  src={c.coverThumbUrl}
                  alt=""
                  className="w-8 h-8 object-cover rounded shrink-0 bg-slate-100"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              ) : (
                <div className="w-8 h-8 rounded bg-slate-100 grid place-items-center shrink-0 text-slate-300">
                  <Music size={12} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-bold text-slate-800 truncate">{c.title}</div>
                <div className="text-[10px] text-slate-500 truncate">
                  {c.artist}{c.year ? ` · ${c.year}` : ""}{c.releaseTitle ? ` · ${c.releaseTitle}` : ""}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Insights({
  completions = [],
  tasks = [],
  activities = [],
  songs = [],
  songPlays = [],
  books = [],
  albumPhotos = [],
  updateBook,
  updateSong,
  familyId,
}) {
  /* ----- PRACTICE TIME ---------------------------------------------- */
  const practiceStats = useMemo(() => {
    let totalMin = 0;
    let drumeoMin = 0;
    let melodicsMin = 0;
    let earliest = null;
    const byDate = new Map(); // YYYY-MM-DD → minutes
    for (const c of completions || []) {
      const drumeo = Number(c?.extra?.drumeo || 0);
      const mel = Number(c?.extra?.melodics || 0);
      const sum = drumeo + mel;
      if (sum > 0) {
        totalMin += sum;
        drumeoMin += drumeo;
        melodicsMin += mel;
        const d = c.completionDate || c.completion_date;
        if (d) {
          byDate.set(d, (byDate.get(d) || 0) + sum);
          if (!earliest || d < earliest) earliest = d;
        }
      }
    }
    const last14 = daysBack(14).map((d) => ({ date: d, value: byDate.get(d) || 0 }));
    const last14Sum = last14.reduce((s, r) => s + r.value, 0);
    return { totalMin, drumeoMin, melodicsMin, earliest, last14, last14Sum };
  }, [completions]);

  /* ----- MOST-PLAYED SONGS ------------------------------------------ */
  const topSongs = useMemo(() => {
    const counts = new Map(); // songId → { count, lastPlayedOn }
    let earliest = null;
    for (const sp of songPlays || []) {
      const sid = sp.songId || sp.song_id;
      if (!sid) continue;
      const date = sp.playedOn || sp.played_on || sp.date;
      const c = counts.get(sid) || { count: 0, last: null };
      c.count += 1;
      if (date && (!c.last || date > c.last)) c.last = date;
      counts.set(sid, c);
      if (date && (!earliest || date < earliest)) earliest = date;
    }
    const out = [...counts.entries()]
      .map(([sid, v]) => {
        const song = (songs || []).find((s) => s.id === sid);
        return {
          id: sid,
          title: song?.title || "(unknown)",
          artist: song?.artist || "",
          // Phase 6b: carry enrichment fields so EnrichedSongRow can
          // render covers and fire auto-enrich without re-reading songs.
          coverUrl:        song?.coverUrl || "",
          canonicalTitle:  song?.canonicalTitle || "",
          canonicalArtist: song?.canonicalArtist || "",
          matchStatus:     song?.matchStatus || "unmatched",
          customCoverPath: song?.customCoverPath || "",
          count: v.count,
          last: v.last,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    return { earliest, list: out, total: songPlays?.length || 0, songsTouched: counts.size };
  }, [songPlays, songs]);

  /* ----- BOOKS ------------------------------------------------------ */
  const booksStats = useMemo(() => {
    // Count-based stats INCLUDE pre-tracking backlog (those are real books).
    // Date-based fields (earliest, recent-by-date) EXCLUDE backlog because
    // backlog has no real date — we don't fake one.
    const buckets = { reading: 0, finished: 0, wishlist: 0, dropped: 0 };
    let earliest = null;
    const byLang = new Map();
    const byLevel = new Map();
    const eraCounts = new Map();
    let backlogCount = 0;
    for (const b of books || []) {
      const status = b.status || "reading";
      buckets[status] = (buckets[status] || 0) + 1;
      if (b.lang) byLang.set(b.lang, (byLang.get(b.lang) || 0) + 1);
      if (b.level) byLevel.set(b.level, (byLevel.get(b.level) || 0) + 1);
      if (b.preTracking) {
        backlogCount += 1;
        const era = b.eraLabel || "Era unset";
        eraCounts.set(era, (eraCounts.get(era) || 0) + 1);
        continue; // skip date logic
      }
      if (b.started && (!earliest || b.started < earliest)) earliest = b.started;
    }
    // Recent list: only tracked books (real dates).
    const tracked = (books || []).filter((b) => !b.preTracking);
    return {
      total: books?.length || 0,
      buckets,
      earliest,
      byLang: [...byLang.entries()].sort((a, b) => b[1] - a[1]),
      byLevel: [...byLevel.entries()].sort((a, b) => b[1] - a[1]),
      recent: [...tracked].sort((a, b) =>
        (b.started || b.created_at || "").localeCompare(a.started || a.created_at || "")
      ).slice(0, 6),
      backlogCount,
      eras: [...eraCounts.entries()].sort((a, b) => b[1] - a[1]),
    };
  }, [books]);

  /* ----- COMPLETIONS BY CATEGORY ------------------------------------ */
  const completionsByCat = useMemo(() => {
    const approved = (completions || []).filter((c) => c.status === "approved");
    let earliest = null;
    const catCounts = new Map(); // task.category → count
    const pillarCounts = new Map(); // activity.pillar → count
    for (const c of approved) {
      const d = c.completionDate || c.completion_date;
      if (d && (!earliest || d < earliest)) earliest = d;
      const t = (tasks || []).find((x) => x.id === c.taskId);
      if (t?.category) catCounts.set(t.category, (catCounts.get(t.category) || 0) + 1);
      const aid = t?.activityId || TYPE_TO_ACT[t?.activityType];
      const act = (activities || []).find((a) => a.id === aid);
      if (act?.pillar) pillarCounts.set(act.pillar, (pillarCounts.get(act.pillar) || 0) + 1);
    }
    return {
      total: approved.length,
      earliest,
      categories: [...catCounts.entries()].sort((a, b) => b[1] - a[1]),
      pillars: [...pillarCounts.entries()].sort((a, b) => b[1] - a[1]),
    };
  }, [completions, tasks, activities]);

  /* ----- PHOTOS COUNTS ---------------------------------------------- */
  const photoStats = useMemo(() => {
    let proofCount = 0;
    const byActivity = new Map();
    for (const c of completions || []) {
      const proof = Array.isArray(c.proof) ? c.proof : [];
      for (const p of proof) {
        if (!p || p.type !== "photo" || !p.path) continue;
        proofCount += 1;
        const t = (tasks || []).find((x) => x.id === c.taskId);
        const aid = t?.activityId || TYPE_TO_ACT[t?.activityType];
        const act = (activities || []).find((a) => a.id === aid);
        const name = act?.name || "Other";
        byActivity.set(name, (byActivity.get(name) || 0) + 1);
      }
    }
    const memCount = (albumPhotos || []).length;
    for (const a of albumPhotos || []) {
      if (a.activityId) {
        const act = (activities || []).find((x) => x.id === a.activityId);
        if (act?.name) byActivity.set(act.name, (byActivity.get(act.name) || 0) + 1);
      }
    }
    return {
      proofCount,
      memCount,
      total: proofCount + memCount,
      byActivity: [...byActivity.entries()].sort((a, b) => b[1] - a[1]),
    };
  }, [completions, tasks, activities, albumPhotos]);

  // Maximum counts for the bar widths in the category list.
  const maxCatCount = Math.max(1, ...completionsByCat.categories.map(([, n]) => n));
  const maxPhotoActCount = Math.max(1, ...photoStats.byActivity.map(([, n]) => n));
  const maxSongPlays = topSongs.list[0]?.count || 1;

  return (
    <div className="px-4 pt-4 pb-12">
      {/* Honest "tracking since" banner (the earliest of any source). */}
      <div className="rounded-2xl p-4 text-white mb-4 relative overflow-hidden"
           style={{ background: "linear-gradient(135deg, #4338ca 0%, #7c3aed 55%, #ec4899 100%)" }}>
        <Sparkles size={64} className="absolute -right-4 -top-4 text-white/15" />
        <div className="text-xs uppercase tracking-wider font-bold opacity-85">Family Insights</div>
        <div className="text-xl font-extrabold mt-0.5">Numbers behind the work</div>
        <div className="text-[11px] opacity-85 mt-2 leading-snug">
          Tracking granular logs since {fmtDate("2026-06-06")}. The streaks
          go further back than the minutes do — that's honest, not a bug.
        </div>
      </div>

      {/* -------- PRACTICE TIME -------- */}
      <SectionHead icon={Drum} title="Practice time" since={practiceStats.earliest} color="#7c3aed" />
      <Card>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-extrabold text-slate-800 leading-none">{practiceStats.totalMin}</span>
          <span className="text-sm font-bold text-slate-400 leading-none">minutes total</span>
        </div>
        <div className="text-[11px] text-slate-500 mt-1">
          Drumeo {practiceStats.drumeoMin}m · Melodics {practiceStats.melodicsMin}m
        </div>
        <DayBars data={practiceStats.last14} color="#7c3aed" suffix=" min" />
        <div className="text-[11px] text-slate-400 mt-1.5 flex items-center justify-between">
          <span>Last 14 days · {practiceStats.last14Sum} min</span>
          {practiceStats.totalMin === 0 && <EmptyLine>No minutes logged yet.</EmptyLine>}
        </div>
      </Card>

      {/* -------- MOST-PLAYED SONGS -------- */}
      <SectionHead icon={Music} title="Most-played songs" since={topSongs.earliest} color="#0891b2" />
      <Card>
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-3xl font-extrabold text-slate-800 leading-none">{topSongs.total}</span>
          <span className="text-sm font-bold text-slate-400 leading-none">plays · {topSongs.songsTouched} songs</span>
        </div>
        {topSongs.list.length === 0 ? (
          <EmptyLine>No song plays logged yet.</EmptyLine>
        ) : (
          <div className="space-y-2">
            {topSongs.list.map((s, i) => (
              <EnrichedSongRow
                key={s.id}
                s={s}
                rank={i + 1}
                maxCount={maxSongPlays}
                updateSong={updateSong}
                familyId={familyId}
              />
            ))}
            {topSongs.list.some((s) => s.matchStatus === "auto") && (
              <div className="text-[10px] text-slate-400 mt-2 leading-snug">
                Auto-matched songs need a parent thumbs-up. Tap ✓ to lock,
                "Pick another" to fix it, or "Skip" to leave the row as free text.
              </div>
            )}
          </div>
        )}
      </Card>

      {/* -------- BOOKS -------- */}
      <SectionHead icon={BookOpen} title="Books" since={booksStats.earliest} color="#b45309" />
      <Card>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            ["Reading", booksStats.buckets.reading || 0, "#b45309"],
            ["Finished", booksStats.buckets.finished || 0, "#15803d"],
            ["Wishlist", booksStats.buckets.wishlist || 0, "#7c3aed"],
          ].map(([label, n, color]) => (
            <div key={label} className="rounded-xl bg-slate-50 p-3 text-center">
              <div className="text-2xl font-extrabold leading-none" style={{ color }}>{n}</div>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">{label}</div>
            </div>
          ))}
        </div>
        {booksStats.total === 0 ? (
          <EmptyLine>No books on the shelf yet.</EmptyLine>
        ) : (
          <>
            {(booksStats.byLang.length > 0 || booksStats.byLevel.length > 0) && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {booksStats.byLang.map(([lang, n]) => (
                  <span key={"l-" + lang} className="text-[11px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                    {lang} · {n}
                  </span>
                ))}
                {booksStats.byLevel.map(([level, n]) => (
                  <span key={"lv-" + level} className="text-[11px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                    {level} · {n}
                  </span>
                ))}
              </div>
            )}
            {booksStats.recent.length > 0 && (
              <>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Recent (tracked)</div>
                <div className="space-y-2 mb-3">
                  {booksStats.recent.map((b) => (
                    <EnrichedBookRow key={b.id} b={b} updateBook={updateBook} />
                  ))}
                </div>
                {booksStats.recent.some((b) => b.matchStatus === "auto") && (
                  <div className="text-[10px] text-slate-400 mb-3 leading-snug">
                    Auto-matched titles need a parent thumbs-up. Tap ✓ to lock the
                    match, "Pick another" to fix it, or "Skip" to leave the entry
                    as free text.
                  </div>
                )}
              </>
            )}
            {/* Pre-tracking archive — grouped by era, no dates. Counts toward
                totals but kept visually distinct so the "tracked" view stays honest. */}
            {booksStats.backlogCount > 0 && (
              <>
                <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700 mb-1.5">
                  Archive · pre-tracking ({booksStats.backlogCount})
                </div>
                <div className="flex flex-wrap gap-1.5 mb-1">
                  {booksStats.eras.map(([era, n]) => (
                    <span key={era} className="text-[11px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                      {era} · {n}
                    </span>
                  ))}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  No real dates — counted in totals + per-author stats, excluded from date-based views.
                </div>
              </>
            )}
          </>
        )}
      </Card>

      {/* -------- COUNTS BY CATEGORY -------- */}
      <SectionHead icon={TrendingUp} title="Approved by category" since={completionsByCat.earliest} color="#15803d" />
      <Card>
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-3xl font-extrabold text-slate-800 leading-none">{completionsByCat.total}</span>
          <span className="text-sm font-bold text-slate-400 leading-none">approved completions</span>
        </div>
        {completionsByCat.categories.length === 0 ? (
          <EmptyLine>Nothing approved yet.</EmptyLine>
        ) : (
          <ul className="space-y-1.5">
            {completionsByCat.categories.map(([cat, n]) => (
              <li key={cat} className="flex items-center gap-2 text-sm">
                <span className="flex-1 font-bold text-slate-700">{cat}</span>
                <span className="relative w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <span
                    className="absolute inset-y-0 left-0 rounded-full bg-emerald-500"
                    style={{ width: `${(n / maxCatCount) * 100}%` }}
                  />
                </span>
                <span className="w-6 text-right text-sm font-bold text-emerald-700 tabular-nums">{n}</span>
              </li>
            ))}
          </ul>
        )}
        {completionsByCat.pillars.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {completionsByCat.pillars.map(([pillar, n]) => (
              <span key={pillar} className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                pillar === "brain" ? "bg-indigo-100 text-indigo-700"
                  : pillar === "body" ? "bg-rose-100 text-rose-700"
                  : pillar === "soul" ? "bg-violet-100 text-violet-700"
                  : "bg-slate-100 text-slate-600"
              }`}>
                {pillar} · {n}
              </span>
            ))}
          </div>
        )}
      </Card>

      {/* -------- PHOTOS -------- */}
      <SectionHead icon={ImageIcon} title="Photos in the gallery" color="#0ea5e9" />
      <Card>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="rounded-xl bg-sky-50 p-3 text-center">
            <div className="text-2xl font-extrabold text-sky-700 leading-none">{photoStats.proofCount}</div>
            <div className="text-[10px] text-sky-700/80 font-bold uppercase tracking-wider mt-1">Schoolwork</div>
          </div>
          <div className="rounded-xl bg-pink-50 p-3 text-center">
            <div className="text-2xl font-extrabold text-pink-700 leading-none flex items-center justify-center gap-1">
              <Heart size={16} fill="currentColor" /> {photoStats.memCount}
            </div>
            <div className="text-[10px] text-pink-700/80 font-bold uppercase tracking-wider mt-1">Memories</div>
          </div>
        </div>
        {photoStats.byActivity.length === 0 ? (
          <EmptyLine>No photos in the gallery yet.</EmptyLine>
        ) : (
          <ul className="space-y-1.5">
            {photoStats.byActivity.map(([name, n]) => (
              <li key={name} className="flex items-center gap-2 text-sm">
                <span className="flex-1 font-bold text-slate-700">{name}</span>
                <span className="relative w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <span
                    className="absolute inset-y-0 left-0 rounded-full bg-sky-500"
                    style={{ width: `${(n / maxPhotoActCount) * 100}%` }}
                  />
                </span>
                <span className="w-6 text-right text-sm font-bold text-sky-700 tabular-nums">{n}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="text-[11px] text-slate-400 mt-6 text-center px-2 leading-snug">
        Every number above comes from the data the family is already logging — nothing new is stored to draw these views.
      </div>
    </div>
  );
}
