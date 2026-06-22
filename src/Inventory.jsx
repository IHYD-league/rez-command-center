import React, { useMemo, useState } from "react";
import { X, Package } from "lucide-react";
import {
  SECTION_ORDER as SHOPPING_SECTION_ORDER,
  SECTION_EMOJI as SHOPPING_SECTION_EMOJI,
} from "./lib/shoppingSections.js";

// Inventory — Brick A of the Food Hub Inventory stack.
//
// READ-ONLY view over shopping_items. Mike's catalog of "things we
// have / buy" — same rows the Shopping List renders, presented as an
// inventory grouped by store section. No writes, no add-to-cart, no
// store tags, no buy-often, no edit. Bricks B and C add those.
//
// Why same table: today every shopping_items row already IS an
// inventory entry. The 85 items Mike has carry title + brand + section
// + family_id, which is everything this view needs. Brick B will add
// default_store + buy_often columns; Brick C adds the add-to-cart
// flow. Until then, this brick is pure UI over data that's already
// there — schema-free.
//
// Filter: any row that isn't soft-deleted is inventory. Checked state
// and which list-name the cart is currently on don't matter — the
// item exists, so it's in inventory.

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
  for (const arr of groups.values()) {
    arr.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
  }
  return groups;
}

export default function Inventory({ shoppingItems = [] }) {
  const items = useMemo(() => inventoryItems(shoppingItems), [shoppingItems]);
  const grouped = useMemo(() => groupBySection(items), [items]);
  const [selectedId, setSelectedId] = useState(null);

  const total = items.length;
  const selected = useMemo(
    () => (selectedId ? items.find((it) => it.id === selectedId) || null : null),
    [items, selectedId],
  );

  return (
    <div className="px-4 pt-4 pb-8">
      <div className="rounded-2xl p-4 mb-3 text-white relative overflow-hidden"
           style={{ background: "linear-gradient(135deg, #0369a1 0%, #0891b2 55%, #0e7490 100%)" }}>
        <Package size={56} className="absolute -right-2 -top-2 text-white/15" />
        <div className="text-[10px] uppercase tracking-widest font-extrabold text-white/80">Inventory</div>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-4xl font-extrabold leading-none">{total}</span>
          <span className="text-sm font-bold text-white/80">{total === 1 ? "item" : "items"} we buy</span>
        </div>
        <div className="text-[11px] text-white/75 mt-2 leading-snug">
          Everything you've added to the shopping list. Grouped by store section.
        </div>
      </div>

      {total === 0 && (
        <div className="rounded-2xl bg-white border border-slate-100 p-6 text-center text-sm text-slate-500">
          Nothing in inventory yet. Add items via the Shopping List — they'll show up here.
        </div>
      )}

      {SHOPPING_SECTION_ORDER.map((sec) => {
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
              {list.map((it, i) => (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => setSelectedId(it.id)}
                  className={`w-full flex items-center gap-3 p-3 text-left active:bg-slate-50 ${i > 0 ? "border-t border-slate-100" : ""}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-slate-800 leading-snug truncate">{it.title || "(no title)"}</div>
                    {it.brand && (
                      <div className="text-[11px] text-amber-700 font-bold truncate mt-0.5">{it.brand}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })}

      {selected && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center" role="dialog" aria-modal="true">
          <div onClick={() => setSelectedId(null)} className="absolute inset-0 bg-slate-900/55 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-white rounded-t-3xl p-5 max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl grid place-items-center text-2xl shrink-0 bg-cyan-50 text-cyan-600">
                {SHOPPING_SECTION_EMOJI[selected.section] || "🛒"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-wider font-bold text-cyan-600">Inventory item</div>
                <div className="font-extrabold text-slate-900 leading-tight">{selected.title || "(no title)"}</div>
              </div>
              <button
                onClick={() => setSelectedId(null)}
                className="text-slate-400 p-1 shrink-0"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 text-sm">
              <DetailRow label="Brand" value={selected.brand || "—"} />
              <DetailRow label="Section" value={selected.section || "Other"} />
            </div>

            <div className="mt-5 rounded-xl bg-slate-50 border border-slate-100 p-3 text-[11px] text-slate-500 leading-snug">
              Edits, store tags, and add-to-cart land in the next bricks. This view is read-only for now.
            </div>
          </div>
        </div>
      )}
    </div>
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
