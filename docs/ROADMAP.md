# Reznor Command Center — Roadmap & Vision

> Living planning doc. Keep this in the repo (e.g. `/docs/ROADMAP.md`) so the
> vision is version-controlled alongside the code. Update as things ship.

## North Star
A private family app that makes Reznor *want* to open it, and makes parents able
to manage everything quickly. It tracks real skill development (drumming,
languages, reading, physical, creative) and rewards consistency. Built modular
so new features never break what already works.

## The One Rule (read ARCHITECTURE.md)
**One source of truth.** All data lives in Supabase. Every screen — normal or
game mode — READS the same data and uses the SAME functions to submit, approve,
and award. No screen calculates stars/streaks/XP independently. Game mode is a
skin, not a second app.

---

## Status legend
- ✅ Done & persisting
- 🔧 In progress
- ⏳ Planned
- 💡 Idea / needs research

---

## Phase 0 — Core (DONE)
- ✅ Real login (Supabase Auth) for parents
- ✅ Data persists to Supabase (tasks, completions, stars, streaks, rewards,
  redemptions, reward requests, gifted stars, books, awards, profiles)
- ✅ Submit task → pending/approved → stars awarded
- ✅ Streak logic with real date; drums at 310, advances correctly
- ✅ Parent approve / reject / undo
- ✅ Kid game-mode home screen (KidGameHome) wired to real data
- ✅ RLS security on all tables; private photo bucket exists

## Phase 1 — Daily-use gaps (CURRENT FOCUS)
- 🔧 Profile photos for all users (upload to bucket, persist, cross-device)
- ✅ Parent can mark tasks complete on Reznor's behalf — from EVERY view
  including the kid game screen. Quest tiles in KidGameHome are tappable
  and open the same TaskSheet; the green ✓ on ParentToday's "Still to
  do" rows opens it too. The completion always credits Reznor
  (`completedBy` = the kid), while `submittedBy` records the actually
  signed-in person. Parents auto-approve their own submissions (stars
  + streak fire immediately via the existing submitTask path); helpers
  and Reznor still go through the existing pending → decide flow.
- ✅ Parent/helper can upload proof photos (e.g. texted to them).
  Helper uploads were live via HelperChecklist/EasyChecklist onPhoto;
  parent uploads now ride the same TaskSheet path with the same
  uploadFamilyPhoto helper writing to family-photos/&lt;family_id&gt;/proof/
- ⏳ Helper/grandparent logins (Sara, Evie) — create auth users + link profiles
- ⏳ Task proof photos persist (not blob URLs)
- ⏳ Award/accomplishment files persist
- ✅ Persist: calendar events, handoff notes, task priorities, summer/school
  mode, per-task notes, TKD schedule, drum subtask checkboxes mid-progress.
  All Phase-1 in-memory state is now persistent. Calendar events and handoff
  notes use dedicated tables; everything else rides the `family_settings`
  jsonb via a small `familySetting(key, fallback)` helper that takes the
  pattern from one-off per-key boilerplate to one line per persisted prefs
  key. Future cousins drop in by adding another familySetting call.

## Phase 2 — Game Mode skin (toggle, additive)
Game mode = optional skin for kid AND parent. Same data, prettier display.
Build in buckets so it stays safe:

**Daily Adventure Board** — board-game adventure-map skin over the existing
task system (Candyland / Mario Party feel; character token, treasure at the
end). Full vision + phases + space states + themes + treasure mechanics +
data model live in [`BOARD-GAME.md`](./BOARD-GAME.md). Builds in 4 phases
inside this Phase 2 bucket; don't smuggle later phases into earlier PRs.

- ✅ **Phase 1 — Prove the mechanic.** Space Quest theme (starfield + emoji
  spaces, no images yet). Kid bottom-nav gains a Board tab; route renders
  today's tasks as ~15 spaces on a snake-pattern board. State per space
  (locked/available/current/pending/completed/needs-fix) is derived inline
  from `compByTask` + the task's `required` flag; no storage. Tap a space →
  opens the existing TaskSheet → submit goes through `submitTask`. Token
  (🚀) sits on the current space. Treasure visible at the end, always dim
  (threshold lands in Phase 3). Parent/grandma/helper routes untouched.
- ✅ **Phase 2 — Movement + pop-ups.** Layout flipped from grid to a
  CONNECTED WINDING PATH: an SVG trail goes from a START marker, snakes
  through the spaces, ends at the TREASURE. The rocket token now animates
  along the path (`getPointAtLength`) when canonical compByTask says a
  new space has been cleared — smooth easeOutCubic, ≤900ms. Two
  board-flavored celebration pop-ups (confetti + rising star): a
  "+N ⭐ · &lt;task title&gt;" on each space landing; a bigger
  "TREASURE! 🏆" on reaching the final space (once per day, gated by
  `treasure_claimed_on`). First migration shipped via the CLI:
  `supabase/migrations/20260607202306_add_board_state.sql` adds
  `board_state(family_id, profile_id, last_position, treasure_claimed_on)`
  with RLS via the standard `family_id = my_family_id()` policy.
  `board_state` only remembers WHERE the token was last drawn so we can
  animate the diff; it never stores task / star / streak truth. If you
  `delete from board_state` the rest of the app keeps working.

### Bucket A — skin existing data (low risk, do first)
- ⏳ Kid: adventure home, missions (=tasks), star bank, streak hero card,
  rewards/store, next-reward progress
- ⏳ Parent: "Mission Control" overview, approvals panel, progress insights,
  calendar mini-panel, tools & rewards
- ⏳ Game-mode toggle in settings (per user)

### Bucket B — computed-from-truth (no new storage)
- ✅ XP & levels (XP = stars × 10; triangular curve 50·n·(n-1); titles
  Spark / Sprout / Explorer / Champion / Hero / Knight / Legend / Royalty
  / Cosmic / G.O.A.T.). Hero card on KidGameHome now has a Level chip
  with an XP progress bar. ARCHITECTURE §3 — nothing stored; every value
  derives from the canonical star bank.
- ✅ Badges / titles + "almost there" pull-forward. ACHIEVEMENTS already
  existed in the KidStars trophy case; a new `nextBadgeFor(ctx)` derives
  the closest-to-threshold unearned trophy and renders it as a tappable
  card on KidGameHome above Main Quests. Tap → routes to the Stars tab
  where the full trophy case lives. No new flags ("has_badge", etc.) —
  everything is recomputed each render from the canonical streaks +
  starBank + completed-books, etc.
- ✅ "What should Reznor do next?" widget — green "Up next" card on
  KidGameHome between the hero and the Adventure Board entry. Picks the
  first un-done required quest, falls back to the first un-done extra so
  it never goes blank while there's anything to do. Single tap → opens
  the same TaskSheet a quest tile would. Shows the title, XP reward, and
  sub-part progress when relevant (e.g. "1 / 3 parts" on drums). Hidden
  once everything's done; the existing bottom CTA handles the celebration.
- ⏳ Dad Power-Up / parent engagement stats (approvals this week, etc.)

### Bucket C — new systems (each its own table, build one at a time)
- ✅ Drum song tracking (own tables: songs + song_plays; fuzzy search +
  quick-tap chips on the drums task; per-song play count and history
  derived from song_plays — no duplicate truth)
- 💡 Summer Adventure Pass (battle-pass levels, claimed rewards, season dates)
- 💡 Pet / companion (stats tied to task categories, XP, evolution)
- 💡 Daily bonus chest (unlocks when all main quests done)
- 💡 Adventure map with unlockable zones
- 💡 Rotating special daily quest (expiring bonus)

## Phase 3 — Homework / Homeschool Tracker (own module)
Different shape from daily missions: planning over time.
- 💡 Month / semester / year goals
- 💡 Book lists & reading targets (link to existing books data)
- 💡 Writing assignments & projects
- 💡 Progress toward year-end targets
- 💡 Homeschool supplement plan — **needs research** into frameworks/standards
- 💡 Own tables (goals, assignments, target dates); reads existing reading data

## Phase 4 — Polish & art
- 💡 Replace emoji/CSS placeholders with generated illustrated art (dragon,
  map, castles) as fixed image assets
- 💡 Animations, celebration moments, sound
- 💡 Multi-device write-conflict handling (currently last-writer-wins)
- 💡 Midnight rollover for "today" without reload

---

## Known quirks to revisit (not bugs, just notes)
- ✅ `earnedToday` / `pendingStars` now count today only; star bank stays
  cumulative via a separate `earnedAllTime` ledger.
- Streak bumps on parent *approve*, not kid *submit* — so drums depends on a
  parent approving daily. Consider auto-approve for drums, or bump-on-submit.
- New family-member profiles need a matching Supabase auth user before that
  person can sign in.

## Working principles
- Modular: build one feature at a time, test persistence (hard reload +
  second device) before moving on.
- Never duplicate the source of truth.
- Honesty over flashiness: ship the clean version, add art later.
- Reznor's skills first: creativity, bilingualism, emotional intelligence,
  leadership — the AI-resistant ones.
