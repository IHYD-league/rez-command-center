import React, { useMemo, useRef, useState } from "react";
import { Music, Plus, X } from "lucide-react";

/* =====================================================================
   SongLogger — fast drum-song logger.

   Architecture-compliant:
   - Songs / song_plays are new data with their own tables (§4).
   - Star/streak truth is NOT touched (§1). Logging a song does NOT
     mark drums done or bump the streak; the existing drum completion
     flow stays the source of truth for that.
   - "Most played" and per-song counts are DERIVED from song_plays at
     display time (§3) — no separate counter columns.

   Props:
     songs:        catalog rows
     songPlays:    all play rows
     addSong:      (songObj) => newId      // dedupes by lowercased title+artist
     addSongPlay:  (songId, notes) => void // played_on defaults to today
     fuzzyMatch:   shared fuzzy matcher from App.jsx
   ===================================================================== */

export default function SongLogger({ songs, songPlays, addSong, addSongPlay, fuzzyMatch }) {
  const [q, setQ] = useState("");
  const [sessionLog, setSessionLog] = useState([]); // [{id, songId, title, artist}]
  const inputRef = useRef(null);

  // Counts derived from canonical song_plays — single source of truth.
  const playCount = useMemo(() => {
    const m = {};
    (songPlays || []).forEach((p) => { m[p.songId] = (m[p.songId] || 0) + 1; });
    return m;
  }, [songPlays]);

  // Quick-tap chips: 6 most-played songs (fall back to most-recent songs
  // if no play history yet).
  const quickTaps = useMemo(() => {
    const enriched = (songs || []).map((s) => ({ ...s, count: playCount[s.id] || 0 }));
    enriched.sort((a, b) => (b.count - a.count) || (a.title || "").localeCompare(b.title || ""));
    return enriched.slice(0, 6);
  }, [songs, playCount]);

  // Fuzzy results.
  const filtered = useMemo(() => {
    const query = q.trim();
    if (!query) return [];
    return (songs || [])
      .map((s) => ({ s, m: fuzzyMatch(query, [s.title, s.artist].filter(Boolean).join(" ")) }))
      .filter((x) => x.m.hit)
      .sort((a, b) => b.m.score - a.m.score)
      .slice(0, 8)
      .map((x) => x.s);
  }, [songs, q, fuzzyMatch]);

  // Show "+ Add" when no exact (case-insensitive) title match.
  const exactMatch = q.trim() && (songs || []).find(
    (s) => (s.title || "").toLowerCase() === q.toLowerCase().trim()
  );
  const showAdd = q.trim() && !exactMatch;

  const focusInput = () => {
    // Defer to next frame so keyboards on mobile don't fight the rerender.
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const logSong = (song) => {
    addSongPlay(song.id);
    setSessionLog((prev) => [
      { key: Date.now() + "_" + Math.random().toString(36).slice(2, 5), songId: song.id, title: song.title, artist: song.artist },
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
    addSongPlay(newId);
    setSessionLog((prev) => [
      { key: Date.now() + "_" + Math.random().toString(36).slice(2, 5), songId: newId, title, artist: null },
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

      {quickTaps.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {quickTaps.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={(e) => { e.preventDefault(); logSong(s); }}
              title={`${s.count || 0} total ${s.count === 1 ? "play" : "plays"}${s.artist ? ` · ${s.artist}` : ""}`}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white border border-purple-200 text-purple-700 hover:bg-purple-100 active:scale-95"
            >
              + {s.title}{s.count > 0 ? ` (${s.count})` : ""}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-1.5">
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
          placeholder="Type a song (fuzzy — typos OK)…"
          className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
        />
        {showAdd && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); addAndLog(); }}
            className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold flex items-center gap-1"
          >
            <Plus size={13} /> Add
          </button>
        )}
      </div>

      {filtered.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {filtered.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={(e) => { e.preventDefault(); logSong(s); }}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700 hover:border-purple-300"
            >
              ↵ {s.title}{s.artist ? ` — ${s.artist}` : ""}{playCount[s.id] ? ` (${playCount[s.id]})` : ""}
            </button>
          ))}
        </div>
      )}

      {sessionLog.length > 0 && (
        <div className="mt-3">
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
