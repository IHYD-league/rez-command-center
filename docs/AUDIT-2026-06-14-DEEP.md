# Deep Audit · 2026-06-14

Four parallel axes were planned; two returned (multi-family readiness + trust & data integrity), two were interrupted (UX consistency vs memory rules + code health). This doc captures the two completed axes. The other two will be re-run on request.

The single most urgent finding lives at the top — read it first.

---

## 🚨 Critical: broken migration blocks any fresh DB

**`supabase/migrations/20260613233000_gifted_soft_delete.sql:31-33`** creates `idx_gifted_stars_active` on column `date`, but the column is named `given_on`. The migration aborts. **Any new family bootstrapped against a fresh database fails to apply the soft-delete columns and partial index**, so all the `removeGift` audit work shipped 2026-06-13 silently regresses for them.

**Fix:** rename the index target in that single migration from `date` to `given_on`. Single-line patch, but blocking.

This must land before any further multi-family work.

---

## 1. Multi-family readiness

### Working well
- Every user-data table carries `family_id` with enforced RLS via the generic loop in `supabase/schema.sql:515-532`.
- Storage bucket `family-photos` is path-scoped (`<family_id>/<kind>/<sha256>.<ext>`, `src/lib/storage.js:151`) with object-level RLS that gates the first folder segment on `my_family_id()` (`supabase/schema.sql:556-586`).
- Every `toDb` mapper stamps `family_id` so writes can't cross families even if `DataProvider.sync` had a bug.
- Every `supabase.from(...).select()` call belt-and-suspenders filters on `family_id = familyId` (`src/DataProvider.jsx:32-108`, `src/App.jsx:1374-1378`).
- Server-side RLS helpers (`is_parent()`, `my_family_id()`, `my_profile_id()`, `is_admin()`) are `SECURITY DEFINER` so policies don't recurse.
- Cascading `family_id … on delete cascade` foreign keys clean up if a family is deleted.

### 🔴 Hard blockers for second-family signup

| # | Where | What breaks |
|---|---|---|
| 1 | `supabase/schema.sql:196` + `supabase/migrations/20260608050000_pending_registrations.sql:94` `request_to_join()` | Picks the **oldest** family (`order by created_at asc limit 1`). Every new signup, from any browser, queues for the Lynch family. No way for a different family to exist via the UI. |
| 2 | `src/Login.jsx` | No "Create a family" / invite-code path. Sign-in and Register only. Success copy says "A parent will need to approve you" — meaning Mike. |
| 3 | `src/DataProvider.jsx:415-417` | Shipped failure-mode UI literally says "Run `supabase/schema.sql` … it creates the Lynch family and links you by email." |
| 4 | `src/App.jsx:584-597` + `622-623` | `initial?.users ?? SEED_USERS` etc. — when a fresh family signs in and their DB is empty, `makeSyncedSetter` (line 571) writes Reznor's `u_reznor`/`u_mike`/`u_krissie` profile IDs, 310-day drum streak, Krissie's handoff note, and the `cmp_drums_20260606` completion *into their database*. Their `profiles` table doesn't contain those IDs, so every FK breaks. |
| 5 | `src/App.jsx:760` activities state | `useState(SEED_ACTIVITIES)` — activities are never loaded from or synced to Supabase. Every family gets the Lynch catalog (Burbank Music Academy, Rose Bowl Aquatics, drums-centric streaks). |
| 6 | `src/App.jsx:433, 437` achievements | `compByTask["t_drums"]`, `streaks?.a_drums`, `streaks?.a_spa` baked in. A non-drumming family's "Drum Trifecta" and "100 Days of Drums" trophies are structurally unreachable. |
| 7 | `src/App.jsx:3089`, `:3302`, `:5002`; `src/DataExport.jsx:280`; `index.html:6,14`; `README.md` | Visible UI strings "Reznor Command Center", "Hey Reznor! 🚀", "Reznor's Star Bank", export filename `reznor-…csv`. |
| 8 | `src/App.jsx:262-266` `isMustDo` | Hardcodes "Drums" / "Spanish reading" / "English reading" as must-dos for *every* family. |
| 9 | `src/App.jsx:289-291` `DEFAULT_DAILY_CORE_IDS` | `[t_drums, t_eng, t_spa_read, t_duo, t_write, t_math, t_bed]` baked in. |
| 10 | `src/App.jsx:9560` award string | Still says "(TODO real-build: cloud storage …)" — violates memory rule `feedback_no_dev_placeholder_copy`, ships to every parent. |

### 🟡 Single-family assumptions still in code (lower risk)
- `src/App.jsx:51-57` `SEED_USERS`, `:59-64` `CHILD`, `:66-71` `CONTACTS`, `:82-104` `SEED_TASKS`, `:107-119` `SEED_REWARDS`, `:123-125` `SEED_COMPLETIONS`, `:128-134` `SEED_EVENTS`, `:150-153` `SEED_HANDOFF`, `:361-378` `SEED_ACTIVITIES`, `:561-563` `SEED_STREAKS` — all Lynch-specific seeds. Treat as defaults only when isolated to seed migrations, not as fallbacks in client code.
- `src/App.jsx:218` Pasadena fallback geo coords.
- `src/App.jsx:9997-10014` `TYPE_TO_ACT_MAP` re-hardcodes activity ids.
- `src/SummerQuest.jsx:44` `child = "Reznor"` default.
- `supabase/schema.sql:589-685` Phase-2 seed block runs on every project bootstrap; idempotent but worth gating behind an env flag.

### 🛠 Suggested branches (in order)

1. **`fix/gifted-soft-delete-column-name`** — the single-line migration fix above. Ships first; blocking.
2. **`fix/multi-family-signup-path`** — make `request_to_join` accept a `p_family_code`; add `family_invites` table (code, family_id, expires_at, single_use); split Login's signup into "Join a family (code)" vs "Start a new family"; new-family branch creates a `families` row + inviting parent profile.
3. **`fix/purge-seed-fallbacks`** — remove `|| SEED_*` fallbacks at `App.jsx:584-597, 622-623`; render an empty-state "Set up your family" wizard when `initial.profiles.length === 0`; move Lynch-specific seeds out of the client bundle.
4. **`feat/activities-to-supabase`** — `activities` table with `family_id`, RLS, toApp/toDb mapper, DataProvider load+sync; replace `useState(SEED_ACTIVITIES)` with `initial?.activities ?? []`; add a "starter activities" picker so families opt-in.
5. **`fix/kid-name-everywhere`** — replace every hardcoded "Reznor" string with a `kidName(users)` helper / `familySettings.appName`; add a pre-commit grep that fails on bare "Reznor" outside seed files.
6. **`fix/achievements-by-pillar-not-id`** — look up achievement criteria by activity pillar/tag, not literal id; suppress achievement rows whose underlying task doesn't exist for that family.

---

## 2. Trust + data integrity

### Holds up
- RLS coverage on every public user-data table, `enable + force`, with `family_id = my_family_id()` gates. `album_photos` correctly upgrades writes to `is_parent()`. No service-role bypass in the client bundle.
- Storage SHA-256 content addressing (`src/lib/storage.js:134-157`) + ref-counted GC (`src/lib/storageGc.js`) cover the proof/album/cover surfaces that ARE wired.
- `decide()` (approve completion) and `decideReward()` and `removeGift()` and `updateGift()` all stamp actor + history correctly — prior audit fixes hold.
- Actor identity trigger handles INSERT, UPDATE, upsert-replay, no-op replay, and admin override.
- Status vocabulary: `reward_requests` constraint mismatch (`denied` → `declined`) is healed at `toDb.rewardRequest`.

### 🔴 New / unfixed gaps (ranked by blast radius)

| # | Where | Impact | One-line fix |
|---|---|---|---|
| 1 | (above — broken migration) | new family signup fails silently | rename `date` → `given_on` |
| 2 | `supabase/migrations/20260609100015_add_admin_actor_guard.sql` (scope) | `gifted_stars.given_by`, `redemptions.approved_by`, `reward_requests.created_by`, `song_plays.played_by` can be forged from a stale bundle | generalize the trigger to those tables (admin override + no-op replay relaxation reused) |
| 3 | `src/App.jsx:1158` `removeAward` | hard-delete, no audit, no storage GC of `awards.file_path` | soft-delete + history + `maybeDeleteUnusedPaths([target.filePath], state)` |
| 4 | `src/App.jsx:1541-1547` `decideRewardRequest` | no actor on the request; new reward has no `created_by` | stamp `decidedBy/decidedAt` on request; add `created_by` column + stamp on reward |
| 5 | `src/PhotoGallery.jsx:459-466` `album_photos` | no remove handler at all — once added, only direct SQL removes it | `removeAlbumPhoto(id)` with soft-delete + storage GC |
| 6 | `src/App.jsx:8928, 9041, 9049, 11042, 11058` (cover/avatar replace) | old storage path orphaned on every replace | capture `oldPath` before `updateBook`/`updateUser`, call `maybeDeleteUnusedPaths([oldPath], state)` after |
| 7 | `src/App.jsx` `removeBook`, `removeSong` | hard-delete, no audit | soft-delete columns on `books`/`songs` + history pattern |
| 8 | `src/App.jsx` `removeUser`, `removeTask`, `removeReward`, `removeRewardRequest`, `removeSongPlay`, `updateBook`, `updateSong`, `updateTask`, `updateReward`, `updateUser` | all silent — no history | add `extra jsonb` + history pattern (minimum: `books`, `songs`, `tasks`, `users`) |
| 9 | `src/App.jsx:1664` `removeSong` | local `songPlays` filter, then sync layer cascades the delete to DB — play history vanishes with no audit | soft-delete the song OR archive its plays |

### 🟡 Suspicious / lower-stakes

- `stopStreak` (`src/App.jsx:1598`) drops the local entry, but `DataProvider.sync` streaks branch is upsert-only (line 282 comment: "no destructive delete"). On reload, the stopped streak returns.
- `removeCompletionPhoto` (`src/App.jsx:1240`) silently mutates `proof[]` — CompletionDetailSheet's edit-history won't show "Krissie removed the bed photo." Route through `updateCompletion`.
- `removeUser` with `on delete set null` orphans `completed_by` / `submitted_by` references — "who was that?" can't be answered after the profile row vanishes. Soft-delete preserves the link.
- `requestReward` writes `requestedBy: currentUserId` — that's the *acted-as* profile (could be the kid when a parent is acting as them). No trigger validates. Same shape as `giftStars`, `requestSongPlayChange`.
- Avatar / award uploads in TaskSheet: `removePhotoAt` drops from the local array; the just-uploaded SHA path stays in storage if the user closes the sheet without submit. Content-hash dedup makes re-add free, but orphans accumulate.
- `gifted` GC uses `giftedRaw` (including soft-deleted rows) so a soft-deleted gift's photo stays alive. **This is intentional** (audit forensics) but worth documenting — soft-deleting a gift never frees its photo.

### 🧪 Test-or-prove scenarios

1. **Fresh-DB migration runner**: drop local Supabase DB, re-run all migrations top-to-bottom. The `20260613233000_gifted_soft_delete.sql` index will fail. Confirms blocker #1.
2. **Cross-actor forge attempt**: signed in as Sara (helper, no admin), call `supabase.from("gifted_stars").insert({ family_id: <her family>, given_by: "u_mike", … })` from the browser console. Expected post-fix: rejected. Currently: succeeds.
3. **Avatar replace storage leak**: upload Avatar A, note path. Upload Avatar B. Confirm A still exists in storage with no DB reference. Same for book cover replace.
4. **Cross-family read**: create two families, sign in as B, attempt `select * from gifted_stars where family_id = <A>`. Expected: empty (RLS). Attempt insert with A's family_id. Expected: denied.
5. **Stop-streak persists across reload**: stop the drums streak, hard reload. Confirm it does *not* return (currently will).

---

## Synthesis

The two completed axes converge on the same conclusion: **the trust foundation is solid for the Lynch family, but the multi-family pivot would expose at least three classes of regression on day one** — the broken migration (blocker #1), the SEED-fallback leak into new family DBs (multi-family blocker #4), and the within-family actor forgery surface (trust gap #2).

A reasonable smallest-viable "open to one more family" sequence:

1. `fix/gifted-soft-delete-column-name` — unblocks fresh DB
2. `fix/multi-family-signup-path` — gives non-Lynch families an actual entry point
3. `fix/purge-seed-fallbacks` — empty state + onboarding wizard, no Lynch data ghost-writing into other families
4. `fix/actor-identity-trigger-scope` — generalize to the other actor-bearing tables
5. `fix/destructive-audit-sweep` — `removeAward`, `removeBook`, `removeSong`, `updateUser`, etc. all gain history; cover/avatar replaces gain GC

After that the per-family activity catalog, achievement decoupling, and kid-name everywhere become product polish rather than launch blockers.

---

## Pending — not yet audited

- **UX consistency vs memory rules** — interrupted before report. Would cover every rule in `MEMORY.md` (kids-never-delete violations, i18n `replace` vs `replaceAll`, capture attr, t-helper shadowing, etc.). Worth re-running.
- **Code health + maintainability** — interrupted. Would cover the 9000-line `App.jsx` monolith, dead code, dup patterns, stale TODOs, bundle size. Worth re-running.

Both are 5-minute relaunches if Mike wants the full picture before acting.
