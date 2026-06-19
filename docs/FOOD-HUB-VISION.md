# Food Hub — vision & north star

**App:** My Family HQ (myfamilyhqapp.com)
**Captured:** 2026-06-16
**Status:** Vision / north star. Not a build spec. An execution agent phases this into bricks later.
**One line:** The shopping list grows up into a **Food Hub** — everything food and household for the family, in one place, where the whole house helps keep track and the app gets smarter the more it's used.

---

## The shift

Today there is a "Shopping List." That becomes **one module inside a Food Hub.** The Food Hub is the container; the shopping list is one thing it does.

The reason this is worth doing is not that it adds features. It's that the value comes from the **connections between the pieces**, not the pieces themselves. The proof is one real decision Krissie already made:

> Flank steak keeps creeping up — it used to be ~$4 cheaper and it's not coming back down. So she's buying tri-tip instead: cheaper, and more of it.

For the app to make that call *for* her, four separate things have to be talking to each other: **receipts** (the price history), **inventory** (what's home), **preferences** (we'll accept a substitute here), and the **shopping list** (where the swap lands). That's the whole thesis. One system, not four stapled-together features.

---

## The concept map

Three connected layers. Everyone feeds it on the left, it learns in the middle, it hands back smarter results on the right.

```
┌─────────────────────────── FOOD HUB ───────────────────────────┐
│                                                                 │
│   WHAT WE HAVE          WHAT IT LEARNS          IT GIVES BACK    │
│   ─────────────         ──────────────          ────────────    │
│   Inventory       ─►    Receipts & spend   ─►   Lists by store  │
│   Family requests       Price history           Export PDF/text │
│   Allergies / avoid     Brand & store prefs     Meal ideas      │
│                         Recall & deal bots                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Feature buckets (the full vision)

### 1. Inventory — "what we have at home"
- A real concept, separate from a to-buy list. The app must be able to tell **"I have this"** from **"I need this."** (Today it cannot — every item is modeled as to-buy.)
- The ~76 items already entered are the current house inventory and belong here, not in a shopping list.
- The whole house helps keep it current.

### 2. Everyone reports, parents approve
- Any family member can flag "we're out of X." Kid says *"I'm outta BBQ chips!"* → that becomes a request.
- Parents get the notification and approve or not. This handles the "I hid the extra chips" case: the request surfaces, parent knows to either buy or point at the hidden stash.
- Reuses the existing kid-request → parent-approve flow already in the app. Append to it; don't reinvent it.

### 3. Multiple shopping lists, by store
- Separate lists per store — Target, Trader Joe's, Costco — and per trip (today, tomorrow). **This is important.**
- Tap into a list, move between them, build the next trip from inventory + approved requests.
- Lists must feel real and navigable, not like one bucket with a "+ new" affordance.

### 4. Export
- Export a list as **PDF or plain text.** Two paths: use the app, or send the info clean to whoever's shopping. Don't force the app.

### 5. Receipts + spend intelligence (the data spine)
- Scan a receipt → capture what was bought, where, when, how much.
- **Track how often** we buy things and **how much** we spend.
- **Price history per item:** tap something you've bought all year — did it go up or down? (Flank steak → tri-tip.)
- **Spend by category:** food per month, household supplies (paper towels, wipes), alcohol, etc.
- Backfill old receipts (Walmart / Costco / TJ's / CVS) so history starts populated, with the real historical date.

### 6. Personal preferences (per family, and per item)
- **Brand strictness is a setting.** Some families say *"only Heinz ketchup, no other."* Others (the Stricklands) say *"just get me the cheapest ketchup."* Both are valid; the app should honor each.
- Per-item override: brand-locked on the things you care about, cheapest-wins on the rest.
- **Allergies / foods to avoid** list — feeds both safety (don't suggest a recipe with an allergen) and shopping.
- The point of preferences: kill repetitive human work. Learn what they want so they stop re-deciding it every trip.

### 7. Smart lists / store tagging
- Tag items you only ever buy at a certain store → lists auto-route them to the right store list.

### 8. Workers (background agents)
- **Recall checker:** scan inventory + active lists against product recalls; flag anything affected.
- **Deal finder (Groupon-style):** *"Don't buy that at Target — Walgreens has it on sale."* Sometimes Target wins, sometimes Walmart; prices move, so the worker watches.
- **Always a choice, never a nag:** if Krissie says "I'm not doing multiple trips," she rejects the pop-up and it's gone. The app suggests; the human decides.

### 9. Meals & dinner (future)
- **Cook with what you have:** *"Here are our options with what's in the house right now"* — kills the "what are we even making" stall.
- **Dinner-picker game** for when nobody wants to choose. (A real household problem.)
- **Favorite meals** → build a list of the dishes you love, like favoriting songs or books.
- **Recipe rec engine:** find similar foods / new ideas based on what you like and have.

---

## Guardrails (read before phasing any of this)

These are the honest tensions. None of them kill a feature; they're the lines to cross *on purpose* rather than back into.

**1. You're now building a product, not a private family app.** Designing brand-strictness for the Stricklands is a multi-family feature. That's a good call — but the moment other families' data (including their kids) lives here, the data-safety bar jumps. This is the same conclusion the Codex audit pointed at. Decide multi-family deliberately; don't arrive there by accident.

**2. Visibility, not budgeting.** Spending visibility (where it went, how much, price trends) is in-lane and is the whole point. A full budgeting / YNAB-replacement tool is the line drawn in FAMILY-APP-RESEARCH.md. This vision leans heavier than the original "passive visibility" scope — that's fine, but the line moved, so move it knowingly.

**3. Keep spending transparent — don't nudge in secret.** Showing someone their own category spend (alcohol included) is genuinely useful and empowering, and worth building. A *hidden* agenda to change behavior without telling them is a different thing, and it's the wrong call here for a practical reason: in a family app built on trust, a covert nudge — if anyone ever realizes it's there — costs the trust the whole product runs on. Show the data straight. The transparency *is* the help.

**4. Workers, split by how hard they actually are.**
- *Recalls = feasible now.* The FDA and USDA publish recall data; checking inventory against it is real, doable, and a good early worker.
- *Cross-store deal-finding = the hardest, least reliable thing in the whole vision.* There are no clean price APIs for Target vs. Walmart vs. Costco, prices are hyper-local, and scraping is fragile and usually against terms of service. Don't anchor the timeline to the flashiest piece. Recalls ship early; deal-hunting is a research project, scoped much later, if at all.

**5. Most of this already exists — reuse it.** Multi-list, favorites, fuzzy search, and the request→approve flow are already in the code. **Inventory-as-its-own-concept is the genuinely new primitive** (needs a schema change). Build on what's there; don't rebuild it.

**6. The ShoppingList component is fragile.** It's the known TDZ zone (8+ useMemo hooks, a documented prior crash, a standing declaration-order rule). UI reshuffles *inside* the component are low risk. Lifting state up to a parent, or adding cross-list aggregations, is where the trap reopens — declaration order matters. Treat it with care.

---

## Build order (mapped to bricks already in flight)

The Food Hub is the destination, not a thing you build at once. Almost every chapter is already moving or already scoped. Keep the one-brick cadence; this just gives it a name.

| # | Chapter | Owner | Schema? | Status |
|---|---------|-------|---------|--------|
| 1 | **Lists navigation** — multiple real lists by store, name normalization, persistence, empty-list survival. Unblocks Krissie *now*. | Black (UI) | No / light settings storage | Recon done; awaiting build-order call |
| 2 | **Staples view** — cross-list "stuff we buy a lot," fuzzy re-add. | Black (UI) | No | Scoped; needs new memo before `favorites` in declaration order |
| 3 | **Receipts chain** — RS-1 (receipts table + receipt scan kind + ReceiptScanner + backfill), then RS-2 (purchases log + "I bought this" tap), then RS-3 (spending visibility + price trends). | Green (data) | New tables only | RS-1 spec approved, building |
| 4 | **Inventory as its own concept** — re-home the 76 items from "to-buy" into "what we have"; whole-family "we're out" → request → approve → list. | Green (schema) + Black (UI) | **Yes — `kind` column or `inventory_items` table** | Deferred; the biggest, schema-touchingest piece. Do it deliberately, on staging. |
| 5 | **Preferences** — brand strictness per family/per item; allergies/avoid list. | Small | Light (settings) | Future |
| 6 | **Smart lists / store tagging** — tag items to stores, auto-route. | Black (UI) | Light | Future |
| 7 | **Workers** — recall checker first (feasible), deal finder later (research project). | Green / new lane | New | Future |
| 8 | **Meals & dinner** — cook-with-what-you-have, dinner-picker game, favorite meals, recipe recs. | Future | New | Future, delight |

**The rename itself** (Shopping List → Food Hub) is a cheap, motivating brick — but do it *after* the navigation restructure (chapters 1–2), so you're not renaming a surface while you're also reshaping it.

---

## Cross-cutting rules (apply to every chapter)

These are standing doctrines, not per-feature decisions:

- **One brick per lane.** Restate scope in one sentence, get explicit confirm before building. Visual changes get a rendered preview before commit.
- **Never two agents in App.jsx at once.** New files land first; the App.jsx edit waits for an explicit "clear of App.jsx" window. (Both the lists-navigation work and RS-1's chooser want the same scan-area region — they cannot overlap.)
- **Staging-first for anything touching a live table.** The additive receipt tables are optional-staging; the inventory schema change (chapter 4) is the one that most needs it.
- **Soft-delete by default; append-only where it's financial.** Receipts get soft-delete (metadata, correctable). The future `purchases` log gets strict immutability via void-row (the sum must stay true by construction).
- **RLS family-scoped, FORCE enabled, on every new table.** No new role enum values ever — `is_admin` boolean only. Parents approve; `is_parent()` gates the sensitive actions.
- **Load indicators wherever the app isn't instant** — part of spec, not polish.
- **The `vision-parse` auth gap closes before multi-family.** That function burns the Anthropic key and is open to anyone with the URL. Acceptable for one trusted family; load-bearing the moment a non-Lynch family scans a receipt. Tracked in the audit doc.

---

## Out of scope (so it doesn't creep in)

- Full budgeting / envelope / YNAB-replacement math (see guardrail #2).
- Covert behavioral nudging (see guardrail #3).
- Real-time cross-store price scraping as a near-term commitment (see guardrail #4).
- Anything that rebuilds multi-list, favorites, fuzzy, or request/approve from scratch (already exists — see guardrail #5).

---

*"Families are busy and need help. We are here." — the why behind all of it.*
