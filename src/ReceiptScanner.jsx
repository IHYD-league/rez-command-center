// RS-1 ReceiptScanner — the real review UI.
//
// Replaces the prior placeholder. Implements the full spec from
// the RS-1 design Mike approved:
//   capture → upload → parse → REVIEW → commit
//
// Capture: file input (no live camera — desktop file picker; iOS
// Safari surfaces "Take Photo" / "Photo Library").
// Upload: uploadFamilyPhoto with kind="receipt" — 1500px max edge,
// 0.85 JPEG quality (per src/lib/storage.js COMPRESSION_CONFIG;
// receipts need more resolution than product scans).
// Parse: POST to /api/vision-parse kind="receipt".
// Review (POST-DEMOTE 2026-06-17): receipts are accounting, the
// shopping list is intent — they're orthogonal. Receipt review is
// editing the parsed title / brand / qty / price for accuracy, NOT
// linking to shopping_items. Linking is a QUIET opt-in via a small
// gray "🔗 Tag to list item" affordance per row; never colored,
// never pushed. Auto-match still computes match_confidence + the
// auto_matched_shopping_item_id for future debugging and to
// pre-highlight a suggestion in the picker, but confirmed_shopping_
// item_id ALWAYS defaults null. The user opts in to link; nothing
// auto-attaches a receipt line to the grocery list.
// Commit: single INSERT into receipts via addReceipt, with ocr_raw
// carrying the FULL promotion contract for RS-2:
//   ocr_raw = {
//     vision: <verbatim vision-parse response>,
//     items_reviewed: [
//       { title, brand, qty, unit, unit_price, line_total,
//         auto_matched_shopping_item_id, match_confidence,
//         confirmed_shopping_item_id, source }, ...
//     ]
//   }
// Receipt-level fields (store_chain, store_label, purchased_at,
// currency, family_id, uploaded_by, id) live on the receipts row.
//
// ⚠️ AUTH GAP — STILL OPEN (audit doc 2026-06-13 #6).
// /api/vision-parse has no JWT verification. This brick now puts
// REAL receipt data (store, dates, dollar amounts) through that
// unauthenticated function. The gap MUST close before ANY non-Lynch
// family scans a receipt. See docs/AUDIT-2026-06-13-TRUST-AND-COST.md
// for the fix sketch.
//
// Scope of this brick: receipts capture only. Does NOT promote to a
// purchases table (RS-2), does NOT power spending insights (RS-3),
// does NOT auto-check items off the shopping list when a receipt
// arrives. Saving the receipt is the whole win.

import React, { useEffect, useMemo, useState } from "react";
import { uploadFamilyPhoto } from "./lib/storage.js";
import { scanImage } from "./lib/visionScan.js";

// Auto-match threshold — green chip ≥ 0.8 (high confidence,
// auto-confirmed). Yellow best-guess between 0.5 and 0.8 (user must
// confirm). Below 0.5 the row gets "no match — pick or skip" and
// confirmed_shopping_item_id stays null until user acts.
//
// NOTE: fuzzyMatch returns scores in the 0–200ish range (substring
// hits return 200 - position, subsequence returns 80, word-distance
// returns 40+). We normalize to a 0..1 confidence by max-rate-of-200.
// Auto-match score floor — anything ≥ this gets surfaced as a
// "Suggested:" highlight at the top of the picker when the user
// opens it. Below this floor, no suggestion is offered. We never
// auto-link, regardless of score (receipts ≠ shopping list).
const SUGGEST_FLOOR = 100; // 0.5 of 200 — same as the prior REVIEW threshold

function normalizeChain(input) {
  return String(input || "").trim().toLowerCase().replace(/\s+/g, "_");
}

// Format a receipts-row purchased_at into a value attribute for a
// datetime-local input ("YYYY-MM-DDTHH:MM"). Receipts can carry
// either full ISO or date-only; the picker tolerates both.
function isoForInput(iso) {
  if (!iso) return "";
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  if (!m) return "";
  const [, y, mo, d, hh = "00", mm = "00"] = m;
  return `${y}-${mo}-${d}T${hh}:${mm}`;
}
function inputToIso(value) {
  if (!value) return null;
  // datetime-local gives "YYYY-MM-DDTHH:MM" (no seconds, no tz)
  return value.length >= 16 ? `${value}:00` : `${value}T00:00:00`;
}

// Default the source pill based on how recent the receipt is.
// Within 14 days = "Today's receipt"; older = "Historical (backfill)".
function defaultSource(purchasedAtIso) {
  if (!purchasedAtIso) return "receipt";
  const t = Date.parse(purchasedAtIso);
  if (Number.isNaN(t)) return "receipt";
  const ageDays = (Date.now() - t) / 86400000;
  return ageDays > 14 ? "backfill" : "receipt";
}

// Compute the auto-match candidate for a parsed line.
// Filters to active shopping_items only (deleted_at IS NULL — Black's
// soft-delete contract). Returns { itemId, score } or null.
function bestMatch({ title, brand }, candidates, fuzzy) {
  if (typeof fuzzy !== "function" || !title) return null;
  const haystackQuery = brand ? `${title} ${brand}` : title;
  let best = null;
  for (const it of candidates) {
    if (!it || !it.title) continue;
    // Honor Black's soft-delete: skip items removed into the bin.
    if (it.deletedAt) continue;
    const target = it.brand ? `${it.title} ${it.brand}` : it.title;
    const m = fuzzy(haystackQuery, target);
    if (!m?.hit) continue;
    if (!best || m.score > best.score) best = { itemId: it.id, score: m.score };
  }
  return best;
}

export default function ReceiptScanner({ onClose, activeListKey, addReceipt, familyId, shoppingItems = [], fuzzyMatch }) {
  // Flow state — capture / parsing / review / saving / error.
  const [stage, setStage] = useState("capture");
  const [errorMsg, setErrorMsg] = useState("");

  // Parse payload (vision raw response stored separately from the
  // editable form — ocr_raw.vision is verbatim for re-review).
  const [visionRaw, setVisionRaw] = useState(null);

  // Editable receipt-header form.
  const [imagePath, setImagePath] = useState("");
  const [storeName, setStoreName] = useState("");
  const [storeChain, setStoreChain] = useState("");
  const [storeLabel, setStoreLabel] = useState("");
  const [purchasedAt, setPurchasedAt] = useState("");
  const [subtotal, setSubtotal] = useState("");
  const [tax, setTax] = useState("");
  const [total, setTotal] = useState("");
  const [source, setSource] = useState("receipt");

  // Editable line items — each entry tracks both the parsed shape and
  // the user-resolved match. confirmed_shopping_item_id is what RS-2
  // reads on promotion; null = no link (skipped or unreviewed).
  const [items, setItems] = useState([]);
  // Save state — guard against double-tap.
  const [saving, setSaving] = useState(false);

  // Capture handler — file picker → compress → upload → parse.
  const onPickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!familyId) {
      setErrorMsg("Couldn't determine your family. Try reloading.");
      setStage("error");
      return;
    }
    setErrorMsg("");
    setStage("parsing");
    try {
      // Upload first so the image_path exists even if parsing later
      // fails; lets the user retry parse without re-uploading.
      const { path } = await uploadFamilyPhoto({ file, familyId, kind: "receipt" });
      setImagePath(path);
      const j = await scanImage({ file, kind: "receipt" });
      if (j.status === "vision_not_configured") {
        setErrorMsg("Receipt scanner isn't set up — try again later.");
        setStage("error");
        return;
      }
      if (j.status !== "ok") {
        setErrorMsg("Couldn't read that receipt. Try a sharper photo with the whole receipt in frame.");
        setStage("error");
        return;
      }
      const data = j.data || {};
      const parsedItems = Array.isArray(data.items) ? data.items : [];
      if (parsedItems.length === 0) {
        setErrorMsg("This doesn't look like a receipt. Pick a different image?");
        setStage("error");
        return;
      }
      // Land vision-raw verbatim for ocr_raw.vision.
      setVisionRaw(data);
      // Pre-fill the editable form.
      setStoreName(String(data.store_name || ""));
      setStoreChain(normalizeChain(data.store_chain));
      setStoreLabel("");
      const pAt = data.purchased_at || new Date().toISOString();
      setPurchasedAt(pAt);
      setSubtotal(data.subtotal != null ? String(data.subtotal) : "");
      setTax(data.tax != null ? String(data.tax) : "");
      setTotal(data.total != null ? String(data.total) : "");
      setSource(defaultSource(pAt));
      // Auto-match each parsed line against active shopping_items
      // for the PICKER suggestion only. confirmed_shopping_item_id
      // ALWAYS defaults null — the user opts in to link by tapping
      // "🔗 Tag to list item." Receipts don't push themselves onto
      // the shopping list.
      const matched = parsedItems.map((it, idx) => {
        const best = bestMatch({ title: it.title, brand: it.brand }, shoppingItems, fuzzyMatch);
        const confidence = best ? Math.min(1, best.score / 200) : null;
        const autoId = best && best.score >= SUGGEST_FLOOR ? best.itemId : null;
        return {
          // local UI key — not persisted
          _key: `rl_${idx}_${Math.random().toString(36).slice(2, 7)}`,
          title: String(it.title || ""),
          brand: it.brand || "",
          qty: it.qty != null ? Number(it.qty) || 1 : 1,
          unit: it.unit || "",
          unit_price: it.unit_price != null ? Number(it.unit_price) : null,
          line_total: it.line_total != null ? Number(it.line_total) : null,
          auto_matched_shopping_item_id: autoId,    // kept in ocr_raw for future analysis
          match_confidence: confidence,             // kept in ocr_raw for future analysis
          confirmed_shopping_item_id: null,         // user-opt-in only
        };
      });
      setItems(matched);
      setStage("review");
    } catch (err) {
      // Catch covers: upload failure, network drop, or client-side
      // image-decode failure (e.g. desktop Chrome can't decode HEIC;
      // iOS Safari handles HEIC natively, so on the device the family
      // actually uses this should rarely fire). Calm generic copy —
      // no platform-specific alarm — keeps the door open for the
      // working path. Raw error stays in the console for debugging.
      console.error("Receipt scan failed:", err);
      setErrorMsg("Couldn't read that image — try a different photo, or a screenshot of it.");
      setStage("error");
    }
  };

  // Live items-sum vs receipt-total sanity nudge (>5¢ tolerance).
  const itemsSum = useMemo(() => {
    return items.reduce((s, it) => s + (Number(it.line_total) || 0), 0);
  }, [items]);
  const totalNum = useMemo(() => {
    const v = parseFloat(total);
    return Number.isFinite(v) ? v : null;
  }, [total]);
  const mismatch = totalNum != null && Math.abs(itemsSum - totalNum) > 0.05;

  const updateItem = (key, patch) => {
    setItems((prev) => prev.map((it) => (it._key === key ? { ...it, ...patch } : it)));
  };

  const dropItem = (key) => {
    setItems((prev) => prev.filter((it) => it._key !== key));
  };

  // Linking a receipt line to a shopping_items row is now opt-in,
  // not driven. Tapping the gray "🔗 Tag to list item" pill opens
  // the picker; picking sets confirmed_shopping_item_id. The
  // "change" path on a linked line opens the same picker.
  const setLink = (key, shoppingItemId) => {
    updateItem(key, { confirmed_shopping_item_id: shoppingItemId || null });
  };

  // Commit — single addReceipt call with full ocr_raw promotion contract.
  const commitReceipt = async () => {
    if (typeof addReceipt !== "function") {
      setErrorMsg("Couldn't save — addReceipt isn't wired. Try reloading.");
      setStage("error");
      return;
    }
    if (saving) return;
    // No "are you sure?" / "save anyway?" gates here. Receipts are
    // accounting — saving the receipt as-edited IS the action.
    // Linking is opt-in elsewhere; absence of links is fine.
    setSaving(true);
    try {
      const itemsReviewed = items.map((it) => ({
        title: it.title,
        brand: it.brand || null,
        qty: Number(it.qty) || 1,
        unit: it.unit || null,
        unit_price: it.unit_price != null ? Number(it.unit_price) : null,
        line_total: it.line_total != null ? Number(it.line_total) : null,
        auto_matched_shopping_item_id: it.auto_matched_shopping_item_id,
        match_confidence: it.match_confidence,
        confirmed_shopping_item_id: it.confirmed_shopping_item_id,
        source,
      }));
      const row = {
        imagePath,
        storeName: storeName || null,
        storeChain: normalizeChain(storeChain) || null,
        storeLabel: storeLabel || null,
        purchasedAt: inputToIso(isoForInput(purchasedAt)) || new Date().toISOString(),
        subtotal: subtotal !== "" ? Number(subtotal) : null,
        tax: tax !== "" ? Number(tax) : null,
        total: total !== "" ? Number(total) : null,
        currency: "USD",
        parsedStatus: "parsed",
        ocrRaw: {
          vision: visionRaw,
          items_reviewed: itemsReviewed,
        },
      };
      addReceipt(row);
      onClose?.();
    } catch (err) {
      console.error("Receipt commit failed:", err);
      setErrorMsg(String(err?.message || err));
      setSaving(false);
      setStage("error");
    }
  };

  // Live shopping_items pool for the manual picker (yellow chip tap),
  // scoped to active rows. Sorted alphabetically. Tiny — a family has
  // a few dozen items at most.
  const activeShoppingItems = useMemo(() => {
    return (shoppingItems || [])
      .filter((it) => it && !it.deletedAt)
      .map((it) => ({ id: it.id, title: it.title || "", brand: it.brand || "" }))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [shoppingItems]);

  // ============ RENDER ============

  const headerBar = (
    <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
      <button
        type="button"
        onClick={onClose}
        className="text-slate-500 font-bold text-sm"
      >
        ← Cancel
      </button>
      <div className="font-extrabold text-sm text-slate-800">Receipt</div>
      {stage === "review" ? (
        <button
          type="button"
          onClick={commitReceipt}
          disabled={saving || items.length === 0}
          className={`px-3 py-1.5 rounded-xl font-bold text-xs ${saving || items.length === 0 ? "bg-slate-200 text-slate-400" : "bg-emerald-600 text-white"}`}
        >
          {saving ? "Saving…" : `Save (${items.length})`}
        </button>
      ) : (
        <div className="w-12" />
      )}
    </div>
  );

  // ---------------- CAPTURE ----------------
  if (stage === "capture") {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col" role="dialog" aria-modal="true" aria-label="Receipt scanner">
        {headerBar}
        <div className="flex-1 px-6 py-8 overflow-y-auto flex flex-col items-center justify-center text-center">
          <div className="text-6xl mb-4">🧾</div>
          <div className="font-extrabold text-base text-emerald-800 mb-1">Scan a receipt</div>
          <div className="text-[12px] text-slate-600 max-w-xs mb-6 leading-snug">
            Snap or upload a photo of a grocery receipt. We'll pull out the store, the date, the items and the prices for you to review.
          </div>
          <label className="block w-full max-w-xs">
            <input
              type="file"
              accept="image/*"
              onChange={onPickFile}
              className="hidden"
            />
            <span className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm cursor-pointer active:scale-[0.99]">
              📷 Pick a photo
            </span>
          </label>
          <div className="text-[11px] text-slate-400 mt-3">
            Old receipts work too — you can adjust the date during review.
          </div>
        </div>
      </div>
    );
  }

  // ---------------- PARSING ----------------
  if (stage === "parsing") {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col" role="dialog" aria-modal="true" aria-label="Reading receipt">
        {headerBar}
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="text-4xl mb-3 animate-pulse">🧾</div>
          <div className="font-bold text-sm text-slate-700 mb-1">Reading the receipt…</div>
          <div className="text-[12px] text-slate-500 leading-snug max-w-xs">
            Pulling store, date, and line items. This usually takes a few seconds.
          </div>
        </div>
      </div>
    );
  }

  // ---------------- ERROR ----------------
  if (stage === "error") {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col" role="dialog" aria-modal="true" aria-label="Receipt scan error">
        {headerBar}
        <div className="flex-1 px-6 py-8 overflow-y-auto flex flex-col items-center justify-center text-center">
          <div className="text-5xl mb-3">😬</div>
          <div className="font-bold text-sm text-slate-700 mb-2">Couldn't read this one</div>
          <div className="text-[12px] text-rose-700 max-w-xs mb-6 leading-snug">
            {errorMsg}
          </div>
          <label className="block w-full max-w-xs mb-2">
            <input type="file" accept="image/*" onChange={onPickFile} className="hidden" />
            <span className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm cursor-pointer active:scale-[0.99]">
              📷 Pick another photo
            </span>
          </label>
          <button
            type="button"
            onClick={onClose}
            className="w-full max-w-xs py-2.5 rounded-xl bg-slate-100 text-slate-500 font-bold text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ---------------- REVIEW ----------------
  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col" role="dialog" aria-modal="true" aria-label="Review receipt">
      {headerBar}
      <div className="flex-1 overflow-y-auto">
        {/* Header card — store + date + totals */}
        <div className="px-4 py-4 border-b border-slate-100">
          <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">Store</div>
          <input
            type="text"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            placeholder="Store name"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold text-slate-800 mb-2"
          />
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={storeChain}
              onChange={(e) => setStoreChain(e.target.value)}
              onBlur={(e) => setStoreChain(normalizeChain(e.target.value))}
              placeholder="chain (lowercase)"
              className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-[12px] text-slate-700"
            />
            <input
              type="text"
              value={storeLabel}
              onChange={(e) => setStoreLabel(e.target.value)}
              placeholder="Label (Burbank)"
              className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-[12px] text-slate-700"
            />
          </div>

          <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">Date</div>
          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => setSource("receipt")}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold ${source === "receipt" ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-slate-50 text-slate-500 border border-slate-200"}`}
            >
              📅 Today's receipt
            </button>
            <button
              type="button"
              onClick={() => setSource("backfill")}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold ${source === "backfill" ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-slate-50 text-slate-500 border border-slate-200"}`}
            >
              📜 Historical (backfill)
            </button>
          </div>
          <input
            type="datetime-local"
            value={isoForInput(purchasedAt)}
            onChange={(e) => setPurchasedAt(inputToIso(e.target.value) || "")}
            className={`w-full px-3 py-2 rounded-lg text-sm text-slate-800 mb-3 ${source === "backfill" ? "border-2 border-emerald-400 bg-emerald-50" : "border border-slate-200"}`}
          />

          <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">Totals</div>
          <div className="grid grid-cols-3 gap-2">
            <label className="block">
              <div className="text-[10px] text-slate-500 mb-0.5">Subtotal</div>
              <input
                type="number"
                step="0.01"
                value={subtotal}
                onChange={(e) => setSubtotal(e.target.value)}
                placeholder="0.00"
                className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-800"
              />
            </label>
            <label className="block">
              <div className="text-[10px] text-slate-500 mb-0.5">Tax</div>
              <input
                type="number"
                step="0.01"
                value={tax}
                onChange={(e) => setTax(e.target.value)}
                placeholder="0.00"
                className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-800"
              />
            </label>
            <label className="block">
              <div className="text-[10px] text-slate-500 mb-0.5">Total</div>
              <input
                type="number"
                step="0.01"
                value={total}
                onChange={(e) => setTotal(e.target.value)}
                placeholder="0.00"
                className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-sm font-bold text-slate-800"
              />
            </label>
          </div>
          {mismatch && (
            <div className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 mt-2">
              Items sum to ${itemsSum.toFixed(2)} — receipt total is ${totalNum.toFixed(2)}. Just a heads-up.
            </div>
          )}
        </div>

        {/* Items list. No "Review these" banner — linking is opt-in
            and unlinked rows are fine. */}
        <div className="px-4 py-2">
          <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-2">
            Items ({items.length})
          </div>
          {items.map((it) => (
            <ReceiptItemRow
              key={it._key}
              item={it}
              candidates={activeShoppingItems}
              onUpdate={(patch) => updateItem(it._key, patch)}
              onDrop={() => dropItem(it._key)}
              onLink={(shoppingItemId) => setLink(it._key, shoppingItemId)}
            />
          ))}
        </div>

        <div className="px-4 pb-12 text-[10px] text-slate-400 text-center leading-snug">
          List context: <code className="font-mono">{activeListKey || "(none)"}</code> — carried for the future write path; not used by this brick.
        </div>
      </div>
    </div>
  );
}

// One line on the receipt. Editable inline; chip changes color by
// match state (green high-confidence, yellow best-guess or no-match,
// gray skipped).
function ReceiptItemRow({ item, candidates, onUpdate, onDrop, onConfirm, onSkip, rowRef }) {
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
function PickerSheet({ query, onQueryChange, candidates, suggestion, currentlyLinkedId, onPick, onUnlink, onClose }) {
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
