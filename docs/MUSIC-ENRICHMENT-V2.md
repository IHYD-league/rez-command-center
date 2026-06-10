# Music enrichment v2 — Build-Later Spec

Phase 6b (MusicBrainz + Cover Art Archive) shipped the **mechanics**: auto-match,
picker, manual override, custom-cover upload. The mechanics work. What doesn't
work well enough is the **data quality** of a single open-data source.

This doc captures the next quality leap. Not urgent. Not in scope for v1.

---

## Why this doc exists

Real moments that triggered it:

1. **"Fade to Black" matched to the Master of Puppets album.** "Fade to Black" is
   on *Ride the Lightning* (1984). MB has one canonical recording for it that's
   been released on dozens of things — original album, the Black Album reissues,
   compilations, soundtracks. My code takes `recording.releases[0]`, and MB's
   ordering for the releases array is arbitrary. The mechanics fired correctly;
   the source data just doesn't know which release is the "real" album for a
   famous track.

2. **Mike's intuition: "this shouldn't be so difficult."** For Metallica, SOAD,
   Black Sabbath, Led Zep, Slipknot, RHCP, Tool — there's an absurd amount of
   high-quality public metadata. Spotify and Apple Music get these right
   instantly because their catalogs are curated around canonical releases. We
   should be drinking from those fountains, not MB alone.

3. **The 12 wrong matches in prod.** Even with the picker + artist hint + manual
   override, refining every song is parent labor. A better first-pass match
   means less hand-correction.

The fix isn't a smarter MB query (we already loosened it). The fix is more
sources, blended server-side, ranked by confidence.

---

## What's wrong with the current architecture

Today's flow is client-side, single-source:

```
Browser → fetch(MusicBrainz) → take first recording → take first release →
         construct CAA cover URL → cache on songs row
```

Three structural problems:

1. **Single source means single bias.** MB indexes a lot; it ranks recordings
   for an *editing* purpose, not a *user-facing recommendation* purpose. The
   top result by MB's internal score is often a cover, a karaoke version, a
   parody, or an obscure release.

2. **No release-disambiguation logic.** Even when MB picks the right artist,
   `releases[0]` is whichever release MB happens to list first — not "the
   original studio album." This is what burned us on Fade to Black.

3. **Client-side rate-limit pain.** MB is 1 req/sec strict. Other APIs need
   auth keys (Spotify, Discogs) that can't safely live in the browser bundle.
   So we can't combine sources from the client even if we wanted to.

---

## Proposed architecture: enrichment worker + cache

```
Browser → POST /api/enrich-song { title, artist }
                ↓
        Netlify Function (or Supabase Edge Function)
                ↓
        1. Check song_enrichment_cache    ← family-agnostic, populated across users
        2. If miss: query Spotify || iTunes || MB in parallel
        3. Merge results by confidence
        4. Write cache row + return canonical answer
                ↓
        Browser writes the answer onto songs row (same shape we have now)
```

Two big wins:
- **Multi-source matching** with server-held API keys
- **Shared cache across all families** — "Master of Puppets by Metallica" only
  hits the upstream APIs once, ever, for the entire app

The client integration is small: replace `pickFirstMatch` in `enrichSong.js`
with a single `POST /api/enrich-song` call. Everything downstream
(`EnrichedSongRow`, `SongMatchPicker`, the cache columns on `public.songs`)
stays as-is.

---

## Source comparison

| Source | Auth | Rate limit | Strengths | Weaknesses |
|---|---|---|---|---|
| **Spotify Web API** | App credentials (free) | 180 req/min | Curated canonical albums, high-quality cover art, very accurate for famous bands, "popularity" score for ranking | Doesn't cover ultra-obscure stuff (covers Reznor's bands fine) |
| **iTunes Search API** | None (public) | Loose | Always available, no auth, canonical album associations, 100×100 cover art URLs | Lower-quality art than Spotify, US catalog bias |
| **MusicBrainz + CAA** (current) | Optional UA header | 1 req/sec strict | Open data, no key, huge coverage incl. obscure | Bad ranking for famous tracks, arbitrary release ordering |
| Last.fm | API key (free) | Generous | Top-track / top-album rankings per artist, popularity signals | Cover art is small, metadata sometimes stale |
| Discogs | API token (free) | 60 req/min | Comprehensive for metal/punk/rock vinyl, detailed release notes | Release-focused not track-focused, slower lookups |
| Apple Music | Paid dev membership ($99/yr) | Generous | Same quality as Spotify | Cost not justified when Spotify is free |

**Recommended stack for v2:** Spotify primary → iTunes fallback → MB last-resort.
That covers Reznor's seven bands with 100% accuracy and degrades gracefully for
weird stuff he tries once.

---

## Cache table

Single new table, family-agnostic (shared across all families):

```sql
create table public.song_enrichment_cache (
  query_key       text primary key,        -- lower(title) + '|' + lower(artist)
  source          text not null,           -- 'spotify' | 'itunes' | 'musicbrainz'
  canonical_title text,
  canonical_artist text,
  canonical_album text,
  cover_url       text,
  external_ids    jsonb not null default '{}',  -- { spotify: '...', itunes: '...', mb_release: '...' }
  confidence      numeric,                 -- 0..1, source-specific
  fetched_at      timestamptz not null default now()
);
```

- **No RLS** — public read, server-only write. The data isn't sensitive; the
  query keys are normalized to canonical lowercase so no PII leaks.
- **No family_id** — cache hit for one family benefits everyone. Reznor + 100
  future kids who add Master of Puppets all share one row.
- **TTL strategy:** start with no expiry. Album metadata for studio releases
  doesn't change. If we ever care, a `fetched_at > 1 year ago` re-fetch is
  cheap.
- **`external_ids` jsonb** so the row can carry IDs from every source it was
  cross-referenced against — useful for future "open in Spotify / open in
  Apple Music" buttons.

---

## Worker implementation sketch (Netlify Function)

Pseudocode for `/api/enrich-song.js`:

```js
export async function handler({ body }) {
  const { title, artist } = JSON.parse(body);
  const key = `${title.toLowerCase().trim()}|${(artist || "").toLowerCase().trim()}`;

  // 1. Cache hit?
  const cached = await supabase
    .from("song_enrichment_cache")
    .select("*")
    .eq("query_key", key)
    .maybeSingle();
  if (cached.data) return ok(cached.data);

  // 2. Race the sources, accept the first confident answer.
  const results = await Promise.allSettled([
    spotifySearch(title, artist),
    itunesSearch(title, artist),
    musicBrainzSearch(title, artist),
  ]);

  const best = pickBest(results);   // confidence > 0.7 wins; otherwise iTunes; otherwise MB
  if (!best) return ok(null);

  // 3. Backfill cache for next caller.
  await supabase.from("song_enrichment_cache").upsert({
    query_key: key,
    source: best.source,
    canonical_title: best.title,
    canonical_artist: best.artist,
    canonical_album: best.album,
    cover_url: best.coverUrl,
    external_ids: best.externalIds,
    confidence: best.confidence,
  });

  return ok(best);
}
```

Confidence rules (rough):
- **Spotify with `popularity ≥ 50` and exact artist match** → 0.95
- **iTunes with exact artist match** → 0.8
- **MB with artist filter that returned ≥ 1 result** → 0.6
- **Anything else** → 0.4 (still better than nothing, but the row will be
  served as `match_status: "auto"` so the parent ✓/↺/Skip CTAs stay relevant)

---

## What about the wrong-album problem specifically?

For famous tracks like "Fade to Black," Spotify and iTunes both attach the
track directly to the canonical studio album (Ride the Lightning). MB
intermixes compilations and reissues. Once Spotify is the primary, the
release-disambiguation problem disappears for any band Spotify covers — which
is every band Reznor plays.

For obscure tracks where we fall through to MB, we should also add a
release-filter: prefer the earliest release whose `release-group.primary-type`
is "Album" and whose secondary-types are empty (no compilation / soundtrack /
live). That's a 10-line change in `enrichSong.js` that's worth doing **before**
the worker if v2 takes a while.

---

## Sequencing

Three milestones, each shippable independently:

**v1.5 (small, client-side):** Smarter MB release pick. Filter releases by
`primary-type=Album` and `!secondary-types.includes('Compilation'|'Live')`,
sort by date ascending, take first. Helps the MB-only fallback case. ~20 lines.
No new infra. Could ship in an afternoon.

**v2 (Spotify primary):** Netlify Function + `song_enrichment_cache` table +
Spotify client credentials. Replaces `pickFirstMatch` in client with the
worker call. Most of the value, modest infra. Requires registering a Spotify
app (free).

**v2.1 (iTunes fallback + confidence merge):** Add iTunes as second source,
merge by confidence. Improves coverage edge cases. Same infra as v2.

---

## Honest tradeoffs

- **Cost of moving server-side.** Today's client-direct architecture is free
  and serverless-free. The worker adds a Netlify Function call per song's
  first auto-match. After cache warm-up, ≈99% of song lookups across all
  families hit the cache, not the upstream APIs.

- **Auth secrets.** Spotify credentials need to be in Netlify env vars. Not a
  blocker, just one more secret to manage.

- **Lock-in to Spotify's catalog.** If Spotify ever changes pricing or pulls
  out, we degrade to iTunes/MB. The fallback chain protects us.

- **Privacy.** The cache is family-agnostic, but the query (title + artist) is
  not sensitive — these are public songs. The cache never sees user IDs,
  play counts, or anything PII.

- **The 12 currently-wrong rows in prod.** Mike will fix those manually via
  the override UI. Once v2 ships, **future** songs auto-match correctly; the
  legacy mismatches need either re-running enrichment on rows where
  `match_status='auto'` or manual cleanup. Doc this in the v2 PR.

- **Not solving:** album-art quality variation, lyrics, audio playback,
  multi-artist tracks (features/remixes), live-vs-studio disambiguation. All
  out of scope.

---

## What's not changing

Phase 6b shipped as-is is the foundation. v2 is purely a backend swap for
the matcher. The user-facing UX (rows with covers, ✓/↺/Skip CTAs, picker,
custom-cover upload, manual title+artist override) keeps working the same
way. v2 just makes the first-pass match **right** so the parent has less
correction to do.
