// Open Library search proxy.
//
// Why proxy a CORS-open API: Safari intermittently returns "Load failed"
// on direct cross-origin fetches even when CORS headers look correct.
// Mike hit this — the lib/enrichBook.js direct call broke mid-session
// and didn't recover. Same-origin proxying makes the browser only talk
// to our domain so the CORS surface is irrelevant. 1h edge cache on
// top so popular queries don't hammer OL.
//
// Why not use Google Books here: GB requires an API key for production
// — without one, the project-wide unauthenticated quota (~1k/day per IP)
// gets exhausted quickly when Netlify's shared outbound infrastructure
// is also doing work for other tenants. OL is the more reliable default
// for an app shipping without a key.

const ALLOWED_PARAMS = ["title", "author", "q", "limit", "fields"];

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
  if (!out.has("title") && !out.has("q")) {
    return new Response(JSON.stringify({ error: "missing title or q" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  if (!out.has("limit")) out.set("limit", "5");
  if (!out.has("fields")) {
    out.set("fields", "key,title,author_name,first_publish_year,cover_i,isbn");
  }

  const upstreamUrl = `https://openlibrary.org/search.json?${out.toString()}`;
  try {
    const upstream = await fetch(upstreamUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "LittleLegendTreasures/1.0 (lyncho14@gmail.com)",
      },
    });
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: {
        "content-type": "application/json",
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
