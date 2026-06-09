# Reznor Command Center — AAA Roadmap

> The battle plan for making this an app Krissie and Reznor stay hooked on for
> years — not just a working tracker. Drop in the repo at `docs/AAA-ROADMAP.md`.
> Read alongside ARCHITECTURE.md. Work it like the other docs: pull items into
> the build queue, ship one at a time, test before merge.

## The core truth
The gap between "working app" and "AAA app they love for years" is NOT more
features. It's **reliability, polish, speed, and a few specific retention hooks.**
A handful of flawless features beats twenty buggy ones. Finishing things to a
polish is the work — not starting more.

Engagement is two different people:
- **Reznor (6):** stays engaged when the app is FUN and feels like HIS — delight
  moments, building an identity, things to unlock.
- **Krissie:** stays engaged when the app is RELIABLE and USEFUL — saves her
  effort, scannable, shows her his growth, never wastes her time or breaks.

---

## TIER 1 — Foundation: Reliability (non-negotiable, do first)
An app Krissie can't trust gets abandoned no matter how pretty. The star bank
zeroed TWICE. This tier is unglamorous and it's #1.

| Item | Why it matters | Effort |
|---|---|---|
| Server-side / DB-level guards on the economy (stars can't be wrongly zeroed) | His real bank. Trust dies if numbers are wrong. | Low |
| Cache-busting (force fresh bundles; stale JS caused the re-zeroing) | Stale devices replaying old bugs is a recurring failure mode | Low-Med |
| Test-on-preview-before-merge as standing discipline (esp. auth/economy/schema) | Every lockout + zeroing came from skipping this | Process |
| Confirm balances/totals hold over real days of use | "We re-repaired it" ≠ "it can't happen again" | Low |

**Done = the app never silently breaks. This is the floor everything stands on.**

## TIER 2 — The AAA feel (highest perceived-quality jumps)

| Item | Why it matters | Effort |
|---|---|---|
| **Make it a PWA** (installable, home-screen icon, full-screen, app-like) | Biggest single "feels like a real app" jump. Also helps notifications + stale-cache. | Med |
| **Speed/smoothness** (optimize the 697KB bundle, instant taps, buttery animations) | AAA apps feel instant. A kid loses interest in 2 seconds of lag. | Med |
| **Re-engagement nudges** (streak reminders: "312 days — don't break the chain!") | THE biggest retention lever. An app that taps you on the shoulder stays in rotation; one you must remember to open gets forgotten. | Med-High* |
| **Delight moments** (treasure sequence, completion sounds, haptic buzz, earned celebrations) | What makes Reznor *want* to tap. The magic. | Low-Med each |

*Honest caveat: real push notifications on iOS web are limited — likely needs
the PWA/installed-app path. Investigate feasibility before promising it. A
"daily check-in" in-app nudge is a simpler fallback.

## TIER 3 — Engagement that keeps it fresh (months/years)

### For Reznor (make it HIS)
- More board themes (Water World, Sky City, Candy Concert, etc. — registry's ready)
- A companion/pet that grows with his streak
- Avatar customization / unlockables as he progresses
- Weekly + Monthly boards (HIS request — progress that accumulates, never "lost")
- Kid view of his own Memories/gallery (his journey, his wall)

### For Krissie (make it USEFUL)
- Coach Mode ✅ (done)
- At-a-glance "what does he need today" (the daily cap = source of truth)
- Fast, friction-free approving
- Insights that show his growth (drum minutes, songs, books, handwriting-over-time)

### Long-game payoffs (the keepsake hooks)
- Monthly → 6-month → 1-year milestone slideshows. THIS is what makes her tear
  up in a year ("look how his handwriting changed"). Turns the app from a tool
  into a keepsake — huge for long-term retention.
- Data export (the family owns its data; never trap it)
- Album-art / book-cover enrichment (the visual "music/reading trophy wall")

---

## In-flight right now (Tier 1 finishing items)
- Phase 3 Insights (building)
- Phase 4 Export · Phase 5 Slideshows · Phase 6 Album art (gallery remainder)
- Weekly/Monthly boards (Reznor's request)
- Magic-link helpers (Sara/babysitters — pending)
- Board polish: treasure-arrival sequence, full-bleed art, fixed nav, walk-cycle

## Honest priority order for "make it AAA"
1. **Lock reliability** (Tier 1) — the floor. Non-negotiable.
2. **PWA / installable** — biggest perceived-quality jump.
3. **Re-engagement nudges** — biggest retention lever.
4. **Polish delight moments** (treasure, sounds, haptics) — what makes Reznor want it.
5. **Finish gallery + weekly boards** — meaningful features in flight.
6. **Then** long-tail engagement (themes, pet, slideshows, album art).

## The discipline that makes it AAA
- One thing at a time, finished to polish, before the next.
- Test on preview before merge — always, especially auth/economy/schema.
- Two agents: own lanes, own migrations, one in App.jsx at a time.
- Dump ideas freely (inbox) → ship in deliberate order (queue).
- Reliability and trust beat features. Always.

## The north star
Years from now: Krissie opens it daily because it's reliable, fast, and shows
her Reznor growing. Reznor opens it because it's fun and it's *his*. They scroll
back through a year of his journey and it means something. That's AAA — not the
feature count, but that they never want to stop using it.
