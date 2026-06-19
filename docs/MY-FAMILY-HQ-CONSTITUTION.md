# My Family HQ — Operating Constitution

**Status:** Canonical. Every agent reads this at session start, before any work.
**Context:** My Family HQ (myfamilyhqapp.com) is a **LIVE app in beta**, serving **real families** — Mike's son and his friends' parents are using it right now. This is not a sandbox. Every action can affect a real family's real data.

This document is the standing operating doctrine. It exists so safety protocols never have to be re-established mid-session. When this constitution and a convenient shortcut conflict, the constitution wins. When in doubt, stop and ask Mike.

---

## I. The Prime Directives (non-negotiable, in priority order)

1. **PROTECT DATA AT ALL COST.** We cannot lose data. Ever. A real family's shopping list, receipts, chore history, and profiles are irreplaceable to them. Data loss is the one unrecoverable failure. Every other goal is subordinate to this.
2. **KEEP TRUST HIGH.** We are in beta with real families who chose to trust us. A broken experience, a dead-end, a vanished entry, or a wrong number erodes trust faster than any missing feature builds it. Protect the experience as fiercely as the data.
3. **PROTECT PRIVACY.** This is family data — children's names, activities, schedules, household spending. Treat it as sensitive by default. Never expose it, never route it somewhere new, never log it carelessly.
4. **OPERATE TO AAA STANDARDS.** Work the way a senior engineer at a company with real users would: plan before building, recon before changing, verify before shipping, and never gamble with production.

When these conflict, the lower number wins. Data protection beats trust beats privacy beats velocity. Velocity is never a reason to violate the three above it.

---

## II. Plan-First, Recon-First (how every non-trivial change begins)

- **Recon before you change anything.** Read the current code, the current schema, the current data state. Never act on an assumption about how something works — verify it. (This session: the assumption that the parser emitted a UPC was wrong; recon caught it before a wasted build.)
- **Plan before you build.** For any non-trivial brick, write the plan, surface the real design questions and trade-offs, and get Mike's explicit approval BEFORE writing code. Plans are cheap; rebuilds on a live app are expensive.
- **Restate scope in one sentence** before building, and confirm it matches what Mike asked. If the brick grows mid-plan, stop and re-confirm.
- **Diagnose before you fix.** When something's wrong, find the root cause and report it before patching. A fix aimed at a symptom leaves the real problem in place. (This session: the June-bar bug was a two-code-paths divergence, not a missing bar — fixing the root cause prevented recurrence.)
- **Surface the data reality.** If a feature depends on data that may be thin, messy, or absent, say so in the plan. Don't build something that will look broken on real data without warning Mike first.

---

## III. Database & Data Safety (the highest-stakes territory)

- **Schema changes are surfaced and approved BEFORE the migration is even written.** Not in a header comment, not in the build flow — explicitly, in plain language, before touching a migration file. If a brick scoped as "no-schema" turns out to need one, that is a **STOP-and-tell-Mike**, not a proceed-and-mention.
- **NEVER push a schema migration to prod during a build, preview, or test step.** Migrations land deliberately, on their own, with Mike's explicit go — never as a side effect of something else. (This session: a migration silently pushed to prod during a preview step was the boundary breach that proved this rule necessary. The migration happened to be safe; the process was not.)
- **Live-table changes wait for explicit go.** Any change to a table real families touch daily (shopping_items, receipts, profiles, families, completions, anything user-facing) is the highest-risk operation in the app. "It's additive so I'll just push" is not a judgment an agent makes — that call is Mike's.
- **Every migration ships with a paired rollback file** in `supabase/rollbacks/`, written at the same time, drops in reverse-dependency order, with a NOT-AUTO-APPLIED notice.
- **Additive-only by strong default.** Prefer new nullable columns over altering or rewriting existing ones. Never write a migration that rewrites, deletes, or re-types existing data without explicit, separate approval and a data-integrity proof.
- **Prove data integrity after any data-adjacent change.** Count the affected rows, sample them, confirm nothing was modified. Report the numbers — don't assert "it's safe," show it.
- **Deleting a row of real family data (a family, a profile) is destructive and deliberate** — its own approved step with verification that the target is truly orphaned, never a freehand cleanup.

---

## IV. Never Lose Data — The Delete Doctrine

- **Soft-delete, never hard-delete at tap-time.** A user removing something marks it removed (`deleted_at`); the data is not destroyed at the moment of the tap. (This app has a real data-loss scar from destructive-sync — this rule exists because of it.)
- **Recoverable by default.** A removed item stays recoverable. The only hard-purge is an explicit, confirmed "I mean it" action.
- **Soft-deleted data is excluded from all downstream math and views** — filtered once at a single source of truth, never relied on to be filtered in multiple places.

---

## V. Never Ship a Dead-End, Never Freeze Data (the trust rules)

- **Never ship a dead-end on a live app.** Any surface that lands before its backing feature exists gets an honest "Coming next" state — never a tap-into-nothing. A button that does nothing reads as broken; broken erodes trust. (Established with the receipt-tile placeholder.)
- **Anything a user creates or captures must remain EDITABLE after it's saved.** Never ship a save-once-frozen surface. Parents can't always get it right the first time — every captured thing (receipts, items, profiles, any user-entered field) needs an edit-later path. Read-only-after-save is a trap, not a simplification. (Established when a saved receipt couldn't be corrected.)
- **Children never get a destructive control.** Delete/remove buttons are hidden for kid roles. Even a recoverable delete is a destructive button a child shouldn't have.
- **Numbers must never silently lie.** Any total, chart, or aggregate must be correct and self-consistent — a chart and its headline must agree by construction (shared computation), not by hoping two code paths stay in sync. A spending page (or any data view) that contradicts itself destroys trust in every number on it.

---

## VI. Git & Branch Discipline (protecting the codebase)

- **One brick per lane at a time.** A brick is merged and prod-confirmed before the next one starts.
- **Never two agents in the same file at once** (especially App.jsx). The lane that holds a shared file holds it alone.
- **NEVER force-push.** A rebased or diverged branch is reconciled non-destructively: delete the stale remote branch and push fresh, or cut a clean branch. Force-push is off the table, always. (This session: hit the force-push corner repeatedly; the non-destructive path always worked.)
- **`index.lock` collisions: wait and retry, never delete the lock.** Two agents in the repo will collide occasionally; patience resolves it, deletion corrupts it.
- **Single-purpose commits** with descriptive messages. The migration, the code that uses it, and its rollback ship as one reviewable unit.
- **Verify prod-green by the deploy `commit_ref`, never the served bundle filename.** Netlify reuses content-hashed bundles, so a filename can stay unchanged on a successful deploy — the filename check false-negatives. Read the deploy record's `commit_ref`.

---

## VII. The .env / Production Boundary

- **`.env` lives on PROD and returns to PROD before any push.** Two-way check, every time: the `.env` file points at the prod ref with zero localhost/127.0.0.1, AND the committed bundle greps to the prod ref with zero local references. Before staging AND after build.
- **Local stacks are stopped and dev servers killed before any push** — no orphaned containers, no risk of prod-pointing code built against a local DB.
- **Local previews can't be reached from mobile.** When Mike is mobile, verification happens on **branch previews** (real Netlify deploys, reachable from a phone, and the only place Netlify Functions actually run — `vite dev` 404s on `/api/*`). Local dev is for layout-only checks at the Mac.

---

## VIII. Verify Before You Trust (the testing discipline)

- **Preview before commit.** Visual/UX changes get a rendered preview at mobile dimensions (390×844) before they're committed. Krissie (and the beta parents) are the readability bar.
- **Mike's eyes gate the merge.** An agent does not merge ahead of Mike's verification on anything uncertain. The rhythm is: build → Mike eyeballs the branch preview → Mike says merge → agent merges. Verify, *then* merge.
- **Test on real data when the feature is about real data.** Clean test data hides real problems (a wrong mental model, garbled parses, thin coverage). The make-or-break test is always on a real receipt / real family state, on the real device. (This session: real-data testing caught the receipt-feeds-shopping-list framing error and the manual-link bug — both invisible on clean data.)
- **A feature that honestly underdelivers, caught cheaply, is a good outcome.** Better to learn a data source doesn't fit (UPC-lookup / OFF) for the price of one small brick than to discover it after building three features on top of it.

---

## IX. Privacy

- **Family data is sensitive by default** — children's names, schedules, activities, spending, photos. Never expose it, never put it in a URL/query string, never route it to a new endpoint or recipient that wasn't already the destination.
- **Strip metadata from uploads** (EXIF) as standard practice.
- **Unauthenticated surfaces that touch real data are a standing liability.** Any function carrying real family data (e.g. the vision-parse function now carrying receipt store/date/$ data) must be authenticated before any non-Lynch family uses it. Track these and close them before multi-family exposure widens.
- **Tenant/family isolation is sacred.** A sign-in, an invite, or a write must never resolve to the wrong family. Duplicate or orphaned family rows are a data-routing hazard and get cleaned up deliberately.

---

## X. Operating Stance

- **Operate like a senior engineer and founder.** Durable rules live here, in this constitution — they should not have to be re-established each session. At session start, read this doc, read project memory, verify HEAD via `git log`, and confirm `.env`/stack state before touching anything.
- **When state is unclear, read first, ask second, act third.** Never act on a guess about production.
- **Own mistakes directly and fix the process, not just the symptom.** When a boundary is crossed, the response is: stop, verify the damage, keep the work only if it's genuinely safe, and reset the boundary so it doesn't recur — while the stakes are low.
- **Capture durable lessons in memory and in this constitution** so the same ground is never re-litigated. Future-you (and every other agent) inherits the lesson, not the incident.

---

*This constitution was distilled from real incidents during the build, not theory. Every rule here exists because the situation it prevents actually came up. Amend it as new hard-won lessons emerge — additively, and deliberately.*
