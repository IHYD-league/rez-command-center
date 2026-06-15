// useBookWebSearch — debounced book search hook used by every "find a
// book on the web" surface in the app. Same chain everywhere: Google
// Books (rich metadata + reliable covers when the family's
// GOOGLE_BOOKS_API_KEY is set) → Open Library silent fallback. Both
// calls route through same-origin /api/* proxies so Safari "Load
// failed" can't strand a parent mid-search.
//
// Used by:
//   - TaskSheet reading picker (Reznor read N books today)
//   - ReadingLibrary AddBookForm (add a new book with cover)
//   - BookRow / BookEditPanel cover-refresh button
//
// Returns the standard shape:
//   { results, searching, error, retry }
// where retry is a () => void that re-fires the same query without
// asking the parent to retype.

import { useEffect, useState } from "react";
import { searchOpenLibrary } from "./enrichBook.js";
import { searchGoogleBooks } from "./enrichBookGoogle.js";

export function useBookWebSearch(query, options = {}) {
  const { enabled = true, minLength = 3, debounceMs = 400, limit = 5, skip = false } = options;
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!enabled || skip) {
      setResults([]);
      setError("");
      return;
    }
    const needle = (query || "").trim();
    if (needle.length < minLength) {
      setResults([]);
      setError("");
      return;
    }
    let cancelled = false;
    setSearching(true);
    setError("");
    const id = setTimeout(async () => {
      let out = [];
      let primaryErr = null;
      try {
        out = await searchGoogleBooks(needle, "", limit);
      } catch (e) {
        primaryErr = e;
        out = [];
      }
      if (cancelled) return;
      if (!Array.isArray(out) || out.length === 0) {
        try {
          const ol = await searchOpenLibrary(needle, "", limit);
          if (!cancelled && Array.isArray(ol)) out = ol;
        } catch (e) {
          if (primaryErr && !cancelled) {
            setResults([]);
            setError(primaryErr.message || "Couldn't reach the book service.");
            setSearching(false);
            return;
          }
        }
      }
      if (cancelled) return;
      setResults(Array.isArray(out) ? out : []);
      setError("");
      setSearching(false);
    }, debounceMs);
    return () => { cancelled = true; clearTimeout(id); setSearching(false); };
  }, [query, enabled, skip, minLength, debounceMs, limit, tick]);

  const retry = () => setTick((t) => t + 1);
  return { results, searching, error, retry };
}

export default useBookWebSearch;
