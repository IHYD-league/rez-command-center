// RS-1 ReceiptScanner — placeholder.
//
// Per Mike's standing rule (added 2026-06-17 alongside Commit B):
// nothing ships as a dead-end. The kind-chooser's 🧾 tile routes
// here; until the full receipt UX lands in a follow-up PR, this
// component shows an honest "coming next" state with a clean close
// path back to the shopping list.
//
// Contract held even at placeholder stage: the component accepts
// `onClose` (required — tapping the X / Done / backdrop closes the
// sheet) and `activeListKey` (ignored today; carried for the future
// implementation that writes scanner-originated items with
// listName: activeListKey per Black's normalized-key contract).
//
// The FULL component (follow-up PR) will implement:
//   1. Capture — file picker (camera or library), compress to ~1500px JPEG.
//   2. Upload — family-photos/receipts/<family_id>/<uuid>.jpg via storage.js.
//   3. Parse — POST /api/vision-parse with kind="receipt".
//   4. Preview & review — editable form for store_name / store_chain
//      (normalized lower+trim on blur) / store_label / purchased_at
//      (editable, backfill lever) / subtotal / tax / total, plus
//      per-line editable rows with auto-match chips against
//      shopping_items (Black's fuzzyMatch). Unmatched in a "review
//      these" section. Source pill: "Today's receipt" / "Historical
//      (backfill)".
//   5. Commit — single INSERT into receipts with ocr_raw = {
//        vision: <raw vision-parse response>,
//        items_reviewed: [
//          { title, brand, qty, unit, unit_price, line_total,
//            auto_matched_shopping_item_id, match_confidence,
//            confirmed_shopping_item_id,
//            source: "receipt" | "backfill" }, ...
//        ]
//      }. Toast "Receipt saved."
//
// Promotion contract for RS-2 (verified clean during RS-1 Commit A
// planning): ocr_raw.items_reviewed[i] carries every field a complete
// purchases row needs, plus receipt-header context. RS-2 walks
// deleted_at IS NULL receipts and mints purchase rows from this
// structure.

import React from "react";

export default function ReceiptScanner({ onClose, /* activeListKey — ignored at placeholder; held for the future write path */ }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Receipt scanner — coming next"
    >
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full bg-white rounded-t-2xl shadow-2xl p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-4" />
        <div className="text-4xl mb-2">🧾</div>
        <div className="font-extrabold text-base text-emerald-800 mb-1">Receipt scanner</div>
        <div className="text-[12px] text-emerald-700 mb-1">Coming next.</div>
        <div className="text-[11px] text-slate-500 leading-snug mb-5 max-w-xs mx-auto">
          Soon you'll be able to snap a receipt and we'll capture what was bought, where, and how much — so the spending picture builds itself.
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm active:scale-[0.99]"
        >
          Done
        </button>
      </div>
    </div>
  );
}
