# Image Pipeline — Build-Later Spec

Two related ideas that came up after Phase 6a (Open Library cover enrichment) shipped.
Neither is urgent. Capturing here so the context isn't lost.

---

## Why this doc exists

Two real moments triggered it:

1. **Open Library found the right book** ("Little Kids First Big Book of Bugs",
   National Geographic, Catherine D. Hughes) but the cover thumbnail it returned
   is lower resolution than a photo Mike could take with his phone of the actual
   book on the shelf. Auto-enrichment is good. The image quality ceiling is too
   low for the books we actually own.
2. **Every upload path in the app currently stores the original file as-is.**
   Proof photos from `TaskSheet`, memories from `AddMemoryForm`, avatars,
   awards, future custom covers — all go through `uploadFamilyPhoto()` in
   `src/lib/storage.js` with no resize, no recompression. iPhone HEIC/JPEG
   originals routinely run 3–6 MB. Multiply by every completion across a year
   and Supabase storage + signed-URL bandwidth becomes a real bill.

Both problems sit on the same plumbing. Worth solving together.

---

## Part 1 — Custom cover override (books)

### Problem
Phase 6a's match flow is: search Open Library → show top result → ✓ / ↺ / Skip.
Even when the match is correct, the cover image is whatever scan OL has, and
that's often a small/low-contrast/cropped thumbnail. There is no path today to
say "right book, but use *my* photo of the cover."

### Proposal
Add a fourth state to the book row: **Custom cover**.

- New column on `public.books`: `custom_cover_path TEXT` (storage path, not URL).
  Pattern matches existing convention: `<familyId>/cover/<timestamp>-<rand>.jpg`.
- New `kind` value for `uploadFamilyPhoto`: `"cover"`. No schema change to the
  helper — it already accepts arbitrary kinds.
- Fallback chain when rendering a book row:
  1. `custom_cover_path` (if set) → signed URL via existing 3-layer cache.
  2. `cover_url` from OL (if `match_status` is `auto` or `confirmed`).
  3. Placeholder (current empty state).
- UI: small "📷 Use my photo" affordance on the book row, available whether or
  not OL matched. Tapping opens the same file picker as proof photos.
- `match_status` semantics: a custom cover doesn't change match status. The
  canonical title/author from OL is still useful even if the cover isn't.
  If the user uploads a custom cover on an `unmatched` row, that's fine —
  cover renders, enrichment auto-fires next render to fill title/author only.

### Out of scope for this build
- No cropping UI. We trust the camera framing.
- No "set as canonical cover for the family library" — strictly per-book.
- No backfill — existing books just keep their OL cover until someone opts in.

### Touch list
- `supabase/migrations/<ts>_add_books_custom_cover.sql` — single column.
- `src/data/transform.js` — `toApp.book` + `toDb.book` round-trip
  `customCoverPath`.
- `src/Insights.jsx` — `EnrichedBookRow` rendering + new upload button.
- `src/lib/storage.js` — no change (kind="cover" works today).

---

## Part 2 — Universal client-side compression

### Problem
Every `uploadFamilyPhoto` call ships the original bytes. iPhone "Most
Compatible" JPEG mode emits 3–5 MB files. We store the full original, then
serve it back over a signed URL for a 200×200 list thumbnail. Every read
re-pays the bandwidth cost.

### Proposal
Single compression step inside `uploadFamilyPhoto`, before the Supabase
`upload()` call. No caller changes — every existing call site benefits.

**Pipeline (browser, before upload):**
1. If input is not an image (PDF, etc.), pass through untouched.
2. Decode via `createImageBitmap(file)` (handles HEIC where the browser
   supports it; falls back to `Image` + `URL.createObjectURL` for Safari quirks).
3. Compute target dimensions: longest edge clamped to a per-kind cap.
4. Draw to an `OffscreenCanvas` (or regular `<canvas>` fallback) at the target
   size with `imageSmoothingQuality: "high"`.
5. Export via `canvas.toBlob(blob, "image/jpeg", quality)` — JPEG even if
   source was PNG, because none of our use cases need transparency.
6. Upload the resulting blob with a normalized `.jpg` extension.

**Per-kind tuning** (the only "config" the pipeline needs):

| kind     | longest edge | JPEG quality | Notes                                      |
| -------- | ------------ | ------------ | ------------------------------------------ |
| proof    | 1600 px      | 0.82         | Has to read legibly; not a hero image.     |
| album    | 2000 px      | 0.85         | Memories — slightly higher ceiling.        |
| avatar   | 512 px       | 0.85         | Already shown small; aggressive resize ok. |
| award    | 1600 px      | 0.85         | Certificates need text legible.            |
| cover    | 1200 px      | 0.85         | Book/album covers — square-ish, smallish.  |

Numbers are starting guesses, not load-bearing. Tune after first round of
real photos.

**Safety rails:**
- If compression *grows* the file (already-small inputs), keep the original.
- If `createImageBitmap` throws, log and upload the original — never lose a
  photo because the optimizer choked.
- Hard cap: never upload anything > 8 MB after compression. If we hit that,
  drop quality by 0.05 and retry once.

### Why not server-side?
We don't have a server beyond Supabase + Netlify. A Netlify Function adds
cold-start latency to every upload and another moving piece to monitor.
Browser canvas is "free" — the upload was going to block on network anyway,
and modern phones encode JPEG in under a second.

### What we explicitly skip
- WebP / AVIF. JPEG is universally readable. Revisit if storage actually hurts.
- EXIF stripping as a separate goal — Canvas re-encode drops it for free.
  (Side effect to be aware of: lat/long, capture device, original timestamp
  all gone. Caption + `taken_at` column already cover the human-meaningful
  parts.)
- Progressive uploads / chunking. Files post-compression should be well under
  the size where chunking matters.

### Touch list
- `src/lib/storage.js` — add `compressImage(file, kind)` helper, call it from
  `uploadFamilyPhoto` before `from(bucket).upload()`.
- No DB migration.
- No transform.js change.
- No caller change at any of the existing upload sites.

---

## Sequencing

Independent. Custom cover override is a focused books feature with a clean
column add. Universal compression is cross-cutting infra. Pick whichever
itch is louder when the time comes.

If both ship in the same week, custom cover should land **after** compression
so the very first custom cover Mike uploads benefits from the pipeline.

---

## Honest tradeoffs

- **Compression is lossy by design.** We are choosing storage + bandwidth over
  pixel-perfect fidelity. If a future feature wants the original (printable
  yearbook export, "view full resolution"), it won't exist. That's a real
  closing of a door. Worth it for now; flag if priorities shift.
- **Custom covers are user labor.** OL auto-enrich is two taps. Custom upload
  is open camera → frame → upload → wait. Most books will stay on OL covers
  forever, and that's fine. This is for the handful of favorites that deserve
  the better image.
- **No de-duplication.** Two kids uploading the same photo of the same book
  cover will produce two distinct storage paths. Acceptable; cleanup is a
  future-future problem.
