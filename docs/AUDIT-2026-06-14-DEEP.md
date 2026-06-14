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

## 3. UX consistency vs memory rules

### Holding up everywhere (0 violations)
- `capture="environment"` ban — 0 hits across 17 file inputs in `src/`
- i18n `.replace("{X}", …)` — 0 hits; 74 sites correctly use `.replaceAll`
- Bare `Map` / `Image` in App.jsx — 0 unaliased JSX uses; all `new Map()` are intentional
- Conditional column spreads in `toDb` mappers — 0 hits of `...(o.` in `src/data/transform.js`
- Status vocab vs DB constraint — `transform.js:397` normalizes `denied` → `declined` for `reward_requests`; DreamPlan renders both as the same "Not this time" pill so legacy rows stay readable
- Cover vs proof photo separation — `customCoverPath` cleanly separated from `completion.proof[]`; "Also use as cover" checkbox at `App.jsx:5513` writes the file path to both
- Uploads auto-save a draft — `App.jsx:5441` (`handleFile` calls `persistDraft(nextPhotos)`) and `:5455` (`removePhotoAt` also calls `persistDraft`)

### 🔴 Active violations

| Rule | File:Line | Evidence |
|---|---|---|
| No dev placeholder copy | `src/App.jsx:373` | `note: "Taking a break for now"` + `time: "TBD"` — Basketball activity row, rendered in the activities list |
| No dev placeholder copy | `src/App.jsx:9560` | `…(TODO real-build: cloud storage so files & photos live beyond this session and sync across devices.)` — rendered to a `<div>` in Activities |
| No dev placeholder copy | `src/App.jsx:10993` | `<p>Lightweight for now — expand into real standards later.</p>` — visible JSX |
| No dev placeholder copy | `src/App.jsx:10995` | `<div>TODO: grade-band standards, evidence uploads per goal.</div>` — visible JSX |
| No dev placeholder copy | `src/App.jsx:11681` | `…Iteration 2 wires the submit sheet + stats hero to this schema. For now it's set as metadata.` — visible string under the priority editor |
| Don't shadow `t` helper | `src/PhotoGallery.jsx:372` | `const t = (tasks \|\| []).find((x) => x.id === c.taskId);` — module-level `t = (k,fb) => tOf(...)` is at line 6. No `t("…")` call inside this scope today, but the shadow exists (latent — one new i18n call away from the "C is not a function" crash) |
| **Kids never delete** | `src/App.jsx:5078–5089` (DreamPlan) | Kid "Got it!" button fires `removeRewardRequest(w.id)` for an approved wish row. Comment self-justifies as non-destructive — but a kid is firing a DB row removal. Per the strict rule, route via Approvals queue or parent-only. |

### 🟡 Drift to watch
- `KidGameHome.jsx:151, 372, 500` — three `const t = setTimeout(...)` / `const t = Math.min(...)` shadows inside short useEffect closures with no `t("…")` calls *yet*. No active bug, but every one is a future trap.
- `App.jsx:5450` `removePhotoAt` — TaskSheet receives `role` but `removePhotoAt` runs regardless. Removing a draft photo isn't auditable data loss, but the surface is kid-reachable; either gate to parent or convert to a request when `role === "kid"`.
- `App.jsx:40-44` header comment — `REZNOR COMMAND CENTER — MVP PROTOTYPE` / `TODO(real-build)` not user-visible but worth refreshing before multi-family.

### 🛠 Lint candidates (ordered by ROI)
1. `capture="environment"` ban — `! grep -rnE 'capture\s*=\s*"environment"' src/` — zero false positives.
2. i18n placeholder must use `.replaceAll` — `! grep -rnE '\.replace\("\{' src/` — zero false positives.
3. No placeholder copy in JSX — coarser regex but would have caught all 5 active violations.
4. **Bonus:** ESLint custom rule for files with `const t = (k, fb) => tOf` that flags any subsequent `const t =` / `let t =` declaration. Would catch the PhotoGallery shadow + the three KidGameHome latent shadows automatically.

---

## 4. Code health + maintainability

### Holding up
- **Lib layer is well-shaped.** `src/lib/{sheet,toast,lightbox,giftEditor,juice,starBurst,levelUp}.js` are tight subscribe-pattern singletons. `i18n.js`, `statTemplates.js`, `storage.js`, `libraryOrder.js`, `albumCover.js`, `dataAudit.js` are decoupled and reused by leaf screens.
- **Sub-screens are already modularized.** `BoardGame.jsx`, `MusicLibrary.jsx`, `Insights.jsx`, `PhotoGallery.jsx`, `KidGameHome.jsx`, `MilestoneSlideshow.jsx`, `CustomizationHub.jsx`, `DataExport.jsx` are clean leaves with no circular refs.
- **Migrations mostly idempotent.** 26/30 use `if (not) exists` / `drop policy if exists`. Re-running is safe.
- **Effect cleanup balances.** Every `addEventListener` in App.jsx pairs with `removeEventListener`; every `setTimeout` in effects clears. No obvious leaks.

### 🟡 Erosion in progress (ranked by pain)
1. **`src/App.jsx` is 11,994 lines, 100 top-level components, 214 `useState` calls** — 47% of the entire source tree.
2. **Inline `byId` map building duplicated ≥5 times** — `App.jsx:4671, 5887, 6229, 6699, 6903` all build `Object.fromEntries(list.map((x) => [x.id, x]))`. Plus 99 linear `.find((x) => x.id === id)` calls in App.jsx alone.
3. **9 inline `toLocaleDateString("en-US")` sites bypass the existing `fmtShort` / `fmtDate` / `fmtDateObj` helpers** — `App.jsx:3839, 4032, 4819, 6143, 8379, 9802, 9811, 10786, 11122`. Ignores i18n lang prefs the rest of the app respects.
4. **Stale prototype banner** at `App.jsx:40-44`.
5. **Painted-asset placeholder comments** at `App.jsx:2999, 3024, 3071, 3127` reference `/public/art/login-bg.png`, `/art/profile-frame.png` — `public/art/` doesn't exist. Ship or remove.
6. **Dead lucide imports** — `Crown` and `Sun` imported at `App.jsx:5` but `<Crown` / `<Sun` appear zero times in JSX. Bundle tree-shakes them but they're import noise.

### 🔴 Active hazards
- **Zero tests.** No `.test.*`, no `.spec.*`, no `vitest.config`. The "PostgREST batch column normalization" + "match status vocab to DB constraint" + "i18n placeholders need replaceAll" memory items are all bugs that bit production once. Each is a unit-testable pure function.
- **Two `eslint-disable react-hooks/exhaustive-deps` escape hatches** — `App.jsx:1718`. Correct here but worth a `// reason:` comment.

### 🛠 Top 5 refactors that would pay (ROI ranked)

| # | Branch | Scope | Approx LOC out of App.jsx |
|---|---|---|---|
| 1 | `refactor/extract-parent-screens` | Move `CalendarView` (8241-8395), `ReadingLibrary` + `BookGridTile` + `BookShelfTile` + `BookRow` + `BookEditPanel` + `AddBookForm` + `AddBacklogBookForm` (8513-9473), `Accomplishments` + `AddAwardForm` (9522-9608), and `People` + `PendingRequestRow` + `AccessEditor` + `EmailEditor` + `AddPersonForm` (11001-11330) into `src/parent/*.jsx`. Each is a leaf — props in, callbacks out, no shared-state surgery. | ~2,200 |
| 2 | `refactor/extract-completion-detail-sheet` | `CompletionDetailSheet` (4404-4901) + `CompletionPhotoTile` + `PhotoThumbnail` + `formatHistoryValue` + `StatRow` → `src/sheets/CompletionDetailSheet.jsx`. Already uses `useBottomSheet`. | ~500 |
| 3 | `refactor/extract-task-management` | `ManageActivities` (11332-11513) + `ManageTasks` (11515-11733) → `src/parent/Manage.jsx`. | ~400 |
| 4 | `feat/byid-and-format-helpers` | `src/lib/collections.js` with `byId(list)`; `src/lib/formatDate.js` with `fmtRelative/fmtFull/fmtTime(at, langs)`. Replace 5 inline `byId` sites + 9 inline `toLocaleDateString` sites. | ~200 consolidated |
| 5 | `chore/strip-dev-placeholder-copy` | Delete the prototype header comment (40-45); rewrite the two user-visible TODOs (9560, 10995); drop painted-asset placeholder comments (2999/3024/3071/3127); drop dead `Crown` + `Sun` imports. | ~20-min job; eliminates embarrassing strings before second-family rollout |

### 📦 Bundle take
1.18 MB raw → **329 KB gzip**, single chunk. For a parent-facing PWA on cellular that's the threshold where code-splitting starts to matter but isn't urgent. The biggest single win: **route-split `DataExport.jsx` (jszip is ~880 KB on disk and only used in one screen most parents will never open)** via `const DataExport = lazy(() => import('./DataExport.jsx'))`. Same for `MilestoneSlideshow.jsx` and `BoardGame.jsx`. Should cut the initial bundle 20-30%. lucide-react is already tree-shaken. Pair the split with the App.jsx extraction PR (refactor #1) — chunk boundaries follow module boundaries, so one rebase buys both wins.

### Test coverage = zero
Recommended first three units, ranked by past-incident value:
1. `toDb` / `toApp` in `src/data/transform.js` — column-normalization + status-vocab bugs from memory all live here.
2. `tt` / `taskTitle` / `tOf` placeholder substitution in `src/lib/i18n.js` — the `replaceAll` bug ships easily and is invisible until a second `{X}` appears.
3. `runDataAudit` in `src/lib/dataAudit.js` — pure function, fans into every audit signal, easy table-driven tests.

---

## Updated synthesis (all four axes in)

Critical-blocking finding (broken migration) still dominates priority. After that, the four axes corroborate each other on a few themes:

- **Dev placeholder copy is the single most embarrassing leak** — both UX-rules and code-health axes flagged the same 4-5 sites independently (`App.jsx:373, 9560, 10993, 10995, 11681`). One short PR removes them all and unlocks the multi-family vibe-check.
- **App.jsx monolith is *the* maintainability tax** — refactors 1-3 above pull ~3,100 lines out into clean leaves with no shared-state surgery. Best done before the multi-family bug-flood.
- **Within-family actor forgery + audit gaps** (trust axis) and **kids-never-delete violation in DreamPlan "Got it!"** (UX axis) both point at the same underlying issue: most non-`completions` mutation handlers ship without trigger-side enforcement or history. A single `chore/audit-trail-sweep` PR can address both.
- **Zero tests** is the silent multiplier — every past production incident is a unit test waiting to be written.

### Suggested launch sequence (consolidated)

1. **🚨 `fix/gifted-soft-delete-column-name`** — single-line migration fix, blocking
2. **`chore/strip-dev-placeholder-copy`** — 20-minute removal of 5 visible TODOs / "for now" / placeholder strings; corroborated by both UX-rules and code-health axes
3. **`fix/multi-family-signup-path`** — invite codes + "Create a family" branch in Login
4. **`fix/purge-seed-fallbacks`** — empty-state wizard, no Lynch ghost-writes
5. **`fix/actor-identity-trigger-scope`** — generalize the trigger to `gifted_stars`, `redemptions`, `reward_requests`, `song_plays`
6. **`fix/destructive-audit-sweep`** — `removeAward`/`removeBook`/`removeSong`/`updateUser`/etc gain history; cover/avatar replaces gain GC; DreamPlan "Got it!" routes through Approvals
7. **`refactor/extract-parent-screens` + `feat/byid-and-format-helpers`** — pull ~2,400 LOC out of App.jsx and add the two missing helper modules
8. **`feat/test-scaffolding`** — vitest config + the three highest-value test files (transform, i18n, dataAudit)

Steps 1-2 ship today. Steps 3-6 are the multi-family launch gate. Steps 7-8 are the sustainability investment that unlocks faster iteration after launch.
