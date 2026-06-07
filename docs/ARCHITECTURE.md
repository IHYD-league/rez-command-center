# Reznor Command Center — Architecture Rules

> The guardrails that keep this app from breaking as it grows. Keep in the repo
> (e.g. `/docs/ARCHITECTURE.md`). Claude Code should read this before building
> any new feature, especially game mode.

## 1. One source of truth
All real data lives in **Supabase**. There is exactly one canonical value for:
- a task's completion status
- stars (bank, earned, pending, redeemed, gifted)
- streaks (current, longest, last_date)
- rewards and redemptions
- profiles and permissions

No screen may compute or store these independently. If two screens show a
number, they read it from the same place and the same function.

## 2. Game mode is a SKIN, not a second app
- Kid game mode and parent "Mission Control" mode are **alternate displays** of
  the same data.
- Every game-mode element READS from Supabase.
- Every game-mode action (submit, approve, award, redeem) calls the **existing**
  functions that already work in the normal app. Game mode only wraps prettier
  UI around them.
- A user toggles game mode on/off; the underlying data is identical either way.
- If the kid screen and parent screen ever disagree on a number, that's a bug —
  it means something forked the source of truth.

## 3. Derived values are computed, not stored
- XP, levels, badges, titles, "top 1%", progress percentages, "what to do next"
  are **calculated from** the canonical data at display time (or via a shared
  helper), not saved as separate truth.
- Example: `xp = totalStars * 10`; `level = floor(xp / LEVEL_SIZE)`. Change the
  formula in one place, everything updates.
- Badges derive from milestones already tracked (e.g. drum streak ≥ 300 →
  "Drumming Knight"). Don't store a separate "has badge" flag that could drift.

## 4. New systems get their own tables — but never duplicate truth
When adding genuinely new features (pet, adventure pass, chest, homework
tracker):
- Give each its **own table(s)**.
- They may REFERENCE canonical data (e.g. pet "Rhythm" stat reads from drum
  completions) but must not maintain a second copy of stars/streaks/tasks.
- A pet's stats, a pass's claimed rewards, etc. are new truth and live in their
  own tables — that's fine. The rule is: don't re-store something that already
  has a home.

## 5. Modular & additive — don't break what works
- Build ONE feature at a time.
- Before moving on, verify it persists: **hard reload + check on a second
  device.**
- Wrap new views around existing logic; don't rewrite working paths.
- Keep parent / grandma (Easy Mode) / helper / kid views independent — adding
  one must not change the others.

## 6. Photos & files
- All uploads go to the private `family-photos` Storage bucket, under the
  `family_id` folder (RLS enforces per-family access).
- Store the returned **path** in the row; load via **signed URL**.
- Never store `blob:` / `URL.createObjectURL` values as if permanent — they die
  on reload and don't cross devices.

## 7. Permissions (RLS + app)
- RLS scopes every row to the caller's family via `my_family_id()`.
- Auth identity is `auth.uid()` — writes are attributed to whoever is actually
  signed in, even if they've "switched profile" to act as someone else.
- Role permissions: parents full; grandparent/helper limited (view, complete,
  proof, notes; approval per setting); guest/sitter time-boxed and read-mostly.

## 8. Definition of done for any feature
1. Reads/writes the canonical Supabase data (no forked truth).
2. Uses existing submit/approve/award functions where applicable.
3. Persists across hard reload.
4. Works on a second device / second account.
5. Doesn't break the other role views.
6. Roadmap updated.
