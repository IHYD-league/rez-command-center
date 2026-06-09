/**
 * ParentCompanion.jsx — "Coach Mode" for Reznor Command Center.
 *
 * Reads the SAME { mode, done } progress as the kid arm (SummerQuest.jsx)
 * via useSummerQuestProgress. Checking a quest off in Coach Mode shows
 * the gem in Reznor's app, flipping Home/Road in either flips both.
 *
 * Curriculum data (WEEKS + THREADS) imports from the shared module.
 * Parent-only content (GUIDE coach notes + MATH generators) stays here.
 *
 * Originally lived at docs/School-plans/ParentCompanion.jsx with the
 * inline // SHARED arrays the v2 brief flagged for lifting. Brick 4
 * dedupes those against src/summerQuest/data.js.
 */

import { useState, useEffect } from "react";
import { WEEKS, THREADS } from "./data.js";

/* ===================== PARENT TEACHING LAYER ===================== */
const LEVEL_LABELS = ["Just Right", "Stretch", "Boss Level"];
const R = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

/* Math generators — return fresh exact numbers per call. {say, answer} or {say, tip} */
const MATH = {
  1: (lvl) => {
    const t = lvl === 1 ? R(6, 10) : lvl === 2 ? R(12, 20) : R(20, 50);
    const k = lvl === 1 ? R(2, 5) : lvl === 2 ? R(4, 9) : R(10, t - 5);
    return { say: `You have ${t} bricks. Take away ${k}. Show me what’s left.`, answer: t - k };
  },
  2: (lvl) => {
    if (lvl === 1) return { say: "Roll ONE die 15 times. Make a tally mark each time. Which number won?", tip: "No single answer — he reads the tallies. Just check they’re organized." };
    if (lvl === 2) return { say: "First PREDICT which number will win. Then roll one die 25 times and tally. Were you right?", tip: "Each number is equally likely — the fun is seeing it’s not always even." };
    return { say: "Roll TWO dice 20 times, ADD them each roll (2–12), and tally the sums. Which total won?", tip: "7 wins most often — there are more ways to make it." };
  },
  3: (lvl) => {
    const cap = lvl === 1 ? 10 : lvl === 2 ? 20 : 50;
    let a = R(2, cap), b = R(2, cap); if (a === b) b = b > 1 ? b - 1 : b + 1;
    return { say: `Player 1 has ${a} points, Player 2 has ${b}. Who has more — and by how many?`, answer: `${Math.max(a, b)} − ${Math.min(a, b)} = ${Math.abs(a - b)}` };
  },
  4: (lvl) => {
    const g = lvl === 1 ? R(2, 3) : lvl === 2 ? R(3, 4) : R(4, 5);
    const n = lvl === 1 ? R(2, 3) : lvl === 2 ? R(3, 5) : R(4, 6);
    return { say: `Make ${g} piles of ${n} bricks. How many bricks all together?`, answer: `${g} × ${n} = ${g * n}` };
  },
  5: (lvl) => {
    if (lvl === 3) { const a = R(8, 20); let b = R(8, 20); if (a === b) b = b > 8 ? b - 1 : b + 1; return { say: `One tower is ${a} bricks, one is ${b}. How much TALLER is the big one?`, answer: Math.abs(a - b) }; }
    const t = lvl === 1 ? R(5, 10) : R(10, 15); const d = lvl === 1 ? R(1, 3) : R(3, 6);
    return { say: `Build a tower EXACTLY ${t} bricks. Now build one ${d} taller — how tall is that one?`, answer: t + d };
  },
  6: (lvl) => {
    if (lvl === 1) { const h = R(3, 5), c = R(1, h - 1); return { say: `You have $${h}. A snack costs $${c}. How much change?`, answer: `$${h - c}` }; }
    if (lvl === 2) { const h = R(7, 10), a = R(1, 4), b = R(1, Math.min(4, h - a - 1)); return { say: `You have $${h}. You buy something $${a} and something $${b}. How much is left?`, answer: `$${h - a - b}` }; }
    const c = R(3, 9); return { say: `You pay with a $10 bill for something that costs $${c}. What’s your change?`, answer: `$${10 - c}` };
  },
  7: (lvl) => {
    if (lvl === 1) { const a = R(1, 9), b = R(1, 9); return { say: `Round 1 you scored ${a}, round 2 you scored ${b}. Total?`, answer: a + b }; }
    if (lvl === 2) { const a = R(1, 9), b = R(1, 9), c = R(1, 9); return { say: `You scored ${a}, then ${b}, then ${c}. What’s your total?`, answer: a + b + c }; }
    const s = R(5, 15), a = R(1, 9), b = R(1, Math.min(9, s + a - 1)); return { say: `You have ${s} points. You win ${a} more, then lose ${b}. Where are you now?`, answer: s + a - b };
  },
};

/* Per-quest coach notes. Math uses the MATH generators above (so "levels" are generated). */
const GUIDE = {
  "1:build": { title: "Invent the Game", goal: "Imagination + planning — he invents the thing he’ll build all summer.", setup: "Ask 3 questions and jot his answers: What’s it called? Who are the heroes? What does the board look like? Then let him sketch or paint it.", levels: ["Name it and draw the board.", "Add 3 characters and what makes each special.", "Add how you WIN plus one thing you’re NOT allowed to do."], look: "He’s making choices and explaining them — there are no wrong answers here.", fun: "Cast the family as characters in his game." },
  "1:math":  { title: "Part-Whole (Take-Away)", goal: "Subtraction as “what’s left” — the foundation of mental math.", setup: "Hand him a pile, name a take-away, and have him SHOW the leftover with bricks before saying the number.", look: "He removes/separates before counting — he doesn’t recount from 1.", fun: "Story it: a dragon snatched the take-away amount — how many gems survived?" },
  "1:code":  { title: "The Sandwich Robot", goal: "Sequencing + debugging — a computer does exactly what you say, not what you mean.", setup: "He gives step-by-step instructions to make a sandwich. You follow them LITERALLY and overdo the gaps (“you never said open the jar!”).", levels: ["Make a sandwich (5–6 steps).", "Pour a bowl of cereal — order matters (bowl before cereal!).", "Tie shoes or brush teeth — long sequence; he fixes the bugs you act out."], look: "He notices a missing step and adds it — that’s debugging.", fun: "Be a dramatic, very dumb robot. The funnier your literal mistakes, the more he learns." },
  "1:read":  { title: "Pick & Draw", goal: "Reading habit + comprehension through drawing.", setup: "Pick the summer “stretch” book together. After reading, he draws one comic panel of his favorite moment.", levels: ["Draw one favorite moment.", "Draw it AND write one sentence about it.", "Draw 3 panels: beginning, middle, end."], look: "He can tell you WHY he picked that moment.", fun: "Read in silly voices — he directs which character sounds like what." },

  "2:build": { title: "Write the Rules", goal: "Turning ideas into clear rules — early systems thinking + writing.", setup: "He says each rule out loud; you write it in the rulebook. Pick Lego minifigs as the pieces.", levels: ["3 simple rules.", "5 rules + how to win.", "Add a “special power” card or square with its own rule."], look: "Rules are clear enough that someone else could play.", fun: "Read the rules back in an “official referee” voice." },
  "2:math":  { title: "Tally & Chance", goal: "Counting, tallying, and a first feel for probability.", setup: "He rolls, makes a tally mark for each result, then reads the chart: which won?", look: "His tally marks are organized and he can read the winner.", fun: "Bet a high-five on which number wins before rolling." },
  "2:code":  { title: "Arrow Mazes", goal: "Sequences and the idea of a program (and loops).", setup: "Draw a simple grid maze. He writes arrow commands (↑↑→→) start-to-finish; you “run” them with your finger.", levels: ["4×4 maze, mostly straight.", "Add a turn or two; check his arrows.", "Add a wall to go around; let him use “repeat ↑ x3” (a loop)."], look: "His arrows actually reach the end — if not, he debugs them.", fun: "He’s the programmer, you’re the robot — you only move on his command." },
  "2:read":  { title: "Spanish Day", goal: "Keep Spanish as strong as English — a huge long-term asset.", setup: "Read a Spanish book (keep Tipos Malos going). He draws a panel and labels it in Spanish.", levels: ["He labels 1 thing in Spanish.", "He reads a page aloud in Spanish.", "He retells the page to you in Spanish."], look: "He’s comfortable, not translating word-by-word.", fun: "Whoever spots a Spanish word in the wild (signs, packaging) scores a point." },

  "3:build": { title: "Playtest & Version 2", goal: "Iteration + resilience — version 1 is never the final version.", setup: "Actually play his game as a family. Then ask: what was boring or confusing? Change ONE thing together → Version 2.", levels: ["Fix one boring part.", "Fix two and add one new idea.", "Add a “twist” card that changes the game mid-play."], look: "He treats a flaw as a fix, not a failure.", fun: "Give Version 2 a big “update launch” announcement." },
  "3:math":  { title: "Compare & Difference", goal: "Comparing amounts and finding the difference (a bar model in bricks).", setup: "Stack each player’s points as brick towers, line them up, and find how many MORE the taller one has.", look: "He compares by lining up, not by guessing.", fun: "Loser of the round picks the next song." },
  "3:code":  { title: "Find the Bug", goal: "Debugging directly — spotting and fixing errors.", setup: "You give a silly broken set of instructions (“to get a snack, first put on your shoes”). He finds what’s wrong or missing.", levels: ["1 obvious bug.", "2 bugs, one subtle (wrong order).", "He writes instructions WITH a hidden bug for YOU to find."], look: "He can say WHY it’s wrong, not just that it is.", fun: "Keep a “bug count” scoreboard for the week." },
  "3:read":  { title: "Predict & Reason", goal: "Comprehension — predicting and reasoning, not just decoding.", setup: "Read together; pause at a cliffhanger and ask “what happens next, and why?”", levels: ["Predict what happens next.", "Predict + give a reason from the story.", "Predict, then check — right? What clue did you miss?"], look: "His guess is grounded in something that already happened.", fun: "Both write a prediction on paper; reveal after." },

  "4:build": { title: "First ScratchJr Move", goal: "First real coding on a screen — translate his game to ScratchJr.", setup: "Open ScratchJr (free iPad app). Goal: pick a character and move it across the screen with the blue motion blocks.", levels: ["Move right.", "Move right, then up (two blocks in order).", "Move out and come back."], look: "He drags blocks and presses go without you driving.", fun: "Use a photo of himself as the character (ScratchJr allows it)." },
  "4:math":  { title: "Groups Of", goal: "Groups-of — the gentle on-ramp to multiplication.", setup: "Build equal piles, then count the total — nudge him to skip-count.", look: "He skip-counts (4, 8, 12) instead of counting by ones.", fun: "Use snacks — groups of crackers he gets to eat after." },
  "4:code":  { title: "Tap to React", goal: "Events — “when I tap, this happens.”", setup: "Add a “when tapped” (yellow) block so the character does something on a tap.", levels: ["Tap → it moves.", "Tap → it moves AND says something.", "Tap → it grows or changes (add a looks block)."], look: "He connects the start block to an action and tests it.", fun: "Make it say something silly when tapped." },
  "4:read":  { title: "Make a Comic", goal: "Reading → creating — he becomes the author.", setup: "Fold paper into panels. He draws his own one-page comic with a beginning, middle, end (Cat Kid is the model).", levels: ["3 panels, pictures only.", "3 panels + speech bubbles.", "6 panels with a problem and a solution."], look: "His comic tells a story you can follow.", fun: "Staple a few together into his first “Issue #1.”" },

  "5:build": { title: "Two Characters Talk", goal: "Interaction between elements — the heart of game-making.", setup: "In ScratchJr add a second character. Make the two do something together (talk, chase, meet).", levels: ["Two characters on screen.", "They take turns moving.", "One reacts to the other (chases or answers)."], look: "He’s thinking about how two things relate, not just one.", fun: "Make it a tiny scene from his game’s story." },
  "5:math":  { title: "Measure & Compare", goal: "Measuring, estimating, and comparing height/length.", setup: "Build to an exact brick count, then a taller one — compare them.", look: "He builds the exact number and compares accurately.", fun: "Guess first, then build to check how close he was." },
  "5:code":  { title: "Loops", goal: "Loops — repeat without rewriting; peek at big-kid Scratch if ready.", setup: "Use a repeat block so an action happens several times instead of stacking blocks.", levels: ["Repeat a move 3 times.", "Repeat a move + a sound.", "Try full Scratch in a browser — his reading is ready."], look: "He sees that “repeat 3” is shorter than 3 blocks — the point of a loop.", fun: "Make a dance: repeat a wiggle 10 times." },
  "5:read":  { title: "Bilingual Labels", goal: "Bilingual vocabulary + connecting reading to his project.", setup: "He writes his game’s character/button names in BOTH English and Spanish.", levels: ["Label 3 things in both.", "Label 5 and read them aloud.", "Write a one-line instruction in each language."], look: "He chooses the words and sounds them out in both.", fun: "Make bilingual stickers for the real Lego pieces." },

  "6:build": { title: "His Pick", goal: "Self-direction (the Finland move) — he chooses; you support.", setup: "Offer the menu (more art, code, big Lego build, stop-motion) and let HIM pick. Your job is to say yes and help.", levels: ["Pick one thing and start.", "Set a small goal (“finish the castle”).", "Plan it in 3 steps before starting."], look: "He’s driving — the energy and ownership are the win, not the output.", fun: "Give him a “Director” title and let him assign you a job." },
  "6:math":  { title: "Money Sense", goal: "Money — adding, subtracting, and making change.", setup: "Play “store” with real or pretend coins; he’s the cashier making change.", look: "He counts UP to make change instead of guessing.", fun: "Let him “buy” a real small treat with exact money." },
  "6:code":  { title: "Finish One Thing", goal: "Completion — shipping something whole, however small.", setup: "Help him take ONE small idea all the way to a finished, playable thing.", levels: ["One screen that does one thing.", "Add a start and an end.", "Add a simple goal or score."], look: "He can hand you the tablet and say “play it.”", fun: "Throw a tiny “release party” when it’s done." },
  "6:read":  { title: "He Reads to You", goal: "Fluency + confidence — reading aloud.", setup: "Flip roles: HE reads to you today. Cheer; don’t correct every word.", levels: ["Read one page aloud.", "Read a short section.", "Read with expression — different voices."], look: "He’s relaxed and enjoying it; stumbles are fine.", fun: "Record him reading and play it back — kids love hearing themselves." },

  "7:build": { title: "Teach the Game", goal: "Communication + confidence — he explains his creation to an audience.", setup: "Family game night using HIS game. He teaches everyone the rules and runs it.", levels: ["Explain the rules to one person.", "Teach the whole family + answer questions.", "Host the whole game start to finish."], look: "He speaks clearly and handles questions — that’s leadership.", fun: "Make him a “Game Designer” badge or name tag." },
  "7:math":  { title: "Scorekeeper", goal: "Adding running totals (and subtracting penalties).", setup: "He’s the official scorekeeper — add each round, subtract penalties, track the total.", look: "He keeps a correct running total across rounds.", fun: "Give it stakes — winner picks dessert." },
  "7:code":  { title: "Demo & Version 3", goal: "Presenting work + thinking ahead — keep the loop open.", setup: "He shows what he built on screen. Then ask the magic question: “what would Version 3 be?”", levels: ["Show it and say what it does.", "Show it and name one thing he’d improve.", "List 3 ideas for Version 3."], look: "He talks about his work proudly AND sees how to make it better.", fun: "Write the Version 3 ideas on a “someday” list for the school year." },
  "7:read":  { title: "Finish & Next", goal: "Completion + momentum into the school year.", setup: "Finish the summer book together. Then let him pick the next one.", levels: ["Finish and say your favorite part.", "Finish + retell the story in 1 minute.", "Pick the next book AND say why."], look: "He’s excited to start the next one.", fun: "Make a “books I conquered this summer” list with stars." },
};

const countOf = (wd) => (wd.build ? 1 : 0) + (wd.math ? 1 : 0) + (wd.code ? 1 : 0) + (wd.read ? 1 : 0);
const blankDone = () => { const d = {}; WEEKS.forEach((w) => { d[w.n] = { build: false, math: false, code: false, read: false }; }); return d; };
const mergeDone = (saved) => { const d = blankDone(); WEEKS.forEach((w) => { if (saved && saved[w.n]) d[w.n] = { ...d[w.n], ...saved[w.n] }; }); return d; };
const STORAGE_KEY = "lltSummerQuest_v1"; // SAME key as SummerQuest.jsx → shared source of truth in standalone preview

/* ===================== COMPONENT ===================== */
export default function ParentCompanion({ child = "Reznor", mode: modeProp, done: doneProp, onSave }) {
  const controlled = !!(modeProp || doneProp || onSave);
  const [mode, setMode] = useState(modeProp || "home");
  const [done, setDone] = useState(() => mergeDone(doneProp));

  // When the controlling parent updates the props (kid finished a quest
  // in his app, parent un-marked one in another tab, etc.), sync the
  // local state back. Same pattern the SummerQuest kid arm uses.
  useEffect(() => {
    if (!controlled) return;
    if (modeProp && modeProp !== mode) setMode(modeProp);
    if (doneProp) setDone(mergeDone(doneProp));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modeProp, doneProp]);

  const firstUndone = (WEEKS.find((w) => countOf(done[w.n]) !== 4) || WEEKS[0]).n;
  const [viewWeek, setViewWeek] = useState(firstUndone);
  const [openKey, setOpenKey] = useState(null);
  const [level, setLevel] = useState(1);
  const [funOn, setFunOn] = useState(false);
  const [gen, setGen] = useState(null);

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
      } catch (e) {}
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = (nextMode, nextDone) => {
    const payload = { mode: nextMode, done: nextDone };
    if (onSave) { try { onSave(payload); } catch (e) {} }
    try { if (typeof window !== "undefined" && window.storage) window.storage.set(STORAGE_KEY, JSON.stringify(payload), false); } catch (e) {}
  };

  const flipMode = (m) => { setMode(m); persist(m, done); };
  const setQuestDone = (n, k, val) => { const next = { ...done, [n]: { ...done[n], [k]: val } }; setDone(next); persist(mode, next); };

  const openQuest = (n, k) => {
    const key = n + ":" + k;
    if (openKey === key) { setOpenKey(null); return; }
    setOpenKey(key); setLevel(1); setFunOn(false);
    setGen(MATH[n] ? MATH[n](1) : null);
  };
  const changeLevel = (lv) => { setLevel(lv); if (MATH[parseInt(openKey)]) setGen(MATH[parseInt(openKey)](lv)); };
  const reroll = () => { const n = parseInt(openKey); if (MATH[n]) setGen(MATH[n](level)); };

  const week = WEEKS[viewWeek - 1];
  const weekDone = countOf(done[viewWeek]);

  return (
    <div className="pc-root">
      <style>{CSS}</style>
      <div className="pc-wrap">
        <div className="pc-brand"><span>💎</span><span className="pc-bname">Little Legends Treasures</span></div>
        <h1 className="pc-title">Coach Mode 🧭</h1>
        <div className="pc-sub">{child}'s Summer Quest — your quick teaching cheat-sheet.</div>

        <div className="pc-status">
          <div className="pc-status-line"><b>{child}</b> is on <b>Week {firstUndone}</b> — {WEEKS[firstUndone - 1].name}</div>
          <div className="pc-mode">
            <button className={mode === "home" ? "on" : ""} onClick={() => flipMode("home")}>🏠 Home</button>
            <button className={mode === "car" ? "on road" : ""} onClick={() => flipMode("car")}>🚗 Road</button>
          </div>
        </div>

        {mode === "car" && (
          <div className="pc-banner">🚗 Road mode is on. These are the lighter car versions — no setup needed, just play them. Coach notes pick back up at home.</div>
        )}

        <div className="pc-howto">Tap a quest for the full how-to. <b>Too easy?</b> Slide the challenge up. <b>Bored?</b> Tap Make it Fun. You can check things off for him too.</div>

        <div className="pc-weeks">
          {WEEKS.map((w) => (
            <button key={w.n} className={"pc-wbtn" + (w.n === viewWeek ? " on" : "") + (countOf(done[w.n]) === 4 ? " done" : "")}
              onClick={() => { setViewWeek(w.n); setOpenKey(null); }}>{countOf(done[w.n]) === 4 ? "🏆" : w.n}</button>
          ))}
        </div>

        <div className="pc-weekhead">
          <div className="pc-wname">Week {week.n} · {week.name}</div>
          <div className="pc-wprog">{weekDone}/4 done</div>
        </div>

        {THREADS.map((t) => {
          const key = week.n + ":" + t.k;
          const g = GUIDE[key] || {};
          const isOpen = openKey === key;
          const isDone = done[week.n][t.k];
          const isMath = !!MATH[week.n] && t.k === "math";
          const promptText = isMath ? (gen ? gen.say : "") : (mode === "car" ? week[t.k].car : (g.levels ? g.levels[level - 1] : week[t.k].home));
          return (
            <div key={t.k} className={"pc-quest " + t.cls + (isDone ? " is-done" : "")}>
              <button className="pc-qhead" onClick={() => openQuest(week.n, t.k)}>
                <span className="pc-qemoji">{t.emoji}</span>
                <span className="pc-qmid">
                  <span className="pc-qlbl">{mode === "car" ? t.car : t.home}{isDone && <span className="pc-tick"> ✓</span>}</span>
                  <span className="pc-qtitle">{g.title || ""}</span>
                </span>
                <span className="pc-caret">{isOpen ? "▾" : "▸"}</span>
              </button>

              {isOpen && (
                <div className="pc-detail">
                  {g.goal && <div className="pc-goal"><span className="pc-tag">Skill</span>{g.goal}</div>}

                  {mode === "car" ? (
                    <div className="pc-saybox"><div className="pc-saylbl">On the road — just say:</div><div className="pc-say">{week[t.k].car}</div></div>
                  ) : (
                    <>
                      {g.setup && <div className="pc-setup"><span className="pc-tag">Set it up</span>{g.setup}</div>}

                      <div className="pc-dial">
                        <div className="pc-dial-lbl">Too easy? Make it harder ↑</div>
                        <div className="pc-seg3">
                          {[1, 2, 3].map((lv) => (
                            <button key={lv} className={level === lv ? "on" : ""} onClick={() => changeLevel(lv)}>
                              <b>L{lv}</b><span>{LEVEL_LABELS[lv - 1]}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="pc-saybox">
                        <div className="pc-saylbl">Say this:</div>
                        <div className="pc-say">{promptText}</div>
                        {isMath && gen && gen.answer !== undefined && <div className="pc-ans">Answer: <b>{gen.answer}</b></div>}
                        {isMath && gen && gen.tip && <div className="pc-tip">💡 {gen.tip}</div>}
                        {isMath && <button className="pc-reroll" onClick={reroll}>🎲 New numbers</button>}
                      </div>

                      <button className={"pc-funbtn" + (funOn ? " on" : "")} onClick={() => setFunOn(!funOn)}>
                        ✨ {funOn ? "Hide the fun twist" : "Bored? Make it more fun"}
                      </button>
                      {funOn && g.fun && <div className="pc-fun">{g.fun}</div>}

                      {g.look && <div className="pc-look"><span className="pc-tag look">Look for</span>{g.look}</div>}
                    </>
                  )}

                  <button className={"pc-mark" + (isDone ? " undo" : "")} onClick={() => setQuestDone(week.n, t.k, !isDone)}>
                    {isDone ? "↩ Mark not done" : "✓ Mark done for " + child}
                  </button>
                </div>
              )}
            </div>
          );
        })}

        <div className="pc-foot">Coach Mode reads the same progress as {child}'s app — check something off here and it shows there too. 💎</div>
      </div>
    </div>
  );
}

/* ===================== SCOPED STYLES ===================== */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Nunito:wght@0,400;0,600;0,700;0,800&display=swap');
.pc-root{
  --pc-bg:#FBF6EC; --pc-ink:#2f2a22; --pc-soft:#7a6f5e; --pc-line:#e3d8c2;
  --pc-gold:#c98a1a; --pc-teal:#1f8a8a;
  --b:#E8552B; --b-t:#FCE3D9; --m:#1F6FB2; --m-t:#DCEBF7; --c:#2E8B57; --c-t:#DCEFE4; --r:#B23A86; --r-t:#F7DCEC;
  font-family:'Nunito',system-ui,sans-serif; color:var(--pc-ink); min-height:100%;
  background:var(--pc-bg); -webkit-font-smoothing:antialiased;
}
.pc-root *{box-sizing:border-box; margin:0; padding:0; -webkit-tap-highlight-color:transparent;}
.pc-wrap{max-width:520px; margin:0 auto; padding:20px 16px 48px;}

.pc-brand{display:flex; align-items:center; gap:8px; font-size:22px;}
.pc-bname{font-family:'Fredoka',sans-serif; font-weight:600; font-size:14px; color:var(--pc-soft);}
.pc-title{font-family:'Fredoka',sans-serif; font-weight:700; font-size:31px; margin-top:5px; line-height:1;}
.pc-sub{font-size:14.5px; color:var(--pc-soft); font-weight:600; margin-top:5px;}

.pc-status{display:flex; align-items:center; gap:10px; justify-content:space-between; background:#fff; border:2px solid var(--pc-ink); border-radius:14px; padding:11px 14px; margin:16px 0 0; box-shadow:0 3px 0 var(--pc-ink); flex-wrap:wrap;}
.pc-status-line{font-size:14.5px;}
.pc-mode{display:flex; gap:5px; background:var(--pc-bg); border-radius:11px; padding:3px;}
.pc-mode button{border:none; background:transparent; font-family:'Fredoka',sans-serif; font-weight:600; font-size:13px; padding:6px 11px; border-radius:8px; cursor:pointer; color:var(--pc-soft);}
.pc-mode button.on{background:var(--pc-ink); color:#fff;}
.pc-mode button.on.road{background:var(--pc-teal);}

.pc-banner{background:var(--pc-teal); color:#fff; border-radius:12px; padding:11px 14px; font-size:13.5px; font-weight:600; margin-top:12px; line-height:1.45;}
.pc-howto{font-size:13px; color:var(--pc-soft); font-weight:600; margin:14px 2px 12px; line-height:1.5;}
.pc-howto b{color:var(--pc-ink);}

.pc-weeks{display:flex; gap:7px; margin:6px 0 14px;}
.pc-wbtn{flex:1; aspect-ratio:1; border:2px solid var(--pc-ink); background:#fff; border-radius:11px; font-family:'Fredoka',sans-serif; font-weight:700; font-size:16px; cursor:pointer; color:var(--pc-ink); transition:.12s;}
.pc-wbtn.done{background:#f4e7c6;}
.pc-wbtn.on{background:var(--pc-ink); color:#fff;}

.pc-weekhead{display:flex; align-items:baseline; justify-content:space-between; margin:4px 2px 12px;}
.pc-wname{font-family:'Fredoka',sans-serif; font-weight:700; font-size:19px;}
.pc-wprog{font-size:12.5px; font-weight:700; color:var(--pc-soft);}

.pc-quest{border:2.5px solid var(--pc-ink); border-radius:16px; margin-bottom:12px; overflow:hidden; box-shadow:0 3px 0 var(--pc-ink); background:#fff;}
.pc-quest.b{background:var(--b-t);} .pc-quest.m{background:var(--m-t);} .pc-quest.c{background:var(--c-t);} .pc-quest.r{background:var(--r-t);}
.pc-quest.is-done{filter:saturate(.6);}
.pc-qhead{width:100%; display:flex; align-items:center; gap:11px; padding:13px 15px; background:transparent; border:none; cursor:pointer; font-family:inherit; text-align:left;}
.pc-qemoji{font-size:22px; flex:none;}
.pc-qmid{display:flex; flex-direction:column; flex:1; min-width:0;}
.pc-qlbl{font-family:'Fredoka',sans-serif; font-weight:600; font-size:12px; letter-spacing:.05em; text-transform:uppercase;}
.pc-quest.b .pc-qlbl{color:var(--b);} .pc-quest.m .pc-qlbl{color:var(--m);} .pc-quest.c .pc-qlbl{color:var(--c);} .pc-quest.r .pc-qlbl{color:var(--r);}
.pc-tick{color:var(--pc-gold);}
.pc-qtitle{font-family:'Fredoka',sans-serif; font-weight:700; font-size:17px; color:var(--pc-ink); line-height:1.1; margin-top:1px;}
.pc-caret{font-size:16px; color:var(--pc-soft); flex:none;}

.pc-detail{background:#fff; border-top:2px solid var(--pc-line); padding:15px;}
.pc-tag{display:inline-block; font-family:'Fredoka',sans-serif; font-weight:600; font-size:10px; letter-spacing:.07em; text-transform:uppercase; color:#fff; background:var(--pc-soft); border-radius:6px; padding:2px 7px; margin-right:8px; vertical-align:1px;}
.pc-tag.look{background:var(--c);}
.pc-goal{font-size:14px; font-weight:600; line-height:1.5; margin-bottom:12px;}
.pc-setup{font-size:14.5px; line-height:1.55; margin-bottom:14px;}

.pc-dial{margin-bottom:12px;}
.pc-dial-lbl{font-size:12px; font-weight:700; color:var(--pc-soft); margin-bottom:6px;}
.pc-seg3{display:flex; gap:6px;}
.pc-seg3 button{flex:1; border:2px solid var(--pc-ink); background:#fff; border-radius:11px; padding:8px 4px; cursor:pointer; font-family:inherit; display:flex; flex-direction:column; align-items:center; gap:1px; color:var(--pc-ink); transition:.12s;}
.pc-seg3 button b{font-family:'Fredoka',sans-serif; font-size:15px;}
.pc-seg3 button span{font-size:10.5px; font-weight:700; color:var(--pc-soft);}
.pc-seg3 button.on{background:var(--pc-ink); color:#fff;}
.pc-seg3 button.on span{color:#e7d9bd;}

.pc-saybox{background:#fffdf6; border:2.5px dashed var(--pc-ink); border-radius:14px; padding:13px 15px; margin-bottom:12px;}
.pc-saylbl{font-family:'Fredoka',sans-serif; font-weight:600; font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--pc-soft); margin-bottom:5px;}
.pc-say{font-size:18px; font-weight:800; line-height:1.4; color:var(--pc-ink);}
.pc-ans{margin-top:8px; font-size:14px; font-weight:700; color:var(--m);}
.pc-tip{margin-top:8px; font-size:13px; font-weight:600; color:var(--pc-soft); line-height:1.45;}
.pc-reroll{margin-top:11px; border:2px solid var(--pc-ink); background:#fff; border-radius:10px; font-family:'Fredoka',sans-serif; font-weight:600; font-size:14px; padding:9px 14px; cursor:pointer; box-shadow:0 2px 0 var(--pc-ink);}
.pc-reroll:active{transform:translateY(2px); box-shadow:none;}

.pc-funbtn{width:100%; border:2px solid var(--pc-gold); color:var(--pc-gold); background:#fff; border-radius:11px; font-family:'Fredoka',sans-serif; font-weight:600; font-size:14.5px; padding:10px; cursor:pointer; margin-bottom:10px;}
.pc-funbtn.on{background:var(--pc-gold); color:#fff;}
.pc-fun{background:#fdf3df; border-radius:11px; padding:11px 14px; font-size:14px; font-weight:600; line-height:1.5; margin-bottom:12px;}

.pc-look{font-size:13.5px; line-height:1.5; color:var(--pc-ink); background:var(--c-t); border-radius:11px; padding:10px 13px; margin-bottom:14px;}
.pc-mark{width:100%; border:2.5px solid var(--pc-ink); background:var(--pc-ink); color:#fff; border-radius:12px; font-family:'Fredoka',sans-serif; font-weight:600; font-size:15px; padding:11px; cursor:pointer; box-shadow:0 3px 0 var(--pc-gold);}
.pc-mark:active{transform:translateY(2px); box-shadow:0 1px 0 var(--pc-gold);}
.pc-mark.undo{background:#fff; color:var(--pc-soft); box-shadow:0 3px 0 var(--pc-line);}

.pc-foot{font-size:12.5px; color:var(--pc-soft); font-weight:600; text-align:center; margin-top:18px; line-height:1.5;}
`;
