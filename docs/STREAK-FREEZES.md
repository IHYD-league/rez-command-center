# Streak Freezes — Two Parent-Selectable Modes (idea doc, build-later)

> Drop in the repo at `docs/STREAK-FREEZES.md`. Idea capture, NOT a build.
> Read alongside the existing streak system (e.g. the 312-day Drums streak) and
> the stars economy.

## The idea

Streaks are a big motivator in the app (the 312-day Drums streak is a point of
pride). But life happens — vacation, travel, sick days, a day where the activity
genuinely can’t happen. Right now a missed day breaks the streak, which can feel
crushing for a kid who’s worked hard. A “streak freeze” protects the streak for
a legitimate gap.

**The key design decision: don’t force one model. Let PARENTS choose which
streak-freeze mode fits their family** (a setting). Two modes:

### Mode A — Parent-approved freeze (full control)

The parent grants a freeze when there’s a real reason.

- Use case: “We’re on vacation / traveling / he’s sick / the studio’s closed —
  he can’t do drums today, but I don’t want his streak to break.”
- Parent taps to freeze a day (today, or mark upcoming travel days in advance).
- The streak holds across the frozen day(s) as if the activity counted.
- Fully parent-discretion. No cost to the kid. Honest about WHY (it’s a real
  life reason, parent-judged).
- Good for families who want the streak to reflect “did his best given life,”
  with parents as the judge.

### Mode B — Kid earns/uses freezes (Duolingo-style, kid-managed)

The freeze is a resource the kid earns and spends, teaching responsibility.

- Use case: the kid builds up freezes and chooses when to use one — like
  Duolingo’s streak freeze.
- Earning methods (parent picks which, or combine):
  - **Spend stars** — a freeze costs N stars from his bank. He decides if it’s
    worth it.
  - **Earn by consistency** — do X days in a row → earn 1 freeze (Duolingo’s
    model: streak begets a safety net).
  - Optional cap (e.g. hold max 2 freezes at once) so it stays meaningful.
- The kid manages it — builds agency and a little strategy (“do I save my freeze
  or use it?”).
- Good for families who want the kid to OWN his streak, learn trade-offs, and
  not rely on a parent every time.

## Why parent-choice is the right call

- Different families, different philosophies. Some want control (Mode A); some
  want to teach kid autonomy (Mode B). Forcing one alienates half.
- It’s a single setting: “How do streak freezes work? [Parent approves] /
  [Kid earns & uses].” Maybe a third option “Off — streaks are strict.”
- Mirrors the app’s existing flexibility (e.g. parent-adjustable daily cap, the
  Top 8 they curate). Parents already expect to configure how things work.

## Honest design considerations (resolve at build time)

- **Streak integrity / honesty:** a freeze should be visible in the streak
  history (“🧊 freeze used — vacation” or “🧊 freeze spent”), not silently
  paper over a gap. Keep the data honest, like the pre-tracking/backlog approach
  for books — the streak says what really happened, including freezes.
- **Mode B + stars economy:** spending stars on a freeze touches the bank, so it
  must go through the SAME guarded paths as any star transaction (the economy is
  the protected core — a freeze purchase is a star spend, treat it like buying a
  reward). Recon must confirm it can’t corrupt the star total.
- **Don’t let freezes feel like cheating:** the point is protecting a real
  streak through real life, not faking consistency. The framing matters — a
  freeze is “life happened, your hard work is safe,” not “skip whenever.”
- **Per-activity or global?** Does a freeze apply to one streak (just Drums) or
  all? (Lean: per-activity — a freeze for the thing that couldn’t happen, not a
  blanket day-off. Resolve in recon.)
- **Advance scheduling (Mode A):** parents will want to mark vacation days ahead
  (“we’re away Jul 4–8”), so the streak doesn’t break while traveling without
  daily fiddling. Worth building into Mode A.

## Build discipline (post-incident, non-negotiable)

- This touches STREAKS and (in Mode B) the STARS ECONOMY — both are protected
  core. Treat with the same care as economy work.
- Recon → branch → preview → test → merge. On STAGING once it exists.
- Mode B star-spend must use the existing guarded star paths; confirm the star
  total can’t be corrupted. Test the full flow on staging before prod.
- Ship one mode first if simpler (likely Mode A — pure parent control, no
  economy touch), then add Mode B (which touches stars). Don’t build both at
  once if it adds risk.

## North star

A kid’s hard-earned streak shouldn’t break because life happened — and families
get to choose whether that protection is something the parent grants or
something the kid earns and owns. Flexible, honest, and protective of the
motivation the streak creates, without ever letting it become a way to fake
consistency or corrupt the star bank.
