// Spending — money math over the receipts array. Read-only surface;
// the source of truth stays the Receipts view's edit-mode. Two views
// live on the same page:
//
//   1. Spend overview (HEADLINE — useful day-one)
//      $X spent in [window], 6-month trend bar chart, by-store
//      breakdown. The numbers everyone wants to know first.
//
//   2. Price trends (per-item — gets richer with use)
//      Items grouped by precise identity (UPC, then linked shopping
//      item — NO fuzzy title fallback). First→latest price + tiny
//      sparkline per item. Empty/sparse by design until items repeat
//      across trips; the empty state EXPLAINS how to grow the list
//      ("tag at scan time"), it doesn't pretend to have data it
//      doesn't.
//
// THE NO-HIDDEN-INFO RULE (memory feedback_no_hidden_info_breaks_trust):
// every summary number must include every contributor. The headline
// total, the by-store breakdown, and the 6-month trend ALL read from
// the same single soft-delete-filtered useMemo, so by-store sums
// always equal the headline and there is no path for a deleted
// receipt to leak into any total.
//
// THE MATH FLOOR (effectiveTotal):
//   r.total ?? sum(line_total over items_reviewed) ?? null
// Receipts with null effective total are EXCLUDED from sums but
// COUNTED in the footer ("N receipts · M missing total") so a parent
// always knows the population the headline is computed over.
//
// THE IDENTITY RULE (per the brick's make-or-break call):
//   1. upc, when present and 8-14 digits → "upc:<digits>"
//   2. confirmed_shopping_item_id, when set by the user → "link:<id>"
//   3. no fallback. Lines without either don't enter the trends list.
// Day-one trends will be sparse. That's honest, not broken.

import React, { useEffect, useMemo, useState } from "react";
import { ChevronRight, ChevronLeft, ChevronDown, Receipt as ReceiptIcon } from "lucide-react";

// =================== math floor ===================

// Effective dollar amount we attribute to a receipt. Honors the math
// floor rule: r.total when set, else sum of items_reviewed[].line_total
// (in case the parser missed the total row but read the line items),
// else null (excluded from sums, counted in footer).
export function effectiveTotal(r) {
  if (r == null) return null;
  if (r.total != null && Number.isFinite(Number(r.total))) return Number(r.total);
  const items = Array.isArray(r.ocrRaw?.items_reviewed) ? r.ocrRaw.items_reviewed : [];
  let sum = 0;
  let any = false;
  for (const it of items) {
    const v = Number(it?.line_total);
    if (Number.isFinite(v)) {
      sum += v;
      any = true;
    }
  }
  return any ? sum : null;
}

// Per-line unit price for the price-trends section. unit_price when
// the parser captured it; else line_total/qty as a fallback. null if
// neither path can produce a number.
export function effectiveUnitPrice(line) {
  if (line == null) return null;
  const up = Number(line.unit_price);
  if (Number.isFinite(up)) return up;
  const lt = Number(line.line_total);
  const q = Number(line.qty) || 1;
  if (Number.isFinite(lt) && q > 0) return lt / q;
  return null;
}

// Precise identity key. Returns null when there's no precise basis
// to group — fuzzy title fallback was rejected in plan-confirm because
// it produces "looks like it's working while quietly lying" mis-
// groupings (different cheddars merging, same product under two names
// failing to merge).
export function itemIdentityKey(line) {
  if (!line) return null;
  const upc = line.upc != null ? String(line.upc).trim() : "";
  if (/^\d{8,14}$/.test(upc)) return `upc:${upc}`;
  if (line.confirmed_shopping_item_id) return `link:${line.confirmed_shopping_item_id}`;
  return null;
}

// =================== time windows ===================

// Sunday-start week to match Church-on-Sunday family cadence.
function startOfWeek(now) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}
function startOfMonth(now) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(1);
  return d;
}
function startOfMonthOffset(now, monthsAgo) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(1);
  d.setMonth(d.getMonth() - monthsAgo);
  return d;
}
function startOfYear(now) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setMonth(0, 1);
  return d;
}

function windowStart(key, now) {
  switch (key) {
    case "week":  return startOfWeek(now);
    case "month": return startOfMonth(now);
    case "3mo":   return startOfMonthOffset(now, 2); // current month + 2 prior
    case "year":  return startOfYear(now);
    default:      return startOfMonth(now);
  }
}

const WINDOW_LABELS = {
  week:  "This week",
  month: "This month",
  "3mo": "Last 3 months",
  year:  "This year",
};

function monthBucketKey(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthBucketLabel(key) {
  if (!key) return "";
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "short" });
}

// =================== formatting ===================

function formatDollars(n) {
  if (n == null || !Number.isFinite(Number(n))) return "$0";
  const v = Math.round(Number(n));
  return "$" + v.toLocaleString("en-US");
}
function formatCents(n) {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  return "$" + Number(n).toFixed(2);
}
function pctChange(first, last) {
  if (!Number.isFinite(first) || !Number.isFinite(last) || first === 0) return null;
  return ((last - first) / first) * 100;
}

// =================== window persistence ===================

const LS_PREFIX = "rcc_spending_window_v1";
function loadWindow(familyId) {
  if (!familyId || typeof localStorage === "undefined") return "month";
  try {
    const v = localStorage.getItem(`${LS_PREFIX}:${familyId}`);
    if (v && WINDOW_LABELS[v]) return v;
  } catch {}
  return "month";
}
function saveWindow(familyId, value) {
  if (!familyId || typeof localStorage === "undefined") return;
  try { localStorage.setItem(`${LS_PREFIX}:${familyId}`, value); } catch {}
}

// =================== component ===================

export default function Spending({
  receipts = [],
  users = [],
  user = null,
  shoppingItems = [],
  updateReceipt = null,
  softDeleteReceipt = null,
  familyId = null,
}) {
  const [windowKey, setWindowKeyRaw] = useState(() => loadWindow(familyId));
  const setWindowKey = (k) => { setWindowKeyRaw(k); saveWindow(familyId, k); };

  // SINGLE source of truth for receipts that count toward spending math.
  // Soft-deleted filter applied ONCE here; every downstream calc reads
  // from this array. There is no path in this file where a deleted
  // receipt can leak into a total. Do not bypass this useMemo.
  const liveReceipts = useMemo(
    () => (receipts || []).filter((r) => r && !r.deletedAt),
    [receipts]
  );

  const now = useMemo(() => new Date(), []);
  const winStart = useMemo(() => windowStart(windowKey, now), [windowKey, now]);

  // Receipts in the selected window.
  const windowReceipts = useMemo(() => {
    return liveReceipts.filter((r) => {
      const t = Date.parse(r.purchasedAt || r.createdAt || 0);
      if (!Number.isFinite(t)) return false;
      return t >= winStart.getTime() && t <= now.getTime();
    });
  }, [liveReceipts, winStart, now]);

  // Headline summary — total dollars, contributing count, missing-total count.
  const summary = useMemo(() => {
    let total = 0;
    let counted = 0;
    let missing = 0;
    for (const r of windowReceipts) {
      const t = effectiveTotal(r);
      if (t == null) missing += 1;
      else { total += t; counted += 1; }
    }
    return { total, counted, missing, receiptCount: windowReceipts.length };
  }, [windowReceipts]);

  return (
    <div className="space-y-3 pb-4">
      <WindowChips value={windowKey} onChange={setWindowKey} />

      <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
        <div className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">
          {WINDOW_LABELS[windowKey] || "This month"}
        </div>
        <div className="text-4xl font-bold text-slate-800">
          {formatDollars(summary.total)}
        </div>
        <div className="text-[11px] text-slate-500 mt-1.5">
          {summary.receiptCount === 0
            ? "No receipts in this window."
            : `across ${summary.counted} ${summary.counted === 1 ? "receipt" : "receipts"}`
              + (summary.missing > 0
                ? ` · ${summary.missing} missing total`
                : "")
              + " · incl tax"}
        </div>
      </div>

      {windowReceipts.length === 0 && (
        <div className="text-center py-10 px-6">
          <div className="text-3xl mb-2">🧾</div>
          <div className="text-sm text-slate-500 leading-relaxed">
            Scan a receipt to start tracking spending.
          </div>
        </div>
      )}
    </div>
  );
}

// =================== window chips ===================

function WindowChips({ value, onChange }) {
  const keys = ["week", "month", "3mo", "year"];
  return (
    <div className="bg-white rounded-2xl p-1 shadow-sm flex gap-1">
      {keys.map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => onChange(k)}
          className={
            "flex-1 py-1.5 rounded-xl text-[11px] font-bold transition-colors " +
            (value === k
              ? "bg-emerald-600 text-white"
              : "text-slate-500 active:bg-slate-100")
          }
        >
          {WINDOW_LABELS[k]}
        </button>
      ))}
    </div>
  );
}
