import React, { useEffect, useRef, useState } from "react";
import { Music, Check, X, RotateCcw, Camera, Save } from "lucide-react";
import { searchSongs, pickFirstMatch as pickSongMatch } from "./lib/enrichSongITunes.js";
import { uploadFamilyPhoto, useSignedUrl } from "./lib/storage.js";
import { toast } from "./lib/toast.js";

/* =====================================================================
   Shared song row + match picker.

   Lifted from Insights so the new MusicLibrary page renders identical
   rows and reuses the same edit toolkit. Insights still uses these via
   import; the contract did not change.

   Props:
     s         — song-shaped object with: id, title, artist,
                 canonicalTitle, canonicalArtist, canonicalAlbum,
                 coverUrl, customCoverPath, matchStatus, count (play
                 count, optional), last (last-played ISO date, optional)
     updateSong, familyId — write helpers (omitting either disables the
                 corresponding controls)
     rank, maxCount — optional. When BOTH provided, a play-count bar +
                 rank number render on the right side of the row. Used
                 by Insights "Most-played"; omitted by MusicLibrary
                 alphabetical sorts where rank/bar make no sense.
   ===================================================================== */

function fmtShort(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T12:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function EnrichedSongRow({ s, rank, maxCount, updateSong, familyId }) {
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const customCoverSigned = useSignedUrl(s.customCoverPath || "");
  const displayCover = customCoverSigned || s.coverUrl || "";
  const showBar = typeof rank === "number" && typeof maxCount === "number" && maxCount > 0;

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
        canonicalAlbum:  match.releaseTitle || "",
        externalSource:  match.externalSource,
        externalId:      match.externalId,
        enrichedAt:      new Date().toISOString(),
        matchStatus:     "auto",
        // durationMs intentionally omitted until migration
        // 20260614120000_song_duration_ms.sql is applied.
      });
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.id, s.matchStatus, s.title]);

  const onConfirm = () => updateSong && updateSong(s.id, { matchStatus: "confirmed" });
  const onSkip    = () => updateSong && updateSong(s.id, { matchStatus: "rejected", coverUrl: "" });

  const onUpload = async (e) => {
    const f = e.target.files?.[0];
    if (!f || uploading || !updateSong || !familyId) return;
    setUploading(true);
    try {
      const { path } = await uploadFamilyPhoto({ file: f, familyId, kind: "cover" });
      updateSong(s.id, { customCoverPath: path });
    } catch (err) {
      toast.error("Cover upload failed: " + (err.message || err));
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
        {showBar && (
          <span className="w-5 text-right text-[11px] font-bold text-slate-400 shrink-0">#{rank}</span>
        )}
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
            {displayArtist && s.canonicalAlbum ? " · " : ""}
            {s.canonicalAlbum && <span className="italic">{s.canonicalAlbum}</span>}
          </div>
          {s.last && (
            <div className="text-[10px] text-slate-400 truncate">last {fmtShort(s.last)}</div>
          )}
        </div>
        {showBar ? (
          <>
            <span className="relative w-16 h-2 bg-slate-100 rounded-full overflow-hidden shrink-0">
              <span
                className="absolute inset-y-0 left-0 rounded-full"
                style={{ width: `${((s.count || 0) / maxCount) * 100}%`, background: "#0891b2" }}
              />
            </span>
            <span className="text-sm font-bold text-cyan-700 w-6 text-right tabular-nums shrink-0">{s.count || 0}</span>
          </>
        ) : (
          typeof s.count === "number" && s.count > 0 && (
            <span className="text-[11px] font-bold text-cyan-700 tabular-nums shrink-0 px-2 py-0.5 rounded-full bg-cyan-50 border border-cyan-100">
              {s.count} {s.count === 1 ? "play" : "plays"}
            </span>
          )
        )}
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
      {updateSong && !picking && (
        <div className="flex gap-1 mt-2">
          <button
            type="button"
            onClick={() => setPicking(true)}
            className="flex-1 text-[11px] font-bold px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 active:scale-95 flex items-center justify-center gap-1"
          >
            <RotateCcw size={12} /> Edit info
          </button>
          {familyId && (
            <>
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
                  Use iTunes cover
                </button>
              )}
            </>
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

export function SongMatchPicker({ s, updateSong, busy, setBusy, onClose }) {
  const [candidates, setCandidates] = useState(null);
  const [error, setError] = useState("");
  const [titleQuery, setTitleQuery]   = useState(s.canonicalTitle || s.title || "");
  const [artistQuery, setArtistQuery] = useState(s.canonicalArtist || s.artist || "");
  const [albumQuery, setAlbumQuery]   = useState(s.canonicalAlbum || "");

  const runSearch = (t, a) => {
    setBusy(true);
    setError("");
    setCandidates(null);
    let cancelled = false;
    (async () => {
      try {
        const out = await searchSongs(t, a, 5);
        if (!cancelled) setCandidates(out);
      } catch (e) {
        if (!cancelled) setError(e?.message || "search failed");
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => { cancelled = true; };
  };

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
      canonicalAlbum:  c.releaseTitle || "",
      externalSource:  c.externalSource,
      externalId:      c.externalId,
      enrichedAt:      new Date().toISOString(),
      matchStatus:     "confirmed",
      // durationMs intentionally omitted until migration
      // 20260614120000_song_duration_ms.sql is applied.
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
        <input
          type="text"
          value={albumQuery}
          onChange={(e) => setAlbumQuery(e.target.value)}
          placeholder="Album (optional — saved with manual save below)"
          className="text-[12px] px-2 py-1.5 rounded-md border border-slate-200 bg-white"
          aria-label="Album"
        />
        <button
          type="submit"
          disabled={busy || !titleQuery.trim()}
          className={`text-[11px] font-bold px-2 py-1.5 rounded-md flex items-center justify-center gap-1 ${
            busy || !titleQuery.trim()
              ? "bg-slate-200 text-slate-400"
              : "bg-cyan-600 text-white active:scale-95"
          }`}
        >
          {busy ? "Searching…" : "Search iTunes"}
        </button>
      </form>
      {error && <div className="text-[12px] text-rose-500 mb-1">Search failed: {error}</div>}
      {candidates && candidates.length === 0 && !busy && (
        <div className="text-[12px] text-slate-400 mb-1">No matches — try the band name above, or save the values as-is below.</div>
      )}
      {updateSong && titleQuery.trim() && (
        <button
          type="button"
          onClick={() => {
            updateSong(s.id, {
              canonicalTitle:  titleQuery.trim(),
              canonicalArtist: artistQuery.trim(),
              canonicalAlbum:  albumQuery.trim(),
              matchStatus:     "confirmed",
              enrichedAt:      new Date().toISOString(),
            });
            onClose();
          }}
          className="w-full text-[11px] font-bold px-2 py-1.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 active:scale-95 flex items-center justify-center gap-1 mb-2"
        >
          <Save size={12} /> Save "{titleQuery.trim()}"{artistQuery.trim() ? ` by ${artistQuery.trim()}` : ""}{albumQuery.trim() ? ` · ${albumQuery.trim()}` : ""}
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
