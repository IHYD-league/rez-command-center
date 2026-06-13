import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, Type, Palette, Camera, Image as ImageIcon, Volume2, Smartphone } from "lucide-react";
import { juice } from "./lib/juice.js";
import { uploadFamilyPhoto, useSignedUrl } from "./lib/storage.js";

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

// Inline avatar (self-contained — doesn't depend on App.jsx exporting
// its Avatar component). Mirrors the same fallback rules: storage path
// → signed URL; legacy http/blob/data URL → use directly; nothing →
// emoji-on-color chip.
function HubAvatar({ user, size = 96 }) {
  const isDirectUrl = user?.photo && /^(https?|data|blob):/.test(user.photo);
  const signed = useSignedUrl(user?.photo && !isDirectUrl ? user.photo : null);
  const src = isDirectUrl ? user.photo : signed;
  const st = { width: size, height: size };
  if (src) {
    return (
      <img
        src={src}
        alt={user?.name || ""}
        className="rounded-3xl object-cover shrink-0"
        style={st}
      />
    );
  }
  return (
    <div
      className="rounded-3xl grid place-items-center shrink-0 text-white"
      style={{
        ...st,
        background: user?.color || "#64748b",
        fontSize: Math.round(size * 0.5),
      }}
    >
      {user?.emoji || "👤"}
    </div>
  );
}

// AvatarModule — every signed-in profile can upload their own photo
// from this slot. The photo lands in the same family-photos bucket the
// parent's People management uses (kind="avatar"), the storage path
// is written to profiles.photo_path, and the avatar appears everywhere
// the user is rendered (TopBar, login picker, KidGameHome hero, etc.).
// AvatarCropper — pinch-and-pan a chosen photo to frame the avatar. Pure
// client-side, no extra deps. The CSS transform on the preview <img> is
// the source of truth for the framing; on "Use this" we re-apply that
// transform to an offscreen canvas to bake a square JPEG, then hand the
// File back so the existing uploadFamilyPhoto path stays intact.
const VIEW_SIZE = 280;   // viewport edge in CSS px
const OUT_SIZE = 512;    // output JPEG edge in canvas px

function AvatarCropper({ file, busy, onCancel, onConfirm }) {
  const [imgSrc, setImgSrc] = useState(null);
  const [imgDims, setImgDims] = useState(null);
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);

  const pointers = useRef(new Map());
  const pinchStart = useRef(null);
  const panStart = useRef(null);

  // Load the chosen file, measure it, and "cover"-fit to the viewport so
  // the user starts with no empty bands.
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImgSrc(url);
    const img = new Image();
    img.onload = () => {
      setImgDims({ w: img.naturalWidth, h: img.naturalHeight });
      const cover = Math.max(VIEW_SIZE / img.naturalWidth, VIEW_SIZE / img.naturalHeight);
      setScale(cover);
      setTx(0);
      setTy(0);
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const minScale = useMemo(() => {
    if (!imgDims) return 0.5;
    return Math.max(VIEW_SIZE / imgDims.w, VIEW_SIZE / imgDims.h);
  }, [imgDims]);
  const maxScale = useMemo(() => minScale * 4, [minScale]);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // Pointer handling — single touch pans, two touches pinch-zoom.
  const onPointerDown = (e) => {
    e.preventDefault();
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    e.currentTarget.setPointerCapture(e.pointerId);
    if (pointers.current.size === 1) {
      panStart.current = { x: e.clientX - tx, y: e.clientY - ty };
    } else if (pointers.current.size === 2) {
      const pts = [...pointers.current.values()];
      pinchStart.current = {
        scale,
        dist: Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y) || 1,
      };
      panStart.current = null;
    }
  };
  const onPointerMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1 && panStart.current) {
      setTx(e.clientX - panStart.current.x);
      setTy(e.clientY - panStart.current.y);
    } else if (pointers.current.size === 2 && pinchStart.current) {
      const pts = [...pointers.current.values()];
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y) || 1;
      setScale(clamp(pinchStart.current.scale * (dist / pinchStart.current.dist), minScale, maxScale));
    }
  };
  const endPointer = (e) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
    if (pointers.current.size === 1) {
      const remaining = [...pointers.current.values()][0];
      panStart.current = { x: remaining.x - tx, y: remaining.y - ty };
    } else if (pointers.current.size === 0) {
      panStart.current = null;
    }
  };

  const handleConfirm = async () => {
    if (!imgSrc || !imgDims) return;
    const img = new Image();
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
      img.src = imgSrc;
    });
    // Solve the CSS transform for the image region currently visible in
    // the viewport. The image is centered in the viewport, translated by
    // (tx, ty), then scaled around its own center.
    const sx = imgDims.w / 2 - (VIEW_SIZE / 2 + tx) / scale;
    const sy = imgDims.h / 2 - (VIEW_SIZE / 2 + ty) / scale;
    const sw = VIEW_SIZE / scale;
    const sh = VIEW_SIZE / scale;

    const canvas = document.createElement("canvas");
    canvas.width = OUT_SIZE;
    canvas.height = OUT_SIZE;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    // White fill so panning past the image bakes neutral, not transparent.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, OUT_SIZE, OUT_SIZE);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, OUT_SIZE, OUT_SIZE);

    const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.9));
    if (!blob) return;
    const cropped = new File([blob], "avatar.jpg", { type: "image/jpeg" });
    onConfirm(cropped);
  };

  if (!imgSrc) return null;
  return (
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-4 w-full max-w-sm">
        <div className="text-center font-extrabold text-lg">Frame your photo</div>
        <div className="text-[11px] text-slate-400 text-center mt-0.5 mb-3">
          Drag to move · pinch or use the slider to zoom
        </div>
        <div
          className="mx-auto rounded-3xl overflow-hidden bg-slate-100 relative touch-none select-none"
          style={{ width: VIEW_SIZE, height: VIEW_SIZE }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
        >
          {imgDims && (
            <img
              src={imgSrc}
              alt=""
              draggable={false}
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                // Tailwind preflight sets `img { max-width: 100%; height:
                // auto }`, which silently squashes the natural dimensions
                // before our transform runs. Override both so the image
                // sizes itself at its real natural pixels; the transform
                // then scales it to fit the viewport.
                maxWidth: "none",
                maxHeight: "none",
                width: imgDims.w,
                height: imgDims.h,
                display: "block",
                transform: `translate(-50%, -50%) translate(${tx}px, ${ty}px) scale(${scale})`,
                transformOrigin: "center",
                userSelect: "none",
                pointerEvents: "none",
              }}
            />
          )}
          <div
            className="absolute inset-0 rounded-3xl pointer-events-none"
            style={{ boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.7)" }}
          />
        </div>
        <div className="flex items-center gap-2 mt-3">
          <span className="text-xs text-slate-500 shrink-0">Zoom</span>
          <input
            type="range"
            min={minScale}
            max={maxScale}
            step={(maxScale - minScale) / 100 || 0.01}
            value={clamp(scale, minScale, maxScale)}
            onChange={(e) => setScale(parseFloat(e.target.value))}
            className="flex-1"
          />
        </div>
        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm disabled:opacity-60"
          >
            {busy ? "Uploading…" : "Use this"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AvatarModule({ user, updateUser, familyId }) {
  const [busy, setBusy] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const inputRef = useRef(null);

  const onPickFile = (e) => {
    const f = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = "";
    if (!f) return;
    if (!familyId) {
      alert("Can't upload — family isn't linked yet. Open the app from a signed-in profile.");
      return;
    }
    setPendingFile(f);
  };

  const handleConfirm = async (croppedFile) => {
    setBusy(true);
    try {
      const { path } = await uploadFamilyPhoto({ file: croppedFile, familyId, kind: "avatar" });
      updateUser(user.id, { photo: path });
      setPendingFile(null);
    } catch (err) {
      alert("Upload failed: " + (err.message || err));
    } finally {
      setBusy(false);
    }
  };

  const removePhoto = () => {
    if (!user?.photo) return;
    if (!window.confirm("Remove your profile photo? Your emoji takes over.")) return;
    updateUser(user.id, { photo: null });
  };

  return (
    <>
      <div className="flex items-center gap-3">
        <HubAvatar user={user} size={88} />
        <div className="flex-1 min-w-0">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Camera size={14} /> {busy ? "Uploading…" : (user?.photo ? "Change photo" : "Add a photo")}
          </button>
          {user?.photo && (
            <button
              type="button"
              onClick={removePhoto}
              disabled={busy}
              className="w-full mt-1.5 py-1.5 text-rose-500 text-[11px] font-bold"
            >
              Remove photo
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onPickFile}
          />
        </div>
      </div>
      {pendingFile && (
        <AvatarCropper
          file={pendingFile}
          busy={busy}
          onCancel={() => setPendingFile(null)}
          onConfirm={handleConfirm}
        />
      )}
    </>
  );
}

// Font scale — one global root multiplier. Everything sized in rem/em
// scales proportionally; absolute-px text classes (text-[11px]) stay
// fixed by design so caption / chip layout doesn't break.
export const FONT_SCALE_PCT = {
  regular: 100,
  large: 115,
  larger: 130,
  largest: 150,
};

// THEMES — applied as the page "stage" beneath the existing cards.
// Cards stay structurally white/colored; the surface they sit on changes.
// Per-profile; lives in prefs.theme. Adding a new theme = one entry here.
export const THEMES = {
  white: {
    id: "white",
    label: "White",
    sample: "☀️",
    description: "Bright and crisp — the default.",
    bg: "#f1f5f9",
    fg: "#0f172a",
  },
  blue: {
    id: "blue",
    label: "Blue",
    sample: "💧",
    description: "Cool and calm.",
    bg: "#dbeafe",
    fg: "#0f172a",
  },
  black: {
    id: "black",
    label: "Night",
    sample: "🌙",
    description: "High-contrast dark mode — easier on tired eyes.",
    bg: "#0f172a",
    fg: "#f8fafc",
  },
  colorful: {
    id: "colorful",
    label: "Colorful",
    sample: "🌈",
    description: "Bright kid palette.",
    bg: "linear-gradient(135deg, #fce7f3 0%, #ddd6fe 50%, #cffafe 100%)",
    fg: "#0f172a",
  },
};

const FONT_SCALE_OPTIONS = [
  { value: "regular", label: "Regular", sample: "Aa", scale: 1.0 },
  { value: "large", label: "Large", sample: "Aa", scale: 1.15 },
  { value: "larger", label: "Larger", sample: "Aa", scale: 1.3 },
  { value: "largest", label: "Largest", sample: "Aa", scale: 1.5 },
];

function ThemeModule({ prefs, setPref }) {
  const value = prefs.theme || "white";
  const ids = Object.keys(THEMES);
  return (
    <div className="grid grid-cols-2 gap-2">
      {ids.map((id) => {
        const t = THEMES[id];
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setPref("theme", id)}
            className={`p-3 rounded-2xl text-left transition active:scale-[0.98] border-2 ${
              active
                ? "border-indigo-500 ring-2 ring-indigo-200"
                : "border-slate-200 hover:border-indigo-200"
            }`}
            style={{
              background: t.bg,
              color: t.fg,
            }}
          >
            <div className="flex items-end justify-between gap-2">
              <div className="text-3xl leading-none">{t.sample}</div>
              <div
                className="text-[10px] uppercase tracking-wider font-bold"
                style={{ opacity: 0.6 }}
              >
                {id === "white" ? "Default" : ""}
              </div>
            </div>
            <div className="text-sm font-bold mt-2">{t.label}</div>
            <div className="text-[10px] mt-0.5" style={{ opacity: 0.7 }}>
              {t.description}
            </div>
          </button>
        );
      })}
    </div>
  );
}

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

// SoundModule — two independent toggles (sfx + haptics). Defaults are
// "on" for both; only an explicit `false` in prefs.sound turns them off.
// Tapping a toggle previews the channel so the chooser can hear/feel the
// difference immediately.
function SoundModule({ prefs, setPref }) {
  const s = prefs.sound || {};
  const sfxOn = s.sfx !== false;
  const hapticOn = s.haptic !== false;
  const toggle = (key, nextVal, previewSfx, previewHaptic) => {
    setPref("sound", { ...s, [key]: nextVal });
    // Preview the channel on enable so the chooser hears/feels the
    // difference immediately. Briefly force-enable that channel because
    // the App-level useEffect that resyncs juice.setEnabled from the new
    // prefs hasn't run yet. After this paint it will, replacing this
    // temporary state with the canonical one.
    if (nextVal) {
      juice.setEnabled({
        sfx: key === "sfx" ? true : sfxOn,
        haptic: key === "haptic" ? true : hapticOn,
      });
      if (previewSfx) juice.sfx(previewSfx);
      if (previewHaptic) juice.haptic(previewHaptic);
    }
  };
  const Row = ({ Icon, label, hint, on, onToggle }) => (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full p-3 rounded-2xl border-2 transition active:scale-[0.99] flex items-center gap-3 ${
        on ? "border-indigo-500 bg-indigo-50" : "border-slate-200 bg-white hover:border-indigo-200"
      }`}
    >
      <div className={`w-10 h-10 rounded-xl grid place-items-center ${on ? "bg-indigo-500 text-white" : "bg-slate-100 text-slate-500"}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <div className="text-sm font-bold text-slate-800">{label}</div>
        <div className="text-[11px] text-slate-500">{hint}</div>
      </div>
      <div
        className={`shrink-0 w-11 h-6 rounded-full p-0.5 transition ${on ? "bg-indigo-500" : "bg-slate-300"}`}
        aria-hidden
      >
        <div
          className="w-5 h-5 rounded-full bg-white shadow transition-transform"
          style={{ transform: on ? "translateX(20px)" : "translateX(0)" }}
        />
      </div>
    </button>
  );
  return (
    <div className="flex flex-col gap-2">
      <Row
        Icon={Volume2}
        label="Sounds"
        hint="Quest blips, star chimes, level-up fanfare."
        on={sfxOn}
        onToggle={() => toggle("sfx", !sfxOn, "approve", null)}
      />
      <Row
        Icon={Smartphone}
        label="Vibration"
        hint="A little buzz when something good happens. (Android / some PWAs.)"
        on={hapticOn}
        onToggle={() => toggle("haptic", !hapticOn, null, "success")}
      />
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
//   sound:     { sfx: bool, haptic: bool }      (Phase 3)
//   …more as we add modules.
const HUB_MODULES = [
  {
    id: "avatar",
    title: "Your photo",
    icon: ImageIcon,
    description:
      "Tap to use a real photo instead of your emoji. Shows up wherever your avatar appears (top bar, sign-in picker, kid home).",
    Render: AvatarModule,
  },
  {
    id: "font-scale",
    title: "Text size",
    icon: Type,
    description:
      "Bumping this up makes every screen's text bigger. Stays per-profile, so each family member can pick their own size.",
    Render: FontScaleModule,
  },
  {
    id: "theme",
    title: "Theme",
    icon: Palette,
    description: "Background and contrast — White, Blue, Night, or Colorful. Per-profile.",
    Render: ThemeModule,
  },
  {
    id: "sound",
    title: "Sound & Feel",
    icon: Volume2,
    description: "Pick the juice. Sounds for actions and a buzz when good things happen.",
    Render: SoundModule,
  },
];

export default function CustomizationHub({
  prefs,
  setPref,
  onClose,
  user,
  updateUser,
  familyId,
}) {
  // Modules each get the same context object — destructure what you need.
  // This is how new modules slot in without rewriting App.jsx: extend the
  // registry, add another key to the context if needed, done.
  const ctx = { prefs, setPref, user, updateUser, familyId };
  const userName = user?.name;
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
                <m.Render {...ctx} />
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
