import React, { useMemo, useState } from "react";
import { Search, X, Music, ChevronLeft, ChevronRight, GripHorizontal } from "lucide-react";
import { EnrichedSongRow } from "./SongRow.jsx";
import { useSignedUrl } from "./lib/storage.js";
import { applyCustomOrder, nudgeOrder } from "./lib/libraryOrder.js";
import { buildAlbumCoverMap, resolveSongCover } from "./lib/albumCover.js";
import { tOf } from "./lib/i18n.js";
const t = (k, fb) => tOf(k, fb);

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
  const title = s.canonicalTitle || s.title || t("ml_unknown_song", "(unknown)");
  const artist = s.canonicalArtist || s.artist || "";
  return (
    <button
      type="button"
      onClick={() => onTap?.(s)}
      className={`flex flex-col items-stretch text-left active:scale-[0.97] transition ${selected ? "ring-2 ring-cyan-500 rounded-xl" : ""}`}
      aria-label={t("ml_open_aria", "Open {title}").replaceAll("{title}", title)}
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

// Shelf tile — bigger than the grid tile, square cover, designed for
// "wall of records" feeling. In rearrange mode left/right chevrons
// overlay so a parent can nudge it one slot at a time without fighting
// the horizontal scroller (touch-drag-reorder on a horizontally
// scrolling list is hostile UX; this is reliable everywhere).
function SongShelfTile({ s, onTap, selected, rearranging, onNudgeLeft, onNudgeRight }) {
  const customCoverSigned = useSignedUrl(s.customCoverPath || "");
  const displayCover = customCoverSigned || s.coverUrl || "";
  const title = s.canonicalTitle || s.title || t("ml_unknown_song", "(unknown)");
  const artist = s.canonicalArtist || s.artist || "";
  return (
    <div className={`shrink-0 w-32 ${selected ? "ring-2 ring-cyan-500 rounded-xl" : ""}`}>
      <button
        type="button"
        onClick={onTap}
        disabled={!onTap}
        className="w-full aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-100 relative active:scale-[0.97] transition disabled:active:scale-100"
        aria-label={t("ml_open_aria", "Open {title}").replaceAll("{title}", title)}
      >
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
            <Music size={32} />
          </div>
        )}
        {typeof s.count === "number" && s.count > 0 && (
          <span className="absolute bottom-1 right-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-600 text-white tabular-nums">
            {s.count}
          </span>
        )}
      </button>
      <div className="text-[11px] font-bold text-slate-800 line-clamp-1 leading-tight mt-1.5">{title}</div>
      {artist && (
        <div className="text-[10px] text-slate-500 truncate">{artist}</div>
      )}
      {rearranging && (
        <div className="flex gap-1 mt-1.5">
          <button
            type="button"
            onClick={onNudgeLeft}
            className="flex-1 text-[11px] font-bold py-1 rounded-md bg-amber-100 text-amber-800 border border-amber-200 active:scale-95"
            aria-label={t("ml_move_left", "Move left")}
          >
            <ChevronLeft size={14} className="inline" />
          </button>
          <button
            type="button"
            onClick={onNudgeRight}
            className="flex-1 text-[11px] font-bold py-1 rounded-md bg-amber-100 text-amber-800 border border-amber-200 active:scale-95"
            aria-label={t("ml_move_right", "Move right")}
          >
            <ChevronRight size={14} className="inline" />
          </button>
        </div>
      )}
    </div>
  );
}

const SORT_KEYS = [
  "plays", "recent", "artist_grouped",
  "title_az", "title_za", "artist_az", "album_az",
  "added_newest", "added_oldest",
];
const sortLabel = (k) => ({
  plays:          t("ml_sort_plays", "Most played"),
  recent:         t("ml_sort_recent", "Recently played"),
  artist_grouped: t("ml_sort_artist_grouped", "By artist"),
  title_az:       t("ml_sort_title_az", "Title A–Z"),
  title_za:       t("ml_sort_title_za", "Title Z–A"),
  artist_az:      t("ml_sort_artist_az", "Artist A–Z"),
  album_az:       t("ml_sort_album_az", "Album A–Z"),
  added_newest:   t("ml_sort_added_newest", "Newest added"),
  added_oldest:   t("ml_sort_added_oldest", "Oldest added"),
}[k] || k);

// Bucket the song list by canonical artist. Unknown artist (no
// canonical, no user-typed) all bucket into one trailing group.
// Within each artist, sort by canonical_album → title for a clean
// discography read. Returns [{ artist, songs }, ...].
function groupByArtist(songs) {
  const buckets = new Map();
  for (const s of songs) {
    const key = (s.canonicalArtist || s.artist || "").trim() || t("ml_unknown_artist", "Unknown artist");
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(s);
  }
  const titleOf = (s) => s.canonicalTitle || s.title || "";
  const albumOf = (s) => s.canonicalAlbum || "";
  const groups = [];
  for (const [artist, list] of buckets) {
    list.sort((a, b) => albumOf(a).localeCompare(albumOf(b)) || titleOf(a).localeCompare(titleOf(b)));
    groups.push({ artist, songs: list });
  }
  // Sort groups by play count desc (most-engaged artist on top), then
  // alphabetically. Unknown sinks to the bottom.
  groups.sort((a, b) => {
    const unknown = t("ml_unknown_artist", "Unknown artist");
    if (a.artist === unknown && b.artist !== unknown) return 1;
    if (b.artist === unknown && a.artist !== unknown) return -1;
    const playsA = a.songs.reduce((n, s) => n + (s.count || 0), 0);
    const playsB = b.songs.reduce((n, s) => n + (s.count || 0), 0);
    if (playsB !== playsA) return playsB - playsA;
    return a.artist.localeCompare(b.artist);
  });
  return groups;
}

export default function MusicLibrary({ songs = [], songPlays = [], updateSong, familyId, libraryOrder = { songs: [], books: [] }, setLibraryOrder }) {
  const [sort, setSort] = useState("plays");
  const [q, setQ] = useState("");
  const [viewMode, setViewMode] = useState("list");
  const [focusedSongId, setFocusedSongId] = useState(null);
  const [rearranging, setRearranging] = useState(false);
  const savedOrder = libraryOrder?.songs || [];

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
    // Album-cover dedup: pre-resolve coverUrl + customCoverPath so any
    // song sharing (canonical_artist, canonical_album) with a peer that
    // has a cover inherits it for display. The DB stays per-song; only
    // the display layer borrows from album peers. See src/lib/albumCover.js.
    const albumMap = buildAlbumCoverMap(songs || []);
    return (songs || []).map((s) => {
      const c = counts.get(s.id) || { count: 0, last: null };
      const resolved = resolveSongCover(s, albumMap);
      return { ...resolved, count: c.count, last: c.last };
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

  // Shelf view uses the saved curated order. Falls back to the current
  // sort when no order is saved yet — first time on the shelf shows
  // sorted-by-plays so it looks reasonable until the parent rearranges.
  const shelfList = useMemo(() => {
    const base = savedOrder.length > 0 ? filtered : sorted;
    return applyCustomOrder(base, savedOrder);
  }, [filtered, sorted, savedOrder]);

  const nudge = (id, direction) => {
    if (!setLibraryOrder) return;
    setLibraryOrder((prev) => {
      const next = nudgeOrder(prev?.songs || [], shelfList, id, direction);
      return { ...(prev || {}), songs: next };
    });
  };
  const resetShelfOrder = () => {
    if (!setLibraryOrder) return;
    setLibraryOrder((prev) => ({ ...(prev || {}), songs: [] }));
  };

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
          <div className="text-[11px] text-slate-400">{t("ml_stat_songs", "songs")}</div>
        </div>
        <div className="rounded-2xl bg-white border border-slate-100 p-3 text-center">
          <div className="text-2xl font-extrabold text-indigo-500">{totalPlays}</div>
          <div className="text-[11px] text-slate-400">{t("ml_stat_total_plays", "total plays")}</div>
        </div>
        <div className="rounded-2xl bg-white border border-slate-100 p-3 text-center">
          <div className="text-2xl font-extrabold text-amber-500">{artistsTouched}</div>
          <div className="text-[11px] text-slate-400">{t("ml_stat_artists", "artists")}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-3 py-2 mb-3">
        <Search size={16} className="text-slate-400 shrink-0" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("ml_search_ph", "Search title, artist, or album…")}
          className="flex-1 text-sm outline-none bg-transparent"
        />
        {q && <button onClick={() => setQ("")} className="text-slate-300"><X size={15} /></button>}
      </div>

      <div className="flex items-center gap-2 mb-2">
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 shrink-0">
          {[["list", t("ml_view_list", "List")], ["grid", t("ml_view_grid", "Grid")], ["shelf", t("ml_view_shelf", "Shelf")]].map(([k, label]) => (
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
          {SORT_KEYS.map((k) => (
            <button
              key={k}
              onClick={() => setSort(k)}
              className={`shrink-0 text-[11px] font-bold px-2.5 py-1.5 rounded-full whitespace-nowrap ${
                sort === k ? "bg-cyan-600 text-white" : "bg-white text-slate-500 border border-slate-200"
              }`}
            >
              {sortLabel(k)}
            </button>
          ))}
        </div>
      </div>

      <div className="text-[11px] text-slate-400 px-1 mb-2">
        {q
          ? t("ml_match_count", "{n} of {total} matching").replaceAll("{n}", sorted.length).replaceAll("{total}", songs.length)
          : t("ml_total_count", "{n} songs").replaceAll("{n}", songs.length)}
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center">
          <Music size={32} className="text-slate-300 mx-auto mb-2" />
          <div className="text-sm font-bold text-slate-500">
            {q ? t("ml_no_match", "No songs match that search.") : t("ml_no_songs", "No songs logged yet — add some via the Drums task sheet.")}
          </div>
        </div>
      ) : viewMode === "list" ? (
        sort === "artist_grouped" ? (
          // Grouped-by-artist render: section header per artist with
          // play count + song count badges, songs underneath sorted
          // album → title. Unknown sinks to the bottom.
          <div className="space-y-4">
            {groupByArtist(sorted).map(({ artist, songs: groupSongs }) => {
              const totalPlays = groupSongs.reduce((n, s) => n + (s.count || 0), 0);
              return (
                <div key={artist}>
                  <div className="flex items-baseline justify-between gap-2 mb-1.5 px-1">
                    <div className="text-sm font-extrabold text-slate-800 truncate">
                      {artist}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold shrink-0">
                      {groupSongs.length} {groupSongs.length === 1 ? t("ml_song_one", "song") : t("ml_song_many", "songs")}
                      {totalPlays > 0 ? ` · ${totalPlays} ${totalPlays === 1 ? t("ml_play_one", "play") : t("ml_play_many", "plays")}` : ""}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {groupSongs.map((s) => (
                      <EnrichedSongRow
                        key={s.id}
                        s={s}
                        updateSong={updateSong}
                        familyId={familyId}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
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
        )
      ) : viewMode === "grid" ? (
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
      ) : (
        // Shelf view — horizontally scrollable row of larger covers,
        // arranged in the parent's saved order. Toggle Rearrange to nudge
        // tiles left/right; reset clears the saved order back to default.
        <>
          <div className="flex items-center gap-2 mb-2">
            <button
              type="button"
              onClick={() => setRearranging((v) => !v)}
              className={`text-[11px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1 ${
                rearranging ? "bg-amber-500 text-white" : "bg-white text-slate-600 border border-slate-200"
              }`}
            >
              <GripHorizontal size={12} /> {rearranging ? t("ml_done_arranging", "Done arranging") : t("ml_rearrange", "Rearrange")}
            </button>
            {savedOrder.length > 0 && (
              <button
                type="button"
                onClick={resetShelfOrder}
                className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-white text-slate-500 border border-slate-200"
              >
                {t("ml_reset_shelf", "Reset shelf order")}
              </button>
            )}
            <div className="text-[10px] text-slate-400 ml-auto">
              {savedOrder.length > 0 ? t("ml_custom_order", "custom order") : t("ml_sorted_by", "sorted by {label}").replaceAll("{label}", sortLabel(sort))}
            </div>
          </div>
          <div className="-mx-4 overflow-x-auto scrollbar-thin pb-32">
            <div className="flex gap-3 px-4 min-w-min">
              {shelfList.map((s) => (
                <SongShelfTile
                  key={s.id}
                  s={s}
                  onTap={rearranging ? undefined : () => setFocusedSongId(s.id)}
                  selected={focusedSongId === s.id}
                  rearranging={rearranging}
                  onNudgeLeft={() => nudge(s.id, -1)}
                  onNudgeRight={() => nudge(s.id, 1)}
                />
              ))}
            </div>
          </div>
        </>
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
              <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">{t("ml_editing", "Editing")}</div>
              <button onClick={() => setFocusedSongId(null)} className="text-slate-400 p-1" aria-label={t("ml_close_aria", "Close")}>
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
