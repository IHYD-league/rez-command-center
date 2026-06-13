# Trust + Cost Audit · 2026-06-13

Two parallel agent audits run after Mike's pause on new UX work. Goal: make sure cross-account saves work, audit trail exists, storage isn't being wasted, and tier pricing has concrete numbers.

---

## ✅ Solid (foundation works)

- **Every persisted entity routes through `makeSyncedSetter`** — completions, redemptions, gifted, songs, songPlays, books, awards, rewardRequests, users, tasks, rewards, streaks, events, handoff, albumPhotos, familySettings, summerQuest, boardState, userPrefs. No silent local-only writes for user data. (`src/App.jsx:747–760`)
- **Completion writes are server-enforced for actor identity** — `enforce_actor_identity_trg` rejects forged `submitted_by` / `approved_by`. Sara can't claim Mike approved something. (`supabase/migrations/20260609100015_add_admin_actor_guard.sql:70–117`)
- **RLS family isolation is complete** — every table has `family_id = my_family_id()` gating. Zero tables missing.
- **Completion edit history works** — `updateCompletion` appends `{ at, by, summary, changes }` to `extra.history`. Displayed in CompletionDetailSheet > Stats > Edit history.

That's the trust contract baseline. It holds.

---

## 🔴 Critical — fix before opening to other families

### 1. Reward redemption approval has no actor field

`decideReward(rdId, status)` just flips status to approved/denied. No record of which parent approved a 100-star redemption. The `redemptions` table doesn't even have an `approved_by` column. Disputes have no answer. (`src/App.jsx:1183–1185`)

**Fix:** Add `approved_by` + `approved_at` columns to `redemptions`. Stamp them in `decideReward`.

### 2. `decide()` (approve completion) writes no audit entry

When a parent taps Approve on a pending submission, `decide()` flips status + sets `approvedBy`, but does NOT append to `extra.history` like `updateCompletion` does. So "I approved this Tuesday at 3pm with +5 bonus" leaves no trace. (`src/App.jsx:1152–1177`)

**Fix:** Route through `updateCompletion(...{by, summary: "Approved" + bonus})` instead of raw `setCompletions`.

### 3. `removeGift` silently deletes

Comment literally says "Used to correct duplicates after the fact" — destructive, high audit value — but the row just vanishes. No record of who removed it or why. (`src/App.jsx:1280`)

**Fix:** Soft-delete (`deleted_at`, `deleted_by`) on `gifted_stars`, or log to `extra.history` before the delete.

### 4. Duplicate photo uploads in storage

`uploadFamilyPhoto` keys paths on `Date.now() + random` (`src/lib/storage.js:100`). Same bytes uploaded twice → two distinct storage objects. No content-hashing anywhere. At 100 families this is acceptable waste; at 1000 it's material.

**Fix:** SHA-256 the compressed bytes before upload, key the path on the hash, use `upsert: true`. Re-uploads land on the same path. DB rows still reference the path; row count stays accurate; storage count drops.

### 5. Deletes don't cascade to storage

When a book, song, gift, or completion is removed, the photo path stays in storage forever. Over years a family's `cover/`, `album/`, `proof/` folders accumulate orphans. (`src/App.jsx` — every `removeX`)

**Fix:** Each `remove*` checks for paths in the deleted row and calls `supabase.storage.from("family-photos").remove(paths)`. Same for `undoTask` and `removeCompletionPhoto`.

---

## 🟡 Important — fix before scale

| Gap | File | Why it matters |
| --- | --- | --- |
| `decideRewardRequest` creates a reward with no `created_by` | `src/App.jsx:1295–1300` | "Who invented this reward?" can't be answered |
| `updateGift` has no audit | `src/App.jsx:1284–1285` | "Krissie says she gave +10, the row says +5, who edited it?" |
| `updateSong` / `updateBook` / `removeBook` / `removeSong` no actor | `src/App.jsx` | "Who deleted Charlotte's Web?" → silence |
| `decideSongPlayRequest` — no approver record | `src/App.jsx:1382–1395` | Pattern violation, low blast radius |
| `enforce_actor_identity_trg` only covers `completions` | migration `20260609100015` | RLS prevents cross-family writes; it does NOT prevent Sara claiming "Krissie gave bonus stars" in `gifted_stars.given_by` |
| Zero size accounting | n/a | No way to surface "you've used 350 MB of 1 GB" for tier enforcement |

---

## 💰 Cost projection (Supabase storage @ $0.021/GB/mo)

| Scale | Storage/yr | Storage cost/yr |
| --- | --- | --- |
| 1 family | 5.4 GB | **$1.28** |
| 100 families | 540 GB | **$136** |
| 1000 families | 5.4 TB | **$1,360** |

Numbers assume: avg compressed photo 3 MB, busy family ~5 photos/day. Dedup via content-hashing saves ~30% across shared content (album art, repeat covers). Orphan cleanup matters more at scale.

The base Supabase plan ($25/mo) amortizes to pennies per family. **Storage overage is the only real scaling cost.** Both are flattenable with dedup + cascade-delete.

---

## 🎯 Tier sketch (concrete numbers Mike can react to)

### Free
- **50 photos / month** (~2/day)
- **250 MB cap**
- **90-day history** (older completions archive but stay queryable)
- **1 kid + 2 parents** (covers the typical single-family-with-spouse case)

### Paid — **$4.99 / month**
- Unlimited photos (soft cap at 500/mo, friendly note above that)
- **2 GB cap** (covers 4–5 years of daily logging for one kid)
- Unlimited history
- Unlimited parents + helpers + 1 kid

### Sibling add-on — **+$2 / month**
- 2nd kid profile in the same family account

**Rationale:** Tier on *retention + concurrency*, not storage — storage is cheap at this scale. The 90-day archive is the pinch point that forces the parent to decide if they're investing or playing. Once paying, storage feels effectively unlimited.

---

## Recommended next steps (priority order)

1. **🔴 Critical batch** — branches:
   - `fix/redemption-actor` — add `approved_by` column + stamp it
   - `fix/decide-audit-trail` — route `decide()` through `updateCompletion`
   - `fix/gift-soft-delete` — soft-delete + audit on `removeGift`
   - `fix/storage-content-hash` — switch path keying to SHA-256
   - `fix/storage-cascade-delete` — wire `remove*` to `storage.remove`
2. **🟡 Important batch** — actor-and-audit sweep across songs, books, gifts (`updateGift`), and the song-play-request decision path.
3. **📏 Size accounting** — small RPC that sums storage per family, exposed in More → Privacy & Safety so a family can see "350 MB / 250 MB used → upgrade".
4. **🎯 Tier scaffolding** — `family_tier` column (`free` / `paid` / `sibling`), plumbed to a single `quotaOf(family)` helper. Soft enforcement at first (warning toast); hard caps after launch.

Each fix is small and isolated. None of them require touching the existing UI translations work that's already shipped.
