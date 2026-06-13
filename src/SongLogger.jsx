import React, { useMemo, useRef, useState } from "react";
import { Music, Plus, X } from "lucide-react";
import { useSignedUrl } from "./lib/storage.js";
import { buildAlbumCoverMap, resolveSongCover } from "./lib/albumCover.js";

/* =====================================================================
   SongLogger — fast drum-song logger.

   Architecture-compliant:
   - Songs / song_plays are new data with their own tables (§4).
   - Star/streak truth is NOT touched (§1). Logging a song does NOT
     mark drums done or bump the streak; the existing drum completion
     flow stays the source of truth for that.
   - "Most played" and per-song counts are DERIVED from song_plays at
     display time (§3) — no separate counter columns.

   Display layer borrows the canonical fields (canonicalTitle /
   canonicalArtist / canonicalAlbum / coverUrl / customCoverPath)
   populated by the iTunes / MB enrichment so the picker shows the
   same source-of-truth Music Library and Insights do. Covers are
   album-deduped via src/lib/albumCover.js — log once with a cover
   on any Toxicity song and every SOAD song from Toxicity inherits it.

   Props:
     songs:        catalog rows
     songPlays:    all play rows
     addSong:      (songObj) => newId      // dedupes by lowercased title+artist
     addSongPlay:  (songId, notes) => void // played_on defaults to today
     fuzzyMatch:   shared fuzzy matcher from App.jsx
   ===================================================================== */

// Inline-tile renderer. Cover thumb + canonical metadata + play count
// + tap-to-log. Used by quick-taps and search results so the picker
// feels like a single consistent surface.
function SongPickerRow({ s, count, onPick }) {
  const customCoverSigned = useSignedUrl(s.customCoverPath || "");
  const displayCover = customCoverSigned || s.coverUrl || "";
  const title  = s.canonicalTitle  || s.title  || "(unknown)";
  const artist = s.canonicalArtist || s.artist || "";
  const album  = s.canonicalAlbum  || "";
  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); onPick?.(s); }}
      className="w-full flex items-center gap-2 p-1.5 rounded-xl bg-white border border-purple-200 hover:border-purple-400 active:scale-[0.99] text-left"
    >
      {displayCover ? (
        <img
          src={displayCover}
          alt=""
          draggable={false}
          className="w-8 h-8 object-cover rounded-md border border-slate-200 shrink-0 bg-slate-100"
          loading="lazy"
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
      ) : (
        <div className="w-8 h-8 rounded-md bg-slate-100 border border-slate-200 grid place-items-center shrink-0 text-slate-300">
          <Music size={14} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-bold text-slate-800 truncate">{title}</div>
        <div className="text-[10px] text-slate-500 truncate">
          {artist}{artist && album ? " · " : ""}{album && <span className="italic">{album}</span>}
        </div>
      </div>
      {count > 0 && (
        <span className="text-[10px] font-bold tabular-nums text-cyan-700 bg-cyan-50 border border-cyan-100 rounded-full px-2 py-0.5 shrink-0">
          {count}
        </span>
      )}
    </button>
  );
}

export default function SongLogger({ songs, songPlays, addSong, addSongPlay, fuzzyMatch, onSongLogged, todayIso }) {
  const [q, setQ] = useState("");
  const [sessionLog, setSessionLog] = useState([]); // [{id, songId, title}]
  const inputRef = useRef(null);

  // Counts derived from canonical song_plays — single source of truth.
  const playCount = useMemo(() => {
    const m = {};
    (songPlays || []).forEach((p) => { m[p.songId] = (m[p.songId] || 0) + 1; });
    return m;
  }, [songPlays]);

  // Today's plays per song — drives the "are you sure you want to add
  // it again?" guard. Krissie kept double-tapping in the picker and
  // ending up with the same song logged 2-4 times for one practice.
  const todayPlayCount = useMemo(() => {
    if (!todayIso) return {};
    const m = {};
    (songPlays || []).forEach((p) => {
      if ((p.playedOn || p.played_on) !== todayIso) return;
      const sid = p.songId || p.song_id;
      if (sid) m[sid] = (m[sid] || 0) + 1;
    });
    return m;
  }, [songPlays, todayIso]);

  // Cover dedup map — songs sharing (canonical_artist, canonical_album)
  // see one cover everywhere. Same helper Music Library + Insights use.
  const albumMap = useMemo(() => buildAlbumCoverMap(songs || []), [songs]);

  // Quick-taps: 10 most-played, cover-resolved. Falls back to most-
  // recently-added if no plays yet.
  const quickTaps = useMemo(() => {
    const enriched = (songs || []).map((s) => ({
      ...resolveSongCover(s, albumMap),
      _count: playCount[s.id] || 0,
    }));
    enriched.sort((a, b) => (b._count - a._count) || (a.title || "").localeCompare(b.title || ""));
    return enriched.slice(0, 10);
  }, [songs, playCount, albumMap]);

  // Fuzzy search across title + canonical title + artist + canonical
  // artist + canonical album. Catches typos like "Tipos Malos" matching
  // "Los Tipos Malos".
  const filtered = useMemo(() => {
    const query = q.trim();
    if (!query) return [];
    return (songs || [])
      .map((s) => {
        const hay = [
          s.title, s.canonicalTitle,
          s.artist, s.canonicalArtist,
          s.canonicalAlbum,
        ].filter(Boolean).join(" ");
        return { s, m: fuzzyMatch(query, hay) };
      })
      .filter((x) => x.m.hit)
      .sort((a, b) => b.m.score - a.m.score)
      .slice(0, 8)
      .map((x) => ({
        ...resolveSongCover(x.s, albumMap),
        _count: playCount[x.s.id] || 0,
      }));
  }, [songs, q, fuzzyMatch, playCount, albumMap]);

  // Always offer "+ Add new" when there's no exact-title match, even if
  // fuzzy results came back. Short titles like "ATWA" share too many
  // letters with the catalog and the matcher hallucinates hits
  // ("I-E-A-I-A-I-O", "Forty-Six and Two"); suppressing Add behind
  // filtered.length === 0 left no escape hatch. The visual demotion
  // (dashed border, small font) still nudges away from accidental
  // duplicates when the canonical artist/album is what the parent
  // actually wanted.
  const exactMatch = q.trim() && (songs || []).find(
    (s) => (s.title || "").toLowerCase() === q.toLowerCase().trim()
      || (s.canonicalTitle || "").toLowerCase() === q.toLowerCase().trim()
  );
  const showAdd = q.trim() && !exactMatch;

  const focusInput = () => {
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const logSong = (song) => {
    const title = song.canonicalTitle || song.title || "(unknown)";
    // Duplicate guard — Krissie was tapping the picker row twice when
    // the response felt slow and ending up with 3 plays for one song.
    // Confirm before adding a same-day repeat. Yes proceeds (real
    // re-listen), No bails (accidental double-tap).
    const alreadyToday = todayPlayCount[song.id] || 0;
    if (alreadyToday > 0) {
      const msg = `"${title}" is already logged ${alreadyToday} time${alreadyToday === 1 ? "" : "s"} today.\n\nAdd another play?`;
      if (!window.confirm(msg)) return;
    }
    addSongPlay(song.id);
    onSongLogged?.(title);
    setSessionLog((prev) => [
      {
        key: Date.now() + "_" + Math.random().toString(36).slice(2, 5),
        songId: song.id,
        title,
      },
      ...prev,
    ]);
    setQ("");
    focusInput();
  };

  const addAndLog = () => {
    const title = q.trim();
    if (!title) return;
    const newId = addSong({ title });
    if (!newId) return;
    // New songs can't be a same-day duplicate by definition (we just
    // created the row). No confirm needed here.
    addSongPlay(newId);
    onSongLogged?.(title);
    setSessionLog((prev) => [
      { key: Date.now() + "_" + Math.random().toString(36).slice(2, 5), songId: newId, title },
      ...prev,
    ]);
    setQ("");
    focusInput();
  };

  const undoLast = () => {
    setSessionLog((prev) => prev.slice(1));
    // We don't delete the play row here — undo is a per-session UI
    // convenience. Hard-delete a play via the song detail card.
  };

  return (
    <div className="rounded-2xl bg-purple-50 border border-purple-100 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-extrabold text-purple-700 flex items-center gap-1">
          <Music size={14} /> Songs played today
        </div>
        {sessionLog.length > 0 && (
          <div className="text-[11px] text-purple-700 font-bold">
            {sessionLog.length} this session
          </div>
        )}
      </div>

      {/* Search input. Enter logs the top filtered result, or
          "+ Add new" if nothing matches. */}
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          e.preventDefault();
          if (filtered[0]) logSong(filtered[0]);
          else if (showAdd) addAndLog();
        }}
        placeholder="Search his songs — typos OK (fuzzy match)…"
        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none mb-2 bg-white"
      />

      {/* Search results — proper picker rows with cover + canonical
          metadata + play count. Only visible when typing. */}
      {filtered.length > 0 && (
        <div className="space-y-1.5 mb-2">
          {filtered.map((s) => (
            <SongPickerRow key={s.id} s={s} count={s._count} onPick={logSong} />
          ))}
        </div>
      )}

      {showAdd && (
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); addAndLog(); }}
          className="w-full mb-2 text-[12px] font-bold text-indigo-700 bg-white border border-dashed border-indigo-300 rounded-xl py-2 active:scale-[0.99] flex items-center justify-center gap-1"
        >
          <Plus size={13} /> Add "{q.trim()}" as a new song
        </button>
      )}

      {/* Quick-tap list — top 10 most-played, always visible so the
          parent can scroll and pick without typing. */}
      {!q.trim() && quickTaps.length > 0 && (
        <>
          <div className="text-[10px] uppercase tracking-wider font-bold text-purple-700 mb-1.5 px-1">
            Most played — tap to log
          </div>
          <div className="space-y-1.5">
            {quickTaps.map((s) => (
              <SongPickerRow key={s.id} s={s} count={s._count} onPick={logSong} />
            ))}
          </div>
        </>
      )}

      {sessionLog.length > 0 && (
        <div className="mt-3 pt-3 border-t border-purple-200">
          <div className="text-[11px] font-bold text-slate-500 mb-1 flex items-center justify-between">
            <span>Logged this session</span>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); undoLast(); }}
              className="text-[11px] font-bold text-slate-400 hover:text-rose-500 flex items-center gap-0.5"
              title="Hide last entry from this list (the play row stays in the database)"
            >
              <X size={11} /> hide last
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {sessionLog.map((p) => (
              <span key={p.key} className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                ✓ {p.title}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
