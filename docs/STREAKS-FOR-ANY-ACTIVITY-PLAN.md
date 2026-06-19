# Streaks for any activity — plan

**Author:** Mr. Black Family (planning), for Mr. Green Family (build)
**Trigger:** Maryam (Xander's mom) feedback 2026-06-16 — wants Piano streak that looks like Reznor's drum streak. Maddox (Magnetta) may pick up Guitar soon. Other streakable activities the parent listed: Reading, Writing, Math, Swim.
**Constraint:** must be easy for parents. No multi-step config. One tap to promote.

---

## TL;DR

Most of what's needed is **already generic** — the schema, the streak engine, the bump-on-completion path, even the StreakStrip render. Drums is the only hardcoded headliner because Reznor's family was the only one in the app for months. This plan layers a **per-kid "headliner activity"** setting (one JSON key in `family_settings`) and replaces a handful of `a_drums` / drum-emoji references with activity-driven lookups. Result: any family picks any activity as their kid's main thing, gets the full Reznor experience around it.

**Maryam unblocks at end of Phase 1 (1-2h of code).** Phases 2-3 are the rest of the brand-leak cleanup. Phase 4 is auto-promote polish.

---

## Audit — what already works (no work needed)

Verified against current schema + code 2026-06-16:

| Generic | Where | Notes |
|---|---|---|
| `streaks(family_id, activity_id, current, longest, since, last_date)` | `supabase/schema.sql` | Composite-keyed by activity. Works for any activity id. |
| Activities table — generic shape | `activities(id, name, short_name, color, pillar, status, weekly_schedule, weekly_target)` | All parent-defined. No drum-specific columns. |
| `bumpStreak(activityId)` fires on every completion | `src/App.jsx:1291, 1504` | "only bumps if that activity is being tracked" — and "being tracked" just means the completion has an `activityId`. Any activity gets a streak the moment the kid does it. |
| StreakStrip — `function StreakStrip({ streaks, activities })` | `src/App.jsx:5385` | Picks the entry with highest `current`, joins against `activities`. Zero drum-specific knowledge. |
| Subtasks data-driven per task | `task.subtasks` array | Already migrated. Maryam can define Piano subtasks (Hanon, repertoire, sight-reading) the same way Reznor's drum task has (Drumeo, Melodics, Drumscribe). |

Confirmed in prod DB:
- Nault has Piano as activity `a_piano_mqg7lvet_0`, plus Art, Football, Reading
- Magnetta has Duolingo, Homework, "Watch 30 Minute Spanish Show"
- Both families had 0 completions and 0 streak rows pre-2026-06-16 (the actor-guard bug blocked everything). After tonight's fix, Maryam's next completion will auto-create a streak row for piano.

**The moment Maryam submits her first piano completion, `streaks` will get a row for `a_piano_mqg7lvet_0` with `current: 1` and StreakStrip will render "1-day Piano streak!" — without us shipping anything new.** Most of the heavy lifting was done months ago for Reznor.

---

## Gap — what's still hardcoded to drums

The pieces that DON'T generalize automatically:

| # | Location | What it hardcodes | Phase to fix |
|---|---|---|---|
| 1 | `App.jsx:444` `buildAchCtx` | `drumsDone`, `drumStreak: streaks?.a_drums?.current` | 2 |
| 2 | `App.jsx:2113` | `_drumCurrent = streaks?.a_drums?.current` | 2 |
| 3 | `Insights.jsx:28, 501-543, 718` | Practice-time card reads `c.extra.drumeo` + `c.extra.melodics`, sums, labels "Drumeo / Melodics" | 2 |
| 4 | `PracticeTimerBanner.jsx` | `Drum` lucide icon hardcoded | 2 |
| 5 | `BoardGame.jsx:427` | `Drums: "🥁"` emoji map | 3 |
| 6 | `MilestoneSlideshow.jsx:26, 199` | drum-specific milestone logic | 3 |
| 7 | `SummerQuest.jsx:179` | string "Drums, dance, swim & taekwondo" | 3 |
| 8 | `MusicLibrary.jsx:367` | "add some via the Drums task sheet" | 3 |
| 9 | `StreakStrip` (App.jsx:5385) | Picks highest streak — no parent override | 1 |

---

## Design

### One new setting key, no schema migration

```
family_settings.settings.headlinerActivityByKid: {
  [profileId]: activityId
}
```

Examples after migration:

```json
// Lynch
{ "headlinerActivityByKid": { "u_reznor": "a_drums" } }

// Nault (after Maryam taps the toggle once)
{ "headlinerActivityByKid": { "u_1781586722259": "a_piano_mqg7lvet_0" } }

// Magnetta (Monica hasn't picked yet)
{ "headlinerActivityByKid": {} }
```

**Resolution order** (in `selectHeadlinerActivity(kidProfileId, streaks, activities, settings)`):
1. If `settings.headlinerActivityByKid[kidProfileId]` is set and the referenced activity still exists in `activities` → use it.
2. Else fall back to the highest-current-streak activity (current StreakStrip behavior).
3. Else return null (e.g. brand-new family, no completions yet — show "Start a streak today!" empty state instead of the headliner banner).

**Why a single jsonb key, not a new column or new table:**
- Lives in `family_settings.settings` which is already a freeform jsonb the app reads-modifies-writes
- Zero migration needed
- Backwards compatible by default (empty object = auto-pick fallback = current behavior)
- Per-family scoped by RLS through `family_settings.family_id`

### The ONE parent action

In the Activities edit sheet (More → Activities → tap any activity), add ONE toggle row at the bottom:

```
┌────────────────────────────────────────────┐
│  ⭐  Make this Xander's main activity      │
│      Shows as the headliner streak on his  │
│      board and in his practice surfaces.   │
│                                            │
│      [   OFF   ●    ]                      │
└────────────────────────────────────────────┘
```

Tapping ON:
1. Sets `headlinerActivityByKid[xanderId] = this.activityId`
2. Unsets any previous activity in the same kid's slot
3. Confirm toast: "Piano is now Xander's main activity ⭐"

If the family has multiple kids, the row repeats per kid:
```
⭐ Make this Xander's main activity   [ON ●]
⭐ Make this Stella's main activity   [OFF]
```

(For v1 each kid has at most one toggle ON across all activities. The UI hint "currently set to Reading" appears under the OFF state when a different activity is already the headliner.)

**That is the entire net new parent interaction.** Everything else (streaks auto-creating, the banner showing, practice card pulling subtask minutes) happens automatically.

### Auto-streak behavior (zero parent setup)

- `bumpStreak(activityId)` already fires for every completion with a linked activity_id
- Streak self-creates on first completion, grows on consecutive days, resets to 0 on miss
- No "track as streak" flag, no upfront opt-in
- Sporadic activities (swim 3x/week) just keep resetting — parent should not promote them to headliner; UI should not prevent it but should not auto-promote them either

### What's actually shown / changes per surface

| Surface | Before | After |
|---|---|---|
| `StreakStrip` on Today / KidStreaks | Picks highest `current` from `streaks` | Picks the kid's headliner; falls back to highest-current if no headliner set |
| `PracticeTimerBanner` | Drum icon, "Practice drums" copy | Uses headliner activity's icon (lucide name mapped via `activity.icon` field if added, else use `activity.emoji` in an emoji slot) + headliner's `short_name` |
| Insights "Practice time" card | Sums `c.extra.drumeo` + `c.extra.melodics` for `a_drums` completions | Sums every numeric key in `c.extra` for the headliner activity's completions. Subtask labels come from the linked task's `subtasks[].name`. If no subtasks defined → show total minutes. |
| Achievement context (`buildAchCtx`) | `drumsDone`, `drumStreak: streaks?.a_drums?.current` | `headlinerDone`, `headlinerStreak: streaks?.[headlinerActivityId]?.current` |
| Achievement copy ("100-day drum streak") | Literal "drum" | Template `{activityName}` interpolation, e.g. "100-day Piano streak" |
| BoardGame emoji header (drum: 🥁) | Hardcoded map | `activity.emoji` lookup; fallback to activity-color circle if none |
| Milestone slideshow drum chapter | Hardcoded `a_drums` | Loops the headliner activity for the family being viewed |
| SummerQuest copy "Drums, dance, swim & taekwondo" | Hardcoded | Family's top 3-4 activities by recent streak length, or empty if none |
| MusicLibrary empty-state CTA | "Add some via the Drums task sheet" | "Add some via the [music activity] task sheet" — keyed off whichever activity is `pillar: "music"` (if any), else hide the CTA |

### What Reznor sees (no change)

- Migration seeds `headlinerActivityByKid[u_reznor] = "a_drums"` in the Lynch family_settings row
- Every surface above resolves to `a_drums` and renders identically to today
- All existing drum-specific achievements stay valid because `streaks.a_drums.current` is still 319 and counting

---

## Phasing

| Phase | Scope | Time | Ships value |
|---|---|---|---|
| **1. Headliner picker + StreakStrip override** | `family_settings.headlinerActivityByKid`. Toggle row in Activities edit sheet. `selectHeadlinerActivity()` helper. StreakStrip uses it. Seed Lynch with Reznor=a_drums. | 1-2h | **Maryam unblocked.** Piano shows as Xander's headliner streak. Reznor unchanged. |
| **2. Generalize achievement + practice-time surfaces** | `buildAchCtx` reads headliner. Insights Practice card reads subtask minutes from headliner task. PracticeTimerBanner takes headliner icon + copy. | 3-5h | New families get the FULL Reznor-style experience around their headliner. |
| **3. Copy + emoji cleanup** | BoardGame, MilestoneSlideshow, SummerQuest, MusicLibrary hardcoded drum strings replaced with activity-driven lookups. | 1-2h | Polish — removes the last "why does it say drums?" moments for non-drum families. |
| **4. Auto-promote prompt** (optional) | When a kid hits 7 consecutive days on a non-headliner activity AND no headliner is set for that kid, surface a one-shot card: "Xander's been doing Piano daily for a week! Make Piano his main activity?" Yes/No. | 1h | Discoverability — most parents won't think to dig into Activities edit; this surfaces the action when it's relevant. |

**Each phase is independently shippable.** Phase 1 alone solves Maryam's immediate complaint. Phases 2-3 are how the experience stops feeling drum-flavored for everyone else.

---

## Rollout

- **Zero schema migration.** Setting lives in `family_settings.settings` jsonb. No SQL needed.
- **Backwards compatible.** Empty `headlinerActivityByKid` → auto-pick fallback → current behavior.
- **Lynch seed in code, not SQL.** On Phase 1 deploy, the client-side write that introduces the key should ALSO seed Reznor's existing default if the family is recognized as Lynch (or any family where `a_drums` has a streak ≥ 30). Avoids needing a data migration.
- **Each phase independently revertable.** Phase 1: delete the key → fallback to auto-pick. Phase 2-3: revert the file changes; the data model didn't change.

### Pre-commit verification (Green to run on local stack)

1. **Seed test family** with Piano + Reading + Math activities, one daily task each linked to its activity.
2. **No completions yet:** Verify StreakStrip renders nothing (or empty state).
3. **Submit one piano completion:** Verify a streak row appears in `public.streaks` for the piano activity id, with `current=1`. Verify StreakStrip renders "1-day Piano streak!"
4. **Submit one reading completion same day:** Verify a second streak row. Verify StreakStrip still shows whichever has higher `current` (both at 1 — tiebreaker fine to be alphabetical or insert-order).
5. **Toggle "Make Piano main activity for [kid]":** Verify `family_settings.settings.headlinerActivityByKid[kidId]` updated. Verify StreakStrip switches to Piano even if Reading later overtakes it in `current`.
6. **Toggle OFF:** Verify the key is deleted (or set to null) and StreakStrip reverts to auto-pick.
7. **Lynch regression on prod-shaped seed:** Verify `streaks.a_drums.current = 319` still drives the StreakStrip → drums shows, drum icon, drum copy, drum-specific achievements all intact.
8. **Magnetta cold-start:** Maddox profile, no headliner set, no completions yet. Verify nothing crashes, empty state renders. After first Duolingo completion, Duolingo streak materializes and StreakStrip shows it.

---

## Open questions (confirm with Mike before Green starts Phase 1)

1. **Per-kid only, or per-profile?**
   A parent who plays piano themselves might want their own headliner. Recommendation: per-kid only for v1, parents-too in v2 if asked.
2. **Achievement-scope split.**
   Should the existing drum-streak achievements ("365-day drum streak", etc.) become activity-generic ("365-day [headliner] streak"), or stay drum-specific and run alongside a parallel generic family of achievements?
   - Recommendation: keep Reznor's existing drum badges as drum-specific (he earned them with drums, not with "headliner"), and ship a NEW generic "[headliner]-streak" badge family for new families.
3. **Onboarding prompt.**
   Should the OnboardingWizard ASK "What's your kid's main activity?" right after the "What's their name?" step, so the headliner is set day 1?
   - Recommendation: yes for v2, defer for v1 (Maryam can use the toggle now).
4. **Streak-eligibility filter.**
   Should ALL activities be streak-eligible, or only ones flagged as daily? E.g. football practice 2x/week generates a streak that resets after every game day, which could feel like nagging.
   - Recommendation: all activities are eligible (data model is already there). Add a future per-activity "Track as daily streak" toggle in v2 only if a family complains. For now: only daily activities should be promoted to headliner — parent's choice.

---

## Inputs already verified

- Maryam's Piano activity is in prod (`a_piano_mqg7lvet_0`, Nault family)
- All four kids in prod (Reznor, Xander, Maddox, Test) have `is_child=true` post-2026-06-16 hotfix — so completions can actually land now
- `streaks` schema generic; only Lynch has rows right now (`a_drums`, current 319) — every other family will get rows once they start completing
- StreakStrip is activity-agnostic — verified by reading the render function

---

## Out of scope (explicit)

- Weekly streaks (e.g. "5 of 5 weekly piano practices") — different concept, separate brick
- Cross-activity meta-streaks ("did SOMETHING every day for 30 days") — separate
- Streak freezes (one-day skip allowance) — see `docs/STREAK-FREEZES.md`
- Headliner per parent (separate from per-kid) — v2
- Onboarding-time headliner picker — v2
- Drum-specific badges → generic badges migration — v2 if any family asks

---

## Files Green will touch (Phase 1 only)

| File | Change |
|---|---|
| `src/App.jsx` | Add `selectHeadlinerActivity()` helper. Update `StreakStrip` to use it. Add the toggle row in the Activities edit sheet. Seed `headlinerActivityByKid[u_reznor] = "a_drums"` on first read for Lynch family if not already set. |
| `src/data/transform.js` | No change (family_settings is already a generic jsonb passthrough). |
| `supabase/migrations/` | NO new migration needed. |

Estimated diff: ~80-120 lines additive, no deletions.

---

## Memory references

- `feedback_lucide_map_collision.md` — `Map as MapIcon` import alias in App.jsx, grep every bare `Map` after touching imports. Relevant when adding new icons.
- `feedback_total_control_user_editable.md` — hardcoded family-specific content leaks Lynch into Magnetta. The drum hardcoding in this plan is exactly that pattern, and fixing it is the work.
- `feedback_no_private_names_in_shared_strings.md` — when shipping new copy in Phase 3, no Lynch/friend names in any generic surface.
- `reznor_band_rotation.md` — drum-flavored copy in Reznor's family surfaces stays; just don't leak it to others.
