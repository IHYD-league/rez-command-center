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

// Signed-URL cache so re-renders of the same path don't re-fetch.
// Keys: path. Values: { url, expiresAt (ms since epoch) }.
const _cache = new Map();

export async function signedUrlFor(path, expiresIn = 60 * 60) {
  if (!path || !supabase) return null;
  const now = Date.now();
  const cached = _cache.get(path);
  if (cached && cached.expiresAt - 60_000 > now) return cached.url;
  const { data, error } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .createSignedUrl(path, expiresIn);
  if (error) {
    console.warn("signedUrlFor:", path, error.message);
    return null;
  }
  const url = data?.signedUrl || null;
  if (url) _cache.set(path, { url, expiresAt: now + expiresIn * 1000 });
  return url;
}

// Hook: pass a storage path (or null/undefined for none). Returns a
// signed URL or null. Re-runs when the path changes.
export function useSignedUrl(path) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let cancelled = false;
    if (!path) { setUrl(null); return; }
    signedUrlFor(path).then((u) => { if (!cancelled) setUrl(u); });
    return () => { cancelled = true; };
  }, [path]);
  return url;
}
