// iTunes Search proxy.
//
// Why this exists: iOS Safari (and some content blockers) intermittently
// fails direct fetches to https://itunes.apple.com/search even though
// CORS headers look correct via curl. Symptom: "Load failed" in the
// browser, no useful error context. Same-origin proxying makes the
// CORS surface irrelevant — the browser only talks to our domain.
//
// Bonus: this is the same architecture pattern Music v2 (Spotify
// worker) needs anyway, per docs/MUSIC-ENRICHMENT-V2.md. Lays the
// groundwork without committing to Spotify creds yet.
//
// Whitelist of query params we forward to iTunes. Anything else is
// ignored, so a misbehaving client can't smuggle weird parameters
// upstream.
const ALLOWED_PARAMS = ["term", "entity", "media", "country", "limit", "attribute"];

export default async (req) => {
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "method not allowed" }), {
      status: 405,
      headers: { "content-type": "application/json" },
    });
  }
  const url = new URL(req.url);
  const out = new URLSearchParams();
  for (const k of ALLOWED_PARAMS) {
    const v = url.searchParams.get(k);
    if (v != null && v !== "") out.set(k, v);
  }
  if (!out.has("term")) {
    return new Response(JSON.stringify({ error: "missing term" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  // Sensible defaults so the client doesn't have to set everything.
  if (!out.has("entity")) out.set("entity", "song");
  if (!out.has("media")) out.set("media", "music");
  if (!out.has("country")) out.set("country", "US");
  if (!out.has("limit")) out.set("limit", "5");

  const upstreamUrl = `https://itunes.apple.com/search?${out.toString()}`;

  try {
    const upstream = await fetch(upstreamUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        // iTunes is happier with a recognizable UA than blank.
        "User-Agent": "LittleLegendTreasures/1.0 (lyncho14@gmail.com)",
      },
    });
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: {
        "content-type": "application/json",
        // 1-hour edge cache — the same query from any family resolves
        // from cache without a round-trip to Apple.
        "cache-control": "public, max-age=3600",
      },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "upstream fetch failed", detail: e?.message || String(e) }),
      {
        status: 502,
        headers: { "content-type": "application/json" },
      }
    );
  }
};
