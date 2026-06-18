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
import { ReceiptDetail } from "./Receipts.jsx";

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
  // Drill-down state — at most one of these is set at a time.
  //   expandedStoreKey : inline expand of a store row's receipts
  //   trendDrilldownKey: pushed sub-view for a single tracked item
  //   openReceiptId    : pushed ReceiptDetail (reused from Receipts.jsx)
  const [expandedStoreKey, setExpandedStoreKey] = useState(null);
  const [trendDrilldownKey, setTrendDrilldownKey] = useState(null);
  const [openReceiptId, setOpenReceiptId] = useState(null);
  const isKid = user?.role === "kid";

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

  // 6-month trend — always 6 calendar months ending in the current
  // month, regardless of the selected window. Anchored context, not
  // a window-respecting view. Reads from liveReceipts (the full
  // soft-delete-filtered set), not windowReceipts — the chart's job
  // is to show trend, not honor the active chip.
  const trend6mo = useMemo(() => {
    const buckets = [];
    for (let i = 5; i >= 0; i--) {
      const d = startOfMonthOffset(now, i);
      buckets.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: d.toLocaleDateString(undefined, { month: "short" }),
        total: 0,
      });
    }
    const earliest = buckets[0] ? startOfMonthOffset(now, 5).getTime() : 0;
    for (const r of liveReceipts) {
      const t = Date.parse(r.purchasedAt || r.createdAt || 0);
      if (!Number.isFinite(t) || t < earliest) continue;
      const key = monthBucketKey(r.purchasedAt || r.createdAt);
      const bucket = buckets.find((b) => b.key === key);
      if (!bucket) continue;
      const v = effectiveTotal(r);
      if (v != null) bucket.total += v;
    }
    return buckets;
  }, [liveReceipts, now]);

  // Per-item price trends — group EVERY item across liveReceipts (not
  // just the window — trends need history to be meaningful) by
  // itemIdentityKey. Returns one row per identity that has 2+
  // OCCURRENCES across DIFFERENT receipts. Day-one sparse-by-design.
  const trendItems = useMemo(() => {
    const map = new Map();
    for (const r of liveReceipts) {
      const items = Array.isArray(r.ocrRaw?.items_reviewed) ? r.ocrRaw.items_reviewed : [];
      const seenInReceipt = new Set();
      for (const line of items) {
        const key = itemIdentityKey(line);
        if (!key) continue;
        // Dedupe within a receipt — a receipt with the same UPC twice
        // (the qty-2 / line-split case) is one occurrence for trend
        // purposes; price changes ACROSS trips is the signal.
        if (seenInReceipt.has(key)) continue;
        seenInReceipt.add(key);
        const price = effectiveUnitPrice(line);
        if (price == null) continue;
        if (!map.has(key)) {
          map.set(key, {
            key,
            title: line.title || "(untitled)",
            brand: line.brand || "",
            occurrences: [],
          });
        }
        const slot = map.get(key);
        slot.occurrences.push({
          receiptId: r.id,
          purchasedAt: r.purchasedAt || r.createdAt,
          price,
          title: line.title || slot.title,
          brand: line.brand || slot.brand,
        });
        // Prefer the most-recent non-empty title for display.
        if (line.title) slot.title = line.title;
        if (line.brand) slot.brand = line.brand;
      }
    }
    const rows = [];
    for (const slot of map.values()) {
      slot.occurrences.sort((a, b) =>
        Date.parse(a.purchasedAt || 0) - Date.parse(b.purchasedAt || 0)
      );
      if (slot.occurrences.length < 2) continue;
      const first = slot.occurrences[0];
      const last = slot.occurrences[slot.occurrences.length - 1];
      const pct = pctChange(first.price, last.price);
      rows.push({
        key: slot.key,
        title: slot.title,
        brand: slot.brand,
        first,
        last,
        pct,
        occurrences: slot.occurrences,
      });
    }
    // Largest absolute price change first, so "where's the leak" is at top.
    rows.sort((a, b) => Math.abs(b.last.price - b.first.price) - Math.abs(a.last.price - a.first.price));
    return rows;
  }, [liveReceipts]);

  // Count of items WITH a precise identity but only one occurrence — the
  // "almost-tracked" pool. Surfaced in the empty/sparse state copy so
  // Mike understands what's coming next time he scans the same product.
  const almostTrackedCount = useMemo(() => {
    const map = new Map();
    for (const r of liveReceipts) {
      const items = Array.isArray(r.ocrRaw?.items_reviewed) ? r.ocrRaw.items_reviewed : [];
      const seen = new Set();
      for (const line of items) {
        const key = itemIdentityKey(line);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        map.set(key, (map.get(key) || 0) + 1);
      }
    }
    let count = 0;
    for (const n of map.values()) if (n === 1) count += 1;
    return count;
  }, [liveReceipts]);

  // By-store breakdown — group windowReceipts by storeChain (normalized)
  // with storeName fallback. The sum of all store totals is forced to
  // equal summary.total because both read from the same array.
  const byStore = useMemo(() => {
    const map = new Map();
    for (const r of windowReceipts) {
      const chain = (r.storeChain && String(r.storeChain).trim()) || null;
      const name = (r.storeName && String(r.storeName).trim()) || null;
      const key = chain || (name ? name.toLowerCase() : "other");
      const display = name || (chain ? chain.replace(/_/g, " ") : "Other");
      const v = effectiveTotal(r);
      if (!map.has(key)) {
        map.set(key, { key, display, total: 0, count: 0, missing: 0, receiptIds: [] });
      }
      const slot = map.get(key);
      if (v == null) slot.missing += 1;
      else slot.total += v;
      slot.count += 1;
      slot.receiptIds.push(r.id);
      // Prefer the most-readable display string we've seen for this group.
      if (name && (slot.display === slot.display.toLowerCase() || slot.display === name)) {
        slot.display = name;
      }
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [windowReceipts]);

  // Receipt drill-down ALWAYS wins — reuse Receipts.jsx ReceiptDetail
  // unchanged. Back returns to whatever sub-view the user came from.
  const openReceipt = openReceiptId
    ? liveReceipts.find((r) => r.id === openReceiptId) || null
    : null;
  if (openReceipt) {
    return (
      <ReceiptDetail
        receipt={openReceipt}
        users={users}
        shoppingItems={shoppingItems}
        canEdit={!isKid && !!updateReceipt}
        canDelete={!isKid && !!softDeleteReceipt}
        onBack={() => setOpenReceiptId(null)}
        onSave={(patch) => updateReceipt && updateReceipt(openReceipt.id, patch)}
        onDelete={softDeleteReceipt ? () => {
          softDeleteReceipt(openReceipt.id);
          setOpenReceiptId(null);
        } : null}
      />
    );
  }

  // Per-item history sub-view — the only place a real chart with
  // axes lives on this page. Drilled into from a TrendRow tap.
  if (trendDrilldownKey) {
    const row = trendItems.find((t) => t.key === trendDrilldownKey);
    if (row) {
      return (
        <TrendDrilldown
          row={row}
          receipts={liveReceipts}
          onBack={() => setTrendDrilldownKey(null)}
          onOpenReceipt={(id) => setOpenReceiptId(id)}
        />
      );
    }
    setTrendDrilldownKey(null);
  }

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

      {/* 6-month trend chart — always 6 months, regardless of the
          selected window. Anchored context for the "are we trending
          up or down?" question. Hand-rolled CSS-grid bars; the only
          real chart on the page lives in the per-item drill-in. */}
      {liveReceipts.length > 0 && <TrendChart buckets={trend6mo} />}

      {/* By-store breakdown — list (not pie). The sum here always
          equals the headline total because both read the same
          filtered array. Tap a row to inline-expand the receipts
          that contributed to that store's total in this window. */}
      {byStore.length > 0 && (
        <div className="bg-white rounded-2xl p-3 shadow-sm">
          <div className="text-[10px] text-slate-400 uppercase tracking-wide mb-2 px-1">
            By store
          </div>
          {byStore.map((s) => (
            <StoreRow
              key={s.key}
              store={s}
              expanded={expandedStoreKey === s.key}
              onToggle={() => setExpandedStoreKey(expandedStoreKey === s.key ? null : s.key)}
              receipts={windowReceipts}
              onOpenReceipt={(id) => setOpenReceiptId(id)}
            />
          ))}
        </div>
      )}

      {/* Price trends — per-item, precise-identity (UPC or linked
          shopping_item_id only, no fuzzy fallback). Sparse on day-one;
          empty/sparse state explains the bridge to filling it. */}
      {liveReceipts.length > 0 && (
        <TrendsSection
          items={trendItems}
          almostTracked={almostTrackedCount}
          onOpenItem={(key) => setTrendDrilldownKey(key)}
        />
      )}

      {liveReceipts.length === 0 && (
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

// =================== trends section ===================

function TrendsSection({ items, almostTracked, onOpenItem }) {
  return (
    <div className="bg-white rounded-2xl p-3 shadow-sm">
      <div className="text-[10px] text-slate-400 uppercase tracking-wide mb-2 px-1">
        Price trends
      </div>
      {items.length === 0 ? (
        <div className="px-2 py-4 text-center">
          <div className="text-sm text-slate-500 leading-relaxed">
            {almostTracked > 0
              ? `${almostTracked} ${almostTracked === 1 ? "item is" : "items are"} waiting for a second occurrence to start trending.`
              : "Nothing to trend yet."}
          </div>
          <div className="text-[12px] text-slate-400 mt-2 leading-relaxed">
            Each item needs to appear on 2+ receipts to show a price trend.
            Tag a line to your shopping list at scan time and we'll track its
            price across trips.
          </div>
        </div>
      ) : (
        <>
          {items.map((row) => (
            <TrendRow key={row.key} row={row} onOpen={() => onOpenItem(row.key)} />
          ))}
          <div className="text-[11px] text-slate-400 mt-2 px-2 leading-relaxed">
            {almostTracked > 0
              ? `${almostTracked} more ${almostTracked === 1 ? "item is" : "items are"} waiting for a second occurrence. `
              : ""}
            Tag more lines at scan time to grow this list.
          </div>
        </>
      )}
    </div>
  );
}

function TrendRow({ row, onOpen }) {
  const pct = row.pct;
  const direction = pct == null ? null : pct > 0.5 ? "up" : pct < -0.5 ? "down" : "flat";
  const pctColor =
    direction === "up" ? "text-rose-600" : direction === "down" ? "text-emerald-600" : "text-slate-400";
  const pctLabel =
    pct == null ? "" : `${pct > 0 ? "+" : ""}${pct.toFixed(0)}%`;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full flex items-center gap-2 px-1 py-2 border-b border-slate-100 last:border-b-0 active:bg-slate-50 text-left"
    >
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-slate-800 truncate">{row.title}</div>
        {row.brand && <div className="text-[11px] text-slate-500 truncate">{row.brand}</div>}
        <div className="text-[11px] text-slate-500 mt-0.5">
          {formatCents(row.first.price)} → {formatCents(row.last.price)}
          {" · "}
          {row.occurrences.length} {row.occurrences.length === 1 ? "trip" : "trips"}
        </div>
      </div>
      <Sparkline occurrences={row.occurrences} />
      <div className={`text-[12px] font-bold w-12 text-right ${pctColor}`}>{pctLabel}</div>
      <ChevronRight size={12} className="text-slate-300 flex-shrink-0" />
    </button>
  );
}

// =================== per-item drill-in ===================

function TrendDrilldown({ row, receipts, onBack, onOpenReceipt }) {
  const pctLabel = row.pct == null
    ? ""
    : `${row.pct > 0 ? "+" : ""}${row.pct.toFixed(1)}%`;
  const direction = row.pct == null ? null : row.pct > 0.5 ? "up" : row.pct < -0.5 ? "down" : "flat";
  const pctColor =
    direction === "up" ? "text-rose-600" : direction === "down" ? "text-emerald-600" : "text-slate-400";
  return (
    <div className="space-y-3 pb-4">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-xs text-slate-500 active:text-slate-700"
      >
        <ChevronLeft size={14} /> Spending
      </button>

      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="font-bold text-base text-slate-800">{row.title}</div>
        {row.brand && <div className="text-[12px] text-slate-500 mt-0.5">{row.brand}</div>}
        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100">
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wide">First</div>
            <div className="text-sm font-bold text-slate-700">{formatCents(row.first.price)}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wide">Latest</div>
            <div className="text-sm font-bold text-slate-700">{formatCents(row.last.price)}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wide">Change</div>
            <div className={`text-sm font-bold ${pctColor}`}>{pctLabel || "—"}</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-3 shadow-sm">
        <div className="text-[10px] text-slate-400 uppercase tracking-wide mb-2 px-1">
          Price over time
        </div>
        <PriceChart occurrences={row.occurrences} />
      </div>

      <div className="bg-white rounded-2xl p-3 shadow-sm">
        <div className="text-[10px] text-slate-400 uppercase tracking-wide mb-2 px-1">
          {row.occurrences.length} {row.occurrences.length === 1 ? "trip" : "trips"}
        </div>
        {row.occurrences.map((o, idx) => (
          <button
            key={`${o.receiptId}_${idx}`}
            type="button"
            onClick={() => onOpenReceipt(o.receiptId)}
            className="w-full px-2 py-2 flex items-center gap-3 border-b border-slate-100 last:border-b-0 active:bg-slate-50 text-left"
          >
            <ReceiptIcon size={14} className="text-slate-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-slate-700">{formatShortDate(o.purchasedAt)}</div>
              {o.title && o.title !== row.title && (
                <div className="text-[11px] text-slate-400 truncate">labeled "{o.title}"</div>
              )}
            </div>
            <div className="text-sm font-bold text-slate-700 flex-shrink-0">
              {formatCents(o.price)}
            </div>
            <ChevronRight size={12} className="text-slate-300 flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}

// The only real chart on the page — line chart with min/max labels.
// Still hand-rolled SVG, no library.
function PriceChart({ occurrences }) {
  const W = 320;
  const H = 100;
  const PAD = 16;
  const prices = occurrences.map((o) => o.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || max * 0.1 || 1;
  const yMin = min - range * 0.1;
  const yMax = max + range * 0.1;
  const xStep = occurrences.length === 1 ? 0 : (W - PAD * 2) / (occurrences.length - 1);
  const points = occurrences.map((o, i) => {
    const x = PAD + i * xStep;
    const y = H - PAD - ((o.price - yMin) / (yMax - yMin)) * (H - PAD * 2);
    return { x, y, price: o.price };
  });
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-24">
        <path d={path} stroke="currentColor" strokeWidth="2" fill="none"
              className="text-emerald-500"
              strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="currentColor" className="text-emerald-600" />
        ))}
      </svg>
      <div className="flex justify-between text-[10px] text-slate-400 px-1 mt-1">
        <span>{formatCents(min)}</span>
        <span>{formatCents(max)}</span>
      </div>
    </div>
  );
}

// Tiny inline SVG sparkline — 32x16, no axes. Trend direction only.
function Sparkline({ occurrences }) {
  const W = 36;
  const H = 18;
  if (!occurrences || occurrences.length < 2) {
    return <div style={{ width: W, height: H }} />;
  }
  const prices = occurrences.map((o) => o.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const step = occurrences.length === 1 ? 0 : W / (occurrences.length - 1);
  const points = occurrences
    .map((o, i) => {
      const x = i * step;
      const y = H - ((o.price - min) / range) * H;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={W} height={H} className="flex-shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="text-slate-400"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// =================== trend chart ===================

function TrendChart({ buckets }) {
  const max = Math.max(1, ...buckets.map((b) => b.total));
  return (
    <div className="bg-white rounded-2xl p-3 shadow-sm">
      <div className="text-[10px] text-slate-400 uppercase tracking-wide mb-2 px-1">
        Last 6 months
      </div>
      <div className="flex items-end gap-1.5 h-16">
        {buckets.map((b) => {
          const heightPct = max > 0 ? Math.max(2, (b.total / max) * 100) : 2;
          const isCurrent = b === buckets[buckets.length - 1];
          return (
            <div key={b.key} className="flex-1 flex flex-col items-center gap-1">
              <div className="flex-1 w-full flex items-end">
                <div
                  className={
                    "w-full rounded-t-md " +
                    (isCurrent ? "bg-emerald-500" : "bg-slate-300")
                  }
                  style={{ height: `${heightPct}%` }}
                  title={`${b.label}: ${formatDollars(b.total)}`}
                />
              </div>
              <div className="text-[10px] text-slate-400">{b.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =================== store row + inline expand ===================

function StoreRow({ store, expanded, onToggle, receipts, onOpenReceipt }) {
  const storeReceipts = useMemo(() => {
    if (!expanded) return [];
    const set = new Set(store.receiptIds);
    return receipts
      .filter((r) => set.has(r.id))
      .slice()
      .sort((a, b) =>
        Date.parse(b.purchasedAt || b.createdAt || 0)
        - Date.parse(a.purchasedAt || a.createdAt || 0)
      );
  }, [expanded, store.receiptIds, receipts]);
  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-2 py-2 flex items-center gap-3 active:bg-slate-50 text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm text-slate-800 truncate">{store.display}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {store.count} {store.count === 1 ? "receipt" : "receipts"}
            {store.missing > 0 ? ` · ${store.missing} missing total` : ""}
          </div>
        </div>
        <div className="font-bold text-sm text-slate-700 flex-shrink-0">
          {formatDollars(store.total)}
        </div>
        {expanded ? (
          <ChevronDown size={14} className="text-slate-400 flex-shrink-0" />
        ) : (
          <ChevronRight size={14} className="text-slate-400 flex-shrink-0" />
        )}
      </button>
      {expanded && (
        <div className="pl-2 pb-2 space-y-1">
          {storeReceipts.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onOpenReceipt(r.id)}
              className="w-full bg-slate-50 rounded-lg px-3 py-2 flex items-center gap-2 text-left active:bg-slate-100"
            >
              <ReceiptIcon size={14} className="text-slate-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[12px] text-slate-700 truncate">
                  {formatShortDate(r.purchasedAt || r.createdAt)}
                </div>
              </div>
              <div className="text-[12px] font-bold text-slate-700 flex-shrink-0">
                {formatCents(effectiveTotal(r))}
              </div>
              <ChevronRight size={12} className="text-slate-300 flex-shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function formatShortDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
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
