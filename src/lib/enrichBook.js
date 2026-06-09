// Open Library — book enrichment helpers for Phase 6a.
//
// Free, no key. Search API returns canonical title + author + cover_i.
// Covers are a deterministic URL pattern, no extra API call to display.
// We cache the result in the books table (cover_url, canonical_*,
// external_id, match_status) so we NEVER re-hit OL on render.
//
// User-Agent per OL guidance: identify the app + a real contact.
//   LittleLegendTreasures/1.0 (lyncho14@gmail.com)
//
// Rate-limit defense: an in-flight Map de-dupes concurrent calls for
// the same (title, author) tuple. With auto-enrich firing once per
// unmatched row on first render, a freshly-loaded gallery never
// hammers OL — at most one fetch per unique book.

const UA = "LittleLegendTreasures/1.0 (lyncho14@gmail.com)";

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

// Search Open Library and return the top N normalized candidates.
// Throws on network / non-2xx — caller decides how to surface.
export async function searchOpenLibrary(title, author = "", limit = 5) {
  const trimTitle = (title || "").trim();
  if (!trimTitle) return [];
  const params = new URLSearchParams();
  params.set("title", trimTitle);
  if (author) params.set("author", author.trim());
  params.set("limit", String(limit));
  // We only need a few fields, so let OL trim the response payload.
  params.set("fields", "key,title,author_name,first_publish_year,cover_i,isbn");
  const url = `https://openlibrary.org/search.json?${params.toString()}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      // OL guidance: a User-Agent that identifies the app + a contact.
      // The browser may strip this header (Chrome doesn't allow setting
      // User-Agent on fetch), but we set it for environments that
      // honor it (e.g. a future Netlify Function proxy).
      "User-Agent": UA,
      "Accept": "application/json",
    },
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
