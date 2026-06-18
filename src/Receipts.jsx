// Receipts — list + tap-to-expand detail with edit-after-save.
//
// Why this exists: ReceiptScanner.commitReceipt writes a row but
// the saved receipt was a dead-end until this view. Receipts are
// accounting (what we spent), not intent (what we still need) —
// they live next to Shopping List in More, not inside it.
//
// Edit-after-save: the parser gets brand/title/price wrong often
// enough that read-only-after-save is a trap (per the editable-
// after-save rule). Tap the pencil in detail view → enter edit
// mode → same fields as scan-review → Save writes back via
// updateReceipt, Cancel discards. The capture row (ReceiptItemRow)
// is REUSED, not parallel-implemented.
//
// Soft-delete shape (deletedAt) — the spending insights page reads
// the same receipts array and MUST filter on it to keep math honest.

import React, { useMemo, useState } from "react";
import { ChevronRight, ChevronLeft, Trash2, Receipt as ReceiptIcon, Pencil, X } from "lucide-react";
import { useSignedUrl } from "./lib/storage.js";
import ReceiptItemRow from "./ReceiptItemRow.jsx";

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
function formatMoney(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return `$${Number(n).toFixed(2)}`;
}
// Convert any ISO-ish timestamp to a YYYY-MM-DD value for <input type="date">.
function toDateInputValue(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export default function Receipts({
  receipts = [],
  softDeleteReceipt = null,
  updateReceipt = null,
  users = [],
  user = null,
  shoppingItems = [],
}) {
  const [openId, setOpenId] = useState(null);

  const visible = useMemo(() => {
    return receipts
      .filter((r) => !r.deletedAt)
      .slice()
      .sort((a, b) => {
        const ta = Date.parse(a.purchasedAt || a.createdAt || 0) || 0;
        const tb = Date.parse(b.purchasedAt || b.createdAt || 0) || 0;
        return tb - ta;
      });
  }, [receipts]);

  // Always read fresh from receipts so an edit-save round-trip reflows
  // the detail view with the new values (not the stale snapshot).
  const openReceipt = useMemo(
    () => visible.find((r) => r.id === openId) || null,
    [visible, openId]
  );
  const isKid = user?.role === "kid";

  if (openReceipt) {
    return (
      <ReceiptDetail
        receipt={openReceipt}
        users={users}
        shoppingItems={shoppingItems}
        canEdit={!isKid && !!updateReceipt}
        canDelete={!isKid && !!softDeleteReceipt}
        onBack={() => setOpenId(null)}
        onSave={(patch) => updateReceipt && updateReceipt(openReceipt.id, patch)}
        onDelete={softDeleteReceipt ? () => {
          softDeleteReceipt(openReceipt.id);
          setOpenId(null);
        } : null}
      />
    );
  }

  if (visible.length === 0) {
    return (
      <div className="text-center py-16 px-6">
        <div className="text-4xl mb-3">🧾</div>
        <div className="text-sm text-slate-500 leading-relaxed">
          No receipts yet.<br />
          Scan one from the Shopping List — 📷 Scan → 🧾 A receipt.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 pb-4">
      {visible.map((r) => (
        <ReceiptRow key={r.id} receipt={r} onOpen={() => setOpenId(r.id)} />
      ))}
    </div>
  );
}

function ReceiptRow({ receipt, onOpen }) {
  const itemCount = Array.isArray(receipt.ocrRaw?.items_reviewed)
    ? receipt.ocrRaw.items_reviewed.length
    : 0;
  const store = receipt.storeName || receipt.storeChain || "Store";
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full bg-white rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm text-left active:bg-slate-50"
    >
      <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
        <ReceiptIcon size={18} className="text-emerald-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm text-slate-800 truncate">{store}</div>
        <div className="text-[11px] text-slate-500 mt-0.5">
          {formatDate(receipt.purchasedAt || receipt.createdAt)} · {itemCount} {itemCount === 1 ? "item" : "items"}
        </div>
      </div>
      <div className="font-bold text-sm text-slate-700 flex-shrink-0">{formatMoney(receipt.total)}</div>
      <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
    </button>
  );
}

function ReceiptDetail({
  receipt,
  users,
  shoppingItems,
  canEdit,
  canDelete,
  onBack,
  onSave,
  onDelete,
}) {
  const imgUrl = useSignedUrl(receipt.imagePath);
  const uploader = users.find((u) => u.id === receipt.uploadedBy);
  const store = receipt.storeName || receipt.storeChain || "Store";

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const enterEdit = () => {
    setDraft({
      storeName: receipt.storeName || "",
      purchasedAt: receipt.purchasedAt || receipt.createdAt || "",
      subtotal: receipt.subtotal != null ? String(receipt.subtotal) : "",
      tax: receipt.tax != null ? String(receipt.tax) : "",
      total: receipt.total != null ? String(receipt.total) : "",
      items: Array.isArray(receipt.ocrRaw?.items_reviewed)
        ? receipt.ocrRaw.items_reviewed.map((it, idx) => ({
            ...it,
            _key: it._key || `e_${idx}_${Math.random().toString(36).slice(2, 7)}`,
          }))
        : [],
    });
    setIsEditing(true);
  };
  const cancelEdit = () => {
    setDraft(null);
    setIsEditing(false);
  };
  const saveEdit = () => {
    const parsedSub = parseFloat(draft.subtotal);
    const parsedTax = parseFloat(draft.tax);
    const parsedTotal = parseFloat(draft.total);
    // Round-trip purchasedAt through Date to keep an ISO string. The
    // <input type="date"> only carries YYYY-MM-DD; preserve the time
    // from the original if the day didn't change.
    let purchasedIso = receipt.purchasedAt || receipt.createdAt;
    if (draft.purchasedAt) {
      const origDay = toDateInputValue(receipt.purchasedAt || receipt.createdAt);
      if (draft.purchasedAt !== origDay) {
        const d = new Date(draft.purchasedAt + "T12:00:00");
        if (!Number.isNaN(d.getTime())) purchasedIso = d.toISOString();
      }
    }
    const cleanItems = draft.items.map(({ _key, ...rest }) => ({
      ...rest,
      qty: rest.qty === "" || rest.qty == null ? 1 : Number(rest.qty) || 1,
    }));
    onSave({
      storeName: draft.storeName || "",
      purchasedAt: purchasedIso,
      subtotal: Number.isFinite(parsedSub) ? parsedSub : null,
      tax: Number.isFinite(parsedTax) ? parsedTax : null,
      total: Number.isFinite(parsedTotal) ? parsedTotal : null,
      ocrRaw: {
        ...(receipt.ocrRaw || {}),
        items_reviewed: cleanItems,
      },
    });
    setDraft(null);
    setIsEditing(false);
  };

  const candidates = useMemo(() => {
    return (shoppingItems || [])
      .filter((it) => it && !it.deletedAt)
      .map((it) => ({ id: it.id, title: it.title || "", brand: it.brand || "" }))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [shoppingItems]);

  const updateItem = (key, patch) => setDraft((d) => ({
    ...d,
    items: d.items.map((it) => it._key === key ? { ...it, ...patch } : it),
  }));
  const dropItem = (key) => setDraft((d) => ({
    ...d,
    items: d.items.filter((it) => it._key !== key),
  }));
  const setLink = (key, shoppingItemId) => updateItem(key, {
    confirmed_shopping_item_id: shoppingItemId || null,
  });

  // ============ READ MODE ============

  if (!isEditing) {
    const items = Array.isArray(receipt.ocrRaw?.items_reviewed) ? receipt.ocrRaw.items_reviewed : [];
    return (
      <div className="space-y-3 pb-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1 text-xs text-slate-500 active:text-slate-700"
          >
            <ChevronLeft size={14} /> All receipts
          </button>
          {canEdit && (
            <button
              type="button"
              onClick={enterEdit}
              className="flex items-center gap-1 text-xs font-bold text-emerald-700 active:text-emerald-800"
            >
              <Pencil size={12} /> Edit
            </button>
          )}
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="font-bold text-base text-slate-800">{store}</div>
          <div className="text-[12px] text-slate-500 mt-0.5">
            {formatDate(receipt.purchasedAt || receipt.createdAt)}
            {uploader ? ` · uploaded by ${uploader.name}` : ""}
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100">
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wide">Subtotal</div>
              <div className="text-sm font-bold text-slate-700">{formatMoney(receipt.subtotal)}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wide">Tax</div>
              <div className="text-sm font-bold text-slate-700">{formatMoney(receipt.tax)}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wide">Total</div>
              <div className="text-sm font-bold text-emerald-700">{formatMoney(receipt.total)}</div>
            </div>
          </div>
        </div>

        {imgUrl && (
          <div className="bg-white rounded-2xl p-3 shadow-sm">
            <div className="text-[10px] text-slate-400 uppercase tracking-wide mb-2">Receipt image</div>
            <a href={imgUrl} target="_blank" rel="noreferrer">
              <img
                src={imgUrl}
                alt="Receipt"
                className="w-full max-h-80 object-contain rounded-xl bg-slate-50"
              />
            </a>
          </div>
        )}

        <div className="bg-white rounded-2xl p-3 shadow-sm">
          <div className="text-[10px] text-slate-400 uppercase tracking-wide mb-2 px-1">
            Items ({items.length})
          </div>
          {items.length === 0 && (
            <div className="text-[12px] text-slate-400 text-center py-4">No items recorded.</div>
          )}
          {items.map((it, idx) => {
            const linked = it.confirmed_shopping_item_id
              ? (shoppingItems || []).find((s) => s.id === it.confirmed_shopping_item_id)
              : null;
            return (
              <div
                key={idx}
                className="flex items-start gap-2 py-2 border-b border-slate-100 last:border-b-0"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-800 truncate">{it.title || "Untitled"}</div>
                  {(it.brand || it.qty > 1 || it.unit) && (
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {it.brand && <span>{it.brand}</span>}
                      {it.brand && (it.qty > 1 || it.unit) && <span> · </span>}
                      {it.qty > 1 && <span>{it.qty}{it.unit ? ` ${it.unit}` : ""}</span>}
                      {!it.qty && it.unit && <span>{it.unit}</span>}
                    </div>
                  )}
                  {linked && (
                    <div className="text-[10px] text-slate-400 mt-0.5">🔗 {linked.title}</div>
                  )}
                </div>
                <div className="text-sm font-bold text-slate-700 flex-shrink-0">
                  {formatMoney(it.line_total)}
                </div>
              </div>
            );
          })}
        </div>

        {canDelete && (
          <div className="bg-white rounded-2xl p-3 shadow-sm">
            {!confirmingDelete ? (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="w-full py-2 rounded-xl bg-rose-50 text-rose-600 font-bold text-sm flex items-center justify-center gap-1.5 active:bg-rose-100"
              >
                <Trash2 size={14} /> Delete receipt
              </button>
            ) : (
              <div className="space-y-2">
                <div className="text-[12px] text-slate-600 text-center px-2">
                  Delete this receipt? It will be removed from spending totals.
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={onDelete}
                    className="flex-1 py-2 rounded-xl bg-rose-600 text-white font-bold text-sm active:bg-rose-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ============ EDIT MODE ============

  return (
    <div className="space-y-3 pb-4">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={cancelEdit}
          className="flex items-center gap-1 text-xs text-slate-500 active:text-slate-700"
        >
          <X size={14} /> Cancel
        </button>
        <button
          type="button"
          onClick={saveEdit}
          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs active:bg-emerald-700"
        >
          Save changes
        </button>
      </div>

      <div className="bg-white rounded-2xl p-3 shadow-sm space-y-2">
        <div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Store</div>
          <input
            type="text"
            value={draft.storeName}
            onChange={(e) => setDraft({ ...draft, storeName: e.target.value })}
            className="w-full px-2 py-1.5 rounded-md border border-slate-200 text-sm font-bold text-slate-800"
            placeholder="Store name"
          />
        </div>
        <div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Purchased</div>
          <input
            type="date"
            value={toDateInputValue(draft.purchasedAt)}
            onChange={(e) => setDraft({ ...draft, purchasedAt: e.target.value })}
            className="w-full px-2 py-1.5 rounded-md border border-slate-200 text-sm text-slate-700"
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Subtotal</div>
            <input
              type="number"
              step="0.01"
              value={draft.subtotal}
              onChange={(e) => setDraft({ ...draft, subtotal: e.target.value })}
              className="w-full px-2 py-1.5 rounded-md border border-slate-200 text-sm font-bold text-slate-700"
            />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Tax</div>
            <input
              type="number"
              step="0.01"
              value={draft.tax}
              onChange={(e) => setDraft({ ...draft, tax: e.target.value })}
              className="w-full px-2 py-1.5 rounded-md border border-slate-200 text-sm font-bold text-slate-700"
            />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Total</div>
            <input
              type="number"
              step="0.01"
              value={draft.total}
              onChange={(e) => setDraft({ ...draft, total: e.target.value })}
              className="w-full px-2 py-1.5 rounded-md border border-slate-200 text-sm font-bold text-emerald-700"
            />
          </div>
        </div>
      </div>

      {imgUrl && (
        <div className="bg-white rounded-2xl p-3 shadow-sm">
          <div className="text-[10px] text-slate-400 uppercase tracking-wide mb-2">Receipt image (locked)</div>
          <img
            src={imgUrl}
            alt="Receipt"
            className="w-full max-h-60 object-contain rounded-xl bg-slate-50"
          />
        </div>
      )}

      <div className="bg-white rounded-2xl p-2 shadow-sm">
        <div className="text-[10px] text-slate-400 uppercase tracking-wide mb-2 px-1">
          Items ({draft.items.length})
        </div>
        {draft.items.length === 0 && (
          <div className="text-[12px] text-slate-400 text-center py-4">No items left.</div>
        )}
        {draft.items.map((it) => (
          <ReceiptItemRow
            key={it._key}
            item={it}
            candidates={candidates}
            onUpdate={(patch) => updateItem(it._key, patch)}
            onDrop={() => dropItem(it._key)}
            onLink={(shoppingItemId) => setLink(it._key, shoppingItemId)}
          />
        ))}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={cancelEdit}
          className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={saveEdit}
          className="flex-1 py-2 rounded-xl bg-emerald-600 text-white font-bold text-sm active:bg-emerald-700"
        >
          Save changes
        </button>
      </div>
    </div>
  );
}
