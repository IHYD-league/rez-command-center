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
    durationMs:     Number(track.trackTimeMillis) || null,
  };
}

// Low-level iTunes search. Hits our same-origin Netlify Function proxy
// instead of itunes.apple.com directly — see netlify/functions/
// itunes-search.js for why (Safari "Load failed" on direct calls).
// Same JSON shape comes back; the proxy adds 1h edge cache so popular
// queries don't re-hit Apple.
async function searchOnce(term, limit) {
  const params = new URLSearchParams();
  params.set("term", term);
  // Proxy already defaults entity=song, media=music, country=US,
  // limit=5 — we only forward what we want to override.
  params.set("limit", String(limit));
  const url = `/api/itunes-search?${params.toString()}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { "Accept": "application/json" },
  });
  if (!res.ok) throw new Error(`itunes: ${res.status}`);
  const json = await res.json();
  const arr = Array.isArray(json?.results) ? json.results : [];
  return { results: arr.slice(0, limit).map(normalize), url };
}

// Search the iTunes catalog with progressive fallback: try title +
// artist first (best disambiguation when both are present), then
// title alone (Apple's ranking surfaces the canonical hit even
// without artist help). Logs the queried URL when zero results come
// back so we can see what was actually asked.
export async function searchSongs(title, artist = "", limit = 5) {
  const trimTitle = (title || "").trim();
  if (!trimTitle) return [];
  const trimArtist = (artist || "").trim();

  // 1) title + artist (when artist present). Concatenated with a space —
  //    iTunes' fuzzy match handles it well for famous bands.
  if (trimArtist) {
    const { results, url } = await searchOnce(`${trimTitle} ${trimArtist}`, limit);
    if (results.length > 0) return results;
    console.warn(`enrichSongITunes: zero results for combined query, falling back to title-only. URL was: ${url}`);
  }

  // 2) title alone — iTunes ranks famous tracks well even without artist.
  const { results, url } = await searchOnce(trimTitle, limit);
  if (results.length === 0) {
    console.warn(`enrichSongITunes: zero results for title-only query. URL was: ${url}`);
  }
  return results;
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
