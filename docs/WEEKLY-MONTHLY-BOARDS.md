# Weekly & Monthly Adventure Boards — Vision Doc

> Drop in the repo at `docs/WEEKLY-MONTHLY-BOARDS.md`. Read alongside
> `BOARD-GAME.md` and `ARCHITECTURE.md` (**ARCHITECTURE.md wins on any tiebreak**).
> This is a vision doc, not a build. Build only after the current feature queue
> clears (theme merge → Coach Mode → magic-link), brick-by-brick on a preview
> branch.

## Where this came from (the why)
This feature exists because of direct feedback from Reznor (age 6), after the
**daily board reset** and he felt he'd lost his progress. In his words:

> "I want a weekly board and a monthly board. Because I wanna feel like I can
> finish the board when I do it... I was sad when the daily board ended and I
> didn't finish it. I wanna have that, but I don't wanna feel sad."

The emotional core: **a reset feels like loss.** A daily board that vanishes
each morning erases the sense of a journey. The fix is to make his progress
**accumulate and stay visible** — his adventure keeps going, it doesn't restart
to zero.

## North star
Same board game, **three zoom levels**, so progress is never "lost" — it flows
upward:
- **Daily board** — today's tasks. Resets each day (already built).
- **Weekly board** — everything completed this week, as one continuous trail in
  completion order, building across the days. Does NOT reset daily.
- **Monthly board** — the whole month's journey, scrollable. The "look how far
  I've come."

The daily board ending should feel like **graduating up**, not losing: when the
day ends, today's completed spaces visibly **flow into the weekly board**.
Reframe for the kid: *"Today's done — and look, it all moved onto your weekly
map!"* That reframe is the actual fix for the sadness.

## The One Rule (per ARCHITECTURE.md)
**This is a DISPLAY feature, not new tracking.** Every completion already has a
date in `completions` (canonical). Weekly/monthly boards are just **new views**
filtered by date range:
- Daily = completions where `completion_date === today`
- Weekly = completions in the current calendar week (Sun–Sat)
- Monthly = completions in the current calendar month
No new "is_done" truth, no duplicated progress. If you removed the weekly/monthly
boards entirely, the canonical completion data would be unchanged. ✅

## Board states & "finish"
Reznor's key need: *"I want to be able to finish the board before it ends."*
So each zoom level needs a completable arc + a treasure:
- **Daily** — finish today's tasks → daily treasure (existing).
- **Weekly** — fill the week's trail → **weekly treasure** (bigger).
- **Monthly** — complete the month → **monthly treasure** (biggest).
Parents set what each treasure is (real-life reward or in-app), per the existing
treasure-threshold pattern in BOARD-GAME.md.

## Behavior details to get right
1. **Order = completion order** (consistent with the daily board's existing
   rule). Weekly trail fills in the order he actually completed things across
   the week; same for monthly.
2. **Daily → weekly continuity.** Today's completed spaces should appear on the
   weekly board (since they're this week's completions). The transition at
   day-end should feel additive: the day's trail becomes part of the week's
   longer trail, not erased.
3. **Scrolling.** Monthly especially is long — smooth vertical scroll, current
   position findable, treasure at the end. Mobile-first (big touch targets,
   fast/skippable animations) per BOARD-GAME.md.
4. **Navigation between zoom levels.** A simple toggle/tabs: Day · Week · Month.
   Reznor taps to zoom out and see more of his journey.
5. **Week/month boundaries.** Calendar week = Sun–Sat (matches the stats
   feature). Calendar month = 1st–end. When a new week/month starts, the prior
   one should ideally remain viewable as "past adventures" (see open question).

## Data model
Likely **no new tables needed** — all three boards derive from `completions`
filtered by date range. Possible small additions ONLY if needed:
- Per-period treasure config (what the weekly/monthly treasure is) — could live
  in the existing board/family settings, not a new truth source.
- Optional: a lightweight record of "past completed boards" if we want to let
  him browse previous weeks/months as a trophy archive (open question).
Confirm with recon before adding anything.

## Phasing (build after current queue clears)
- **Phase 1 — Weekly board.** Day/Week toggle; weekly trail from this week's
  completions in completion order; weekly treasure. Reframe the daily-end so it
  flows into the week. CSS/emoji visuals (reuse current board styling/themes).
- **Phase 2 — Monthly board.** Add Month to the toggle; scrollable monthly
  trail; monthly treasure.
- **Phase 3 — Past adventures archive (optional).** Let him scroll back through
  previous completed weeks/months as a trophy gallery — directly serves the
  "I don't want it to feel lost" emotion.
- **Phase 4 — Art/polish.** Themed weekly/monthly maps once daily-board art
  (Phase 4 of BOARD-GAME.md) is established.

## Open questions (resolve at build time)
- 💡 Do past weeks/months stay browsable forever (trophy archive), or just the
  current + most recent? (Lean: keep them browsable — it's the whole point of
  "not lost.")
- 💡 Does the weekly treasure require ALL week's required tasks, or a parent-set
  threshold (e.g. "5 of 7 days")? (Lean: parent-set threshold, kid-forgiving —
  matches the "no penalties for missed days" philosophy.)
- 💡 One shared trail for the week, or the week shown as 7 connected day-segments?
  (Lean: one continuous trail in completion order — simplest and matches his
  "keep moving" mental model.)
- 💡 Where do weekly/monthly treasures' rewards get configured by parents?

## Acceptance criteria
- Reznor can toggle Day / Week / Month and see his journey at each zoom.
- Weekly board shows this week's completions as a continuous, building trail;
  monthly shows the month.
- Today's completions visibly belong to / flow into the weekly board — day-end
  feels like progress moving up, not resetting to nothing.
- Each level has a completable arc + treasure.
- Reads only from canonical `completions` (no forked truth); removing the
  feature leaves canonical data unchanged.
- Clean Netlify preview; no regressions to the daily board or other screens.

## A note to remember
This came from Reznor. Build it in a way that makes a kid feel his effort
*accumulates and is seen* — that's the entire point. Tell him his idea made it
into the plan.
