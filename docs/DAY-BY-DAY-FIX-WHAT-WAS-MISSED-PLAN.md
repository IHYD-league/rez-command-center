# Day-by-Day Browser — Fix What Was Missed

**Author:** Mr. Black Family (planning)
**For execution:** TBD by Mike (Green's lane or Black's lane after coordination)
**Trigger:** Maryam (Xander's mom) 2026-06-17 — forgot to log a chore for Xander yesterday. The live app has no UI for a parent to backfill a missed task to a past date. Mike: "WE need to be able to go back into older days and fix what we might have forgotten to do."
**UX bar:** parent navigates to a past day in two taps, sees what was missed, taps once to log it. Streak stays alive. Stars get awarded. Kid's history shows the truth.

---

## TL;DR

Build a self-service backfill feature: a **Day-by-Day history browser** under More that lets a parent pick a past date, see what got logged vs what was missed, and one-tap "Log it now" any missed required task. The completion lands with the picked `completion_date`. The streak engine extends correctly when the backfill is consecutive with the existing chain. Identity + approval semantics mirror today's `submitTask` so the trust model doesn't bend.

**Schema: no changes.** Pure client-side feature over the existing `completions` table. The work is in `src/App.jsx`.

**There's a stale branch** (`feat/day-by-day-browser` @ `ce86053`) that built this once already. **Do NOT merge it.** It predates chapter 1 + the is_child trigger + the invite gate + the barcode work. Merging would delete all of that. Use the branch's design as reference; rebuild the feature fresh on top of current main.

---

## Current state on main (verified 2026-06-17)

| Capability | Status |
|---|---|
| `completions.completion_date` column | exists |
| `updateCompletion(id, patch, meta)` (any field, including completionDate) | exists at App.jsx:1407 |
| UI to edit `completion_date` of an existing row | **NONE** — zero `<input type="date">` wired to `updateCompletion`'s completionDate |
| UI to ADD a completion to a past date | **NONE** |
| "Past day history" / "Yesterday" / "Missed yesterday" UI copy | zero matches in src/App.jsx |
| `addCompletionForDate(taskId, dateIso, extra)` helper | **NONE** (only existed on the stale branch) |
| Streak engine's understanding of past-day completions | TODAY-only; `bumpStreak` only increments when `lastDate === YESTERDAY_ISO` |
| `submitTask` flow | hardcoded `completionDate: TODAY_ISO` at App.jsx:1308 and 1391 |

So a parent who missed logging yesterday has no live path. Today's options are: (a) mark it complete now and accept that completion_date = today (streak resets if yesterday was the keep day), or (b) Mike does a DB fix manually.

---

## What the stale branch built (reference, not adoption)

`feat/day-by-day-browser` @ `ce86053` added:

1. **`addCompletionForDate(taskId, dateIso, extra)`** — quick-log helper that strips any existing completion for that task+date and inserts a fresh approved row. Idempotent on re-tap. Naive — bypasses the identity/approval branching that today's `submitTask` enforces.
2. **`DayHistoryBrowser` component** (functional spec):
   - Date picker, default = `YESTERDAY_ISO`, plus "Yesterday" shortcut button
   - Filters all completions / books / song-plays / photos / notes by `pickedDate`
   - Computes "required for that day" from `tasks` + `taskNaDays` mode-specific rules
   - Surfaces a **Missed** section: required tasks with no completion for that day
   - One-tap **"Log it now"** on each missed row → fires `addCompletionForDate`
   - Done / pending count tiles
   - Empty-day empty state
   - Future-date disable (or display-only — design ambiguous in the branch)
3. **More-menu entry:**
   - Group: "memories"
   - Icon: `CalIcon`
   - Label: "Day-by-day history"
   - Sub-label: "Browse any past day · fix what was missed"
4. **Global search registration** with keywords `history yesterday past days log forgot missed fix correct backlog`.

The shape is sound. The gaps to fix on the rebuild:
- Identity/approval handling — must mirror `submitTask`, not bypass it
- Streak engine extension on backfill — branch was silent on this; needs explicit logic
- Audit trail — branch added rows silently with no `backfilledBy` metadata; should record the backdate as auditable

---

## Why the stale branch must NOT be merged

`git diff --stat main..origin/feat/day-by-day-browser` shows the branch DELETES:

- `docs/SHOPPING-LISTS-CHAPTER-1-PLAN.md` (chapter 1 plan)
- `src/lib/shoppingLists.js` (chapter 1 lib, 446 lines)
- `supabase/migrations/20260615230000_new_family_invite_code.sql` (invite gate)
- `supabase/migrations/20260616182700_profiles_is_child_mirrors_role.sql` (is_child trigger)
- `netlify/functions/lookup-upc.js`, `src/lib/barcodeScan.js` (barcode hybrid)
- Half a dozen public-asset PNGs
- Hundreds of lines of `src/App.jsx` (every chapter-1 / is_child / barcode change)

Merging it would destroy live features the beta cohort depends on (invite gate is the only thing stopping random signups; is_child trigger is what unblocked Maryam and Monica yesterday; chapter 1 is what just shipped). Rebuild — do not merge.

---

## Design — rebuild on top of current main

### Data model

**No schema changes.** Everything lives in the existing `completions` row shape:

- `completion_date` — set to the picked past date
- `extra.history[]` — append an audit entry on backfill: `{ at, by, summary: "backfilled", originalDate: <today's ISO>, targetDate: <picked> }`
- `status` — `approved` if the backfill came from a legitimate parent path, `pending` otherwise (mirrors `submitTask`'s `needsApproval` logic)
- All other fields populated like a normal completion

### New helper at App.jsx (next to `submitTask`)

```js
const addCompletionForDate = (taskId, dateIso, payload = {}) => {
  // Identity / approval branching IDENTICAL to submitTask — must not
  // create a back-channel that bypasses the trust model. Same
  // activeProfile / authProfile / needsApproval calculation.
  // The ONLY difference is completionDate = dateIso instead of TODAY_ISO.

  const t = tasks.find((x) => x.id === taskId);
  if (!t) return;

  const activeProfile = users.find((u) => u.id === currentUserId);
  const authProfile = users.find((u) => u.id === currentProfileId);
  const activeIsKid = activeProfile?.role === "kid";
  const activeIsParent = activeProfile?.role === "parent";
  const authIsParentOrAdmin = authProfile?.role === "parent" || !!authProfile?.isAdmin;
  const kid = users.find((u) => u.role === "kid");
  const kidId = kid?.id || currentUserId;
  const submittedBy = activeIsKid ? currentUserId : (currentProfileId || currentUserId);
  const needsApproval = !(activeIsParent && authIsParentOrAdmin);

  setCompletions((prev) => {
    // Strip any existing completion for THIS task on THIS date (the
    // picked one, not today). Today's submission stays intact if the
    // user backfills a different day.
    const others = prev.filter((c) => !(c.taskId === taskId && (c.completionDate || null) === dateIso));

    const auditEntry = {
      at: new Date().toISOString(),
      by: currentProfileId || null,
      summary: "backfilled",
      changes: [{ field: "completionDate", before: null, after: dateIso }],
    };

    return [...others, {
      id: "cmp_" + Date.now(),
      taskId,
      status: needsApproval ? "pending" : "approved",
      awardedStars: needsApproval ? 0 : t.starValue,
      pendingStars: needsApproval ? t.starValue : 0,
      completedBy: kidId,
      submittedBy,
      approvedBy: needsApproval ? null : submittedBy,
      notes: payload.notes || "",
      proof: payload.proof || [],
      extra: { ...(payload.extra || {}), backfill: { targetDate: dateIso }, history: [auditEntry] },
      completionDate: dateIso,
    }];
  });

  const aid = t.activityId || TYPE_TO_ACT[t.activityType];
  // Streak handling — see "Streak engine interaction" below.
  if (!needsApproval && aid) extendStreakForBackfilledDate(aid, dateIso);
};
```

### Streak engine interaction (the trickiest piece)

The current `bumpStreak` only handles the "today is the next consecutive day" case. Backfill needs a new helper `extendStreakForBackfilledDate(activityId, dateIso)`:

```js
// Conservative v1: only EXTEND the streak when the backfilled date is
// either (a) exactly lastDate + 1 day, or (b) > lastDate but consecutive
// with TODAY (the missed-yesterday-but-also-done-today case).
//
// Three cases to handle:
//   1. dateIso < lastDate                    → no change (backfill is
//                                              older than known chain)
//   2. dateIso === lastDate + 1 day          → extend by 1; advance
//                                              lastDate
//   3. dateIso > lastDate but NOT consecutive → DO NOT silently reset.
//      Show a confirm: "This day isn't connected to the current streak.
//      Adding it will start a new streak counter." Defer to user choice.
//
// Out of scope for v1: full recomputation of streak from completions
// history. If a parent backfills 5 days of missed practice, the streak
// won't reconstruct — they get "1-day streak today, +1 retroactive
// completion."  Full recomputation is a follow-on brick.
```

This is the load-bearing UX call. A reasonable compromise for v1:

- **Backfill of yesterday with today already logged** (the most common case — Maryam's exact scenario) → the chain becomes: 2-days-ago + yesterday + today, all consecutive → streak shows the correct count
- **Backfill of any day older than current lastDate** → don't touch the streak (the chain is already past it)
- **Backfill of yesterday when today isn't logged AND lastDate is 2-days-ago** → extend by 1 (correct case)
- **Backfill into a gap** (e.g., lastDate is 5 days ago, backfilling 3 days ago) → confirm dialog before doing anything, default cancel

### Identity + approval semantics

**Mirror `submitTask` exactly.** The same `needsApproval` calculation, same `submittedBy`, same `approvedBy`. Backfill is NOT a back-channel to bypass the trust model. If a kid backfills their own missed task, it goes pending (same as if they marked it today). If a parent on their own dashboard backfills for the kid, it auto-approves (same as today). If a helper or grandparent tries, it goes pending (same as today).

This is critical: the actor guard server-side enforces identity, but the client UI sets `status` and `approvedBy`. Drift here would let a kid auto-approve a backfilled completion that today's flow correctly gates as pending.

### Audit trail

Every backfilled row gets `extra.backfill: { targetDate }` and an `extra.history[]` entry recording who did the backfill, when (the real-world clock), and what date was targeted. Pattern matches the existing `updateCompletion` audit trail at App.jsx:1407.

**Why:** if a parent later wonders "did I actually do that yesterday or did I backfill it," the row carries the answer. Trust + memory.

### UX

**Entry point:** More → "Day-by-day history" (in the "memories" group, with CalIcon, sub-label "Browse any past day · fix what was missed").

**Page layout:**

```
┌──────────────────────────────────────────────────┐
│ ← Day-by-day history                              │
│                                                   │
│  [📅 2026-06-16  ▼]    [Yesterday]                │  ← date picker + shortcut
│                                                   │
│  ┌───────┐ ┌───────┐ ┌───────┐                    │
│  │   5   │ │   0   │ │   1   │                    │  ← tiles: done / pending / missed
│  │ done  │ │pending│ │missed │                    │
│  └───────┘ └───────┘ └───────┘                    │
│                                                   │
│  ⚠ Missed that day (1)                            │
│  ┌──────────────────────────────────────────────┐ │
│  │ 🎹  Piano                                     │ │
│  │     30 minutes practice + scales              │ │
│  │     ⭐ 3                              [Log it now] │
│  └──────────────────────────────────────────────┘ │
│                                                   │
│  ✓ Done that day (5)                              │
│  • Reading                                         │
│  • Set the table                                   │
│  • Brush teeth (night)                            │
│  • ...                                             │
│                                                   │
└──────────────────────────────────────────────────┘
```

**Tap "Log it now" → confirm sheet:**

```
┌──────────────────────────────────────────────────┐
│  Log Piano for 2026-06-16?                        │
│                                                   │
│  Xander will get 3 ⭐ for this day. If his Piano  │
│  streak's last day was 2026-06-15, this will      │
│  extend it.                                       │
│                                                   │
│         [Cancel]   [Yes, log it]                  │
└──────────────────────────────────────────────────┘
```

The streak-extension hint in the confirm copy is real-time computed from the helper above — if the date isn't consecutive, the confirm copy reads "This won't change the streak" (no surprise).

**Future date handling:** date picker max = TODAY_ISO. No future-day logging.

**Far past handling:** allow any past date back to the family's `created_at`, but show a soft "this is more than 14 days ago" caption so parents know it's a heavy revision.

### Edge cases

| Case | Behavior |
|---|---|
| Task already has a completion on that day | Don't show in Missed section. Show in Done. Tapping done row opens CompletionDetail (existing). |
| Task is marked NA for that day (`taskNaDays`) | Not in required-for-that-day set; doesn't appear in Missed. |
| Task didn't exist on that day (created later) | Excluded from required-for-that-day. Compare `task.createdAt` to picked date. |
| Family-level "required count" was different on that day | Use today's required count as the heuristic; perfect historical accuracy is a future concern. |
| Subtasks (Drums has Drumeo/Melodics/Drumscribe) | v1: "Log it now" logs the whole task with no subtask breakdown. v2: open the subtask picker. |
| Books / songs / photos for that day | Read-only display in v1. Adding past-day books/songs is a future feature. |
| Re-backfilling same task+date | Replaces the existing row (current branch behavior). v1 safe; v2 could warn first. |
| Acting-as-kid view | Tapping "Log it now" goes pending, same as today's submitTask. Parent approves later via Approvals. |
| Backfill into a streak gap | Confirm dialog with non-default Cancel; explicit user choice. |

---

## Coordination with Green

This brick **touches App.jsx**. Same shared file Green has been working in. Per `multi_agent_coordination.md`:

- The new helper `addCompletionForDate` lives near `submitTask` (App.jsx around line 1232). Different region from Green's scan-area chooser (around 13975-14060) — no overlap.
- The new `DayHistoryBrowser` component is a new function around the existing past-day components area (the Memories sub-pages in More).
- The new entry in the More menu's items array (the `{ k: "history", group: "memories", ... }` line) is in the same region as other More entries — a small surface area conflict is possible but trivial to merge.
- The global-search registration line is in the search index array — also a small line addition.

**Black goes second this time** if Green's still mid-window. The brick can be staged as:
- Phase 1: `addCompletionForDate` helper + streak-extension helper (App.jsx, away from Green's region)
- Phase 2: `DayHistoryBrowser` component + More menu entry (independent, can land later)

If Green wraps before this brick starts, the relay is simpler — one branch, two-three commits.

---

## Phasing

| Phase | Scope | Time | Ships |
|---|---|---|---|
| **2a. Helper + streak extension** | `addCompletionForDate` helper. `extendStreakForBackfilledDate` helper. Wire into shared bundle. No UI yet. Smoke-test via console or a hidden dev hook. | 2-3h | Foundation. No user-visible change. |
| **2b. DayHistoryBrowser component** | The page itself: date picker, tiles, Done/Pending/Missed sections, "Log it now" button. More-menu entry. Global-search registration. Visual preview gate (short content = empty day, long content = day with many tasks). | 4-6h | The Maryam-unblock. |
| **2c. Confirm sheet + audit refinements** | The confirm dialog showing star value + streak impact. Audit metadata polish. | 1-2h | "Easy for parents" gate. |
| **2d. Subtask picker on backfill** *(deferred)* | Drums-style tasks open subtask picker before logging. | 2-3h | Defer until a family asks. |

Phases 2a + 2b together solve Maryam's actual problem. 2c is polish. 2d is deferral.

---

## Pre-commit verification — each phase

- Branch off `origin/main` fetch-first, single-purpose commit, exact-path staging
- 2a: pure-function sanity for the streak-extension cases (node REPL against the helper)
- 2b: visual preview on iOS-Safari dimensions (390×844), SHORT content state (a day with everything done, empty Missed section) AND LONG state (a day with 5+ missed required tasks scrollable)
- 2c: visual preview of the confirm dialog
- Local Supabase stack for any data-mutating test (no prod)
- Restore `.env` to prod + stop the stack before commit
- Two-iteration limit on visual passes; third = STOP-and-restate

---

## Out of scope (named to prevent creep)

- **Edit completion_date of an existing row** — separate feature. v2 if requested. Different surface than backfill (changes data, not adds).
- **Bulk backfill** ("redo whole week missing tasks") — too risky, defer.
- **Past-day books / songs / photos add** — read-only in v1. Books has its own schema concerns (started/finished/era_label).
- **Multi-kid backfill UI** — wait for the multi-kid feature. v1 assumes one kid (matches every current beta family).
- **Streak full-history recomputation** — only do incremental extension in v1. A "rebuild streak" maintenance tool is a separate brick.
- **Photo proof at backfill time** — keep the v1 flow lightweight; parent can add proof later via CompletionDetail.
- **Server-side timestamps on backfilled rows** — `created_at` will still be NOW, `completion_date` will be the past. That's correct.
- **Notification to kid** — don't notify Xander that his mom backfilled Piano. Silent fix is the trust UX.

---

## Test scenarios (for the executor on local stack)

1. **Maryam's exact case:** Yesterday picked, Piano in Missed section, "Log it now" → row appears in completions with `completion_date = yesterday`, Xander's piano streak `last_date` advances (assuming previous lastDate was 2 days ago), no duplication.
2. **Today fully logged but yesterday missed one:** Streak extension works correctly.
3. **Empty day in the past:** All tasks show in Missed (or appropriate read of "what was required that day"); UI doesn't crash.
4. **Date with completion already present:** Tap "Log it now" doesn't fire (row not in Missed). Tap on the existing row opens CompletionDetail (existing flow).
5. **Acting as kid:** "Log it now" creates a pending completion (not auto-approved). Parent approves later.
6. **Acting as parent on own dashboard:** Auto-approved.
7. **Helper:** Goes pending.
8. **Backfill 2026-06-01 when today is 2026-06-17:** "Heavy revision" caption. Backfill works. Streak doesn't extend (gap).
9. **Future date picked:** picker disallows OR the page shows "(future)" with everything blank.
10. **Re-tap "Log it now" on a row that was just backfilled:** Should not appear in Missed anymore (it's in Done).
11. **DB inspection on local stack:** `select id, task_id, completion_date, status, extra->'backfill', extra->'history' from public.completions where task_id = 'X'` shows the audit metadata.

---

## Files this brick will touch (rebuild on current main)

| File | Change |
|---|---|
| `src/App.jsx` | New `addCompletionForDate` + `extendStreakForBackfilledDate` helpers near existing completion functions. New `DayHistoryBrowser` component in the Memories sub-page region. New More-menu entry in the items array. New global-search index entry. |
| `src/data/transform.js` | NONE (existing `completion` round-trips already carry `completion_date` and the jsonb `extra` blob) |
| `src/DataProvider.jsx` | NONE |
| `supabase/migrations/` | NONE |

Estimated diff: ~250-400 lines additive in App.jsx, no deletions.

---

## Memory references the executor should consult

- `feedback_never_lose_data.md` — the absolute floor. Backfill must NEVER overwrite an existing completion's `awarded_stars`, `approved_by`, or proof attachments. Strip-and-replace is OK for IDs not yet recorded but the existing branch's pattern destroys prior data if a row already exists on the picked date+task. Add a guard.
- `feedback_no_hidden_info_breaks_trust.md` — the streak-extension confirm copy must accurately predict what will happen. "This will extend Xander's streak to 8 days" needs to be true at submit time, not just optimistic.
- `feedback_simple_for_busy_parents.md` — one-tap "Log it now" with a single confirm. No three-step wizard.
- `feedback_kids_never_delete.md` — relevant if a kid backfills and gets pending → make sure they can't also tap to remove a parent-side approval audit.
- `feedback_useMemo_declaration_order_tdz.md` — the DayHistoryBrowser will have its own memo chain (filtered completions, required-for-day, missedRows, doneRows). Keep order consistent; nothing depends backward.
- `feedback_no_private_names_in_shared_strings.md` — example copy in the design doc uses "Xander" / "Piano" — those are placeholders. Actual UI copy must be generic ("your kid", parameterized by `kid.name`).
- `feedback_apply_migrations_yourself.md` — no migrations in this brick, but if a future v2 adds a `backfilled_at` column, that's the rule.
- `multi_agent_coordination.md` — Green is in the same App.jsx. Coordinate the window.
- `feedback_lucide_map_collision.md` — when adding the CalIcon to a new region, grep for any bare `Map` after touching imports.

---

## Why this brick before Stella's family joins / before more beta growth

- Every parent will hit this in the first week. Yesterday is a bad day to forget; "no backfill" is a credibility hit.
- The fix is fully additive — zero schema risk, zero existing-feature risk
- It also helps Mike. Lynch family will use this often.
- It pairs nicely with chapter 2 (staples) or chapter 4 (inventory) — those have schema gates; this one doesn't, so it ships fast and unblocks daily use.
