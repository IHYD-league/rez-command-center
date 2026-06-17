// Shopping list registry — pure functions.
//
// CHAPTER 1 (list navigation) of the Food Hub stack. See
// docs/SHOPPING-LISTS-CHAPTER-1-PLAN.md for the full spec.
//
// The registry lives in family_settings.settings.shoppingLists as a
// jsonb array of { key, name, createdAt, lastUsedAt } entries. The
// key is the normalized (lower + trim + collapse-whitespace) identifier
// — what shopping_items.list_name stores after chapter 1e. The name
// preserves the family's chosen display casing.
//
// THE CONTRACT FOR CO-AUTHORS (Green's RS-1 Commit B chooser):
//
//   Any code path that writes a shopping_items row from ShoppingList —
//   direct-add, scan-add, future imports — MUST pass:
//
//     listName: normalizeListKey(activeList)
//
//   where `activeList` is the current display label the user has
//   selected. This guarantees that scanned items and typed items end
//   up in the same bucket whenever Krissie is on a given tab. A scan
//   from the "Costco" tab goes into the Costco list, no second
//   selection prompt needed. Green's chooser does NOT need its own
//   list-selection — it inherits Krissie's active tab.
//
// Functions are pure: input → output, no React, no Supabase, no
// global state. Memoizable in callers without TDZ surprises.

export const DEFAULT_LIST_KEY = "grocery";
export const DEFAULT_LIST_NAME = "Grocery";

/**
 * Normalize a list name into its stable storage key.
 *
 * "Costco" / "costco" / " COSTCO " / "Trader  Joe's" all collapse to
 * "costco" / "costco" / "costco" / "trader joe's". This is what
 * solves the case-collision split — every family-typed variant of a
 * list name lands on the same key. Display casing is preserved
 * separately on the registry entry's `name` field.
 *
 * Safe on null/undefined/non-string input (returns "").
 */
export function normalizeListKey(input) {
  if (typeof input !== "string") return "";
  return input.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Read the registry out of family_settings, always returning at least
 * the Grocery default first.
 *
 * Reconciliation: if the stored registry is missing, empty, or doesn't
 * contain a "grocery" entry, the default is synthesized into the
 * returned array (with null createdAt/lastUsedAt — "never explicitly
 * created or used, but always available"). The caller can persist
 * this back via setFamilySettings the first time it writes anything.
 *
 * Returns a new array — does not mutate input.
 */
export function readRegistry(familySettings) {
  const stored = familySettings?.shoppingLists;
  const arr = Array.isArray(stored) ? stored.slice() : [];
  const hasGrocery = arr.some(
    (e) => e && e.key === DEFAULT_LIST_KEY
  );
  if (!hasGrocery) {
    arr.unshift({
      key: DEFAULT_LIST_KEY,
      name: DEFAULT_LIST_NAME,
      createdAt: null,
      lastUsedAt: null,
    });
  }
  return arr;
}

/**
 * Sort the registry for tab-bar render order.
 *
 * Order: lastUsedAt desc (nulls last) → createdAt desc (nulls last) →
 * name asc. The just-used list lands leftmost so Krissie's most
 * recent context is the easiest tap. The seeded Grocery default
 * (createdAt + lastUsedAt both null) lands rightmost only when no
 * other list has been used either — once any list has activity,
 * lastUsedAt wins and Grocery falls into its natural slot.
 *
 * Returns a new array — does not mutate input.
 */
export function getOrderedLists(familySettings) {
  const arr = readRegistry(familySettings);
  return arr.slice().sort((a, b) => {
    const aUsed = a?.lastUsedAt || "";
    const bUsed = b?.lastUsedAt || "";
    if (aUsed && bUsed && aUsed !== bUsed) return bUsed.localeCompare(aUsed);
    if (aUsed && !bUsed) return -1;
    if (!aUsed && bUsed) return 1;
    const aCre = a?.createdAt || "";
    const bCre = b?.createdAt || "";
    if (aCre && bCre && aCre !== bCre) return bCre.localeCompare(aCre);
    if (aCre && !bCre) return -1;
    if (!aCre && bCre) return 1;
    return (a?.name || "").localeCompare(b?.name || "");
  });
}

/**
 * Filter a shopping_items array to one list, case-insensitively.
 *
 * Pre-chapter-1 items in the DB carry list_name = "Grocery" (capital
 * G — the historical default). Chapter 1e writes lowercased keys.
 * This filter normalizes both sides on read so legacy and forward-
 * clean items coexist without a backfill migration. An item with no
 * list_name is treated as belonging to the default Grocery list.
 *
 * activeKey is auto-normalized — callers may pass the display label
 * or the already-normalized key.
 */
export function filterItemsForList(items, activeKey) {
  const target = normalizeListKey(activeKey) || DEFAULT_LIST_KEY;
  return (items || []).filter((it) => {
    const itemKey =
      normalizeListKey(it?.listName) || DEFAULT_LIST_KEY;
    return itemKey === target;
  });
}

/**
 * Tally per-list counts for the tab-bar badges.
 *
 * Returns Map<key, { total, unchecked }>. Both numbers reflect what
 * the user will actually see — `total` includes checked items the
 * user can still see if they expand "done"; `unchecked` is the
 * "still to buy" count typically rendered next to the pill. Per the
 * no-hidden-info-breaks-trust rule, callers should show whichever
 * number matches the on-screen partition exactly.
 *
 * Items with no list_name are bucketed under the default Grocery
 * key, same as the filter helper. Pending kid-requests and declined
 * items are NOT excluded here — that's a render-layer concern.
 */
export function countItemsByList(items) {
  const map = new Map();
  for (const it of items || []) {
    const key = normalizeListKey(it?.listName) || DEFAULT_LIST_KEY;
    const entry = map.get(key) || { total: 0, unchecked: 0 };
    entry.total += 1;
    if (!it?.checked) entry.unchecked += 1;
    map.set(key, entry);
  }
  return map;
}

/**
 * Build a new family_settings object with a fresh list added to the
 * registry. Used by the "+ New list" affordance.
 *
 * Returns either { settings, key } on success or
 * { error: "collision", existing } when the normalized key already
 * exists. Per Mike's directive, the collision is surfaced — never
 * silently re-used — so the caller can show "That list already
 * exists — switch to it instead" and offer a one-tap shortcut.
 *
 * Trims, max 24 chars on the display name; empty name returns
 * { error: "empty" }.
 *
 * This function is pure: it does not write to Supabase. The caller
 * is responsible for calling setFamilySettings with the returned
 * `settings` object.
 */
export function settingsAfterCreateList(familySettings, displayName) {
  const name = (typeof displayName === "string" ? displayName : "")
    .trim()
    .slice(0, 24);
  if (!name) return { error: "empty" };
  const key = normalizeListKey(name);
  if (!key) return { error: "empty" };
  const current = readRegistry(familySettings);
  const collision = current.find((e) => e.key === key);
  if (collision) return { error: "collision", existing: collision };
  const now = new Date().toISOString();
  const entry = { key, name, createdAt: now, lastUsedAt: now };
  // Preserve all other settings keys; only the shoppingLists array
  // is replaced. The Grocery default is included via readRegistry if
  // it wasn't there before — this is the moment it persists.
  const nextLists = [...current, entry];
  return {
    settings: { ...(familySettings || {}), shoppingLists: nextLists },
    key,
  };
}
