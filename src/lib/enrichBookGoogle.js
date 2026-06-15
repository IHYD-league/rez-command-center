// Google Books search — book enrichment helper.
//
// Why Google Books over Open Library: OL's cover coverage is spotty
// (Mike hit this on a kids' book — title matched but cover_i was
// missing, so the picker added the book with no cover). Google's
// `imageLinks.thumbnail` is far more reliably populated for both
// popular kids' books and adult titles, and the response includes
// ISBNs so we get a deterministic Open Library cover fallback when
// even Google doesn't have one.
//
// Why a same-origin proxy: Safari intermittently returns "Load failed"
// on direct cross-origin fetches even when CORS headers look correct.
// Mike hit this on the OL direct path. The Netlify function proxy
// (netlify/functions/google-books.js) makes the surface same-origin
// and adds a 1h edge cache.
//
// Cover URL note: Google returns `http://books.google.com/...` URLs.
// We rewrite to https on the way through normalize() so mixed-content
// blocking on https pages doesn't suppress them.

const _inflight = new Map();

function keyOf(title, author) {
  return `${(title || "").trim().toLowerCase()}|${(author || "").trim().toLowerCase()}`;
}

function httpsify(u) {
  return (u || "").replace(/^http:\/\//i, "https://");
}

function isbnFrom(identifiers) {
  const arr = Array.isArray(identifiers) ? identifiers : [];
  return (
    arr.find((x) => x.type === "ISBN_13")?.identifier ||
    arr.find((x) => x.type === "ISBN_10")?.identifier ||
    arr.find((x) => x.type === "OTHER")?.identifier ||
    ""
  );
}

function olCoverByIsbn(isbn, size) {
  return isbn ? `https://covers.openlibrary.org/b/isbn/${isbn}-${size}.jpg` : "";
}

function normalize(item) {
  const v = item?.volumeInfo || {};
  const thumb = httpsify(v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail || "");
  const small = httpsify(v.imageLinks?.smallThumbnail || v.imageLinks?.thumbnail || "");
  const isbn = isbnFrom(v.industryIdentifiers);
  return {
    title:          v.title || "",
    author:         (Array.isArray(v.authors) && v.authors[0]) || "",
    year:           (v.publishedDate || "").slice(0, 4) || null,
    // Cover URL falls back to Open Library by ISBN when Google doesn't
    // ship an imageLinks block — common on textbook entries.
    coverUrl:       thumb || olCoverByIsbn(isbn, "L"),
    coverThumbUrl:  small || olCoverByIsbn(isbn, "M"),
    externalId:     item?.id ? `google_books:${item.id}` : "",
    externalSource: "google_books",
    isbn,
  };
}

async function searchOnce(q, limit) {
  const params = new URLSearchParams();
  params.set("q", q);
  params.set("maxResults", String(limit));
  const url = `/api/google-books?${params.toString()}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { "Accept": "application/json" },
  });
  if (!res.ok) throw new Error(`google_books: ${res.status}`);
  const json = await res.json();
  const items = Array.isArray(json?.items) ? json.items : [];
  return items.slice(0, limit).map(normalize);
}

// Public search. Title alone is enough for the picker UX (the user is
// typing the book name). The `author` param is plumbed through for
// auto-enrich callers that already have a hint.
export async function searchGoogleBooks(title, author = "", limit = 5) {
  const trimTitle = (title || "").trim();
  if (!trimTitle) return [];
  const trimAuthor = (author || "").trim();
  const q = trimAuthor ? `${trimTitle} inauthor:${trimAuthor}` : trimTitle;
  return searchOnce(q, limit);
}

// Cached top-result picker — same shape as enrichBook.js / enrichSongITunes.js.
export async function pickFirstMatch(title, author = "") {
  const k = keyOf(title, author);
  if (_inflight.has(k)) return _inflight.get(k);
  const p = (async () => {
    try {
      const results = await searchGoogleBooks(title, author, 1);
      return results[0] || null;
    } catch (e) {
      console.warn("enrichBookGoogle.pickFirstMatch:", e?.message || e);
      return null;
    } finally {
      _inflight.delete(k);
    }
  })();
  _inflight.set(k, p);
  return p;
}
