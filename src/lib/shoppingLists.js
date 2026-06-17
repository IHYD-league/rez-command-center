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
 * Two-mode behavior (chapter 1d):
 * * If ANY entry has a numeric `position` field set, the registry is
 *   in MANUAL order — sort by position ascending. Manual order
 *   overrides recency, per Mike's directive ("manual order, once
 *   set, OVERRIDES the lastUsedAt-desc default"). Entries without a
 *   position fall to the end, sorted by name asc as the tiebreaker
 *   (covers newly-created lists that haven't been reordered yet).
 * * Otherwise (the chapter 1a/1b default), sort by:
 *     lastUsedAt desc (nulls last) → createdAt desc (nulls last) →
 *     name asc. Just-used list is leftmost.
 *
 * The seeded Grocery default (createdAt + lastUsedAt both null,
 * position null) lands rightmost in the default mode only when no
 * other list has been used either.
 *
 * Returns a new array — does not mutate input.
 */
export function getOrderedLists(familySettings) {
  const arr = readRegistry(familySettings);
  const hasManualOrder = arr.some(
    (e) => e && typeof e.position === "number"
  );
  if (hasManualOrder) {
    return arr.slice().sort((a, b) => {
      const aHas = typeof a?.position === "number";
      const bHas = typeof b?.position === "number";
      if (aHas && bHas) {
        if (a.position !== b.position) return a.position - b.position;
        return (a?.name || "").localeCompare(b?.name || "");
      }
      if (aHas && !bHas) return -1;
      if (!aHas && bHas) return 1;
      return (a?.name || "").localeCompare(b?.name || "");
    });
  }
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
 * Resolve the current active list key from family_settings.
 *
 * Reads family_settings.lastActiveListKey (chapter 1b), validates that
 * it still corresponds to an entry in the registry (defends against
 * stale references to a deleted list — which 1d will produce), and
 * falls back to "grocery" when missing or invalid. The fallback is
 * also what brand-new families see on first open.
 *
 * Pure: no side effects.
 */
export function getActiveListKey(familySettings) {
  const stored = familySettings?.lastActiveListKey;
  const registry = readRegistry(familySettings);
  if (
    typeof stored === "string" &&
    stored.length > 0 &&
    registry.some((e) => e.key === stored)
  ) {
    return stored;
  }
  return DEFAULT_LIST_KEY;
}

/**
 * Resolve the current active list entry (key + display name + dates)
 * from family_settings. Used by ShoppingList's lazy state initializer
 * to land Krissie on the right tab on mount.
 *
 * Always returns a usable entry — falls back to a synthesized
 * Grocery default if the registry is empty (shouldn't happen after
 * readRegistry but defensive).
 */
export function getActiveListEntry(familySettings) {
  const key = getActiveListKey(familySettings);
  const registry = readRegistry(familySettings);
  return (
    registry.find((e) => e.key === key) || {
      key: DEFAULT_LIST_KEY,
      name: DEFAULT_LIST_NAME,
      createdAt: null,
      lastUsedAt: null,
    }
  );
}

/**
 * Build a new family_settings object with lastActiveListKey set to the
 * normalized form of the input. Accepts either a display name
 * ("Costco") or a pre-normalized key ("costco") — both end up at
 * "costco".
 *
 * Pure: caller persists via setFamilySettings.
 */
export function settingsAfterSetActive(familySettings, displayNameOrKey) {
  const normalized =
    normalizeListKey(displayNameOrKey) || DEFAULT_LIST_KEY;
  return {
    ...(familySettings || {}),
    lastActiveListKey: normalized,
  };
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
  // 1d — if the registry is in manual order (anyone has a position
  // field), new lists land at the END so Krissie's arrangement is
  // preserved. Use max(position) + 1 to avoid colliding with an
  // existing slot. If no manual order is set, position stays null
  // and the entry gets the recency-default treatment.
  const positions = current
    .map((e) => e?.position)
    .filter((p) => typeof p === "number");
  if (positions.length > 0) {
    entry.position = Math.max(...positions) + 1;
  }
  // Preserve all other settings keys; only the shoppingLists array
  // is replaced. The Grocery default is included via readRegistry if
  // it wasn't there before — this is the moment it persists.
  const nextLists = [...current, entry];
  return {
    settings: { ...(familySettings || {}), shoppingLists: nextLists },
    key,
  };
}

/**
 * Rename a list — either casing-only ("costco" → "Costco" same key)
 * or a real key change ("Taget" → "Target", new key).
 *
 * Returns one of:
 *   { settings, newKey, casingOnly: true }    — display name only
 *   { settings, newKey, casingOnly: false }   — real rename (items
 *                                                need batch relabel)
 *   { error: "collision", existing, oldEntry } — new key clashes
 *   { error: "empty" }
 *   { error: "not_found" }
 *
 * On collision, the caller MUST prompt the merge ("move everything
 * from X into Y?") per Mike's directive — never silent. The
 * { existing, oldEntry } in the return give the caller everything
 * needed to render that prompt; on confirm, call
 * settingsAfterMerge separately to apply the merge.
 *
 * On a real (non-casing-only) rename, the caller must batch-
 * relabel shopping_items.list_name from oldKey to newKey alongside
 * the family_settings write — otherwise existing items orphan to
 * the old key. Pure helpers can't do that side; the caller owns it.
 *
 * Pure: caller persists via setFamilySettings.
 */
export function settingsAfterRename(familySettings, oldKey, newDisplayName) {
  const name = (typeof newDisplayName === "string" ? newDisplayName : "")
    .trim()
    .slice(0, 24);
  if (!name) return { error: "empty" };
  const newKey = normalizeListKey(name);
  if (!newKey) return { error: "empty" };
  const registry = readRegistry(familySettings);
  const oldEntry = registry.find((e) => e.key === oldKey);
  if (!oldEntry) return { error: "not_found" };

  if (newKey === oldKey) {
    // Casing-only change — items keep their current list_name, just
    // update the display name on the entry.
    const updated = registry.map((e) =>
      e.key === oldKey ? { ...e, name } : e
    );
    return {
      settings: { ...(familySettings || {}), shoppingLists: updated },
      newKey,
      casingOnly: true,
    };
  }

  const existing = registry.find((e) => e.key === newKey);
  if (existing) {
    return { error: "collision", existing, oldEntry };
  }

  // Real rename. Update the entry's key + name; items still carry
  // the old key in shopping_items.list_name and need a separate
  // batch relabel from the caller.
  const updated = registry.map((e) =>
    e.key === oldKey ? { ...e, key: newKey, name } : e
  );
  const nextSettings = { ...(familySettings || {}), shoppingLists: updated };
  // If the renamed list was the active one, update lastActiveListKey
  // so the activated tab follows the rename.
  if (familySettings?.lastActiveListKey === oldKey) {
    nextSettings.lastActiveListKey = newKey;
  }
  return { settings: nextSettings, newKey, casingOnly: false };
}

/**
 * Merge `fromKey` into `toKey`. Removes the from entry from the
 * registry; the surviving to entry keeps its name/casing/position.
 * If `fromKey` was the active list, lastActiveListKey switches to
 * `toKey` so Krissie doesn't end up on a deleted tab.
 *
 * Caller MUST batch-relabel shopping_items.list_name from fromKey
 * to toKey alongside this settings write.
 *
 * Pure: caller persists via setFamilySettings.
 */
export function settingsAfterMerge(familySettings, fromKey, toKey) {
  const registry = readRegistry(familySettings);
  const fromEntry = registry.find((e) => e.key === fromKey);
  const toEntry = registry.find((e) => e.key === toKey);
  if (!fromEntry || !toEntry) return { error: "not_found" };

  const updated = registry.filter((e) => e.key !== fromKey);
  const nextSettings = { ...(familySettings || {}), shoppingLists: updated };
  if (familySettings?.lastActiveListKey === fromKey) {
    nextSettings.lastActiveListKey = toKey;
  }
  return { settings: nextSettings, fromKey, toKey };
}

/**
 * Delete a list. Returns the new settings + the fallback key that
 * orphan items should move to. The caller MUST batch-relabel
 * shopping_items.list_name from the deleted key to fallbackKey.
 *
 * Cannot delete the last remaining list (returns
 * { error: "last_remaining" }) — chapter 1d's UI also hides the
 * delete affordance when only one list remains, but the helper
 * enforces this server-of-truth-style for safety.
 *
 * Pure: caller persists via setFamilySettings.
 */
export function settingsAfterDelete(familySettings, key) {
  const registry = readRegistry(familySettings);
  if (registry.length <= 1) return { error: "last_remaining" };
  const entry = registry.find((e) => e.key === key);
  if (!entry) return { error: "not_found" };

  const updated = registry.filter((e) => e.key !== key);
  // Items in the deleted list move to Grocery default if it still
  // exists, otherwise the first remaining list.
  const fallback =
    updated.find((e) => e.key === DEFAULT_LIST_KEY) || updated[0];
  const nextSettings = { ...(familySettings || {}), shoppingLists: updated };
  if (familySettings?.lastActiveListKey === key) {
    nextSettings.lastActiveListKey = fallback.key;
  }
  return { settings: nextSettings, fallbackKey: fallback.key };
}

/**
 * Reorder the registry. `orderedKeys` is the array of keys in the
 * NEW desired order. Each entry gets a position assigned matching
 * its index. Any entry not in `orderedKeys` is appended at the end
 * with position = length so legacy entries don't vanish.
 *
 * Once ANY entry has a position assigned, getOrderedLists switches
 * to manual-order mode and the recency default is dormant until
 * positions are cleared.
 *
 * Pure: caller persists via setFamilySettings.
 */
export function settingsAfterReorder(familySettings, orderedKeys) {
  const registry = readRegistry(familySettings);
  const seen = new Set();
  const updated = [];
  for (let i = 0; i < (orderedKeys || []).length; i++) {
    const key = orderedKeys[i];
    const entry = registry.find((e) => e.key === key);
    if (!entry || seen.has(key)) continue;
    updated.push({ ...entry, position: i });
    seen.add(key);
  }
  for (const entry of registry) {
    if (!seen.has(entry.key)) {
      updated.push({ ...entry, position: updated.length });
      seen.add(entry.key);
    }
  }
  return {
    settings: { ...(familySettings || {}), shoppingLists: updated },
  };
}
