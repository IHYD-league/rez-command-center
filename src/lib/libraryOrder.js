// Shared shelf-order helpers used by both MusicLibrary and ReadingLibrary.
//
// The order is stored as an array of ids on familySettings.libraryOrder
// (one key per domain: "songs" and "books"). When the Shelf view is
// active, items render in this order. New additions appear at the end
// without breaking saved curation; removed items are silently dropped.

// Reorder a list to follow a saved id sequence. Items in `list` not in
// `orderIds` are appended at the end in their original order; ids in
// `orderIds` that don't exist in `list` are skipped silently.
export function applyCustomOrder(list, orderIds) {
  if (!Array.isArray(orderIds) || orderIds.length === 0) return list;
  const byId = new Map(list.map((x) => [x.id, x]));
  const out = [];
  const seen = new Set();
  for (const id of orderIds) {
    const item = byId.get(id);
    if (item) {
      out.push(item);
      seen.add(id);
    }
  }
  for (const item of list) {
    if (!seen.has(item.id)) out.push(item);
  }
  return out;
}

// Move an id one position left (direction=-1) or right (direction=+1)
// inside the curated order. Seeds the order from the current visible
// list when no order is saved yet, so the first nudge moves the item
// from "wherever it currently sits in the sort" — exactly what the
// parent sees on screen. Drops stale ids and appends new items so
// the saved order can never go out of sync with the catalog.
export function nudgeOrder(currentOrder, visibleList, targetId, direction) {
  const seed = (currentOrder && currentOrder.length > 0)
    ? [...currentOrder]
    : visibleList.map((x) => x.id);
  const visibleIds = new Set(visibleList.map((x) => x.id));
  let clean = seed.filter((id) => visibleIds.has(id));
  for (const item of visibleList) {
    if (!clean.includes(item.id)) clean.push(item.id);
  }
  const idx = clean.indexOf(targetId);
  if (idx < 0) return clean;
  const swap = idx + direction;
  if (swap < 0 || swap >= clean.length) return clean;
  [clean[idx], clean[swap]] = [clean[swap], clean[idx]];
  return clean;
}
