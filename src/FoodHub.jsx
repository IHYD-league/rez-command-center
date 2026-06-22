import React, { useMemo } from "react";
import { ClipboardList, Receipt as ReceiptIcon, TrendingUp, ChevronLeft } from "lucide-react";
import {
  filterItemsForList as shoppingFilterItemsForList,
  getActiveListEntry as shoppingGetActiveListEntry,
} from "./lib/shoppingLists.js";
import { monthKeyOf, monthKeyFor } from "./Spending.jsx";

// Food Hub landing — the menu inside the Food Hub More entry.
//
// Three rows, each a button that calls setSub("shopping"|"receipts"|"spending")
// inside MoreParent's existing state machine. No new nav primitive — just a
// thin landing screen that nests the three existing surfaces under one
// container.
//
// Each row carries one honest live number in its sub-line, sourced from the
// SAME helpers the destination pages use:
//   - Shopping count   → shoppingFilterItemsForList (same helper ShoppingList renders from)
//   - Receipts count   → monthKeyOf (same primitive Spending buckets through)
//   - Spending total   → monthKeyOf + sum (same pipeline Spending headlines)
// If a number is 0 / unavailable, the row falls back to the static descriptive
// copy so brand-new families don't see "0 this month" rows.
//
// Visual treatment matches the MoreMenu row style at App.jsx (sky color
// tokens, same rounded card + icon-circle layout) so the landing reads as a
// native continuation of the More menu — not a separate UI.

export default function FoodHubLanding({
  setSub,
  shoppingItems = [],
  receipts = [],
  familySettings = {},
}) {
  const active = useMemo(
    () => shoppingGetActiveListEntry(familySettings),
    [familySettings]
  );

  // "Still to buy" on the active list. Same predicate ShoppingList itself
  // uses for its visible list: filter to the active list, drop soft-deleted,
  // then count unchecked. Single source — no duplicated logic.
  const shoppingUnchecked = useMemo(() => {
    const visible = shoppingFilterItemsForList(shoppingItems, active.key)
      .filter((it) => !it.deletedAt);
    return visible.filter((it) => !it.checked).length;
  }, [shoppingItems, active.key]);

  // Receipts this month + spend total — both reduce through monthKeyOf so
  // the Food Hub row CANNOT diverge from the Spending headline. If a second
  // month-from-iso path appears here, that's the trust-breaking divergence
  // the Spending invariant comment warns against.
  const now = useMemo(() => new Date(), []);
  const currentMonthKey = useMemo(() => monthKeyFor(now, 0), [now]);

  const liveReceipts = useMemo(
    () => (receipts || []).filter((r) => r && !r.deletedAt),
    [receipts]
  );

  const monthReceipts = useMemo(
    () =>
      liveReceipts.filter(
        (r) => monthKeyOf(r.purchasedAt || r.createdAt) === currentMonthKey
      ),
    [liveReceipts, currentMonthKey]
  );

  const monthSpend = useMemo(
    () => monthReceipts.reduce((s, r) => s + (Number(r.total) || 0), 0),
    [monthReceipts]
  );

  const fmtDollars = (n) => {
    if (!Number.isFinite(Number(n))) return "$0";
    return "$" + Math.round(Number(n)).toLocaleString("en-US");
  };

  // Sub-line copy. Live number when there's something to say; static
  // descriptive copy when the number is 0 / no data (avoids "0 this month"
  // rows on a brand-new family).
  const shoppingSub =
    shoppingUnchecked > 0
      ? `${shoppingUnchecked} still to buy · ${active.name}`
      : "Shared family list · add at the store · check off at home";

  const receiptsSub =
    monthReceipts.length > 0
      ? `${monthReceipts.length} this month`
      : "Every scanned receipt · tap to view items · delete";

  const spendingSub =
    monthSpend > 0
      ? `${fmtDollars(monthSpend)} this month`
      : "Where the money's going · price trends per item";

  const rows = [
    { k: "shopping", icon: <ClipboardList size={18} />, label: "Shopping List", sub: shoppingSub },
    { k: "receipts", icon: <ReceiptIcon size={18} />,   label: "Receipts",      sub: receiptsSub },
    { k: "spending", icon: <TrendingUp size={18} />,    label: "Spending",      sub: spendingSub },
  ];

  return (
    <div>
      {rows.map((r) => (
        <button
          key={r.k}
          onClick={() => setSub(r.k)}
          className="w-full mb-2 active:scale-[0.98] transition"
        >
          <div className="rounded-2xl border p-4 flex items-center gap-3 text-left bg-sky-50 border-sky-100">
            <div className="w-10 h-10 rounded-2xl grid place-items-center bg-sky-100 text-sky-600">
              {r.icon}
            </div>
            <div className="flex-1">
              <div className="font-bold text-sm">{r.label}</div>
              <div className="text-[11px] text-slate-500">{r.sub}</div>
            </div>
            <ChevronLeft size={16} className="rotate-180 text-slate-300" />
          </div>
        </button>
      ))}
    </div>
  );
}
