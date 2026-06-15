# What Families & Moms Want From a Family App — Research & Growth Map

> Drop in the repo at `docs/FAMILY-APP-RESEARCH.md`. A strategic research
> capture, NOT a build list. Based on 2026 research into family-organizer /
> mom-focused apps (Cozi, FamilyWall, Maple, Jam, Ollie, OurHome, Greenlight,
> etc.) — what they offer, what wins, what frustrates, and where this app
> already has an edge. Use it to decide direction, not to build everything.

## The single biggest finding: you already do the hard part

Across every comparison, the apps split into two camps:

- **Calendar/list apps** (Cozi, FamilyWall, Maple) — great at scheduling +
  lists, but repeatedly dinged: “limited for household management,” “if chore
  distribution is an issue you’ll need a second app.”
- **Chore/reward apps** (OurHome, Greenlight) — great at kids + chores +
  rewards, but “does not include a calendar or expense features, works best as a
  supplement.”

**Almost nobody does both well.** Your app is firmly in the chore/reward/kid-
development camp AND does it with real depth (stars economy, board game,
approval flow, multi-profile, progress tracking). The big gap in the market is
an app that nails the kid/chore/reward side AND adds the household-coordination
side moms want. You’re positioned to grow toward that — from a strength most
apps don’t have.

## What moms/parents want most (ranked by how often it came up)

### 1. Lift the mental load (the emotional core)

The deepest, most repeated theme. Mothers carry ~70% of the household mental
load — the invisible tracking of what everyone needs. The apps moms LOVE are the
ones that *move that weight off her* — where the whole family contributes, not
where mom becomes the sole app-maintainer. Repeated warning: “Family members
need an account to share, which often means mom ends up managing it alone.”
**Design rule for everything you build: never make mom the sole input source.
Kids and dad contribute their own stuff. That’s the load lifting.**
→ Your app already nails this with multi-profile + approval. Lean into it.

### 2. Shared calendar (the #1 most-requested concrete feature)

This is THE table-stakes feature of family apps and the one thing your app
doesn’t deeply have yet. What moms want:

- **Color-coded by family member** — see at a glance who has what.
- **One shared place** for school events, practices, appointments, birthday
  parties, games — “know what everyone’s doing.”
- Reduces the chaos of “text threads, sticky notes, and shared spreadsheets.”
- Note: you have a Calendar/activities concept already (Swim Tue/Thu, the board
  scheduling). A true shared family calendar would be a natural, big extension —
  and it’s the feature that turns a chore app into a family-command-center.

### 3. Meal planning + “what’s for dinner” (huge, underrated stressor)

Came up in nearly every comparison as a top stressor. “The nightly ‘What’s for
dinner?’ panic” — parents “running on fumes by 6pm.” What wins:

- Plan the week’s dinners (drag-and-drop calendar of meals).
- Save favorite recipes (“that pasta dish my family loved”).
- **Meal plan → auto-generates the shopping list** (the killer integration —
  ties directly to your planned shopping-list feature).
- Let the family REQUEST favorite meals (kids included — same request/approve
  pattern as everything else you do).
  → Strong synergy with the shopping list. Meal plan that feeds the shopping list
  = the integration moms rave about.

### 4. Shared shopping list (already researched — see SHOPPING-LIST.md)

Real-time shared, low-friction, everyone contributes, smart suggestions/brand
prefs, kid-requests-with-approval. Already specced.

### 5. Reminders for everyone / “who’s driving”

- Shared reminders so things don’t fall solely on mom to remember.
- Carpool / “who’s driving” coordination came up as a specific beloved feature
  (Jam’s “Who’s Driving”).
- Appointment reminders (doctor, dentist, sign-ups).

### 6. Photo / memory sharing

Several apps include shared family photo albums + a “family journal.” You
ALREADY have this (memories, gallery, slideshows) — it’s a feature the big apps
treat as a premium add. Another existing strength.

### 7. Communication in one place (reduce channel chaos)

Real parent frustration (from a parent forum): “there are simply too many
school-parent communication channels — teacher email, classroom portal, parents’
WhatsApp, paper forms… you expend cognitive energy trying to remember where
you said what.” Parents crave FEWER channels, one source of truth. (Not
necessarily a build for you — but a reminder that consolidation itself is the
value. Don’t fragment.)

## What FRUSTRATES parents about existing apps (your chance to win)

- **Mom ends up managing it alone** — see #1. The fix is your multi-profile +
  contribution model. Biggest differentiator.
- **Needs a second app** — calendar apps lack chores; chore apps lack calendars.
  Doing both = the gap.
- **Everyone needs an account / different phones** — friction to get the family
  on board. Your profile-switcher model (one device, multiple profiles) sidesteps
  some of this nicely for younger kids.
- **Manual input for everything** — the newest apps (Jam, Ollie, Goldee) win by
  reducing data entry (scan a flyer, forward an email, voice input). Worth noting
  as a “delight later” direction, not now.
- **Finicky calendar sync** — even Cozi gets dinged for flaky Google/Apple
  Calendar sync. If you ever do calendar, native-first + reliable beats
  ambitious-but-flaky.
- **Subscription fatigue / per-user pricing** — parents resent paying per person.
  (Relevant only if this ever goes public.)

## How this maps to YOUR app’s soul

Your app isn’t trying to be Cozi. It’s a **kid-development + family-life command
center** centered on Reznor — habits, rewards, progress, and the things that
keep the household running. So the growth features that fit are the ones that:

- Reinforce the multi-profile + approval model (shopping list, meal requests).
- Lift mom’s mental load (everyone contributes).
- Keep kids as participants (requests, choices, ownership).
- Stay visual/fun/colorful (the kid-facing delight you already do well).

Features that DON’T fit (avoid scope creep): location tracking, co-parenting/
custody tools, deep expense/budget management, school-comms — those belong to
other app categories. Stay in your lane: family life + kid development.

## Suggested growth order (when staging exists + you have energy)

A loose roadmap, not a commitment. Each is a real feature → safe build path.

1. **Shared shopping list** (already specced, fits perfectly, reuses approval).
1. **Meal planning** that feeds the shopping list (kills the #1 dinner stressor,
   integrates with #1).
1. **Shared family calendar** (the big table-stakes feature; turns the app into
   a true command center — but it’s a large build, do it deliberately).
1. **Shared reminders / who’s-driving** (lighter, lifts mom’s load).
1. Delight layer later: visual/voice input to reduce typing.

## Build discipline (non-negotiable, post-incident)

Every one of these is a real feature with shared data. When built:

- Recon → branch → preview → test → merge. On STAGING once it exists.
- Most reuse the existing approval + sync + multi-profile patterns — the SAFE
  category, no risky role/RLS changes. Confirm in recon.
- One feature, one phase at a time. Ship, learn, iterate.

## North star

The app moms actually want is one that takes the household off her shoulders —
where the whole family contributes, kids are participants not bystanders, and
the daily stressors (what’s for dinner, what do we need, what’s everyone doing)
live in one calm, colorful, trustworthy place. This app already has the hardest
piece (the engaged-family, approval-based, kid-centered engine). The growth is
adding the household-coordination layer on top of that strength.
