# Shopping Lists — Chapter 1 (List Navigation)

**Author:** Mr. Black Family (planning)
**For execution:** Mr. Black Family (Phase 1a), Mr. Green Family or Black for follow-on phases
**Trigger:** Mike + Krissie's "feels like one list with no way to navigate." 76 of Mike's items all landed in the default "Grocery" because that's the only list anyone ever lands on; new list names don't survive a render without items.
**UX bar:** Krissie at the store glances at the app and picks "I'm at Target" / "Trader Joe's" / "Costco" / "today's run" — and sees a clean list for each.

This is **chapter 1** of the Food Hub stack. Chapter 2 (cross-list "staples"), chapter 4 (inventory as its own concept) are explicit follow-ons, NOT in this brick.

---

## Decision summary (confirmed with Mike)

1. **Fork resolved — Option A: jsonb in `family_settings`, no schema migration.** Stays in Black's lane. Chapter 4 (inventory) is the natural moment to promote shopping lists + inventory into a real table together if needed; chapter 1 + 2 don't justify the schema/staging gate.
2. **Default list for new families:** keep `"Grocery"` universal. No onboarding step — too much first-run friction. Parents rename in two taps.
3. **Rename collision:** **always prompt** the merge ("Move everything from X into Y?"). Never silent auto-merge — silent merges are trust-breakers ("where did my stuff go").
4. **Delete-last-list:** UI hides the delete affordance when only one list remains. Zero-list is a broken state; prevent it at the UI layer.
5. **Pill order:** `lastUsedAt desc` — most-recently-used list leftmost. Drag-reorder is post-chapter-1.

---

## Data model — `family_settings.settings.shoppingLists`

Single new key in the existing `family_settings.settings` jsonb. No migration.

```jsonc
{
  "shoppingLists": [
    {
      "key": "grocery",             // normalized lower+trim+collapse-whitespace
      "name": "Grocery",            // family's chosen casing for display
      "createdAt": "2026-06-17T...", // ISO; null for the seeded default
      "lastUsedAt": "2026-06-17T..." // ISO; null when never used
    },
    {
      "key": "costco",
      "name": "Costco",
      "createdAt": "...",
      "lastUsedAt": "..."
    },
    {
      "key": "trader joe's",
      "name": "Trader Joe's",
      "createdAt": "...",
      "lastUsedAt": "..."
    }
  ],
  "lastActiveListKey": "costco"      // chapter 1b — per-family memory
}
```

**Why a `{key, name}` pair, not a bare string:**
- `key` is what `shopping_items.list_name` stores after chapter 1e (lowercased, trimmed, single-spaced). Solves "Costco / costco / COSTCO" splitting at the storage layer.
- `name` preserves the family's chosen casing for display ("Trader Joe's" with the apostrophe and proper case).
- Existing pre-chapter-1 items carry `list_name = "Grocery"` (capital G). Chapter 1's filter normalizes on read, so they still match the `grocery` key without any backfill.

**Why `family_settings` (jsonb), not a new `shopping_lists` table:**

| Criterion | jsonb (chosen) | New table |
|---|---|---|
| Empty-list survival | ✅ array entry independent of any item | ✅ FK row |
| Migration | none — Black's lane | yes — Green's lane, staging gate |
| RLS isolation | ✅ via `family_settings.family_id` | ✅ same shape |
| Per-list metadata future (color/icon) | possible (object fields) | cleaner |
| Cross-list aggregations (chapter 2) | client joins two reads | one query |
| Reversibility | trivial — delete the key | rollback SQL + staging gate |
| Time-to-Krissie | sooner | gated by Green's relay |

Chapter 4 (inventory) is the natural moment to promote both into real tables together — one bigger Green-owned migration, not two small ones. Until then, jsonb is genuinely durable: it already powers `dailyRequiredCount`, `topPriorities`, `boardTheme`, `headlinerActivityByKid`, and `family_settings` is already family-scoped via RLS.

---

## Helper library — `src/lib/shoppingLists.js`

Pure functions. No React, no Supabase, no side effects. Imported by `ShoppingList` in App.jsx and by Green's RS-1 chooser.

### The contract Green's chooser must honor

```js
import { normalizeListKey } from "./lib/shoppingLists.js";

// When a scan adds an item while Krissie's on the "Costco" tab,
// the item write MUST go to:
addShoppingItem(title, "", {
  brand,
  listName: normalizeListKey(activeList),  // ← contract
});
```

This is the same key the direct-add path uses (chapter 1e). It guarantees that scanned items and typed items end up in the same list whenever Krissie is on a tab. The chooser does NOT need its own list-selection — it inherits Krissie's active tab.

### Exports (1a)

```js
export const DEFAULT_LIST_KEY  = "grocery";
export const DEFAULT_LIST_NAME = "Grocery";

// "Costco" / "costco" / " COSTCO " / "Trader  Joe's" → "costco" / "costco" / "costco" / "trader joe's"
export function normalizeListKey(input): string;

// Always returns at least { key:"grocery", name:"Grocery" } first.
// Existing entries are returned unchanged.
export function readRegistry(familySettings): Array<ListEntry>;

// Sort: lastUsedAt desc (nulls last), createdAt desc (nulls last), name asc.
// Just-used list is leftmost in the tab bar; seeded Grocery default
// lands rightmost when no other list has ever been used.
export function getOrderedLists(familySettings): Array<ListEntry>;

// Case-insensitive filter. Legacy capital-G "Grocery" items still
// match the "grocery" key. The activeKey param is auto-normalized.
export function filterItemsForList(items, activeKey): Array<Item>;

// Map<key, {total, unchecked}> — drives the pill count badges.
export function countItemsByList(items): Map<string, {total, unchecked}>;
```

### Exports (1b-1e, defined in the same file as we land each)

```js
// 1b
export function getActiveListKey(familySettings): string;
export function settingsAfterSetActive(familySettings, key): updatedSettings;

// 1a (collision check) + 1c
export function settingsAfterCreateList(familySettings, displayName): { settings, key } | { error: "collision", existing };

// 1d
export function settingsAfterRename(familySettings, oldKey, newDisplayName): { settings, newKey } | { error: "collision", existing };
export function settingsAfterDelete(familySettings, key): updatedSettings;
```

---

## UX — chapter 1 complete

### Top of Shopping page — list switcher

Horizontally-scrollable tab bar, ALWAYS shows every registered list regardless of items:

```
[ Grocery 3 ]   [ Costco · ]   [ Trader Joe's 12 ]   [ Today 5 ]   [ + New list ]
       ▲ active  ▲ empty (dot)
```

- Each pill: display name + count (`12`) or `·` for empty + active-state styling
- Active pill: filled background, higher contrast, bolder ring — readable at a glance at the store
- "+ New list" pill: stays at the end, opens inline input that commits to the registry
- Long-press on a pill (or `…` on hover for desktop) opens the **Rename / Delete** menu (chapter 1d)

### Empty-list survival (1a)

A list exists in the registry independent of items. Switching to an empty list shows:

> **No items in [Costco] yet.**
> Tap **+** to add your first thing.

Favorites and restock chips from OTHER lists do NOT pollute (existing per-list scope holds).

### Create new list (1a)

- Tap "+ New list" → inline input
- Trim, max 24 chars, validate non-empty
- Compute key via `normalizeListKey`
- **Collision check:** if the key already exists in the registry, show inline error:
  > That list already exists — switch to it instead.
  with a one-tap shortcut to set it active. Do NOT silently re-use; surface the collision so the user understands.
- On commit: write the new entry to `family_settings.shoppingLists` AND set it as `activeList`

### Rename (1d)

- Input field, validates same way as create
- Normalize new name → new key
- If new key matches old key (only casing changed): just update the entry's `name`
- If new key matches a DIFFERENT existing entry: **always-prompt** merge dialog:
  > **There's already a list called Costco.**
  > Move everything from "costco" into "Costco"? Items will keep their check state.
  > [Cancel] [Merge into Costco]
- On confirm merge: batch-rewrite every item's `list_name` from old key to new key (one `setShoppingItems` call with the diff applied), remove the old entry from registry, keep the new one's display name
- If no collision: update the registry entry's `name` and recompute `key`. Items in the DB will need a one-shot relabel because they carry the old key; the rename function does that relabel in the same setShoppingItems batch.

### Delete (1d)

- Confirmation modal: "Delete '[name]'? Items will move to '[next-most-used list]'."
- Batch-relabel items to that fallback list's key (typically `grocery`, or the next most-recently-used)
- Remove the entry from the registry
- **Hidden when only one list remains** — prevent zero-list broken state at the UI layer

### Last-active memory (1b)

- On every `setActiveList`, write `lastActiveListKey` to `family_settings.settings`
- On `ShoppingList` mount, read `familySettings.lastActiveListKey`; fall back to `"grocery"` if missing
- Per-family (key is family-scoped through `family_settings`), survives sign-out/sign-in within the same family
- Brand-new family with no key → "Grocery" (the seeded default)

**Why `family_settings` not localStorage:**
Per `feedback_localstorage_per_family.md`: localStorage is reserved for device-global state (theme, font scale). Anything per-family belongs in family_settings, which is already family-scoped via RLS. No new namespace needed.

---

## TDZ safety (recon-driven)

The ShoppingList region (App.jsx:13615-14284, 669 lines) has 8 useMemos in this declaration order:

```
availableLists → listItems → history → favorites → activeTitles → restockSuggestions → suggestions → onListBySection
```

Per the `feedback_useMemo_declaration_order_tdz.md` rule and prior incident at line 13683-13687 ("Cannot access 'F' before initialization"), declaration order is the only thing keeping this region working.

What each phase changes:

| Phase | New / changed memos | Where they slot | TDZ risk |
|---|---|---|---|
| 1a | `availableLists` rewires to read from registry. `listItems` filter uses `normalizeListKey` comparison. | Same positions as today. | none |
| 1b | None (just a useEffect for write + initial read) | n/a | none |
| 1c | Folded into 1a (collision is at create, not in a memo) | n/a | none |
| 1d | None (rename/delete are event handlers, not memos) | n/a | none |
| 1e | None (write-path change in event handlers) | n/a | none |

**Critical:** `activeList` stays inside `ShoppingList`. We do NOT lift it to a parent. That's the recurring TDZ trap. Per Mike's guardrail.

---

## Phasing — each phase is one commit, branch off `origin/main` fetch-first, exact-path staging

| Phase | Scope | Time | Ships value |
|---|---|---|---|
| **1a. Registry + read paths + tab bar + create-into-registry** | `src/lib/shoppingLists.js` + App.jsx ShoppingList: registry-backed `availableLists`, tab bar with empty-list survival, `+ New` commits to registry with normalized key + collision check. | 2-3h | Krissie sees "Costco" tab even when empty. New lists persist. Same-key collisions caught at create. |
| **1b. Last-active memory** | `lastActiveListKey` write on switch, read on mount, fallback to "grocery". | 30m | App reopens on the right tab. |
| **1d. Rename + delete** | Long-press menu, RenameSheet, DeleteSheet, always-prompt merge dialog, batch item-relabel, hide-delete-when-one-list-remains. | 2-3h | Krissie can rename "today" → "Today's run", delete old "Costco" when done shopping. |
| **1e. Item-write path uses normalized key** | `addShoppingItem` paths pass `normalizeListKey(activeList)` so all NEW writes are consistent. Legacy items keep original casing — read path is case-insensitive. | 30m | Forward-clean data. Green's chooser inherits the same contract. |

(1c folded into 1a per scope analysis above — collision check is part of create.)

**Each phase preview-gated where visual.** 1a + 1d are visual (require iOS-Safari mobile-viewport preview, both short-content and long-content states, before commit). 1b + 1e are non-visual (state/data only) — verification via DB inspection on local stack.

---

## Pre-commit verification — checklist for every commit

- Branch off `origin/main` fetch-first, exact-path staging, single-purpose commit, hooks not bypassed
- Visual change → local preview on mobile viewport (390×844), both SHORT content (one list, zero items) and LONG content (one list, 30+ items)
- Data-mutating test → local Supabase stack (`supabase start`), never prod
- If two iterations don't get the visual right → STOP and restate the goal from scratch
- HOLD for explicit push/merge approval after preview review

---

## Coordination contract with Green (RS-1 Commit B)

Green's chooser sits in the **same scan-area region** of `ShoppingList` (around the `scanning`/`scanResults`/`scanKind` state, App.jsx ~13975-14060). His chooser swaps the scan area UI to ask "what are you scanning — receipt / shopping item / barcode?"

**Layout-wise:** chapter 1's list-switcher tab bar lives at the very TOP of the component (current line 13909). Green's chooser lives in the MIDDLE (scan area). They don't overlap. No conflict.

**Behavioral contract for the scan flow:**

```js
// Green's chooser, when a scan resolves a new item:
addShoppingItem(title, "", {
  brand,
  listName: normalizeListKey(activeList),   // ← USE THIS HELPER
});
```

- Same key the direct-add path uses (chapter 1e)
- Scanning while on "Costco" tab → item goes into the Costco list
- The chooser does NOT need its own list-selection — it inherits Krissie's active tab

**Coordination order:** Black goes first in the App.jsx relay. After Black's 1a merges, Green rebases his Commit B onto that and follows the same `normalizeListKey(activeList)` contract.

---

## Out of scope (named to prevent scope creep)

- **Chapter 2 — Staples** (cross-list "stuff we buy a lot"): separate brick, needs a new aggregation memo reading across ALL items not just `listItems`. Builds on the chapter 1 foundation.
- **Chapter 3 — Receipt promotion** (Green's RS-2): orthogonal, owns its own lane.
- **Chapter 4 — Inventory** as its own concept (pantry / what-we-have-at-home, distinct from to-buy): schema work, Green's lane, staging gated. Natural moment to also promote shopping lists into a real table if we want.
- Per-list color / icon / order: registry shape supports it, no UI in chapter 1.
- Sharing lists between families: far future.
- Drag-to-reorder lists: polish post-chapter-1.

---

## Files Phase 1a touches

| File | Change |
|---|---|
| `src/lib/shoppingLists.js` | NEW — pure helpers + the `normalizeListKey(activeList)` contract for Green |
| `src/App.jsx` | ShoppingList region only: `availableLists` source, tab bar render with empty-list survival, `+ New` writes to registry |
| `supabase/migrations/` | None |

Estimated diff: ~150-200 lines additive (mostly the new lib file), ~30 lines modified in App.jsx, no deletions of working logic.

---

## Memory references the executor should consult

- `feedback_useMemo_declaration_order_tdz.md` — Shopping is one of two known TDZ-fragile components. Keep new memos out of the existing chain unless absolutely necessary; never lift `activeList` to a parent.
- `feedback_localstorage_per_family.md` — `family_settings` is the right home for per-family persistence, NOT localStorage. localStorage is for device-global state only.
- `feedback_no_bulk_git_add.md` — exact-path staging only, no `git add -A`.
- `feedback_simple_for_busy_parents.md` — one-tap flows, no menus when a tap will do.
- `feedback_no_hidden_info_breaks_trust.md` — counts shown in pill badges must match reality (no fudging zero, no rounding).
- `feedback_no_private_names_in_shared_strings.md` — placeholder text and example list names must not include Lynch / friend names. Use generic ("Costco", "Target", "Trader Joe's", "Today's run").
- `feedback_match_status_vocab_to_constraint.md` — N/A for chapter 1 (no DB constraints), but worth re-checking before chapter 1d's merge logic touches `shopping_items` rows.
- `multi_agent_coordination.md` — Green is in the same App.jsx region (RS-1 Commit B). Black goes first; Green rebases after.
