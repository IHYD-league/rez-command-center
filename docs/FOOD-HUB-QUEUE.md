# My Family HQ — work queue

**Captured:** 2026-06-18
**Purpose:** Tactical backlog. The ordered list of bricks behind the current Food Hub work, with enough spec to dispatch each one when its turn comes. The strategic north star lives in `FOOD-HUB-VISION.md` — this is the build queue.

**Iron rule across all of it:** one brick per lane, never two agents in App.jsx at once, each brick merged + prod-confirmed before the next pulls, `.env` restored to prod before any push.

---

## Shipped

**Chapter 1 — list navigation (Black).** Multiple navigable lists, registry in `family_settings.settings.shoppingLists` jsonb (Option A, no schema). `{key, name}` split, case-insensitive read so legacy capital-G "Grocery" items match the `grocery` key with no backfill. All four phases (1a registry+tab bar+empty-list survival, 1b last-active memory, 1c create+normalize+collision UX, 1d rename+delete+manual-reorder) **merged and live on prod** (chapter merge `4d69304`).

**Add-path normalization (Black).** The three existing add paths (scan/typed/favorite-tap) now write `activeListKey` (normalized) instead of raw `activeList` — closes the latent split-collide risk Green caught during his rebase. The whole ShoppingList component speaks one write convention. **Merged and live on prod** (`1ce5e17`).

**Pre-commit hook fix (Black).** Stages only its own build paths, never blanket `git add docs/`. **Merged** (`6070e1d`).

**Persistent multi-delete with undo (Black).** Tap-X soft-deletes an item into a per-list "Recently removed · N" collapsible bin at the bottom of the active list. No timer, no auto-expire — recoverable indefinitely, survives navigation AND full app reload (the bin is derived from `deleted_at` rows, not in-memory state, so reload-survival is structural). Per-item Undo + Undo-all (header) + Remove-all (the only hard-purge, behind a confirm modal). Kid X-guard `{!isKid && <X/>}` built but untestable today (no kid path to Shopping List yet) — readied for the kid-Food-Hub brick. Uses the existing `deleted_at`/`deleted_by` columns (no new migration; columns added 2026-06-17, all Lynch items confirmed intact). Paired rollback in `supabase/rollbacks/`. **Merged and live on prod** (`c4a554d`).

---

**RS-1 — receipt scanner foundation (Green).** Receipts table (live on prod DB), receipt scan-kind in vision-parse (live server-side), kind-chooser sheet replacing the old 2-button scan grid (list / product / receipt tiles), and a ReceiptScanner "Coming next" placeholder — no dead-end. Scanner item-writes use `listName: activeListKey` per the contract. **Merged and live on prod** (`cc58c92`).

**Receipt scanner — full flow (Green).** The complete vertical: scan a receipt (📷 → 🧾) → parse via vision-parse → review/fix garbled lines (editable title/brand/qty/price) → save to the `receipts` table → view under More → **Receipts** (chronological list, tap to expand: image thumbnail, totals, line items) → **edit or re-tag anytime later** (pencil → edit mode, Cancel discards). Receipts are accounting, shopping list is intent — they're **orthogonal**: linking a receipt line to a shopping_items row is a quiet per-row opt-in ("🔗 Tag to list item"), never auto-pushed. `ReceiptItemRow` + `PickerSheet` extracted to a shared component so the capture surface IS the edit surface. Soft-delete via `deletedAt` (spending math filters it). `ocr_raw.items_reviewed` is the RS-2 promotion contract. **Merged and live on prod** (`fc40af2`). HEIC confirmed a non-issue on the family's iPhones (real-device test) — HEIC-conversion brick dropped.

**UPC-lookup on receipt lines (Green) — DORMANT IN PRACTICE.** Vision-parse emits `upc` per item; ReceiptScanner does parallel `/api/lookup-upc` calls (Open Food Facts) with a strict `isCleanOffTitle` insurance gate before substituting; ReceiptItemRow flips `title_source → "user"` on manual edit so user fixes survive future lookups. Architecture is sound. **The data isn't.** Real Walmart receipt test 2026-06-18: 0/10 OFF hits — US store-brands (GV/Kirkland/produce/merch) are a coverage wall. The brick shipped, but in practice it changes nothing user-visible on US grocery runs. Don't reinvest in the lookup path; the vision parser is the real lever if clean names ever matter. **Merged and live on prod** (`4db27a7`).

**Spending Insights (Black) — THE centerpiece, LIVE.** What the whole receipt vertical was *for*: a Spending tab under More with current-month headline, 6-month trend chart, by-store breakdown, store drill-downs, per-item price history with precise identity. Built directly over `receipts.ocr_raw.items_reviewed[i]` via jsonb-path queries — no purchases table needed for v1 (RS-2 is the promote-to-real-table step if/when performance demands). Filters `deletedAt IS NULL` so soft-deleted receipts drop out of math. **Chart and headline agree by construction** — both share `monthKeyOf` (UTC, deterministic), the unification fix that closed the June-bar divergence. **Merged and live on prod** (`3ec06d4`); branch-preview-verified by Mike (June = $169, matches headline); prod-green confirmed via Netlify deploy `commit_ref`.

---

## In flight

**Vision-parse auth gate (Green) — #1, IN PROGRESS.** See queue item #1 below — Green is planning the auth gate now. Black is parked, clear of App.jsx, doc-work only this lane.

---

## Queued (in order)

### 1. Vision-parse auth gate (Green) — P0, IN PROGRESS — close the unauth gap before the cohort widens
The vision-parse Netlify function carries real receipt data (store names, dates, dollar amounts) and runs **unauthenticated** as of the receipt-scanner ship. Three families are now live (Reznor, Maddox, Stella, Xander coming) — this is the last load-bearing unauth surface touching real family data and it must close before non-Lynch families scan in volume. Lock the function (and the `/api/lookup-upc` path while we're in there) to authenticated logins, with a clean error path on the client when the session is missing/expired. **Green is planning now; Black holds App.jsx.** This brick also establishes the "who's a signed-in user" plumbing that item #5 (Kid Food Hub participation) depends on.

### 2. "Scan a receipt" button inside the Receipts view (small)
Right now you scan a receipt from the Shopping List chooser but VIEW receipts under More → Receipts (scan-here-view-there, a sequencing artifact). Add a "📷 Scan a receipt" button directly in the Receipts view so the whole receipt loop (scan → view → edit) is self-contained in one place. Small — reuses the existing ReceiptScanner mount. Low risk, doesn't touch navigation structure. Can land anytime after #1.

### 3. Move item between lists (Black) — the surviving half of 1f
Undo-delete shipped separately (see Persistent multi-delete, above); this is the other half, now its own brick. Long-press on an item on phone (right-click on desktop) → pick a target list → rewrite that item's `list_name` to the target's **normalized key** (use `activeListKey`/`normalizeListKey` — NOT a raw display string, or it recreates the duplicate-split bug). No schema — a list is just a `list_name` value, so the move is a one-field rewrite. Reuses the long-press/menu gesture infrastructure already built. Branch off current main.

### 4. Food Hub navigation container (PLAN-FIRST, deliberate restructure)
**The destination Mike wants:** one **Food Hub** entry in the More menu that contains Shopping List + Receipts + Spending (+ later: Food Master list, staples, inventory) — instead of those living as flat siblings in More next to unrelated things. Matches how the product is actually thought about ("the Food Hub"). Keeps More from becoming a junk drawer as the vertical grows.
- **Why now (the three core food surfaces are live):** Shopping, Receipts, and Spending all shipped — the container can be designed around the complete set in one pass instead of re-touching nav each time something new lands.
- **Plan-first:** the Food Hub landing screen is a real design decision, not a mechanical move (a menu? a dashboard showing the active list + recent receipts + this-month spend at a glance?). Back-button / deep-link integrity, what's the URL surface, what's the empty state. Surface the layout before building.

### 5. Kid Food Hub participation (PLAN-FIRST) — depends on #1 establishing signed-in-user identity
Kids help with the list: flag "we're out of bubbly water / Cheez-Its," request items ("can we get cheese sticks"), routed into the **existing request→approve flow** the app already has. This is the family-participation piece of the Food Hub vision. **This is the feature the shopping-list kid X-guard was built for** — today kids have NO path to the shopping list at all, so the guard sits on an unreachable screen.
- **Plan-first**, real design questions: kids need a **kid-appropriate entry point** (NOT a copy of the full parent More menu / shopping UI). Likely partly "build a kid entry point" + partly "point kids at plumbing that already exists."
- Open questions: what does a kid see (a stripped view? a single "ask for something" button?); can they only request, or also check off / report out-of-stock; how it routes to parent approve/deny.
- **Depends on #1 (vision-parse auth gate)** — that brick establishes the "who's a signed-in user" plumbing this brick consumes; sequencing matters.

### 6. Mr. Voyce / image-leak — RECON FIRST
**Symptom:** Reznor's Drum *activity* and **Mr. Voyce, his music teacher**, are separate entities, but an image leaked across them. Krissie's photo of Reznor in drum class got associated with one, and the Master of Puppets album art has now taken its place. Correct for the Drums activity, but the photo / teacher / activity should not share an image slot.
**Important clarification (2026-06-18):** Mr. Voyce is a **music teacher** currently teaching Reznor **drums** — he is NOT instrument-locked. He could teach Reznor piano or guitar next semester and his entity should survive that change unchanged. **The fix must NOT hardcode "drums" into Mr. Voyce's profile / image key / lookup.** Image keying should be on the teacher entity itself (music teacher, identity-stable), not on the current instrument.
**Likely root cause:** same class as the drum-hardcoding the streaks recon found — an image keyed too broadly (by "drums" generally, or a shared image field) instead of to the specific entity, so last-write-wins overwrites. Fix is "give each entity its own image key, scoped to the entity not the current activity."
**Why recon first:** unknown which surface Mr. Voyce lives on (contact? calendar/lesson? music/practice module?) — that determines the owning lane and whether it touches App.jsx. Do NOT dispatch a blind fix.
**Sequencing note:** do this recon **before** streaks Phase 1, because both touch the drum-hardcoding territory — recon tells you whether the leak and the streaks generalization are one brick or two.

### 7. Streaks Phase 1 for Xander (Green, spec already written)
Make any activity work as a headliner streak the way Reznor's Drums does — so Xander's parent can make **Piano** his headliner. Full spec already in `docs/STREAKS-FOR-ANY-ACTIVITY-PLAN.md`.
- **Non-negotiable:** Reznor-regression-first — prove nothing changes for Reznor (drum banner / practice card / achievement copy unchanged via the `a_drums` seed) before building outward.
- **Data safety:** the `headlinerActivityByKid` write into `family_settings.settings` must be a **merge**, not a replace — never clobber existing settings keys.
- Phase 1 only (headliner picker + StreakStrip respects it + Reznor seed). Phases 2–4 deferred. Keep Reznor's existing drum badges as-is; ship a parallel generic badge family for new families.

---

## Cleanup / data-integrity (do deliberately, not freehand)

- **Vision-parse auth gate — now queue item #1 (in progress).** Promoted from cleanup to the active queue because the cohort is widening; tracking here for completeness.

- **Duplicate "Lynch" family in prod (surfaced 2026-06-17).** Two family rows named "Lynch": the real one (`bdf473f4-…`, 80 items) and an orphaned empty one (`9118ee38-…`, 0 items) left over from session testing. A duplicate family in the live families table is a latent data-routing risk (a sign-in or invite could attach to the wrong/empty one). Deliberate recon-then-remove: verify it's truly empty + orphaned (no profiles, no items, no settings rows pointing at `9118ee38`), then remove. NOT a freehand cleanup; its own approved step, surfaced and approved before execution (same boundary as any live-table change).

- **Trust-and-cost batch (paused new UX, gates multi-family pivot).** Cross-account save, audit trail, storage dedup, free/paid tier sketch. Paused 2026-06-13; all gate widening beyond the current 3-family cohort. Cleanup-class because each is a foundational not-quite-a-feature that has to land before the customer surface grows further.

---

## DANGER — do NOT merge

**`feat/day-by-day-browser` (stale branch, recommend deletion).** Predates Chapter 1, the invite-gate, and the barcode/UPC work. Merging it would delete shipped work. The Day-by-Day Browser concept, if/when built, gets **rebuilt fresh on current `main`** — never resurrected from this branch. Recommend: `git push origin --delete feat/day-by-day-browser` + `git branch -D feat/day-by-day-browser` (the `-D` is required because it's unmerged, which is exactly the point — we are deliberately discarding it, not merging). Mike's explicit go required before any branch delete.

---

## Further out (not queued yet)

- **Live-webcam scan (now UN-gated — RS-1 chooser shipped).** Today's scan is a file `<input>` (no `capture` attr — that's what gives iOS Safari its photo-source options; desktop falls back to OS file picker, no live camera, which is why local testing needs saved photos). True live scanning needs `getUserMedia({video:{facingMode:"environment"}})`, a live `<video>` element, the existing `@zxing/browser` decoder run on the stream (not a still file), stop-on-decode, and permission plumbing (no audio, no recording, decode-only). Real feature, not a one-liner. Can be plan-doc'd whenever — it now builds on the shipped chooser's scan-area, so the surface is stable.
- **RS-2** — purchases log + "I bought this" tap (the financial spine; void-row immutability). Spending Insights v1 is built over `ocr_raw` without this; RS-2 is the promote-to-real-table step if/when performance demands.
- **Chapter 2 — the master list & item-tier model** (favorites / regulars / one-offs, the ankle-brace case, the recurring-staples toggle). See the dedicated Chapter 2 section below — needs a design pass before building. A strong candidate to live INSIDE the Food Hub container (queue #4).
- **Chapter 4 — inventory as its own concept.** Schema change (`kind` column or `inventory_items` table). Green's lane, staging-gated. The moment to also promote shopping lists from jsonb registry → a real `shopping_lists` table (one migration, not two). Another Food Hub container resident.

---

## Chapter 2 — the master list & the item model (vision, needs a design pass before building)

This is the richest unbuilt area and it cohered across several conversations. **Do NOT dispatch this as a build — it needs a planning pass first** (resolve the model below into one coherent shape, like the chapter-1 navigation fork was resolved), then approve, then build. The pieces:

**The Food Master list (per user).** A master list of everything a user has gotten — so they don't have to keep re-scanning. Go to the master list, pick an item, and assign it to a store list (Costco, Trader Joe's) via the **same right-click (desktop) / long-press (phone) → pick-list gesture as 1f**. "Sometimes you don't want to remember, you just want to look at what we normally get." Source is scan/purchase history — richer once RS-2's purchase log exists.

**The item-tier model (the organizing principle — this is what keeps the master list from drowning).** Not everything scanned is a recurring need. Three tiers:
- **Favorites** — the weekly/monthly regulars you never want buried. Float to the top, always visible. (Builds on the existing per-list favorites concept, but as an explicit flag, not just add-count.)
- **Regular master-list items** — bought sometimes, part of the rotation, not pinned.
- **One-offs** — bought once, deliberately NOT recurring, kept OUT of the master list so it stays clean — but still **recorded and searchable**. The ankle-brace case: bought one once a year ago, lost it, now wants the exact same one. "What was that brace I got?" must be findable without cluttering the weekly list. The one-off history IS the purchase log (RS-2), queried as "things I bought once."

**The recurring-staples toggle (a reframe of green-check).** For weekly staples, DON'T clear the checked item — leave it sitting there checked (= "have it now"), and when you run out, just **uncheck** it and it's back on the active list. No re-adding, no re-scanning. Makes the list self-populating over time.

**THE DESIGN FORK (chapter 2 must resolve before building):** favorites + regular + one-off + the staples-toggle + the existing "Clear bought" button are FOUR-PLUS overlapping ideas about how an item relates to lists over time. They must collapse into ONE coherent model, not a pile of competing flags. Likely shape: every saved item has a **type** (favorite / regular / one-off — how it's organized) and a **state** (have-it-now / need-it — the green-check toggle). The "Clear bought" button conflicts with "keep staples as toggleable" — that conflict needs a deliberate answer (e.g. staples are protected from clearing, or the master list holds staples while the active list stays transient). This is the planning question. Get it wrong and you get a confusing toggle soup.

---

## Standing rules (cross-cutting, apply to every brick)

- **Constitution wins.** `MEMORY.md` → `project_operating_constitution.md` is the doctrine layer above every rule here. When this queue and the Constitution conflict, the Constitution wins.
- **Never ship a dead-end on a live app.** Real parents use this. Any surface that lands before its backing feature gets an honest "Coming next" state, never a tap-into-nothing.
- **Every captured surface stays editable after save.** Reuse the capture component, don't reimplement.
- **Kids never get destructive controls.** Even recoverable deletes are hidden for `role === "kid"`.
- **Numbers agree by construction.** Any total, chart, or aggregate must share one source of truth (e.g. `monthKeyOf` for Spending). A chart and its headline that disagree destroy trust in every number on the page.
- **Prod-green is verified by the deploy `commit_ref`, never the served bundle filename.** Netlify reuses content-hashed bundles ("all files already uploaded"), so the filename can stay unchanged on a successful deploy — the filename check false-negatives. Read the deploy record's `commit_ref` instead.
- **Migrations land deliberately.** Never piggyback on a build/preview/test step; own commit, own Mike-approved go, paired rollback in `supabase/rollbacks/`. Live-table changes are Mike's call, never an agent's "it's additive so I'll just push."
- **`.env` returns to prod before any push** (two-way check); local stacks stopped first; branches reconciled non-destructively (delete-and-repush-fresh), never force-push; `index.lock` collisions = wait and retry, never delete.
- One brick per lane; never two agents in App.jsx at once; each brick merged + prod-confirmed before the next pulls.
