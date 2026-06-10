// iTunes Search API — song enrichment helpers.
//
// Why iTunes over MusicBrainz: MB is open data optimized for editing,
// not for "user picks a famous song." Its ranking lands on
// compilations, soundtracks, karaoke versions, and the wrong artist
// for tracks Mike's been logging (Master of Puppets, Fade to Black,
// Chop Suey, etc.). iTunes is Apple's curated music catalog with
// canonical track / artist / album metadata and high-res cover art —
// the exact shape we need.
//
// Why not Spotify (yet): Spotify is even better but needs a dev app
// + client credentials we don't have yet. iTunes is public, no auth,
// works from the browser today. Spotify v2 is documented at
// docs/MUSIC-ENRICHMENT-V2.md and will slot in behind the same
// `searchSongs` / `pickFirstMatch` interface this module exports.
//
// Rate limit: iTunes throttles loosely (no published cap, around
// ~20 req/min is safe). Lighter than MB's strict 1/sec; no queue
// needed for a family-sized catalog.

const _inflight = new Map();

function keyOf(title, artist) {
  return `${(title || "").trim().toLowerCase()}|${(artist || "").trim().toLowerCase()}`;
}

// Apple's CDN respects arbitrary sizes for artwork URLs — they all
// follow `.../source/<W>x<H>bb.jpg` and you can substitute any size
// in. iTunes returns 100x100 by default; we upgrade to 600 for
// list/grid thumbs and 200 for picker candidates.
function highResCover(artworkUrl100, size) {
  if (!artworkUrl100) return "";
  return artworkUrl100.replace(/\d+x\d+bb/, `${size}x${size}bb`);
}

function normalize(track) {
  return {
    title:          track.trackName || "",
    artist:         track.artistName || "",
    album:          track.collectionName || "",
    // Same field name `releaseTitle` MB used — keeps the picker code
    // unaware of which provider is upstream.
    releaseTitle:   track.collectionName || "",
    year:           (track.releaseDate || "").slice(0, 4) || null,
    coverUrl:       highResCover(track.artworkUrl100, 600),
    coverThumbUrl:  highResCover(track.artworkUrl100, 200),
    externalId:     track.trackId ? `itunes:${track.trackId}` : "",
    externalSource: "itunes",
  };
}

// Search the iTunes catalog for songs matching title + optional
// artist. Returns the top N normalized candidates. Throws on
// network / non-2xx so callers can surface the error.
//
// The exported name is `searchSongs` (provider-agnostic) so a future
// swap to Spotify can land without changing callers.
export async function searchSongs(title, artist = "", limit = 5) {
  const trimTitle = (title || "").trim();
  if (!trimTitle) return [];
  // iTunes uses a single `term` parameter. Concatenating title + artist
  // with a space gives much better disambiguation than title alone for
  // famous bands (the artist name effectively weights the search).
  const term = artist && artist.trim()
    ? `${trimTitle} ${artist.trim()}`
    : trimTitle;
  const params = new URLSearchParams();
  params.set("term", term);
  params.set("entity", "song");
  params.set("media", "music");
  params.set("limit", String(limit));
  const url = `https://itunes.apple.com/search?${params.toString()}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { "Accept": "application/json" },
  });
  if (!res.ok) throw new Error(`itunes: ${res.status}`);
  const json = await res.json();
  const arr = Array.isArray(json?.results) ? json.results : [];
  return arr.slice(0, limit).map(normalize);
}

// Cached top-result picker for auto-enrich. In-flight Map de-dupes
// concurrent calls so a list of 12 unmatched songs mounting at once
// triggers at most one fetch per unique (title, artist).
export async function pickFirstMatch(title, artist = "") {
  const k = keyOf(title, artist);
  if (_inflight.has(k)) return _inflight.get(k);
  const p = (async () => {
    try {
      const results = await searchSongs(title, artist, 1);
      return results[0] || null;
    } catch (e) {
      console.warn("enrichSongITunes.pickFirstMatch:", e?.message || e);
      return null;
    } finally {
      _inflight.delete(k);
    }
  })();
  _inflight.set(k, p);
  return p;
}
