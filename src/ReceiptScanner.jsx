// RS-1 ReceiptScanner — UI skeleton.
//
// At RS-1 Commit A this file is a stub: it exports a default
// component but renders nothing meaningful, because nothing wires it
// in yet. The wiring lives in Commit B, when the App.jsx ShoppingList
// scan-area swaps from the two-button grid to the kind-chooser sheet
// and routes "receipt" picks here.
//
// The FULL component (Commit B build) will implement the spec:
//   1. Capture — file picker (camera or library), compress to
//      ~1500px JPEG.
//   2. Upload — write to family-photos/receipts/<family_id>/<uuid>.jpg
//      via the existing storage.js helper.
//   3. Parse — POST to /api/vision-parse with kind="receipt"; the
//      RS-1 PROMPTS key returns store + date + totals + items.
//   4. Preview & review — editable form for store_name /
//      store_chain (normalized lower+trim on blur) / store_label /
//      purchased_at (editable, backfill lever) / subtotal / tax /
//      total, plus per-line editable rows with auto-match chips
//      against shopping_items (Black's fuzzyMatch utility). Unmatched
//      lines surface in a "review these" section. Source pill toggles
//      "Today's receipt" / "Historical (backfill)".
//   5. Commit — single INSERT into the receipts table:
//        ocr_raw = {
//          vision: <raw vision-parse response>,
//          items_reviewed: [
//            {
//              title, brand, qty, unit, unit_price, line_total,
//              auto_matched_shopping_item_id, match_confidence,
//              confirmed_shopping_item_id,
//              source: "receipt" | "backfill"
//            }, ...
//          ]
//        }
//      Sheet closes; toast "Receipt saved."
//
// Promotion contract for RS-2: ocr_raw.items_reviewed[i] carries
// every field a complete purchases row needs (title, brand, qty,
// unit, unit_price, line_total, confirmed_shopping_item_id, source)
// plus the receipt-header context (store_chain, store_label,
// purchased_at, currency, family_id, uploaded_by, receipt_id). RS-2
// walks deleted_at IS NULL receipts and mints purchase rows from
// this structure. Verified clean during RS-1 Commit A planning —
// see the RS-1 spec "promotion contract" check.

export default function ReceiptScanner(/* { onClose, addReceipt, shoppingItems, currentProfileId } */) {
  return null;
}
