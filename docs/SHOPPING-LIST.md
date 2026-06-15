# Family Shopping List — Research & Design (idea doc, build-later)

> Drop in the repo at `docs/SHOPPING-LIST.md`. A vision/research capture, NOT a
> build instruction. Based on research into what families/moms actually want
> from shopping + list apps in 2026. Read alongside ARCHITECTURE.md and the
> existing approval-flow model (this feature reuses it).

## Why this fits the app perfectly

The app ALREADY has the hard parts this feature needs:

- **Multiple profiles** (Mike, Krissie, Reznor) — so each person can add requests.
- **A parent-approval model** (kid submits → parent approves) — the exact pattern
  a “kid requests an item, parent approves it onto the list” needs.
- **Family-scoped shared data** — a shared list everyone sees is the same shape
  as the shared completions/rewards already in place.
  So this is less “new system” and more “apply what we already do to a shopping
  list.” That’s why it’s a natural, deep component rather than a bolt-on.

## What the research says families/moms ACTUALLY want

(From 2026 grocery/family-app comparisons + mental-load research.)

### The #1 non-negotiable: real-time shared sync

Every single comparison ranked **real-time sync across family members** as the
make-or-break feature. The story repeated everywhere: one person adds “milk” at
home, the other sees it instantly at the store. If it lags, people stop trusting
it and go back to texting. **For us: the shared list must update for everyone,
fast.** (Our sync layer already does this for completions — same mechanism.)

### Add items the moment you think of them (low friction)

Families don’t sit down for one tidy weekly list session. They add things while
unloading lunchboxes, cooking, noticing the shampoo’s empty. The winning apps
make adding an item take seconds. **For us: dead-simple “add item” from any
profile, any screen. One tap, type, done.** Friction kills it.

### The mental-load angle (what moms specifically want)

Research is blunt: mothers carry ~70% of the household “mental load” — the
invisible tracking of what’s needed, who needs what, what’s running low. The
apps moms love *take that weight off* rather than adding data-entry chores. Key
implications:

- The list should let mom STOP holding it all in her head — everyone dumps their
  needs into one shared place, so she’s not the sole rememberer.
- Don’t make mom the only one maintaining it. If only she can add/manage, it just
  becomes another thing she does alone. **Everyone contributing is the point.**
- Reduce nagging: kids/dad add their own requests instead of telling mom to
  remember. That’s the load lifting.

### Smart suggestions / auto-complete (the “fuzzy search” you asked about)

The best apps (Bring!, OurGroceries) suggest items as you type and remember what
you buy. This is where your “fuzzy search + favorites + brand preferences” idea
shines:

- **Type-ahead from your own history:** start typing “pea” → suggests “Peanut
  butter” because you’ve added it before. Gets faster every week.
- **Fuzzy match:** “ceral” still finds “Cereal”; “jif” finds your saved “Jif
  Peanut Butter.” Forgiving search = less frustration.
- **Remembered favorites:** the things you always buy become one-tap re-adds.
- **Brand preferences:** save “the brand we actually want” per item (Jif not
  generic; Honey Nut Cheerios not plain) so whoever shops gets the right thing —
  no wrong-brand guesswork. This is a real pain point the research flagged.

### Store-organized + multiple lists

Top apps group items by store section (produce, dairy, frozen, household) so you
don’t backtrack, and support **separate lists per store** (Costco vs. regular
grocery vs. Target). **For us: at least support categories; multiple named lists
is a strong later add.**

### Barcode scan (later, nice-to-have)

Scan an empty container to add the exact product/brand. Powerful but advanced —
note for the future, not v1.

## YOUR specific ask: kid requests + everyone contributes + parent approves

This is the part that makes it uniquely *yours* and fits the app’s soul. The
research backs it (Greenlight et al. use “kid requests a purchase → parent
approves” and it’s beloved):

**The model:**

- **Each kid (Reznor) can add a REQUEST** for something he wants (“Lego set,”
  “the cereal with the toy,” “new drumsticks”).
- **Dad (and any parent) can add items/requests too.**
- **Everyone sees the shared family list** — requests + approved items together,
  clearly marked.
- **Only parents approve.** A kid’s request sits as “pending ⭐ waiting for mom/
  dad” until a parent approves it onto the real shopping list (or declines it).
- This is EXACTLY the completion-approval flow already built — reuse it. Kid
  submits → parent reviews → approved/declined. Same mental model, same UI
  patterns, same trust model.

**Why this is great for a family app specifically:**

- Kids feel heard (their wants are captured, not dismissed) but parents stay in
  control (nothing gets bought without approval).
- It’s a teaching tool — Reznor learns to *ask* and sometimes hear “not this
  week,” which ties to the allowance/stars economy you already have.
- Optional tie-in: a kid request could cost stars (he “spends” toward a want), or
  stay separate as a pure wishlist. Worth deciding later — don’t overcomplicate
  v1.

## Proposed shape (high level, for a future recon)

- **One shared family shopping list** (family-scoped, real-time synced like
  completions).
- **Items have:** name, optional brand preference, optional category/store,
  who-added-it, status (needed / in-cart / bought), and for kid items a
  request-status (pending / approved / declined).
- **Add flow:** any profile taps “add,” types (with fuzzy type-ahead from
  history + favorites), done. Kid adds → it’s a pending request. Parent adds →
  it’s on the list directly.
- **Approve flow:** parents see pending kid requests, approve→onto list or
  decline. Reuse the existing approval UI.
- **Shopping mode:** check items off as you shop; they sync away from everyone
  else’s view instantly. Grouped by category so you don’t backtrack.
- **Preferences/favorites:** a saved list of “things we always buy” + brand
  prefs, powering the type-ahead and one-tap re-add.

## Phasing (so it ships sane, not all at once)

- **v1 — core shared list:** add/check-off items, real-time shared, kid requests
  - parent approval (the heart of it). Categories optional.
- **v1.5 — smart add:** fuzzy type-ahead from your own history + saved favorites
  - brand preferences. This is the “deep, delightful” layer you want.
- **v2 — store organization:** multiple named lists (Costco/grocery/Target),
  store-section grouping.
- **v3 — power features:** barcode scan, pantry “running low” suggestions, maybe
  stars/allowance tie-in for kid requests.

## What makes it a “superhit” (the delight, per research)

- **Colorful, picture-friendly items** (Bring! wins on this — tapping a category
  shows pictures, not just text). For a family app with a kid, visual + fun
  matters.
- **It lifts the mental load** — mom isn’t the sole keeper of “what we need”;
  the whole family fills it.
- **Kids are participants, not bystanders** — Reznor adding his own requests and
  seeing them approved is the magic that makes it a *family* app, not a chore
  app with a list bolted on.
- **Fast and trustworthy sync** — the thing that makes people actually use it
  instead of going back to paper/texts.

## Build discipline (post-incident, non-negotiable)

This is a real feature with shared data + the approval flow. When built:

- Recon → branch → preview → test → merge. No rushing to prod.
- Reuses existing approval + sync patterns; should NOT need risky role/RLS
  changes (it’s family-scoped data like completions). Confirm that in recon.
- Build it on STAGING first once staging exists (see PARENTS-AS-ADMIN-PLAN.md).
- One phase at a time. v1 (shared list + kid requests + approval) is the heart;
  ship that, learn, then add the smart-search delight.

## North star

A shared family shopping list where mom stops carrying it all alone — everyone,
including Reznor, adds what they need or want, parents approve, and whoever’s at
the store gets the right thing (right brand, nothing forgotten). Fast, colorful,
trustworthy, and fun — the kind of thing the whole family actually uses.
