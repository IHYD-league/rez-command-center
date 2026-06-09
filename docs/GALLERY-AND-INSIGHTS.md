# Gallery, Memory Album, Milestones & Data Export — Vision Doc

> Drop in the repo at `docs/GALLERY-AND-INSIGHTS.md`. Read alongside
> `ARCHITECTURE.md` (**ARCHITECTURE.md wins on any tiebreak**). This is a vision
> doc, not a build. Build as its own arm AFTER the current board polish + queue
> (Coach Mode, magic-link, weekly/monthly boards) clears. Brick-by-brick,
> preview-tested, per standing guardrails.

## The why (this is bigger than a feature)
This app is becoming the **record of Reznor's childhood and growth** — his bank,
his memory album, his progress story. The family will live in it for years. The
gallery/album/export features turn the data we're already collecting into
something we can browse, celebrate, look back on, and own. The goal isn't more
tracking — it's *seeing* and *keeping* what's tracked.

## The One Rule (per ARCHITECTURE.md)
Everything here is a **display + export layer over existing data** — photos in
the `family-photos` storage bucket, completions, `song_plays`, books, minutes.
No new source of truth. New tables only for things that genuinely don't exist
yet (e.g. parent-added album photos that aren't task proof, or saved
slideshow/album metadata). Never re-store completion/star/song truth.

## Honest data-start note
Granular tracking (photos, song plays, minutes) began ~June 2026 — about 310
days into the drum streak. So galleries/insights are accurate **going forward**,
not retroactive to day 1. Label time-based views with "tracking since
<date>" so charts don't imply data we don't have. The value compounds over
months/years — by the 1-year mark there's a real story to show.

---

## Feature 1 — Photo Gallery
- **See all photos** in one place (task-proof photos + parent-added album photos).
- **Tap to enlarge** (full-screen lightbox, swipe between).
- **Sort:** newest→oldest, oldest→newest, by date.
- **Filter by category:** only handwriting/writing, only math, only drums, only
  hip hop dance, etc. — map to existing activity categories so it auto-organizes.
- **Visually track progress:** filter to handwriting, sort oldest→newest →
  literally watch his handwriting improve over time. (This is a signature use.)
- Each photo shows: date, category/activity, who uploaded it, optional caption.

## Feature 2 — Memory Album (parent-added photos)
- Parents can add photos that AREN'T task proof — just memories of his journey
  (a recital, a Lego build, a good day).
- Same gallery + filters; tagged so they can be viewed alongside or separately
  from task-proof photos.
- Makes the app a family album, not just a tracker.
- Likely needs a small new table or a "source: album" flag on photo records —
  confirm in recon; don't fork photo truth.

## Feature 3 — Milestone Slideshows
- **Monthly slideshow** — built toward each month; a recap of the month's photos
  + highlights. Something to look forward to.
- **6-month anniversary** show — bigger progression story.
- **1-year** show — the full year.
- Auto-assembled from photos/data in the date range; optional parent curation
  (pick highlights, add a note).
- Celebratory, shareable feel — these are the "look how far he's come" moments.

## Feature 4 — Insights (the data depth)
Aggregate existing data into trends/totals:
- **Total practice time** — sum minutes logged on Drumeo / Melodics / etc.,
  running total + over time. ("Tracking since" honest framing.)
- **Most-played songs** — counts from `song_plays`.
- **Books** — what types/levels he's reading, over time.
- **Photo counts by category**, completion counts by category, etc.
- Start with high-value totals/lists; fancier charts (lines, heatmaps) later.

## Feature 5 — Data Export
- **Select + filter any dataset** (all songs, all photos, completions, minutes,
  books, etc.) and export it.
- Filter what's included/excluded before export.
- Formats: CSV for tabular data (songs, completions, minutes); photo export as
  a downloadable set/zip for images.
- Principle: **the family owns its data** — easy to take it out anytime.

## The bank reality (context that makes this matter)
This app is Reznor's real bank — he earns stars, saves, and spends them on toys
and things he wants. That's the stakes. The gallery/album/insights sit on top of
a system that's genuinely meaningful to him, so reliability and "keeping it up"
matter. Treat data with care (the export feature is part of that — never trap
their data).

---

## Phasing (build after current queue clears)
- **Phase 1 — Photo Gallery + filters + enlarge.** The core "see his photos,
  sort, filter, tap to enlarge" experience. Reads the existing bucket.
- **Phase 2 — Memory Album.** Parent-added (non-proof) photos in the same gallery.
- **Phase 3 — Insights.** Practice-time totals, most-played songs, books, counts.
- **Phase 4 — Data Export.** Select/filter/export datasets (CSV + photo set).
- **Phase 5 — Milestone Slideshows.** Monthly → 6-month → 1-year recaps.

## Open questions (resolve at build time)
- 💡 Whose primary view — parent (reflective/analytical) with a kid-friendly
  "my treasures" version? (Lean: both, parent-first.)
- 💡 Album photos: new table vs. flag on existing photo records? (Recon to decide.)
- 💡 Export: in-app download vs. email? Photo export as zip feasible client-side?
- 💡 Slideshow: auto-assembled vs. parent-curated highlights? (Lean: auto with
  optional curation.)

## Acceptance criteria
- Gallery shows all photos; tap-to-enlarge; sort by date both ways; filter by
  category; handwriting-over-time view works.
- Parents can add album (non-proof) photos.
- Insights show accurate totals/lists with honest "tracking since" framing.
- Export produces correct filtered datasets (CSV + photos).
- All reads from existing data; no forked truth; removing these views leaves
  canonical data unchanged.
- Clean Netlify preview; no regressions.

## Note to remember
This is the part that makes the app a keepsake, not just a tool. Build it so that
years from now, Mike and Krissie can scroll back and *see* Reznor grow — and so
Reznor can see his own journey. That's the whole point.
