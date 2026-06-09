# Parent-Curated "Top 8" Priority List — Idea Doc

> Drop in the repo at `docs/TOP-8-PRIORITY-LIST.md`. A vision/idea capture, not
> a build. Read alongside the board-game docs + ARCHITECTURE.md (board's daily
> cap is the existing source of truth for "what's needed").

## The idea
Mike & Krissie want to **hand-pick the top 8 "still to do" items** for the day,
in an **order they control**, and have that selection drive what everyone sees:
- The **parent home page** (Mike/Krissie) shows these top 8.
- **Reznor's home** shows the same top 8 (so he sees exactly what matters today).
- The **board game** uses these (most already are — the board's daily-cap
  selection overlaps with this).

The key new ability: **order control.** Different days need different priorities
— some days drums first, some days homework first. Parents set the order, and
that order flows to the home screens + board.

## Why this matters
- It puts parents in deliberate control of "what does Reznor focus on today,"
  rather than an automatic priority sort. Some days are different — a recital
  day, a heavy-homework day, a lazy Sunday — and the parents know best.
- It unifies what the adults see and what Reznor sees, so everyone's looking at
  the same plan. No confusion about "what should I do."
- It connects to the board game's existing daily-cap concept (the cap already
  defines "what's needed" — this adds parent-chosen *which* items and *what
  order*).

## Relationship to existing systems (important — don't fork the truth)
- The **board daily cap** already exists and is the source of truth for "how
  many things = a complete day" (default ~8-9, parent-adjustable). This Top 8
  feature is about **which** items and **what order** — it should extend / feed
  that existing system, not create a competing one.
- Tasks/activities already exist with priorities. This adds a parent-set
  *explicit ordering + selection* layer on top, likely stored as an ordered list
  of task IDs (per family, per day or as a default the parent tweaks).
- Likely storage: a small ordered list (e.g. family_settings.topPriorities as a
  jsonb array of task IDs, or a per-day override). Recon to decide; reuse the
  existing settings pattern, don't invent a new truth source for the tasks
  themselves.

## What it should do
- Parents pick up to 8 items from the available tasks/activities.
- Parents **set the order** (drag-to-reorder, or up/down arrows — arrows are
  easier on mobile/touch, simpler for quick daily tweaks).
- The chosen, ordered list appears on: parent home, Reznor's home, and feeds the
  board game's spaces/order.
- Easy to re-order day to day (low friction — this gets touched daily).
- Reznor's board completion-order behavior still applies (he can do them in any
  order; the parent order is the *suggested/displayed* order, not a forced
  sequence — unless we decide otherwise).

## Open questions (resolve at build time)
- 💡 Is the Top 8 a per-day thing (set fresh each day) or a default the parent
  occasionally re-orders? (Lean: a default ordering the parent tweaks as needed
  — less daily work — with easy reorder for "today's different.")
- 💡 How does this interact with the board's daily cap number? (They should be
  the same concept — the cap = how many, the Top 8 = which + order. Unify them.)
- 💡 Does parent order override the board's completion-order fill, or just set
  the initial display order? (Lean: parent order = display/suggested order;
  Reznor still completes in any order and the board fills by completion, per his
  earlier feedback.)
- 💡 Where do parents edit it — a dedicated "Today's Priorities" screen, or
  inline on the parent home?

## Sequencing
Not urgent vs. reliability/PWA/the in-flight book work. Capture now, build when
the current threads (books, covers) settle. It's a meaningful parent-control
feature and ties the home screens + board together — worth doing well, not
rushed.

## North star
Parents decide what matters most today, in the order that fits the day, and
everyone — including Reznor — sees the same clear plan. Control + clarity,
without forking the task truth.
```
