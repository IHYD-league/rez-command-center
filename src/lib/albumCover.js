// Album-cover deduplication. Songs share a cover when they share a
// (canonical_artist, canonical_album) pair. Mike uploads a custom
// photo for one Toxicity track → every other Toxicity track on the
// same row in the catalog displays it too, no extra uploads, no
// schema change. Resolution is read-time only: the underlying
// public.songs.custom_cover_path / cover_url for any individual song
// stays untouched; the display layer just borrows from album peers.

// Compose the album lookup key. Lowercased + trimmed so case + leading
// whitespace can't accidentally split "Toxicity" from "toxicity ".
// Empty when either piece is missing — songs without canonical
// metadata can't dedupe against anything, which is the right answer.
function keyOf(artist, album) {
  const a = (artist || "").trim().toLowerCase();
  const al = (album || "").trim().toLowerCase();
  if (!a || !al) return "";
  return `${a}|${al}`;
}

// Build a per-album cover map from the full song list. Picks the
// FIRST non-empty custom_cover_path / cover_url for each album — the
// "first" here means whichever appears earliest in the songs array
// (which is hydrated in id-asc order, so the earliest-added song
// wins). Stable across renders so the borrowed cover doesn't flicker
// as the list re-sorts.
export function buildAlbumCoverMap(songs) {
  const customByKey = new Map();
  const coverUrlByKey = new Map();
  const canonicalTitleByKey = new Map(); // not strictly needed for display, but handy
  for (const s of songs || []) {
    const k = keyOf(s.canonicalArtist, s.canonicalAlbum);
    if (!k) continue;
    if (!customByKey.has(k) && s.customCoverPath) {
      customByKey.set(k, s.customCoverPath);
    }
    if (!coverUrlByKey.has(k) && s.coverUrl) {
      coverUrlByKey.set(k, s.coverUrl);
    }
    if (!canonicalTitleByKey.has(k)) {
      canonicalTitleByKey.set(k, s.canonicalAlbum || "");
    }
  }
  return { customByKey, coverUrlByKey, canonicalTitleByKey };
}

// Given a song + a map, return a new song-shape where customCoverPath
// and coverUrl prefer the song's own values, falling back to the
// album peers. Other fields pass through unchanged. The returned
// object is a shallow copy — safe to pass to EnrichedSongRow without
// the row knowing dedup is happening.
export function resolveSongCover(song, map) {
  if (!song) return song;
  const k = keyOf(song.canonicalArtist, song.canonicalAlbum);
  if (!k) return song;
  const sharedCustom = map?.customByKey?.get(k) || "";
  const sharedCoverUrl = map?.coverUrlByKey?.get(k) || "";
  // Song's own values still win — a parent who explicitly uploaded a
  // cover for THIS song row should see that, not the album peer's.
  return {
    ...song,
    customCoverPath: song.customCoverPath || sharedCustom,
    coverUrl: song.coverUrl || sharedCoverUrl,
  };
}

// Count how many distinct songs share a given song's album. Used by
// the upload UX to surface "this cover will show on N songs" when the
// album has multiple tracks. Returns the total INCLUDING the source
// song, so a unique track returns 1.
export function albumPeerCount(song, songs) {
  const k = keyOf(song?.canonicalArtist, song?.canonicalAlbum);
  if (!k) return 1;
  let n = 0;
  for (const s of songs || []) {
    if (keyOf(s.canonicalArtist, s.canonicalAlbum) === k) n += 1;
  }
  return n;
}
