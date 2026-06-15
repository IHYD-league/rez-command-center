/**
 * SummerQuest.jsx — the "Summer Quest" arm of Little Legends Treasures
 * --------------------------------------------------------------------
 * Vite + React 18. Zero dependencies (emoji instead of an icon lib),
 * styles scoped under .sq-root so they won't collide with the app.
 *
 * PERSISTENCE SEAM (wire this to Supabase like your other features):
 *   <SummerQuest
 *      child="Reznor"
 *      initialMode={fromSupabase.mode}          // "home" | "car"
 *      initialDone={fromSupabase.done}          // { "1": {build,math,code,read}, ... }
 *      onSave={(payload) => saveToSupabase(payload)}   // {mode, done}
 *   />
 *
 * If no initial props / onSave are passed, the component self-persists via
 * the artifact storage fallback (window.storage) so it still works as a
 * standalone preview. In the real app, the parent owns the Supabase read
 * (keyed to Reznor's profile) and write — same pattern as the rest of LLT.
 */

import { useState, useEffect } from "react";

// Shared curriculum (kid + parent arms read the same source of truth).
// Per the v2 brief; the inline copies that lived here are gone.
import { WEEKS, THREADS } from "./summerQuest/data.js";

const STORAGE_KEY = "lltSummerQuest_v1";
const CONFETTI = ["💎", "⭐", "🎉", "🟡", "🔷", "🟢", "🔶"];

/* ============ HELPERS ============ */
const blankDone = () => {
  const d = {};
  WEEKS.forEach((w) => { d[w.n] = { build: false, math: false, code: false, read: false }; });
  return d;
};
const mergeDone = (saved) => {
  const d = blankDone();
  WEEKS.forEach((w) => { if (saved && saved[w.n]) d[w.n] = { ...d[w.n], ...saved[w.n] }; });
  return d;
};
const countOf = (wd) => (wd.build ? 1 : 0) + (wd.math ? 1 : 0) + (wd.code ? 1 : 0) + (wd.read ? 1 : 0);

/* ============ COMPONENT ============ */
export default function SummerQuest({ child = "", initialMode, initialDone, onSave }) {
  const controlled = !!(initialDone || initialMode || onSave);
  const [mode, setMode] = useState(initialMode || "home");
  const [done, setDone] = useState(() => mergeDone(initialDone));
  const [view, setView] = useState("map");        // "map" | "week"
  const [activeWeek, setActiveWeek] = useState(1);
  const [celebrate, setCelebrate] = useState(null); // { type, week, pieces }

  /* Hydrate from artifact storage ONLY when the parent isn't providing data */
  useEffect(() => {
    if (controlled) return;
    let cancelled = false;
    (async () => {
      try {
        if (typeof window !== "undefined" && window.storage) {
          const r = await window.storage.get(STORAGE_KEY, false);
          if (r && r.value && !cancelled) {
            const s = JSON.parse(r.value);
            if (s.mode) setMode(s.mode);
            if (s.done) setDone(mergeDone(s.done));
          }
        }
      } catch (e) { /* first run / unavailable — defaults are fine */ }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Single save seam: parent's onSave (Supabase) + artifact fallback */
  const persist = (nextMode, nextDone) => {
    const payload = { mode: nextMode, done: nextDone };
    if (onSave) { try { onSave(payload); } catch (e) {} }
    try {
      if (typeof window !== "undefined" && window.storage) {
        window.storage.set(STORAGE_KEY, JSON.stringify(payload), false);
      }
    } catch (e) {}
  };

  /* Derived */
  const totalGems = WEEKS.reduce((t, w) => t + countOf(done[w.n]), 0);
  const weeksConquered = WEEKS.filter((w) => countOf(done[w.n]) === 4).length;
  const currentWeek = (WEEKS.find((w) => countOf(done[w.n]) !== 4) || {}).n || null;

  /* Actions */
  const changeMode = (m) => { setMode(m); persist(m, done); };
  const openWeek = (n) => { setActiveWeek(n); setView("week"); window.scrollTo(0, 0); };
  const goMap = () => { setView("map"); window.scrollTo(0, 0); };

  const triggerCelebrate = (type, n) => {
    const pieces = Array.from({ length: 26 }, (_, i) => ({
      id: i, emoji: CONFETTI[i % CONFETTI.length],
      left: Math.random() * 100, dur: 2.4 + Math.random() * 2.2, delay: Math.random() * 0.6,
    }));
    setCelebrate({ type, week: n, pieces });
  };

  const toggleQuest = (n, k) => {
    const wasConq = countOf(done[n]) === 4;
    const next = { ...done, [n]: { ...done[n], [k]: !done[n][k] } };
    setDone(next);
    persist(mode, next);
    if (!wasConq && countOf(next[n]) === 4) {
      const allNow = WEEKS.every((w) => countOf(next[w.n]) === 4);
      triggerCelebrate(allNow ? "all" : "week", n);
    }
  };

  const resetAll = () => {
    if (typeof window !== "undefined" && window.confirm &&
        !window.confirm("Start the whole Summer Quest over? This clears all treasures.")) return;
    const fresh = blankDone();
    setDone(fresh);
    persist(mode, fresh);
  };

  /* ============ RENDER ============ */
  const week = WEEKS[activeWeek - 1];
  const pct = Math.round((totalGems / 28) * 100);

  return (
    <div className="sq-root">
      <style>{CSS}</style>

      {view === "map" ? (
        <div className="sq-phone">
          <div className="sq-brand"><span className="sq-mark">💎</span><span className="sq-name">Little Legends Treasures</span></div>
          <h1 className="sq-title">Summer <span className="sq-gold">Quest</span></h1>
          <div className="sq-subtitle">{child}'s 7-week adventure — learn like the best kids in the world.</div>

          <div className="sq-stats">
            <div className="sq-stat"><div className="sq-v">💎 {totalGems} / 28</div><div className="sq-l">Treasures</div></div>
            <div className="sq-stat"><div className="sq-v">🏆 {weeksConquered} / 7</div><div className="sq-l">Weeks conquered</div></div>
          </div>
          <div className="sq-bar"><i style={{ width: pct + "%" }} /></div>
          <div className="sq-bar-cap">{weeksConquered === 7 ? "👑 LEGEND! You finished the whole adventure!" : "The treasure map to the end of summer"}</div>

          <div className="sq-mode-wrap">
            <div className="sq-seg">
              <button className={mode === "home" ? "on" : ""} onClick={() => changeMode("home")}>🏠 At Home</button>
              <button className={mode === "car" ? "on road" : ""} onClick={() => changeMode("car")}>🚗 On the Road</button>
            </div>
            <div className="sq-mode-help">
              {mode === "car"
                ? <>🚗 <b>Road mode is on.</b> Every quest is now a car-friendly version — perfect for the drive up to NorCal to see Xander.</>
                : <>Heading up to NorCal to hang with Xander? Flip to <b>On the Road</b> for fun car versions of every quest.</>}
            </div>
          </div>

          <div className="sq-trail-h">🗺️ The Journey</div>
          <div className="sq-trail">
            {WEEKS.map((w) => {
              const dc = countOf(done[w.n]);
              const conq = dc === 4;
              const here = w.n === currentWeek;
              return (
                <button key={w.n} className={"sq-stop" + (conq ? " done" : "") + (here ? " here" : "")} onClick={() => openWeek(w.n)}>
                  {conq && <div className="sq-crown">👑</div>}
                  <div className="sq-medal">{conq ? "🏆" : w.n}</div>
                  <div className="sq-card">
                    <div className="sq-wk">{w.name}</div>
                    <div className="sq-tg">{w.tag}</div>
                    <div className="sq-gems-mini">
                      {THREADS.map((t) => <span key={t.k} className={"e" + (done[w.n][t.k] ? " on" : "")}>💎</span>)}
                      <span className="sq-frac">{dc}/4</span>
                    </div>
                    {here && <div className="sq-flag">📍 You are here</div>}
                    {conq && <div className="sq-flag gold">🏆 Conquered</div>}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="sq-note">
            <p>🏃 Drums, dance, swim & taekwondo keep going all summer — they're the base of everything.</p>
            <p>✨ Missing a day is totally fine. What matters is having fun and getting to the end of the adventure.</p>
          </div>
          <button className="sq-reset" onClick={resetAll}>Start the whole adventure over</button>
        </div>
      ) : (
        <div className="sq-phone">
          <button className="sq-back" onClick={goMap}>← The Journey</button>
          <div className="sq-wk-head">
            <div className="sq-medal" style={countOf(done[week.n]) === 4 ? { background: "var(--sq-gold)" } : undefined}>
              {countOf(done[week.n]) === 4 ? "🏆" : week.n}
            </div>
            <div><div className="sq-wn">{week.name}</div><div className="sq-wt">{week.tag}</div></div>
          </div>

          <div className={"sq-mode-chip " + (mode === "car" ? "road" : "home")}>
            {mode === "car" ? "🚗 Road mode — car-friendly quests" : "🏠 At-home quests"}
          </div>
          <div className="sq-pick-hint">Pick whatever you feel like today — any quest, any order. Do one, do all four. 💎</div>

          {THREADS.map((t) => {
            const isDone = done[week.n][t.k];
            return (
              <div key={t.k} className={"sq-quest " + t.cls + (isDone ? " is-done" : "")}>
                <div className="sq-qtop"><span className="sq-qemoji">{t.emoji}</span><span className="sq-qlbl">{mode === "car" ? t.car : t.home}</span></div>
                <div className="sq-qtext">{week[t.k][mode === "car" ? "car" : "home"]}</div>
                <button className={"sq-qbtn" + (isDone ? " done" : "")} onClick={() => toggleQuest(week.n, t.k)}>
                  {isDone ? "💎 Treasure earned!" : "Tap when you do it"}
                </button>
              </div>
            );
          })}

          {countOf(done[week.n]) === 4 && (
            <div className="sq-chest">
              <div className="sq-chest-big">🏆 Week {week.n} conquered!</div>
              <div className="sq-chest-sm">You earned all 4 treasures. You're building your legend, {child}.</div>
            </div>
          )}
          <div style={{ height: 20 }} />
        </div>
      )}

      {celebrate && (
        <div className="sq-overlay" onClick={() => setCelebrate(null)}>
          <div className="sq-confetti">
            {celebrate.pieces.map((p) => (
              <span key={p.id} style={{ left: p.left + "%", animationDuration: p.dur + "s", animationDelay: p.delay + "s" }}>{p.emoji}</span>
            ))}
          </div>
          <div className="sq-pop" onClick={(e) => e.stopPropagation()}>
            <div className="sq-pe">{celebrate.type === "all" ? "👑" : "🏆"}</div>
            <h2>{celebrate.type === "all" ? "YOU'RE A LEGEND!" : "Week " + celebrate.week + " conquered!"}</h2>
            <p>{celebrate.type === "all"
              ? `${child}, you finished all 7 weeks of the Summer Quest. You dreamed it AND you built it. 🎉`
              : `All 4 treasures earned! Look how far you've come, ${child}. On to the next adventure!`}</p>
            <button onClick={() => setCelebrate(null)}>Keep going! 🚀</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============ SCOPED STYLES ============ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Nunito:ital,wght@0,400;0,600;0,700;0,800;1,700&display=swap');
.sq-root{
  --sq-parch:#FBF1DC; --sq-parch2:#F4E4C3; --sq-ink:#3a2b1a; --sq-ink-soft:#7a6750;
  --sq-gold:#E8A82C; --sq-gold-d:#c2871a; --sq-teal:#1f8a8a;
  --sq-build:#E8552B; --sq-build-t:#FCE3D9; --sq-math:#1F6FB2; --sq-math-t:#DCEBF7;
  --sq-code:#2E8B57; --sq-code-t:#DCEFE4; --sq-read:#B23A86; --sq-read-t:#F7DCEC;
  font-family:'Nunito',system-ui,sans-serif; color:var(--sq-ink);
  min-height:100%; -webkit-font-smoothing:antialiased;
  background:
    radial-gradient(circle at 20% 0%, #fff6e3 0%, transparent 45%),
    radial-gradient(circle at 90% 100%, #f6e6c4 0%, transparent 50%),
    var(--sq-parch);
}
.sq-root *{box-sizing:border-box; margin:0; padding:0; -webkit-tap-highlight-color:transparent;}
.sq-phone{max-width:480px; margin:0 auto; padding:20px 16px 40px;}

.sq-brand{display:flex; align-items:center; gap:10px;}
.sq-mark{font-size:26px; filter:drop-shadow(0 2px 0 rgba(0,0,0,.12));}
.sq-name{font-family:'Fredoka',sans-serif; font-weight:600; font-size:15px; color:var(--sq-ink-soft);}
.sq-title{font-family:'Fredoka',sans-serif; font-weight:700; font-size:34px; line-height:1; margin-top:6px;}
.sq-gold{color:var(--sq-gold-d);}
.sq-subtitle{font-size:14px; color:var(--sq-ink-soft); margin-top:6px; font-weight:600;}

.sq-stats{display:flex; gap:10px; margin:16px 0 6px;}
.sq-stat{flex:1; background:#fff; border:2.5px solid var(--sq-ink); border-radius:16px; padding:11px 12px; box-shadow:0 3px 0 var(--sq-ink);}
.sq-v{font-family:'Fredoka',sans-serif; font-weight:700; font-size:21px; line-height:1;}
.sq-l{font-size:11px; font-weight:700; letter-spacing:.04em; text-transform:uppercase; color:var(--sq-ink-soft); margin-top:3px;}
.sq-bar{height:14px; background:#e9d9b6; border:2.5px solid var(--sq-ink); border-radius:20px; overflow:hidden; margin:12px 0 2px;}
.sq-bar > i{display:block; height:100%; background:linear-gradient(90deg,var(--sq-gold),#f2c45a); transition:width .5s cubic-bezier(.2,.8,.2,1);}
.sq-bar-cap{font-size:12px; font-weight:700; color:var(--sq-ink-soft); text-align:center; margin-bottom:4px;}

.sq-mode-wrap{margin:18px 0 6px;}
.sq-seg{display:flex; background:#fff; border:2.5px solid var(--sq-ink); border-radius:16px; padding:5px; gap:5px; box-shadow:0 3px 0 var(--sq-ink);}
.sq-seg button{flex:1; border:none; background:transparent; font-family:'Fredoka',sans-serif; font-weight:600; font-size:15px; padding:11px 8px; border-radius:11px; cursor:pointer; color:var(--sq-ink-soft); transition:.15s;}
.sq-seg button.on{background:var(--sq-ink); color:#fff;}
.sq-seg button.on.road{background:var(--sq-teal);}
.sq-mode-help{font-size:12.5px; color:var(--sq-ink-soft); font-weight:600; margin-top:9px; padding:0 4px; line-height:1.45;}
.sq-mode-help b{color:var(--sq-teal);}

.sq-trail-h{font-family:'Fredoka',sans-serif; font-weight:600; font-size:13px; letter-spacing:.1em; text-transform:uppercase; color:var(--sq-ink-soft); margin:22px 2px 12px;}
.sq-trail{position:relative;}
.sq-trail::before{content:""; position:absolute; left:27px; top:18px; bottom:30px; width:4px; background:repeating-linear-gradient(var(--sq-gold-d) 0 8px, transparent 8px 16px); border-radius:4px; z-index:0;}
.sq-stop{position:relative; z-index:1; display:flex; gap:14px; align-items:stretch; margin-bottom:14px; width:100%; background:none; border:none; padding:0; text-align:left; cursor:pointer; font-family:inherit;}
.sq-medal{flex:none; width:56px; height:56px; border-radius:50%; background:#fff; border:3px solid var(--sq-ink); display:flex; align-items:center; justify-content:center; font-family:'Fredoka',sans-serif; font-weight:700; font-size:22px; box-shadow:0 3px 0 var(--sq-ink);}
.sq-stop.done .sq-medal{background:var(--sq-gold);}
.sq-stop.here .sq-medal{animation:sqPulse 1.6s ease-in-out infinite;}
.sq-card{flex:1; background:#fff; border:2.5px solid var(--sq-ink); border-radius:16px; padding:12px 14px; box-shadow:0 3px 0 var(--sq-ink); transition:transform .12s;}
.sq-stop:active .sq-card{transform:translateY(2px); box-shadow:0 1px 0 var(--sq-ink);}
.sq-wk{font-family:'Fredoka',sans-serif; font-weight:700; font-size:18px; line-height:1.05;}
.sq-tg{font-size:12.5px; color:var(--sq-ink-soft); font-weight:600; margin-top:2px;}
.sq-gems-mini{margin-top:8px; font-size:14px; letter-spacing:1px; display:flex; align-items:center; gap:1px;}
.sq-gems-mini .e{opacity:.22;}
.sq-gems-mini .e.on{opacity:1;}
.sq-frac{font-size:12px; color:var(--sq-ink-soft); font-weight:700; margin-left:6px; letter-spacing:0;}
.sq-flag{display:inline-block; background:var(--sq-teal); color:#fff; font-family:'Fredoka',sans-serif; font-weight:600; font-size:11px; padding:2px 9px; border-radius:20px; margin-top:8px;}
.sq-flag.gold{background:var(--sq-gold-d);}
.sq-crown{position:absolute; top:-10px; left:34px; font-size:20px; z-index:2;}

.sq-note{background:var(--sq-parch2); border:2.5px dashed var(--sq-ink); border-radius:16px; padding:14px 16px; margin:18px 0 6px;}
.sq-note p{font-size:13px; font-weight:600; color:var(--sq-ink); line-height:1.5;}
.sq-note p + p{margin-top:7px;}
.sq-reset{display:block; width:100%; margin-top:14px; background:none; border:none; color:var(--sq-ink-soft); font-family:'Nunito',sans-serif; font-weight:700; font-size:12.5px; text-decoration:underline; cursor:pointer; padding:8px;}

.sq-back{background:#fff; border:2.5px solid var(--sq-ink); border-radius:13px; font-family:'Fredoka',sans-serif; font-weight:600; font-size:14px; padding:9px 15px; cursor:pointer; box-shadow:0 3px 0 var(--sq-ink); margin-bottom:16px;}
.sq-back:active{transform:translateY(2px); box-shadow:0 1px 0 var(--sq-ink);}
.sq-wk-head{display:flex; align-items:center; gap:14px; margin-bottom:6px;}
.sq-wk-head .sq-medal{width:62px; height:62px; font-size:25px;}
.sq-wn{font-family:'Fredoka',sans-serif; font-weight:700; font-size:27px; line-height:1;}
.sq-wt{font-size:13.5px; color:var(--sq-ink-soft); font-weight:600; margin-top:4px;}
.sq-mode-chip{display:inline-flex; align-items:center; gap:6px; font-family:'Fredoka',sans-serif; font-weight:600; font-size:13px; padding:6px 13px; border-radius:20px; margin:14px 0 4px; border:2px solid var(--sq-ink);}
.sq-mode-chip.home{background:var(--sq-parch2);}
.sq-mode-chip.road{background:var(--sq-teal); color:#fff; border-color:var(--sq-teal);}
.sq-pick-hint{font-size:13px; font-weight:600; color:var(--sq-ink-soft); margin:12px 2px 14px; line-height:1.45;}

.sq-quest{border:3px solid var(--sq-ink); border-radius:18px; padding:15px 16px; margin-bottom:14px; box-shadow:0 4px 0 var(--sq-ink); transition:.15s;}
.sq-quest.b{background:var(--sq-build-t);} .sq-quest.b .sq-qlbl{color:var(--sq-build);}
.sq-quest.m{background:var(--sq-math-t);}  .sq-quest.m .sq-qlbl{color:var(--sq-math);}
.sq-quest.c{background:var(--sq-code-t);}  .sq-quest.c .sq-qlbl{color:var(--sq-code);}
.sq-quest.r{background:var(--sq-read-t);}  .sq-quest.r .sq-qlbl{color:var(--sq-read);}
.sq-quest.is-done{filter:saturate(.55);}
.sq-qtop{display:flex; align-items:center; gap:9px; margin-bottom:7px;}
.sq-qemoji{font-size:22px;}
.sq-qlbl{font-family:'Fredoka',sans-serif; font-weight:600; font-size:13px; letter-spacing:.05em; text-transform:uppercase;}
.sq-qtext{font-size:15.5px; font-weight:700; line-height:1.4; color:var(--sq-ink);}
.sq-qbtn{margin-top:13px; width:100%; border:2.5px solid var(--sq-ink); border-radius:13px; background:#fff; font-family:'Fredoka',sans-serif; font-weight:600; font-size:15px; padding:11px; cursor:pointer; box-shadow:0 3px 0 var(--sq-ink); transition:.1s; display:flex; align-items:center; justify-content:center; gap:8px;}
.sq-qbtn:active{transform:translateY(2px); box-shadow:0 1px 0 var(--sq-ink);}
.sq-qbtn.done{background:var(--sq-gold); color:var(--sq-ink);}

.sq-chest{background:var(--sq-ink); color:#fff; border-radius:18px; padding:20px; text-align:center; margin:6px 0 4px;}
.sq-chest-big{font-family:'Fredoka',sans-serif; font-weight:700; font-size:21px;}
.sq-chest-sm{font-size:13.5px; color:#e7d6b4; font-weight:600; margin-top:5px;}

.sq-overlay{position:fixed; inset:0; background:rgba(40,28,12,.55); display:flex; align-items:center; justify-content:center; z-index:9999; padding:24px; animation:sqFade .25s ease;}
.sq-pop{background:#fff; border:4px solid var(--sq-ink); border-radius:24px; padding:28px 24px; max-width:340px; width:100%; text-align:center; box-shadow:0 8px 0 var(--sq-gold-d); animation:sqBounce .5s cubic-bezier(.2,1.4,.4,1); position:relative; z-index:2;}
.sq-pe{font-size:64px; line-height:1; animation:sqWiggle 1.2s ease-in-out infinite;}
.sq-pop h2{font-family:'Fredoka',sans-serif; font-weight:700; font-size:24px; margin:12px 0 6px;}
.sq-pop p{font-size:14.5px; font-weight:600; color:var(--sq-ink-soft); line-height:1.5;}
.sq-pop button{margin-top:18px; background:var(--sq-gold); border:3px solid var(--sq-ink); border-radius:14px; font-family:'Fredoka',sans-serif; font-weight:700; font-size:16px; padding:12px 22px; cursor:pointer; box-shadow:0 4px 0 var(--sq-ink);}
.sq-pop button:active{transform:translateY(2px); box-shadow:0 2px 0 var(--sq-ink);}
.sq-confetti{position:fixed; inset:0; pointer-events:none; z-index:1; overflow:hidden;}
.sq-confetti span{position:absolute; top:-30px; font-size:20px; animation:sqFall linear forwards;}

@keyframes sqPulse{0%,100%{box-shadow:0 3px 0 var(--sq-ink), 0 0 0 0 rgba(31,138,138,.5);}50%{box-shadow:0 3px 0 var(--sq-ink), 0 0 0 10px rgba(31,138,138,0);}}
@keyframes sqFade{from{opacity:0}to{opacity:1}}
@keyframes sqBounce{from{transform:scale(.7);opacity:0}to{transform:scale(1);opacity:1}}
@keyframes sqWiggle{0%,100%{transform:rotate(-6deg)}50%{transform:rotate(6deg)}}
@keyframes sqFall{to{transform:translateY(110vh) rotate(360deg);}}
`;
