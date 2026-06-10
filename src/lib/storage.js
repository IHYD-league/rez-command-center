import { useEffect, useState } from "react";
import { supabase } from "./supabase.js";

// Private bucket created in supabase/schema.sql (Phase 2).
// RLS scopes each user to the first folder segment === their family_id.
export const PHOTOS_BUCKET = "family-photos";

// Client-side image compression — per docs/IMAGE-PIPELINE.md.
// Per-kind targets balance "good enough to look at" against "small
// enough to ship and store cheaply." Quality is the JPEG quality
// passed to canvas.toBlob (0..1). maxEdge clamps the longest side.
const COMPRESSION_CONFIG = {
  proof:  { maxEdge: 1600, quality: 0.82 },
  album:  { maxEdge: 2000, quality: 0.85 },
  avatar: { maxEdge: 512,  quality: 0.85 },
  award:  { maxEdge: 1600, quality: 0.85 },
  cover:  { maxEdge: 1200, quality: 0.85 },
};
const HARD_CAP_BYTES = 8 * 1024 * 1024;

async function canvasToBlob(canvas, quality) {
  if (canvas.convertToBlob) {
    return canvas.convertToBlob({ type: "image/jpeg", quality });
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob returned null"))),
      "image/jpeg",
      quality
    );
  });
}

// Compress an image File to a JPEG with per-kind size/quality settings.
// Returns a File ready to upload. Safety rails:
//   - non-image files (PDF etc.) pass through unchanged
//   - if decode or encode fails, return original (never lose a photo)
//   - if the encoded output is bigger than the input, return original
//   - if encoded output exceeds HARD_CAP_BYTES, retry once with quality - 0.05
// EXIF is stripped as a side effect of canvas re-encode — taken_at and
// caption already carry the human-meaningful metadata so this is fine.
export async function compressImage(file, kind = "proof") {
  if (!file?.type?.startsWith("image/")) return file;
  const config = COMPRESSION_CONFIG[kind] || COMPRESSION_CONFIG.proof;

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch (e) {
    console.warn("compressImage: decode failed, uploading original:", e?.message || e);
    return file;
  }

  try {
    const longest = Math.max(bitmap.width, bitmap.height);
    const scale = longest > config.maxEdge ? config.maxEdge / longest : 1;
    const targetW = Math.max(1, Math.round(bitmap.width * scale));
    const targetH = Math.max(1, Math.round(bitmap.height * scale));

    const useOffscreen = typeof OffscreenCanvas !== "undefined";
    const canvas = useOffscreen
      ? new OffscreenCanvas(targetW, targetH)
      : Object.assign(document.createElement("canvas"), { width: targetW, height: targetH });
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    bitmap.close?.();

    let quality = config.quality;
    let blob = await canvasToBlob(canvas, quality);

    if (blob.size > HARD_CAP_BYTES) {
      quality = Math.max(0.5, quality - 0.05);
      blob = await canvasToBlob(canvas, quality);
    }

    if (blob.size >= file.size) return file;

    const baseName = (file.name || "upload").replace(/\.[a-z0-9]+$/i, "");
    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
  } catch (e) {
    console.warn("compressImage: encode failed, uploading original:", e?.message || e);
    return file;
  }
}

// Upload a file under <familyId>/<kind>/<timestamp>-<random>.<ext>.
// Returns { path, name } — `path` is what we persist; `name` is the
// original filename for display purposes. Images are compressed via
// compressImage before upload; non-images pass through.
export async function uploadFamilyPhoto({ file, familyId, kind = "proof" }) {
  if (!supabase) throw new Error("Supabase client not configured");
  if (!file) throw new Error("uploadFamilyPhoto: missing file");
  if (!familyId) throw new Error("uploadFamilyPhoto: missing familyId");
  const compressed = await compressImage(file, kind);
  const safeKind = String(kind).replace(/[^a-z0-9_-]/gi, "").slice(0, 32) || "misc";
  const rawExt = (compressed.name?.split(".").pop() || "").toLowerCase();
  const ext = rawExt.replace(/[^a-z0-9]/g, "").slice(0, 6) || "bin";
  const random = Math.random().toString(36).slice(2, 10);
  const path = `${familyId}/${safeKind}/${Date.now()}-${random}.${ext}`;
  const { error } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .upload(path, compressed, { upsert: false, contentType: compressed.type || undefined });
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
