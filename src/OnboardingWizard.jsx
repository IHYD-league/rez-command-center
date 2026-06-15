// First-run setup for a brand-new family. Fires when their family DB
// has a parent profile but no kid yet (per the gate in App.jsx). One
// screen, three inputs, one button — no multi-step ceremony.
//
// Why one screen: per the simple-for-busy-parents memory rule, every
// extra step is a place where a tired parent abandons. A name + avatar
// + "create profile" is enough to land them in the app with a working
// kid view. Starter activities / tasks can come from a follow-up
// "starter pack" picker later, intentionally not in v1.

import React, { useState } from "react";

const EMOJIS = [
  "🚀", "🦖", "🦄", "🐉", "🐯", "🦊", "🐼", "🦁",
  "⚽", "🏀", "🎸", "🥁", "🎹", "🎨", "📚", "🧩",
  "🌟", "⚡", "🔥", "💎", "🌈", "🍀", "🌸", "🧒",
];

const COLORS = [
  { id: "amber",   hex: "#f59e0b", name: "Sun" },
  { id: "rose",    hex: "#e11d48", name: "Coral" },
  { id: "violet",  hex: "#7c3aed", name: "Grape" },
  { id: "indigo",  hex: "#4f46e5", name: "Sky" },
  { id: "teal",    hex: "#0d9488", name: "Mint" },
  { id: "emerald", hex: "#059669", name: "Forest" },
  { id: "fuchsia", hex: "#c026d3", name: "Berry" },
  { id: "slate",   hex: "#475569", name: "Storm" },
];

const GRADES = ["Pre-K", "K", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];

export default function OnboardingWizard({ parentName, onCreateKid }) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🚀");
  const [color, setColor] = useState(COLORS[0].hex);
  const [grade, setGrade] = useState("");
  const [busy, setBusy] = useState(false);
  const ready = name.trim().length > 0 && !busy;

  const submit = async () => {
    if (!ready) return;
    setBusy(true);
    try {
      await onCreateKid({
        name: name.trim(),
        emoji,
        color,
        grade: grade || null,
      });
    } catch (e) {
      setBusy(false);
      alert("Couldn't create the profile — " + (e?.message || e));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-amber-50 px-4 py-10">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">👋</div>
          <h1 className="text-2xl font-extrabold text-slate-800">
            Welcome{parentName ? `, ${parentName}` : ""}!
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Let's set up your kid's profile so you can start tracking together.
          </p>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-lg border border-slate-100">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Kid's name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="First name"
            autoFocus
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-base font-semibold outline-none focus:border-indigo-500"
          />

          <div className="mt-5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Avatar</label>
            <div className="grid grid-cols-8 gap-1.5">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={`aspect-square rounded-xl text-xl grid place-items-center transition ${
                    emoji === e ? "bg-indigo-100 ring-2 ring-indigo-500" : "bg-slate-50 hover:bg-slate-100"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Grade <span className="text-slate-400 font-medium normal-case">(optional — helps tailor goals)</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {GRADES.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGrade(grade === g ? "" : g)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    grade === g ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Favorite color</label>
            <div className="grid grid-cols-4 gap-2">
              {COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColor(c.hex)}
                  className={`py-2.5 rounded-xl text-xs font-bold text-white transition ${
                    color === c.hex ? "ring-2 ring-offset-2 ring-slate-400" : ""
                  }`}
                  style={{ background: c.hex }}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-slate-50 p-3 border border-slate-100 flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full grid place-items-center text-2xl shrink-0"
              style={{ background: color, color: "white" }}
            >
              {emoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Preview</div>
              <div className="text-base font-extrabold truncate">{name.trim() || "Your kid"}</div>
            </div>
          </div>

          <button
            disabled={!ready}
            onClick={submit}
            className={`w-full mt-5 py-3 rounded-2xl font-extrabold text-sm text-white transition ${
              ready ? "bg-indigo-600 active:scale-[0.98]" : "bg-slate-300"
            }`}
          >
            {busy ? "Creating…" : "Create profile"}
          </button>

          <p className="text-[11px] text-slate-400 mt-3 leading-snug text-center">
            You can add tasks, rewards, activities and more from the More menu after this.
          </p>
        </div>
      </div>
    </div>
  );
}
