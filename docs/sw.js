// My Family HQ — service worker.
//
// HAND-ROLLED (deliberately NOT vite-plugin-pwa). The plugin's default
// precaching of index.html is the exact stale-code trap we must avoid:
// installed users would get stuck on whatever bundle filenames the
// cached entry doc happened to reference. This SW is small, auditable,
// and explicit about what it caches vs what it leaves alone.
//
// HARD INVARIANTS — do not violate without re-reading the dispatch:
//
//   1. NAVIGATION / index.html: NETWORK-FIRST. Fetched fresh on every
//      open. Cache is consulted ONLY when the network fails (offline
//      fallback). A stale cached entry would freeze users on the bundle
//      filenames it referenced when last fetched. Make-or-break.
//
//   2. SUPABASE (*.supabase.co / .in): NEVER CACHE. The SW returns
//      without calling respondWith() so the browser handles the request
//      with its default fetch — no SW interception at all. Live data
//      and signed storage URLs are both broken by caching (stale reads,
//      expired-signature 403s on cached image src).
//
//   3. HASHED ASSETS (/assets/index-<hash>.js, .css, fonts): CACHE-FIRST,
//      long TTL. Safe because the filename IS the content (Vite emits a
//      content-hashed filename per build). A new deploy emits new
//      filenames; old ones can be cached forever.
//
//   4. STATIC ICONS / PNG / SVG: stale-while-revalidate. Rarely change,
//      cheap to keep fresh in background.
//
// VERSION: bumping this constant evicts the runtime cache on next
// activate (see the activate handler). Recovery hatch if a deploy ever
// ships a wedged SW — change the version, redeploy, installed clients
// pick up the new SW on next open, old cache is cleared.

const VERSION = "v1";
const RUNTIME = `mfhq-runtime-${VERSION}`;

const isSameOrigin = (url) => url.origin === self.location.origin;

// Vite content-hashed filenames look like /assets/index-DSog3VCa.js —
// a name segment, a hyphen, then 6+ url-safe chars, then an extension.
// We only cache-first these because the filename guarantees content
// equality across builds.
const isHashedAsset = (url) =>
  isSameOrigin(url) &&
  /^\/assets\/[^/]+-[A-Za-z0-9_-]{6,}\.(?:js|css|woff2?|ttf|otf)$/.test(url.pathname);

const isStaticIcon = (url) =>
  isSameOrigin(url) &&
  /\.(?:png|jpe?g|svg|webp|gif|ico)$/i.test(url.pathname);

// Both .supabase.co (prod) and .supabase.in (legacy regional) bypass
// the SW entirely. Includes API (/rest/v1/...) AND storage
// (/storage/v1/...) — both must never be cached.
const isSupabase = (url) => /\.supabase\.(?:co|in)$/.test(url.hostname);

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    // Evict every cache that isn't the current VERSION runtime cache.
    // A version bump alone is enough to force a full refetch of every
    // asset the SW had cached — the recovery hatch.
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== RUNTIME).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only ever touch GETs. POST/PUT/PATCH/DELETE are inherently
  // unsafe to intercept (idempotency, request bodies, auth headers)
  // and should pass through to the browser's default fetch.
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Invariant #2: Supabase requests are pass-through. Returning
  // without calling event.respondWith() means the SW never sees them
  // again — the browser uses its default fetch. No caching path
  // exists for these URLs in this file.
  if (isSupabase(url)) return;

  // Invariant #1: navigation requests are network-first. The cache
  // is written on every successful fetch so an offline reopen still
  // shows the app shell — but the cache is NEVER consulted before
  // the network on a normal load.
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        // Stash a copy as the offline fallback. Crucially, this write
        // happens AFTER the network response is already on its way
        // back to the page — it does not delay the user's load.
        const cache = await caches.open(RUNTIME);
        cache.put(req, fresh.clone()).catch(() => {});
        return fresh;
      } catch (err) {
        const cached = await caches.match(req);
        return cached || new Response(
          "Offline. Reconnect to load My Family HQ.",
          { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } }
        );
      }
    })());
    return;
  }

  // Invariant #3: content-hashed assets are cache-first.
  if (isHashedAsset(url)) {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      const fresh = await fetch(req);
      if (fresh && fresh.ok) {
        const cache = await caches.open(RUNTIME);
        cache.put(req, fresh.clone()).catch(() => {});
      }
      return fresh;
    })());
    return;
  }

  // Invariant #4: static icon-shaped paths stale-while-revalidate.
  if (isStaticIcon(url)) {
    event.respondWith((async () => {
      const cache = await caches.open(RUNTIME);
      const cached = await cache.match(req);
      const networkPromise = fetch(req).then((fresh) => {
        if (fresh && fresh.ok) cache.put(req, fresh.clone()).catch(() => {});
        return fresh;
      }).catch(() => cached);
      return cached || networkPromise;
    })());
    return;
  }

  // Anything else falls through to the browser's default fetch with
  // no SW interception. The conservative default — if it isn't a
  // case we've explicitly reasoned about, we don't touch it.
});
