// ReceiptItemRow + PickerSheet — shared between two surfaces:
//
//   1. ReceiptScanner (the scan-review step before save)
//   2. Receipts detail view (the edit-later mode on a saved row)
//
// Single source of truth so when we add a new editable field or
// change the link picker UX, both surfaces gain it for free. Per
// the editable-after-save rule: the capture component IS the
// edit component.
//
// Inputs:
//   item        — one items_reviewed entry: { title, brand, qty,
//                 unit, unit_price, line_total,
//                 auto_matched_shopping_item_id, match_confidence,
//                 confirmed_shopping_item_id, ... }
//   candidates  — array of { id, title, brand } shopping rows the
//                 row can be linked to.
//   onUpdate    — (patch) => void; merges patch into the item.
//   onDrop      — () => void; removes the row from items_reviewed.
//   onLink      — (shoppingItemId | null) => void; sets/clears
//                 confirmed_shopping_item_id. Default-null on
//                 capture; opt-in only.

import React, { useEffect, useMemo, useState } from "react";

export default function ReceiptItemRow({ item, candidates, onUpdate, onDrop, onLink }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");

  const matchedCandidate = useMemo(() => {
    const id = item.confirmed_shopping_item_id;
    if (!id) return null;
    return candidates.find((c) => c.id === id) || null;
  }, [item.confirmed_shopping_item_id, candidates]);

  const autoCandidate = useMemo(() => {
    const id = item.auto_matched_shopping_item_id;
    if (!id) return null;
    return candidates.find((c) => c.id === id) || null;
  }, [item.auto_matched_shopping_item_id, candidates]);

  const pickerCandidates = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    if (!q) return candidates.slice(0, 30);
    return candidates
      .filter((c) => (c.title + " " + c.brand).toLowerCase().includes(q))
      .slice(0, 30);
  }, [pickerQuery, candidates]);

  return (
    <div className="border border-slate-100 rounded-xl p-2.5 mb-2 bg-white">
      <div className="flex gap-2 items-start">
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={item.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            className="w-full px-2 py-1 rounded-md border border-slate-200 text-[13px] font-bold text-slate-800 mb-1"
          />
          <div className="flex gap-1.5">
            <input
              type="text"
              value={item.brand}
              onChange={(e) => onUpdate({ brand: e.target.value })}
              placeholder="brand"
              className="flex-1 min-w-0 px-2 py-1 rounded-md border border-slate-200 text-[11px] text-slate-600"
            />
            <input
              type="number"
              step="0.01"
              value={item.qty}
              onChange={(e) => onUpdate({ qty: e.target.value })}
              className="w-12 px-2 py-1 rounded-md border border-slate-200 text-[11px] text-slate-600 text-right"
              title="qty"
            />
            <input
              type="text"
              value={item.unit}
              onChange={(e) => onUpdate({ unit: e.target.value })}
              placeholder="unit"
              className="w-10 px-1.5 py-1 rounded-md border border-slate-200 text-[11px] text-slate-600"
            />
            <input
              type="number"
              step="0.01"
              value={item.line_total ?? ""}
              onChange={(e) => onUpdate({ line_total: e.target.value === "" ? null : Number(e.target.value) })}
              placeholder="$"
              className="w-16 px-2 py-1 rounded-md border border-slate-200 text-[11px] font-bold text-slate-800 text-right"
              title="line total"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={onDrop}
          className="text-slate-300 hover:text-rose-500 text-sm shrink-0"
          title="Remove this line"
        >
          ✕
        </button>
      </div>
      {/* Quiet opt-in linking — gray text-link, no color emphasis.
          Linked state shows the item + "change" affordance. Unlinked
          state shows the prompt. Neither pushes; both pull. */}
      <div className="mt-2">
        {matchedCandidate ? (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="text-[11px] text-slate-500 hover:text-slate-700 flex items-center gap-1.5"
          >
            <span>🔗</span>
            <span>→ {matchedCandidate.title}{matchedCandidate.brand ? ` · ${matchedCandidate.brand}` : ""}</span>
            <span className="text-slate-400">·</span>
            <span className="underline">change</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-1.5"
          >
            <span>🔗</span>
            <span>Tag to list item</span>
          </button>
        )}
      </div>

      {/* Picker — opens with the auto-match suggestion (if any)
          pre-highlighted at the top. Picking links; closing without
          picking leaves the row unlinked. */}
      {pickerOpen && (
        <PickerSheet
          query={pickerQuery}
          onQueryChange={setPickerQuery}
          candidates={pickerCandidates}
          suggestion={autoCandidate}
          currentlyLinkedId={item.confirmed_shopping_item_id}
          onPick={(id) => { onLink(id); setPickerOpen(false); setPickerQuery(""); }}
          onUnlink={() => { onLink(null); setPickerOpen(false); setPickerQuery(""); }}
          onClose={() => { setPickerOpen(false); setPickerQuery(""); }}
        />
      )}
    </div>
  );
}

// Picker sheet — opened when the user taps "🔗 Tag to list item".
// Shows the auto-match suggestion at the top (if any) so a one-tap
// link is the easiest path WHEN the user wants to link. Linking is
// never pre-set; the row arrives here unlinked.
export function PickerSheet({ query, onQueryChange, candidates, suggestion, currentlyLinkedId, onPick, onUnlink, onClose }) {
  useEffect(() => {
    const onEsc = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onClose]);
  // Hide the suggestion from the candidates list when it's about to
  // render at the top — avoids visual duplication.
  const showSuggestion = !!suggestion && suggestion.id !== currentlyLinkedId;
  const visibleCandidates = showSuggestion
    ? candidates.filter((c) => c.id !== suggestion.id)
    : candidates;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Pick a shopping list item"
    >
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full bg-white rounded-t-2xl p-3 shadow-2xl max-h-[70vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center font-bold text-sm mb-2 text-slate-700">Tag this line to a list item</div>
        <input
          autoFocus
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search your list…"
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm mb-2"
        />
        {showSuggestion && !query && (
          <div className="mb-2">
            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400 px-1 mb-1">Suggested</div>
            <button
              type="button"
              onClick={() => onPick(suggestion.id)}
              className="w-full text-left px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100"
            >
              <div className="font-bold text-sm text-slate-800">{suggestion.title}</div>
              {suggestion.brand && <div className="text-[11px] text-slate-500">{suggestion.brand}</div>}
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto">
          {visibleCandidates.length === 0 && !showSuggestion && (
            <div className="text-center text-[12px] text-slate-400 py-6">No matches in your list.</div>
          )}
          {visibleCandidates.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onPick(c.id)}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 border-b border-slate-100"
            >
              <div className="font-bold text-sm text-slate-800">{c.title}</div>
              {c.brand && <div className="text-[11px] text-slate-500">{c.brand}</div>}
            </button>
          ))}
        </div>
        <div className="flex gap-2 mt-2">
          {currentlyLinkedId && (
            <button
              type="button"
              onClick={onUnlink}
              className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-500 font-bold text-xs"
            >
              Unlink
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-500 font-bold text-xs"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
