// Storage garbage collection — ref-counted deletes.
//
// After the content-hash dedup change (fix/storage-content-hash-
// dedup), a single storage path may be referenced by multiple DB
// rows: two completions sharing identical proof bytes, a
// completion proof reused as a book cover, two book covers that
// are byte-identical, etc. So a row delete CAN'T blindly remove
// the storage object — it has to check that no other row still
// holds the path.
//
// This module owns the "is anyone still using this path?" scan
// and the deferred delete. Callers (removeBook, removeSong,
// undoTask, removeCompletionPhoto, …) pass the candidate path
// list + the FULL post-update app state, and we delete only the
// paths with zero remaining references.

import { supabase } from "./supabase.js";
import { PHOTOS_BUCKET } from "./storage.js";

// Walk every place a storage path can be persisted and report
// whether it's still in use. Order is fast-path first (proof[] is
// the biggest table) so we early-exit cheaply on the common case.
export function isPathStillReferenced(path, state = {}) {
  if (!path) return false;
  const {
    completions = [],
    books = [],
    songs = [],
    gifted = [],
    albumPhotos = [],
    users = [],
    awards = [],
  } = state;
  for (const c of completions) {
    if (!Array.isArray(c.proof)) continue;
    for (const p of c.proof) {
      if (p && p.path === path) return true;
    }
  }
  for (const b of books) {
    if (b?.customCoverPath === path) return true;
  }
  for (const s of songs) {
    if (s?.customCoverPath === path) return true;
  }
  for (const g of gifted) {
    if (g?.extra?.photoPath === path) return true;
  }
  for (const ap of albumPhotos) {
    if (ap?.path === path) return true;
  }
  for (const u of users) {
    if (u?.photo === path) return true;
  }
  for (const a of awards) {
    if (a?.filePath === path) return true;
  }
  return false;
}

// Filter a candidate path list down to the ones with zero remaining
// references, then fire a single storage.remove for them. Skips:
//   - falsy paths
//   - direct URLs (legacy data stored a signed URL in proof[].url
//     instead of a storage path; we never delete those)
//   - paths that look invalid (no leading family folder segment)
//   - paths still referenced by any row in the post-update state
//
// Returns nothing — fire-and-forget. Errors are logged but don't
// throw because a failed cleanup is a cost issue, not a UX issue;
// the row was already removed from the app's state.
export async function maybeDeleteUnusedPaths(paths, state) {
  if (!supabase) return;
  if (!Array.isArray(paths) || paths.length === 0) return;
  const seen = new Set();
  const toDelete = [];
  for (const p of paths) {
    if (!p) continue;
    if (typeof p !== "string") continue;
    if (/^(https?:|data:|blob:)/i.test(p)) continue; // legacy URL, not a path
    if (!p.includes("/")) continue;                  // malformed
    if (seen.has(p)) continue;
    seen.add(p);
    if (!isPathStillReferenced(p, state)) toDelete.push(p);
  }
  if (toDelete.length === 0) return;
  try {
    const { error } = await supabase.storage.from(PHOTOS_BUCKET).remove(toDelete);
    if (error) {
      // Log only — orphaned storage is a cost issue, not a UX issue.
      // A periodic cleanup script can sweep later if needed.
      console.warn("storage GC: remove failed", error.message, toDelete);
    }
  } catch (e) {
    console.warn("storage GC: remove threw", e?.message || e, toDelete);
  }
}

// Convenience extractors for the common shapes — keeps call sites
// from repeating the same "is it an array, is .path a string, …"
// shape checks.
export function pathsFromProof(proof) {
  if (!Array.isArray(proof)) return [];
  return proof.map((p) => p?.path).filter((p) => typeof p === "string" && p);
}
