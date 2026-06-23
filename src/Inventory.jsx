import React, { useMemo, useState, useEffect } from "react";
import { X, Package, Star, Plus, PackageCheck, PackageX, Check, Inbox, MessageSquare } from "lucide-react";
import {
  SECTION_ORDER as SHOPPING_SECTION_ORDER,
  SECTION_EMOJI as SHOPPING_SECTION_EMOJI,
} from "./lib/shoppingSections.js";
import {
  readRegistry as readListRegistry,
  settingsAfterCreateList,
} from "./lib/shoppingLists.js";

// Inventory — Bricks A + B + C1 + C2 of the Food Hub Inventory stack.
//
// Reads every alive shopping_items row as inventory, grouped by store
// section. Brick layers:
//   • B: Default-store picker + ⭐ Buy-often star toggle.
//   • C1: Stock status — green ✓ default, tap to mark out of stock
//     (greys + strikes + sinks). Items linger in the current tab
//     until filter / nav change so the parent sees what they did.
//   • C2: Requests tab — surfaces items with non-null requestStatus
//     (pending / approved / declined) grouped by sub-status. Reuses
//     the existing kid-request mechanism on shopping_items
//     (requestStatus + decideShoppingRequest); ShoppingList's inline
//     approve UI keeps working in parallel — both surfaces stay in
//     sync via the synced setter.
//   • Filters: All / In stock / Out of stock / Requests / Buy often /
//     By store / Untagged.
//
// Writes go through updateShoppingItem + decideShoppingRequest (same
// synced setters the existing flows use), so transforms + PostgREST
// batch normalization apply consistently. No new write paths.

function inventoryItems(shoppingItems) {
  return (shoppingItems || []).filter((it) => it && !it.deletedAt);
}

function groupBySection(items) {
  const groups = new Map();
  for (const s of SHOPPING_SECTION_ORDER) groups.set(s, []);
  for (const it of items) {
    const sec = it.section && groups.has(it.section) ? it.section : "Other";
    groups.get(sec).push(it);
  }
  // Sort within each section: in-stock first (alpha), then out-of-stock
  // (alpha). Matches the checked/bought sink-to-bottom pattern in
  // ShoppingList — out-of-stock items stay on the list but drop below
  // the in-stock ones so the buy-list isn't fighting the catalog.
  for (const arr of groups.values()) {
    arr.sort((a, b) => {
      const aOut = a.inStock === false;
      const bOut = b.inStock === false;
      if (aOut !== bOut) return aOut ? 1 : -1;
      return (a.title || "").localeCompare(b.title || "");
    });
  }
  return groups;
}

export default function Inventory({
  shoppingItems = [],
  updateShoppingItem = null,
  decideShoppingRequest = null,
  familySettings = {},
  setFamilySettings = null,
  user = null,
  users = [],
}) {
  const isKid = user?.role === "kid";
  const allItems = useMemo(() => inventoryItems(shoppingItems), [shoppingItems]);
  const [selectedId, setSelectedId] = useState(null);

  // Filter mode + the "By store" sub-key. byStoreKey is the normalized
  // store key (e.g. "costco") when filterMode === "byStore"; falls
  // back to the first available store on switch-in.
  const [filterMode, setFilterMode] = useState("all"); // all | inStock | outOfStock | requests | buyOften | byStore | untagged
  const [byStoreKey, setByStoreKey] = useState(null);

  // Lingering set — IDs the parent toggled this tab-session. While an
  // item is lingering, the current filter shows it even when its
  // updated state would normally hide it. Lets a parent see what they
  // just did (struck-out + greyed in place) instead of items vanishing
  // mid-sweep. Cleared when the filter tab changes OR the component
  // unmounts (navigating away from Inventory). Same intent Mike
  // described — "stays until we goto another page or tab."
  const [lingeringIds, setLingeringIds] = useState(() => new Set());
  // Frozen sub-group lookup for the Requests tab. Records the
  // requestStatus an item HAD when the parent first acted on it this
  // session, so an approve/decline tap doesn't snap the item out of
  // its current sub-group. Cleared on filter / by-store change.
  // Same "don't yank it on tap" intent as the C1 stock-toggle linger.
  const [frozenStatus, setFrozenStatus] = useState(() => new Map());
  useEffect(() => {
    setLingeringIds(new Set());
    setFrozenStatus(new Map());
  }, [filterMode, byStoreKey]);

  const markLingering = (id) => {
    setLingeringIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };
  const freezeStatusIfNeeded = (id, currentStatus) => {
    setFrozenStatus((prev) => {
      if (prev.has(id)) return prev;
      const next = new Map(prev);
      next.set(id, currentStatus || "pending");
      return next;
    });
  };
  const effectiveStatus = (it) => frozenStatus.get(it.id) || it.requestStatus || null;

  const stores = useMemo(() => readListRegistry(familySettings), [familySettings]);

  // Stores that actually appear on items (so "By store" can default
  // to a home store that's in use rather than an empty tab).
  const usedStoreKeys = useMemo(() => {
    const s = new Set();
    for (const it of allItems) {
      if (it.defaultStore) s.add(it.defaultStore);
    }
    return s;
  }, [allItems]);

  const filtered = useMemo(() => {
    // Lingering rule: items toggled this tab-session stay visible
    // even when the filter would normally hide them. Symmetric — works
    // for in-stock ⇄ out-of-stock and for buy-often / untagged toggles
    // too. Filter changes (handled by the useEffect above) clear the
    // set, at which point items snap to their honest filter position.
    const lingers = (it) => lingeringIds.has(it.id);
    if (filterMode === "inStock") return allItems.filter((it) => it.inStock !== false || lingers(it));
    if (filterMode === "outOfStock") return allItems.filter((it) => it.inStock === false || lingers(it));
    if (filterMode === "requests") {
      return allItems.filter((it) => it.requestStatus != null || lingers(it));
    }
    if (filterMode === "buyOften") return allItems.filter((it) => !!it.buyOften || lingers(it));
    if (filterMode === "untagged") return allItems.filter((it) => !it.defaultStore || lingers(it));
    if (filterMode === "byStore" && byStoreKey) {
      return allItems.filter((it) => it.defaultStore === byStoreKey || lingers(it));
    }
    return allItems;
  }, [allItems, filterMode, byStoreKey, lingeringIds]);

  const grouped = useMemo(() => groupBySection(filtered), [filtered]);

  const total = allItems.length;
  const inStockCount = useMemo(() => allItems.filter((it) => it.inStock !== false).length, [allItems]);
  const outOfStockCount = useMemo(() => allItems.filter((it) => it.inStock === false).length, [allItems]);
  const pendingCount = useMemo(() => allItems.filter((it) => it.requestStatus === "pending").length, [allItems]);
  const buyOftenCount = useMemo(() => allItems.filter((it) => it.buyOften).length, [allItems]);
  const untaggedCount = useMemo(() => allItems.filter((it) => !it.defaultStore).length, [allItems]);
  const selected = useMemo(
    () => (selectedId ? allItems.find((it) => it.id === selectedId) || null : null),
    [allItems, selectedId],
  );

  const canWrite = typeof updateShoppingItem === "function";
  const canEditRegistry = typeof setFamilySettings === "function";

  // Switching INTO "By store" mode: default to the first store that
  // actually has items tagged; if none, the first registry entry.
  const onSelectByStore = () => {
    setFilterMode("byStore");
    if (!byStoreKey) {
      const first = stores.find((s) => usedStoreKeys.has(s.key)) || stores[0];
      if (first) setByStoreKey(first.key);
    }
  };

  return (
    <div className="px-4 pt-4 pb-8">
      <div
        className="rounded-2xl p-4 mb-3 text-white relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0369a1 0%, #0891b2 55%, #0e7490 100%)" }}
      >
        <Package size={56} className="absolute -right-2 -top-2 text-white/15" />
        <div className="text-[10px] uppercase tracking-widest font-extrabold text-white/80">Inventory</div>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-4xl font-extrabold leading-none">{total}</span>
          <span className="text-sm font-bold text-white/80">{total === 1 ? "item" : "items"} we buy</span>
        </div>
        <div className="text-[11px] text-white/75 mt-2 leading-snug">
          Everything you've added to the shopping list. Tag a home store, star buy-often.
        </div>
      </div>

      <div className="flex gap-1.5 mb-3 overflow-x-auto -mx-1 px-1 pb-1">
        <FilterPill active={filterMode === "all"} onClick={() => setFilterMode("all")}>
          All <span className="opacity-70">· {total}</span>
        </FilterPill>
        <FilterPill active={filterMode === "inStock"} onClick={() => setFilterMode("inStock")}>
          In stock <span className="opacity-70">· {inStockCount}</span>
        </FilterPill>
        <FilterPill active={filterMode === "outOfStock"} onClick={() => setFilterMode("outOfStock")} tone="rose">
          Out of stock <span className="opacity-70">· {outOfStockCount}</span>
        </FilterPill>
        <FilterPill active={filterMode === "requests"} onClick={() => setFilterMode("requests")} tone="indigo">
          Requests{pendingCount > 0 ? <span className="opacity-90"> · {pendingCount}</span> : null}
        </FilterPill>
        <FilterPill active={filterMode === "buyOften"} onClick={() => setFilterMode("buyOften")}>
          ⭐ Buy often <span className="opacity-70">· {buyOftenCount}</span>
        </FilterPill>
        <FilterPill active={filterMode === "byStore"} onClick={onSelectByStore}>
          By store
        </FilterPill>
        <FilterPill active={filterMode === "untagged"} onClick={() => setFilterMode("untagged")}>
          Untagged <span className="opacity-70">· {untaggedCount}</span>
        </FilterPill>
      </div>

      {filterMode === "byStore" && (
        <div className="flex gap-1.5 mb-3 overflow-x-auto -mx-1 px-1 pb-1">
          {stores.map((s) => {
            const n = allItems.filter((it) => it.defaultStore === s.key).length;
            return (
              <FilterPill key={s.key} active={byStoreKey === s.key} onClick={() => setByStoreKey(s.key)} tone="amber">
                {s.name} <span className="opacity-70">· {n}</span>
              </FilterPill>
            );
          })}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="rounded-2xl bg-white border border-slate-100 p-6 text-center text-sm text-slate-500">
          {filterMode === "inStock" && "Nothing in stock right now — every item is on the buy-list."}
          {filterMode === "outOfStock" && "Nothing out of stock — fully stocked."}
          {filterMode === "requests" && "No requests yet. Anyone in the family can request an item from its detail sheet."}
          {filterMode === "buyOften" && "Nothing starred yet — tap an item, then ⭐ Buy often."}
          {filterMode === "untagged" && "Every item has a home store — nice."}
          {filterMode === "byStore" && "Nothing tagged for this store yet."}
          {filterMode === "all" && "Nothing in inventory yet. Add items via the Shopping List — they'll show up here."}
        </div>
      )}

      {filterMode === "requests" && filtered.length > 0 && (
        <RequestsView
          items={filtered}
          users={users}
          canDecide={!isKid && typeof decideShoppingRequest === "function"}
          effectiveStatus={effectiveStatus}
          onDecide={(it, decision, reason) => {
            freezeStatusIfNeeded(it.id, it.requestStatus);
            markLingering(it.id);
            decideShoppingRequest?.(it.id, decision, reason);
          }}
        />
      )}

      {filterMode !== "requests" && SHOPPING_SECTION_ORDER.map((sec) => {
        const list = grouped.get(sec) || [];
        if (list.length === 0) return null;
        return (
          <div key={sec} className="mb-4">
            <div className="flex items-baseline justify-between px-1 mb-1.5">
              <div className="flex items-center gap-1.5 font-extrabold text-slate-700 text-sm">
                <span className="text-base">{SHOPPING_SECTION_EMOJI[sec] || "🛒"}</span>
                <span>{sec}</span>
              </div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                {list.length} {list.length === 1 ? "item" : "items"}
              </div>
            </div>
            <div className="rounded-2xl bg-white border border-slate-100 overflow-hidden">
              {list.map((it, i) => {
                const storeName = it.defaultStore
                  ? (stores.find((s) => s.key === it.defaultStore)?.name || it.defaultStore)
                  : null;
                const outOfStock = it.inStock === false;
                return (
                  <div
                    key={it.id}
                    className={`w-full flex items-center gap-3 p-3 ${i > 0 ? "border-t border-slate-100" : ""} ${outOfStock ? "bg-slate-50" : ""}`}
                  >
                    {/* One-tap stock toggle — mirrors ShoppingList's
                        check-circle pattern but in reverse: the green
                        check is the DEFAULT (item is on hand), and
                        tapping it marks it out of stock. Color-coded
                        for at-a-glance scan: green ✓ = on hand, rose
                        ✕ = out / on the buy-list. After a tap the row
                        also greys + strikes + sinks (driven by the
                        sort) — and the lingering set keeps it visible
                        in the current tab until filter / nav change,
                        so the parent sees what they just did. */}
                    {canWrite ? (
                      <button
                        type="button"
                        onClick={() => {
                          updateShoppingItem(it.id, { inStock: outOfStock });
                          setLingeringIds((prev) => {
                            const next = new Set(prev);
                            next.add(it.id);
                            return next;
                          });
                        }}
                        aria-label={outOfStock ? "Mark in stock" : "Mark out of stock"}
                        title={outOfStock ? "Mark in stock" : "Mark out of stock"}
                        className={`w-7 h-7 rounded-full grid place-items-center shrink-0 transition active:scale-90 ${outOfStock ? "bg-rose-500 text-white border border-rose-500" : "bg-emerald-500 text-white border border-emerald-500"}`}
                      >
                        {outOfStock ? <X size={14} strokeWidth={3} /> : <Check size={15} strokeWidth={3} />}
                      </button>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-emerald-500 grid place-items-center shrink-0 text-white">
                        <Check size={15} strokeWidth={3} />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedId(it.id)}
                      className="flex-1 min-w-0 text-left active:opacity-70"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        {it.buyOften && <Star size={13} className={`shrink-0 ${outOfStock ? "text-slate-300 fill-slate-200" : "text-amber-500 fill-amber-400"}`} />}
                        <div className={`font-semibold text-sm leading-snug truncate ${outOfStock ? "line-through text-slate-400" : "text-slate-800"}`}>
                          {it.title || "(no title)"}
                        </div>
                      </div>
                      {it.brand && (
                        <div className={`text-[11px] font-bold truncate mt-0.5 ${outOfStock ? "text-slate-400 line-through" : "text-amber-700"}`}>
                          {it.brand}
                        </div>
                      )}
                      {storeName && (
                        <div className={`text-[10px] uppercase tracking-wider font-bold mt-0.5 ${outOfStock ? "text-slate-400" : "text-cyan-700"}`}>
                          {storeName}
                        </div>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {selected && (
        <ItemDetailSheet
          item={selected}
          stores={stores}
          users={users}
          canWrite={canWrite}
          canEditRegistry={canEditRegistry}
          canRequest={typeof decideShoppingRequest === "function"}
          isKid={isKid}
          onClose={() => setSelectedId(null)}
          onPatch={(patch) => {
            if (!canWrite) return;
            updateShoppingItem(selected.id, patch);
            // Mirror the row-circle behavior: flipping stock from the
            // detail sheet also lingers the item in the current tab
            // until filter / nav change. Consistency between the two
            // paths matters — same toggle, same visual.
            if (Object.prototype.hasOwnProperty.call(patch, "inStock")) {
              markLingering(selected.id);
            }
          }}
          onRequest={(decision) => {
            if (typeof decideShoppingRequest !== "function") return;
            // "Request this" semantic — flip the existing row's
            // requestStatus via the same decide path the kid-ask flow
            // uses. Kid actor → 'pending' (parent reviews); parent
            // self-actor → 'approved' (single source of truth for C3's
            // send-to-cart pool). Lingering keeps the item visible in
            // the current tab while the parent watches the new state.
            freezeStatusIfNeeded(selected.id, selected.requestStatus);
            markLingering(selected.id);
            decideShoppingRequest(selected.id, decision);
          }}
          onCreateStore={(displayName) => {
            if (!canEditRegistry) return { error: "no_setter" };
            const result = settingsAfterCreateList(familySettings, displayName);
            if (result.error) return result;
            setFamilySettings(() => result.settings);
            return { key: result.key };
          }}
        />
      )}
    </div>
  );
}

function FilterPill({ active, onClick, children, tone = "cyan" }) {
  const colors = active
    ? tone === "amber"
      ? "bg-amber-500 text-white border-amber-500"
      : tone === "rose"
        ? "bg-rose-500 text-white border-rose-500"
        : tone === "indigo"
          ? "bg-indigo-600 text-white border-indigo-600"
          : "bg-cyan-600 text-white border-cyan-600"
    : "bg-white text-slate-600 border-slate-200";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold border active:scale-95 transition ${colors}`}
    >
      {children}
    </button>
  );
}

function ItemDetailSheet({ item, stores, users = [], canWrite, canEditRegistry, canRequest, isKid, onClose, onPatch, onRequest, onCreateStore }) {
  const [adding, setAdding] = useState(false);
  const [newStoreName, setNewStoreName] = useState("");
  const [createError, setCreateError] = useState(null);

  const storeName = item.defaultStore
    ? (stores.find((s) => s.key === item.defaultStore)?.name || item.defaultStore)
    : null;

  const handleCreate = () => {
    const result = onCreateStore(newStoreName);
    if (result.error === "empty") {
      setCreateError("Enter a name first.");
      return;
    }
    if (result.error === "collision") {
      // Existing store with the same normalized key — just adopt it.
      onPatch({ defaultStore: result.existing.key });
      setAdding(false);
      setNewStoreName("");
      setCreateError(null);
      return;
    }
    if (result.error === "no_setter") {
      setCreateError("Can't save right now.");
      return;
    }
    onPatch({ defaultStore: result.key });
    setAdding(false);
    setNewStoreName("");
    setCreateError(null);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center" role="dialog" aria-modal="true">
      <div onClick={onClose} className="absolute inset-0 bg-slate-900/55 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-white rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto shadow-2xl">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl grid place-items-center text-2xl shrink-0 bg-cyan-50 text-cyan-600">
            {SHOPPING_SECTION_EMOJI[item.section] || "🛒"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-wider font-bold text-cyan-600">Inventory item</div>
            <div className="font-extrabold text-slate-900 leading-tight">{item.title || "(no title)"}</div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 p-1 shrink-0"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-2 text-sm mb-4">
          <DetailRow label="Brand" value={item.brand || "—"} />
          <DetailRow label="Section" value={item.section || "Other"} />
        </div>

        <div className="rounded-2xl border border-slate-200 p-3 mb-3">
          <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-2">Default store</div>
          {!canWrite && (
            <div className="text-[11px] text-slate-400 italic">Read-only — can't save changes right now.</div>
          )}
          {canWrite && (
            <>
              <div className="flex flex-wrap gap-1.5">
                <StorePill active={!item.defaultStore} onClick={() => onPatch({ defaultStore: null })}>
                  None
                </StorePill>
                {stores.map((s) => (
                  <StorePill
                    key={s.key}
                    active={item.defaultStore === s.key}
                    onClick={() => onPatch({ defaultStore: s.key })}
                  >
                    {s.name}
                  </StorePill>
                ))}
                {canEditRegistry && !adding && (
                  <button
                    type="button"
                    onClick={() => { setAdding(true); setCreateError(null); }}
                    className="whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold border bg-white text-cyan-700 border-cyan-200 active:scale-95"
                  >
                    <Plus size={12} className="inline -mt-0.5 mr-0.5" />Add store
                  </button>
                )}
              </div>
              {adding && (
                <div className="mt-2 flex flex-col gap-1.5">
                  <div className="flex gap-1.5">
                    <input
                      value={newStoreName}
                      onChange={(e) => { setNewStoreName(e.target.value); setCreateError(null); }}
                      onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") { setAdding(false); setNewStoreName(""); setCreateError(null); } }}
                      placeholder="Costco / Trader Joe's / …"
                      autoFocus
                      maxLength={24}
                      className="flex-1 border border-cyan-300 rounded-lg px-2 py-1.5 text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleCreate}
                      className="px-3 py-1.5 rounded-lg bg-cyan-600 text-white text-xs font-bold active:scale-95"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAdding(false); setNewStoreName(""); setCreateError(null); }}
                      className="px-2 py-1.5 text-xs font-bold text-slate-400"
                    >
                      Cancel
                    </button>
                  </div>
                  {createError && (
                    <div className="text-[11px] font-semibold text-rose-600">{createError}</div>
                  )}
                </div>
              )}
            </>
          )}
          {storeName && !adding && (
            <div className="mt-2 text-[11px] text-slate-500">
              Currently tagged: <span className="font-bold text-cyan-700">{storeName}</span>
            </div>
          )}
        </div>

        {canWrite && (
          <>
            <button
              type="button"
              onClick={() => onPatch({ inStock: item.inStock === false })}
              className={`w-full rounded-2xl border p-3 flex items-center gap-3 text-left active:scale-[0.99] mb-2 ${item.inStock === false ? "bg-rose-50 border-rose-300" : "bg-white border-slate-200"}`}
            >
              {item.inStock === false ? (
                <PackageX size={20} className="text-rose-500" />
              ) : (
                <PackageCheck size={20} className="text-emerald-500" />
              )}
              <div className="flex-1">
                <div className="font-bold text-sm text-slate-800">
                  {item.inStock === false ? "Mark in stock" : "Mark out of stock"}
                </div>
                <div className="text-[11px] text-slate-500">
                  {item.inStock === false
                    ? "Currently out — sits at the bottom of the list and shows in the Out of stock tab."
                    : "Tap to move to the buy-list. Item stays in inventory, sinks to the bottom."}
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => onPatch({ buyOften: !item.buyOften })}
              className={`w-full rounded-2xl border p-3 flex items-center gap-3 text-left active:scale-[0.99] mb-2 ${item.buyOften ? "bg-amber-50 border-amber-300" : "bg-white border-slate-200"}`}
            >
              <Star size={20} className={item.buyOften ? "text-amber-500 fill-amber-400" : "text-slate-300"} />
              <div className="flex-1">
                <div className="font-bold text-sm text-slate-800">Buy often</div>
                <div className="text-[11px] text-slate-500">
                  {item.buyOften
                    ? "Starred — appears in the Buy-often filter."
                    : "Tap to star — explicit, separate from the auto-favorites in Shopping List."}
                </div>
              </div>
            </button>
          </>
        )}

        {/* Request this — surfaces only when the item is out of stock
            and there's no live request for it. Kid actor → pending
            (parent reviews in the Requests tab). Parent actor →
            approved (self-approve, ready for C3's send-to-cart). The
            Requests tab is the unified inbox where these land. */}
        {canRequest && item.inStock === false && item.requestStatus == null && (
          <button
            type="button"
            onClick={() => onRequest(isKid ? "pending" : "approved")}
            className="w-full rounded-2xl border p-3 flex items-center gap-3 text-left active:scale-[0.99] bg-indigo-50 border-indigo-300"
          >
            <Inbox size={20} className="text-indigo-600" />
            <div className="flex-1">
              <div className="font-bold text-sm text-slate-800">
                {isKid ? "Request this" : "Add to requests · approved"}
              </div>
              <div className="text-[11px] text-slate-500">
                {isKid
                  ? "Sends to the Requests tab — a parent will approve or decline."
                  : "Lands in the Requests tab as approved — ready to send to a store cart."}
              </div>
            </div>
          </button>
        )}

        {canRequest && item.requestStatus != null && (
          <div className={`w-full rounded-2xl border p-3 flex items-center gap-3 text-left ${
            item.requestStatus === "pending" ? "bg-amber-50 border-amber-300"
              : item.requestStatus === "approved" ? "bg-emerald-50 border-emerald-300"
              : "bg-slate-50 border-slate-200"
          }`}>
            <Inbox size={20} className={
              item.requestStatus === "pending" ? "text-amber-600"
                : item.requestStatus === "approved" ? "text-emerald-600"
                : "text-slate-400"
            } />
            <div className="flex-1">
              <div className="font-bold text-sm text-slate-800">
                {item.requestStatus === "pending" && "Pending request"}
                {item.requestStatus === "approved" && "Approved · ready for cart"}
                {item.requestStatus === "declined" && "Declined"}
              </div>
              {item.requestStatus === "declined" && item.declineReason && (
                <div className="text-[11px] text-slate-600 italic mt-0.5">{item.declineReason}</div>
              )}
              <div className="text-[11px] text-slate-500 mt-0.5">
                Manage in the Requests tab.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// RequestsView — renders items with non-null requestStatus, grouped
// pending → approved → declined. Pending rows get inline Approve /
// Decline buttons (Decline opens a small reason input, mirroring the
// ShoppingList kid-ask UI Mike's parents already know). effectiveStatus
// honors the frozen-sub-group lookup in the parent so a just-decided
// item stays in its original group until tab change.
function RequestsView({ items, users, canDecide, effectiveStatus, onDecide }) {
  const [decliningId, setDecliningId] = useState(null);
  const [reasonDraft, setReasonDraft] = useState("");
  const findName = (id) => users.find((u) => u.id === id)?.name || "Someone";

  const byGroup = useMemo(() => {
    const groups = { pending: [], approved: [], declined: [] };
    for (const it of items) {
      const g = effectiveStatus(it);
      if (g && groups[g]) groups[g].push(it);
    }
    for (const arr of Object.values(groups)) {
      arr.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    }
    return groups;
  }, [items, effectiveStatus]);

  const SectionHeader = ({ icon, label, count, color }) => (
    <div className="flex items-baseline justify-between px-1 mb-1.5">
      <div className="flex items-center gap-1.5 font-extrabold text-sm" style={{ color }}>
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
        {count} {count === 1 ? "item" : "items"}
      </div>
    </div>
  );

  return (
    <>
      {byGroup.pending.length > 0 && (
        <div className="mb-4">
          <SectionHeader icon={<Inbox size={14} />} label="Pending" count={byGroup.pending.length} color="#b45309" />
          <div className="rounded-2xl bg-white border border-amber-200 overflow-hidden">
            {byGroup.pending.map((it, i) => {
              const requester = findName(it.addedBy || it.decidedBy);
              // Once decided, the row is frozen in this group until
              // tab change (Mike's "don't yank it on tap" rule). The
              // body transforms in place to show the new status so
              // there IS clear visual feedback — otherwise an Approve
              // tap looks like nothing happened.
              const currentStatus = it.requestStatus;
              const decidedHere = currentStatus !== "pending";
              const decidedName = findName(it.decidedBy);
              return (
                <div
                  key={it.id}
                  className={`p-3 ${i > 0 ? "border-t border-slate-100" : ""} ${
                    decidedHere && currentStatus === "approved" ? "bg-emerald-50"
                      : decidedHere && currentStatus === "declined" ? "bg-slate-50"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className={`font-semibold text-sm truncate ${decidedHere && currentStatus === "declined" ? "text-slate-500 line-through" : "text-slate-800"}`}>
                        {it.title || "(no title)"}
                      </div>
                      {it.brand && <div className="text-[11px] text-amber-700 font-bold truncate mt-0.5">{it.brand}</div>}
                      <div className="text-[11px] text-slate-500 mt-0.5">Requested by {requester}</div>
                    </div>
                  </div>
                  {decidedHere ? (
                    <div className={`mt-2 rounded-lg px-2.5 py-1.5 text-[11px] font-bold flex items-center gap-1.5 ${
                      currentStatus === "approved" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                    }`}>
                      {currentStatus === "approved" ? <Check size={13} strokeWidth={3} /> : <X size={13} strokeWidth={3} />}
                      <span>
                        {currentStatus === "approved" ? `Approved by ${decidedName}` : `Declined by ${decidedName}`}
                        {currentStatus === "declined" && it.declineReason ? ` · "${it.declineReason}"` : ""}
                      </span>
                    </div>
                  ) : canDecide && decliningId === it.id ? (
                    <div className="mt-2 flex gap-1.5">
                      <input
                        value={reasonDraft}
                        onChange={(e) => setReasonDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { onDecide(it, "declined", reasonDraft); setDecliningId(null); setReasonDraft(""); }
                          if (e.key === "Escape") { setDecliningId(null); setReasonDraft(""); }
                        }}
                        placeholder="Reason (optional — defaults to 'Not this week')"
                        autoFocus
                        maxLength={80}
                        className="flex-1 border border-rose-300 rounded-lg px-2 py-1.5 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => { onDecide(it, "declined", reasonDraft); setDecliningId(null); setReasonDraft(""); }}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold active:scale-95"
                      >
                        Decline
                      </button>
                      <button
                        type="button"
                        onClick={() => { setDecliningId(null); setReasonDraft(""); }}
                        className="px-2 py-1.5 text-xs font-bold text-slate-400"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : canDecide ? (
                    <div className="mt-2 flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => onDecide(it, "approved")}
                        className="flex-1 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold active:scale-95"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => { setDecliningId(it.id); setReasonDraft(""); }}
                        className="flex-1 py-1.5 rounded-lg bg-white border border-rose-300 text-rose-700 text-xs font-bold active:scale-95"
                      >
                        Decline
                      </button>
                    </div>
                  ) : (
                    <div className="mt-2 text-[11px] text-slate-400 italic">A parent will review this.</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {byGroup.approved.length > 0 && (
        <div className="mb-4">
          <SectionHeader icon={<Check size={14} />} label="Approved · ready for cart" count={byGroup.approved.length} color="#047857" />
          <div className="rounded-2xl bg-white border border-emerald-200 overflow-hidden">
            {byGroup.approved.map((it, i) => {
              const decider = findName(it.decidedBy);
              return (
                <div key={it.id} className={`p-3 ${i > 0 ? "border-t border-slate-100" : ""}`}>
                  <div className="font-semibold text-sm text-slate-800 truncate">{it.title || "(no title)"}</div>
                  {it.brand && <div className="text-[11px] text-amber-700 font-bold truncate mt-0.5">{it.brand}</div>}
                  <div className="text-[11px] text-slate-500 mt-0.5">Approved by {decider} · send-to-cart lands in a later brick.</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {byGroup.declined.length > 0 && (
        <div className="mb-4">
          <SectionHeader icon={<MessageSquare size={14} />} label="Declined" count={byGroup.declined.length} color="#64748b" />
          <div className="rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden">
            {byGroup.declined.map((it, i) => {
              const decider = findName(it.decidedBy);
              return (
                <div key={it.id} className={`p-3 ${i > 0 ? "border-t border-slate-200" : ""}`}>
                  <div className="font-semibold text-sm text-slate-500 line-through truncate">{it.title || "(no title)"}</div>
                  {it.declineReason && (
                    <div className="text-[11px] text-slate-600 italic mt-0.5">"{it.declineReason}"</div>
                  )}
                  <div className="text-[11px] text-slate-400 mt-0.5">Declined by {decider}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

function StorePill({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold border active:scale-95 transition ${active ? "bg-cyan-600 text-white border-cyan-600" : "bg-white text-slate-600 border-slate-200"}`}
    >
      {children}
    </button>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-baseline gap-2 py-2 border-b border-slate-100 last:border-0">
      <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 w-20 shrink-0">{label}</div>
      <div className="flex-1 text-slate-800 font-semibold">{value}</div>
    </div>
  );
}
