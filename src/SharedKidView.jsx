// Public read-only kid view, accessible via /share/<view_token>.
// Grandparents (or anyone the parent trusts to cheer) tap the link,
// no sign-up required, see a privacy-curated bundle:
//   * Kid name + avatar
//   * Active streaks with current/best
//   * This week's earned stars
//   * Last 10 approved completions ("Drums · today · 10⭐")
//
// What's intentionally NOT shown: other family members, rewards
// economy, pending tasks, addresses, photos, anything that's
// family-private. Parent revokes the link from More → People
// whenever they want; the token disappears, the link dies.

import React, { useEffect, useState } from "react";
import { supabase } from "./lib/supabase.js";

export default function SharedKidView({ token, onExit }) {
  const [state, setState] = useState({ status: "loading", data: null });
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.rpc("get_shared_kid_view", { p_token: token });
        if (cancelled) return;
        if (error) {
          setState({ status: "error", message: error.message || "Couldn't load this view." });
          return;
        }
        if (!data) {
          setState({ status: "notfound" });
          return;
        }
        setState({ status: "ready", data });
      } catch (e) {
        if (cancelled) return;
        setState({ status: "error", message: String(e?.message || e) });
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  if (state.status === "loading") {
    return (
      <div className="min-h-screen bg-slate-50 grid place-items-center text-slate-400 text-sm">
        Loading…
      </div>
    );
  }
  if (state.status === "notfound") {
    return (
      <div className="min-h-screen bg-slate-50 grid place-items-center p-6">
        <div className="max-w-md text-center">
          <div className="text-5xl mb-3">🔗</div>
          <div className="text-lg font-extrabold text-slate-700">This link doesn't work anymore</div>
          <div className="text-sm text-slate-500 mt-1 leading-snug">It may have been revoked, or the kid's family removed it. Ask whoever shared it to send a fresh link.</div>
        </div>
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div className="min-h-screen bg-slate-50 grid place-items-center p-6">
        <div className="max-w-md text-center">
          <div className="text-5xl mb-3">⚠️</div>
          <div className="text-lg font-extrabold text-slate-700">Something went wrong</div>
          <div className="text-sm text-slate-500 mt-1 leading-snug">{state.message}</div>
        </div>
      </div>
    );
  }

  const { kid, streaks, weekStars, recentWins } = state.data;
  return (
    <div
      className="min-h-screen px-4 py-8"
      style={{ background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)", fontFamily: "ui-rounded, 'SF Pro Rounded', system-ui, sans-serif" }}
    >
      <div className="max-w-md mx-auto">
        <div
          className="rounded-3xl p-6 text-white text-center mb-4 shadow-lg"
          style={{ background: `linear-gradient(135deg, ${kid.color || "#f59e0b"}, ${kid.color || "#7c3aed"}cc)` }}
        >
          <div className="text-6xl mb-2">{kid.emoji || "🚀"}</div>
          <div className="text-3xl font-extrabold tracking-tight">{kid.name}'s week</div>
          {kid.grade && <div className="text-sm font-bold opacity-90 mt-1">{kid.grade}</div>}
          <div className="mt-4 inline-flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-2 rounded-full">
            <span className="text-3xl font-extrabold">{weekStars}</span>
            <span className="text-sm font-bold">⭐ this week</span>
          </div>
        </div>

        {Array.isArray(streaks) && streaks.length > 0 && (
          <div className="bg-white rounded-2xl p-4 mb-4 shadow border border-slate-100">
            <div className="text-[11px] uppercase tracking-wider font-bold text-slate-500 mb-2">🔥 Active streaks</div>
            {streaks.map((s) => (
              <div key={s.activityId} className="flex items-center gap-2 py-1.5">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.activityColor || "#94a3b8" }} />
                <span className="font-bold text-sm flex-1 truncate">{s.activityName || s.activityId}</span>
                <span className="text-sm font-extrabold tabular-nums">{s.current} days</span>
                {s.best > s.current && <span className="text-[10px] text-slate-400">(best {s.best})</span>}
              </div>
            ))}
          </div>
        )}

        {Array.isArray(recentWins) && recentWins.length > 0 && (
          <div className="bg-white rounded-2xl p-4 mb-4 shadow border border-slate-100">
            <div className="text-[11px] uppercase tracking-wider font-bold text-slate-500 mb-2">🏆 Recent wins</div>
            {recentWins.map((w, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5 border-b border-slate-50 last:border-0">
                <span className="text-emerald-500">✓</span>
                <span className="font-semibold text-sm flex-1 truncate">{w.title}</span>
                <span className="text-[11px] text-slate-400">
                  {new Date((w.date || "") + "T12:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
                {Number(w.stars) > 0 && <span className="text-[11px] font-bold text-amber-600 tabular-nums">+{w.stars}⭐</span>}
              </div>
            ))}
          </div>
        )}

        <p className="text-center text-[11px] text-slate-400 mt-4 leading-snug">
          You're viewing a read-only summary the parents shared. They can revoke this link at any time.
        </p>
        {onExit && (
          <button onClick={onExit} className="mt-4 mx-auto block text-[11px] font-bold text-slate-400">
            ← Sign in to your own family
          </button>
        )}
      </div>
    </div>
  );
}
