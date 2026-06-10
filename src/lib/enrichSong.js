// MusicBrainz + Cover Art Archive — song enrichment helpers for Phase 6b.
//
// Mirrors enrichBook.js intentionally: same in-flight de-dupe, same
// "pickFirstMatch" entry point, same normalize() shape so the
// Insights layer reads the two domains uniformly.
//
// Two real differences vs Open Library:
// 1. MusicBrainz enforces 1 req/sec strictly. We serialize MB calls
//    through a module-level queue with a 1100ms gap. Cover Art Archive
//    is NOT routed through the queue — it's a separate host and is
//    deterministic per release MBID (we don't even hit its API for
//    display; cover URL is constructed directly).
// 2. The match unit is a "release" (album), not the recording. We
//    search recordings, then take the first release on the first hit
//    as the cover-bearing entity. That release MBID is what we cache
//    in external_id.
//
// User-Agent per MB guidance — same contact as books:
//   LittleLegendTreasures/1.0 (lyncho14@gmail.com)

const UA = "LittleLegendTreasures/1.0 (lyncho14@gmail.com)";
const MB_GAP_MS = 1100; // a little headroom over the strict 1000ms limit

// In-flight de-dupe — two components asking for the same (title, artist)
// share a single fetch + the same promise.
const _inflight = new Map();

// Sequential queue. Every MB fetch goes through here. A single
// trailing-edge promise chain that opens a new slot 1100ms after the
// previous fetch resolves (or throws — finally drains regardless).
let _queueTail = Promise.resolve();
function enqueueMB(fn) {
  const slot = _queueTail.then(async () => {
    try {
      return await fn();
    } finally {
      await new Promise((r) => setTimeout(r, MB_GAP_MS));
    }
  });
  // Chain the next caller off this slot, but swallow errors so one
  // failure doesn't poison every subsequent enqueue.
  _queueTail = slot.catch(() => {});
  return slot;
}

function keyOf(title, artist) {
  return `${(title || "").trim().toLowerCase()}|${(artist || "").trim().toLowerCase()}`;
}

// Deterministic Cover Art Archive URL. No API call to display — the
// host follows redirects to the actual image, or 404s if the release
// has no front art uploaded. Display layer treats 404 as "no cover."
//   size: 250 | 500 | 1200 (CAA's supported front-* variants)
export function coverUrlForReleaseMbid(mbid, size = 500) {
  if (!mbid) return "";
  return `https://coverartarchive.org/release/${mbid}/front-${size}`;
}

// Map an MB recording hit → our normalized shape. Pulls the first
// artist-credit and the first release as the cover-bearing entity.
// Tolerates missing fields — MB returns sparse rows for niche recordings.
function normalize(rec) {
  const artist =
    (rec["artist-credit"] && rec["artist-credit"][0]?.name) ||
    (rec["artist-credit"] && rec["artist-credit"][0]?.artist?.name) ||
    "";
  const release = pickCanonicalRelease(rec.releases) || (rec.releases && rec.releases[0]) || null;
  const releaseMbid = release?.id || "";
  return {
    title: rec.title || "",
    artist,
    year: (release?.date || "").slice(0, 4) || null,
    releaseTitle: release?.title || "",
    coverUrl: coverUrlForReleaseMbid(releaseMbid, 500),
    coverThumbUrl: coverUrlForReleaseMbid(releaseMbid, 250),
    externalId: releaseMbid,
    externalSource: "musicbrainz",
  };
}

// Pick the canonical studio-album release from a recording's releases
// list. MB's `releases` array on a recording search hit is in arbitrary
// order — taking [0] sometimes lands a compilation, a soundtrack, a
// reissue boxset, or even a live recording instead of the original
// album. For Mike's example "Fade to Black": MB's first release was
// the Master of Puppets reissue compilation, not Ride the Lightning
// (1984, the actual album the track lives on).
//
// Filter rules, applied in order:
//   1. Keep only releases whose release-group.primary-type === "Album"
//   2. Drop any whose release-group.secondary-types include
//      Compilation, Live, Soundtrack, Remix, Spokenword, Interview,
//      Audiobook, Demo, Mixtape/Street, DJ-mix
//   3. Of what's left, take the one with the earliest `date` (string
//      compare on YYYY-MM-DD works for our purposes; partial dates
//      like "1984" sort before "1984-07")
//   4. If nothing survives the filter, return null so the caller
//      falls back to releases[0] (graceful degrade — better a
//      compilation cover than no cover)
function pickCanonicalRelease(releases) {
  if (!Array.isArray(releases) || releases.length === 0) return null;
  const EXCLUDED_SECONDARY = new Set([
    "Compilation", "Live", "Soundtrack", "Remix",
    "Spokenword", "Interview", "Audiobook",
    "Demo", "Mixtape/Street", "DJ-mix",
  ]);
  const isAlbum = (r) => {
    const rg = r["release-group"] || {};
    if (rg["primary-type"] !== "Album") return false;
    const secondary = rg["secondary-types"] || [];
    return !secondary.some((s) => EXCLUDED_SECONDARY.has(s));
  };
  const candidates = releases.filter(isAlbum);
  if (candidates.length === 0) return null;
  // Sort by date ascending. Releases without a date sort last so a
  // dated original beats an undated reissue.
  candidates.sort((a, b) => {
    const da = a.date || "9999";
    const db = b.date || "9999";
    return da.localeCompare(db);
  });
  return candidates[0];
}

// Search MusicBrainz recordings and return the top N normalized
// candidates. Throws on network / non-2xx so callers can decide.
// Queued via enqueueMB so we never burst.
//
// Query construction notes:
// - Title is field-qualified but NOT phrase-quoted — strict phrase
//   matches scored too low for famous songs vs random covers with
//   shorter metadata. Plain `recording:Aerials` matches looser and
//   ranks better.
// - Artist is the decisive disambiguator. When provided we wrap it in
//   quotes so multi-word artists ("System of a Down", "Pink Floyd")
//   match as a single phrase, not as 4 OR'd words.
export async function searchMusicBrainz(title, artist = "", limit = 5) {
  const trimTitle = (title || "").trim();
  if (!trimTitle) return [];
  const escTitle = trimTitle.replace(/(["\\])/g, "\\$1");
  const parts = [`recording:${escTitle}`];
  if (artist && artist.trim()) {
    const escArtist = artist.trim().replace(/(["\\])/g, "\\$1");
    parts.push(`artist:"${escArtist}"`);
  }
  const query = parts.join(" AND ");
  const params = new URLSearchParams();
  params.set("query", query);
  params.set("fmt", "json");
  params.set("limit", String(limit));
  const url = `https://musicbrainz.org/ws/2/recording/?${params.toString()}`;

  return enqueueMB(async () => {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        // MB requires a UA contact; browsers may strip this on fetch
        // but we set it for any environment that honors it (e.g. a
        // future Netlify Function proxy).
        "User-Agent": UA,
        "Accept": "application/json",
      },
    });
    if (!res.ok) throw new Error(`musicbrainz: ${res.status}`);
    const json = await res.json();
    const recs = Array.isArray(json?.recordings) ? json.recordings : [];
    return recs.slice(0, limit).map(normalize);
  });
}

// Cached top-result picker for auto-enrich. Returns the first
// candidate or null. The in-flight Map collapses concurrent calls
// for the same (title, artist) so a list of 12 rows mounting at
// once never queues 12 identical fetches.
export async function pickFirstMatch(title, artist = "") {
  const k = keyOf(title, artist);
  if (_inflight.has(k)) return _inflight.get(k);
  const p = (async () => {
    try {
      const results = await searchMusicBrainz(title, artist, 1);
      return results[0] || null;
    } catch (e) {
      console.warn("enrichSong.pickFirstMatch:", e?.message || e);
      return null;
    } finally {
      _inflight.delete(k);
    }
  })();
  _inflight.set(k, p);
  return p;
}
