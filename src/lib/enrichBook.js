// Open Library — book enrichment helpers for Phase 6a.
//
// Free, no key. Search API returns canonical title + author + cover_i.
// Covers are a deterministic URL pattern, no extra API call to display.
// We cache the result in the books table (cover_url, canonical_*,
// external_id, match_status) so we NEVER re-hit OL on render.
//
// User-Agent is set by the proxy (netlify/functions/open-library.js)
// — per OL guidance, a recognizable UA + a real contact.
//
// Rate-limit defense: an in-flight Map de-dupes concurrent calls for
// the same (title, author) tuple. With auto-enrich firing once per
// unmatched row on first render, a freshly-loaded gallery never
// hammers OL — at most one fetch per unique book.

// In-flight de-dupe so two components asking for the same query
// share a single fetch + share the same promise.
const _inflight = new Map();

function keyOf(title, author) {
  return `${(title || "").trim().toLowerCase()}|${(author || "").trim().toLowerCase()}`;
}

// Build a deterministic cover URL from an OL search result. Prefers
// cover_i (the OL covers ID), falls back to the first ISBN.
//   size = "S" | "M" | "L" — display layer picks.
export function coverUrlForResult(doc, size = "M") {
  if (doc?.cover_i) {
    return `https://covers.openlibrary.org/b/id/${doc.cover_i}-${size}.jpg`;
  }
  const isbn = Array.isArray(doc?.isbn) ? doc.isbn[0] : doc?.isbn;
  if (isbn) {
    return `https://covers.openlibrary.org/b/isbn/${isbn}-${size}.jpg`;
  }
  return "";
}

// Map an OL search doc → our normalized shape. Keeps callers
// agnostic of OL field names. external_id prefers the work key
// ("/works/OL12345W") and falls back to the cover id.
function normalize(doc) {
  return {
    title: doc.title || "",
    author: (doc.author_name && doc.author_name[0]) || "",
    year: doc.first_publish_year || null,
    coverUrl: coverUrlForResult(doc, "M"),
    coverThumbUrl: coverUrlForResult(doc, "S"),
    externalId: doc.key || (doc.cover_i ? `covers/${doc.cover_i}` : ""),
    externalSource: "open_library",
  };
}

// Search Open Library through our same-origin Netlify Function proxy
// (netlify/functions/open-library.js). The proxy fixes Safari "Load
// failed" intermittents on direct OL fetches and adds a 1h edge cache.
// Throws on network / non-2xx — caller decides how to surface.
export async function searchOpenLibrary(title, author = "", limit = 5) {
  const trimTitle = (title || "").trim();
  if (!trimTitle) return [];
  const params = new URLSearchParams();
  params.set("title", trimTitle);
  if (author) params.set("author", author.trim());
  params.set("limit", String(limit));
  const url = `/api/open-library?${params.toString()}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { "Accept": "application/json" },
  });
  if (!res.ok) throw new Error(`open_library: ${res.status}`);
  const json = await res.json();
  const docs = Array.isArray(json?.docs) ? json.docs : [];
  return docs.slice(0, limit).map(normalize);
}

// Cached top-result picker for auto-enrich. Returns the first
// candidate or null if no match. Idempotent for the same query
// within a session — the in-flight Map collapses concurrent calls.
export async function pickFirstMatch(title, author = "") {
  const k = keyOf(title, author);
  if (_inflight.has(k)) return _inflight.get(k);
  const p = (async () => {
    try {
      const results = await searchOpenLibrary(title, author, 1);
      return results[0] || null;
    } catch (e) {
      console.warn("enrichBook.pickFirstMatch:", e?.message || e);
      return null;
    } finally {
      _inflight.delete(k);
    }
  })();
  _inflight.set(k, p);
  return p;
}
