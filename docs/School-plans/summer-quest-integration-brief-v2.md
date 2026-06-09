# Summer Quest — Integration Brief v2 (supersedes v1)

**For:** the Claude Code agent on the Reznor Command Center / Little Legends Treasures repo (`IHYD-league/rez-command-center`)
**Stack:** Vite + React 18 + Supabase + Netlify
**Status:** the kid arm (`SummerQuest.jsx`) is already merged. This v2 adds the parent arm (`ParentCompanion.jsx`) and makes both share one source of truth.

---

## What we're shipping

Summer Quest is a 7-week homeschool-summer feature with **two arms that share the same progress:**

- **Kid arm — `SummerQuest.jsx` (already merged).** A treasure-map tracker: 7 weeks, 4 daily quests each (Make & Build, Lego Math, Coding, Reading), gems → week-conquered → Legend, a Home/Road mode toggle, celebrations.
- **Parent arm — `ParentCompanion.jsx` (new, "Coach Mode").** A teacher cheat-sheet for each quest: *Skill*, *Set it up*, a **3-level Challenge dial** (up the hard) + a **Make-it-Fun toggle** (up the fun), a big "Say this" prompt, *Look for*, and a "mark done" button. Math quests use **live generators** that produce fresh exact numbers at the chosen level with the answer shown to the parent. It opens to Reznor's current week and reflects what he's done.

---

## The single source of truth (the point of v2)

1. **Runtime state** = one Supabase row per profile: `summer_quest_progress { mode, done }`. **Both arms read and write it.** Check a quest off in Coach Mode → it shows done in the kid app; flip Home/Road in either → both flip.
2. **Static curriculum** = `WEEKS` + `THREADS`, currently duplicated in both files (marked `// SHARED`). Lift them into one module both import.
3. **Parent-only content** = the `GUIDE` object + `MATH` generators in `ParentCompanion.jsx`. Can move to its own module; not shared with the kid arm.

---

## Recon first (do NOT assume — investigate, report, then HOLD for approval)

1. How profiles work and how the **active profile (Reznor)** is obtained in component context; how parents switch into a kid profile (no separate kid login).
2. How kid screens are **routed/reached** (e.g., `KidGameHome.jsx`) — match for the kid arm's entry; and how **parent-only UI is gated** — match for Coach Mode's entry.
3. The **RLS pattern used by existing per-profile tables** (streaks/activities) and the existing **`is_parent()` SECURITY DEFINER** function — the new table must mirror that pattern, not invent a new one.
4. Confirm `SummerQuest.jsx` currently self-persists via a `window.storage` fallback (it does) — in-app we drive it by props instead; the fallback stays only for standalone preview.

---

## Ordered plan (one concern per brick · branch per brick · HOLD for approval before each merge)

### Brick 1 — Shared curriculum module
- Create `src/summerQuest/data.js` exporting `WEEKS` and `THREADS`.
- Edit `SummerQuest.jsx` to import them and delete its inline copies. **Touch nothing else.**
- `@babel/parser` check; Netlify preview shows the kid app unchanged.

### Brick 2 — Supabase progress table (CLI migration only — no raw copy-paste SQL)
- `supabase migration new summer_quest_progress`
- Table (verify the `profiles` PK column name during recon):
  ```sql
  create table public.summer_quest_progress (
    profile_id uuid primary key references public.profiles(id) on delete cascade,
    mode text not null default 'home',
    done jsonb not null default '{}'::jsonb,
    updated_at timestamptz not null default now()
  );
  alter table public.summer_quest_progress enable row level security;
  ```
- **RLS: mirror the existing per-profile pattern**, gating parent writes through `is_parent()`. **Do not write a recursive policy against `profiles`** (that caused the infinite-recursion bug before — use the `is_parent()` helper).
- `supabase db push`. Verify other tables' RLS doesn't regress.

### Brick 3 — Progress hook + wire the kid arm
- Add `useSummerQuestProgress(profileId)`: loads the row → `{ mode, done }`, and exposes `save({ mode, done })` (upsert on `profile_id`, debounce optional).
- Pass `initialMode` / `initialDone` / `onSave` into `<SummerQuest>`. In-app the props drive it; the `window.storage` fallback only matters for the standalone preview.
- Preview: kid app behaves identically, now persisting to Supabase; survives reload + profile switch.

### Brick 4 — Add Coach Mode
- Add `ParentCompanion.jsx` (place per convention, e.g. `src/summerQuest/`). Import `WEEKS`/`THREADS` from `data.js` and delete its inline `// SHARED` copies. Keep `GUIDE`/`MATH` (optionally move to `src/summerQuest/parentGuide.js`).
- Add a **"Coach Mode" entry on the parent dashboard**, gated to parent profiles (match existing parent-only gating).
- Wire it with the **same** `useSummerQuestProgress(reznorProfileId)` → pass `mode` / `done` / `onSave`. Both arms now share the row.
- Preview: marking a quest done in Coach Mode reflects in the kid app and vice versa; Home/Road flips both.

### Brick 5 — (optional, later — flag only, NOT now)
- Route quest completion through the existing **pending → parent-approve** flow and/or feed completions into the **streak** system, instead of direct self-marking.

---

## Acceptance criteria
- Kid app behaves exactly as before, now backed by Supabase (survives reload + profile switch).
- Coach Mode opens to Reznor's current week; **mark-done and Home/Road sync both ways** between the two arms.
- Challenge L1–L3 and Make-it-Fun both work; math "New numbers" produces fresh values with parent-only answers.
- RLS: a kid profile can't read another profile's row; parents can; no recursion regressions.
- No unrelated screens touched; clean Netlify preview on each brick.

## Guardrails (standing)
- Branch per brick off `origin/main`, fetch-first.
- Stage by **exact path**; never `git add -A`.
- `@babel/parser` validate any `.jsx` before preview.
- **Rendered Netlify preview before merge** — not assumptions.
- One concern per commit; touch nothing outside the brick.
- **HOLD for explicit "approved, merge"** on every brick.
