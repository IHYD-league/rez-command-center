# Reznor Command Center — Daily Adventure Board

> Vision doc for the optional "Game Board Mode" — a board-game adventure map
> *skin* over the existing daily task system. Keep in the repo
> (`/docs/BOARD-GAME.md`). Claude Code should read this AND
> `/docs/ARCHITECTURE.md` before building any board feature, especially
> anything that looks like it might want to store task/star/streak state.
> If those two ever disagree, ARCHITECTURE.md wins.

## North star
Reznor opens the app on a tired Tuesday afternoon, taps **Game Board**, and
sees an illustrated map — Candyland or Mario Party feel — with his character
token sitting on a glowing square. There's a treasure at the end of the path.
Some squares are lit, some are locked, some have already been crossed. He's
not looking at a checklist. He's playing a game. The chores haven't gone
anywhere; they're just dressed up.

## What this is — and what it isn't
- **Is:** a *display layer* over today's task list. Visual progression,
  character movement, celebrations, a treasure goal.
- **Is:** optional and per-profile. Reznor can have it on; Mike can ignore it.
- **Is:** parent-controlled. Mom and Dad pick the theme, the treasure,
  whether the board is on at all, and how many missions count toward
  treasure.
- **Isn't:** a second task system. It does not own a task list. It does not
  own stars. It does not own streaks. It does not own approvals. It reads
  those from Supabase like every other view.
- **Isn't:** a replacement for the checklist / Mission Control / Easy Mode.
  Those keep running unchanged for the people who use them.

---

## The One Rule (read ARCHITECTURE.md §1, §2, §4)

**The board reads. The task system writes.**

- **Spaces on the board ARE today's tasks.** They aren't a parallel list and
  they aren't copies. The board takes `todaysTasks` from the existing
  derivation and lays it out visually.
- **Space state comes from real completion status.** It doesn't store
  "Drums is done" — it asks `compByTask['t_drums']?.status` and reflects
  whatever's there.
- **Stars, streaks, approvals all use the existing functions.** Tapping a
  board space submits via `submitTask`. Approving from the board calls
  `decide('approve')`. Streak bumps via `bumpStreak`. No new code path
  exists for these operations.
- **New tables exist only for board-specific state that has no other home.**
  See [Data model](#data-model) below.
- **If the board ever shows a different number than the checklist, that's a
  bug.** It means something forked the source of truth.

When in doubt: if removing the board entirely should leave the canonical data
unchanged, the rule is satisfied. If it wouldn't, you're forking truth.

---

## Space states
Each board space wraps exactly one task. Its visual state is *derived* —
not stored — from canonical data:

| State | Visual cue | Derived from |
|---|---|---|
| **locked** | dim, padlock, unreachable | upstream space is not yet `completed` (or `pending`) — drives a sequenced path |
| **available** | full color, "next" arrow, tappable | upstream space `completed` (or `pending`) AND this one has no `compByTask` entry today |
| **current** | character token is on it, larger, glow | first non-`completed` space along the path |
| **pending** | amber border, "⏳ waiting" badge | `compByTask[id]?.status === "pending"` |
| **completed** | green check, dim glow, token has crossed it | `compByTask[id]?.status === "approved"` |
| **needs-fix** | red border, "↺ try again" badge | `compByTask[id]?.status === "needs_fix"` |
| **reward** | gift box / chest icon, mid-path bonus | configured by parent; cleared via existing redemption flow if claimed |
| **treasure** | glowing chest at end of path | unlocked when **N** required missions completed (parent-set threshold) — see [Treasure mechanics](#treasure-mechanics) |

Sequencing — whether the path is strictly linear ("you must finish #3 before #4
lights up") or loose ("any required task lights up first") — is a per-theme /
per-parent config toggle. Phase 1 default: required tasks are sequenced; extras
unlock the moment available, no upstream gate.

---

## Themes
A theme is **art set + atmosphere + treasure object**, nothing functional.
Themes don't change which tasks exist, what they're worth, or which spaces
unlock.

Initial roster (Phase 3 ships all of them; Phase 1 ships one):

| Theme | Treasure object | Vibe |
|---|---|---|
| **Space Quest** 🚀 | rocket / planet | starfield, asteroid belt, alien checkpoints — *Phase 1 default*, matches Reznor's rocket emoji |
| **Water World** 🌊 | sunken chest | coral reefs, submarine, swimming-fish ambient |
| **Volcano Peaks** 🌋 | dragon's hoard | lava streams, stone bridges, rumble FX |
| **Sky City** ☁️ | flying palace | clouds, balloons, dirigibles |
| **Candy Concert** 🍭 | giant cupcake | sugar paths, peppermint trees, lollipop NPCs |
| **Enchanted Forest** 🍄 | hidden grove | mushrooms, fireflies, talking trees |

Each theme defines: background image (Phase 4) / background gradient (Phase 1),
space icon family (planets / shells / lava-rocks / clouds / candies /
mushrooms), token character mapping (rocket / submarine / dragon / balloon /
gingerbread / fairy), color palette, and the treasure object at the end.

---

## Pop-ups and micro-rewards
Pop-ups are **visual flourishes fired off real events** — they're never
storage. The trigger is always a canonical change (a completion, an
approval, a streak bump, a redemption); the pop-up is just the celebration
of it.

Examples (configurable copy — parents can override the strings):

- **`+10 ⭐ banked!`** — fires on `decide('approve')` (or auto-approve)
- **`Streak +1 → 311 days 🥁`** — fires when `bumpStreak` actually increments
- **`Badge unlocked: Drumming Knight`** — fires when a derived milestone is
  newly crossed (Phase 2: lazy-computed at render; we don't store a "has
  badge" flag — see ARCHITECTURE §3)
- **`Wild card! +5 ⭐`** — fires on `giftStars`
- **`Treasure unlocked! 🏰`** — fires when the treasure threshold is crossed

Parents can configure **real-life rewards** that attach to milestones:
extra screen time, dessert, pick-the-movie, a small treat, etc. These are
just strings + tier metadata in the existing `rewards` table; the board
reads them, doesn't duplicate them.

---

## Treasure mechanics
The treasure is **not automatic**. You don't get the chest just by reaching
the end of the path on a Tuesday.

Parents set:
- A **threshold** — `N` of `M` required missions must be completed today
  (e.g. "4 of 5 required tasks").
- A **treasure reward** — a string ("Movie night!") plus an optional
  star cost or redemption that hooks into the existing `redemptions`
  flow when claimed.
- An **honor mode** for whether bonus / extra-credit tasks contribute,
  or just required ones (default: just required, so chores can't be
  skipped).

Until the threshold is met, the treasure shows as a **closed/dim** chest
even if Reznor has visually moved his token past it. Once the threshold
is met, it **glows and is tappable** — tapping fires the existing
`requestReward` / `redemptions` path. Awarding the treasure is a parent
approval just like any other redemption.

This keeps the loop honest: the board can't shortcut the real workflow.

---

## Mobile-first principles
- **Touch targets ≥ 44pt.** Spaces are large, generously spaced.
- **Character is always visible.** Path scrolls/centers on the token; the
  treasure is one swipe away.
- **Animations are fast (< 600ms) and skippable.** A 6-year-old taps the
  next thing as soon as the last animation starts; queue them, don't
  block input.
- **No double-confirm dialogs in normal flow.** A pending submission is
  one tap. Undo lives elsewhere (the existing red unmark button).
- **Falls back gracefully.** If the user resizes their browser or rotates
  device, the board reflows. If the board is disabled, that route just
  doesn't render — nothing else changes.

---

## Data model
New tables exist **only** for state the board owns that has no home elsewhere.

### Owned by the board (new tables, board-only)
- **`board_config`** (one row per family) — current theme id, threshold for
  treasure unlock, treasure reward string + optional `reward_id`,
  sequencing mode (strict | loose), enabled / disabled.
- **`board_state`** (one row per family per profile) — current token
  position (just the space index or path-position so animations resume
  on reload), last theme change timestamp, treasure-claimed flag for
  today (so we don't re-pop the same celebration on hard-reload).
- **`board_pop_log`** (optional, one row per fired pop-up) — only if we
  want a history of which celebrations actually showed. Could also stay
  client-side. Skip in Phase 1; revisit only if we want analytics.

### Read-only, NEVER duplicated
- Task list: `tasks` + `todaysTasks` derivation
- Completion status: `completions` / `compByTask`
- Stars / star bank: derived from `completions` + `gifted_stars` + `redemptions`
- Streaks: `streaks`
- Approvals: `decide()`
- Rewards: `rewards`, `redemptions`

If a board feature seems to need its own copy of one of these, stop and
re-read [The One Rule](#the-one-rule-read-architecturemd-1-2-4).

---

## Status legend
Reusing the same emoji conventions as ROADMAP.md so the eye flows.

- ✅ Done & persisting
- 🔧 In progress
- ⏳ Planned
- 💡 Idea / needs research

---

## Phase 1 — Prove the mechanic ⏳
*Smallest possible thing that gets Reznor onto a board and proves the
read-only layer.*

- ⏳ One theme: **Space Quest** (matches his existing rocket emoji + the
  KidGameHome hero card; lowest art cost).
- ⏳ ~15 spaces along a winding path, derived from today's tasks (required
  first, then extras; required tasks get the sequenced gating, extras
  unlock as available).
- ⏳ Space states render from real `compByTask` (locked / available /
  current / pending / completed / needs-fix). No clicks yet that mutate
  data; tapping a space opens the existing `TaskSheet`.
- ⏳ Character token shows current progress: positioned on the first
  not-completed required space. No animation yet — just placed.
- ⏳ CSS / emoji visuals only. No image assets. Backgrounds are gradients.
  Token is an emoji (🚀). Spaces are rounded color blocks with the
  task's activity color.
- ⏳ Treasure visible at end of path, **closed/dim**. Threshold logic
  not enforced yet — visual hook only.
- ⏳ Per-profile toggle in settings: **"Show Game Board"**. Off by default
  for parent profiles; on by default for Reznor.
- ⏳ Tablet-first layout, scales to phone. Board lives at a new
  `tab === "board"` kid route, additive — KidGameHome and KidMissions
  untouched.

**Definition of done for Phase 1** (per ARCHITECTURE §8):
1. Spaces reflect today's real `compByTask` data.
2. Tapping a space opens `TaskSheet`; submit goes through `submitTask`.
3. Page persists across hard reload (state derives from canonical data).
4. Cross-device: Krissie opens app, sees the same board.
5. Disabling the board removes the route cleanly; nothing else breaks.

---

## Phase 2 — Movement + pop-ups ⏳
*Make the board feel alive. Celebrations get tied to canonical changes.*

- ⏳ Token animates between spaces when `compByTask` transitions
  (approved → next available space). Pure CSS keyframes; same style
  as the existing `MissionCelebration` confetti.
- ⏳ Pop-ups fire off the existing canonical-change signals:
  star-tick → "+N ⭐", `bumpStreak` → "Streak +1", milestone crossed
  → badge unlock copy.
- ⏳ Pop-ups queued (rAF-driven). A burst of three completions in a
  row shows three pop-ups in sequence, not three on top of each other.
- ⏳ "Pending → approved" transition animates the token through the
  pending space on approval (so Reznor sees the catch-up on next load
  after Mike approves overnight).
- ⏳ Persisted state added: `board_state.token_position`, `treasure_claimed_today`.
  Both are board-owned, never canonical — they only describe *what
  was last animated*, not *what's actually true*.
- ⏳ Migration: `supabase migration new add_board_state` →
  `board_state` table + RLS via the standard family-scoped CRUD policy
  pattern that every other table uses.

---

## Phase 3 — Themes + parent controls ⏳
*Width. All themes, with the parent UI to manage them.*

- ⏳ All six themes shipped with their CSS-level art (gradients, emoji
  icon families, token character mapping, palette).
- ⏳ Parent settings panel in MoreParent:
    - ⏳ Choose theme (per Reznor's profile)
    - ⏳ "Surprise me" — randomize theme on a schedule (daily / weekly)
    - ⏳ Set treasure reward (string + optional star cost)
    - ⏳ Set required-mission threshold (1–N, default = "all required")
    - ⏳ Toggle "extras count toward treasure" (honor mode)
    - ⏳ Set board sequencing mode (strict / loose)
    - ⏳ Reset today's board state
    - ⏳ Enable / disable board entirely
- ⏳ Migration: `add_board_config` table (one row per family) + RLS.
- ⏳ Theme switching at midnight is animated (the old map fades, the
  new one paints in). Reznor wakes up in a new world.

---

## Phase 4 — Painted art assets ⏳
*Replace the CSS / emoji placeholders with illustrated map art.*

- ⏳ Per-theme background image (full board layout, the path baked in).
- ⏳ Per-theme space icons (rendered art).
- ⏳ Per-theme token characters.
- ⏳ Treasure object art.
- ⏳ Image files supplied as static assets in `docs/board/themes/<name>/`
  (Mike commits the art when ready).
- ⏳ Phase 1–3 layout / coordinate math built on a normalized grid so the
  painted art drops in without re-doing geometry.

---

## Open questions (resolve as we go)
- 💡 How many spaces by default — fixed 15, or task-count-driven (one per
  task + a couple of bonus spaces)? Lean: task-count-driven, capped at 20.
- 💡 Mid-path reward spaces — are they tied to specific tasks ("after
  drums you get a Wild Card") or random? Lean: random Phase 2, parent-
  configurable Phase 3.
- 💡 Per-kid boards if there's ever a sibling — `board_state` is already
  per-profile so it should "just work", but the threshold/config might
  want to be per-kid too. Confirm before assuming.
- 💡 Real-life-reward configurations: where does the parent edit them?
  Lean: reuse the existing rewards manager and tag certain rewards as
  "treasure-eligible".

---

## Working principles (for whoever builds this)
- **Read-only first.** Every Phase 1 surface starts as a pure read. Only
  add a write when it's the canonical write (`submitTask`, `decide`,
  `bumpStreak`, etc.), which is already implemented.
- **One phase at a time.** Don't smuggle Phase 2 animations into the
  Phase 1 PR. Test-and-commit per phase.
- **Persistence per ARCHITECTURE §8.** Each phase ships only when:
  reads/writes the canonical Supabase data, persists across hard reload,
  works on a second device, doesn't break the other role views,
  ROADMAP updated.
- **The checklist still works the whole time.** At any point, disabling
  the board returns the kid to KidGameHome / KidMissions exactly as
  they were before.
- **Never store derived truth.** Treasure-claimed-today is OK
  (animation state). "Has badge" is NOT OK (compute from streak).
