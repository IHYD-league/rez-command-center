# Multi-Family + Multi-Kid Plan

> Status: **PARKED** — design only. Not building today. Mike is keeping focus on
> the Reznor/Krissie experience first. When other parents are actually ready to
> onboard, this is the doc to come back to.

---

## TL;DR

Two distinct shifts the app needs before other families can use it:

1. **Multi-kid inside one family** — refactor so one family can hold N kids
   with shared tasks/rewards/library but separate banks/streaks/boards.
2. **Family bootstrap** — let a brand new family actually create their account
   without bumping into Mike's pending-requests queue.

Recommended order: **(1) first, then (2).** Doing onboarding on a single-kid
model would force a data migration of every onboarded family the moment we
add multi-kid support.

---

## Part 1 — Multi-kid per family

### Recommended model: shared tasks, separate scoreboards

| Surface | Scope | Why |
| --- | --- | --- |
| Tasks / chores | Family | Define "Drums" once, every kid does drums. |
| Activities | Family | Same colors, same kinds. |
| Rewards catalog | Family | Same store; each kid spends from their own bank. |
| Books library | Family | Siblings share — and most do. |
| Songs library | Family | Same — drum-songs aren't kid-specific. |
| Photos / portfolio | Family | One album per family, taggable by kid. |
| Handoff notes | Family | These are *for the next adult*, not per kid. |
| **Star bank** | **Per kid** | Siblings can't spend each other's stars. |
| **Streaks** | **Per kid** | Reznor's drum streak is Reznor's. |
| **Top 8 / daily plan** | **Per kid** | Different age = different load. |
| **Board state** | **Per kid** | Each kid walks their own treasure walk. |
| **Summer Quest** | **Per kid** | Per-grade, per-kid. |
| **Achievements** | **Per kid** | Personal milestones. |
| **Completions** | Per kid (already) | `completedBy` already carries the kid id. |
| **Gifts** | Per kid | Need a `to_kid_id` column. |
| **Redemptions** | Per kid | Need a `by_kid_id` or use `requestedBy`. |

### UX: a "current kid" chip in the parent app

- Top-of-app chip shows the currently-scoped kid (avatar + name).
- Tap → bottom sheet lists every kid → tap to switch.
- Default = first kid alphabetically, persisted per-parent in `userPrefs`.
- Every parent screen below re-scopes to the picked kid.
- Kid sign-in is unchanged — a kid still only sees their own data.

### Data model changes

Most existing tables already have a `family_id`. We need to make the
per-kid ones also carry a `kid_profile_id`. Concrete migration list:

1. **`star_bank_base` per kid** — today it's the JS constant `CHILD.starBankBase`.
   Move to `profiles.star_bank_base int default 60`. Read at display time.
2. **`gifted` rows** — add `to_kid_id` (already has `by`). Existing rows
   backfill with Reznor's id.
3. **`redemptions`** — `requested_by` already carries kid id. No change.
4. **`streaks`** — composite key is currently `(family_id, activity_id)`.
   Change to `(family_id, kid_profile_id, activity_id)`.
5. **`board_state`** — already keyed `(family_id, profile_id)`. Already per-kid.
   ✅ no change.
6. **`user_prefs`** — already per-profile. Use to store the parent's
   "currently scoped kid" so it persists across sessions.
7. **`summer_quest_progress`** — already per-profile. ✅ no change.
8. **`top_priorities` (family_settings)** — currently a single
   `{ weekly, daily }`. Bump to `{ [kidId]: { weekly, daily } }` keyed by
   kid id. Same for `taskNaDays`.
9. **`achievements`** — already per-profile if we look at completions.
   `wonToday` / trophies computed per kid in `buildAchCtx`.

### Code refactor surface (App.jsx)

The thing to grep for and audit:

- `CHILD.*` references — every one becomes "the current kid's value."
- `completions.filter(...)` — many places don't filter by kid because there's
  only one. Need `.filter(c => c.completedBy === currentKidId)` at every
  derivation site (bank, earnedToday, pending, treasure streak, achievements).
- `todaysTopEight` — already a `useMemo`. Just key by `currentKidId`.
- `compByTask` — same.
- `KidGameHome` — already reads "current user's" stuff. Mostly fine.
- `Insights`, `Portfolio`, `Weekly`, `DataAudit` — every aggregate needs
  per-kid filtering, then summed.

### Roll-out in stages (so prod stays green)

**Stage A — Add the chip, no behavior change yet.**
- Add a `currentKidId` state, default = the first/only kid.
- Render the chip. Tapping cycles through kids (but for Reznor's family
  there's only one — the chip is a no-op pleasant signal).
- Ship.

**Stage B — Refactor derivations to filter by `currentKidId`.**
- One PR per surface area: bank math, then board, then streaks, then
  achievements, then Insights/Portfolio.
- Each PR is shippable on its own — Reznor's family still works because
  there's only one kid, so the filter is a no-op.

**Stage C — Schema migrations.**
- Migration: `star_bank_base` on profiles, `to_kid_id` on gifts, new
  composite key on streaks. Backfill Reznor's id everywhere.
- Update transform.js round-trip.

**Stage D — `topPriorities` / `taskNaDays` reshape.**
- Migration to `{ [kidId]: { weekly, daily } }`. Backfill at read time
  (familySettings.topPriorities[kidId] || familySettings.topPriorities).

**Stage E — "Add another kid" in People.**
- New button. Uses the same one-tap invite flow as adding a helper, but
  role = kid.

### Risks

- **Forgetting a derivation site.** Mitigation: data audit page already
  checks bank math; add per-kid checks.
- **`buildAchCtx` is dense.** It reads from many sources; needs careful
  per-kid filtering or we double-count siblings' wins.
- **Reznor-specific seed data.** Move `SEED_TASKS` / `SEED_ACTIVITIES` /
  `CHILD` constants into the schema's `start_family` RPC so a new family
  gets sensible defaults without inheriting Reznor's lineup.

---

## Part 2 — Family bootstrap (onboarding)

### The single line that has to change

`supabase/schema.sql:196` —

```sql
select id into v_fid from public.families order by created_at asc limit 1;
```

This is `request_to_join` always queueing new signups into the **oldest
family** (= Mike's). It's the single root cause of "a new family can't
actually create their account."

### Three simple flows (per the busy-parent rule)

**A. Brand-new family**
1. Login → tap **"Start our Command Center"** (new toggle next to Sign in / Register).
2. Form: parent name, email, password, **first kid's name**.
3. On submit: `start_family(parent_name, kid_name)` RPC creates a family,
   the caller becomes its first parent, the kid profile is seeded.
4. Done. They're in. No queue, no approval.

**B. Add a kid to your family**
- People → kid card → **"Send sign-in link"** → enter email.
- Kid opens the link on their phone → sets a password → they're in.
- The invite link IS the approval. No queue.

**C. Add a helper / co-parent / grandparent**
- People → **"Invite someone"** → name + email + role.
- Same one-tap link. Same "invite = approval" rule.
- Approval queue only stays for the (rare) walk-up unsolicited register flow.

### Schema work

1. **`start_family(p_parent_name, p_kid_name)`** SECURITY DEFINER RPC.
   Creates families row → inserts caller's profile as parent → seeds
   default activities + tasks + a kid profile. Returns family_id.
2. **`invite_tokens` table** — `(token, family_id, email, role,
   created_by, expires_at)`. Pre-authorized — first sign-in with that
   email claims the slot.
3. **`claim_invite(token, password)`** RPC — Supabase Auth signup +
   profile insert in one. Marks token used.
4. **`approve_registration`** — drop the role allowlist that rejects
   `kid`. (Even though we'll prefer invite links, this still matters
   for the walk-up case.)
5. **Pre-seeded-by-email claim path** — if a profile exists with the
   caller's email and `auth_user_id is null`, link instead of creating
   a duplicate. (Handles the "I added Reznor's email in People before
   he ever signed in" case.)

### Email delivery

Magic invite links can be:

- **MVP:** generate the link in-app, parent copies and shares it via
  iMessage / WhatsApp / email themselves. Zero infra.
- **V2:** Supabase Edge Function fires the email. Requires SMTP setup.

Start with MVP — copy-to-clipboard. It's *simpler* (per the parent rule)
and removes a whole category of "did the email arrive?" support burden.

### Login screen wireframe

```
                  🚀
            Command Center

         [ Sign in ]  [ Register ]   ← keep
         [ Start our Command Center ] ← new, primary CTA below

If "Start": parent name, email, password, kid name → Submit
If "Sign in": email + password
If "Register": email + password + name → request_to_join (legacy walk-up
                                          path, lower-key visual)
```

---

## Part 3 — Side effects that already help

These are already in the app and pay off immediately for multi-family:

- ✅ **Family isolation via RLS** (`my_family_id()` helper + every RLS policy).
- ✅ **Privacy & Safety page** (parent → More → Privacy & Safety).
- ✅ **Data audit page** (parent → More → Data audit).
- ✅ **Sync status dot** (bottom-right).
- ✅ **Error boundary** with generic copy + Copy-to-clipboard.
- ✅ **Kid song-play actions gated through parent approval.**
- ✅ **Login title is generic ("Command Center"), not "Reznor Command Center."**

When we come back to this work, these are already done.

---

## Out of scope (write down so we don't forget)

- **Per-family branding.** A family might want to name their app
  "The Lynch Command Center." Defer; not load-bearing.
- **Cross-family helpers** (a grandparent serving two families).
  Defer; rare.
- **Family deletion / leaving.** Need a hard-confirm flow + cascade.
  Defer; add when we have churn risk.
- **Self-serve role changes** (kid → parent on 18th birthday).
  Defer; admin action via People is fine.

---

## When we come back to this

Start with **Stage A** of Part 1 — the kid chip in the parent header,
no behavior change. It's a few lines, ships in an afternoon, and turns
the rest of the refactor into a series of one-screen migrations. The
chip itself shows up as a no-op for Reznor's family, which is the proof
that the rest of the refactor isn't breaking him.

If a parent emails asking to try Command Center *before* this is built:
spin up a separate Netlify deploy + Supabase project for them as a hand
operation. Don't compromise the shape of this plan to onboard one user.
