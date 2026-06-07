import React from "react";
import { X, Type, Palette } from "lucide-react";

/* =====================================================================
   CustomizationHub — per-profile accessibility / display settings.

   Modular by design (ARCHITECTURE §5): each "module" is a row in the
   HUB_MODULES registry below. Adding a new option = appending an entry
   to the list — no rewrites in App.jsx, no edits to data plumbing.
   Phase 2 (themes) slots in as another row.

   Owns NOTHING canonical. Every value lives in the parent's `prefs`
   prop (a plain object); `setPref(key, value)` is the only mutation
   path back. The parent persists it to public.user_prefs.
   ===================================================================== */

// Font scale — one global root multiplier. Everything sized in rem/em
// scales proportionally; absolute-px text classes (text-[11px]) stay
// fixed by design so caption / chip layout doesn't break.
export const FONT_SCALE_PCT = {
  regular: 100,
  large: 115,
  larger: 130,
  largest: 150,
};

const FONT_SCALE_OPTIONS = [
  { value: "regular", label: "Regular", sample: "Aa", scale: 1.0 },
  { value: "large", label: "Large", sample: "Aa", scale: 1.15 },
  { value: "larger", label: "Larger", sample: "Aa", scale: 1.3 },
  { value: "largest", label: "Largest", sample: "Aa", scale: 1.5 },
];

function FontScaleModule({ prefs, setPref }) {
  const value = prefs.fontScale || "regular";
  return (
    <div className="grid grid-cols-2 gap-2">
      {FONT_SCALE_OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setPref("fontScale", opt.value)}
            className={`p-3 rounded-2xl text-left transition active:scale-[0.98] border-2 ${
              active
                ? "border-indigo-500 bg-indigo-50"
                : "border-slate-200 bg-white hover:border-indigo-200"
            }`}
          >
            <div className="flex items-end justify-between gap-2">
              <div
                className="font-extrabold text-slate-800"
                style={{ fontSize: `${opt.scale}rem`, lineHeight: 1 }}
              >
                {opt.sample}
              </div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                {Math.round(opt.scale * 100)}%
              </div>
            </div>
            <div className="text-sm font-bold mt-2 text-slate-700">{opt.label}</div>
          </button>
        );
      })}
    </div>
  );
}

// HUB_MODULES — the registry. Adding a new option means appending an
// entry here. The hub renders each module in order; each module gets
// (prefs, setPref) so it never needs to know about persistence.
//
// Convention for the prefs jsonb keys:
//   fontScale: "regular" | "large" | "larger" | "largest"
//   theme:     "white" | "blue" | "black" | …   (Phase 2)
//   …more as we add modules.
const HUB_MODULES = [
  {
    id: "font-scale",
    title: "Text size",
    icon: Type,
    description:
      "Bumping this up makes every screen's text bigger. Stays per-profile, so Grandma and Mike can be different.",
    Render: FontScaleModule,
  },
  // Phase 2 hook — leave a visible placeholder so it's obvious where the
  // next module slots in. Replace with the real Render when shipping.
  {
    id: "theme",
    title: "Theme",
    icon: Palette,
    description: "Background and contrast — white, blue, black, and a colorful palette.",
    Render: () => (
      <div className="rounded-2xl border-2 border-dashed border-slate-200 p-4 text-center">
        <div className="text-xs font-bold text-slate-500">Coming next</div>
        <div className="text-[11px] text-slate-400 mt-1">
          Background / contrast / palette — Phase 2 of the hub.
        </div>
      </div>
    ),
  },
];

export default function CustomizationHub({ prefs, setPref, onClose, userName }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ fontFamily: "inherit" }}
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-t-3xl p-5 max-h-[90vh] overflow-y-auto">
        <div className="w-10 h-1.5 bg-slate-200 rounded-full mx-auto mb-4" />

        <div className="flex items-start justify-between gap-2 mb-4">
          <div>
            <div className="text-lg font-extrabold tracking-tight">Customize</div>
            <div className="text-[12px] text-slate-400 mt-0.5">
              {userName ? `For ${userName}` : "Per-profile preferences"} · saves automatically
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 p-1 hover:text-slate-700"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5">
          {HUB_MODULES.map((m) => {
            const Icon = m.icon;
            return (
              <section key={m.id}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={16} className="text-indigo-500" />
                  <div className="font-extrabold text-sm text-slate-800">{m.title}</div>
                </div>
                {m.description && (
                  <div className="text-[11px] text-slate-400 mb-2 leading-snug">
                    {m.description}
                  </div>
                )}
                <m.Render prefs={prefs} setPref={setPref} />
              </section>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full mt-6 py-3 rounded-2xl bg-slate-100 text-slate-600 font-bold text-sm"
        >
          Done
        </button>
      </div>
    </div>
  );
}
