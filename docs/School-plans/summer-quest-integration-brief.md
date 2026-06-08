# Summer Quest — Integration Brief

**For:** the Claude Code agent working the Reznor Command Center / Little Legends Treasures repo
**App:** Reznor Command Center (aka Little Legends Treasures) — Vite + React 18 + Supabase + Netlify, repo `IHYD-league/rez-command-center`
**Artifact to integrate:** `SummerQuest.jsx` (already built and JSX-validated)

---

## 1. What we built

A new **"Summer Quest"** arm of the app — a homeschool-summer tracker for Reznor, designed as a kid-facing mini game.

- **A 7-week journey** shown as a treasure-map trail. Each week has **4 daily quests**, one per learning thread: **Make & Build, Lego Math, Coding, Reading.**
- Reznor/Krissie **pick whatever they feel like each day** (no rigid schedule). Tapping a quest as done earns a **gem 💎**. 4 gems = **week conquered 🏆**. All 7 weeks = **Legend 👑**. Conquering a week (and finishing all 7) fires a celebration overlay with confetti.
- A global **Home / On-the-Road toggle.** "On the Road" swaps every quest for a **car-friendly version** for travel days (e.g., NorCal trips to see Xander). Every week has both a home and a car version of all 4 quests.
- **Philosophy baked into the UX:** light-touch, **no penalties for missed days**, confidence-first, "build to the end." Curriculum is based on best-in-world methods (Finland play-based, Singapore concrete→pictorial→abstract "Lego math," Estonia screen-free "unplugged" coding).

The component is **self-contained, zero-dependency** (emoji instead of an icon lib), with all styles **scoped under `.sq-root`** (prefixed class names + prefixed keyframes) so nothing leaks into or collides with the rest of the app.

---

## 2. Component contract (already written — do not rewrite)

`SummerQuest.jsx` is a default-exported React 18 component. **Persistence is lifted to the parent via props** — the component is presentational + self-stateful and just calls back on change.

```jsx
<SummerQuest
  child="Reznor"
  initialMode={progress.mode}        // "home" | "car"
  initialDone={progress.done}        // { "1": {build,math,code,read}, ... "7": {...} }
  onSave={(payload) => save(payload)} // payload = { mode, done }; fired on every change
/>
```

- **`done` shape:** an object keyed by week number `1`–`7`, each `{ build, math, code, read }` booleans.
- If no props/`onSave` are passed, it falls back to artifact storage for standalone preview only — **not used in the app**; the app must pass real props.
- **Curriculum text** lives in the `WEEKS` and `THREADS` arrays at the top of the file — edit copy there, not in the render.

---

## 3. How to add it — RECON FIRST, then HOLD

**Do not assume the existing structure. Investigate these first, report findings, and propose an integration plan. Hold for explicit approval before writing code.**

Recon checklist:
1. How profiles work and how the **current/active profile (Reznor)** is obtained in component context (the profile-switch mechanism).
2. How existing **kid-facing screens are structured and routed** (e.g., `KidGameHome.jsx`) — match that pattern for adding a Summer Quest entry/route.
3. The **Supabase schema and existing RLS patterns** — specifically confirm the existing `is_parent()` `SECURITY DEFINER` function and how other per-profile tables enforce RLS.
4. The existing **approval / streak system** (so Summer Quest can optionally feed it later — not in v1).

---

## 4. Integration steps (after the plan is approved)

1. **Place the component** in the components directory alongside the other kid screens, matching existing location and naming conventions.
2. **Add the entry point** — a nav item / route so it's reachable from Reznor's kid home, matching how `KidGameHome` is reached.
3. **Persistence via a Supabase CLI migration** (never copy-paste raw SQL):
   - `supabase migration new summer_quest_progress`
   - One row per profile, e.g. `summer_quest_progress(profile_id uuid references profiles(id), mode text default 'home', done jsonb default '{}'::jsonb, updated_at timestamptz default now())` with a unique constraint on `profile_id` for upsert.
   - **RLS:** a profile can read/write its own row; parents allowed via the existing **`is_parent()` SECURITY DEFINER** helper. **Do not write a recursive policy against `profiles`** (that caused the infinite-recursion bug before — use the helper function).
   - `supabase db push`.
4. **Wire the component:** on mount, fetch the row for Reznor's `profile_id` and pass `initialMode` / `initialDone`. `onSave={(p) => upsert(profile_id, p.mode, p.done)}` writes `{ mode, done }` back (debounce optional). Everything is keyed to Reznor's profile.
5. **(Optional, later — flag only, NOT v1):** route quest completion through the existing pending→parent-approve flow instead of self-marking, and/or feed completions into the streak/credit system. Leave as direct-mark for now.

---

## 5. Guardrails (standing discipline)

- Branch per brick off `origin/main`, fetch-first.
- Stage by **exact path**; never `git add -A`.
- Validate the `.jsx` with `@babel/parser` before preview.
- **Rendered Netlify preview before merge** — not assumptions, not ASCII.
- One concern per commit; **touch nothing outside this feature.**
- **HOLD for explicit "approved, merge."**

---

## 6. Acceptance criteria

- Summer Quest is reachable from Reznor's kid home and renders correctly on mobile.
- Tapping quests **persists to Supabase on Reznor's profile** and survives reload **and** a profile switch.
- The **Home / On-the-Road** toggle persists and swaps all quest text.
- Week-conquered (4/4) and all-7 (👑) celebrations fire correctly.
- No changes to unrelated screens; RLS does not regress; preview is clean on Netlify.
