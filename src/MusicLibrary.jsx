import React, { useMemo, useState } from "react";
import { Search, X, Music } from "lucide-react";
import { EnrichedSongRow } from "./SongRow.jsx";
import { useSignedUrl } from "./lib/storage.js";

/* =====================================================================
   MusicLibrary — full song catalog with sort + filter.

   Reads songs + songPlays directly. Derives per-song play count and
   last-played from songPlays so Insights and Library always see the
   same numbers (single source of truth).

   View modes (this brick ships List only; Grid + Shelf land later
   bricks). Sort selector is local state — parents will toggle it as
   they browse and don't want it sticky across sessions.

   Editing reuses EnrichedSongRow's existing toolkit verbatim — Edit
   info → SongMatchPicker (title + artist + album), custom cover
   upload, MB cover revert. No duplication of the edit UI here.
   ===================================================================== */

// Compact grid tile — square cover with title + artist beneath. Tap
// opens the focused-song editor at the bottom of the page (same
// pattern Reading Library uses). Keeps the wall-of-music view clean.
function SongGridTile({ s, onTap, selected = false }) {
  const customCoverSigned = useSignedUrl(s.customCoverPath || "");
  const displayCover = customCoverSigned || s.coverUrl || "";
  const title = s.canonicalTitle || s.title || "(unknown)";
  const artist = s.canonicalArtist || s.artist || "";
  return (
    <button
      type="button"
      onClick={() => onTap?.(s)}
      className={`flex flex-col items-stretch text-left active:scale-[0.97] transition ${selected ? "ring-2 ring-cyan-500 rounded-xl" : ""}`}
      aria-label={`Open ${title}`}
    >
      <div className="aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-100 mb-1 relative">
        {displayCover ? (
          <img
            src={displayCover}
            alt=""
            draggable={false}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        ) : (
          <div className="w-full h-full grid place-items-center text-slate-300">
            <Music size={24} />
          </div>
        )}
        {typeof s.count === "number" && s.count > 0 && (
          <span className="absolute bottom-1 right-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-600 text-white tabular-nums">
            {s.count}
          </span>
        )}
      </div>
      <div className="text-[11px] font-bold text-slate-800 line-clamp-1 leading-tight">{title}</div>
      {artist && (
        <div className="text-[10px] text-slate-500 truncate">{artist}</div>
      )}
    </button>
  );
}

const SORT_OPTIONS = [
  { k: "plays",        label: "Most played" },
  { k: "recent",       label: "Recently played" },
  { k: "title_az",     label: "Title A–Z" },
  { k: "title_za",     label: "Title Z–A" },
  { k: "artist_az",    label: "Artist A–Z" },
  { k: "album_az",     label: "Album A–Z" },
  { k: "added_newest", label: "Newest added" },
  { k: "added_oldest", label: "Oldest added" },
];

export default function MusicLibrary({ songs = [], songPlays = [], updateSong, familyId }) {
  const [sort, setSort] = useState("plays");
  const [q, setQ] = useState("");
  const [viewMode, setViewMode] = useState("list");
  const [focusedSongId, setFocusedSongId] = useState(null);

  // Derive { count, last } per song from the canonical songPlays table.
  // Same shape Insights "Most-played" reads, so a song marked confirmed
  // in either surface looks identical in the other.
  const enrichedSongs = useMemo(() => {
    const counts = new Map();
    for (const sp of songPlays || []) {
      const sid = sp.songId || sp.song_id;
      if (!sid) continue;
      const date = sp.playedOn || sp.played_on || sp.date || null;
      const c = counts.get(sid) || { count: 0, last: null };
      c.count += 1;
      if (date && (!c.last || date > c.last)) c.last = date;
      counts.set(sid, c);
    }
    return (songs || []).map((s) => {
      const c = counts.get(s.id) || { count: 0, last: null };
      return { ...s, count: c.count, last: c.last };
    });
  }, [songs, songPlays]);

  // Filter by free-text query across title / artist / album / canonical.
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return enrichedSongs;
    return enrichedSongs.filter((s) => {
      const hay = [
        s.title, s.canonicalTitle,
        s.artist, s.canonicalArtist,
        s.canonicalAlbum,
      ].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(needle);
    });
  }, [enrichedSongs, q]);

  // Sort. Comparators favor canonical fields when present, falling back
  // to user-typed. Locale-aware comparison for proper A–Z ordering with
  // accents / Spanish characters.
  const sorted = useMemo(() => {
    const list = [...filtered];
    const titleOf  = (s) => s.canonicalTitle  || s.title  || "";
    const artistOf = (s) => s.canonicalArtist || s.artist || "";
    const albumOf  = (s) => s.canonicalAlbum  || "";
    const addedOf  = (s) => s.createdAt || "";
    switch (sort) {
      case "plays":
        list.sort((a, b) => (b.count || 0) - (a.count || 0) || titleOf(a).localeCompare(titleOf(b)));
        break;
      case "recent":
        list.sort((a, b) => (b.last || "").localeCompare(a.last || "") || titleOf(a).localeCompare(titleOf(b)));
        break;
      case "title_az":
        list.sort((a, b) => titleOf(a).localeCompare(titleOf(b)));
        break;
      case "title_za":
        list.sort((a, b) => titleOf(b).localeCompare(titleOf(a)));
        break;
      case "artist_az":
        list.sort((a, b) => artistOf(a).localeCompare(artistOf(b)) || titleOf(a).localeCompare(titleOf(b)));
        break;
      case "album_az":
        list.sort((a, b) => albumOf(a).localeCompare(albumOf(b)) || titleOf(a).localeCompare(titleOf(b)));
        break;
      case "added_newest":
        list.sort((a, b) => (addedOf(b) || "").localeCompare(addedOf(a) || ""));
        break;
      case "added_oldest":
        list.sort((a, b) => (addedOf(a) || "").localeCompare(addedOf(b) || ""));
        break;
      default:
        break;
    }
    return list;
  }, [filtered, sort]);

  // Quick stats for the header.
  const totalPlays = enrichedSongs.reduce((s, x) => s + (x.count || 0), 0);
  const artistsTouched = new Set(
    enrichedSongs.map((s) => (s.canonicalArtist || s.artist || "").trim().toLowerCase()).filter(Boolean)
  ).size;

  return (
    <div className="px-4 pt-3 pb-24">
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="rounded-2xl bg-white border border-slate-100 p-3 text-center">
          <div className="text-2xl font-extrabold text-cyan-600">{songs.length}</div>
          <div className="text-[11px] text-slate-400">songs</div>
        </div>
        <div className="rounded-2xl bg-white border border-slate-100 p-3 text-center">
          <div className="text-2xl font-extrabold text-indigo-500">{totalPlays}</div>
          <div className="text-[11px] text-slate-400">total plays</div>
        </div>
        <div className="rounded-2xl bg-white border border-slate-100 p-3 text-center">
          <div className="text-2xl font-extrabold text-amber-500">{artistsTouched}</div>
          <div className="text-[11px] text-slate-400">artists</div>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-3 py-2 mb-3">
        <Search size={16} className="text-slate-400 shrink-0" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search title, artist, or album…"
          className="flex-1 text-sm outline-none bg-transparent"
        />
        {q && <button onClick={() => setQ("")} className="text-slate-300"><X size={15} /></button>}
      </div>

      <div className="flex items-center gap-2 mb-2">
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 shrink-0">
          {[["list", "List"], ["grid", "Grid"]].map(([k, label]) => (
            <button
              key={k}
              onClick={() => setViewMode(k)}
              className={`text-[11px] font-bold px-3 py-1.5 rounded-lg ${
                viewMode === k ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex-1 flex gap-1.5 overflow-x-auto scrollbar-thin">
          {SORT_OPTIONS.map((o) => (
            <button
              key={o.k}
              onClick={() => setSort(o.k)}
              className={`shrink-0 text-[11px] font-bold px-2.5 py-1.5 rounded-full whitespace-nowrap ${
                sort === o.k ? "bg-cyan-600 text-white" : "bg-white text-slate-500 border border-slate-200"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="text-[11px] text-slate-400 px-1 mb-2">
        {q ? `${sorted.length} of ${songs.length} matching` : `${songs.length} songs`}
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center">
          <Music size={32} className="text-slate-300 mx-auto mb-2" />
          <div className="text-sm font-bold text-slate-500">
            {q ? "No songs match that search." : "No songs logged yet — add some via the Drums task sheet."}
          </div>
        </div>
      ) : viewMode === "list" ? (
        <div className="space-y-2">
          {sorted.map((s) => (
            <EnrichedSongRow
              key={s.id}
              s={s}
              updateSong={updateSong}
              familyId={familyId}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 pb-32">
          {sorted.map((s) => (
            <SongGridTile
              key={s.id}
              s={s}
              onTap={() => setFocusedSongId(s.id)}
              selected={focusedSongId === s.id}
            />
          ))}
        </div>
      )}

      {/* Grid-tile focused editor — pops up at the bottom with the full
          EnrichedSongRow + edit toolkit. Same close pattern as Reading
          Library. */}
      {viewMode === "grid" && focusedSongId && (() => {
        const fs = sorted.find((s) => s.id === focusedSongId);
        if (!fs) return null;
        return (
          <div className="fixed inset-x-0 bottom-0 z-30 max-w-md mx-auto bg-white border-t border-slate-200 shadow-2xl rounded-t-2xl p-3 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Editing</div>
              <button onClick={() => setFocusedSongId(null)} className="text-slate-400 p-1" aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <EnrichedSongRow s={fs} updateSong={updateSong} familyId={familyId} />
          </div>
        );
      })()}
    </div>
  );
}
