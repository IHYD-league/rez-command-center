import { useEffect, useState } from "react";
import { supabase } from "./supabase.js";

// Private bucket created in supabase/schema.sql (Phase 2).
// RLS scopes each user to the first folder segment === their family_id.
export const PHOTOS_BUCKET = "family-photos";

// Upload a file under <familyId>/<kind>/<timestamp>-<random>.<ext>.
// Returns { path, name } — `path` is what we persist; `name` is the
// original filename for display purposes.
export async function uploadFamilyPhoto({ file, familyId, kind = "proof" }) {
  if (!supabase) throw new Error("Supabase client not configured");
  if (!file) throw new Error("uploadFamilyPhoto: missing file");
  if (!familyId) throw new Error("uploadFamilyPhoto: missing familyId");
  const safeKind = String(kind).replace(/[^a-z0-9_-]/gi, "").slice(0, 32) || "misc";
  const rawExt = (file.name?.split(".").pop() || "").toLowerCase();
  const ext = rawExt.replace(/[^a-z0-9]/g, "").slice(0, 6) || "bin";
  const random = Math.random().toString(36).slice(2, 10);
  const path = `${familyId}/${safeKind}/${Date.now()}-${random}.${ext}`;
  const { error } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type || undefined });
  if (error) throw error;
  return { path, name: file.name || path.split("/").pop() };
}

// ---------------------------------------------------------------
// Signed-URL cache — three layers, fastest-first:
//
//   1. In-memory Map   : zero-cost hits during a session.
//   2. localStorage    : survives page reloads, so the kid's first
//                        render after refresh already has the URL
//                        ready (no emoji-flash → photo).
//   3. Supabase fetch  : only when both caches miss or expired.
//
// All entries store { url, expiresAt (ms since epoch) }. Reads honor a
// 60-second safety buffer: a URL that's within a minute of expiring
// is treated as expired so a render doesn't begin loading an image
// the network is about to invalidate.
// ---------------------------------------------------------------

const _cache = new Map();
const LS_PREFIX = "rcc_signed_url:";
const SAFETY_MS = 60_000;

function _readLS(path) {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_PREFIX + path);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.url || !parsed?.expiresAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

function _writeLS(path, entry) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(LS_PREFIX + path, JSON.stringify(entry));
  } catch {
    // Quota exceeded — drop oldest entries by scanning keys; cheap
    // because we control the prefix.
    try {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith(LS_PREFIX));
      keys.slice(0, Math.ceil(keys.length / 2)).forEach((k) => localStorage.removeItem(k));
      localStorage.setItem(LS_PREFIX + path, JSON.stringify(entry));
    } catch {
      // give up silently — degraded to in-memory only
    }
  }
}

// Synchronous lookup. Returns the URL string if a fresh entry exists
// in either cache layer, else null. Used by useSignedUrl's useState
// initializer so a previously-seen avatar renders ON THE FIRST FRAME
// after a page reload.
export function cachedSignedUrl(path) {
  if (!path) return null;
  const now = Date.now();
  const mem = _cache.get(path);
  if (mem && mem.expiresAt - SAFETY_MS > now) return mem.url;
  const ls = _readLS(path);
  if (ls && ls.expiresAt - SAFETY_MS > now) {
    // Hydrate the in-memory cache so subsequent same-session reads
    // skip the localStorage trip entirely.
    _cache.set(path, ls);
    return ls.url;
  }
  return null;
}

export async function signedUrlFor(path, expiresIn = 60 * 60) {
  if (!path || !supabase) return null;
  const sync = cachedSignedUrl(path);
  if (sync) return sync;
  const now = Date.now();
  const { data, error } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .createSignedUrl(path, expiresIn);
  if (error) {
    console.warn("signedUrlFor:", path, error.message);
    return null;
  }
  const url = data?.signedUrl || null;
  if (url) {
    const entry = { url, expiresAt: now + expiresIn * 1000 };
    _cache.set(path, entry);
    _writeLS(path, entry);
  }
  return url;
}

// Hook: pass a storage path (or null/undefined for none). Returns a
// signed URL or null. Re-runs when the path changes.
//
// The useState initializer reads the cache SYNCHRONOUSLY so a cached
// URL is available on render 0 — no emoji-flash for repeat visits to
// the same avatar. The useEffect still runs to refresh if needed.
export function useSignedUrl(path) {
  const [url, setUrl] = useState(() => cachedSignedUrl(path));
  useEffect(() => {
    let cancelled = false;
    if (!path) { setUrl(null); return; }
    // If we already have a fresh cached URL for this path (from the
    // initializer OR a prior tick), skip the fetch — saves a Supabase
    // round-trip on every render that holds a hot avatar.
    const cached = cachedSignedUrl(path);
    if (cached) {
      setUrl(cached);
      return;
    }
    signedUrlFor(path).then((u) => { if (!cancelled) setUrl(u); });
    return () => { cancelled = true; };
  }, [path]);
  return url;
}
