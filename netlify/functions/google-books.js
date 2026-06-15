// Google Books proxy.
//
// Same pattern as itunes-search.js. Why a proxy when Google's CORS is
// open: (1) Safari intermittently returns "Load failed" on direct
// cross-origin fetches even with CORS headers — Mike hit this on the
// Open Library direct path; the same risk applies to Google. (2) 1h
// edge cache means a popular kids' book queried by one family also
// resolves instantly for the next. (3) gives us a single seam to add
// an API key later if rate limits become a problem.

const ALLOWED_PARAMS = ["q", "maxResults", "startIndex", "langRestrict", "printType"];

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
  if (!out.has("q")) {
    return new Response(JSON.stringify({ error: "missing q" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  if (!out.has("maxResults")) out.set("maxResults", "5");
  if (!out.has("printType")) out.set("printType", "books");

  const upstreamUrl = `https://www.googleapis.com/books/v1/volumes?${out.toString()}`;
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
