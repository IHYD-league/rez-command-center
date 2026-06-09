# Photo Handling & Compression Strategy

> Drop in the repo at `docs/PHOTO-STRATEGY.md`. The plan for how the app stores
> photos so it scales affordably without losing the keepsake-quality shots that
> matter. Build as a shared utility, not per-feature. Read alongside
> ARCHITECTURE.md.

## The core insight
Not all photos are equal. The app will accumulate a LOT of images over years
(task proof, book covers, memories), and full-size phone photos (3-5MB each)
would balloon storage cost and slow the gallery. But blindly compressing
everything would ruin the keepsake shots. So:

**Compress aggressively by DEFAULT. Flag "special" photos to keep higher quality.**

## The two tiers

### Tier 1 — Standard (compressed) — the default
Most photos. Proof/progress shots and routine uploads.
- **Examples:** handwriting samples, math worksheets, task-proof photos, book
  covers (photo fallback), everyday uploads.
- **Why compress:** these are about *content and progression over time*, not
  print quality. You want to SEE his handwriting improve across months — a
  compressed image shows that perfectly. No need for high-res.
- **Target:** resize to ~800-1000px on the long edge, ~200-400KB. Big enough to
  read a worksheet / see handwriting clearly; small enough to be cheap and fast.
- This is the DEFAULT for every upload unless flagged otherwise.

### Tier 2 — Keepsake (high quality) — opt-in flag
Special moments worth preserving at higher fidelity.
- **Examples:** drum recital, a performance, a milestone moment, anything headed
  for a milestone slideshow or the "look back in a year" keepsake.
- **Why higher quality:** these are memories, not data. Years from now they're
  the photos you actually treasure / put on a big screen / in a slideshow.
- **Target:** larger max dimension (~1600-2000px), higher quality setting.
  Still reasonably compressed (not raw 5MB), but clearly better than Tier 1.
- **How it's chosen:** a "Keep high quality / Special memory" toggle on the
  upload form (likely tied to the Memory/album upload path, since memories are
  the keepsake tier; proof photos default to Tier 1).

## Build approach
- **Shared utility, not per-feature.** One compression helper used by EVERY
  photo upload path (task proof, memories, book-cover photo fallback). Don't
  reimplement per screen.
- **Client-side compression on upload** — resize/compress in the browser BEFORE
  the file goes to the storage bucket (canvas-based or a small library). Means
  we never upload the giant original; we only store the right-sized version.
- **Crop support** where it helps (esp. book-cover photos — frame just the
  cover). Crop happens client-side before compression/upload.
- The tier is decided at upload time by the flag; the helper just takes a
  quality/size target parameter.

## Why this matters (the honest reasons)
- **Cost:** storage + bandwidth scale with photo size. Compressing the 90% that
  don't need full-res keeps the bill small as the gallery grows over years.
- **Speed:** the gallery (and slideshows) load faster with right-sized images —
  a wall of 5MB photos is slow on mobile.
- **No keepsake regret:** the flag means the recital photo and the special
  moments AREN'T sacrificed to save money — only the routine proof shots are
  compressed hard.

## What NOT to lose
- Progression value: compressed proof photos must still be clear enough to SEE
  improvement (handwriting legible, worksheet readable). Don't over-compress to
  the point the progression story is lost.
- The flag must be easy and obvious at upload, or special photos get compressed
  by accident. Default-compress is right, but flagging "this one's special"
  should be one tap.

## Where it slots in (sequencing)
- This is infrastructure that supports the photo features. Best built as a
  shared utility BEFORE or ALONGSIDE the photo-of-the-book cover fallback (which
  needs compression + crop anyway). Once the utility exists, retrofit the
  existing upload paths (task proof, memories) to use it.
- Not urgent vs. reliability/PWA, but increasingly worth it as the photo count
  grows. The sooner it's in, the less full-size cruft accumulates.

## Open questions (resolve at build time)
- 💡 Compress existing already-uploaded photos retroactively, or only new ones
  going forward? (Lean: new ones going forward; retrofit old ones only if
  storage actually becomes a problem.)
- 💡 Exact targets (px / KB / quality) for each tier — tune on real photos.
- 💡 Library vs. pure canvas for compression/crop — recon to pick the lightest
  reliable option.
- 💡 Does the keepsake flag live only on Memory uploads, or available on any
  upload? (Lean: default proof = Tier 1; Memory uploads get the Tier 2 option.)
```
