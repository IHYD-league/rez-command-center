// iTunes Books search — third-tier cover source for the
// "Try another cover" chooser. Reuses the existing itunes-search
// Netlify proxy by forwarding entity=ebook, so no new function or
// redirect is needed.
//
// Coverage caveats: Apple Books has decent inventory for chapter
// books and YA, hit-or-miss on picture books. Used as a SUPPLEMENT
// to Google + Open Library in the chooser — the UI gracefully hides
// the iTunes section when it returns nothing.
//
// Cover art notes: iTunes ships artworkUrl100 (100x100 default), but
// the URL is a templated CDN path — substituting ?Wx?Hbb returns the
// same image at any size. We upgrade to 600 for the full cover URL
// and 200 for the picker thumbnail.

const _inflight = new Map();

function keyOf(title, author) {
  return `${(title || "").trim().toLowerCase()}|${(author || "").trim().toLowerCase()}`;
}

function highResCover(artworkUrl100, size) {
  if (!artworkUrl100) return "";
  return artworkUrl100.replace(/\d+x\d+bb/, `${size}x${size}bb`);
}

function normalize(track) {
  return {
    title:          track.trackName || track.collectionName || "",
    author:         track.artistName || "",
    year:           (track.releaseDate || "").slice(0, 4) || null,
    coverUrl:       highResCover(track.artworkUrl100, 600),
    coverThumbUrl:  highResCover(track.artworkUrl100, 200),
    externalId:     track.trackId ? `itunes_books:${track.trackId}` : "",
    externalSource: "itunes_books",
  };
}

async function searchOnce(term, limit) {
  const params = new URLSearchParams();
  params.set("term", term);
  params.set("entity", "ebook");
  params.set("media", "ebook");
  params.set("limit", String(limit));
  const url = `/api/itunes-search?${params.toString()}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { "Accept": "application/json" },
  });
  if (!res.ok) throw new Error(`itunes_books: ${res.status}`);
  const json = await res.json();
  const arr = Array.isArray(json?.results) ? json.results : [];
  return arr.slice(0, limit).map(normalize);
}

export async function searchITunesBooks(title, author = "", limit = 5) {
  const trimTitle = (title || "").trim();
  if (!trimTitle) return [];
  const trimAuthor = (author || "").trim();
  if (trimAuthor) {
    const out = await searchOnce(`${trimTitle} ${trimAuthor}`, limit);
    if (out.length > 0) return out;
  }
  return searchOnce(trimTitle, limit);
}

export async function pickFirstMatch(title, author = "") {
  const k = keyOf(title, author);
  if (_inflight.has(k)) return _inflight.get(k);
  const p = (async () => {
    try {
      const results = await searchITunesBooks(title, author, 1);
      return results[0] || null;
    } catch (e) {
      console.warn("enrichBookITunes.pickFirstMatch:", e?.message || e);
      return null;
    } finally {
      _inflight.delete(k);
    }
  })();
  _inflight.set(k, p);
  return p;
}
