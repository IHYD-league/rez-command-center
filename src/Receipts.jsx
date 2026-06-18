// Receipts — list + tap-to-expand detail.
//
// Why this exists: ReceiptScanner.commitReceipt writes a row but
// the saved receipt was a dead-end until this view. Receipts are
// accounting (what we spent), not intent (what we still need) —
// they live next to Shopping List in More, not inside it.
//
// Shape:
//   - List: chronological newest-first, soft-deleted hidden,
//     each row = store · date · total · item count · chevron.
//   - Detail: image thumb (signed URL) + totals + items_reviewed
//     read-only + soft-delete button (confirm).
//
// The spending insights page (next brick) reads the same
// receipts array and MUST filter deletedAt to keep math honest.

import React, { useMemo, useState } from "react";
import { ChevronRight, ChevronLeft, Trash2, Receipt as ReceiptIcon } from "lucide-react";
import { useSignedUrl } from "./lib/storage.js";

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

export default function Receipts({ receipts = [], softDeleteReceipt = null, users = [] }) {
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

  const openReceipt = visible.find((r) => r.id === openId) || null;
  if (openReceipt) {
    return (
      <ReceiptDetail
        receipt={openReceipt}
        users={users}
        onBack={() => setOpenId(null)}
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

function ReceiptDetail({ receipt, users, onBack, onDelete }) {
  const imgUrl = useSignedUrl(receipt.imagePath);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const uploader = users.find((u) => u.id === receipt.uploadedBy);
  const items = Array.isArray(receipt.ocrRaw?.items_reviewed) ? receipt.ocrRaw.items_reviewed : [];
  const store = receipt.storeName || receipt.storeChain || "Store";

  return (
    <div className="space-y-3 pb-4">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-xs text-slate-500 active:text-slate-700"
      >
        <ChevronLeft size={14} /> All receipts
      </button>

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
        {items.map((it, idx) => (
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
            </div>
            <div className="text-sm font-bold text-slate-700 flex-shrink-0">
              {formatMoney(it.line_total)}
            </div>
          </div>
        ))}
      </div>

      {onDelete && (
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
