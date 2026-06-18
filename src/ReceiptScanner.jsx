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
import ReceiptItemRow from "./ReceiptItemRow.jsx";

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

// =============== RS-1.5 UPC-lookup helpers ===============
//
// The terse-heuristic gate. Decides whether an OFF-resolved title is
// allowed to REPLACE the parser's title. The rule, restated:
//
//   Apply OFF only when the parser's title looks like a receipt
//   abbreviation (ALL CAPS with short tokens or vowel-less tokens)
//   AND OFF's title looks like a real product name (multi-word).
//
// This is the SUPERMAN guard: a non-food line that happens to carry
// a colliding UPC must not be silently rewritten into something
// food-shaped. Readable lines stay untouched.

// "EB PUF CHED", "GV WHP DRSG", "MAND 3 BAG" → true
// "Superman", "Goldfish XL", "Whipped Dressing" → false
function isTerseParserTitle(s) {
  if (!s) return false;
  const t = String(s).trim();
  if (!t) return false;
  // Must be uppercase to be receipt-style. "Superman" stays unmodified.
  const isAllCaps = t === t.toUpperCase() && /[A-Z]/.test(t);
  if (!isAllCaps) return false;
  const tokens = t.split(/\s+/).filter(Boolean);
  const hasShortToken = tokens.some((tk) => /^[A-Z]{2,3}$/.test(tk));
  const hasVowellessToken = tokens.some((tk) => /^[A-Z]{3,}$/.test(tk) && !/[AEIOU]/.test(tk));
  return hasShortToken || hasVowellessToken;
}

// "Earthbound Farm Puffed Cheddar" → true; "X" → false.
function isCleanOffTitle(s) {
  if (!s) return false;
  const t = String(s).trim();
  return /\s/.test(t) && t.length >= 4;
}

// The single decision point — both sides must say yes.
function shouldApplyOff(parserTitle, offTitle) {
  if (!isTerseParserTitle(parserTitle) || !isCleanOffTitle(offTitle)) return false;
  // OFF title must be strictly longer; equal-length swaps are suspect.
  return String(offTitle).trim().length > String(parserTitle).trim().length;
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
        // UPC must be 8-14 digits to be lookup-eligible; anything else
        // (letters, short codes, prices the model misclassified) is
        // dropped to null so /api/lookup-upc never sees garbage input.
        const rawUpc = it.upc != null ? String(it.upc).trim() : "";
        const upc = /^\d{8,14}$/.test(rawUpc) ? rawUpc : null;
        const visionTitle = String(it.title || "");
        return {
          // local UI key — not persisted
          _key: `rl_${idx}_${Math.random().toString(36).slice(2, 7)}`,
          title: visionTitle,
          brand: it.brand || "",
          qty: it.qty != null ? Number(it.qty) || 1 : 1,
          unit: it.unit || "",
          unit_price: it.unit_price != null ? Number(it.unit_price) : null,
          line_total: it.line_total != null ? Number(it.line_total) : null,
          auto_matched_shopping_item_id: autoId,    // kept in ocr_raw for future analysis
          match_confidence: confidence,             // kept in ocr_raw for future analysis
          confirmed_shopping_item_id: null,         // user-opt-in only
          // UPC-lookup brick (RS-1.5): preserve the parser's original
          // title forever as vision_title; off_title holds the OFF
          // resolution (even when not applied to title); title_source
          // tracks who set the effective title for the no-clobber rule.
          upc,
          vision_title: visionTitle,
          off_title: null,
          title_source: "vision",
        };
      });
      setItems(matched);
      setStage("review");
      // Kick off UPC-lookups in parallel — non-blocking. The review
      // screen renders with parser titles first; OFF results stream
      // in over the next ~1s and update title in place when the
      // terse-heuristic + no-clobber checks pass.
      runUpcLookups(matched);
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

  // RS-1.5 — fire /api/lookup-upc for every line with a UPC, in
  // parallel. Each resolve hits setItems independently; the
  // function returns immediately so the review screen stays
  // interactive. Race-guarded: on resolve we re-check
  // title_source — if it flipped to "user" while we were waiting,
  // we drop the result and silently clear the pending pill.
  const runUpcLookups = (initial) => {
    const targets = initial.filter((it) => it.upc && it.title_source === "vision");
    if (targets.length === 0) return;
    // Mark pending so the row can render the "🔎 looking up…" pill.
    setItems((prev) => prev.map((it) =>
      targets.some((t) => t._key === it._key)
        ? { ...it, _lookupStatus: "pending" }
        : it
    ));
    targets.forEach(async (target) => {
      let result = null;
      try {
        const r = await fetch("/api/lookup-upc", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ upc: target.upc }),
        });
        result = await r.json().catch(() => null);
      } catch {
        result = null;
      }
      setItems((prev) => prev.map((it) => {
        if (it._key !== target._key) return it;
        // Race guard: drop result if user already started editing this line.
        if (it.title_source !== "vision") {
          const { _lookupStatus, ...rest } = it;
          return rest;
        }
        const offHit = result?.status === "ok";
        const offTitle = offHit ? String(result.title || "").trim() : null;
        const offBrand = offHit ? String(result.brand || "").trim() : "";
        const apply = offHit && offTitle && shouldApplyOff(it.title, offTitle);
        const next = { ...it };
        delete next._lookupStatus;
        // Always record off_title when OFF resolved — even if we declined
        // to apply it — so a future "use this suggestion?" UX can read it.
        if (offTitle) next.off_title = offTitle;
        if (apply) {
          next.title = offTitle;
          next.title_source = "off";
          // Brand backfill: only fill when parser brand is empty. Never
          // override a non-empty parser brand (Mike's rule).
          if (offBrand && (!it.brand || !String(it.brand).trim())) {
            next.brand = offBrand;
          }
        }
        return next;
      }));
    });
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
        // RS-1.5 UPC-lookup trail — persisted so the spending page and
        // the edit-after-save flow can read the parser's original
        // title + the OFF suggestion separately from the effective
        // title. Defaults keep old rows backward-compatible.
        upc: it.upc || null,
        vision_title: it.vision_title || it.title,
        off_title: it.off_title || null,
        title_source: it.title_source || "vision",
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
