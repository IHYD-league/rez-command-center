# Audit Batch · 2026-06-13 (Mike's review)

Mike flagged seven issues in one screenshot review. Ordered critical-first.

## 🔴 Critical (broken / blocking)

### 1. Insights page crashes — "C is not a function"
- Symptom: navigating to More → Insights renders the global error boundary with `C is not a function`.
- Likely cause: a recent rename or refactor (gift-soft-delete branch introduced `giftedRaw` and a derived `gifted` useMemo; Insights likely receives one of these and tries to call it). Confirm via stack trace.
- Fix: trace the call site, restore the expected shape, add a safety guard.

### 2. Privacy & Safety buttons do nothing
- "Export every row as CSV" and "Run a data audit" cards on the Privacy & Safety page are tap-no-ops.
- Cause: those buttons call `setTab("more")` which is a side step — they don't actually navigate to the right sub-route. Need to route to the More → Export or More → Audit sub-pages directly.

## 🟡 Important (visible bug, single value)

### 3. Streak off-by-one in Recap & Memories
- Reznor's drum streak shows 317 days in Today / Insights / Stars.
- Recap & Memories shows "316 days of drums since Aug 1."
- Cause: Recap & Memories is computing days-since-`Aug 1` instead of reading `streak.current` from the canonical streaks table. The two numbers don't agree because one counts days-elapsed (inclusive vs exclusive) and the other is the canonical streak count.
- Fix: read `streaks[a_drums].current` for the day number; derive the anniversary copy off the streak `since` date.

### 4. Weekly Summary contains demo copy
- Has a "Demo" placeholder string somewhere.
- Fix: scrub the placeholder; derive every figure from real state.

## 🟢 Important UX (multi-step but additive)

### 5. Calendar — flexible day picker for any seasonal activity
- Today only Taekwondo has the "tap which days he'll go this week" picker.
- Mike wants the same affordance for any activity that's seasonal / variable (Basketball, Swim, Drums).
- Fix: replace the TKD-specific `tkdDays / tkdTimes` familySettings with a generic `weeklyActivityDays: { [activityId]: ["Monday", "Friday"] }` shape and pull from each active activity. UI: a section per active activity with `weeklySchedule` enabled, with the same toggle row.

### 6. Privacy & Safety — drill-through clicks
- Tap a helper (Sara) → see permissions, access expiry, what she can approve.
- Tap "Photos: N" → open the full Photo Gallery filtered to that family.
- Tap "Family ID" → maybe show a QR + copy.
- Fix: convert the StatRows on Privacy & Safety into buttons that route to the matching detail page.

### 7. Export Data — include EVERY photo
- Currently exports tabular CSVs. Mike wants the export to include every photo too (proof, album, covers, accomplishments).
- Fix: when the parent taps Export, generate a zip containing CSVs + a `photos/` folder with every signed URL downloaded (or simply a manifest of paths + signed URLs the parent can click through). Zip is the right shape but heavier; manifest is faster.

---

## Execution order

1. 🔴 Insights crash (#1) — single small branch, ships immediately.
2. 🔴 Privacy & Safety buttons (#2) — same branch as #1 if narrow, else its own.
3. 🟡 Streak off-by-one (#3) — small data-source fix.
4. 🟡 Demo copy scrub (#4) — text-only sweep.
5. 🟢 Generic weekly schedule picker (#5) — meatier; new familySetting + UI.
6. 🟢 Privacy & Safety drill-through (#6) — multiple small routings.
7. 🟢 Photo-bundle in Export (#7) — biggest, ships last.

Each its own branch. Merged sequentially. No deferred work — Mike said all of them before any more new features.
