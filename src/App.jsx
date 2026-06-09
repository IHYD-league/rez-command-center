import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Star, Check, X, Clock, Camera, BookOpen, Drum, Trophy, Gift, Calendar as CalIcon,
  ClipboardList, Users, Home, Sparkles, Sun, GraduationCap, Plus, ChevronLeft,
  Image as ImageIcon, Phone, Heart, AlertCircle, RotateCcw, Music, Award, Target, Flag, Crown, Palette, Church, Flame, Archive, Pencil, MapPin, Medal, Lock, Share2, Search, LogOut, Map, Settings, TrendingUp, Download, Play
} from "lucide-react";
import KidGameHome from "./KidGameHome.jsx";
import SummerQuest from "./SummerQuest.jsx";
import PhotoGallery from "./PhotoGallery.jsx";
import Insights from "./Insights.jsx";
import DataExport from "./DataExport.jsx";
import MilestoneSlideshow from "./MilestoneSlideshow.jsx";
import ParentCompanion from "./summerQuest/ParentCompanion.jsx";
import { useSummerQuestProgress } from "./summerQuest/useSummerQuestProgress.js";
import SongLogger from "./SongLogger.jsx";
import BoardGame, { BOARD_THEMES, DEFAULT_BOARD_THEME } from "./BoardGame.jsx";
import CustomizationHub, { FONT_SCALE_PCT, THEMES } from "./CustomizationHub.jsx";
import { uploadFamilyPhoto, useSignedUrl } from "./lib/storage.js";
import { supabase } from "./lib/supabase.js";
import { toApp } from "./data/transform.js";
import { juice } from "./lib/juice.js";
import { starBurst } from "./lib/starBurst.js";
import StarBurstLayer from "./StarBurstLayer.jsx";
import { levelUp } from "./lib/levelUp.js";
import LevelUpLayer from "./LevelUpLayer.jsx";
import OnboardingOverlay from "./OnboardingOverlay.jsx";
import { useBottomSheet } from "./lib/sheet.js";

/* =====================================================================
   REZNOR COMMAND CENTER — MVP PROTOTYPE
   Standalone family app prototype. In-memory state only.
   TODO(real-build): replace useState store with backend + real auth
   TODO(real-build): wire uploads to cloud storage (currently in-session object URLs)
   TODO(real-build): calendar ICS / Google import, book-cover scanner, school standards
   ===================================================================== */

// ---------- SEED: USERS ----------
// permissions: { approveSimple, approveAll, viewReports }
// accessType: 'permanent' | 'temporary'  ·  accessExpires: 'YYYY-MM-DD' | null
const SEED_USERS = [
  { id: "u_mike", name: "Mike Lynch", role: "parent", relationship: "Dad", color: "#2563eb", emoji: "👨", email: "lyncho14@gmail.com", active: true, accessType: "permanent", accessExpires: null, permissions: { approveSimple: true, approveAll: true, viewReports: true } },
  { id: "u_krissie", name: "Krissie Lynch", role: "parent", relationship: "Mom", color: "#db2777", emoji: "👩", email: "krissielynch@gmail.com", active: true, accessType: "permanent", accessExpires: null, permissions: { approveSimple: true, approveAll: true, viewReports: true } },
  { id: "u_reznor", name: "Reznor", role: "kid", relationship: "Reznor", color: "#f59e0b", emoji: "🚀", active: true, accessType: "permanent", accessExpires: null, permissions: {} },
  { id: "u_evie", name: "Evie", role: "grandparent", relationship: "Grandma", color: "#7c3aed", emoji: "👵", active: true, accessType: "permanent", accessExpires: null, permissions: { approveSimple: true, approveAll: false, viewReports: true } },
  { id: "u_sara", name: "Sara", role: "helper", relationship: "Aunt", color: "#0d9488", emoji: "🧡", email: "sara.a.lanave@gmail.com", active: true, accessType: "permanent", accessExpires: null, permissions: { approveSimple: false, approveAll: false, viewReports: false } },
  { id: "u_guest", name: "Example Babysitter", role: "guest", relationship: "Guest sitter", color: "#64748b", emoji: "🧩", active: true, accessType: "temporary", accessExpires: "2026-06-13", permissions: { approveSimple: false, approveAll: false, viewReports: false } },
];

const CHILD = {
  id: "c_reznor", name: "Reznor", grade: "1st (reading ahead)", school: "—",
  starBankBase: 60, // carried-over stars before today; + today's drums (10) = bank of 70
  nextReward: "Movie Night", nextRewardCost: 200,
  bigReward: "Universal Studios", bigRewardCost: 500,
};

const CONTACTS = [
  { label: "Dad (Mike)", value: "Call / text Mike" },
  { label: "Mom (Krissie)", value: "Call / text Krissie" },
  { label: "Emergency", value: "911" },
  { label: "Pediatrician", value: "TODO: add number" },
];

const CARE_NOTES = [
  "Allergies: TODO add",
  "Drums can be split into two short sessions if he's tired.",
  "Screen time only counts toward Duolingo / Melodics if it's the actual app.",
  "Spanish exposure counts — music, shows, or talking all help.",
];

// ---------- SEED: TASKS ----------
// proofType: 'photo' | 'reading' | 'drums' | 'spanish' | null
const SEED_TASKS = [
  { id: "t_eng", title: "English Reading", category: "Learning", activityType: "English reading", required: true, starValue: 5, proofRequired: true, proofType: "reading", approvalRequired: true, mode: "both", minutes: 20 },
  { id: "t_spa_read", title: "Spanish Reading", category: "Learning", activityType: "Spanish reading", required: true, starValue: 5, proofRequired: true, proofType: "reading", approvalRequired: true, mode: "both", minutes: 15 },
  { id: "t_duo", title: "Duolingo", category: "Learning", activityType: "Duolingo", required: true, starValue: 5, proofRequired: false, proofType: null, approvalRequired: true, mode: "both", minutes: 10 },
  { id: "t_spa_hour", title: "Spanish Power Hour", category: "Learning", activityType: "Spanish practice", required: false, starValue: 10, bonusStarValue: 5, proofRequired: false, proofType: "spanish", approvalRequired: true, mode: "both", minutes: 60 },
  { id: "t_write", title: "Writing Practice", category: "Learning", activityType: "Writing", required: true, starValue: 5, proofRequired: true, proofType: "photo", approvalRequired: true, mode: "both", minutes: 10 },
  { id: "t_math", title: "Math Practice", category: "Learning", activityType: "Math", required: true, starValue: 5, proofRequired: false, proofType: null, approvalRequired: true, mode: "both", minutes: 15 },
  { id: "t_drums", title: "Drums", category: "Music", activityType: "Drums", required: true, starValue: 10, bonusStarValue: 10, proofRequired: true, proofType: "drums", approvalRequired: true, mode: "both", minutes: 60, subtasks: [{ id: "melodics", label: "Melodics" }, { id: "drumeo", label: "Drumeo" }, { id: "drumscribe", label: "Drumscribe" }] },
  { id: "t_art", title: "Art / Drawing", category: "Creative", activityType: "Art", required: false, starValue: 5, proofRequired: true, proofType: "photo", approvalRequired: true, mode: "both", minutes: 20 },
  { id: "t_move", title: "Movement", category: "Activity", activityType: "Movement", required: true, starValue: 5, proofRequired: false, proofType: null, approvalRequired: true, mode: "both", minutes: 30 },
  { id: "t_swim", title: "Swim Class", category: "Activity", activityType: "Swim", required: false, starValue: 10, proofRequired: false, proofType: null, approvalRequired: true, mode: "both", minutes: 45, days: ["Tuesday", "Thursday"] },
  { id: "t_tkd", title: "Taekwondo", category: "Activity", activityType: "Taekwondo", required: false, starValue: 10, proofRequired: false, proofType: null, approvalRequired: true, mode: "school", minutes: 60 },
  { id: "t_hip", title: "Hip Hop Dance", category: "Activity", activityType: "Hip Hop Dance", required: false, starValue: 10, proofRequired: false, proofType: null, approvalRequired: true, mode: "both", minutes: 60 },
  // Chores require parent/helper approval — same as every other activity.
  // The kid never self-approves (also enforced structurally by the
  // !activeIsParent gate in submitTask, but kept consistent on the seed
  // so a fresh family install gets the right policy).
  { id: "t_bed", title: "Make Bed", category: "Chores", activityType: "Chores", required: true, starValue: 3, proofRequired: false, proofType: null, approvalRequired: true, mode: "both", minutes: 5 },
  { id: "t_toys", title: "Pick Up Toys", category: "Chores", activityType: "Chores", required: true, starValue: 3, proofRequired: false, proofType: null, approvalRequired: true, mode: "both", minutes: 10 },
  { id: "t_dishes", title: "Help With Dishes", category: "Chores", activityType: "Chores", required: false, starValue: 3, proofRequired: false, proofType: null, approvalRequired: true, mode: "both", minutes: 10 },
  { id: "t_field", title: "Field Trip Journal", category: "Learning", activityType: "Field trips", required: false, starValue: 10, proofRequired: true, proofType: "photo", approvalRequired: true, mode: "summer", minutes: 30, active: false },
  { id: "t_church", title: "Church", category: "Soul", activityType: "Church", activityId: "a_church", required: false, starValue: 10, bonusStarValue: 10, proofRequired: false, proofType: null, approvalRequired: true, mode: "both", minutes: 90, days: ["Sunday"] },
];

// ---------- SEED: REWARDS ----------
const SEED_REWARDS = [
  { id: "r_story", title: "Extra Bedtime Story", starCost: 20, category: "Everyday", active: true },
  { id: "r_movie_pick", title: "Pick Family Movie", starCost: 40, category: "Everyday", active: true },
  { id: "r_dinner", title: "Choose Dinner", starCost: 50, category: "Everyday", active: true },
  { id: "r_toy", title: "Small Toy", starCost: 120, category: "Treat", active: true },
  { id: "r_movienight", title: "Movie Night", starCost: 200, category: "Treat", active: true },
  { id: "r_drumvid", title: "Record a Reztron X Drum Video", starCost: 150, category: "Creative", active: true },
  { id: "r_shortfilm", title: "Make a Short Movie", starCost: 180, category: "Creative", active: true },
  { id: "r_kidsempire", title: "Kids Empire", starCost: 250, category: "Big", active: true },
  { id: "r_sixflags", title: "Six Flags", starCost: 400, category: "Big", active: true },
  { id: "r_universal", title: "Universal Studios", starCost: 500, category: "Big", active: true },
  { id: "r_disney", title: "Disneyland", starCost: 600, category: "Big", active: true },
];

// ---------- SEED: COMPLETIONS ----------
// Real starting state: today, drums done (all 3 parts), approved.
const SEED_COMPLETIONS = [
  { id: "cmp_drums_20260606", taskId: "t_drums", status: "approved", awardedStars: 10, pendingStars: 0, completedBy: "u_reznor", approvedBy: "u_mike", notes: "1hr+ practice — all 3 parts done", proof: [], extra: { subsDone: ["melodics", "drumeo", "drumscribe"] }, completionDate: "2026-06-06" },
];

// ---------- SEED: CALENDAR ----------
const SEED_EVENTS = [
  { id: "ev1", title: "Last Day of School 🎒", date: "2026-06-11", category: "School", notes: "Summer Mode unlocks after today." },
  { id: "ev2", title: "Swim", date: "2026-06-09", category: "Activity", notes: "5:00–6:00 PM · bring goggles" },
  { id: "ev3", title: "Taekwondo", date: "2026-06-10", category: "Activity", notes: "7:00–7:45 PM" },
  { id: "ev4", title: "Field Trip: Aquarium", date: "2026-06-18", category: "Field Trip", notes: "Spanish words: pez, agua, tiburón" },
  { id: "ev5", title: "School starts 🎒", date: "2026-09-01", category: "School", notes: "Summer Mode ends ~Sept 1" },
];

// Reznor's recurring weekly activities (pulled from his summer schedule)
// Fixed weekly schedule is derived from the activities list (see SEED_ACTIVITIES schedules).
// Taekwondo is available any day EXCEPT Sunday, at different times. Aim for ~2/week.
const TKD_SLOTS = [
  { day: "Monday", time: "7:00–7:45 PM" },
  { day: "Tuesday", time: "" },
  { day: "Wednesday", time: "7:00–7:45 PM" },
  { day: "Thursday", time: "" },
  { day: "Friday", time: "7:00–7:45 PM" },
  { day: "Saturday", time: "12:00–12:45 PM" },
];
const TKD_TARGET = 2;

// ---------- SEED: HANDOFF NOTES ----------
const SEED_HANDOFF = [
  { id: "h1", authorId: "u_krissie", note: "Spanish reading + Duolingo are done. Drums still need 30 more min — split into two short sessions, he was tired after swim.", pinned: true, time: "9:40 AM" },
  { id: "h2", authorId: "u_sara", note: "Bed made, breakfast done. Heading to park for movement now.", pinned: false, time: "8:15 AM" },
];

const STATUS_META = {
  not_started: { label: "Not started", color: "bg-slate-100 text-slate-500" },
  pending: { label: "Pending approval", color: "bg-amber-100 text-amber-700" },
  approved: { label: "Approved", color: "bg-emerald-100 text-emerald-700" },
  needs_fix: { label: "Needs fix", color: "bg-rose-100 text-rose-700" },
  skipped: { label: "Skipped", color: "bg-slate-100 text-slate-400" },
};

// Real device date. Module-level constants — a tab kept open past local
// midnight will display yesterday's view until reload (acceptable for v1;
// fix with a midnight rollover effect later if needed).
const isoLocal = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const today = new Date();
const WEEKDAY = today.toLocaleDateString("en-US", { weekday: "long" });
const TODAY_ISO = isoLocal(today);
const YESTERDAY_ISO = isoLocal(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1));
const fmtDate = (d) => d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
const fmtShort = (d) => d ? new Date(d + "T12:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";
const fmtDateObj = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);

// Capture device location for helper photo check-ins (parent protection).
// Falls back to an approximate location if the browser blocks geolocation (e.g. sandboxed preview).
function captureLocation() {
  const fallback = { lat: 34.1478, lng: -118.1445, label: "Pasadena, CA (approx)", approx: true };
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(fallback);
    const timer = setTimeout(() => resolve(fallback), 4000);
    navigator.geolocation.getCurrentPosition(
      (pos) => { clearTimeout(timer); resolve({ lat: +pos.coords.latitude.toFixed(5), lng: +pos.coords.longitude.toFixed(5), label: "Live location", approx: false }); },
      () => { clearTimeout(timer); resolve(fallback); },
      { enableHighAccuracy: true, timeout: 3500 }
    );
  });
}

// ---- COLOR CHANNEL 1: domain (what KIND of activity) ----
const DOMAIN = {
  english:   { label: "English",  color: "#2563eb", tint: "#dbeafe" },
  spanish:   { label: "Spanish",  color: "#e11d48", tint: "#ffe4e6" },
  academics: { label: "Learning", color: "#ea580c", tint: "#ffedd5" },
  music:     { label: "Drums",    color: "#7c3aed", tint: "#ede9fe" },
  movement:  { label: "Move",     color: "#059669", tint: "#d1fae5" },
  creative:  { label: "Create",   color: "#0891b2", tint: "#cffafe" },
  chores:    { label: "Chores",   color: "#64748b", tint: "#f1f5f9" },
};
const domainOf = (t) => {
  const a = t.activityType;
  if (a === "English reading") return "english";
  if (a === "Spanish reading" || a === "Spanish practice" || a === "Duolingo") return "spanish";
  if (a === "Writing" || a === "Math") return "academics";
  if (a === "Drums") return "music";
  if (["Swim", "Taekwondo", "Hip Hop Dance", "Movement"].includes(a)) return "movement";
  if (a === "Art" || a === "Field trips") return "creative";
  if (a === "Chores") return "chores";
  return "academics";
};

// ---- COLOR CHANNEL 2: PRIORITY (color now MEANS importance) ----
// Whole-card wash by level. Domain color stays as the left block + icon.
const PRIORITY = {
  must:   { label: "Non-negotiable", badge: "★ MUST DO", wash: "#fee2e2", text: "#b91c1c", dot: "#ef4444" },
  today:  { label: "Do today",       badge: "DO TODAY",  wash: "#fef3c7", text: "#b45309", dot: "#f59e0b" },
  normal: { label: "Normal",         badge: "",          wash: "#ffffff", text: "#475569", dot: "#cbd5e1" },
  extra:  { label: "Extra credit",   badge: "EXTRA",     wash: "#dcfce7", text: "#15803d", dot: "#22c55e" },
};
const RANK = { must: 0, today: 1, normal: 2, extra: 3 };
const SCOPE_LABEL = { today: "today", week: "this week", month: "this month", always: "always" };
// Non-negotiables baseline: Drums + Spanish daily; English reading also a must in summer.
const isMustDo = (t, mode) =>
  t.activityType === "Drums" ||
  t.activityType === "Spanish reading" ||
  (mode === "summer" && t.activityType === "English reading");
// Effective level: a parent override wins; otherwise baseline must / required→normal / optional→extra.
function levelOf(task, mode, priorities) {
  const o = priorities?.[task.id];
  if (o?.level) return o.level;
  if (isMustDo(task, mode)) return "must";
  if (!task.required) return "extra";
  return "normal";
}
const sortByLevel = (list, mode, pr) =>
  [...list].sort((a, b) => RANK[levelOf(a, mode, pr)] - RANK[levelOf(b, mode, pr)] || b.starValue - a.starValue);

// Demo overrides: a reading test makes Reading a must today; recital prep is a must this month, etc.
const SEED_PRIORITIES = {
  t_math:  { level: "today", scope: "today", by: "u_krissie" },
  t_move:  { level: "today", scope: "week",  by: "u_mike" },
  t_art:   { level: "extra", scope: "always", by: "u_mike" },
};
// Parent/family notes attached to a task, shown in its detail view.
const SEED_TASK_NOTES = {
  t_drums: [{ text: "Working on double-bass control for the recital. Sounding great!", by: "u_mike", time: "Jun 4" }],
  t_eng:   [{ text: "Reading Dog Man solo now — finished one in a single car ride.", by: "u_krissie", time: "Jun 3" }],
};

// Reading log — starts empty; add books as he reads them.
const SEED_BOOKS = [];

// Uploaded accomplishments — report cards, certificates, belts, recital/game sheets.
const AWARD_TYPES = ["Report Card", "Certificate", "Belt/Rank", "Recital", "Game Sheet", "Award", "Photo"];
const AWARD_EMOJI = { "Report Card": "📑", Certificate: "🏅", "Belt/Rank": "🥋", Recital: "🎭", "Game Sheet": "📋", Award: "🏆", Photo: "🖼️" };
const SEED_AWARDS = [];

// Grade-level goals (high-level summary aligned to US Common Core). Verify against official
// CA / Common Core sources in the real build — this is a starting framework, not legal standards.
const STANDARDS = {
  1: { Reading: ["Decode regular one-syllable words; know common sight words", "Read & retell grade-1 stories with key details", "Read aloud with growing fluency"], Writing: ["Write simple opinion, info & narrative pieces", "Capital letters, periods, basic spelling"], Math: ["Add & subtract within 20", "Count & write to 120; tens & ones place value", "Measure/compare lengths; basic shapes & halves/quarters"], Language: ["Speak in complete sentences", "Ask & answer questions; expand vocabulary"] },
  2: { Reading: ["Read & comprehend grade 2–3 texts", "Strong fluency & expression", "Compare two versions of a story"], Writing: ["Multi-sentence paragraphs with detail", "Revise & edit with help"], Math: ["Add & subtract within 100 (to 1000 with models)", "Foundations of multiplication (arrays, equal groups)", "Money, time to 5 min, measurement, simple bar graphs"], Language: ["Use adjectives & adverbs", "Tell/retell with sequence words"] },
  3: { Reading: ["Read longer chapter books independently", "Find main idea & supporting details", "Determine meaning of new words from context"], Writing: ["Structured paragraphs & short essays with reasons", "Research a topic and report"], Math: ["Multiply & divide within 100", "Understand fractions as numbers", "Area & perimeter; rounding"], Language: ["Use rich vocabulary", "Explain thinking clearly aloud"] },
  4: { Reading: ["Analyze characters, theme & text structure", "Compare info across two texts", "Read grade 4–5 texts fluently"], Writing: ["Multi-paragraph essays with evidence", "Cite sources; organize ideas"], Math: ["Multi-digit multiplication & long division", "Equivalent fractions & operations", "Decimals to hundredths; angles & symmetry"], Language: ["Use precise & domain vocabulary", "Present findings to a group"] },
  5: { Reading: ["Quote text accurately to support inferences", "Synthesize info from multiple sources"], Writing: ["Opinion & research essays with strong evidence", "Edit for clarity & grammar"], Math: ["Add/subtract/multiply/divide fractions", "Operations with decimals", "Volume; coordinate plane; expressions"], Language: ["Debate ideas with reasons", "Adapt speech to audience"] },
  6: { Reading: ["Analyze how a theme develops; cite evidence", "Evaluate arguments & claims"], Writing: ["Argument essays with counterpoints", "Sustained research projects"], Math: ["Ratios, rates & percent", "Divide fractions; negative numbers", "Algebraic expressions & equations; statistics"], Language: ["Formal presentations", "Discuss & critique respectfully"] },
};
const WORLD_BEST = [
  { c: "Singapore 🇸🇬", n: "Consistently #1 in world math/science. Mastery approach, bar-model problem solving, depth over breadth." },
  { c: "Finland 🇫🇮", n: "Play-based early years, top literacy, very little homework, focus on curiosity & wellbeing." },
  { c: "Estonia 🇪🇪", n: "Top in Europe (PISA). Strong digital skills, equity, real problem solving." },
  { c: "Japan / South Korea 🇯🇵🇰🇷", n: "Rigorous math & science, persistence, lots of structured practice." },
  { c: "Canada 🇨🇦", n: "High & equitable outcomes, strong reading, multilingual classrooms." },
];
const WORLD_THEMES = "Borrow the best: mastery before moving on (Singapore), huge reading volume + play balance (Finland), bilingual fluency, and daily problem-solving over rote worksheets.";
// Reputable, stable sources to go deeper. (Verify current URLs in the real build.)
const GRADE_LINKS = [
  { title: "Common Core State Standards", desc: "corestandards.org — official US K-12 standards", url: "https://www.corestandards.org" },
  { title: "California Dept. of Education", desc: "cde.ca.gov — CA content standards & frameworks", url: "https://www.cde.ca.gov/be/st/ss/" },
  { title: "Khan Academy (by grade)", desc: "khanacademy.org — free practice K-12, math & reading", url: "https://www.khanacademy.org" },
  { title: "OECD PISA", desc: "oecd.org/pisa — international student rankings & reports", url: "https://www.oecd.org/pisa/" },
  { title: "Singapore MOE", desc: "moe.gov.sg — top-ranked math/science curriculum", url: "https://www.moe.gov.sg" },
  { title: "Finland EDUFI", desc: "oph.fi — Finnish national curriculum & approach", url: "https://www.oph.fi/en" },
];

// ---- BRAIN · BODY · SOUL pillars ----
const PILLARS = {
  brain: { label: "Brain", emoji: "🧠", color: "#6366f1" },
  body:  { label: "Body",  emoji: "💪", color: "#10b981" },
  soul:  { label: "Soul",  emoji: "✨", color: "#a855f7" },
};
// Master activities — each owns a color strip + status (active / break / seasonal).
const SEED_ACTIVITIES = [
  { id: "a_eng",   name: "English Reading",           short: "English", color: "#2563eb", pillar: "brain", status: "active",   note: "", schedule: [] },
  { id: "a_spa",   name: "Spanish",                   short: "Spanish", color: "#e11d48", pillar: "brain", status: "active",   note: "", schedule: [] },
  { id: "a_write", name: "Writing",                   short: "Writing", color: "#ea580c", pillar: "brain", status: "active",   note: "", schedule: [] },
  { id: "a_math",  name: "Math",                      short: "Math",    color: "#ca8a04", pillar: "brain", status: "active",   note: "", schedule: [] },
  { id: "a_drums", name: "Drums",                     short: "Drums",   color: "#7c3aed", pillar: "brain", status: "active",   note: "Daily practice + Tue lesson", address: "Burbank Music Academy, 4107 W Burbank Blvd, Burbank, CA 91505", schedule: [{ day: "Tuesday", time: "2:30–3:00 PM (lesson)" }] },
  { id: "a_art",   name: "Art",                       short: "Art",     color: "#c026d3", pillar: "brain", status: "active",   note: "", schedule: [] },
  { id: "a_field", name: "Field Trips",               short: "Trip",    color: "#0ea5e9", pillar: "brain", status: "seasonal", note: "Activate when there's actually a trip on the calendar", schedule: [] },
  { id: "a_chores",name: "Chores",                    short: "Chores",  color: "#64748b", pillar: "body",  status: "active",   note: "", schedule: [] },
  { id: "a_swim",  name: "Swim (Rose Bowl Aquatics)", short: "Swim",    color: "#0891b2", pillar: "body",  status: "active",   note: "Off in August — use Jim Herrick lessons instead", address: "Rose Bowl Aquatics, 360 N Arroyo Blvd, Pasadena, CA 91103", schedule: [{ day: "Tuesday", time: "5:00–6:00 PM" }, { day: "Thursday", time: "5:00–6:00 PM" }] },
  { id: "a_tkd",   name: "Taekwondo",                 short: "TKD",     color: "#dc2626", pillar: "body",  status: "active",   note: "Pick ~2 days/week (any day but Sunday)", address: "", schedule: [] },
  { id: "a_dance", name: "Hip Hop Dance",             short: "Dance",   color: "#db2777", pillar: "body",  status: "active",   note: "", address: "", schedule: [{ day: "Monday", time: "5:30–6:30 PM" }] },
  { id: "a_bball", name: "Basketball",                short: "Ball",    color: "#65a30d", pillar: "body",  status: "break",    note: "Taking a break for now", schedule: [{ day: "Saturday", time: "TBD" }] },
  { id: "a_move",  name: "Movement",                  short: "Move",    color: "#16a34a", pillar: "body",  status: "active",   note: "", schedule: [] },
  { id: "a_church",name: "Church",                    short: "Church",  color: "#9333ea", pillar: "soul",  status: "active",   note: "Sundays · bonus stars for drumming at church", schedule: [{ day: "Sunday", time: "morning" }] },
  { id: "a_soccer",name: "Soccer",                    short: "Soccer",  color: "#22c55e", pillar: "body",  status: "archived", note: "Played age 15 months–5 yrs · stopped to focus on drums & dance", schedule: [] },
  { id: "a_tennis",name: "Tennis",                    short: "Tennis",  color: "#84cc16", pillar: "body",  status: "archived", note: "Played age 15 months–5 yrs · stopped to focus on drums & dance", schedule: [] },
];
const TYPE_TO_ACT = {
  "English reading": "a_eng", "Spanish reading": "a_spa", "Spanish practice": "a_spa", "Duolingo": "a_spa",
  "Writing": "a_write", "Math": "a_math", "Drums": "a_drums", "Art": "a_art", "Field trips": "a_field",
  "Chores": "a_chores", "Swim": "a_swim", "Taekwondo": "a_tkd", "Hip Hop Dance": "a_dance",
  "Basketball": "a_bball", "Movement": "a_move", "Church": "a_church",
};
// Resolve a task's color/label from the (stateful) activities list, falling back to domain colors.
const actFor = (task, activities) => {
  const id = task.activityId || TYPE_TO_ACT[task.activityType];
  const a = activities?.find((x) => x.id === id);
  if (a) return { color: a.color, tint: a.color + "22", label: a.short || a.name, pillar: a.pillar };
  const dd = DOMAIN[domainOf(task)];
  return { color: dd.color, tint: dd.tint, label: dd.label, pillar: "brain" };
};
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// ---- ACHIEVEMENTS: game-style wins so he feels great every day ----
// "day" badges reset daily; "trophy" badges are lasting milestones.
const ACHIEVEMENTS = [
  { id: "first_today", kind: "day", emoji: "🎯", title: "On the Board", desc: "Did your first thing today", test: (c) => c.doneToday >= 1 },
  { id: "three_today", kind: "day", emoji: "🔥", title: "Triple Play", desc: "3 things done today", test: (c) => c.doneToday >= 3 },
  { id: "four_today", kind: "day", emoji: "⚡", title: "Big Day", desc: "4 things done today", test: (c) => c.doneToday >= 4 },
  { id: "all_today", kind: "day", emoji: "🏆", title: "Clean Sweep", desc: "Finished EVERYTHING today", test: (c) => c.allToday },
  { id: "drums3", kind: "day", emoji: "🥁", title: "Drum Trifecta", desc: "Melodics + Drumeo + Drumscribe", test: (c) => c.drumsDone },
  { id: "photo_today", kind: "day", emoji: "📸", title: "Caught on Camera", desc: "Shared a photo today", test: (c) => c.photoToday },
  { id: "stars100", kind: "trophy", emoji: "⭐", title: "Star Collector", desc: "100 stars banked", test: (c) => c.starBank >= 100, goal: 100, val: (c) => c.starBank },
  { id: "stars250", kind: "trophy", emoji: "🌟", title: "Star Hoarder", desc: "250 stars banked", test: (c) => c.starBank >= 250, goal: 250, val: (c) => c.starBank },
  { id: "stars500", kind: "trophy", emoji: "💫", title: "Star Master", desc: "500 stars banked", test: (c) => c.starBank >= 500, goal: 500, val: (c) => c.starBank },
  { id: "drum100", kind: "trophy", emoji: "🥁", title: "100 Days of Drums", desc: "100-day drum streak", test: (c) => (c.drumStreak) >= 100, goal: 100, val: (c) => c.drumStreak },
  { id: "drum300", kind: "trophy", emoji: "🦸", title: "300 Days of Drums", desc: "300-day drum streak", test: (c) => c.drumStreak >= 300, goal: 300, val: (c) => c.drumStreak },
  { id: "drum365", kind: "trophy", emoji: "🎂", title: "1 Year of Drums!", desc: "365 days — happy drum-iversary!", test: (c) => c.drumStreak >= 365, goal: 365, val: (c) => c.drumStreak },
  { id: "spanish90", kind: "trophy", emoji: "🇪🇸", title: "90 Days of Spanish", desc: "90-day Spanish streak", test: (c) => c.spaStreak >= 90, goal: 90, val: (c) => c.spaStreak },
  { id: "bilingual", kind: "trophy", emoji: "🌎", title: "Two Languages", desc: "Read a book in Spanish", test: (c) => c.spanishBook },
  { id: "books5", kind: "trophy", emoji: "📚", title: "Bookworm", desc: "Finished 5 books", test: (c) => c.booksFinished >= 5, goal: 5, val: (c) => c.booksFinished },
  { id: "books10", kind: "trophy", emoji: "📖", title: "Library Legend", desc: "Finished 10 books", test: (c) => c.booksFinished >= 10, goal: 10, val: (c) => c.booksFinished },
];
function buildAchCtx({ completions, todaysTasks, compByTask, starBank, streaks, books }) {
  const doneToday = todaysTasks.filter((t) => ["approved", "pending"].includes(compByTask[t.id]?.status)).length;
  const allToday = todaysTasks.length > 0 && todaysTasks.every((t) => ["approved", "pending"].includes(compByTask[t.id]?.status));
  const drumsDone = !!compByTask["t_drums"];
  const photoToday = Object.values(compByTask).some((c) => (c?.proof || []).some((p) => p.type === "photo"));
  const booksFinished = (books || []).filter((b) => b.status === "finished").length;
  const spanishBook = (books || []).some((b) => b.status === "finished" && b.lang === "Spanish");
  return { doneToday, allToday, drumsDone, photoToday, starBank, booksFinished, spanishBook, drumStreak: streaks?.a_drums?.current || 0, spaStreak: streaks?.a_spa?.current || 0 };
}

// ---- HERO XP + LEVELS (computed at display time — ARCHITECTURE §3) ----
// XP = stars × 10. Level curve is a simple triangular arithmetic:
//   xpForLevel(n) = 50 · n · (n - 1)
//   → L1 0  L2 100  L3 300  L4 600  L5 1000  L6 1500  L7 2100  L8 2800
// Reznor at ~80 ⭐ = 800 XP ≈ mid-Level-4. Feels honest about what he's
// already accomplished. Inverse: level = floor((50 + √(2500+200·xp))/100).
function xpForLevel(n) { return Math.max(0, 50 * n * (n - 1)); }
function levelFromXp(xp) {
  if (!xp || xp < 0) return 1;
  return Math.max(1, Math.floor((50 + Math.sqrt(2500 + 200 * xp)) / 100));
}
const LEVEL_TITLES = [
  "Spark", "Sprout", "Explorer", "Champion", "Hero",
  "Knight", "Legend", "Royalty", "Cosmic", "G.O.A.T.",
];
function levelTitle(n) { return LEVEL_TITLES[Math.min(Math.max(n, 1) - 1, LEVEL_TITLES.length - 1)]; }

// "Next badge" — derived from the canonical ACHIEVEMENTS list above.
// Picks the unearned-with-a-goal trophy that's closest to its threshold,
// so the kid sees the one he's most likely to clear next.
function nextBadgeFor(ctx) {
  const trophies = ACHIEVEMENTS.filter((a) => a.kind === "trophy" && a.goal);
  const unearned = trophies.filter((a) => !a.test(ctx));
  if (unearned.length === 0) return null;
  return unearned
    .map((a) => ({ a, p: a.val ? Math.min(1, a.val(ctx) / a.goal) : 0 }))
    .sort((a, b) => b.p - a.p)[0].a;
}

// ---- STREAKS: milestone badges (★ = big reward) ----
const STREAK_TIERS = [
  { d: 5,    emoji: "🌱", label: "Sprout",            big: false },
  { d: 10,   emoji: "⭐", label: "Star",               big: false },
  { d: 20,   emoji: "🔥", label: "On Fire",            big: false },
  { d: 50,   emoji: "🏅", label: "Champion",           big: true  },
  { d: 100,  emoji: "🏆", label: "Legend",             big: true  },
  { d: 150,  emoji: "💎", label: "Diamond",            big: true  },
  { d: 200,  emoji: "👑", label: "Royalty",            big: true  },
  { d: 250,  emoji: "🚀", label: "Rocket",             big: true  },
  { d: 300,  emoji: "🦸", label: "Superhero",          big: true  },
  { d: 365,  emoji: "🐐", label: "G.O.A.T · 1 yr",     big: true  },
  // Year 1 → 2 arc. Reznor's drum-streak roadmap: kicks off
  // with a baby gator at 1y+50, ramps up with fun 50-day milestones
  // every step, lands on a full gator at 2y.
  { d: 415,  emoji: "🐊", label: "Baby Gator · 1y+50", big: true  },
  { d: 465,  emoji: "⚡",  label: "Lightning",          big: false },
  { d: 515,  emoji: "🌟", label: "Shooting Star",      big: false },
  { d: 565,  emoji: "🐉", label: "Dragon",             big: true  },
  { d: 615,  emoji: "☄️", label: "Comet",              big: false },
  { d: 665,  emoji: "🦅", label: "Eagle",              big: false },
  { d: 715,  emoji: "⚔️", label: "Warrior",            big: false },
  { d: 730,  emoji: "🐊", label: "Big Gator · 2 yr",   big: true  },
  // Year 2 → 3 arc. Baby dino at 2y+50, fun 50-day specials, full
  // T-rex at 3y. If Reznor gets there (Mike's call: "I don't think
  // we will get there, but since he wants it lets let him see it.")
  // the badge ladder is here waiting.
  { d: 780,  emoji: "🦕", label: "Baby Dino · 2y+50",  big: true  },
  { d: 830,  emoji: "🌋", label: "Volcano",            big: false },
  { d: 880,  emoji: "⛈️", label: "Thunder",            big: false },
  { d: 930,  emoji: "💠", label: "Diamond Crown",      big: true  },
  { d: 980,  emoji: "🛸", label: "UFO",                big: false },
  { d: 1030, emoji: "🔱", label: "Trident",            big: false },
  { d: 1095, emoji: "🦖", label: "T-REX · 3 yr",       big: true  },
];
function streakInfo(current) {
  const earned = STREAK_TIERS.filter((t) => current >= t.d);
  const next = STREAK_TIERS.find((t) => current < t.d);
  const prev = earned.length ? earned[earned.length - 1].d : 0;
  const span = next ? next.d - prev : 1;
  const pct = next ? Math.min(100, ((current - prev) / span) * 100) : 100;
  return { earned, next, prev, pct };
}
// Real streaks. Drums: 310 days, 1hr+/day since Aug 1 2025. Today (2026-06-06)
// counts because the drum completion below is approved. Other streaks start empty.
const SEED_STREAKS = {
  a_drums: { current: 310, longest: 310, since: "2025-08-01", lastDate: "2026-06-06" },
};
// Activity attendance history starts empty; populated as Reznor goes to classes.
const SEED_HISTORY = {};

// ===================================================================
// Wrap a raw React setter so every state change also syncs to Supabase
// via the supplied `sync(key, value)` function. Falls back to a no-op
// when sync isn't provided (standalone / pre-DataProvider mode).
function makeSyncedSetter(rawSetter, key, sync) {
  return (next) => {
    rawSetter((prev) => {
      const v = typeof next === "function" ? next(prev) : next;
      if (sync) sync(key, v);
      return v;
    });
  };
}

export default function App({ initial, currentProfileId, sync, familyId, signOut, sessionEmail } = {}) {
  // Each persistent entity hydrates from `initial` (Supabase) when present,
  // otherwise falls back to the in-file seed.
  const [users, _setUsers] = useState(() => (initial?.profiles?.length ? initial.profiles : SEED_USERS));
  const [tasks, _setTasks] = useState(() => (initial?.tasks?.length ? initial.tasks : SEED_TASKS));
  const [rewards, _setRewards] = useState(() => (initial?.rewards?.length ? initial.rewards : SEED_REWARDS));
  const [completions, _setCompletions] = useState(() => initial?.completions ?? SEED_COMPLETIONS);
  const [redemptions, _setRedemptions] = useState(() => initial?.redemptions ?? []);
  const [gifted, _setGifted] = useState(() => initial?.gifted ?? []);
  const [streaks, _setStreaks] = useState(() => (initial?.streaks && Object.keys(initial.streaks).length ? initial.streaks : SEED_STREAKS));
  const [books, _setBooks] = useState(() => initial?.books ?? SEED_BOOKS);
  const [awards, _setAwards] = useState(() => initial?.awards ?? SEED_AWARDS);
  const [rewardRequests, _setRewardRequests] = useState(() => initial?.rewardRequests ?? []);
  const [songs, _setSongs] = useState(() => initial?.songs ?? []);
  const [songPlays, _setSongPlays] = useState(() => initial?.songPlays ?? []);
  // Self-registration queue. RLS hides non-parent rows; a kid / helper
  // sees an empty array. Refetched via reloadPending after approve/deny.
  const [pendingRegistrations, setPendingRegistrations] = useState(() => initial?.pendingRegistrations ?? []);
  // boardState is keyed by profile_id; e.g. { u_reznor: { lastPosition, treasureClaimedOn } }.
  // It's per-profile UI memory for the Daily Adventure Board (BOARD-GAME.md
  // §Data model). It never stores task / star / streak truth.
  const [boardState, _setBoardState] = useState(() => initial?.boardState ?? {});
  // userPrefs is per-profile accessibility / display settings, keyed by
  // profile_id. The Customization Hub writes here; the rest of the app
  // reads via the small `setPref` helper below.
  const [userPrefs, _setUserPrefs] = useState(() => initial?.userPrefs ?? {});

  // summerQuest is per-profile Summer Quest progress, keyed by profile_id.
  // Shape per slot: { mode: "home" | "car", done: { "1": {...}, ... "7": {...} } }
  // Owned by Reznor's profile in v1 — parents acting on his behalf write to
  // the same slot via the same RLS row. Star crossover into starBank is
  // intentionally NOT here (v2 scope per the integration brief §4.5).
  const [summerQuest, _setSummerQuest] = useState(() => initial?.summerQuest ?? {});
  const setSummerQuest = makeSyncedSetter(_setSummerQuest, "summerQuest", sync);

  // Persisted via the dedicated `events` + `handoff_notes` tables.
  const [events, _setEvents] = useState(() => initial?.events ?? SEED_EVENTS);
  const [handoff, _setHandoff] = useState(() => initial?.handoffNotes ?? SEED_HANDOFF);
  // Memory album — parent-added (non-proof) photos. Stored in the
  // dedicated `album_photos` table (see migration
  // 20260609084150_add_album_photos.sql). Read open to family,
  // writes server-side-gated to is_parent() at the policy level.
  const [albumPhotos, _setAlbumPhotos] = useState(() => initial?.albumPhotos ?? []);
  const setEvents = makeSyncedSetter(_setEvents, "events", sync);
  const setHandoff = makeSyncedSetter(_setHandoff, "handoffNotes", sync);
  const setAlbumPhotos = makeSyncedSetter(_setAlbumPhotos, "albumPhotos", sync);
  // family_settings — catch-all jsonb for family-level prefs. Every
  // sub-key below is read with `familySetting(key, fallback)` so a brand-
  // new install gets sensible defaults until the user actually changes
  // something. Setters write through to the same jsonb; one Supabase
  // round-trip per change. Future cousins (notification prefs, mode-
  // schedule, etc.) slot in here by adding one more familySetting call.
  const [familySettings, _setFamilySettings] = useState(() => initial?.familySettings ?? {});
  const setFamilySettings = makeSyncedSetter(_setFamilySettings, "familySettings", sync);
  const familySetting = (key, fallback) => {
    const has = familySettings && familySettings[key] !== undefined;
    const value = has ? familySettings[key] : fallback;
    const setter = (updater) => {
      setFamilySettings((prev) => {
        const present = prev && prev[key] !== undefined;
        const current = present ? prev[key] : fallback;
        const next = typeof updater === "function" ? updater(current) : updater;
        return { ...(prev || {}), [key]: next };
      });
    };
    return [value, setter];
  };
  const [mode, setMode] = familySetting("mode", "summer");
  const [priorities, setPriorities] = familySetting("priorities", SEED_PRIORITIES);
  const [tkdDays, setTkdDays] = familySetting("tkdDays", ["Monday"]);
  const [tkdTimes, setTkdTimes] = familySetting(
    "tkdTimes",
    Object.fromEntries(TKD_SLOTS.map((s) => [s.day, s.time]))
  );
  const [taskNotes, setTaskNotes] = familySetting("taskNotes", SEED_TASK_NOTES);
  const [subProgress, setSubProgress] = familySetting("subProgress", {});
  // Board theme — parent picks; one theme per family because the board
  // is a shared family canvas, not a per-profile view. Default is
  // "space_quest" (the original emoji-only theme). See BoardGame.jsx
  // BOARD_THEMES for the registry + docs/BOARD-THEMES.md for the spec.
  const [boardTheme, setBoardTheme] = familySetting("boardTheme", "space_quest");
  // Daily cap on the Adventure Board — null = uncapped (show all of
  // today's tasks). When set to a positive integer, the board picks the
  // first N tasks (required first, then extras) so Reznor sees a focused
  // mission for the day. Parent dials this up or down per-day.
  const [boardDailyCap, setBoardDailyCap] = familySetting("boardDailyCap", 9);

  const [currentUserId, setCurrentUserId] = useState(currentProfileId || null);
  const [tab, setTab] = useState("today");
  const [openTask, _setOpenTask] = useState(null);
  // Wrap the openTask setter so every site that opens a TaskSheet
  // (kid home, parent today, helper checklist, etc.) shares the same
  // open-juice without each callsite needing to know about it.
  // Fires only on the null → task transition (an actual open), not on
  // the task → null transition (a close).
  const setOpenTask = (t) => {
    if (t && !openTask) {
      juice.haptic("light");
      juice.sfx("swipe");
    }
    _setOpenTask(t);
  };
  const [activities, setActivities] = useState(SEED_ACTIVITIES);
  const [celebrate, setCelebrate] = useState(null);
  // Tap a DONE task anywhere → CompletionDetailSheet opens against
  // this completion id. Krissie's retro-photo flow + Reznor's "what
  // did I do today?" inspection use the same sheet.
  const [openCompletionId, setOpenCompletionId] = useState(null);
  const [submitPop, setSubmitPop] = useState(null);
  useEffect(() => {
    if (!submitPop) return;
    const t = setTimeout(() => setSubmitPop(null), 1400);
    return () => clearTimeout(t);
  }, [submitPop]);
  const [detailId, _setDetailId] = useState(null);
  const [statDetailId, _setStatDetailId] = useState(null);
  // Same wrap-on-open juice pattern as setOpenTask. Every site that
  // pops a stat-detail or task-detail sheet routes through these
  // wrapped setters, so the swipe-up sound + light haptic fire on
  // null → value transitions only (not on close, not on replace).
  const setDetailId = (id) => {
    if (id && !detailId) { juice.haptic("light"); juice.sfx("swipe"); }
    _setDetailId(id);
  };
  const setStatDetailId = (id) => {
    if (id && !statDetailId) { juice.haptic("light"); juice.sfx("swipe"); }
    _setStatDetailId(id);
  };
  const [progressActId, setProgressActId] = useState(null);

  // Persisted setters — each writes through to Supabase.
  const setUsers          = makeSyncedSetter(_setUsers,          "profiles",       sync);
  const setTasks          = makeSyncedSetter(_setTasks,          "tasks",          sync);
  const setRewards        = makeSyncedSetter(_setRewards,        "rewards",        sync);
  const setCompletions    = makeSyncedSetter(_setCompletions,    "completions",    sync);
  const setRedemptions    = makeSyncedSetter(_setRedemptions,    "redemptions",    sync);
  const setGifted         = makeSyncedSetter(_setGifted,         "gifted",         sync);
  const setStreaks        = makeSyncedSetter(_setStreaks,        "streaks",        sync);
  const setBooks          = makeSyncedSetter(_setBooks,          "books",          sync);
  const setAwards         = makeSyncedSetter(_setAwards,         "awards",         sync);
  const setRewardRequests = makeSyncedSetter(_setRewardRequests, "rewardRequests", sync);
  const setSongs          = makeSyncedSetter(_setSongs,          "songs",          sync);
  const setSongPlays      = makeSyncedSetter(_setSongPlays,      "songPlays",      sync);
  const setBoardState     = makeSyncedSetter(_setBoardState,     "boardState",     sync);
  const setUserPrefs      = makeSyncedSetter(_setUserPrefs,      "userPrefs",      sync);

  const user = users.find((u) => u.id === currentUserId);

  // ---- derived ----
  const todaysTasks = useMemo(
    () => tasks.filter((t) => (t.mode === "both" || t.mode === mode) && (!t.days || t.days.includes(WEEKDAY)) && t.active !== false),
    [tasks, mode]
  );
  // compByTask is "what's the status of each task TODAY". Older completions
  // (yesterday's drums, last week's writing) stay in the completions array
  // so Approvals tab + history reads work, but they do NOT count toward
  // today's done/pending/needs-fix state. Tasks done yesterday should show
  // as not-done again this morning.
  const compByTask = useMemo(() => {
    const m = {};
    completions.forEach((c) => {
      if ((c.completionDate || null) === TODAY_ISO) m[c.taskId] = c;
    });
    return m;
  }, [completions]);

  // Cumulative ledger (drives the star bank). All-time approved + gifted -
  // redeemed + the carried-over base = what's in the bank right now.
  const approvedAll = completions.filter((c) => c.status === "approved");
  const earnedAllTime = approvedAll.reduce((s, c) => s + (c.awardedStars || 0), 0);
  const redeemedTotal = redemptions.filter((r) => r.status === "approved").reduce((s, r) => s + r.cost, 0);
  const giftedTotal = gifted.reduce((s, g) => s + g.stars, 0);
  const starBank = CHILD.starBankBase + earnedAllTime + giftedTotal - redeemedTotal;
  // Today-only stats (what the labels actually say). Honest now.
  const earnedToday = approvedAll
    .filter((c) => c.completionDate === TODAY_ISO)
    .reduce((s, c) => s + (c.awardedStars || 0), 0);
  const pendingStars = completions
    .filter((c) => c.status === "pending" && c.completionDate === TODAY_ISO)
    .reduce((s, c) => s + (c.pendingStars || 0), 0);
  const availableToday = todaysTasks.reduce((s, t) => s + t.starValue, 0);

  // ---- actions ----
  const submitTask = (taskId, payload) => {
    const t = tasks.find((x) => x.id === taskId);
    // Identity model:
    //   currentProfileId — the auth-mapped profile. This is who's REALLY
    //                      signed in (Mike, Krissie, Sara, etc.).
    //   currentUserId    — the profile being "acted as" via the in-app
    //                      switcher; can be the kid even when Mike is the
    //                      one actually signed in.
    //
    // Branching on the ACTIVE profile (what the user is interacting with),
    // not the auth profile, mirrors what the screen looks like:
    //   - Parent on their own home (active = self): treat as
    //     parent-acts-on-behalf shortcut → auto-approve, stars + streak
    //     fire immediately. Audit: submittedBy = parent.
    //   - Parent (or anyone) switched into Reznor's profile: this IS the
    //     kid screen, so a tap is "Reznor submitting" → status pending,
    //     submittedBy = u_reznor, approvedBy = null. The completion shows
    //     up in the parent's Approvals tab; bumpStreak + stars happen
    //     when the parent decide()s approve.
    //   - Helper / grandparent on their own view: unchanged. Always
    //     pending; approval gate same as before.
    // completedBy is always the kid because stars/streaks/bank are
    // canonically the kid's, regardless of who tapped Submit.
    const activeProfile = users.find((u) => u.id === currentUserId);
    // Auth profile = the actual signed-in user. We honor THIS for the
    // auto-approve shortcut, not the acted-as profile. Otherwise a
    // stale-bundle Sara could pick Mike from a cached LoginScreen and
    // gain parent powers — even though the DB trigger would reject
    // the forged submitted_by, the local UX would lie until the round
    // trip failed. Reading the real auth role keeps the client honest
    // in lock-step with the server.
    const authProfile = users.find((u) => u.id === currentProfileId);
    const activeIsKid = activeProfile?.role === "kid";
    const activeIsParent = activeProfile?.role === "parent";
    const authIsParentOrAdmin = authProfile?.role === "parent" || !!authProfile?.isAdmin;
    const kid = users.find((u) => u.role === "kid");
    const kidId = kid?.id || currentUserId;
    const submittedBy = activeIsKid ? currentUserId : (currentProfileId || currentUserId);
    // Auto-approve ONLY when BOTH:
    //   (1) the acted-as profile IS a parent — so tapping while "on"
    //       Reznor's profile (kid view) always goes pending, even when
    //       Mike is signed in. Reznor doesn't have his own auth_user_id;
    //       he uses an adult's session, so a previous gate based purely
    //       on the auth role incorrectly auto-approved his chores.
    //   (2) the auth user IS a parent or admin — so Sara couldn't
    //       bypass via a stale-bundle pick of Mike's profile.
    // Both ANDed. Failing either condition → row goes pending.
    // Effect:
    //   - Reznor (auth = adult, acted-as = kid) → pending. Always.
    //   - Sara as Sara (helper) → pending.
    //   - Sara forging Mike (auth = helper) → pending.
    //   - Mike on Mike's profile / Mike acting as Krissie → quick-mark
    //     auto-approves as before (the legitimate parent-on-behalf
    //     shortcut from their OWN dashboard).
    //   - Krissie on Krissie's profile → same.
    // Late approval still awards the row's full pendingStars + bonus
    // via decide(); protect_completion_stars_trg guards approved →
    // approved transitions, never blocks pending → approved.
    const needsApproval = !(activeIsParent && authIsParentOrAdmin);
    setCompletions((prev) => {
      // Replace only TODAY's prior submission for this task — yesterday's row
      // (and earlier history) stays in the array so it persists and remains
      // visible in Approvals / reports / future analytics.
      const others = prev.filter((c) => !(c.taskId === taskId && (c.completionDate || null) === TODAY_ISO));
      return [...others, {
        id: "cmp_" + Date.now(),
        taskId,
        status: needsApproval ? "pending" : "approved",
        awardedStars: needsApproval ? 0 : t.starValue,
        pendingStars: needsApproval ? t.starValue : 0,
        completedBy: kidId,
        submittedBy,
        approvedBy: needsApproval ? null : submittedBy,
        notes: payload.notes || "",
        proof: payload.proof || [],
        extra: payload.extra || {},
        completionDate: TODAY_ISO,
      }];
    });
    setOpenTask(null);
    const aid = t.activityId || TYPE_TO_ACT[t.activityType];
    // Auto-approved tasks (e.g. make-bed, or anything submitted by an
    // active parent) bump the streak immediately. Pending tasks bump
    // later via decide().
    if (!needsApproval && aid) bumpStreak(aid);
    // Only celebrate when the streak actually bumped — showing a preview
    // "311 day streak" on a pending submission would lie.
    if (!needsApproval) {
      const s = streaks[aid];
      if (s) {
        const next = s.lastDate === TODAY_ISO ? s.current : (s.lastDate === YESTERDAY_ISO ? s.current + 1 : 1);
        const act = activities.find((a) => a.id === aid);
        setCelebrate({ name: act?.short || t.title, streak: next, record: next > s.longest, color: act?.color || "#f97316" });
      }
    }
    // Juice: pending submission = uplifting two-tone blip; auto-approved
    // submission = full approve fanfare (because stars actually land).
    if (needsApproval) juice.burst("medium", "submit");
    else {
      juice.burst("success", "approve");
      // Stars actually landed → fly them to the bank chip.
      starBurst.fly({ value: t.starValue });
    }
    // Kid-side reward: when REZNOR is the one tapping (active profile is
    // the kid), every submission gets a confetti+stars pop — pending or
    // auto-approved. Pending = "Sent for review", auto = "Stars!". The
    // parent-as-self path skips this so the parent doesn't get a kid
    // confetti pop on their own dashboard.
    if (activeIsKid) {
      const stars = t.starValue || 1;
      setSubmitPop({
        id: Date.now(),
        title: needsApproval ? "Sent for review!" : "Nice work!",
        sub: needsApproval
          ? `${stars} ⭐ pending Mom/Dad's check`
          : `+${stars} ⭐ banked!`,
      });
      // Visual star flight even on pending — gives the kid the satisfying
      // "I got something" feedback. The actual bank count won't change
      // until the parent approves; the flying stars represent the
      // submission, not the award.
      if (needsApproval) starBurst.fly({ value: stars });
    }
  };

  const addAward = (a) => setAwards((prev) => [a, ...prev]);
  const removeAward = (id) => setAwards((prev) => prev.filter((a) => a.id !== id));
  // Patch any field on an existing completion — used by the Completion
  // Detail sheet to retroactively add photos, edit notes, etc.
  // Krissie's ask: parents (and Reznor) need a way to drop a photo onto
  // a chore that was already submitted. updateCompletion routes through
  // setCompletions so the Supabase sync layer picks it up the same way
  // it does for submit/decide/undo.
  const updateCompletion = (completionId, patch) => {
    setCompletions((prev) => prev.map((c) => (c.id === completionId ? { ...c, ...patch } : c)));
  };
  // Append-only helper to add a single photo proof onto a completion.
  // Keeps existing proof entries (notes, prior photos) intact. Used by
  // the CompletionDetail sheet's "Add photo" button.
  const addCompletionPhoto = (completionId, photo) => {
    setCompletions((prev) => prev.map((c) => {
      if (c.id !== completionId) return c;
      const existing = Array.isArray(c.proof) ? c.proof : [];
      return { ...c, proof: [...existing, { type: "photo", ...photo }] };
    }));
  };
  const removeCompletionPhoto = (completionId, path) => {
    setCompletions((prev) => prev.map((c) => {
      if (c.id !== completionId) return c;
      const existing = Array.isArray(c.proof) ? c.proof : [];
      return { ...c, proof: existing.filter((p) => p.path !== path) };
    }));
  };
  const undoTask = (taskId) => {
    // "Unmark today" — only touch today's completion. Yesterday's row stays
    // in the array so history isn't destroyed.
    const c = completions.find((x) => x.taskId === taskId && (x.completionDate || null) === TODAY_ISO);
    setCompletions((prev) => prev.filter((x) => !(x.taskId === taskId && (x.completionDate || null) === TODAY_ISO)));
    setSubProgress((prev) => { const n = { ...prev }; delete n[taskId]; return n; });
    if (c && c.status === "approved") {
      const t = tasks.find((x) => x.id === taskId);
      const aid = t?.activityId || TYPE_TO_ACT[t?.activityType];
      if (aid) setStreaks((prev) => { const s = prev[aid]; if (s && s.lastDate === TODAY_ISO) return { ...prev, [aid]: { ...s, current: Math.max(0, s.current - 1), lastDate: YESTERDAY_ISO } }; return prev; });
    }
  };

  // decide() acts on ONE specific completion identified by its row id.
  // Older versions filtered by c.taskId — that mapped over every
  // completion in the array and silently zeroed prior approved rows
  // for recurring tasks (Drums on Mon zeroed Drums on Sun, etc.,
  // because c.pendingStars was already 0 on the already-approved row →
  // new awardedStars = 0 + bonus). Matching on c.id eliminates that
  // bug class entirely. Both call sites (parent home inline + the
  // Approvals tab) now pass the completion id.
  const decide = (completionId, decision, bonus = 0) => {
    setCompletions((prev) => prev.map((c) => {
      if (c.id !== completionId) return c;
      if (decision === "approve") return { ...c, status: "approved", awardedStars: c.pendingStars + bonus, pendingStars: 0, approvedBy: currentProfileId || currentUserId };
      if (decision === "needs_fix") return { ...c, status: "needs_fix", pendingStars: 0 };
      if (decision === "reject") return { ...c, status: "skipped", pendingStars: 0, awardedStars: 0 };
      return c;
    }));
    if (decision === "approve") {
      // Resolve the completion → its task → its activity for streak
      // bumps and star-burst fly amount. We look it up in the current
      // (pre-update) completions array since the setCompletions above
      // hasn't applied yet on this tick.
      const target = completions.find((c) => c.id === completionId);
      const tk = target ? tasks.find((x) => x.id === target.taskId) : null;
      const aid = tk?.activityId || TYPE_TO_ACT[tk?.activityType];
      if (aid) bumpStreak(aid); // only bumps if that activity is being tracked
      juice.burst("success", "approve");
      const flyValue = (target?.pendingStars || 0) + (bonus || 0);
      starBurst.fly({ value: flyValue || 1 });
    } else if (decision === "needs_fix") {
      juice.burst("warning", "nope");
    } else if (decision === "reject") {
      juice.burst("warning", "nope");
    }
  };

  const requestReward = (reward) => {
    setRedemptions((prev) => [...prev, { id: "rd_" + Date.now(), rewardId: reward.id, title: reward.title, cost: reward.starCost, status: "requested", requestedBy: currentUserId }]);
    juice.burst("medium", "treasure");
  };
  const decideReward = (rdId, status) => {
    setRedemptions((prev) => prev.map((r) => r.id === rdId ? { ...r, status } : r));
  };

  const addHandoff = (text) => {
    if (!text.trim()) return;
    setHandoff((prev) => [{ id: "h_" + Date.now(), authorId: currentUserId, note: text, pinned: false, time: "now" }, ...prev]);
  };
  const addEvent = (ev) => setEvents((prev) => [...prev, { ...ev, id: "ev_" + Date.now() }]);
  const addUser = (u) => setUsers((prev) => [...prev, { ...u, id: "u_" + Date.now() }]);
  const updateUser = (id, patch) => setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  const removeUser = (id) => setUsers((prev) => prev.filter((u) => u.id !== id));

  // Pull the latest pending-requests + profiles from Supabase. Called
  // after approve/deny so the queue and roster stay honest without a
  // full page reload.
  const reloadPending = async () => {
    if (!familyId) return;
    const [{ data: pr }, { data: ps }] = await Promise.all([
      supabase
        .from("pending_registrations")
        .select("auth_user_id, email, display_name, requested_at")
        .eq("family_id", familyId),
      supabase.from("profiles").select("*").eq("family_id", familyId),
    ]);
    setPendingRegistrations((pr || []).map((r) => ({
      authUserId: r.auth_user_id,
      email: r.email,
      displayName: r.display_name,
      requestedAt: r.requested_at,
    })));
    if (ps) _setUsers(ps.map(toApp.profile));
  };

  const approveRegistration = async ({ authUserId, name, role, relationship, accessType, accessExpires }) => {
    const { error } = await supabase.rpc("approve_registration", {
      p_auth_user_id: authUserId,
      p_name: name,
      p_role: role,
      p_relationship: relationship || null,
      p_access_type: accessType || "permanent",
      p_access_expires: accessExpires || null,
    });
    if (error) { alert("Approve failed: " + error.message); return; }
    await reloadPending();
  };

  const denyRegistration = async (authUserId) => {
    const { error } = await supabase.rpc("deny_registration", { p_auth_user_id: authUserId });
    if (error) { alert("Deny failed: " + error.message); return; }
    await reloadPending();
  };
  const setPriority = (taskId, level, scope) => setPriorities((prev) => ({ ...prev, [taskId]: { level, scope, by: currentUserId } }));
  const clearPriority = (taskId) => setPriorities((prev) => { const n = { ...prev }; delete n[taskId]; return n; });
  const giftStars = (label, n) => setGifted((prev) => [{ id: "g_" + Date.now(), label, stars: n, by: currentUserId, date: fmtDate(today) }, ...prev]);
  const toggleTkdDay = (day) => setTkdDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  const setTkdTime = (day, time) => setTkdTimes((prev) => ({ ...prev, [day]: time }));
  const addTask = (t) => setTasks((prev) => [...prev, t]);
  const updateTask = (id, patch) => setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const removeTask = (id) => setTasks((prev) => prev.filter((t) => t.id !== id));
  const addReward = (r) => setRewards((prev) => [...prev, r]);
  const updateReward = (id, patch) => setRewards((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const removeReward = (id) => setRewards((prev) => prev.filter((r) => r.id !== id));
  const addRewardRequest = (title, note) => { if (!title.trim()) return; setRewardRequests((prev) => [{ id: "wish_" + Date.now(), title: title.trim(), note: (note || "").trim(), status: "requested", by: currentUserId }, ...prev]); };
  const decideRewardRequest = (id, decision, cost) => {
    setRewardRequests((prev) => prev.map((w) => (w.id === id ? { ...w, status: decision, starCost: cost } : w)));
    if (decision === "approved") {
      const w = rewardRequests.find((x) => x.id === id);
      if (w) addReward({ id: "r_" + Date.now(), title: w.title, starCost: cost || 100, category: "Dream", active: true });
    }
  };
  const addTaskNote = (taskId, text) => { if (!text.trim()) return; setTaskNotes((prev) => ({ ...prev, [taskId]: [{ text: text.trim(), by: currentUserId, time: "now" }, ...(prev[taskId] || [])] })); };
  const addBook = (b) => setBooks((prev) => [b, ...prev]);
  const updateBook = (id, patch) => setBooks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const removeBook = (id) => setBooks((prev) => prev.filter((b) => b.id !== id));
  const toggleSub = (taskId, subId) => {
    const t = tasks.find((x) => x.id === taskId);
    if (!t?.subtasks) return;
    setSubProgress((prev) => {
      const cur = { ...(prev[taskId] || {}) };
      cur[subId] = !cur[subId];
      const next = { ...prev, [taskId]: cur };
      const allDone = t.subtasks.every((s) => cur[s.id]);
      if (allDone && !completions.some((c) => c.taskId === taskId)) {
        submitTask(taskId, { note: "All 3 parts: " + t.subtasks.map((s) => s.label).join(", ") });
      }
      return next;
    });
  };
  const addActivity = (a) => setActivities((prev) => [...prev, a]);
  const updateActivity = (id, patch) => setActivities((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  const setStreak = (id, patch) => setStreaks((prev) => ({ ...prev, [id]: { current: 0, longest: 0, since: "", lastDate: "", ...(prev[id] || {}), ...patch } }));
  const stopStreak = (id) => setStreaks((prev) => { const n = { ...prev }; delete n[id]; return n; });
  // Streak rules: increment by 1 ONLY if lastDate was yesterday (consecutive).
  // Already today → no double count. Missed at least one day → reset to 1,
  // keep longest unchanged, restart `since`. Never tracked → no-op (parents
  // start tracking explicitly via the activity editor).
  const bumpStreak = (id) => setStreaks((prev) => {
    const s = prev[id];
    if (!s) return prev;
    if (s.lastDate === TODAY_ISO) return prev;
    if (s.lastDate === YESTERDAY_ISO) {
      const current = (s.current || 0) + 1;
      return {
        ...prev,
        [id]: { ...s, current, longest: Math.max(s.longest || 0, current), lastDate: TODAY_ISO },
      };
    }
    return {
      ...prev,
      [id]: { ...s, current: 1, since: TODAY_ISO, lastDate: TODAY_ISO },
    };
  });

  // Songs — new tables, separate from drum stars/streak. Title+artist
  // uniqueness is enforced by the DB (lowercased index); the app de-dupes
  // pre-emptively so the user gets a clean "this song already exists"
  // experience instead of a Supabase 409.
  const addSong = ({ id, title, artist, difficulty }) => {
    const t = (title || "").trim();
    if (!t) return null;
    const a = (artist || "").trim();
    const existing = songs.find(
      (s) => (s.title || "").toLowerCase() === t.toLowerCase()
        && ((s.artist || "").toLowerCase() === a.toLowerCase())
    );
    if (existing) return existing.id;
    const newId = id || ("song_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6));
    setSongs((prev) => [...prev, { id: newId, title: t, artist: a || null, difficulty: difficulty || null }]);
    return newId;
  };
  const addSongPlay = (songId, notes) => {
    if (!songId) return;
    setSongPlays((prev) => [
      {
        id: "play_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
        songId,
        playedOn: TODAY_ISO,
        playedBy: currentUserId,
        notes: notes || "",
      },
      ...prev,
    ]);
  };
  const removeSong = (id) => {
    setSongs((prev) => prev.filter((s) => s.id !== id));
    setSongPlays((prev) => prev.filter((p) => p.songId !== id));
  };
  const removeSongPlay = (id) => setSongPlays((prev) => prev.filter((p) => p.id !== id));

  // BOARD-GAME.md §Data model — board_state is purely UI memory:
  // "where was the token last drawn for this profile?" / "did we already
  // fire the treasure pop today?". Never task / star / streak truth.
  const setBoardLastPosition = (profileId, position) => {
    if (!profileId) return;
    setBoardState((prev) => ({
      ...prev,
      [profileId]: { ...(prev[profileId] || {}), lastPosition: position },
    }));
  };
  const setTreasureClaimed = (profileId, dateIso) => {
    if (!profileId) return;
    setBoardState((prev) => ({
      ...prev,
      [profileId]: { ...(prev[profileId] || {}), treasureClaimedOn: dateIso || TODAY_ISO },
    }));
  };

  // CustomizationHub plumbing — one helper for any hub module to write a
  // single pref key on the active profile. The hub never reaches across
  // to other profiles; settings are strictly per-profile.
  const currentPrefs = (currentUserId && userPrefs[currentUserId]?.prefs) || {};
  const setPref = (key, value) => {
    if (!currentUserId) return;
    setUserPrefs((prev) => ({
      ...prev,
      [currentUserId]: {
        ...(prev[currentUserId] || {}),
        prefs: { ...((prev[currentUserId] || {}).prefs || {}), [key]: value },
      },
    }));
  };

  // Apply font-scale globally — set root font-size %, Tailwind's rem-based
  // text classes inherit it, every screen scales together.
  useEffect(() => {
    const scale = currentPrefs.fontScale || "regular";
    const pct = FONT_SCALE_PCT[scale] || 100;
    const prev = document.documentElement.style.fontSize;
    document.documentElement.style.fontSize = `${pct}%`;
    return () => {
      document.documentElement.style.fontSize = prev;
    };
  }, [currentPrefs.fontScale]);

  // Push juice prefs (sfx + haptics) to the module singleton whenever the
  // active profile's sound settings change. Defaults: both on. If a user
  // never opens the hub Sound module, they get the full juice experience.
  useEffect(() => {
    const s = currentPrefs.sound || {};
    juice.setEnabled({
      sfx: s.sfx !== false,
      haptic: s.haptic !== false,
    });
  }, [currentPrefs.sound]);

  // iOS Safari requires AudioContext.resume() inside a user gesture before
  // the first oscillator will sound. Listen once for any pointer/touch
  // anywhere in the document and unlock. juice.unlock() is idempotent.
  useEffect(() => {
    const unlock = () => juice.unlock();
    window.addEventListener("pointerdown", unlock, { passive: true });
    window.addEventListener("touchstart", unlock, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("touchstart", unlock);
    };
  }, []);

  // Level-up detector — fires the levelUp fanfare + heavy haptic + the
  // cinematic takeover overlay when the hero level crosses up. Derived
  // purely from starBank → no extra storage. The first render seeds the
  // ref with the current level so we don't fire on app load, only on
  // actual transitions during the session.
  const _seenLevelRef = React.useRef(null);
  useEffect(() => {
    const lvl = levelFromXp(starBank * 10);
    if (_seenLevelRef.current === null) {
      _seenLevelRef.current = lvl;
      return;
    }
    if (lvl > _seenLevelRef.current) {
      juice.burst("success", "levelUp");
      // Cinematic takeover — a moment, not just a sound. Title comes
      // from the canonical LEVEL_TITLES list so it always matches the
      // hero card's level chip.
      levelUp.show({
        level: lvl,
        prevLevel: _seenLevelRef.current,
        title: levelTitle(lvl),
      });
    }
    _seenLevelRef.current = lvl;
  }, [starBank]);

  const [hubOpen, setHubOpen] = useState(false);

  // Welcome overlay — re-fires on every app open + every profile switch.
  // Was previously gated by currentPrefs.onboarded (one-shot per profile);
  // user feedback was "I want the Hi Mike / Hi Reznor moment every time
  // I come back". Now it's pure in-session state: shows on mount, hides
  // when dismissed, resets to shown when currentUserId changes.
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  useEffect(() => {
    setWelcomeDismissed(false);
  }, [currentUserId]);

  // ---- login screen ----
  if (!user) {
    return <LoginScreen users={users} currentProfileId={currentProfileId} onPick={(id) => { setCurrentUserId(id); setTab("today"); }} onSignOut={signOut} sessionEmail={sessionEmail} />;
  }

  // KidGameHome data — built from existing state (no hook; runs after the
  // early-return above so `user` is guaranteed defined).
  const _drumCurrent = streaks?.a_drums?.current ?? 0;
  const _milestone = 365;
  const _questFromTask = (t) => {
    const c = compByTask[t.id];
    const subs = t.subtasks
      ? t.subtasks.map((s) => ({ id: s.id, label: s.label, done: !!c?.extra?.subsDone?.includes(s.id) }))
      : undefined;
    return { id: t.id, title: t.title, xp: (t.starValue || 0) * 10, done: !!c, subtasks: subs };
  };
  const _booksFinished = (books || []).filter((b) => b.status === "finished").length;
  const _songsToday = (songPlays || []).filter((p) => p.playedOn === TODAY_ISO).length;
  // Hero XP + level — derived, never stored. See xpForLevel / levelFromXp.
  const _xp = starBank * 10;
  const _levelN = levelFromXp(_xp);
  const _xpAtLevel = xpForLevel(_levelN);
  const _xpAtNext = xpForLevel(_levelN + 1);
  // Next-badge pull-forward — derived from the canonical ACHIEVEMENTS list.
  const _achCtx = buildAchCtx({ completions, todaysTasks, compByTask, starBank, streaks, books });
  const _nextBadge = nextBadgeFor(_achCtx);
  const _nextBadgeValue = _nextBadge?.val ? _nextBadge.val(_achCtx) : 0;
  const kidData = {
    name: user.name,
    avatar: user.photo || user.emoji || "🧑‍🚀",
    stars: starBank,
    streak: { current: _drumCurrent, milestone: _milestone, fillPct: (_drumCurrent / _milestone) * 100 },
    nextReward: { title: CHILD.nextReward, cost: CHILD.nextRewardCost, have: starBank },
    xp: _xp,
    level: {
      value: _levelN,
      title: levelTitle(_levelN),
      xpIntoLevel: _xp - _xpAtLevel,
      xpToNext: _xpAtNext - _xpAtLevel,
      pct: _xpAtNext > _xpAtLevel ? ((_xp - _xpAtLevel) / (_xpAtNext - _xpAtLevel)) * 100 : 100,
    },
    nextBadge: _nextBadge && {
      id: _nextBadge.id,
      emoji: _nextBadge.emoji,
      title: _nextBadge.title,
      desc: _nextBadge.desc,
      value: _nextBadgeValue,
      goal: _nextBadge.goal,
      pct: Math.min(100, (_nextBadgeValue / _nextBadge.goal) * 100),
    },
    mainQuests: todaysTasks.filter((t) => t.required).map(_questFromTask),
    sideQuests: todaysTasks.filter((t) => !t.required).map(_questFromTask),
    stats: [
      { label: "Drum streak", value: _drumCurrent ? `${_drumCurrent}d` : "—" },
      { label: "Books finished", value: _booksFinished || "—" },
      { label: "Spanish streak", value: streaks?.a_spa?.current ? `${streaks.a_spa.current}d` : "—" },
      { label: "Drum songs today", value: _songsToday || "—" },
    ],
    mapStops: [
      {
        id: "drum_mountain",
        title: "Drum Mountain",
        icon: "🥁",
        description: "Climb to a full year of drums (365 days).",
        progress: Math.min(100, (_drumCurrent / _milestone) * 100),
        done: _drumCurrent >= _milestone,
      },
      {
        id: "universal_castle",
        title: "Universal Castle",
        icon: "🏰",
        description: "Save 500 stars for Universal Studios.",
        progress: Math.min(100, (starBank / 500) * 100),
        done: starBank >= 500,
      },
    ],
  };

  const shared = {
    user, users, tasks, todaysTasks, rewards, completions, compByTask, events, handoff, redemptions,
    mode, setMode, earnedToday, pendingStars, availableToday, starBank, redeemedTotal, giftedTotal,
    priorities, setPriority, clearPriority, gifted, giftStars, tkdDays, tkdTimes, toggleTkdDay, setTkdTime,
    activities, addActivity, updateActivity, addTask, updateTask, removeTask, addReward, updateReward, removeReward, streaks, setStreak, stopStreak, bumpStreak, setDetailId, taskNotes, addTaskNote, setProgressActId, books, addBook, updateBook, removeBook, subProgress, toggleSub, undoTask, awards, addAward, removeAward,
    submitTask, decide, requestReward, decideReward, addHandoff, addEvent, addUser, updateUser, removeUser, openTask, setOpenTask, setTab, rewardRequests, addRewardRequest, decideRewardRequest,
    openCompletionId, setOpenCompletionId, updateCompletion, addCompletionPhoto, removeCompletionPhoto,
    pendingRegistrations, approveRegistration, denyRegistration, currentProfileId, setCurrentUserId,
    kidData,
    familyId,
    songs, songPlays, addSong, addSongPlay, removeSong, removeSongPlay,
    setStatDetailId,
    earnedAllTime,
    boardState, setBoardLastPosition, setTreasureClaimed,
    summerQuest, setSummerQuest,
    boardTheme, setBoardTheme,
    boardDailyCap, setBoardDailyCap,
    albumPhotos, setAlbumPhotos,
  };

  return (
    <div
      className="min-h-screen flex justify-center"
      style={{
        // Themed page surface (Customization Hub Phase 2). Inline style
        // wins over the old `bg-slate-50` class — the "white" theme's
        // bg is slate-50 so default behaviour is preserved.
        background: (THEMES[currentPrefs.theme] || THEMES.white).bg,
        color: (THEMES[currentPrefs.theme] || THEMES.white).fg,
        fontFamily: "ui-rounded, 'SF Pro Rounded', system-ui, sans-serif",
      }}
    >
      <div
        className="w-full max-w-md h-screen flex flex-col relative shadow-xl overflow-hidden"
        style={{
          background: (THEMES[currentPrefs.theme] || THEMES.white).bg,
          // 100dvh wins on modern Safari/Chrome (dynamic viewport — adjusts
          // when iOS Safari's URL bar shows/hides). h-screen class is the
          // fallback for browsers that don't know dvh. Clamping height here
          // is what makes BottomNav stay at the viewport bottom: now only
          // the inner content area scrolls, not the whole page.
          height: "100dvh",
        }}
      >
        <TopBar user={user} mode={mode} onSwitch={() => { setCurrentUserId(null); }} onSignOut={signOut} sessionEmail={sessionEmail} onOpenHub={() => setHubOpen(true)} />
        <div className="flex-1 overflow-y-auto pb-24">
          <Router tab={tab} {...shared} />
        </div>
        <BottomNav user={user} tab={tab} setTab={setTab} />
        {openTask && (
          <TaskSheet
            task={openTask}
            existing={compByTask[openTask.id]}
            role={user.role}
            onClose={() => setOpenTask(null)}
            onSubmit={submitTask}
            familyId={familyId}
            songs={songs}
            songPlays={songPlays}
            addSong={addSong}
            addSongPlay={addSongPlay}
          />
        )}
        {celebrate && <CelebrateOverlay data={celebrate} onClose={() => setCelebrate(null)} />}
        {submitPop && <SubmitCelebrate data={submitPop} onClose={() => setSubmitPop(null)} />}
        {openCompletionId && (() => {
          const c = completions.find((x) => x.id === openCompletionId);
          if (!c) return null;
          const t = tasks.find((x) => x.id === c.taskId);
          if (!t) return null;
          return (
            <CompletionDetailSheet
              task={t}
              completion={c}
              activities={activities}
              users={users}
              streaks={streaks}
              familyId={familyId}
              role={user?.role}
              onClose={() => setOpenCompletionId(null)}
              onAddPhoto={(photo) => addCompletionPhoto(c.id, photo)}
              onRemovePhoto={(path) => removeCompletionPhoto(c.id, path)}
              onUpdateNotes={(notes) => updateCompletion(c.id, { notes })}
              onUndo={() => undoTask(c.taskId)}
              onEditTask={(taskId) => setDetailId(taskId)}
            />
          );
        })()}
        {detailId && (() => {
          const t = tasks.find((x) => x.id === detailId);
          if (!t) return null;
          return <DetailSheet task={t} onClose={() => setDetailId(null)} activities={activities} streaks={streaks} completions={completions} priorities={priorities} setPriority={setPriority} clearPriority={clearPriority} updateTask={updateTask} removeTask={(id) => { removeTask(id); setDetailId(null); }} setStreak={setStreak} stopStreak={stopStreak} bumpStreak={bumpStreak} taskNotes={taskNotes} addTaskNote={addTaskNote} users={users} />;
        })()}
        {progressActId && (() => {
          const a = activities.find((x) => x.id === progressActId);
          if (!a) return null;
          return <ProgressSheet activity={a} streaks={streaks} onClose={() => setProgressActId(null)} />;
        })()}
        {hubOpen && (
          <CustomizationHub
            prefs={currentPrefs}
            setPref={setPref}
            onClose={() => setHubOpen(false)}
            user={user}
            updateUser={updateUser}
            familyId={familyId}
          />
        )}
        {statDetailId && (
          <StatDetail
            kind={statDetailId}
            onClose={() => setStatDetailId(null)}
            completions={completions}
            tasks={tasks}
            todaysTasks={todaysTasks}
            activities={activities}
            users={users}
            gifted={gifted}
            redemptions={redemptions}
            starBank={starBank}
            earnedAllTime={earnedAllTime}
            giftedTotal={giftedTotal}
            redeemedTotal={redeemedTotal}
            earnedToday={earnedToday}
            pendingStars={pendingStars}
            availableToday={availableToday}
            base={CHILD.starBankBase}
          />
        )}
      </div>
      <StarBurstLayer />
      <LevelUpLayer />
      {!welcomeDismissed && (
        <OnboardingOverlay
          user={user}
          onDismiss={() => setWelcomeDismissed(true)}
        />
      )}
    </div>
  );
}

// ===================== ROUTER =====================
function Router(props) {
  const { user, tab } = props;
  const role = user.role;
  if (role === "kid") {
    if (tab === "rewards") return <RewardsKid {...props} />;
    if (tab === "stars") return <KidStars {...props} />;
    if (tab === "dream") return <DreamPlan {...props} />;
    if (tab === "streaks") return <KidStreaks {...props} />;
    if (tab === "missions") return <KidMissions {...props} />;
    if (tab === "board") return <BoardGame {...props} />;
    if (tab === "school") return <SummerQuestRoute {...props} />;
    const openQuestSheet = (questId) => {
      const t = props.tasks.find((x) => x.id === questId);
      if (t) props.setOpenTask(t);
    };
    return (
      <KidGameHome
        data={props.kidData}
        onStartQuests={() => {
          const first = (props.kidData?.mainQuests || []).find((q) => !q.done);
          if (first) openQuestSheet(first.id);
        }}
        onTapQuest={openQuestSheet}
        onTapStars={() => props.setStatDetailId?.("bank")}
        onOpenMenu={() => props.setTab("missions")}
        onOpenBoard={() => props.setTab("board")}
        onTapBadges={() => props.setTab("stars")}
      />
    );
  }
  if (role === "parent") {
    if (tab === "approvals") return <Approvals {...props} />;
    if (tab === "rewards") return <RewardsParent {...props} />;
    if (tab === "calendar") return <CalendarView {...props} />;
    if (tab === "more") return <MoreParent {...props} />;
    // Parent's "school" tab is COACH MODE — the teaching cheat-sheet
    // for Reznor's summer arc. Reads the SAME progress row the kid arm
    // writes; checking a quest off here shows the gem in his app.
    // To peek at the kid view, switch into Reznor's profile.
    if (tab === "school") return <CoachModeRoute {...props} />;
    return <ParentTodayHome {...props} />;
  }
  // helper / grandparent. Coach Mode is exposed to helpers (Krissie /
  // Sara support Reznor in the curriculum) but hidden from grandparent
  // — Evie's view stays focused on the today checklist + care notes.
  if (user.role === "helper" && tab === "school") return <CoachModeRoute {...props} />;
  // Helpers (Krissie / Sara) can approve too — same decide(c.id, …) path
  // the parents use. Grandparent (Evie) intentionally stays out of the
  // approval flow; her view is checklist + care notes only.
  if (user.role === "helper" && tab === "approvals") return <Approvals {...props} />;
  if (tab === "notes") return <HelperNotes {...props} />;
  if (tab === "care") return <CareInfo {...props} />;
  return <HelperToday {...props} />;
}

// SummerQuestRoute — thin wrapper that resolves Reznor's profile slot
// out of the per-profile summerQuest map, applies the brief §2 contract
// to <SummerQuest>, and persists writes through the existing
// setSummerQuest sync (composite-key upsert to summer_quest_progress).
// Owner identity model: progress always belongs to the kid (Reznor),
// regardless of who's currently acting as the active profile — same
// trick submitTask uses (`users.find(u => u.role === "kid")`). Parents
// + helpers can edit on his behalf; the row in Supabase is Reznor's.
function SummerQuestRoute(props) {
  const kid = (props.users || []).find((u) => u.role === "kid");
  // Hook MUST be called unconditionally before any early return — React
  // rules-of-hooks. Pass null profileId when there's no kid yet; the
  // hook hands back safe defaults + a no-op save.
  const { mode, done, save } = useSummerQuestProgress({
    profileId: kid?.id || null,
    summerQuest: props.summerQuest,
    setSummerQuest: props.setSummerQuest,
  });
  if (!kid) {
    return (
      <div className="px-4 pt-6 text-sm text-slate-500">
        Summer Quest needs a kid profile in this family. Add one in the
        People view first.
      </div>
    );
  }
  return (
    <SummerQuest
      child={kid.name || "Reznor"}
      initialMode={mode}
      initialDone={done}
      onSave={save}
    />
  );
}

// CoachModeRoute — parent + helper view. Renders the same Summer Quest
// progress row Reznor writes to, but in the teacher cheat-sheet UI
// (ParentCompanion). Sharing the row is the whole point of v2:
// checking a quest done here lights the gem in Reznor's kid app, and
// flipping Home/Road in either flips both. The single useSummerQuestProgress
// seam guarantees there's no second copy of the data.
function CoachModeRoute(props) {
  const kid = (props.users || []).find((u) => u.role === "kid");
  const { mode, done, save } = useSummerQuestProgress({
    profileId: kid?.id || null,
    summerQuest: props.summerQuest,
    setSummerQuest: props.setSummerQuest,
  });
  if (!kid) {
    return (
      <div className="px-4 pt-6 text-sm text-slate-500">
        Coach Mode needs a kid profile in this family. Add one in the
        People view first.
      </div>
    );
  }
  return (
    <ParentCompanion
      child={kid.name || "Reznor"}
      mode={mode}
      done={done}
      onSave={save}
    />
  );
}

// ===================== SHARED UI =====================
function TopBar({ user, mode, onSwitch, onSignOut, sessionEmail, onOpenHub }) {
  return (
    <div className="sticky top-0 z-20 bg-white border-b border-slate-100 px-3 py-3 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Avatar user={user} size={36} />
        <div className="min-w-0">
          <div className="text-sm font-bold leading-tight truncate">{user.name}</div>
          <div className="text-[11px] text-slate-400 leading-tight truncate">{user.accessType === "temporary" ? `Guest · until ${fmtShort(user.accessExpires)}` : user.relationship}</div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${mode === "summer" ? "bg-amber-100 text-amber-700" : "bg-sky-100 text-sky-700"}`}>
          {mode === "summer" ? <span className="flex items-center gap-1"><Sun size={12} /> Summer</span> : <span className="flex items-center gap-1"><GraduationCap size={12} /> School</span>}
        </span>
        <button onClick={onSwitch} className="text-[11px] font-semibold text-slate-400 px-2 py-1 rounded-full hover:bg-slate-100">Switch</button>
        {onOpenHub && (
          <button
            onClick={onOpenHub}
            title="Customize"
            aria-label="Customize"
            className="w-7 h-7 rounded-full grid place-items-center text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <Settings size={14} />
          </button>
        )}
        {onSignOut && (
          <button
            onClick={onSignOut}
            title={sessionEmail ? `Sign out ${sessionEmail}` : "Sign out"}
            aria-label="Sign out"
            className="w-7 h-7 rounded-full grid place-items-center text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <LogOut size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

function StarPill({ n, tone = "amber" }) {
  const tones = { amber: "bg-amber-100 text-amber-700", emerald: "bg-emerald-100 text-emerald-700", slate: "bg-slate-100 text-slate-500" };
  return <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${tones[tone]}`}><Star size={12} className="fill-current" />{n}</span>;
}

function Card({ children, className = "" }) {
  return <div className={`bg-white rounded-3xl border border-slate-100 shadow-sm ${className}`}>{children}</div>;
}

// Avatar: shows the user's uploaded photo if present, else their emoji on a color chip.
// user.photo can be either a storage path (new) or a direct URL (legacy/blob — these
// silently fail to load after the session ends; that's the bug we're fixing).
function Avatar({ user, size = 40, solid = false, className = "" }) {
  const st = { width: size, height: size };
  const isDirectUrl = user?.photo && /^(https?|data|blob):/.test(user.photo);
  const signed = useSignedUrl(user?.photo && !isDirectUrl ? user.photo : null);
  const src = isDirectUrl ? user.photo : signed;
  if (src) return <img src={src} alt={user?.name || ""} className={`rounded-2xl object-cover shrink-0 ${className}`} style={st} />;
  return <div className={`rounded-2xl grid place-items-center shrink-0 ${className}`} style={{ ...st, background: solid ? (user?.color || "#64748b") : (user?.color || "#64748b") + "22", fontSize: Math.round(size * 0.5) }}>{user?.emoji}</div>;
}

// StoredPhoto: render a photo from a storage path (preferred) or legacy URL,
// resolving the path to a signed URL on demand.
function StoredPhoto({ path, url, alt = "", className = "", fallback = null }) {
  const signed = useSignedUrl(url ? null : path);
  const src = url || signed;
  if (!src) return fallback;
  return <img src={src} alt={alt} className={className} />;
}


function SectionTitle({ icon, children, right }) {
  return (
    <div className="flex items-center justify-between mt-5 mb-2 px-1">
      <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">{icon}{children}</div>
      {right}
    </div>
  );
}

// ===================== LOGIN =====================
function LoginScreen({ users, currentProfileId, onPick, onSignOut, sessionEmail }) {
  const isExpired = (u) =>
    u.accessType === "temporary" &&
    u.accessExpires &&
    new Date(u.accessExpires + "T23:59:59") < today;

  // Admin actor guard: only admins (Mike) see every profile in the
  // family. Non-admin adults see ONLY themselves + the kid(s). The DB
  // enforce_actor_identity_trg trigger backs this up — a stale bundle
  // that ignored this filter would have its forged submitted_by /
  // approved_by writes rejected at the server. Kid is always
  // reachable for every adult (kids show in the list regardless).
  const me = currentProfileId
    ? users.find((u) => u.id === currentProfileId)
    : null;
  const amAdmin = !!me?.isAdmin;
  const visibleUsers = amAdmin
    ? users
    : users.filter((u) => u.id === currentProfileId || u.is_child);

  // CSS placeholder starfield. When the painted background art lands at
  // /public/art/login-bg.png, replace the inline `background` on the
  // outer div with `backgroundImage: "url('/art/login-bg.png')"` and
  // delete the decorations block — that's the whole swap.
  const stars = useMemo(
    () =>
      Array.from({ length: 70 }).map((_, i) => ({
        key: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.6 + 0.3,
      })),
    []
  );

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 30% 18%, #5b21b6 0%, #312e81 38%, #0f172a 70%, #020617 100%)",
        fontFamily: "ui-rounded, 'SF Pro Rounded', system-ui, sans-serif",
      }}
    >
      {/* Cosmic decorations — placeholder for the painted login-bg.png */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
        {stars.map((s) => (
          <div
            key={s.key}
            className="absolute rounded-full bg-white"
            style={{
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: s.size,
              height: s.size,
              opacity: s.opacity,
            }}
          />
        ))}
        <div
          className="absolute"
          style={{
            left: "8%",
            top: "8%",
            width: 96,
            height: 96,
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 30% 30%, #ddd6fe 0%, #a78bfa 35%, #5b21b6 70%, transparent 90%)",
            opacity: 0.6,
            filter: "blur(0.5px)",
          }}
        />
        <div
          className="absolute"
          style={{
            right: "12%",
            top: "17%",
            width: 32,
            height: 32,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, #67e8f9 0%, #06b6d4 40%, transparent 75%)",
            opacity: 0.8,
            filter: "blur(0.5px)",
          }}
        />
      </div>

      {/* Foreground content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center px-5 py-8 max-w-md mx-auto w-full">
        {/* Hero spacer — placeholder for the painted kid hero */}
        <div className="flex-1 w-full min-h-[18vh] max-h-[34vh] grid place-items-center">
          <div
            className="text-7xl"
            style={{ filter: "drop-shadow(0 0 30px rgba(167, 139, 250, 0.7))" }}
          >
            🚀
          </div>
        </div>

        {/* Title */}
        <div className="text-center">
          <h1
            className="text-3xl font-extrabold tracking-tight text-white"
            style={{
              textShadow: "0 6px 24px rgba(0,0,0,0.7), 0 2px 4px rgba(0,0,0,0.5)",
            }}
          >
            Reznor Command Center
          </h1>
          <p
            className="text-sm mt-1 font-semibold"
            style={{
              color: "#c4b5fd",
              textShadow: "0 2px 8px rgba(0,0,0,0.6)",
            }}
          >
            Who's logging in?
          </p>
        </div>

        {/* Card grid */}
        <div className="grid grid-cols-2 gap-3 w-full mt-5">
          {visibleUsers.map((u) => {
            const expired = isExpired(u);
            const blocked = expired || u.active === false;
            const roleLabel =
              u.role === "kid"
                ? "Mission Mode"
                : blocked
                ? expired
                  ? "Access ended"
                  : "Disabled"
                : u.accessType === "temporary"
                ? `Guest · until ${fmtShort(u.accessExpires)}`
                : u.relationship;
            return (
              <button
                key={u.id}
                type="button"
                disabled={blocked}
                onClick={() => !blocked && onPick(u.id)}
                className={`group relative rounded-3xl transition p-4 flex flex-col items-center gap-2 ${
                  blocked ? "opacity-40" : "active:scale-95 hover:scale-[1.02]"
                }`}
                style={{
                  // Profile-frame placeholder. When /art/profile-frame.png
                  // lands, the entire `background` + `border` + corner-
                  // bracket spans below become:
                  //   border: 14px solid transparent;
                  //   borderImage: "url('/art/profile-frame.png') 32 fill / 14px / 0 stretch";
                  background: `
                    radial-gradient(ellipse at top left, rgba(167, 139, 250, 0.28) 0%, transparent 60%),
                    radial-gradient(ellipse at bottom right, rgba(236, 72, 153, 0.22) 0%, transparent 65%),
                    linear-gradient(135deg, rgba(30, 27, 75, 0.85), rgba(15, 23, 42, 0.9))
                  `,
                  backdropFilter: "blur(8px)",
                  boxShadow: blocked
                    ? "none"
                    : "0 0 28px rgba(139, 92, 246, 0.35), inset 0 1px 0 rgba(255,255,255,0.1)",
                  border: "2px solid",
                  borderImageSlice: 1,
                  borderImageSource:
                    "linear-gradient(135deg, #c084fc 0%, #ec4899 35%, #6366f1 70%, #c084fc 100%)",
                }}
              >
                {/* Sci-fi corner brackets — also dropped when the painted
                    frame's border-image takes over. */}
                <span
                  aria-hidden="true"
                  className="absolute pointer-events-none"
                  style={{
                    top: -2,
                    left: -2,
                    width: 18,
                    height: 18,
                    borderTop: "3px solid #f9a8d4",
                    borderLeft: "3px solid #f9a8d4",
                    borderTopLeftRadius: 14,
                    filter: "drop-shadow(0 0 6px #ec4899)",
                  }}
                />
                <span
                  aria-hidden="true"
                  className="absolute pointer-events-none"
                  style={{
                    top: -2,
                    right: -2,
                    width: 18,
                    height: 18,
                    borderTop: "3px solid #f9a8d4",
                    borderRight: "3px solid #f9a8d4",
                    borderTopRightRadius: 14,
                    filter: "drop-shadow(0 0 6px #ec4899)",
                  }}
                />
                <span
                  aria-hidden="true"
                  className="absolute pointer-events-none"
                  style={{
                    bottom: -2,
                    left: -2,
                    width: 18,
                    height: 18,
                    borderBottom: "3px solid #93c5fd",
                    borderLeft: "3px solid #93c5fd",
                    borderBottomLeftRadius: 14,
                    filter: "drop-shadow(0 0 6px #3b82f6)",
                  }}
                />
                <span
                  aria-hidden="true"
                  className="absolute pointer-events-none"
                  style={{
                    bottom: -2,
                    right: -2,
                    width: 18,
                    height: 18,
                    borderBottom: "3px solid #93c5fd",
                    borderRight: "3px solid #93c5fd",
                    borderBottomRightRadius: 14,
                    filter: "drop-shadow(0 0 6px #3b82f6)",
                  }}
                />

                <div
                  className="rounded-2xl overflow-hidden border-2 border-white/30 shadow-lg shrink-0"
                  style={{ width: 84, height: 84 }}
                >
                  <Avatar user={u} size={84} solid />
                </div>
                <div className="text-sm font-extrabold text-white text-center leading-tight">
                  {u.name}
                </div>
                <div
                  className={`text-[11px] capitalize text-center ${
                    blocked ? "text-rose-300" : "text-violet-200"
                  }`}
                >
                  {roleLabel}
                </div>
              </button>
            );
          })}
        </div>

        <p
          className="text-center text-violet-300/50 text-[10px] mt-4"
          style={{ textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}
        >
          Prototype role-switcher · TODO: real auth + server-enforced access windows
        </p>

        {/* Stone-arch footer band — sign-out lives here */}
        {onSignOut && (
          <div
            className="mt-3 w-full rounded-2xl py-3 px-4 text-center relative overflow-hidden"
            style={{
              background:
                "linear-gradient(180deg, rgba(76, 29, 149, 0.45) 0%, rgba(30, 27, 75, 0.7) 100%)",
              border: "1px solid rgba(167, 139, 250, 0.35)",
              boxShadow:
                "0 0 18px rgba(139, 92, 246, 0.25), inset 0 1px 0 rgba(255,255,255,0.08)",
            }}
          >
            <span
              aria-hidden="true"
              className="absolute"
              style={{
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#67e8f9",
                fontSize: 13,
                opacity: 0.55,
                filter: "drop-shadow(0 0 4px #06b6d4)",
              }}
            >
              ◆
            </span>
            <span
              aria-hidden="true"
              className="absolute"
              style={{
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#67e8f9",
                fontSize: 13,
                opacity: 0.55,
                filter: "drop-shadow(0 0 4px #06b6d4)",
              }}
            >
              ◆
            </span>
            <button
              onClick={onSignOut}
              className="text-[12px] text-violet-100 hover:text-white inline-flex items-center gap-1.5 underline-offset-2 hover:underline font-semibold"
            >
              <LogOut size={12} />{" "}
              {sessionEmail ? `Not ${sessionEmail}? Sign out` : "Sign out"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ===================== KID: MISSIONS =====================
function KidMissions({ todaysTasks, compByTask, setOpenTask, setOpenCompletionId, availableToday, earnedToday, pendingStars, starBank, mode, priorities, users, activities, streaks, subProgress, toggleSub, undoTask }) {
  const done = todaysTasks.filter((t) => compByTask[t.id]?.status === "approved").length;
  const ordered = sortByLevel(todaysTasks, mode, priorities);
  return (
    <div className="px-4 pt-4">
      <div className="rounded-3xl p-5 text-white relative overflow-hidden" style={{ background: "linear-gradient(135deg,#f59e0b,#ef4444)" }}>
        <Sparkles className="absolute -right-3 -top-3 opacity-20" size={90} />
        <div className="text-sm font-semibold opacity-90">Hey Reznor! 🚀</div>
        <div className="text-2xl font-extrabold mt-1">Today's Missions</div>
        <div className="flex gap-2 mt-4">
          <KidStat label="Earned" value={earnedToday} icon={<Star size={14} className="fill-current" />} />
          <KidStat label="Pending" value={pendingStars} icon={<Clock size={14} />} />
          <KidStat label="Can earn" value={availableToday} icon={<Trophy size={14} />} />
        </div>
        <div className="mt-4 bg-white/20 rounded-full h-3 overflow-hidden">
          <div className="h-full bg-white rounded-full transition-all" style={{ width: `${todaysTasks.length ? (done / todaysTasks.length) * 100 : 0}%` }} />
        </div>
        <div className="text-[11px] mt-1 opacity-90">{done} of {todaysTasks.length} missions complete</div>
      </div>

      <div className="mt-3"><PiggyBank stars={starBank} /></div>
      <StreakStrip streaks={streaks} activities={activities} />

      <SectionTitle icon={<Trophy size={16} className="text-rose-500" />}>Today's missions <span className="text-[11px] font-normal text-slate-400">· most important first</span></SectionTitle>
      {ordered.map((t) => {
        const c = compByTask[t.id];
        // Approved task → tap opens the CompletionDetailSheet (photos
        // / notes / stats / edit) instead of the submit sheet. Pending
        // / not-started keep the old submit-sheet behavior.
        const isApproved = c?.status === "approved";
        const onOpen = isApproved && c?.id
          ? () => setOpenCompletionId(c.id)
          : () => setOpenTask(t);
        return <MissionCard key={t.id} task={t} comp={c} onOpen={onOpen} mode={mode} priorities={priorities} users={users} activities={activities} streaks={streaks} subProgress={subProgress} toggleSub={toggleSub} undoTask={undoTask} />;
      })}
    </div>
  );
}

function KidStat({ label, value, icon }) {
  return (
    <div className="flex-1 bg-white/20 rounded-2xl py-2 px-2 text-center backdrop-blur">
      <div className="flex items-center justify-center gap-1 text-lg font-extrabold">{icon}{value}</div>
      <div className="text-[10px] opacity-90">{label}</div>
    </div>
  );
}

function MissionCard({ task, comp, onOpen, mode, priorities, users, activities, streaks, subProgress, toggleSub, undoTask }) {
  const status = comp?.status || "not_started";
  const m = STATUS_META[status];
  const doneish = status === "approved";
  const submitted = status !== "not_started";
  const canUndo = status === "pending";
  const d = actFor(task, activities);
  const lvl = levelOf(task, mode, priorities);
  const P = PRIORITY[lvl];
  const ov = priorities?.[task.id];
  const st = streaks?.[task.activityId || TYPE_TO_ACT[task.activityType]];
  const subs = task.subtasks;
  const sp = subProgress?.[task.id] || {};
  const subDone = subs ? subs.filter((s) => sp[s.id] || submitted).length : 0;
  return (
    <div className="w-full text-left mb-2.5">
      <div className="rounded-3xl overflow-hidden border border-slate-100 shadow-sm" style={{ background: doneish ? "#ecfdf5" : lvl === "normal" ? d.color + "12" : P.wash }}>
        <button onClick={onOpen} className="w-full flex items-stretch active:scale-[0.99] transition">
          <div className="w-14 shrink-0 grid place-items-center" style={{ background: d.color }}>
            <TaskIcon type={task.activityType} color="#ffffff" />
          </div>
          <div className="flex items-center gap-3 p-3.5 flex-1 min-w-0">
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm flex items-center gap-2 flex-wrap">{task.title}{doneish && <Check size={14} className="text-emerald-500" />}</div>
              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: d.color + "22", color: d.color }}>{d.label}</span>
                <span className="text-[11px] text-slate-400">{subs ? `${subDone}/${subs.length} parts` : `${task.minutes} min${task.proofRequired ? " · proof" : ""}`}</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap mt-1">
                <PriorityBadge level={lvl} scope={ov?.scope} />
                {st && <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600">🔥 {st.current}</span>}
                {submitted && <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${m.color}`}>{m.label}</span>}
              </div>
            </div>
            <StarPill n={task.starValue} tone={doneish ? "emerald" : "amber"} />
          </div>
        </button>
        {subs && !submitted && (
          <div className="flex gap-1.5 px-3 pb-3">
            {subs.map((s) => {
              const on = !!sp[s.id];
              return (
                <button key={s.id} onClick={() => toggleSub(task.id, s.id)} className={`flex-1 text-[11px] font-bold px-2 py-2 rounded-xl flex items-center justify-center gap-1 active:scale-95 ${on ? "bg-emerald-500 text-white" : "bg-white border border-slate-200 text-slate-500"}`}>
                  {on ? <Check size={13} /> : <span className="w-3 h-3 rounded-full border-2 border-slate-300" />} {s.label}
                </button>
              );
            })}
          </div>
        )}
        {subs && submitted && (
          <div className="flex gap-1.5 px-3 pb-3">
            {subs.map((s) => <div key={s.id} className="flex-1 text-[11px] font-bold px-2 py-2 rounded-xl flex items-center justify-center gap-1 bg-emerald-100 text-emerald-600"><Check size={13} /> {s.label}</div>)}
          </div>
        )}
        {canUndo && undoTask && (
          <div className="px-3 pb-3">
            <button onClick={() => undoTask(task.id)} className="w-full py-2 rounded-xl bg-white border border-slate-200 text-slate-500 text-[12px] font-bold flex items-center justify-center gap-1"><RotateCcw size={14} /> Oops — undo this</button>
          </div>
        )}
      </div>
    </div>
  );
}

function TaskIcon({ type, done, color }) {
  const c = done ? "#059669" : (color || "#475569");
  if (type === "Church") return <Sparkles size={20} color={c} />;
  if (type?.includes("reading") || type === "Writing") return <BookOpen size={20} color={c} />;
  if (type === "Drums") return <Drum size={20} color={c} />;
  if (type === "Art") return <ImageIcon size={20} color={c} />;
  if (type === "Chores") return <Home size={20} color={c} />;
  if (["Swim", "Taekwondo", "Hip Hop Dance", "Movement", "Basketball", "Soccer", "Tennis"].includes(type)) return <Heart size={20} color={c} />;
  if (type === "Duolingo" || type === "Spanish practice") return <Music size={20} color={c} />;
  return <Star size={20} color={c} />;
}

// ===================== PRIORITY BADGE + PIGGY BANK =====================
// Color now MEANS importance. Badge shows level + how long it sticks (scope).
function PriorityBadge({ level, scope }) {
  if (!level || level === "normal") return null;
  const P = PRIORITY[level];
  const isMust = level === "must";
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full" style={{ background: isMust ? "#0f172a" : P.dot, color: "#fff" }}>
      {isMust && "★ "}{P.badge}{scope && scope !== "always" ? ` · ${SCOPE_LABEL[scope]}` : ""}
    </span>
  );
}

// StatDetail — bottom sheet that drills into one of the four summary stats.
// Everything here is DERIVED from the canonical completions/gifted/redemptions
// rows (ARCHITECTURE §1, §3). No new storage, no parallel counters.
function StatDetail({
  kind,
  onClose,
  completions,
  tasks,
  todaysTasks,
  activities,
  users,
  gifted,
  redemptions,
  starBank,
  earnedAllTime,
  giftedTotal,
  redeemedTotal,
  earnedToday,
  pendingStars,
  availableToday,
  base,
}) {
  // Date windows for the per-task tallies.
  // Week = calendar week Sun–Sat — today.getDay() returns 0 for Sunday,
  // so weekStart = today - today.getDay() days walks back to Sunday.
  // Month = current calendar month. All-time = every approved completion.
  const weekStart = (() => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
    return isoLocal(d);
  })();
  const monthStart = TODAY_ISO.slice(0, 7) + "-01";

  // Group approved completions by taskId across the windows.
  const counts = {};
  completions.forEach((c) => {
    if (c.status !== "approved") return;
    const tid = c.taskId;
    if (!counts[tid]) counts[tid] = { week: 0, month: 0, all: 0, weekStars: 0, monthStars: 0, allStars: 0 };
    const date = c.completionDate || "";
    counts[tid].all += 1;
    counts[tid].allStars += c.awardedStars || 0;
    if (date >= monthStart) {
      counts[tid].month += 1;
      counts[tid].monthStars += c.awardedStars || 0;
    }
    if (date >= weekStart) {
      counts[tid].week += 1;
      counts[tid].weekStars += c.awardedStars || 0;
    }
  });

  const taskById = Object.fromEntries((tasks || []).map((t) => [t.id, t]));
  const userById = Object.fromEntries((users || []).map((u) => [u.id, u]));
  const actById = Object.fromEntries((activities || []).map((a) => [a.id, a]));
  const actFor = (t) => actById[t?.activityId || TYPE_TO_ACT[t?.activityType]];

  const todaysApproved = completions
    .filter((c) => c.status === "approved" && c.completionDate === TODAY_ISO)
    .sort((a, b) => (b.id || "").localeCompare(a.id || ""));
  const todaysPending = completions
    .filter((c) => c.status === "pending" && c.completionDate === TODAY_ISO)
    .sort((a, b) => (b.id || "").localeCompare(a.id || ""));

  const TITLES = {
    earned: { title: "Earned today", subtitle: "Every star Reznor banked since midnight." },
    pending: { title: "Pending approval (today)", subtitle: "Today's submissions waiting on a grown-up." },
    bank: { title: "Total star bank", subtitle: "What's in the piggy right now, and where it came from." },
    available: { title: "Stars available today", subtitle: "Every star Reznor could earn if he finished everything on today's list." },
  };
  const meta = TITLES[kind] || TITLES.earned;

  // For the bar visualisation — peak weekly count across the listed tasks
  // sets the scale, so the heaviest grinder this week fills the bar.
  const maxWeek = Math.max(1, ...Object.values(counts).map((c) => c.week));

  // Render a row for one task with its week / month / all-time tally,
  // plus a thin emerald bar for at-a-glance weekly ranking.
  const TaskTallyRow = ({ taskId }) => {
    const t = taskById[taskId];
    const a = actFor(t);
    const c = counts[taskId] || { week: 0, month: 0, all: 0 };
    const pct = Math.round((c.week / maxWeek) * 100);
    return (
      <div className="flex items-stretch gap-2 py-1.5">
        <div className="w-2 self-stretch rounded-full" style={{ background: a?.color || "#cbd5e1" }} />
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <div className="text-sm font-bold text-slate-800 truncate">{t?.title || taskId}</div>
            <div className="text-[10px] text-slate-400 truncate">{a?.short || a?.name || t?.activityType}</div>
          </div>
          <div className="h-1 bg-slate-100 rounded-full overflow-hidden mt-1" title={`${c.week} this week`}>
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1 text-center self-center">
          <div className="px-2 py-0.5 rounded-md bg-emerald-50" title="This calendar week (Sun–Sat)">
            <div className="text-[10px] uppercase tracking-wide text-emerald-700/70 font-bold">wk</div>
            <div className="text-sm font-extrabold text-emerald-700">{c.week}</div>
          </div>
          <div className="px-2 py-0.5 rounded-md bg-indigo-50" title="Current calendar month">
            <div className="text-[10px] uppercase tracking-wide text-indigo-700/70 font-bold">mo</div>
            <div className="text-sm font-extrabold text-indigo-700">{c.month}</div>
          </div>
          <div className="px-2 py-0.5 rounded-md bg-slate-100" title="All-time">
            <div className="text-[10px] uppercase tracking-wide text-slate-500/70 font-bold">all</div>
            <div className="text-sm font-extrabold text-slate-700">{c.all}</div>
          </div>
        </div>
      </div>
    );
  };

  // A completion line for the "today" lists.
  const TodayLine = ({ c }) => {
    const t = taskById[c.taskId];
    const a = actFor(t);
    const submittedBy = userById[c.submittedBy || c.completedBy];
    const approvedBy = userById[c.approvedBy];
    const stars = c.awardedStars || c.pendingStars || 0;
    return (
      <div className="flex items-center gap-2 py-2 border-b border-slate-100 last:border-0">
        <div className="w-9 h-9 rounded-2xl grid place-items-center shrink-0" style={{ background: (a?.color || "#94a3b8") + "22", color: a?.color || "#475569" }}>
          <TaskIcon type={t?.activityType} color={a?.color || "#475569"} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-slate-800 truncate">{t?.title || c.taskId}</div>
          <div className="text-[11px] text-slate-400 truncate">
            {a?.short || a?.name || t?.activityType}
            {submittedBy ? ` · by ${submittedBy.name}` : ""}
            {approvedBy && submittedBy?.id !== approvedBy.id ? ` · ok'd by ${approvedBy.name}` : ""}
          </div>
        </div>
        <div className="shrink-0">
          <StarPill n={stars} tone={c.status === "approved" ? "emerald" : "amber"} />
        </div>
      </div>
    );
  };

  // Body — different per kind.
  let body = null;
  if (kind === "earned") {
    body = (
      <>
        <div className="bg-emerald-50 rounded-2xl p-4 mb-3 text-center">
          <div className="text-4xl font-extrabold text-emerald-700">{earnedToday}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">stars earned today across {todaysApproved.length} {todaysApproved.length === 1 ? "task" : "tasks"}</div>
        </div>
        {todaysApproved.length === 0
          ? <Card className="p-4 text-center text-sm text-slate-400">Nothing approved yet today. 💤</Card>
          : <Card className="p-2">{todaysApproved.map((c) => <TodayLine key={c.id} c={c} />)}</Card>}
      </>
    );
  } else if (kind === "pending") {
    body = (
      <>
        <div className="bg-amber-50 rounded-2xl p-4 mb-3 text-center">
          <div className="text-4xl font-extrabold text-amber-700">{pendingStars}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">stars sitting in today's pending — {todaysPending.length} {todaysPending.length === 1 ? "task" : "tasks"} waiting on you</div>
        </div>
        {todaysPending.length === 0
          ? <Card className="p-4 text-center text-sm text-slate-400">Nothing waiting today. 🎉</Card>
          : <Card className="p-2">{todaysPending.map((c) => <TodayLine key={c.id} c={c} />)}</Card>}
        <p className="text-[11px] text-slate-400 px-1 mt-2">Older un-approved submissions live in the Approvals tab.</p>
      </>
    );
  } else if (kind === "bank") {
    const lineCls = "flex items-center justify-between py-2 border-b border-slate-100 last:border-0";
    body = (
      <>
        <div className="bg-violet-50 rounded-2xl p-4 mb-3 text-center">
          <div className="text-4xl font-extrabold text-violet-700">{starBank}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">stars in the bank right now</div>
        </div>
        <Card className="p-3">
          <div className={lineCls}>
            <div className="text-sm font-bold text-slate-700">Base (carried over)</div>
            <div className="text-sm font-extrabold text-slate-800">{base}</div>
          </div>
          <div className={lineCls}>
            <div className="text-sm font-bold text-emerald-700">+ Earned (all-time)</div>
            <div className="text-sm font-extrabold text-emerald-700">{earnedAllTime}</div>
          </div>
          <div className={lineCls}>
            <div className="text-sm font-bold text-pink-700">+ Gifted bonus stars</div>
            <div className="text-sm font-extrabold text-pink-700">{giftedTotal}</div>
          </div>
          <div className={lineCls}>
            <div className="text-sm font-bold text-rose-700">− Redeemed</div>
            <div className="text-sm font-extrabold text-rose-700">{redeemedTotal}</div>
          </div>
          <div className="flex items-center justify-between pt-2 mt-1 border-t-2 border-slate-300">
            <div className="text-sm font-extrabold text-slate-800">= Star bank</div>
            <div className="text-lg font-extrabold text-violet-700">{starBank}</div>
          </div>
        </Card>
      </>
    );
  } else if (kind === "available") {
    // Show today's tasks with their star value and current status.
    const compByTaskToday = {};
    completions.forEach((c) => {
      if (c.completionDate === TODAY_ISO) compByTaskToday[c.taskId] = c;
    });
    const rows = (todaysTasks || []).map((t) => ({
      t,
      c: compByTaskToday[t.id],
    }));
    const remaining = rows.filter((r) => !r.c || !["approved"].includes(r.c.status)).reduce((s, r) => s + r.t.starValue, 0);
    body = (
      <>
        <div className="bg-slate-100 rounded-2xl p-4 mb-3 text-center">
          <div className="text-4xl font-extrabold text-slate-700">{availableToday}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            stars on today's list · <span className="font-bold text-slate-700">{remaining}</span> still up for grabs
          </div>
        </div>
        <Card className="p-2">
          {rows.map(({ t, c }) => {
            const a = actFor(t);
            const status = c ? (c.status === "approved" ? "done" : c.status === "pending" ? "pending" : c.status) : "not started";
            const statusCls = c?.status === "approved"
              ? "bg-emerald-100 text-emerald-700"
              : c?.status === "pending"
              ? "bg-amber-100 text-amber-700"
              : "bg-slate-100 text-slate-500";
            return (
              <div key={t.id} className="flex items-center gap-2 py-2 border-b border-slate-100 last:border-0">
                <div className="w-2 self-stretch rounded-full" style={{ background: a?.color || "#cbd5e1" }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-slate-800 truncate">{t.title}</div>
                  <div className="text-[11px] text-slate-400 truncate">{a?.short || a?.name || t.activityType}</div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusCls}`}>{status}</span>
                <StarPill n={t.starValue} tone="amber" />
              </div>
            );
          })}
        </Card>
      </>
    );
  }

  // Per-task tally section — shown on "earned" and "pending" detail pages.
  let tally = null;
  if (kind === "earned" || kind === "pending") {
    const ids = Object.keys(counts).sort((a, b) => (counts[b].all - counts[a].all) || a.localeCompare(b));
    tally = (
      <>
        <div className="flex items-center justify-between mt-4 mb-2 px-1">
          <div className="text-sm font-extrabold text-slate-700">Per-task tally</div>
          <div className="text-[10px] text-slate-400">this week (Sun–Sat) · this month · all-time</div>
        </div>
        {ids.length === 0
          ? <Card className="p-3 text-center text-xs text-slate-400">No approved history yet.</Card>
          : <Card className="p-3">{ids.map((id) => <TaskTallyRow key={id} taskId={id} />)}</Card>}
      </>
    );
  }

  return <StatDetailSheet onClose={onClose} meta={meta} body={body} tally={tally} />;
}

// Split out so we can call hooks (useBottomSheet) without violating
// the rules-of-hooks early-return pattern in the parent function.
function StatDetailSheet({ onClose, meta, body, tally }) {
  const { handleClose, dragHandlers, backdropStyle, sheetStyle } = useBottomSheet({ onClose });
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center" style={{ fontFamily: "inherit" }}>
      <div onClick={handleClose} className="absolute inset-0" style={backdropStyle} />
      <div className="relative w-full max-w-md bg-white rounded-t-3xl p-5 max-h-[88vh] overflow-y-auto shadow-2xl" style={sheetStyle}>
        <div
          {...dragHandlers}
          className="pt-1 pb-2 -mx-5 -mt-5 px-5 mb-2 cursor-grab active:cursor-grabbing touch-none"
        >
          <div className="w-10 h-1.5 bg-slate-200 rounded-full mx-auto mt-2" />
        </div>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <div className="text-lg font-extrabold tracking-tight">{meta.title}</div>
            <div className="text-[12px] text-slate-400 mt-0.5">{meta.subtitle}</div>
          </div>
          <button onClick={handleClose} className="text-slate-400 p-1" title="Close"><X size={18} /></button>
        </div>
        {body}
        {tally}
        <button onClick={handleClose} className="w-full mt-4 py-3 rounded-2xl bg-slate-100 text-slate-500 font-bold text-sm">Done</button>
      </div>
    </div>
  );
}

function SubmitCelebrate({ data, onClose }) {
  // Brief, non-blocking confetti pop fired when the kid submits a task.
  // Distinct from CelebrateOverlay (full streak modal) and from the board
  // landing pop — this one rewards the act of TURNING IT IN.
  const palette = ["#fde047", "#facc15", "#22d3ee", "#a78bfa", "#f472b6", "#34d399", "#fb923c"];
  const emojis = ["⭐", "✨", "🎉", "💫", "🌟", "🎊"];
  const pieces = [];
  for (let i = 0; i < 26; i++) {
    const dx = (Math.random() - 0.5) * 360;
    const left = 50 + (Math.random() - 0.5) * 26;
    const top = 42 + (Math.random() - 0.5) * 18;
    pieces.push(
      <span
        key={i}
        className="absolute text-2xl"
        style={{
          left: `${left}%`,
          top: `${top}%`,
          color: palette[i % palette.length],
          ["--dx"]: `${dx}px`,
          animation: `subConfetti ${950 + Math.random() * 600}ms ease-out ${i * 26}ms forwards`,
          willChange: "transform, opacity",
        }}
      >
        {emojis[i % emojis.length]}
      </span>
    );
  }
  return (
    <div
      key={data.id}
      className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none"
      aria-hidden="true"
    >
      <style>{`
        @keyframes subBurst { 0% { transform: scale(0.25); opacity: 0; } 30% { transform: scale(1.4); opacity: 1; } 70% { transform: scale(1.05); opacity: 0.95; } 100% { transform: scale(1); opacity: 0; } }
        @keyframes subRise { 0% { transform: translateY(8px); opacity: 0; } 15% { opacity: 1; } 100% { transform: translateY(-130px); opacity: 0; } }
        @keyframes subConfetti { 0% { transform: translate(0, -8vh) rotate(0deg); opacity: 0; } 12% { opacity: 1; } 100% { transform: translate(var(--dx), 50vh) rotate(640deg); opacity: 0; } }
      `}</style>
      <div
        className="drop-shadow-lg"
        style={{ animation: "subBurst 1100ms ease-out forwards", fontSize: "7rem" }}
      >
        ⭐
      </div>
      <div
        className="absolute text-2xl font-extrabold text-amber-300"
        style={{ animation: "subRise 1200ms ease-out forwards", textShadow: "0 2px 14px rgba(0,0,0,0.55)" }}
      >
        {data.title}
      </div>
      {data.sub && (
        <div
          className="absolute text-sm font-bold text-white/95 mt-16"
          style={{ animation: "subRise 1200ms ease-out 80ms forwards", textShadow: "0 2px 10px rgba(0,0,0,0.6)" }}
        >
          {data.sub}
        </div>
      )}
      {pieces}
    </div>
  );
}

// Tiny helper: render one photo from a proof.path via the signed-URL
// hook. Lives outside CompletionDetailSheet so the hook can be called
// once per photo (hooks-in-loops require their own component).
function CompletionPhotoTile({ photo, onRemove, canRemove }) {
  const url = useSignedUrl(photo?.path);
  return (
    <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
      {url ? (
        <img src={url} alt={photo.name || "proof"} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full grid place-items-center text-xs text-slate-400">Loading…</div>
      )}
      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/55 text-white grid place-items-center text-xs font-bold active:scale-95"
          aria-label="Remove photo"
        >
          ✕
        </button>
      )}
    </div>
  );
}

// CompletionDetailSheet — opens when anyone (kid or parent) taps an
// APPROVED task. Tabs: Photos · Notes · Stats · Edit. Krissie's ask:
// retroactive photo add for chores Reznor forgot to photograph, plus
// a one-stop sheet to inspect/adjust a finished task without leaving
// the day view.
function CompletionDetailSheet({
  task, completion, activities, users, streaks,
  onClose, onAddPhoto, onRemovePhoto, onUpdateNotes,
  onUndo, onEditTask, familyId, role,
}) {
  const [tab, setTab] = useState("photos");
  const [notes, setNotes] = useState(completion?.notes || "");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const activity = (activities || []).find((a) =>
    a.id === (task.activityId || task.activityType?.toLowerCase().replace(/\s/g, "_"))
  );
  const photos = Array.isArray(completion?.proof)
    ? completion.proof.filter((p) => p?.type === "photo" && p?.path)
    : [];
  const submittedByName =
    users?.find((u) => u.id === completion?.submittedBy)?.name || "—";
  const approvedByName =
    users?.find((u) => u.id === completion?.approvedBy)?.name || "—";
  const streak = (() => {
    const aid = task.activityId || activity?.id;
    return aid ? streaks?.[aid] : null;
  })();

  // Upload + append. Photos can pile up over time — a chore that
  // happened across the morning might have a "before" and "after"
  // shot added on different taps. We never replace; we append.
  const handlePickFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      const { path, name } = await uploadFamilyPhoto({ file: f, familyId, kind: "proof" });
      onAddPhoto({ name, path });
    } catch (err) {
      alert("Photo upload failed: " + (err.message || err));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const saveNotes = () => {
    if (notes === (completion?.notes || "")) return;
    onUpdateNotes(notes);
  };

  // The Edit tab routes a parent to the existing DetailSheet (task
  // config editor). Kids don't see "Edit task" — they're not the
  // ones changing required/star-value/etc.
  const isParent = role === "parent";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ fontFamily: "inherit" }}>
      <div onClick={onClose} className="absolute inset-0 bg-slate-900/55 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 max-h-[88vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div
            className="w-12 h-12 rounded-2xl grid place-items-center text-2xl shrink-0"
            style={{ background: (activity?.color || "#64748b") + "22" }}
          >
            {activity?.emoji || "⭐"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-600">Completed ✓</div>
            <div className="font-extrabold text-slate-900 leading-tight truncate">{task.title}</div>
            <div className="text-[11px] text-slate-400">
              {activity?.name || task.activityType || "Task"} · {task.starValue || 0} ⭐
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 p-1 shrink-0" title="Close" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-4 gap-1 bg-slate-100 rounded-2xl p-1 mb-4">
          {[
            { id: "photos", label: "Photos", icon: "📸" },
            { id: "notes", label: "Notes", icon: "📝" },
            { id: "stats", label: "Stats", icon: "📊" },
            { id: "edit", label: "Edit", icon: "✏️" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`py-2 rounded-xl text-xs font-bold transition ${
                tab === t.id ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"
              }`}
            >
              <div className="text-base leading-none">{t.icon}</div>
              <div className="mt-0.5">{t.label}</div>
            </button>
          ))}
        </div>

        {/* Body */}
        {tab === "photos" && (
          <div>
            {photos.length === 0 && (
              <div className="text-center py-6 text-sm text-slate-400">
                No photos yet. Add one if Reznor forgot 📸
              </div>
            )}
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {photos.map((p) => (
                  <CompletionPhotoTile
                    key={p.path}
                    photo={p}
                    canRemove={true}
                    onRemove={() => onRemovePhoto(p.path)}
                  />
                ))}
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePickFile}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className={`w-full py-3 rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2 ${
                uploading ? "bg-slate-200 text-slate-400" : "bg-indigo-600 text-white active:scale-95"
              }`}
            >
              {uploading ? "Uploading…" : "📸 Add a photo"}
            </button>
            <div className="text-[11px] text-slate-400 mt-2 text-center">
              You can add as many as you want — before, after, the whole story.
            </div>
          </div>
        )}

        {tab === "notes" && (
          <div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={saveNotes}
              placeholder="Anything to remember about this one?"
              className="w-full min-h-[140px] border border-slate-200 rounded-2xl px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={saveNotes}
              className="w-full mt-3 py-3 rounded-2xl bg-emerald-500 text-white font-extrabold text-sm active:scale-95"
            >
              Save notes
            </button>
          </div>
        )}

        {tab === "stats" && (
          <div className="space-y-2">
            <StatRow label="Date" value={completion?.completionDate || "—"} />
            <StatRow label="Stars earned" value={`${completion?.awardedStars ?? task.starValue ?? 0} ⭐`} />
            <StatRow label="Submitted by" value={submittedByName} />
            <StatRow label="Approved by" value={completion?.status === "approved" ? approvedByName : `Status: ${completion?.status || "—"}`} />
            {streak && (
              <>
                <StatRow label="Current streak" value={`${streak.current} day${streak.current === 1 ? "" : "s"} 🔥`} />
                <StatRow label="Best ever" value={`${streak.longest} days`} />
              </>
            )}
            <StatRow label="Photos" value={`${photos.length} attached`} />
          </div>
        )}

        {tab === "edit" && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => { onUndo(); onClose(); }}
              className="w-full py-3 rounded-2xl bg-rose-50 text-rose-700 font-extrabold text-sm active:scale-95"
            >
              ↺ Un-mark this task (today)
            </button>
            {isParent && (
              <button
                type="button"
                onClick={() => { onEditTask?.(task.id); onClose(); }}
                className="w-full py-3 rounded-2xl bg-indigo-50 text-indigo-700 font-extrabold text-sm active:scale-95"
              >
                ✏️ Edit task settings
              </button>
            )}
            <div className="text-[11px] text-slate-400 px-1 mt-2 leading-snug">
              Un-mark removes only today's completion — yesterday's history stays.
              {isParent && " Edit task changes the activity, stars, or rules for everyone going forward."}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatRow({ label, value }) {
  return (
    <div className="flex items-center justify-between text-sm py-2 px-3 rounded-xl bg-slate-50">
      <span className="text-slate-500">{label}</span>
      <span className="font-bold text-slate-800">{value}</span>
    </div>
  );
}

function CelebrateOverlay({ data, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/55" />
      <div className="relative rounded-3xl p-6 text-center text-white max-w-xs w-full shadow-2xl" style={{ background: `linear-gradient(135deg,${data.color},#ef4444)` }}>
        <div className="text-6xl">🔥</div>
        {data.record && <div className="text-xs font-extrabold tracking-wide bg-white/25 rounded-full px-3 py-1 inline-block mt-2">🏆 NEW RECORD!</div>}
        <div className="text-6xl font-extrabold mt-3 leading-none">{data.streak}</div>
        <div className="text-sm opacity-90 mt-1">day {data.name} streak</div>
        <div className="text-[12px] opacity-90 mt-2">{data.record ? "Longest ever — you're unstoppable! 🐐" : "Don't break the chain! ⛓️"}</div>
        <button onClick={onClose} className="mt-4 w-full py-3 rounded-2xl bg-white font-extrabold active:scale-95" style={{ color: data.color }}>Keep it going! 🚀</button>
      </div>
    </div>
  );
}

function StreakStrip({ streaks, activities }) {
  const top = Object.entries(streaks)
    .map(([id, s]) => ({ ...s, act: activities.find((a) => a.id === id) }))
    .filter((e) => e.act)
    .sort((a, b) => b.current - a.current)[0];
  if (!top) return null;
  return (
    <div className="rounded-2xl p-3 mt-3 flex items-center gap-3 text-white" style={{ background: `linear-gradient(135deg,${top.act.color},#ef4444)` }}>
      <div className="text-2xl">🔥</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-extrabold">{top.current}-day {top.act.short} streak!</div>
        <div className="text-[11px] opacity-90">Best ever: {top.longest}. Keep it alive!</div>
      </div>
    </div>
  );
}

function PiggyBank({ stars }) {
  return (
    <div className="rounded-3xl p-4 flex items-center gap-3" style={{ background: "linear-gradient(135deg,#fce7f3,#fde68a)" }}>
      <div className="relative shrink-0">
        <svg width="58" height="58" viewBox="0 0 64 64" aria-hidden>
          <ellipse cx="31" cy="40" rx="22" ry="16" fill="#f9a8d4" />
          <circle cx="50" cy="35" r="7.5" fill="#f9a8d4" />
          <circle cx="52" cy="35" r="2.2" fill="#be185d" />
          <circle cx="39" cy="33" r="2.6" fill="#831843" />
          <polygon points="20,27 25,17 30,27" fill="#f472b6" />
          <rect x="22" y="22" width="12" height="3.5" rx="1.75" fill="#fbbf24" />
          <rect x="17" y="52" width="4" height="7" rx="2" fill="#f472b6" />
          <rect x="41" y="52" width="4" height="7" rx="2" fill="#f472b6" />
        </svg>
        <Star size={15} className="absolute -top-1 left-2 text-amber-500 fill-amber-400" />
      </div>
      <div className="flex-1">
        <div className="text-[11px] font-bold text-pink-700/70 uppercase tracking-wide">Reznor's Star Bank</div>
        <div className="text-3xl font-extrabold text-pink-700 leading-none">{stars} <span className="text-xl">⭐</span></div>
      </div>
    </div>
  );
}

// ===================== KID: DREAM PLAN (interactive) =====================
function DreamPlan({ rewards, starBank, rewardRequests, addRewardRequest, user }) {
  const active = rewards.filter((r) => r.active);
  const [picked, setPicked] = useState([]);
  const [perDay, setPerDay] = useState(25);
  const [wish, setWish] = useState("");
  const [wishNote, setWishNote] = useState("");
  const [wishOpen, setWishOpen] = useState(false);
  const myWishes = (rewardRequests || []).filter((w) => w.by === user?.id);
  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const chosen = active.filter((r) => picked.includes(r.id)).sort((a, b) => a.starCost - b.starCost);
  const total = chosen.reduce((s, r) => s + r.starCost, 0);
  const need = Math.max(0, total - starBank);
  const days = need <= 0 ? 0 : Math.ceil(need / perDay);
  const pace = perDay <= 15 ? "Chill pace 🐢" : perDay <= 35 ? "Hero pace 🦸" : "Legend pace ⚡";
  let run = 0;
  const WISH_STATUS = { requested: { label: "Waiting for Mom/Dad ⏳", cls: "bg-amber-100 text-amber-600" }, approved: { label: "Approved! 🎉", cls: "bg-emerald-100 text-emerald-600" }, denied: { label: "Not this time", cls: "bg-slate-100 text-slate-400" } };
  return (
    <div className="px-4 pt-4">
      <div className="rounded-3xl p-5 text-white" style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)" }}>
        <div className="flex items-center gap-2 text-sm font-semibold opacity-90"><Target size={16} /> My Dream Plan</div>
        <div className="text-xl font-extrabold mt-1">Pick what you're dreaming of 🌟</div>
        <div className="text-[12px] opacity-90 mt-1">Tap rewards to add them — I'll show you how to get there!</div>
      </div>

      <SectionTitle icon={<Sparkles size={16} className="text-violet-500" />}>Wish for something new</SectionTitle>
      {!wishOpen && <button onClick={() => setWishOpen(true)} className="w-full py-3 rounded-2xl bg-violet-600 text-white font-bold text-sm flex items-center justify-center gap-1"><Plus size={15} /> Make a wish</button>}
      {wishOpen && (
        <Card className="p-4">
          <input value={wish} onChange={(e) => setWish(e.target.value)} placeholder="e.g. Go fishing, visit Alexander in NorCal" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm mb-2" />
          <input value={wishNote} onChange={(e) => setWishNote(e.target.value)} placeholder="Why? (optional)" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm mb-2" />
          <div className="flex gap-2">
            <button onClick={() => { setWishOpen(false); setWish(""); setWishNote(""); }} className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-500 font-bold text-sm">Cancel</button>
            <button disabled={!wish.trim()} onClick={() => { addRewardRequest(wish, wishNote); setWish(""); setWishNote(""); setWishOpen(false); }} className={`flex-1 py-2.5 rounded-xl font-bold text-sm text-white ${wish.trim() ? "bg-violet-600" : "bg-slate-200 text-slate-400"}`}>Send wish ✨</button>
          </div>
          <div className="text-[11px] text-slate-400 mt-2">Mom or Dad will say yes and set how many stars it costs. Then it joins your rewards!</div>
        </Card>
      )}
      {myWishes.length > 0 && (
        <div className="mt-2">
          {myWishes.map((w) => (
            <Card key={w.id} className="p-3 mb-2 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-violet-100 grid place-items-center text-lg">⭐</div>
              <div className="flex-1 min-w-0"><div className="font-bold text-sm">{w.title}</div><div className="text-[11px] text-slate-400">{w.status === "approved" && w.starCost ? `${w.starCost}⭐ — now in your rewards!` : (w.note || "your wish")}</div></div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${WISH_STATUS[w.status].cls}`}>{WISH_STATUS[w.status].label}</span>
            </Card>
          ))}
        </div>
      )}

      <SectionTitle icon={<Gift size={16} className="text-violet-500" />}>Choose your dreams</SectionTitle>
      <div className="flex flex-wrap gap-2">
        {active.map((r) => {
          const on = picked.includes(r.id);
          return <button key={r.id} onClick={() => toggle(r.id)} className={`text-xs font-semibold px-3 py-2 rounded-2xl border transition ${on ? "bg-violet-600 text-white border-violet-600" : "bg-white text-slate-600 border-slate-200"}`}>{r.title} · {r.starCost}⭐</button>;
        })}
      </div>

      {chosen.length === 0 && <p className="text-sm text-slate-400 px-1 mt-4">Tap some dreams above to build your plan! ✨</p>}

      {chosen.length > 0 && (
        <>
          <Card className="p-4 mt-4">
            <div className="flex items-center justify-between text-sm"><span className="text-slate-500">Total dream cost</span><span className="font-extrabold">{total} ⭐</span></div>
            <div className="flex items-center justify-between text-sm mt-1"><span className="text-slate-500">You have</span><span className="font-bold text-emerald-600">{starBank} ⭐</span></div>
            <div className="flex items-center justify-between text-sm mt-1"><span className="text-slate-500">Still need</span><span className="font-bold text-amber-600">{need} ⭐</span></div>
            <div className="h-3 bg-slate-100 rounded-full mt-3 overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${total ? Math.min(100, (starBank / total) * 100) : 0}%`, background: "linear-gradient(90deg,#6366f1,#a855f7)" }} /></div>
          </Card>

          <Card className="p-4 mt-3">
            <div className="flex items-center justify-between"><span className="text-sm font-bold">If I earn each day…</span><span className="text-sm font-extrabold text-violet-600">{perDay} ⭐/day</span></div>
            <input type="range" min={5} max={80} step={5} value={perDay} onChange={(e) => setPerDay(Number(e.target.value))} className="w-full mt-2 accent-violet-600" />
            <div className="text-[11px] text-slate-400">{pace}</div>
          </Card>

          <div className="rounded-3xl p-5 mt-3 text-center text-white" style={{ background: "linear-gradient(135deg,#10b981,#06b6d4)" }}>
            {need <= 0 ? (
              <><div className="text-lg font-extrabold">You can get it all now! 🎉</div><div className="text-sm opacity-90">Ask Mom or Dad to redeem.</div></>
            ) : (
              <><div className="text-4xl font-extrabold">{days} days</div><div className="text-sm opacity-90 mt-1">to all your dreams — around {fmtDateObj(addDays(today, days))} 🚀</div></>
            )}
          </div>

          <SectionTitle icon={<Trophy size={16} className="text-amber-500" />}>Unlock order</SectionTitle>
          {chosen.map((r) => {
            run += r.starCost;
            const left = Math.max(0, run - starBank);
            const dd = left <= 0 ? 0 : Math.ceil(left / perDay);
            return (
              <Card key={r.id} className="p-3 mb-2 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-violet-100 grid place-items-center text-lg">🎁</div>
                <div className="flex-1"><div className="font-bold text-sm">{r.title}</div><div className="text-[11px] text-slate-400">{r.starCost} ⭐</div></div>
                <div className="text-sm font-extrabold text-violet-600">{dd === 0 ? "Ready!" : `${dd} d`}</div>
              </Card>
            );
          })}
          <div className="text-[11px] text-slate-400 px-1 mt-1 mb-2">Drag the slider to see how a little more each day gets you there faster. 💪</div>
        </>
      )}
    </div>
  );
}

// ===================== KID: STREAKS (the addictive part) =====================
function KidStreaks({ activities, streaks }) {
  const entries = Object.entries(streaks)
    .map(([id, s]) => ({ ...s, id, act: activities.find((a) => a.id === id) }))
    .filter((e) => e.act)
    .sort((a, b) => b.current - a.current);
  return (
    <div className="px-4 pt-4">
      <div className="rounded-3xl p-5 text-white relative overflow-hidden" style={{ background: "linear-gradient(135deg,#f97316,#ef4444)" }}>
        <div className="text-5xl absolute -right-1 -top-2 opacity-30">🔥</div>
        <div className="text-sm font-semibold opacity-90">Don't break the chain! ⛓️</div>
        <div className="text-2xl font-extrabold mt-1">Your Streaks</div>
        <div className="text-[12px] opacity-90 mt-1">Do it every single day and watch the fire grow.</div>
      </div>
      {entries.length === 0 && <p className="text-sm text-slate-400 px-1 mt-4">No streaks yet — ask a parent to start tracking one!</p>}
      {entries.map((e, i) => <StreakCard key={e.id} e={e} hero={i === 0} />)}
    </div>
  );
}

function StreakCard({ e, hero }) {
  const info = streakInfo(e.current);
  const c = e.act.color;
  return (
    <Card className="p-0 overflow-hidden mt-3">
      <div className="p-4" style={{ background: hero ? c + "12" : "white" }}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl grid place-items-center text-2xl" style={{ background: c + "22" }}>🔥</div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm">{e.act.name}</div>
            <div className="text-[11px] text-slate-400">Best ever: {e.longest} days{e.since ? ` · since ${fmtShort(e.since)}` : ""}</div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-4xl font-extrabold leading-none" style={{ color: c }}>{e.current}</div>
            <div className="text-[10px] text-slate-400">day streak</div>
          </div>
        </div>

        {info.next ? (
          <>
            <div className="flex items-center justify-between text-[11px] mt-3 mb-1">
              <span className="text-slate-400">Next badge: {info.next.emoji} {info.next.label}</span>
              <span className="font-bold" style={{ color: c }}>{info.next.d - e.current} to go</span>
            </div>
            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${info.pct}%`, background: c }} /></div>
          </>
        ) : <div className="text-[11px] font-bold mt-3" style={{ color: c }}>🐐 Maxed out — total legend!</div>}

        <div className="grid grid-cols-5 gap-1.5 mt-3">
          {STREAK_TIERS.map((t) => {
            const got = e.current >= t.d;
            return (
              <div key={t.d} className={`flex flex-col items-center justify-center py-1.5 rounded-xl ${got ? "" : "opacity-30 grayscale"}`} style={{ background: got ? c + "18" : "#f1f5f9" }} title={`${t.d} days · ${t.label}`}>
                <div className="text-lg leading-none">{t.emoji}</div>
                <div className="text-[9px] font-bold text-slate-500 mt-0.5">{t.d}{t.big ? "★" : ""}</div>
              </div>
            );
          })}
        </div>
        {hero && <div className="text-[10px] text-slate-400 mt-2">★ = big reward milestone 🎁</div>}
      </div>
    </Card>
  );
}

// ===================== TASK SHEET (submit flow) =====================
function TaskSheet({ task, existing, role, onClose, onSubmit, familyId, songs, songPlays, addSong, addSongPlay }) {
  const [notes, setNotes] = useState(existing?.notes || "");
  const [bookTitle, setBookTitle] = useState(existing?.extra?.bookTitle || "");
  const [lang, setLang] = useState(existing?.extra?.lang || "English");
  const [minutes, setMinutes] = useState(existing?.extra?.minutes || task.minutes);
  const [photo, setPhoto] = useState(existing?.proof?.[0] || null);
  const [uploading, setUploading] = useState(false);
  const [drumeo, setDrumeo] = useState("");
  const [melodics, setMelodics] = useState("");
  const [songList, setSongList] = useState("");
  const [title, setTitle] = useState("");

  const isReading = task.proofType === "reading";
  const isDrums = task.proofType === "drums";
  const isPhoto = task.proofType === "photo";

  // Upload the file to family-photos under <familyId>/proof/ and store
  // the returned path on the photo object. The legacy `url` field is
  // omitted; display code resolves path → signed URL on demand.
  const handleFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      const { path, name } = await uploadFamilyPhoto({ file: f, familyId, kind: "proof" });
      setPhoto({ type: "photo", name, path });
    } catch (err) {
      alert("Photo upload failed: " + (err.message || err));
    } finally {
      setUploading(false);
    }
  };
  const photoPreview = useSignedUrl(photo?.path);

  // gates
  let ready = true;
  let gateMsg = "";
  if (uploading) { ready = false; gateMsg = "Photo still uploading…"; }
  if (isReading && !bookTitle.trim()) { ready = false; gateMsg = "Enter the book title to submit."; }
  if (isPhoto && !photo) { ready = false; gateMsg = "Add a photo of your work to submit."; }
  if (isDrums && (!drumeo && !melodics && !songList)) { ready = false; gateMsg = "Log at least one of Drumeo / Melodics / songs."; }

  const doSubmit = () => {
    // Strip any legacy preview URL from the stored proof item.
    const proof = photo ? [{ type: "photo", name: photo.name, path: photo.path }] : [];
    const extra = {};
    if (isReading) Object.assign(extra, { bookTitle, lang, minutes });
    if (isPhoto) Object.assign(extra, { title });
    if (isDrums) Object.assign(extra, { drumeo, melodics, songList, totalMin: (Number(drumeo) || 0) + (Number(melodics) || 0) });
    onSubmit(task.id, { notes, proof, extra });
  };

  const alreadyApproved = existing?.status === "approved";

  // Slide-up + drag-to-dismiss. `visible` flips true on the next frame
  // after mount so the sheet animates UP from translateY(100%) instead
  // of being there on first paint. handleClose runs the reverse animation
  // before calling parent onClose so the dismiss isn't a snap-cut.
  // Reduced-motion users skip the animation timing — the sheet just
  // appears/disappears.
  const reduced = useRef(typeof window !== "undefined" && window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false).current;
  const [visible, setVisible] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef(null);
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const ANIM_MS = reduced ? 0 : 280;
  const handleClose = () => {
    if (reduced) { onClose(); return; }
    setVisible(false);
    setTimeout(onClose, ANIM_MS);
  };
  // Pointer events on the handle row — only the top strip drags. Lets
  // the inner content area still scroll normally on long forms.
  const onHandleDown = (e) => {
    dragStart.current = { y: e.clientY, t: Date.now() };
    setDragging(true);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
  };
  const onHandleMove = (e) => {
    if (!dragStart.current) return;
    const dy = e.clientY - dragStart.current.y;
    setDragOffset(Math.max(0, dy));
  };
  const onHandleUp = (e) => {
    if (!dragStart.current) return;
    const dy = e.clientY - dragStart.current.y;
    const dt = Date.now() - dragStart.current.t;
    const velocity = dy / Math.max(1, dt); // px/ms
    dragStart.current = null;
    setDragging(false);
    if (dy > 120 || velocity > 0.5) {
      handleClose();
    } else {
      setDragOffset(0); // snap back via the transition
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center" style={{ fontFamily: "inherit" }}>
      <div
        onClick={handleClose}
        className="absolute inset-0"
        style={{
          background: "rgba(15, 23, 42, 0.5)",
          backdropFilter: visible ? "blur(6px)" : "blur(0px)",
          WebkitBackdropFilter: visible ? "blur(6px)" : "blur(0px)",
          opacity: visible ? 1 : 0,
          transition: `opacity ${ANIM_MS}ms ease-out, backdrop-filter ${ANIM_MS}ms ease-out, -webkit-backdrop-filter ${ANIM_MS}ms ease-out`,
        }}
      />
      <div
        className="relative w-full max-w-md bg-white rounded-t-3xl p-5 max-h-[88vh] overflow-y-auto shadow-2xl"
        style={{
          transform: visible ? `translateY(${dragOffset}px)` : "translateY(100%)",
          // During an active drag the sheet must track the finger 1:1 with
          // no easing. On release / mount / dismiss the transition kicks
          // back in for a clean slide.
          transition: dragging ? "none" : `transform ${ANIM_MS}ms cubic-bezier(.32,.72,0,1)`,
          willChange: "transform",
        }}
      >
        <div
          onPointerDown={onHandleDown}
          onPointerMove={onHandleMove}
          onPointerUp={onHandleUp}
          onPointerCancel={onHandleUp}
          className="pt-1 pb-2 -mx-5 -mt-5 px-5 mb-2 cursor-grab active:cursor-grabbing touch-none"
          // touch-none + the pointer capture above stop iOS Safari from
          // hijacking the gesture as a page scroll while the user is
          // dragging the handle bar down.
        >
          <div className="w-10 h-1.5 bg-slate-200 rounded-full mx-auto mt-2" />
        </div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-11 h-11 rounded-2xl bg-amber-100 grid place-items-center"><TaskIcon type={task.activityType} /></div>
          <div>
            <div className="font-extrabold text-lg">{task.title}</div>
            <div className="text-xs text-slate-400">{task.minutes} min · worth {task.starValue} ⭐{task.bonusStarValue ? ` (+${task.bonusStarValue} bonus possible)` : ""}</div>
          </div>
        </div>

        {alreadyApproved && (
          <div className="mt-4 bg-emerald-50 text-emerald-700 rounded-2xl p-3 text-sm font-semibold flex items-center gap-2"><Check size={16} /> Approved — {existing.awardedStars} ⭐ banked! 🎉</div>
        )}

        {!alreadyApproved && (
          <div className="mt-4 space-y-3">
            {isReading && (
              <>
                <Field label="Book title *"><input value={bookTitle} onChange={(e) => setBookTitle(e.target.value)} placeholder="e.g. Dog Man" className="input" /></Field>
                <div className="flex gap-2">
                  <button onClick={() => setLang("English")} className={`flex-1 py-2 rounded-2xl text-sm font-semibold ${lang === "English" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>English</button>
                  <button onClick={() => setLang("Spanish")} className={`flex-1 py-2 rounded-2xl text-sm font-semibold ${lang === "Spanish" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>Spanish 🇪🇸</button>
                </div>
                <Field label="Minutes read"><input type="number" value={minutes} onChange={(e) => setMinutes(e.target.value)} className="input" /></Field>
                <div className="text-[11px] text-slate-400 flex items-center gap-1"><Camera size={12} /> TODO: book-cover scanner to auto-fill title</div>
              </>
            )}

            {isPhoto && (
              <>
                <Field label="Title (optional)"><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Name your work" className="input" /></Field>
                <label className="block">
                  <div className="text-xs font-semibold text-slate-500 mb-1">Photo of your work *</div>
                  <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 flex flex-col items-center gap-2 cursor-pointer hover:bg-slate-50">
                    {photoPreview ? <img src={photoPreview} alt="proof" className="h-28 rounded-xl object-cover" /> : <Camera size={28} className="text-slate-300" />}
                    <span className="text-xs text-slate-400">{uploading ? "Uploading…" : (photo ? photo.name : "Tap to add a photo")}</span>
                    <input type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
                  </div>
                </label>
              </>
            )}

            {isDrums && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Drumeo min"><input type="number" value={drumeo} onChange={(e) => setDrumeo(e.target.value)} className="input" /></Field>
                  <Field label="Melodics min"><input type="number" value={melodics} onChange={(e) => setMelodics(e.target.value)} className="input" /></Field>
                </div>
                <Field label="Drumscribe / YouTube songs"><input value={songList} onChange={(e) => setSongList(e.target.value)} placeholder="Song 1, Song 2…" className="input" /></Field>
                {addSongPlay && (
                  <SongLogger
                    songs={songs || []}
                    songPlays={songPlays || []}
                    addSong={addSong}
                    addSongPlay={addSongPlay}
                    fuzzyMatch={fuzzyMatch}
                  />
                )}
                <div className="bg-amber-50 rounded-2xl p-3 text-xs text-amber-700">🎯 Goal: 1 hour · Stretch: 2 hours. Parent can adjust stars for effort.</div>
                <label className="block">
                  <div className="text-xs font-semibold text-slate-500 mb-1">Screenshot proof (Drumeo/Melodics)</div>
                  <div className="border-2 border-dashed border-slate-200 rounded-2xl p-3 flex items-center gap-2 cursor-pointer hover:bg-slate-50">
                    {photoPreview ? <img src={photoPreview} alt="proof" className="h-12 rounded object-cover" /> : <Camera size={20} className="text-slate-300" />}
                    <span className="text-xs text-slate-400">{uploading ? "Uploading…" : (photo ? photo.name : "Add screenshot")}</span>
                    <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
                  </div>
                </label>
              </>
            )}

            <Field label="Note (optional)"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="input resize-none" placeholder="Anything to tell a grown-up?" /></Field>

            {!ready && <div className="text-xs text-rose-500 flex items-center gap-1"><AlertCircle size={13} /> {gateMsg}</div>}

            <button disabled={!ready} onClick={doSubmit}
              className={`w-full py-4 rounded-2xl font-extrabold text-white text-base transition ${ready ? "bg-emerald-500 active:scale-95" : "bg-slate-200 text-slate-400"}`}>
              {task.approvalRequired ? "Submit for Stars ⭐" : "Mark Done ✓"}
            </button>
            <button onClick={handleClose} className="w-full py-2 text-slate-400 text-sm font-semibold">Cancel</button>
          </div>
        )}
        {alreadyApproved && <button onClick={handleClose} className="w-full py-3 mt-4 text-slate-400 text-sm font-semibold">Close</button>}
      </div>
      <style>{`.input{width:100%;border:1px solid #e2e8f0;border-radius:1rem;padding:0.6rem 0.8rem;font-size:0.9rem;outline:none}.input:focus{border-color:#6366f1}`}</style>
    </div>
  );
}
function Field({ label, children }) {
  return <div><div className="text-xs font-semibold text-slate-500 mb-1">{label}</div>{children}</div>;
}

// ===================== DETAIL SHEET (parent: stats, history, media, notes, edit) =====================
const pad2 = (n) => String(n).padStart(2, "0");

// Fun habit-graph: connected circles for done days + a weekly rollup column. Works per activity.
function HistoryCalendar({ activityId, color, streaks }) {
  const [ym, setYm] = useState({ y: 2026, m: 5 }); // June 2026
  const s = streaks[activityId];
  const hist = SEED_HISTORY[activityId];
  const trackedSince = hist ? new Date(hist[0] + "T12:00") : (s?.since ? new Date(s.since + "T12:00") : null);
  const doneOn = (iso) => {
    if (hist) return hist.includes(iso);
    if (s && s.current > 0) {
      const last = new Date((s.lastDate || TODAY_ISO) + "T12:00");
      const start = new Date(last); start.setDate(last.getDate() - (s.current - 1));
      const dt = new Date(iso + "T12:00");
      return dt >= start && dt <= last;
    }
    return false;
  };
  const isoOf = (dd) => `${ym.y}-${pad2(ym.m + 1)}-${pad2(dd)}`;
  const first = new Date(ym.y, ym.m, 1);
  const daysIn = new Date(ym.y, ym.m + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7; // Monday-start
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let dd = 1; dd <= daysIn; dd++) cells.push(dd);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  let monthDone = 0;
  for (let dd = 1; dd <= daysIn; dd++) { const iso = isoOf(dd); if (new Date(iso + "T12:00") <= today && doneOn(iso)) monthDone++; }
  const wkStart = new Date(today); wkStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  let weekDone = 0;
  for (let i = 0; i < 7; i++) { const dt = new Date(wkStart); dt.setDate(wkStart.getDate() + i); if (dt <= today && doneOn(`${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`)) weekDone++; }

  const prev = () => setYm((p) => p.m === 0 ? { y: p.y - 1, m: 11 } : { y: p.y, m: p.m - 1 });
  const next = () => setYm((p) => (p.y === 2026 && p.m >= 5) ? p : (p.m === 11 ? { y: p.y + 1, m: 0 } : { y: p.y, m: p.m + 1 }));

  return (
    <>
      <Card className="p-3">
        <div className="flex items-center justify-between mb-2">
          <button onClick={prev} className="w-8 h-8 rounded-lg bg-slate-100 grid place-items-center"><ChevronLeft size={16} /></button>
          <div className="font-bold text-sm">{first.toLocaleString("en-US", { month: "long", year: "numeric" })}</div>
          <button onClick={next} className="w-8 h-8 rounded-lg bg-slate-100 grid place-items-center"><ChevronLeft size={16} className="rotate-180" /></button>
        </div>
        <div className="flex text-[9px] text-slate-400 mb-1">
          <div className="grid grid-cols-7 flex-1 text-center">{["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((x, i) => <div key={i}>{x}</div>)}</div>
          <div className="w-8 text-center">Wk</div>
        </div>
        {weeks.map((wk, wi) => {
          const doneArr = wk.map((dd) => dd ? (doneOn(isoOf(dd)) && new Date(isoOf(dd) + "T12:00") <= today) : false);
          const runs = []; let i = 0;
          while (i < 7) { if (doneArr[i]) { let j = i; while (j + 1 < 7 && doneArr[j + 1]) j++; runs.push([i, j]); i = j + 1; } else i++; }
          const wkCount = doneArr.filter(Boolean).length;
          const anyPast = wk.some((dd) => dd && new Date(isoOf(dd) + "T12:00") <= today);
          return (
            <div key={wi} className="flex items-center">
              <div className="relative flex-1 h-10">
                {runs.map((r, ri) => <div key={ri} className="absolute top-1/2 -translate-y-1/2 rounded-full z-0" style={{ left: `${r[0] / 7 * 100}%`, width: `${(r[1] - r[0] + 1) / 7 * 100}%`, height: 30, background: color + "44" }} />)}
                <div className="relative z-10 grid grid-cols-7 h-10">
                  {wk.map((dd, di) => {
                    if (!dd) return <div key={di} />;
                    const iso = isoOf(dd);
                    const dt = new Date(iso + "T12:00");
                    const future = dt > today;
                    const isToday = iso === TODAY_ISO;
                    const beforeTrack = trackedSince && dt < trackedSince;
                    const done = doneOn(iso) && !future;
                    return (
                      <div key={di} className="grid place-items-center">
                        {done
                          ? <div className="w-8 h-8 rounded-full grid place-items-center text-[12px] font-bold text-white" style={{ background: color }}>{dd}</div>
                          : <div className="w-8 h-8 rounded-full grid place-items-center text-[12px] font-bold" style={{ color: future ? "#cbd5e1" : beforeTrack ? "#94a3b8" : "#64748b", outline: isToday ? `2px solid ${color}` : "none", outlineOffset: "-2px" }}>{dd}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="w-8 grid place-items-center">
                {anyPast && wkCount > 0
                  ? <div className="w-6 h-6 rounded-full grid place-items-center text-[11px] font-extrabold text-white" style={{ background: color }}>{wkCount}</div>
                  : <div className="w-6 h-6 rounded-full bg-slate-100 grid place-items-center text-slate-300 text-[11px]">–</div>}
              </div>
            </div>
          );
        })}
        <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full" style={{ background: color }} /> did it</span>
          <span>Wk = days that week</span>
        </div>
      </Card>
      <div className="grid grid-cols-3 gap-2 mt-3">
        <Card className="p-3 text-center"><div className="text-2xl font-extrabold" style={{ color }}>{weekDone}</div><div className="text-[11px] text-slate-400">this week</div></Card>
        <Card className="p-3 text-center"><div className="text-2xl font-extrabold text-slate-700">{monthDone}</div><div className="text-[11px] text-slate-400">this month</div></Card>
        <Card className="p-3 text-center"><div className="text-2xl font-extrabold text-orange-500">🔥{s?.current ?? 0}</div><div className="text-[11px] text-slate-400">streak</div></Card>
      </div>
    </>
  );
}

function DetailSheet({ task, onClose, activities, streaks, completions, priorities, setPriority, clearPriority, updateTask, removeTask, setStreak, stopStreak, bumpStreak, taskNotes, addTaskNote, users }) {
  const d = actFor(task, activities);
  const aid = task.activityId || TYPE_TO_ACT[task.activityType];
  const s = streaks[aid];
  const ov = priorities?.[task.id];
  const [note, setNote] = useState("");
  const [tab, setTab] = useState("stats");
  const notes = taskNotes?.[task.id] || [];
  const proofs = completions.filter((c) => c.taskId === task.id).flatMap((c) => (c.proof || []).filter((p) => p.path || p.url));
  const { handleClose, dragHandlers, backdropStyle, sheetStyle } = useBottomSheet({ onClose });

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <div onClick={handleClose} className="absolute inset-0" style={backdropStyle} />
      <div className="relative w-full max-w-md bg-slate-50 rounded-t-3xl max-h-[92vh] overflow-y-auto shadow-2xl" style={sheetStyle}>
        {/* header — drag-handle pill on top of the colored header bar */}
        <div className="sticky top-0 z-10" style={{ background: d.color }}>
          <div {...dragHandlers} className="pt-2 pb-1 cursor-grab active:cursor-grabbing touch-none">
            <div className="w-10 h-1.5 bg-white/40 rounded-full mx-auto" />
          </div>
          <div className="p-4 pt-2 text-white flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 grid place-items-center"><TaskIcon type={task.activityType} color="#ffffff" /></div>
            <div className="flex-1 min-w-0">
              <div className="font-extrabold text-lg leading-tight">{task.title}</div>
              <div className="text-[12px] opacity-90">{d.label} · {task.starValue}⭐{task.required ? " · required" : " · optional"}</div>
            </div>
            <button onClick={handleClose} className="w-8 h-8 rounded-full bg-white/20 grid place-items-center"><X size={18} /></button>
          </div>
          <div className="flex">
            {[["stats", "Stats"], ["media", "Photos"], ["notes", "Notes"], ["edit", "Edit"]].map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} className={`flex-1 py-2.5 text-sm font-bold ${tab === k ? "bg-slate-50 text-slate-800" : "text-white/80"}`} style={tab === k ? { borderTopLeftRadius: 0 } : {}}>{l}{k === "media" && proofs.length ? ` (${proofs.length})` : ""}{k === "notes" && notes.length ? ` (${notes.length})` : ""}</button>
            ))}
          </div>
        </div>

        <div className="p-4">
          {tab === "stats" && (
            <>
              {s && <div className="grid grid-cols-2 gap-2 mb-3">
                <Card className="p-3 text-center"><div className="text-2xl font-extrabold text-orange-500">🔥{s.current}</div><div className="text-[11px] text-slate-400">current streak</div></Card>
                <Card className="p-3 text-center"><div className="text-2xl font-extrabold text-slate-700">{s.longest}</div><div className="text-[11px] text-slate-400">best ever</div></Card>
              </div>}
              <HistoryCalendar activityId={aid} color={d.color} streaks={streaks} />
              <div className="text-[11px] text-slate-400 px-1 mt-2">Filled = he did it, connected across the week. The <b>Wk</b> column shows how many days that week. Tap ‹ › to scroll months.</div>
            </>
          )}

          {tab === "media" && (
            <>
              {proofs.length === 0 && <Card className="p-6 text-center text-slate-400 text-sm">No photos or videos yet. Sara or a parent can snap one from the checklist — it'll show here with the date & place. 📷</Card>}
              <div className="grid grid-cols-2 gap-2">
                {proofs.map((p, i) => (
                  <div key={i} className="rounded-xl overflow-hidden">
                    <StoredPhoto path={p.path} url={p.url} alt="" className="w-full h-32 object-cover" fallback={<div className="w-full h-32 bg-slate-100 animate-pulse" />} />
                    {p.geo && <div className="text-[10px] text-slate-400 mt-0.5">📍 {p.geo.label}{p.time ? ` · ${p.time}` : ""}</div>}
                  </div>
                ))}
              </div>
              <div className="text-[11px] text-slate-400 px-1 mt-2">Photos & videos uploaded for this build the year-long portfolio. (TODO: video playback + cloud storage in the real build.)</div>
            </>
          )}

          {tab === "notes" && (
            <>
              <Card className="p-3 mb-2">
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Add a note about this — progress, what to work on, what the teacher said…" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none" />
                <button onClick={() => { addTaskNote(task.id, note); setNote(""); }} disabled={!note.trim()} className={`w-full mt-2 py-2.5 rounded-xl font-bold text-sm text-white ${note.trim() ? "bg-indigo-600" : "bg-slate-200 text-slate-400"}`}>Add note</button>
              </Card>
              {notes.length === 0 && <p className="text-sm text-slate-400 px-1">No notes yet.</p>}
              {notes.map((n, i) => (
                <Card key={i} className="p-3 mb-2 text-sm">
                  <div className="text-[11px] text-slate-400 mb-0.5">{users.find((u) => u.id === n.by)?.name || "Parent"} · {n.time}</div>
                  {n.text}
                </Card>
              ))}
            </>
          )}

          {tab === "edit" && (
            <>
              <Card className="p-3 mb-2">
                <div className="flex items-center justify-between"><span className="text-sm font-semibold">Star value</span>
                  <div className="flex items-center gap-1"><input type="number" value={task.starValue} onChange={(e) => updateTask(task.id, { starValue: Number(e.target.value) })} className="w-16 border border-slate-200 rounded px-2 py-1 text-sm" /><span className="text-xs">⭐</span></div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <button onClick={() => updateTask(task.id, { required: !task.required })} className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${task.required ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-400"}`}>{task.required ? "Required" : "Optional"}</button>
                  <button onClick={() => updateTask(task.id, { proofRequired: !task.proofRequired, proofType: !task.proofRequired ? (task.proofType || "photo") : task.proofType })} className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${task.proofRequired ? "bg-sky-100 text-sky-600" : "bg-slate-100 text-slate-400"}`}>{task.proofRequired ? "Needs photo" : "No proof"}</button>
                </div>
              </Card>

              <Card className="p-3 mb-2">
                <div className="text-sm font-semibold mb-1">Priority</div>
                <div className="flex gap-1.5 flex-wrap">
                  {[["must", "Non-negotiable"], ["today", "Do today"], ["extra", "Extra credit"]].map(([k, l]) => <button key={k} onClick={() => setPriority(task.id, k, ov?.scope || "today")} className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={ov?.level === k ? { background: PRIORITY[k].dot, color: "#fff" } : { background: "#f1f5f9", color: "#64748b" }}>{l}</button>)}
                  <button onClick={() => clearPriority(task.id)} className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-400">Clear</button>
                </div>
                {ov?.level && (
                  <div className="flex gap-1.5 flex-wrap mt-2">
                    {[["today", "Today"], ["week", "This week"], ["month", "This month"], ["always", "Always"]].map(([k, l]) => <button key={k} onClick={() => setPriority(task.id, ov.level, k)} className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${ov.scope === k ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>{l}</button>)}
                  </div>
                )}
              </Card>

              <Card className="p-3 mb-2">
                <div className="text-sm font-semibold mb-2 flex items-center gap-1"><Flame size={15} className="text-orange-500" /> Streak</div>
                {s ? (
                  <>
                    <div className="flex gap-2">
                      <label className="flex-1 text-[11px] font-semibold text-slate-500">Current<input type="number" value={s.current} onChange={(e) => setStreak(aid, { current: Number(e.target.value) })} className="w-full mt-0.5 border border-slate-200 rounded-lg px-2 py-1 text-sm" /></label>
                      <label className="flex-1 text-[11px] font-semibold text-slate-500">Best<input type="number" value={s.longest} onChange={(e) => setStreak(aid, { longest: Number(e.target.value) })} className="w-full mt-0.5 border border-slate-200 rounded-lg px-2 py-1 text-sm" /></label>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => bumpStreak(aid)} className="flex-1 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-bold">+1 day today</button>
                      <button onClick={() => stopStreak(aid)} className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-500 text-xs font-bold">Stop</button>
                    </div>
                  </>
                ) : (
                  <button onClick={() => setStreak(aid, { current: 0, longest: 0, since: TODAY_ISO, lastDate: "" })} className="text-[11px] font-bold text-orange-600">Start tracking a streak →</button>
                )}
              </Card>

              <div className="flex gap-2">
                <button onClick={() => updateTask(task.id, { active: task.active === false })} className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm">{task.active === false ? "Un-pause task" : "Pause task"}</button>
                <button onClick={() => removeTask(task.id)} className="px-4 py-2.5 rounded-xl bg-rose-100 text-rose-600 font-bold text-sm flex items-center gap-1"><X size={15} /> Remove</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ===================== PARENT: ACTIVITY PROGRESS =====================
function ProgressSheet({ activity, streaks, onClose }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-slate-50 rounded-t-3xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 z-10 p-4 text-white flex items-center gap-3" style={{ background: activity.color }}>
          <div className="w-11 h-11 rounded-2xl bg-white/20 grid place-items-center text-xl">{PILLARS[activity.pillar]?.emoji}</div>
          <div className="flex-1 min-w-0"><div className="font-extrabold text-lg leading-tight">{activity.name}</div><div className="text-[12px] opacity-90">progress & consistency</div></div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 grid place-items-center"><X size={18} /></button>
        </div>
        <div className="p-4">
          <HistoryCalendar activityId={activity.id} color={activity.color} streaks={streaks} />
          <div className="text-[11px] text-slate-400 px-1 mt-2">Filled = he did it. The <b>Wk</b> column shows how many days that week — spot which weeks ran hot. 🔥</div>
        </div>
      </div>
    </div>
  );
}

// ===================== KID: REWARDS =====================
function RewardsKid({ rewards, starBank, requestReward, redemptions }) {
  const sorted = rewards.filter((r) => r.active !== false).sort((a, b) => a.starCost - b.starCost);
  return (
    <div className="px-4 pt-4">
      <div className="rounded-3xl p-5 text-white text-center" style={{ background: "linear-gradient(135deg,#8b5cf6,#6366f1)" }}>
        <Gift size={28} className="mx-auto" />
        <div className="text-3xl font-extrabold mt-1">{starBank} ⭐</div>
        <div className="text-sm opacity-90">in your star bank</div>
      </div>
      <SectionTitle icon={<Trophy size={16} className="text-amber-500" />}>Rewards to work toward</SectionTitle>
      {sorted.map((r) => {
        const afford = starBank >= r.starCost;
        const remaining = r.starCost - starBank;
        const reqd = redemptions.find((x) => x.rewardId === r.id);
        return (
          <Card key={r.id} className="p-4 mb-2.5 flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-violet-100 grid place-items-center text-xl">🎁</div>
            <div className="flex-1">
              <div className="font-bold text-sm">{r.title}</div>
              <div className="text-[11px] text-slate-400">{afford ? "You can get this! 🎉" : `${remaining} more ⭐ to go`}</div>
              {!afford && <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-violet-400" style={{ width: `${Math.min(100, (starBank / r.starCost) * 100)}%` }} /></div>}
            </div>
            <div className="text-right">
              <StarPill n={r.starCost} tone={afford ? "emerald" : "slate"} />
              {afford && !reqd && <button onClick={() => requestReward(r)} className="block mt-1 text-[11px] font-bold text-violet-600">Ask →</button>}
              {reqd && <div className="text-[10px] mt-1 font-semibold text-amber-600">{reqd.status === "requested" ? "Asked!" : reqd.status}</div>}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function KidStars({ completions, tasks, starBank, earnedToday, pendingStars, gifted, activities, todaysTasks, compByTask, streaks, books, songs, songPlays, removeSongPlay, setStatDetailId }) {
  const approved = completions.filter((c) => c.status === "approved");
  const ctx = buildAchCtx({ completions, todaysTasks: todaysTasks || [], compByTask: compByTask || {}, starBank, streaks, books });
  const dayWins = ACHIEVEMENTS.filter((a) => a.kind === "day");
  const trophies = ACHIEVEMENTS.filter((a) => a.kind === "trophy");
  const wonToday = dayWins.filter((a) => a.test(ctx)).length;
  return (
    <div className="px-4 pt-4">
      <PiggyBank stars={starBank} />
      <div className="grid grid-cols-2 gap-2 mt-3">
        <BigStat label="Earned today" value={earnedToday} onClick={() => setStatDetailId?.("earned")} />
        <BigStat label="Pending" value={pendingStars} onClick={() => setStatDetailId?.("pending")} />
      </div>

      <SectionTitle icon={<Sparkles size={16} className="text-amber-500" />}>Today's wins <span className="text-[11px] font-normal text-slate-400">· {wonToday}/{dayWins.length}</span></SectionTitle>
      <div className="grid grid-cols-3 gap-2">
        {dayWins.map((a) => {
          const won = a.test(ctx);
          return (
            <div key={a.id} className={`rounded-2xl p-3 text-center ${won ? "bg-amber-50 border border-amber-200" : "bg-slate-50 border border-slate-100 opacity-60"}`}>
              <div className="text-3xl" style={{ filter: won ? "none" : "grayscale(1)" }}>{a.emoji}</div>
              <div className="text-[11px] font-bold mt-1 leading-tight">{a.title}</div>
              <div className="text-[9px] text-slate-400 leading-tight mt-0.5">{a.desc}</div>
            </div>
          );
        })}
      </div>

      <MostPlayedSongs songs={songs || []} songPlays={songPlays || []} removeSongPlay={removeSongPlay} />

      <SectionTitle icon={<Medal size={16} className="text-violet-500" />}>Trophy case</SectionTitle>
      <div className="grid grid-cols-3 gap-2">
        {trophies.map((a) => {
          const won = a.test(ctx);
          const showProg = !won && a.goal;
          const v = showProg ? a.val(ctx) : 0;
          return (
            <div key={a.id} className={`rounded-2xl p-3 text-center relative ${won ? "bg-violet-50 border border-violet-200" : "bg-slate-50 border border-slate-100"}`}>
              {!won && <Lock size={11} className="absolute top-2 right-2 text-slate-300" />}
              <div className="text-3xl" style={{ filter: won ? "none" : "grayscale(1) opacity(0.5)" }}>{a.emoji}</div>
              <div className="text-[11px] font-bold mt-1 leading-tight">{a.title}</div>
              <div className="text-[9px] text-slate-400 leading-tight mt-0.5">{a.desc}</div>
              {showProg && <div className="mt-1 h-1 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-violet-400" style={{ width: `${Math.min(100, (v / a.goal) * 100)}%` }} /></div>}
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-slate-400 px-1 mt-2">Win badges every single day — even before the big rewards. 🎉</p>

      {gifted?.length > 0 && (
        <>
          <SectionTitle icon={<Sparkles size={16} className="text-amber-500" />}>Bonus stars 🎁</SectionTitle>
          {gifted.map((g) => (
            <Card key={g.id} className="p-3 mb-2 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 grid place-items-center">✨</div>
              <div className="flex-1 text-sm font-semibold">{g.label}<span className="block text-[11px] text-slate-400 font-normal">surprise stars!</span></div>
              <StarPill n={g.stars} tone="emerald" />
            </Card>
          ))}
        </>
      )}
      <SectionTitle icon={<Award size={16} className="text-emerald-500" />}>Stars I've earned</SectionTitle>
      {approved.length === 0 && <p className="text-sm text-slate-400 px-1">Nothing approved yet — go finish a mission! 🚀</p>}
      {approved.map((c) => {
        const t = tasks.find((x) => x.id === c.taskId);
        const d = actFor(t || { activityType: "" }, activities);
        return (
          <Card key={c.id} className="p-3 mb-2 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl grid place-items-center" style={{ background: d.tint }}><TaskIcon type={t?.activityType} color={d.color} /></div>
            <div className="flex-1 text-sm font-semibold">{t?.title}{c.extra?.bookTitle && <span className="block text-[11px] text-slate-400 font-normal">{c.extra.bookTitle}</span>}</div>
            <StarPill n={c.awardedStars} tone="emerald" />
          </Card>
        );
      })}
    </div>
  );
}
function BigStat({ label, value, onClick }) {
  const body = (
    <>
      <div className="text-2xl font-extrabold text-amber-500">{value}</div>
      <div className="text-[11px] text-slate-400">{label}{onClick ? " ›" : ""}</div>
    </>
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="w-full text-left">
        <Card className="p-3 text-center active:scale-[0.98] transition hover:border-amber-200">{body}</Card>
      </button>
    );
  }
  return <Card className="p-3 text-center">{body}</Card>;
}

// MostPlayedSongs: derive counts / last-played from the canonical
// songPlays rows (ARCHITECTURE §3). No "play_count" column anywhere.
function MostPlayedSongs({ songs, songPlays, removeSongPlay }) {
  const [openId, setOpenId] = useState(null);
  if (!songs.length && !songPlays.length) return null;
  const byId = Object.fromEntries(songs.map((s) => [s.id, s]));
  const grouped = {};
  songPlays.forEach((p) => {
    if (!grouped[p.songId]) grouped[p.songId] = { plays: [], count: 0, last: null };
    const g = grouped[p.songId];
    g.plays.push(p);
    g.count += 1;
    if (!g.last || (p.playedOn || "") > g.last) g.last = p.playedOn;
  });
  const ranked = Object.entries(grouped)
    .map(([songId, g]) => ({ song: byId[songId] || { id: songId, title: "(missing)" }, ...g }))
    .sort((a, b) => (b.count - a.count) || ((b.last || "").localeCompare(a.last || "")))
    .slice(0, 10);
  if (ranked.length === 0) {
    return (
      <>
        <SectionTitle icon={<Music size={16} className="text-violet-500" />}>Most played songs</SectionTitle>
        <Card className="p-3 text-center text-xs text-slate-400">No songs logged yet. Tap drums → log one!</Card>
      </>
    );
  }
  return (
    <>
      <SectionTitle icon={<Music size={16} className="text-violet-500" />}>Most played songs <span className="text-[11px] font-normal text-slate-400">· top {ranked.length}</span></SectionTitle>
      <div className="space-y-1.5">
        {ranked.map(({ song, count, last, plays }) => {
          const open = openId === song.id;
          return (
            <Card key={song.id} className="p-0 overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenId(open ? null : song.id)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-sm text-slate-800 truncate">{song.title}</div>
                  {(song.artist || last) && (
                    <div className="text-[11px] text-slate-400 truncate">
                      {song.artist || ""}{song.artist && last ? " · " : ""}{last ? `last: ${fmtShort(last)}` : ""}
                    </div>
                  )}
                </div>
                <div className="text-xs font-extrabold text-violet-600 bg-violet-50 rounded-full px-2.5 py-1">
                  {count}×
                </div>
              </button>
              {open && (
                <div className="border-t border-slate-100 px-3 py-2 bg-slate-50">
                  <div className="text-[11px] font-bold text-slate-500 mb-1">Play history</div>
                  <div className="space-y-1">
                    {plays
                      .slice()
                      .sort((a, b) => (b.playedOn || "").localeCompare(a.playedOn || ""))
                      .slice(0, 20)
                      .map((p) => (
                        <div key={p.id} className="flex items-center justify-between text-[11px] text-slate-600">
                          <span>{fmtShort(p.playedOn)}{p.notes ? ` — ${p.notes}` : ""}</span>
                          {removeSongPlay && (
                            <button
                              type="button"
                              onClick={() => removeSongPlay(p.id)}
                              className="text-slate-300 hover:text-rose-500"
                              title="Remove this play"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}

// ===================== PARENT: TODAY =====================
function ParentToday({ todaysTasks, compByTask, availableToday, earnedToday, pendingStars, starBank, handoff, users, mode, setMode, priorities, setPriority, clearPriority, giftStars, user, activities, streaks, setDetailId, setOpenCompletionId, onEasy, undoTask, setOpenTask, setStatDetailId, decide }) {
  const done = todaysTasks.filter((t) => compByTask[t.id]?.status === "approved");
  const pending = todaysTasks.filter((t) => compByTask[t.id]?.status === "pending");
  const todoRaw = todaysTasks.filter((t) => !compByTask[t.id] || ["not_started", "needs_fix"].includes(compByTask[t.id]?.status));
  const todo = sortByLevel(todoRaw, mode, priorities);
  return (
    <div className="px-4 pt-4">
      <div className="flex items-center justify-between px-1">
        <div className="text-xs text-slate-400">{fmtDate(today)}</div>
        {onEasy && <button onClick={onEasy} className="text-[11px] font-bold text-amber-600 bg-amber-50 rounded-full px-2.5 py-1 flex items-center gap-1">😴 Easy mode</button>}
      </div>
      <div className="grid grid-cols-2 gap-2 mt-2">
        <SummaryStat label="Stars available today" value={availableToday} tone="slate" onClick={() => setStatDetailId?.("available")} />
        <SummaryStat label="Earned today" value={earnedToday} tone="emerald" onClick={() => setStatDetailId?.("earned")} />
        <SummaryStat label="Pending approval" value={pendingStars} tone="amber" onClick={() => setStatDetailId?.("pending")} />
        <SummaryStat label="Total star bank" value={starBank} tone="violet" onClick={() => setStatDetailId?.("bank")} />
      </div>

      <StreakStrip streaks={streaks} activities={activities} />

      <Card className="p-4 mt-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-bold">Next reward</span><span className="text-slate-500">{CHILD.nextReward} @ {CHILD.nextRewardCost} ⭐</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full mt-2 overflow-hidden"><div className="h-full bg-amber-400" style={{ width: `${Math.min(100, (starBank / CHILD.nextRewardCost) * 100)}%` }} /></div>
        <div className="flex items-center justify-between text-xs mt-3 text-slate-400">
          <span>Big goal: {CHILD.bigReward} @ {CHILD.bigRewardCost} ⭐</span>
          <button onClick={() => setMode(mode === "summer" ? "school" : "summer")} className="font-semibold text-indigo-600">Switch to {mode === "summer" ? "School" : "Summer"} mode</button>
        </div>
      </Card>

      <GiftStarsCard giftStars={giftStars} />

      <SectionTitle icon={<Clock size={16} className="text-amber-500" />}>Needs approval ({pending.length})</SectionTitle>
      {pending.length === 0 && <p className="text-xs text-slate-400 px-1">Nothing waiting. 🎉</p>}
      {pending.map((t) => {
        const c = compByTask[t.id];
        return (
          <div key={t.id} className="mb-2.5">
            <MiniRow task={t} comp={c} tone="amber" mode={mode} priorities={priorities} users={users} activities={activities} onOpenDetail={setDetailId} undoTask={undoTask} />
            {/* Inline approve buttons — the home banner used to be
                a dead-end stat. Now every pending row is one tap from
                Approve / +5⭐ bonus / Needs fix / Reject. Same decide()
                action the Approvals tab uses, so star-burst + streak
                bump fire identically. */}
            {c?.id && decide && (
              <div className="flex gap-2 mt-1.5 px-1">
                <button onClick={() => decide(c.id, "approve")} className="flex-1 py-2 rounded-2xl bg-emerald-500 text-white font-bold text-sm active:scale-95 flex items-center justify-center gap-1"><Check size={15} />Approve</button>
                <button onClick={() => decide(c.id, "approve", 5)} className="px-3 py-2 rounded-2xl bg-violet-500 text-white font-bold text-sm active:scale-95">+5⭐</button>
                <button onClick={() => decide(c.id, "needs_fix")} className="px-3 py-2 rounded-2xl bg-amber-100 text-amber-700 font-bold text-sm active:scale-95" aria-label="Needs fix"><RotateCcw size={15} /></button>
                <button onClick={() => decide(c.id, "reject")} className="px-3 py-2 rounded-2xl bg-rose-100 text-rose-600 font-bold text-sm active:scale-95" aria-label="Reject"><X size={15} /></button>
              </div>
            )}
          </div>
        );
      })}

      <SectionTitle icon={<ClipboardList size={16} className="text-slate-400" />} right={<span className="text-[11px] text-slate-400 flex items-center gap-1"><Flag size={11} /> tap to set priority</span>}>Still to do ({todo.length})</SectionTitle>
      {todo.map((t) => <MiniRow key={t.id} task={t} comp={compByTask[t.id]} tone="slate" mode={mode} priorities={priorities} users={users} setPriority={setPriority} clearPriority={clearPriority} activities={activities} onOpenDetail={setDetailId} onMarkDone={setOpenTask} />)}

      <SectionTitle icon={<Check size={16} className="text-emerald-500" />}>Done ({done.length})</SectionTitle>
      {done.map((t) => {
        const c = compByTask[t.id];
        // Done rows: tap → CompletionDetailSheet (photos, notes,
        // stats, edit). Krissie's flow lives here on the parent side.
        return <MiniRow key={t.id} task={t} comp={c} tone="emerald" users={users} mode={mode} priorities={priorities} activities={activities} onOpenDetail={() => c?.id && setOpenCompletionId(c.id)} undoTask={undoTask} />;
      })}

      <SectionTitle icon={<Users size={16} className="text-indigo-500" />}>Handoff notes</SectionTitle>
      {handoff.slice(0, 2).map((h) => {
        const a = users.find((u) => u.id === h.authorId);
        return <Card key={h.id} className="p-3 mb-2 text-sm"><div className="text-[11px] text-slate-400 mb-0.5">{a?.name} · {h.time} {h.pinned && "📌"}</div>{h.note}</Card>;
      })}
    </div>
  );
}
function SummaryStat({ label, value, tone, onClick }) {
  const tones = { slate: "text-slate-700", emerald: "text-emerald-600", amber: "text-amber-600", violet: "text-violet-600" };
  const body = (
    <>
      <div className={`text-2xl font-extrabold ${tones[tone]}`}>{value}</div>
      <div className="text-[11px] text-slate-400 leading-tight flex items-center justify-between gap-1">
        <span>{label}</span>
        {onClick && <span className="text-slate-300 text-[10px]">›</span>}
      </div>
    </>
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="w-full text-left">
        <Card className="p-3 active:scale-[0.98] transition hover:border-indigo-200">{body}</Card>
      </button>
    );
  }
  return <Card className="p-3">{body}</Card>;
}
function MiniRow({ task, comp, tone, users, mode, priorities, setPriority, clearPriority, activities, onOpenDetail, undoTask, onMarkDone }) {
  const [open, setOpen] = useState(false);
  const by = comp?.approvedBy ? users?.find((u) => u.id === comp.approvedBy)?.name : null;
  const d = actFor(task, activities);
  const lvl = mode ? levelOf(task, mode, priorities) : "normal";
  const P = PRIORITY[lvl];
  const ov = priorities?.[task.id];
  const [pendLevel, setPendLevel] = useState(ov?.level || "today");
  const LEVELS = [["must", "Non-negotiable"], ["today", "Do today"], ["extra", "Extra credit"]];
  const SCOPES = [["today", "Today"], ["week", "This week"], ["month", "This month"], ["always", "Always"]];
  return (
    <div className="rounded-2xl overflow-hidden border border-slate-100 mb-2" style={{ background: lvl === "normal" ? d.color + "12" : P.wash }}>
      <div className="flex items-stretch cursor-pointer" onClick={() => onOpenDetail?.(task.id)}>
        <div className="w-12 shrink-0 grid place-items-center" style={{ background: d.color }}><TaskIcon type={task.activityType} color="#ffffff" /></div>
        <div className="flex items-center gap-3 p-3 flex-1 min-w-0">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold flex items-center gap-1">{task.title}<ChevronLeft size={13} className="rotate-180 text-slate-300" /></div>
            {by && <span className="block text-[11px] text-slate-400 font-normal">✓ by {by}</span>}
            <div className="flex items-center gap-1.5 flex-wrap mt-1">
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: d.color + "22", color: d.color }}>{d.label}</span>
              <PriorityBadge level={lvl} scope={ov?.scope} />
            </div>
          </div>
          {setPriority && <button onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }} className={`p-1.5 rounded-lg shrink-0 ${lvl !== "normal" ? "text-slate-700" : "text-slate-300"}`}><Flag size={16} className={lvl !== "normal" ? "fill-current" : ""} /></button>}
          <StarPill n={comp?.awardedStars || comp?.pendingStars || task.starValue} tone={tone === "emerald" ? "emerald" : "amber"} />
          {onMarkDone && !comp && (
            <button
              onClick={(e) => { e.stopPropagation(); onMarkDone(task); }}
              title="Mark done for Reznor (with photo proof if needed)"
              className="p-1.5 rounded-lg shrink-0 text-emerald-600 hover:bg-emerald-50"
            >
              <Check size={16} />
            </button>
          )}
          {undoTask && comp && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const wasApproved = comp.status === "approved";
                const stars = comp.awardedStars || comp.pendingStars || 0;
                const msg = `Mark "${task.title}" as NOT done?` +
                  (wasApproved && stars ? `\n\nThis will remove ${stars} ⭐ from Reznor's bank.` : "") +
                  (wasApproved ? "\nIf the streak was bumped today, it walks back too." : "");
                if (window.confirm(msg)) undoTask(task.id);
              }}
              title="Mark this as not done"
              className="p-1.5 rounded-lg shrink-0 text-rose-500 hover:bg-rose-50"
            >
              <RotateCcw size={16} />
            </button>
          )}
        </div>
      </div>
      {open && setPriority && (
        <div className="px-3 pb-3 bg-white/70">
          <div className="text-[11px] font-bold text-slate-500 mb-1">How important?</div>
          <div className="flex gap-1.5 flex-wrap">
            {LEVELS.map(([k, l]) => <button key={k} onClick={() => setPendLevel(k)} className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={pendLevel === k ? { background: PRIORITY[k].dot, color: "#fff" } : { background: "#f1f5f9", color: "#64748b" }}>{l}</button>)}
            <button onClick={() => { clearPriority(task.id); setOpen(false); }} className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-400">Clear</button>
          </div>
          <div className="text-[11px] font-bold text-slate-500 mt-2 mb-1">For how long?</div>
          <div className="flex gap-1.5 flex-wrap">
            {SCOPES.map(([k, l]) => <button key={k} onClick={() => { setPriority(task.id, pendLevel, k); setOpen(false); }} className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-indigo-600 text-white">{l}</button>)}
          </div>
        </div>
      )}
    </div>
  );
}

function GiftStarsCard({ giftStars }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [amt, setAmt] = useState(5);
  if (!open) return <button onClick={() => setOpen(true)} className="w-full mt-3 py-3 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2" style={{ background: "linear-gradient(90deg,#f59e0b,#ec4899)" }}><Sparkles size={16} /> Gift bonus stars</button>;
  return (
    <Card className="p-4 mt-3">
      <div className="font-bold text-sm mb-1 flex items-center gap-2"><Sparkles size={15} className="text-amber-500" /> Gift bonus stars</div>
      <div className="text-[11px] text-slate-400 mb-2">For great stuff that isn't on the list — helping others, cooking, kindness.</div>
      <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="What did he do? e.g. Helped cook dinner" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm mb-2" />
      <div className="flex items-center gap-2 mb-3">
        {[3, 5, 10, 15, 20].map((n) => <button key={n} onClick={() => setAmt(n)} className={`px-3 py-1.5 rounded-xl text-sm font-bold ${amt === n ? "bg-amber-400 text-white" : "bg-slate-100 text-slate-500"}`}>{n}⭐</button>)}
      </div>
      <div className="flex gap-2">
        <button onClick={() => { setOpen(false); setLabel(""); }} className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-500 font-bold text-sm">Cancel</button>
        <button disabled={!label.trim()} onClick={() => { giftStars(label.trim(), amt); setOpen(false); setLabel(""); }} className={`flex-1 py-2.5 rounded-xl font-bold text-sm text-white ${label.trim() ? "bg-amber-500" : "bg-slate-200 text-slate-400"}`}>Give {amt}⭐</button>
      </div>
    </Card>
  );
}

// ===================== PARENT: APPROVALS =====================
function Approvals({ completions, tasks, users, decide }) {
  const pending = completions.filter((c) => c.status === "pending");
  // Today's approved-stars tally — derived from canonical completions.
  // Resets at the date roll. Gives the existing starBurst.fly a real
  // destination on the parent side so taps to Approve fire the full
  // fly-to-bank + bank-pop loop instead of silently no-op'ing.
  const approvedToday = completions
    .filter((c) => c.status === "approved" && c.completionDate === TODAY_ISO)
    .reduce((s, c) => s + (c.awardedStars || 0), 0);
  // Bank-pop wiring: same imperative-restart-on-landed pattern as the
  // kid hero card. The chip below carries the data-star-bank attr;
  // when stars land here we flash + scale the count.
  const tallyRef = useRef(null);
  useEffect(() => {
    return starBurst.onLanded(() => {
      const el = tallyRef.current;
      if (!el) return;
      el.style.animation = "none";
      void el.offsetWidth;
      el.style.animation = "appBankPop 600ms ease-out";
    });
  }, []);
  return (
    <div className="px-4 pt-4">
      <style>{`
        @keyframes appBankPop {
          0%   { transform: scale(1);    color: inherit;          text-shadow: none; }
          25%  { transform: scale(1.28); color: #fde047;
                 text-shadow: 0 0 14px rgba(253,224,71,0.85), 0 0 28px rgba(251,191,36,0.6); }
          55%  { transform: scale(0.96); color: #fef3c7;
                 text-shadow: 0 0 10px rgba(253,224,71,0.5); }
          80%  { transform: scale(1.06); color: inherit;          text-shadow: 0 0 6px rgba(253,224,71,0.3); }
          100% { transform: scale(1);    color: inherit;          text-shadow: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes appBankPop {
            0%   { color: inherit; }
            30%  { color: #fde047; text-shadow: 0 0 10px rgba(253,224,71,0.6); }
            100% { color: inherit; text-shadow: none; }
          }
        }
      `}</style>
      <h2 className="font-extrabold text-lg px-1">Approval Queue</h2>
      <p className="text-xs text-slate-400 px-1 mb-2">Stars stay pending until you approve.</p>
      {/* Today's tally — also the destination for the star-burst fly
          animation. Persistent presence so the parent watches their
          impact accumulate as they work through the queue. */}
      <div
        className="rounded-3xl p-4 mb-3 text-white relative overflow-hidden"
        style={{ background: "linear-gradient(135deg,#6366f1,#a855f7 55%,#ec4899)" }}
      >
        <Sparkles className="absolute -right-3 -top-3 opacity-20" size={80} />
        <div className="flex items-center gap-3 relative">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur grid place-items-center">
            <Star size={24} className="fill-amber-300 text-amber-300" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-white/70 font-bold">Approved Today</div>
            <div className="flex items-baseline gap-2">
              <span
                ref={tallyRef}
                data-star-bank
                className="text-3xl font-extrabold leading-none"
                style={{ display: "inline-block", transformOrigin: "left center" }}
              >
                {approvedToday}
              </span>
              <span className="text-sm font-bold text-white/70">⭐ banked</span>
            </div>
          </div>
        </div>
      </div>
      {pending.length === 0 && <Card className="p-6 text-center text-slate-400 text-sm mt-4">All caught up! 🎉</Card>}
      {pending.map((c) => {
        const t = tasks.find((x) => x.id === c.taskId);
        const who = users.find((u) => u.id === (c.submittedBy || c.completedBy));
        return (
          <Card key={c.id} className="p-4 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 grid place-items-center"><TaskIcon type={t.activityType} /></div>
              <div className="flex-1">
                <div className="font-bold text-sm">{t.title}</div>
                <div className="text-[11px] text-slate-400">Submitted by {who?.name}</div>
              </div>
              <StarPill n={c.pendingStars} tone="amber" />
            </div>

            {c.extra?.bookTitle && <Detail label="Book">{c.extra.bookTitle} ({c.extra.lang}, {c.extra.minutes} min)</Detail>}
            {c.extra?.title && <Detail label="Title">{c.extra.title}</Detail>}
            {c.extra?.drumeo !== undefined && (c.extra.drumeo || c.extra.melodics || c.extra.songList) && (
              <Detail label="Drums">Drumeo {c.extra.drumeo || 0}m · Melodics {c.extra.melodics || 0}m{c.extra.songList ? ` · ${c.extra.songList}` : ""}</Detail>
            )}
            {c.notes && <Detail label="Note">{c.notes}</Detail>}
            {c.proof?.some((p) => p.path || p.url) && (() => {
              const ph = c.proof.find((p) => p.path || p.url);
              const g = ph.geo;
              return (
                <div className="mt-2">
                  <StoredPhoto path={ph.path} url={ph.url} alt="proof" className="rounded-xl h-32 w-full object-cover" fallback={<div className="rounded-xl h-32 w-full bg-slate-100 animate-pulse" />} />
                  {g && (
                    <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 flex-wrap">
                      📍 {g.label} {g.approx ? "" : `(${g.lat}, ${g.lng})`}
                      <a href={`https://maps.google.com/?q=${g.lat},${g.lng}`} target="_blank" rel="noreferrer" className="text-indigo-600 font-semibold">map</a>
                      {ph.time && <span className="text-slate-400">· {ph.time}</span>}
                      {ph.by && <span className="text-slate-400">· by {users.find((u) => u.id === ph.by)?.name || "helper"}</span>}
                    </div>
                  )}
                </div>
              );
            })()}
            {c.proof?.length > 0 && !c.proof.some((p) => p.path || p.url) && <Detail label="Proof">{c.proof.map((p) => p.name).join(", ")}</Detail>}

            <div className="flex gap-2 mt-3">
              <button onClick={() => decide(c.id, "approve")} className="flex-1 py-2.5 rounded-2xl bg-emerald-500 text-white font-bold text-sm active:scale-95 flex items-center justify-center gap-1"><Check size={16} />Approve</button>
              <button onClick={() => decide(c.id, "approve", 5)} className="px-3 py-2.5 rounded-2xl bg-violet-500 text-white font-bold text-sm active:scale-95">+5⭐</button>
              <button onClick={() => decide(c.id, "needs_fix")} className="px-3 py-2.5 rounded-2xl bg-amber-100 text-amber-700 font-bold text-sm active:scale-95"><RotateCcw size={16} /></button>
              <button onClick={() => decide(c.id, "reject")} className="px-3 py-2.5 rounded-2xl bg-rose-100 text-rose-600 font-bold text-sm active:scale-95"><X size={16} /></button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
function Detail({ label, children }) {
  return <div className="mt-2 text-sm"><span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{label}: </span><span className="text-slate-600">{children}</span></div>;
}

// ===================== PARENT: REWARDS =====================
function WishApproveRow({ w, decideRewardRequest }) {
  const [cost, setCost] = useState(100);
  return (
    <Card className="p-3 mb-2">
      <div className="font-bold text-sm">⭐ {w.title}</div>
      {w.note && <div className="text-[11px] text-slate-400 mt-0.5">"{w.note}"</div>}
      <div className="flex items-center gap-2 mt-2">
        <span className="text-xs text-slate-500">Costs</span>
        <input type="number" value={cost} onChange={(e) => setCost(Number(e.target.value))} className="w-20 border border-slate-200 rounded-xl px-2 py-1 text-sm" />
        <span className="text-xs text-slate-500">⭐</span>
        <button onClick={() => decideRewardRequest(w.id, "approved", cost)} className="ml-auto px-3 py-2 rounded-xl bg-emerald-500 text-white font-bold text-xs">Approve</button>
        <button onClick={() => decideRewardRequest(w.id, "denied")} className="px-3 py-2 rounded-xl bg-rose-100 text-rose-600 font-bold text-xs">Deny</button>
      </div>
    </Card>
  );
}

function RewardsParent({ rewards, redemptions, decideReward, starBank, addReward, updateReward, removeReward, rewardRequests, decideRewardRequest }) {
  const requested = redemptions.filter((r) => r.status === "requested");
  const wishes = (rewardRequests || []).filter((w) => w.status === "requested");
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [cost, setCost] = useState(50);
  const [cat, setCat] = useState("Treat");
  const cats = ["Everyday", "Treat", "Creative", "Big"];
  return (
    <div className="px-4 pt-4">
      <h2 className="font-extrabold text-lg px-1">Rewards Store</h2>
      <p className="text-xs text-slate-400 px-1">Bank: {starBank} ⭐ · add, edit, or remove anything he's into.</p>

      <SectionTitle icon={<Sparkles size={16} className="text-violet-500" />}>Wishes from Reznor {wishes.length > 0 && <span className="text-[11px] font-normal text-violet-500">· {wishes.length} new</span>}</SectionTitle>
      {wishes.length === 0 && <p className="text-xs text-slate-400 px-1">No new wishes. When he dreams one up, set the stars and approve it here.</p>}
      {wishes.map((w) => <WishApproveRow key={w.id} w={w} decideRewardRequest={decideRewardRequest} />)}

      <SectionTitle icon={<Gift size={16} className="text-violet-500" />}>Redemption requests</SectionTitle>
      {requested.length === 0 && <p className="text-xs text-slate-400 px-1">No pending requests.</p>}
      {requested.map((r) => (
        <Card key={r.id} className="p-3 mb-2 flex items-center gap-3">
          <div className="flex-1"><div className="font-bold text-sm">{r.title}</div><div className="text-[11px] text-slate-400">{r.cost} ⭐</div></div>
          <button onClick={() => decideReward(r.id, "approved")} className="px-3 py-2 rounded-xl bg-emerald-500 text-white font-bold text-xs">Approve</button>
          <button onClick={() => decideReward(r.id, "denied")} className="px-3 py-2 rounded-xl bg-rose-100 text-rose-600 font-bold text-xs">Deny</button>
        </Card>
      ))}

      <SectionTitle icon={<Trophy size={16} className="text-amber-500" />} right={!adding && <button onClick={() => setAdding(true)} className="text-[11px] font-bold text-indigo-600 flex items-center gap-1"><Plus size={12} /> Add</button>}>All rewards</SectionTitle>
      {adding && (
        <Card className="p-4 mb-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. New comic book" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm mb-2" />
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-slate-500">Cost</span>
            <input type="number" value={cost} onChange={(e) => setCost(Number(e.target.value))} className="w-20 border border-slate-200 rounded-xl px-2 py-1 text-sm" />
            <span className="text-xs text-slate-500">⭐</span>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-3">{cats.map((c) => <button key={c} onClick={() => setCat(c)} className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${cat === c ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>{c}</button>)}</div>
          <div className="flex gap-2">
            <button onClick={() => { setAdding(false); setName(""); }} className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-500 font-bold text-sm">Cancel</button>
            <button disabled={!name.trim()} onClick={() => { addReward({ id: "r_" + Date.now(), title: name.trim(), starCost: cost, category: cat, active: true }); setAdding(false); setName(""); setCost(50); }} className={`flex-1 py-2.5 rounded-xl font-bold text-sm text-white ${name.trim() ? "bg-indigo-600" : "bg-slate-200 text-slate-400"}`}>Add reward</button>
          </div>
        </Card>
      )}
      {rewards.map((r) => <RewardEditRow key={r.id} r={r} updateReward={updateReward} removeReward={removeReward} />)}
    </div>
  );
}

function RewardEditRow({ r, updateReward, removeReward }) {
  const [edit, setEdit] = useState(false);
  return (
    <Card className={`p-3 mb-2 ${r.active === false ? "opacity-50" : ""}`}>
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          {edit
            ? <input value={r.title} onChange={(e) => updateReward(r.id, { title: e.target.value })} className="font-bold text-sm w-full border border-slate-200 rounded px-1.5 py-0.5" />
            : <div className="font-bold text-sm">{r.title}</div>}
          <div className="text-[11px] text-slate-400">{r.category}{r.active === false ? " · hidden" : ""}</div>
        </div>
        {edit
          ? <div className="flex items-center gap-1"><input type="number" value={r.starCost} onChange={(e) => updateReward(r.id, { starCost: Number(e.target.value) })} className="w-16 border border-slate-200 rounded px-1.5 py-0.5 text-sm" /><span className="text-xs">⭐</span></div>
          : <StarPill n={r.starCost} />}
        <button onClick={() => setEdit((v) => !v)} className="p-1.5 text-slate-400"><Pencil size={15} /></button>
      </div>
      {edit && (
        <div className="flex gap-2 mt-2">
          <button onClick={() => updateReward(r.id, { active: r.active === false })} className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold">{r.active === false ? "Show in store" : "Hide from store"}</button>
          <button onClick={() => removeReward(r.id)} className="px-3 py-2 rounded-xl bg-rose-100 text-rose-600 text-xs font-bold flex items-center gap-1"><X size={14} /> Remove</button>
        </div>
      )}
    </Card>
  );
}

// ===================== PARENT: CALENDAR =====================
function CalendarView({ events, addEvent, mode, tkdDays, tkdTimes, toggleTkdDay, setTkdTime, activities }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("2026-06-12");
  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));
  const catColor = { School: "bg-sky-100 text-sky-700", Activity: "bg-emerald-100 text-emerald-700", "Field Trip": "bg-amber-100 text-amber-700" };
  const tkdAct = activities.find((a) => a.id === "a_tkd");
  // Build the weekly grid from scheduled activities (status-aware) + this week's Taekwondo picks
  const weekly = DAYS.map((day) => {
    const items = [];
    activities.forEach((a) => (a.schedule || []).forEach((s) => { if (s.day === day) items.push({ name: a.short || a.name, time: s.time, color: a.color, status: a.status, note: a.note }); }));
    if (tkdDays.includes(day)) items.push({ name: "Taekwondo", time: tkdTimes[day] || "set a time", color: tkdAct?.color || "#dc2626", tkd: true, status: tkdAct?.status });
    return { day, items };
  });
  const need = Math.max(0, TKD_TARGET - tkdDays.length);
  const statusTag = { break: "on break", seasonal: "seasonal" };
  return (
    <div className="px-4 pt-4">
      <h2 className="font-extrabold text-lg px-1">Calendar</h2>
      <Card className="p-3 mt-2 bg-amber-50 border-amber-100 flex items-center gap-2 text-sm text-amber-800"><Sun size={16} /> Summer Mode: June 11 – Sept 1, 2026. School starts back ~Sept 1.</Card>

      <SectionTitle icon={<Heart size={16} className="text-violet-500" />} right={<span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${tkdDays.length >= TKD_TARGET ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{tkdDays.length} of {TKD_TARGET} picked</span>}>Taekwondo this week</SectionTitle>
      <Card className="p-3 mb-1">
        <div className="text-[11px] text-slate-400 mb-2">Available any day except Sunday. Tap the days he'll go this week and set the time.</div>
        {TKD_SLOTS.map((s) => {
          const on = tkdDays.includes(s.day);
          return (
            <div key={s.day} className={`flex items-center gap-2 px-2 py-1.5 rounded-xl mb-1 ${on ? "bg-violet-50" : ""}`}>
              <button onClick={() => toggleTkdDay(s.day)} className={`w-7 h-7 rounded-lg grid place-items-center shrink-0 ${on ? "bg-violet-600 text-white" : "border-2 border-slate-200 text-transparent"}`}><Check size={15} /></button>
              <div className="w-24 text-sm font-semibold text-slate-600 shrink-0">{s.day}</div>
              {on
                ? <input value={tkdTimes[s.day] || ""} onChange={(e) => setTkdTime(s.day, e.target.value)} placeholder="set time" className="flex-1 min-w-0 border border-slate-200 rounded-lg px-2 py-1 text-xs" />
                : <div className="flex-1 text-xs text-slate-400">{s.time || "time flexible"}</div>}
            </div>
          );
        })}
        {need > 0
          ? <div className="text-[11px] font-semibold text-amber-600 mt-1">Pick {need} more to hit his 2×/week goal. (e.g. if Monday's skipped, add Friday + Saturday.)</div>
          : <div className="text-[11px] font-semibold text-emerald-600 mt-1">Nice — he's on track for the week. 🥋</div>}
      </Card>

      <SectionTitle icon={<Clock size={16} className="text-teal-500" />}>Reznor's week</SectionTitle>
      <Card className="p-1 mb-1">
        {weekly.map((d) => (
          <div key={d.day} className="flex items-start gap-2 px-2 py-2 border-b border-slate-50 last:border-0">
            <div className="text-xs font-bold text-slate-500 w-24 shrink-0">{d.day}</div>
            <div className="flex-1 text-xs space-y-1">
              {d.items.length === 0
                ? <span className="text-slate-300">— free / rest</span>
                : d.items.map((it, i) => {
                  const paused = it.status === "break" || it.status === "seasonal";
                  return (
                    <div key={i} className={`flex items-center gap-1.5 flex-wrap ${paused ? "opacity-50" : ""}`}>
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: it.color }} />
                      <span className="text-slate-600">{it.name}</span>
                      <span className="text-slate-400">· {it.time}</span>
                      {it.tkd && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600">this week</span>}
                      {paused && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-500">{statusTag[it.status]}</span>}
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </Card>
      <div className="text-[11px] text-slate-400 px-1 mb-1">{mode === "school" ? "School: 8:00 AM–2:10 PM, Mon–Fri." : "Summer homeschool block: 8 AM–2 PM, Mon–Fri."} Manage breaks & seasons under More → Activities.</div>

      <SectionTitle icon={<CalIcon size={16} className="text-indigo-500" />}>Upcoming</SectionTitle>
      {sorted.map((e) => (
        <Card key={e.id} className="p-3 mb-2">
          <div className="flex items-center justify-between">
            <div className="font-bold text-sm">{e.title}</div>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${catColor[e.category] || "bg-slate-100 text-slate-500"}`}>{e.category}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">{new Date(e.date + "T12:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}{e.notes ? ` · ${e.notes}` : ""}</div>
        </Card>
      ))}
      <Card className="p-3 mt-3">
        <div className="text-xs font-bold text-slate-500 mb-2">Add event</div>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm mb-2" />
        <div className="flex gap-2">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm" />
          <button onClick={() => { if (title.trim()) { addEvent({ title, date, category: "Activity", notes: "" }); setTitle(""); } }} className="px-4 rounded-xl bg-indigo-600 text-white font-bold text-sm"><Plus size={16} /></button>
        </div>
        <div className="text-[11px] text-slate-400 mt-2">TODO: ICS / Google Calendar / school schedule import</div>
      </Card>
    </div>
  );
}

// ===================== PARENT: MORE (portfolio, weekly, handoff) =====================
// ===================== PARENT: READING LIBRARY =====================
function daysBetween(a, b) { if (!a || !b) return null; const d = Math.round((new Date(b + "T12:00") - new Date(a + "T12:00")) / 86400000) + 1; return d < 1 ? 1 : d; }
// Tiny dependency-free fuzzy matcher: substring > subsequence > typo-tolerant tokens.
function levDist(a, b) {
  const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}
function fuzzyMatch(query, text) {
  const q = (query || "").toLowerCase().trim();
  if (!q) return { hit: true, score: 0 };
  const t = (text || "").toLowerCase();
  if (t.includes(q)) return { hit: true, score: 200 - t.indexOf(q) };
  let qi = 0; for (let i = 0; i < t.length && qi < q.length; i++) if (t[i] === q[qi]) qi++;
  if (qi === q.length) return { hit: true, score: 80 };
  const qw = q.split(/\s+/), tw = t.split(/\s+/);
  let matched = 0;
  for (const w of qw) if (tw.some((x) => levDist(w, x) <= Math.max(1, Math.floor(w.length / 4)))) matched++;
  if (matched === qw.length) return { hit: true, score: 40 + matched };
  return { hit: false, score: 0 };
}
function searchBooks(list, q) {
  if (!q.trim()) return list;
  return list.map((b) => ({ b, m: fuzzyMatch(q, [b.title, b.level, b.lang, b.notes].filter(Boolean).join(" ")) }))
    .filter((x) => x.m.hit).sort((a, b) => b.m.score - a.m.score).map((x) => x.b);
}

function ReadingLibrary({ books, addBook, updateBook, removeBook }) {
  const [adding, setAdding] = useState(false);
  const [addingBacklog, setAddingBacklog] = useState(false);
  const [q, setQ] = useState("");
  // Filtered views: pre-tracking books live in their own archive
  // section so the "Reading now / Finished" lists stay date-honest.
  const tracked = books.filter((b) => !b.preTracking);
  const archive = books.filter((b) => b.preTracking);
  const reading = searchBooks(tracked.filter((b) => b.status !== "finished"), q);
  const finished = searchBooks(tracked.filter((b) => b.status === "finished"), q);
  const archiveFiltered = searchBooks(archive, q);
  // Count-based stats INCLUDE backlog. They're real books, just no dates.
  const thisMonth = tracked.filter((b) => b.status === "finished" && (b.finished || "").startsWith("2026-06")).length;
  const paces = tracked.filter((b) => b.status === "finished").map((b) => daysBetween(b.started, b.finished)).filter(Boolean);
  const avgPace = paces.length ? Math.round(paces.reduce((s, n) => s + n, 0) / paces.length) : null;
  const finishedTotal = books.filter((b) => b.status === "finished").length; // tracked + backlog
  // Group backlog by era_label for the archive header.
  const eraCounts = (() => {
    const m = new Map();
    for (const b of archive) m.set(b.eraLabel || "Era unset", (m.get(b.eraLabel || "Era unset") || 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  })();
  return (
    <>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <Card className="p-3 text-center"><div className="text-2xl font-extrabold text-emerald-500">{finishedTotal}</div><div className="text-[11px] text-slate-400">finished</div></Card>
        <Card className="p-3 text-center"><div className="text-2xl font-extrabold text-indigo-500">{thisMonth}</div><div className="text-[11px] text-slate-400">this month</div></Card>
        <Card className="p-3 text-center"><div className="text-2xl font-extrabold text-amber-500">{avgPace ? `${avgPace}d` : "—"}</div><div className="text-[11px] text-slate-400">avg / book</div></Card>
      </div>

      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-3 py-2 mb-3">
        <Search size={16} className="text-slate-400 shrink-0" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search books — title, level, language…" className="flex-1 text-sm outline-none bg-transparent" />
        {q && <button onClick={() => setQ("")} className="text-slate-300"><X size={15} /></button>}
      </div>

      {!adding && !addingBacklog && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          <button onClick={() => setAdding(true)} className="py-2.5 rounded-2xl bg-indigo-600 text-white font-bold text-sm flex items-center justify-center gap-1"><Plus size={15} /> Add a book</button>
          <button onClick={() => setAddingBacklog(true)} className="py-2.5 rounded-2xl bg-amber-100 text-amber-800 font-bold text-sm flex items-center justify-center gap-1 border-2 border-amber-200"><Archive size={15} /> Add backlog</button>
        </div>
      )}
      {adding && <AddBookForm onAdd={(b) => { addBook(b); setAdding(false); }} onCancel={() => setAdding(false)} />}
      {addingBacklog && <AddBacklogBookForm onAdd={(b) => { addBook(b); setAddingBacklog(false); }} onCancel={() => setAddingBacklog(false)} />}

      {q && reading.length === 0 && finished.length === 0 && archiveFiltered.length === 0 && <p className="text-sm text-slate-400 px-1">No books match "{q}".</p>}

      <SectionTitle icon={<BookOpen size={16} className="text-sky-500" />}>Reading now ({reading.length})</SectionTitle>
      {reading.length === 0 && !q && <p className="text-xs text-slate-400 px-1">Nothing in progress.</p>}
      {reading.map((b) => <BookRow key={b.id} b={b} updateBook={updateBook} removeBook={removeBook} />)}

      <SectionTitle icon={<Check size={16} className="text-emerald-500" />}>Finished ({finished.length})</SectionTitle>
      {finished.map((b) => <BookRow key={b.id} b={b} updateBook={updateBook} removeBook={removeBook} />)}

      {archive.length > 0 && (
        <>
          <SectionTitle icon={<Archive size={16} className="text-amber-600" />}>
            Archive · pre-tracking ({archive.length})
          </SectionTitle>
          {eraCounts.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2 px-1">
              {eraCounts.map(([era, n]) => (
                <span key={era} className="text-[11px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                  {era} · {n}
                </span>
              ))}
            </div>
          )}
          {archiveFiltered.map((b) => <BookRow key={b.id} b={b} updateBook={updateBook} removeBook={removeBook} />)}
          <div className="text-[11px] text-slate-400 px-1 mt-1 mb-3">
            Backlog books count toward totals + author stats but have no real dates,
            so they don't appear in date-based views (slideshows, "this month," etc.).
          </div>
        </>
      )}

      <div className="text-[11px] text-slate-400 px-1 mt-3">Search is fuzzy — typos and partial titles still find the book. Logging start & finish dates shows his pace; the level tag shows where he's reading.</div>
    </>
  );
}

function BookRow({ b, updateBook, removeBook }) {
  const [edit, setEdit] = useState(false);
  const pace = daysBetween(b.started, b.finished);
  return (
    <Card className="p-3 mb-2">
      <div className="flex items-start gap-2">
        <div className="text-xl">{b.lang === "Spanish" ? "🇪🇸" : "📘"}</div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm leading-tight">{b.title}</div>
          <div className="flex items-center gap-1.5 flex-wrap mt-1">
            {b.level && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600">{b.level}</span>}
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">{b.lang}</span>
            {b.status === "finished" && pace && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-600">read in {pace}d</span>}
            {b.status === "finished" && b.rating > 0 && <span className="text-[10px]">{"⭐".repeat(b.rating)}</span>}
            {/* Honest pre-tracking badge — no date, just the era. */}
            {b.preTracking && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                Pre-tracking{b.eraLabel ? ` · ${b.eraLabel}` : ""}
              </span>
            )}
          </div>
          {b.notes && <div className="text-[11px] text-slate-400 mt-1">{b.notes}</div>}
        </div>
        <button onClick={() => setEdit((v) => !v)} className="p-1 text-slate-400"><Pencil size={15} /></button>
      </div>
      {edit && (
        <div className="mt-2 pt-2 border-t border-slate-100">
          {b.status !== "finished"
            ? <button onClick={() => updateBook(b.id, { status: "finished", finished: TODAY_ISO })} className="w-full py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold mb-2">✓ Mark finished today</button>
            : <button onClick={() => updateBook(b.id, { status: "reading", finished: "" })} className="w-full py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold mb-2">Move back to reading</button>}
          {b.status === "finished" && <div className="flex items-center gap-1 mb-2"><span className="text-[11px] text-slate-500">Rating</span>{[1, 2, 3, 4, 5].map((n) => <button key={n} onClick={() => updateBook(b.id, { rating: n })} className="text-sm">{n <= b.rating ? "⭐" : "☆"}</button>)}</div>}
          <button onClick={() => removeBook(b.id)} className="w-full py-2 rounded-xl bg-rose-100 text-rose-600 text-xs font-bold flex items-center justify-center gap-1"><X size={13} /> Remove</button>
        </div>
      )}
    </Card>
  );
}

function AddBookForm({ onAdd, onCancel }) {
  const [title, setTitle] = useState("");
  const [lang, setLang] = useState("English");
  const [level, setLevel] = useState("");
  const [started, setStarted] = useState(TODAY_ISO);
  return (
    <Card className="p-4 mb-3">
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Book title" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm mb-2" />
      <div className="flex gap-1.5 mb-2">{["English", "Spanish"].map((l) => <button key={l} onClick={() => setLang(l)} className={`text-[11px] font-semibold px-3 py-1 rounded-full ${lang === l ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>{l}</button>)}</div>
      <input value={level} onChange={(e) => setLevel(e.target.value)} placeholder="Reading level (e.g. ~2nd grade)" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm mb-2" />
      <label className="text-[11px] font-semibold text-slate-500 block mb-2">Started<input type="date" value={started} onChange={(e) => setStarted(e.target.value)} className="w-full mt-0.5 border border-slate-200 rounded-xl px-3 py-2 text-sm" /></label>
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-500 font-bold text-sm">Cancel</button>
        <button disabled={!title.trim()} onClick={() => onAdd({ id: "b_" + Date.now(), title: title.trim(), lang, status: "reading", started, finished: "", level: level.trim(), rating: 0, notes: "" })} className={`flex-1 py-2.5 rounded-xl font-bold text-sm text-white ${title.trim() ? "bg-indigo-600" : "bg-slate-200 text-slate-400"}`}>Add book</button>
      </div>
    </Card>
  );
}

// Pre-tracking backlog entry — for books Reznor finished BEFORE granular
// tracking started in June 2026 (Tipos Malos Vols 1-6, kindergarten
// reads, etc.). No date fields by design: the era_label carries the
// rough when. Default status = "finished" because that's what backlog
// usually is.
const ERA_PRESETS = ["Kindergarten 2026", "Before May 2026"];
function AddBacklogBookForm({ onAdd, onCancel }) {
  const [title, setTitle] = useState("");
  const [lang, setLang] = useState("English");
  const [level, setLevel] = useState("");
  const [eraChoice, setEraChoice] = useState(ERA_PRESETS[0]);
  const [eraCustom, setEraCustom] = useState("");
  const [notes, setNotes] = useState("");
  const eraLabel = (eraChoice === "Custom" ? eraCustom.trim() : eraChoice);
  const canSave = title.trim() && eraLabel;
  return (
    <Card className="p-4 mb-3 border-2 border-amber-200 bg-amber-50/40">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-amber-700 mb-2">
        <Archive size={13} /> Backlog entry · no real date needed
      </div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Book title" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm mb-2 bg-white" />
      <div className="flex gap-1.5 mb-2">{["English", "Spanish"].map((l) => <button key={l} onClick={() => setLang(l)} className={`text-[11px] font-semibold px-3 py-1 rounded-full ${lang === l ? "bg-amber-600 text-white" : "bg-white text-slate-500 border border-slate-200"}`}>{l}</button>)}</div>
      <input value={level} onChange={(e) => setLevel(e.target.value)} placeholder="Reading level (optional)" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm mb-2 bg-white" />
      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Era</label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {[...ERA_PRESETS, "Custom"].map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setEraChoice(p)}
            className={`text-[11px] font-semibold px-3 py-1 rounded-full ${eraChoice === p ? "bg-amber-600 text-white" : "bg-white text-slate-600 border border-slate-200"}`}
          >
            {p}
          </button>
        ))}
      </div>
      {eraChoice === "Custom" && (
        <input
          value={eraCustom}
          onChange={(e) => setEraCustom(e.target.value)}
          placeholder='Custom era (e.g. "Summer 2025")'
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm mb-2 bg-white"
        />
      )}
      <input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (optional)"
        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm mb-3 bg-white"
      />
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 font-bold text-sm">Cancel</button>
        <button
          disabled={!canSave}
          onClick={() =>
            onAdd({
              id: "b_" + Date.now(),
              title: title.trim(),
              lang,
              status: "finished",
              started: "",
              finished: "",
              level: level.trim(),
              rating: 0,
              notes: notes.trim(),
              preTracking: true,
              eraLabel,
            })
          }
          className={`flex-1 py-2.5 rounded-xl font-bold text-sm text-white ${canSave ? "bg-amber-600" : "bg-slate-200 text-slate-400"}`}
        >
          Add to backlog
        </button>
      </div>
    </Card>
  );
}

// ===================== PARENT: GRADE GOALS =====================
function GradeGoals() {
  const [g, setG] = useState(2); // default to where he's testing
  const subjects = STANDARDS[g] || {};
  const SUBJ_COLOR = { Reading: "#2563eb", Writing: "#ea580c", Math: "#d97706", Language: "#e11d48", Science: "#059669" };
  return (
    <>
      <Card className="p-3 mb-3 bg-indigo-50 border-indigo-100">
        <div className="text-sm font-bold text-indigo-900">Reznor finishes Kindergarten now → 1st grade in Sept 2026.</div>
        <div className="text-[12px] text-indigo-700 mt-1">He's testing ~2 grades above, so peek at 2nd–3rd to keep challenging him. These are high-level summaries — verify against official CA / Common Core docs.</div>
      </Card>

      <div className="flex gap-1.5 mb-3 flex-wrap">
        {[1, 2, 3, 4, 5, 6].map((n) => <button key={n} onClick={() => setG(n)} className={`text-sm font-bold px-3.5 py-1.5 rounded-full ${g === n ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>Gr {n}</button>)}
      </div>

      {Object.entries(subjects).map(([subj, items]) => (
        <Card key={subj} className="p-3 mb-2">
          <div className="font-bold text-sm mb-1.5" style={{ color: SUBJ_COLOR[subj] || "#334155" }}>{subj}</div>
          <ul className="space-y-1">{items.map((it, i) => <li key={i} className="text-[13px] text-slate-600 flex gap-1.5"><span style={{ color: SUBJ_COLOR[subj] }}>•</span><span>{it}</span></li>)}</ul>
        </Card>
      ))}

      <SectionTitle icon={<Trophy size={16} className="text-amber-500" />}>World's best systems</SectionTitle>
      {WORLD_BEST.map((w) => (
        <Card key={w.c} className="p-3 mb-2"><div className="font-bold text-sm">{w.c}</div><div className="text-[12px] text-slate-500 mt-0.5">{w.n}</div></Card>
      ))}
      <Card className="p-3 mb-2 bg-amber-50 border-amber-100"><div className="text-[12px] text-amber-800">{WORLD_THEMES}</div></Card>

      <SectionTitle icon={<BookOpen size={16} className="text-sky-500" />}>Go deeper — official sources</SectionTitle>
      {GRADE_LINKS.map((l) => (
        <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-3 mb-2 rounded-2xl bg-white border border-slate-100 active:scale-[0.99]">
          <div className="w-9 h-9 rounded-xl bg-sky-100 grid place-items-center shrink-0"><BookOpen size={16} className="text-sky-600" /></div>
          <div className="flex-1 min-w-0"><div className="font-bold text-sm">{l.title}</div><div className="text-[11px] text-slate-400 truncate">{l.desc}</div></div>
          <Share2 size={14} className="text-slate-300 shrink-0" />
        </a>
      ))}

      <Card className="p-3 mb-2 bg-indigo-50 border-indigo-100">
        <div className="text-sm font-bold text-indigo-900 flex items-center gap-1">🤖 Auto-update (roadmap)</div>
        <div className="text-[12px] text-indigo-700 mt-1">Later, a background worker can refresh these standards and pull the latest world rankings automatically, so the targets always reflect the current best in the world — no manual updating.</div>
      </Card>
      <div className="text-[11px] text-slate-400 px-1 mt-1">A real build can pull live official standards by state & country. This is a curated starting framework to aim high — always cross-check specifics.</div>
    </>
  );
}

// ===================== PARENT: ACCOMPLISHMENTS =====================
function Accomplishments({ awards, addAward, removeAward, activities, familyId }) {
  const [adding, setAdding] = useState(false);
  const actOf = (id) => activities.find((a) => a.id === id);
  return (
    <>
      <div className="rounded-3xl p-4 text-white mb-3" style={{ background: "linear-gradient(135deg,#7c3aed,#2563eb)" }}>
        <div className="font-extrabold text-lg flex items-center gap-2">🏆 Reztron X — Accomplishments</div>
        <div className="text-sm opacity-90 mt-0.5">{awards.length} saved · report cards, belts, recital & game sheets, certificates.</div>
      </div>

      {!adding && <button onClick={() => setAdding(true)} className="w-full py-2.5 rounded-2xl bg-indigo-600 text-white font-bold text-sm flex items-center justify-center gap-1 mb-3"><Plus size={15} /> Add an accomplishment</button>}
      {adding && <AddAwardForm activities={activities} onAdd={(a) => { addAward(a); setAdding(false); }} onCancel={() => setAdding(false)} familyId={familyId} />}

      {awards.length === 0 && <p className="text-xs text-slate-400 px-1">Nothing yet — upload his first certificate or recital sheet.</p>}
      <div className="grid grid-cols-2 gap-2">
        {awards.map((a) => {
          const act = actOf(a.activityId);
          return (
            <Card key={a.id} className="p-0 overflow-hidden">
              {(a.filePath || a.url)
                ? <StoredPhoto path={a.filePath} url={a.url} alt="" className="w-full h-28 object-cover" fallback={<div className="w-full h-28 grid place-items-center text-4xl bg-slate-100 animate-pulse">{AWARD_EMOJI[a.type] || "🏆"}</div>} />
                : <div className="w-full h-28 grid place-items-center text-4xl" style={{ background: (act?.color || "#64748b") + "22" }}>{AWARD_EMOJI[a.type] || "🏆"}</div>}
              <div className="p-2.5">
                <div className="font-bold text-[12px] leading-tight">{a.title}</div>
                <div className="flex items-center gap-1 flex-wrap mt-1">
                  {act && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: act.color + "22", color: act.color }}>{act.short || act.name}</span>}
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">{a.type}</span>
                </div>
                {a.note && <div className="text-[10px] text-slate-400 mt-1 leading-tight">{a.note}</div>}
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[10px] text-slate-400">{a.date ? fmtShort(a.date) : ""}</span>
                  <button onClick={() => removeAward(a.id)} className="text-slate-300 p-0.5"><X size={13} /></button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      <div className="text-[11px] text-slate-400 px-1 mt-3">Tie each to an activity to build his profile. (TODO real-build: cloud storage so files & photos live beyond this session and sync across devices.)</div>
    </>
  );
}

function AddAwardForm({ activities, onAdd, onCancel, familyId }) {
  const opts = activities.filter((a) => a.status !== "archived");
  const [title, setTitle] = useState("");
  const [type, setType] = useState("Certificate");
  const [actId, setActId] = useState(opts[0]?.id);
  const [date, setDate] = useState(TODAY_ISO);
  const [note, setNote] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const onFile = async (f) => {
    if (!f) return;
    setUploading(true);
    try {
      const { path, name } = await uploadFamilyPhoto({ file: f, familyId, kind: "award" });
      setFile({ name, path });
    } catch (err) {
      alert("Upload failed: " + (err.message || err));
    } finally {
      setUploading(false);
    }
  };
  return (
    <Card className="p-4 mb-3">
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (e.g. Yellow Belt, Recital sheet)" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm mb-2" />
      <div className="text-[11px] font-semibold text-slate-500 mb-1">Type</div>
      <div className="flex flex-wrap gap-1.5 mb-2">{AWARD_TYPES.map((t) => <button key={t} onClick={() => setType(t)} className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${type === t ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>{AWARD_EMOJI[t]} {t}</button>)}</div>
      <div className="text-[11px] font-semibold text-slate-500 mb-1">Activity</div>
      <div className="flex flex-wrap gap-1.5 mb-2">{opts.map((a) => <button key={a.id} onClick={() => setActId(a.id)} className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={actId === a.id ? { background: a.color, color: "#fff" } : { background: "#f1f5f9", color: "#64748b" }}>{a.short || a.name}</button>)}</div>
      <label className="text-[11px] font-semibold text-slate-500 block mb-2">Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full mt-0.5 border border-slate-200 rounded-xl px-3 py-2 text-sm" /></label>
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm mb-2" />
      <label className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2.5 cursor-pointer mb-3">
        <Camera size={16} className="text-slate-500" />
        <span className="text-sm text-slate-500 flex-1">{uploading ? "Uploading…" : (file ? file.name : "Upload photo or file")}</span>
        <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      </label>
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-500 font-bold text-sm">Cancel</button>
        <button disabled={!title.trim() || uploading} onClick={() => onAdd({ id: "aw_" + Date.now(), title: title.trim(), type, activityId: actId, date, note: note.trim(), fileName: file?.name || "", filePath: file?.path || "" })} className={`flex-1 py-2.5 rounded-xl font-bold text-sm text-white ${title.trim() && !uploading ? "bg-indigo-600" : "bg-slate-200 text-slate-400"}`}>Save</button>
      </div>
    </Card>
  );
}

// ===================== PARENT: RECAP, EXPORT & MEMORIES =====================
function ParentRecap(props) {
  const { completions, activities, streaks, books, gifted } = props;
  const [period, setPeriod] = useState("week");
  const [copied, setCopied] = useState(false);
  const approved = completions.filter((c) => c.status === "approved");
  const starsEarned = approved.reduce((s, c) => s + (c.awardedStars || 0), 0) + (gifted || []).reduce((s, g) => s + (g.stars || 0), 0);
  const photos = completions.flatMap((c) => (c.proof || []).filter((p) => p.type === "photo" && (p.path || p.url)).map((p) => ({ ...p, taskId: c.taskId })));
  const booksDone = (books || []).filter((b) => b.status === "finished");
  const topStreaks = Object.entries(streaks || {}).map(([id, s]) => ({ a: activities.find((x) => x.id === id), s })).filter((x) => x.a).sort((a, b) => b.s.current - a.s.current);

  const ds = streaks?.a_drums;
  let mem = null;
  if (ds?.since) {
    const start = new Date(ds.since + "T12:00");
    const daysSince = Math.round((today - start) / 86400000);
    const anniv = new Date(start); anniv.setFullYear(start.getFullYear() + 1);
    const toAnniv = Math.ceil((anniv - today) / 86400000);
    mem = { daysSince, anniv, toAnniv, start };
  }

  const buildText = () => [
    `Reznor — ${period === "week" ? "This Week" : "This Month"} Recap`, ``,
    `⭐ Stars earned: ${starsEarned}`,
    `✅ Activities completed: ${approved.length}`,
    `📚 Books finished: ${booksDone.length}`,
    `📸 Photos captured: ${photos.length}`, ``, `Streaks:`,
    ...topStreaks.slice(0, 6).map((x) => `• ${x.a.name}: ${x.s.current} days (best ${x.s.longest})`),
  ].join("\n");
  const share = async () => { try { await navigator.clipboard.writeText(buildText()); } catch (e) { /* clipboard blocked in sandbox */ } setCopied(true); setTimeout(() => setCopied(false), 2200); };

  return (
    <>
      <div className="flex gap-1.5 mb-3">
        {[["week", "This week"], ["month", "This month"]].map(([k, l]) => <button key={k} onClick={() => setPeriod(k)} className={`flex-1 py-2 rounded-xl text-sm font-bold ${period === k ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>{l}</button>)}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Card className="p-3 text-center"><div className="text-2xl font-extrabold text-amber-500">{starsEarned}</div><div className="text-[11px] text-slate-400">stars earned</div></Card>
        <Card className="p-3 text-center"><div className="text-2xl font-extrabold text-emerald-500">{approved.length}</div><div className="text-[11px] text-slate-400">completed</div></Card>
        <Card className="p-3 text-center"><div className="text-2xl font-extrabold text-sky-500">{booksDone.length}</div><div className="text-[11px] text-slate-400">books finished</div></Card>
        <Card className="p-3 text-center"><div className="text-2xl font-extrabold text-violet-500">{photos.length}</div><div className="text-[11px] text-slate-400">photos</div></Card>
      </div>

      {mem && (
        <Card className="p-4 mt-3 text-white" style={{ background: "linear-gradient(135deg,#7c3aed,#db2777)" }}>
          <div className="flex items-center gap-2 font-extrabold"><span className="text-xl">🎂</span> On this journey</div>
          <div className="text-sm opacity-95 mt-1">🥁 {mem.daysSince} days of drums since {fmtDateObj(mem.start)}.</div>
          <div className="text-sm opacity-95">{mem.toAnniv > 0 ? `1-year drum-iversary in ${mem.toAnniv} days (${fmtDateObj(mem.anniv)}) 🎉` : `Passed his 1-year drum-iversary! 🐐`}</div>
          <div className="text-[11px] opacity-80 mt-2">A real build resurfaces "this day last year" photos here — like his first drum video next to today's.</div>
        </Card>
      )}

      <SectionTitle icon={<ImageIcon size={16} className="text-violet-500" />}>Photos {period === "week" ? "this week" : "this month"}</SectionTitle>
      {photos.length === 0 && <p className="text-xs text-slate-400 px-1">No photos captured yet — helpers can snap them from the checklist.</p>}
      <div className="grid grid-cols-3 gap-1.5">
        {photos.map((p, i) => <StoredPhoto key={i} path={p.path} url={p.url} alt="" className="w-full h-24 object-cover rounded-xl" fallback={<div className="w-full h-24 bg-slate-100 animate-pulse rounded-xl" />} />)}
      </div>

      <SectionTitle icon={<Flame size={16} className="text-orange-500" />}>Streak highlights</SectionTitle>
      {topStreaks.slice(0, 5).map((x) => (
        <Card key={x.a.id} className="p-3 mb-2 flex items-center gap-3">
          <div className="w-2 h-8 rounded-full" style={{ background: x.a.color }} />
          <div className="flex-1 text-sm font-semibold">{x.a.name}</div>
          <span className="text-sm font-extrabold text-orange-500">🔥 {x.s.current}</span>
        </Card>
      ))}

      <button onClick={share} className="w-full mt-3 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm flex items-center justify-center gap-2"><Share2 size={16} /> {copied ? "Recap copied! ✓" : "Copy / share recap"}</button>
      <div className="text-[11px] text-slate-400 px-1 mt-2">Copies a clean text summary to share with family. A real build adds a one-tap PDF or email with the photos attached, and true week/month date ranges (this prototype counts the current session).</div>
    </>
  );
}

function MoreParent(props) {
  const [sub, setSub] = useState("menu");
  if (sub === "portfolio") return <BackWrap title="Progress Portfolio" onBack={() => setSub("menu")}><Portfolio {...props} /></BackWrap>;
  if (sub === "weekly") return <BackWrap title="Weekly Summary" onBack={() => setSub("menu")}><Weekly {...props} /></BackWrap>;
  if (sub === "handoff") return <BackWrap title="Handoff Notes" onBack={() => setSub("menu")}><HandoffFull {...props} /></BackWrap>;
  if (sub === "skills") return <BackWrap title="Learning Goals" onBack={() => setSub("menu")}><Skills /></BackWrap>;
  if (sub === "people") return <BackWrap title="Family & Helpers" onBack={() => setSub("menu")}><People {...props} /></BackWrap>;
  if (sub === "activities") return <BackWrap title="Activities" onBack={() => setSub("menu")}><ManageActivities {...props} /></BackWrap>;
  if (sub === "tasks") return <BackWrap title="Tasks & Chores" onBack={() => setSub("menu")}><ManageTasks {...props} /></BackWrap>;
  if (sub === "library") return <BackWrap title="Reading Library" onBack={() => setSub("menu")}><ReadingLibrary {...props} /></BackWrap>;
  if (sub === "grades") return <BackWrap title="Grade Goals" onBack={() => setSub("menu")}><GradeGoals /></BackWrap>;
  if (sub === "recap") return <BackWrap title="Recap & Memories" onBack={() => setSub("menu")}><ParentRecap {...props} /></BackWrap>;
  if (sub === "awards") return <BackWrap title="Accomplishments" onBack={() => setSub("menu")}><Accomplishments {...props} /></BackWrap>;
  if (sub === "board_theme") return <BackWrap title="Adventure Board" onBack={() => setSub("menu")}><AdventureBoardSettings {...props} /></BackWrap>;
  if (sub === "gallery") return <BackWrap title="Photo Gallery" onBack={() => setSub("menu")}><PhotoGallery {...props} /></BackWrap>;
  if (sub === "insights") return <BackWrap title="Insights" onBack={() => setSub("menu")}><Insights {...props} /></BackWrap>;
  if (sub === "export") return <BackWrap title="Export Data" onBack={() => setSub("menu")}><DataExport {...props} /></BackWrap>;
  if (sub === "slideshow") return <BackWrap title="Milestone Slideshows" onBack={() => setSub("menu")}><MilestoneSlideshow {...props} /></BackWrap>;
  const items = [
    { k: "portfolio", icon: <ImageIcon size={18} />, label: "Progress Portfolio", sub: "Photos, art & writing over time" },
    { k: "weekly", icon: <ClipboardList size={18} />, label: "Weekly Summary", sub: "Minutes, wins, needs attention" },
    { k: "handoff", icon: <Users size={18} />, label: "Handoff Notes", sub: "What the next adult needs to know" },
    { k: "skills", icon: <GraduationCap size={18} />, label: "Learning Goals", sub: "Grade-level skill tracker (early)" },
    { k: "people", icon: <Users size={18} />, label: "Family & Helpers", sub: "Add people · set access & limits" },
    { k: "activities", icon: <Palette size={18} />, label: "Activities & Status", sub: "Add activities · breaks/seasons · colors" },
    { k: "tasks", icon: <ClipboardList size={18} />, label: "Tasks & Chores", sub: "Add · edit · pause · remove" },
    { k: "library", icon: <BookOpen size={18} />, label: "Reading Library", sub: "Books · level · reading pace" },
    { k: "grades", icon: <Trophy size={18} />, label: "Grade Goals", sub: "Grades 1–6 · world's best standards" },
    { k: "recap", icon: <Share2 size={18} />, label: "Recap & Memories", sub: "Weekly/monthly export · anniversaries" },
    { k: "awards", icon: <Medal size={18} />, label: "Accomplishments", sub: "Report cards · belts · certificates" },
    { k: "board_theme", icon: <Map size={18} />, label: "Adventure Board", sub: "Daily target · theme · controls" },
    { k: "gallery", icon: <Camera size={18} />, label: "Photo Gallery", sub: "Every photo · sort by date · filter by activity" },
    { k: "insights", icon: <TrendingUp size={18} />, label: "Insights", sub: "Practice time · songs · books · counts" },
    { k: "export", icon: <Download size={18} />, label: "Export Data", sub: "CSV downloads — own your data" },
    { k: "slideshow", icon: <Play size={18} />, label: "Milestone Slideshows", sub: "Monthly · 6-month · 1-year recaps" },
  ];
  return (
    <div className="px-4 pt-4">
      <h2 className="font-extrabold text-lg px-1 mb-2">More</h2>
      {items.map((i) => (
        <button key={i.k} onClick={() => setSub(i.k)} className="w-full mb-2 active:scale-[0.98] transition">
          <Card className="p-4 flex items-center gap-3 text-left">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 grid place-items-center text-indigo-600">{i.icon}</div>
            <div className="flex-1"><div className="font-bold text-sm">{i.label}</div><div className="text-[11px] text-slate-400">{i.sub}</div></div>
            <ChevronLeft size={16} className="rotate-180 text-slate-300" />
          </Card>
        </button>
      ))}
    </div>
  );
}
// Adventure Board parent settings — combines daily cap + theme picker.
// Per-family settings via familySetting; instant effect on the kid's
// next render of the Board tab.
function AdventureBoardSettings(props) {
  const { boardDailyCap, setBoardDailyCap, todaysTasks } = props;
  const total = (todaysTasks || []).length;
  const required = (todaysTasks || []).filter((t) => t.required).length;
  const cap = Number(boardDailyCap) > 0 ? Math.floor(Number(boardDailyCap)) : null;
  // Clamp range — at least 3 spaces to keep the path interesting, at
  // most 14 so the board doesn't get crowded again.
  const MIN_CAP = 3;
  const MAX_CAP = 14;
  const bump = (delta) => {
    const next = (cap ?? 9) + delta;
    setBoardDailyCap(Math.max(MIN_CAP, Math.min(MAX_CAP, next)));
  };
  const displayed = Math.min(cap ?? total, total);
  return (
    <div className="space-y-4">
      {/* Daily target dial */}
      <div
        className="rounded-3xl p-4 text-white relative overflow-hidden"
        style={{ background: "linear-gradient(135deg,#7c2d12 0%, #c2410c 50%, #ea580c 100%)" }}
      >
        <Sparkles className="absolute -right-3 -top-3 opacity-20" size={64} />
        <div className="text-[10px] uppercase tracking-widest text-white/80 font-bold flex items-center gap-1.5">
          <Map size={11} /> Today's Quest Cap
        </div>
        <div className="flex items-center justify-between mt-2 gap-3">
          <button
            type="button"
            onClick={() => bump(-1)}
            disabled={(cap ?? 9) <= MIN_CAP}
            className="w-12 h-12 rounded-2xl bg-white/15 border border-white/25 backdrop-blur grid place-items-center text-2xl font-extrabold active:scale-95 disabled:opacity-30 disabled:active:scale-100"
          >
            −
          </button>
          <div className="flex-1 text-center">
            <div className="text-5xl font-extrabold leading-none">
              {cap ?? "All"}
            </div>
            <div className="text-[11px] text-white/80 mt-1.5">
              {cap == null
                ? `Showing all ${total} of today's tasks`
                : `Showing ${displayed} of ${total} today`}
            </div>
          </div>
          <button
            type="button"
            onClick={() => bump(1)}
            disabled={(cap ?? 9) >= MAX_CAP}
            className="w-12 h-12 rounded-2xl bg-white/15 border border-white/25 backdrop-blur grid place-items-center text-2xl font-extrabold active:scale-95 disabled:opacity-30 disabled:active:scale-100"
          >
            +
          </button>
        </div>
        <div className="text-[11px] text-white/80 mt-3 leading-snug">
          Picks required tasks first ({required} today), then extras. Treasure
          unlocks at full clear. Dial up if Reznor needs a longer day; dial
          down if he needs a focused list.
        </div>
      </div>

      {/* Theme picker */}
      <div className="text-xs text-slate-500 px-1 pt-1">
        The Daily Adventure Board's look — applies to everyone in the family.
      </div>
      <BoardThemePicker {...props} />
    </div>
  );
}

// Board theme picker — lives under More for parents. Writes through the
// existing familySetting("boardTheme", ...) so the change takes effect
// immediately on every device on the next render of the Board tab.
// Per-family by design (one theme per family canvas); per-profile theme
// would need a different storage location and is captured as a possible
// v2 in docs/BOARD-THEMES.md.
function BoardThemePicker({ boardTheme, setBoardTheme, users, setCurrentUserId, setTab }) {
  const active = boardTheme || DEFAULT_BOARD_THEME;
  const ids = Object.keys(BOARD_THEMES);
  // Mike's flow: he picks a theme, then jumps into Reznor's profile
  // and onto the board to show him. Used to be 3 separate taps
  // (active theme → back → switch profile → board tab). Now: tap
  // the active card once more → confirm → jump.
  const kid = (users || []).find((u) => u.role === "kid");
  const jumpToBoard = () => {
    if (!kid) {
      alert("Couldn't find Reznor's profile.");
      return;
    }
    const ok = window.confirm("Go to Reznor's game board?");
    if (!ok) return;
    setCurrentUserId?.(kid.id);
    setTab?.("board");
  };
  const onCardTap = (id) => {
    if (id === active) {
      // Second tap on the live theme → offer the jump shortcut.
      jumpToBoard();
    } else {
      setBoardTheme(id);
    }
  };
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3">
        {ids.map((id) => {
          const t = BOARD_THEMES[id];
          const isActive = id === active;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onCardTap(id)}
              className={`relative w-full rounded-2xl overflow-hidden border-2 transition active:scale-[0.99] text-left ${
                isActive ? "border-indigo-500 ring-2 ring-indigo-200" : "border-slate-200 hover:border-indigo-200"
              }`}
            >
              <div
                className="h-28 w-full relative"
                style={{
                  background: t.bgImg
                    ? `url(${t.bgImg}) center / cover, ${t.background}`
                    : t.background,
                }}
              >
                <div className="absolute inset-0 flex items-center justify-around p-3">
                  {t.startImg ? (
                    <img src={t.startImg} alt="" className="w-10 h-10 object-contain drop-shadow-lg" draggable={false} />
                  ) : (
                    <span className="text-3xl drop-shadow-lg">{t.startEmoji}</span>
                  )}
                  {t.tokenRestImg ? (
                    <img src={t.tokenRestImg} alt="" className="w-12 h-12 object-contain drop-shadow-lg" draggable={false} />
                  ) : (
                    <span className="text-3xl drop-shadow-lg">{t.tokenEmoji}</span>
                  )}
                  {t.treasureLockedImg ? (
                    <img src={t.treasureLockedImg} alt="" className="w-12 h-12 object-contain drop-shadow-lg" draggable={false} />
                  ) : (
                    <span className="text-3xl drop-shadow-lg">{t.treasureEmoji}</span>
                  )}
                </div>
              </div>
              <div className="p-3 bg-white flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-slate-800">{t.name}</div>
                  <div className="text-[11px] text-slate-400">
                    {isActive ? "Tap again → Reznor's board" : "Tap to switch"}
                  </div>
                </div>
                {isActive && (
                  <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
                    Active
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
      {/* Always-visible "go now" CTA so the jump is one tap from anywhere
          on the picker, not just from the active card. Saves a tap when
          Mike's already on the right theme and just wants to show Reznor. */}
      {kid && (
        <button
          type="button"
          onClick={jumpToBoard}
          className="w-full mt-2 py-3 rounded-2xl bg-indigo-600 text-white font-extrabold text-sm active:scale-95 flex items-center justify-center gap-2"
        >
          🎮 Go to Reznor's game board
        </button>
      )}
    </div>
  );
}

function BackWrap({ title, onBack, children }) {
  return (
    <div className="px-4 pt-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm font-semibold text-indigo-600 mb-2"><ChevronLeft size={16} />Back</button>
      <h2 className="font-extrabold text-lg px-1 mb-2">{title}</h2>
      {children}
    </div>
  );
}

function Portfolio({ completions, tasks, users, gifted, activities }) {
  const items = completions.filter((c) => c.status === "approved");
  if (!items.length && !(gifted?.length)) return <p className="text-sm text-slate-400 px-1">Approved work with photos will appear here as a timeline.</p>;
  return (
    <>
      {gifted?.map((g) => (
        <Card key={g.id} className="p-3 mb-2 flex gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 grid place-items-center">✨</div>
          <div className="flex-1">
            <div className="font-bold text-sm">{g.label} <span className="text-amber-600 font-normal">· bonus</span></div>
            <div className="text-[11px] text-slate-400">{g.date} · {g.stars}⭐ · gifted by {users.find((u) => u.id === g.by)?.name}</div>
          </div>
        </Card>
      ))}
      {items.map((c) => {
        const t = tasks.find((x) => x.id === c.taskId);
        const by = users.find((u) => u.id === c.approvedBy)?.name;
        const d = actFor(t || { activityType: "" }, activities);
        const ph = c.proof?.find((p) => p.path || p.url);
        return (
          <Card key={c.id} className="p-3 mb-2 flex gap-3">
            {ph ? <StoredPhoto path={ph.path} url={ph.url} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" fallback={<div className="w-12 h-12 rounded-xl bg-slate-100 animate-pulse shrink-0" />} /> : <div className="w-10 h-10 rounded-xl grid place-items-center shrink-0" style={{ background: d.tint }}><TaskIcon type={t?.activityType} color={d.color} /></div>}
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm">{t?.title} {c.extra?.bookTitle && <span className="text-slate-400 font-normal">· {c.extra.bookTitle}</span>}</div>
              <div className="text-[11px] text-slate-400">{fmtDate(today)} · {c.awardedStars}⭐ · approved by {by}</div>
              {ph?.geo && <div className="text-[11px] text-slate-400">📍 {ph.geo.label}{ph.time ? ` · ${ph.time}` : ""}{ph.by ? ` · by ${users.find((u) => u.id === ph.by)?.name || "helper"}` : ""}</div>}
            </div>
          </Card>
        );
      })}
    </>
  );
}

function Weekly({ completions }) {
  const rows = [
    ["Drums", "5 days"], ["English reading", "5 days"], ["Spanish", "6 days"],
    ["Writing", "4 submissions"], ["Math", "4 days"], ["Field trip", "Yes ✓"],
  ];
  const totalStars = completions.filter((c) => c.status === "approved").reduce((s, c) => s + c.awardedStars, 0);
  return (
    <>
      <Card className="p-4 mb-3 text-center"><div className="text-3xl font-extrabold text-amber-500">{totalStars + 130} ⭐</div><div className="text-xs text-slate-400">stars this week (demo)</div></Card>
      {rows.map(([k, v]) => (
        <Card key={k} className="p-3 mb-2 flex items-center justify-between"><span className="text-sm font-semibold">{k}</span><span className="text-sm text-slate-500">{v}</span></Card>
      ))}
      <Card className="p-3 mt-2 bg-emerald-50 border-emerald-100"><div className="text-xs font-bold text-emerald-700 mb-1">🏆 Wins of the week</div><div className="text-sm text-emerald-800">Read a full Spanish book solo. Hit 2-hour drum stretch goal twice.</div></Card>
      <Card className="p-3 mt-2 bg-amber-50 border-amber-100"><div className="text-xs font-bold text-amber-700 mb-1">⚠️ Needs attention</div><div className="text-sm text-amber-800">Math slipped to 4 days — aim for daily next week.</div></Card>
    </>
  );
}

function HandoffFull({ handoff, users, addHandoff }) {
  const [text, setText] = useState("");
  return (
    <>
      <Card className="p-3 mb-3">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder="What does the next adult need to know?" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none" />
        <button onClick={() => { addHandoff(text); setText(""); }} className="w-full mt-2 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm">Post note</button>
      </Card>
      {handoff.map((h) => {
        const a = users.find((u) => u.id === h.authorId);
        return <Card key={h.id} className="p-3 mb-2 text-sm"><div className="text-[11px] text-slate-400 mb-0.5">{a?.name} · {h.time} {h.pinned && "📌"}</div>{h.note}</Card>;
      })}
    </>
  );
}

function Skills() {
  const areas = [
    { area: "English reading", note: "Above grade level — keep stretching with chapter books." },
    { area: "Spanish reading/speaking", note: "Reading solo; build to 5 full spoken sentences/day." },
    { area: "Writing", note: "Daily handwriting + 1 creative piece/week." },
    { area: "Math", note: "On grade — keep consistent." },
    { area: "Music / drums", note: "1hr daily, Drumeo + Melodics fundamentals." },
  ];
  return (
    <>
      <p className="text-sm text-slate-400 px-1 mb-2">Lightweight for now — expand into real standards later.</p>
      {areas.map((a) => <Card key={a.area} className="p-3 mb-2"><div className="font-bold text-sm">{a.area}</div><div className="text-[11px] text-slate-400">{a.note}</div></Card>)}
      <div className="text-[11px] text-slate-400 px-1 mt-2">TODO: grade-band standards, evidence uploads per goal.</div>
    </>
  );
}

// ===================== PARENT: PEOPLE / ACCESS =====================
function People({ users, addUser, updateUser, removeUser, familyId, pendingRegistrations, approveRegistration, denyRegistration, currentProfileId }) {
  const [adding, setAdding] = useState(false);
  const isExpired = (u) => u.accessType === "temporary" && u.accessExpires && new Date(u.accessExpires + "T23:59:59") < today;
  const order = { parent: 0, kid: 1, grandparent: 2, helper: 3, guest: 4 };
  const sorted = [...users].sort((a, b) => (order[a.role] ?? 9) - (order[b.role] ?? 9));
  const locked = (u) => u.role === "kid" || u.role === "parent";
  const me = users.find((u) => u.id === currentProfileId);
  const isParent = me?.role === "parent";
  const pending = pendingRegistrations || [];
  return (
    <>
      {isParent && pending.length > 0 && (
        <Card className="p-3 mb-3 bg-amber-50 border border-amber-200">
          <div className="font-bold text-sm mb-2 flex items-center gap-2">
            <AlertCircle size={14} className="text-amber-600" />
            Pending requests <span className="text-[11px] font-semibold text-amber-700">({pending.length})</span>
          </div>
          {pending.map((r) => (
            <PendingRequestRow
              key={r.authUserId}
              req={r}
              onApprove={(payload) => approveRegistration({ authUserId: r.authUserId, ...payload })}
              onDeny={() => { if (confirm(`Deny ${r.email}?`)) denyRegistration(r.authUserId); }}
            />
          ))}
        </Card>
      )}

      {sorted.map((u) => {
        const expired = isExpired(u);
        return (
          <Card key={u.id} className="p-3 mb-2">
            <div className="flex items-center gap-3">
              <label className="relative cursor-pointer shrink-0">
                <Avatar user={u} size={44} />
                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-indigo-600 text-white grid place-items-center border-2 border-white"><Camera size={10} /></span>
                <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  try {
                    const { path } = await uploadFamilyPhoto({ file: f, familyId, kind: "avatar" });
                    updateUser(u.id, { photo: path });
                  } catch (err) {
                    alert("Avatar upload failed: " + (err.message || err));
                  }
                }} />
              </label>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm flex items-center gap-2">{u.name}<span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 capitalize">{u.role}</span></div>
                <div className="text-[11px] text-slate-400">
                  {u.relationship}
                  {u.accessType === "temporary" && (expired
                    ? <span className="text-rose-500 font-semibold"> · access ended {fmtShort(u.accessExpires)}</span>
                    : <span className="text-amber-600 font-semibold"> · guest until {fmtShort(u.accessExpires)}</span>)}
                  {u.accessType === "permanent" && !locked(u) && " · ongoing access"}
                </div>
              </div>
              {u.photo && <button onClick={() => updateUser(u.id, { photo: "" })} className="text-[10px] font-semibold text-slate-400 shrink-0">Remove photo</button>}
              {!locked(u) && <button onClick={() => removeUser(u.id)} className="text-slate-300 hover:text-rose-500 p-1"><X size={16} /></button>}
            </div>
            {!locked(u) && (
              <div className="flex flex-wrap gap-2 mt-2">
                <Toggle on={u.active !== false && !expired} label={expired ? "Expired" : (u.active === false ? "Disabled" : "Active")} disabled={expired} onClick={() => updateUser(u.id, { active: u.active === false })} />
                <Toggle on={!!u.permissions?.approveSimple} label="Can approve simple tasks" onClick={() => updateUser(u.id, { permissions: { ...u.permissions, approveSimple: !u.permissions?.approveSimple } })} />
                {["grandparent", "helper", "guest"].includes(u.role) && <Toggle on={!!u.easyLocked} label="💛 Lock to Easy mode" onClick={() => updateUser(u.id, { easyLocked: !u.easyLocked })} />}
              </div>
            )}
            {u.role !== "kid" && (
              <EmailEditor user={u} onSave={(email) => updateUser(u.id, { email })} />
            )}
            {!locked(u) && (
              <AccessEditor
                user={u}
                onSave={({ accessType, accessExpires }) =>
                  updateUser(u.id, { accessType, accessExpires })
                }
              />
            )}
          </Card>
        );
      })}

      {!adding && <button onClick={() => setAdding(true)} className="w-full mt-2 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm flex items-center justify-center gap-2"><Plus size={16} /> Add a person</button>}
      {adding && <AddPersonForm onCancel={() => setAdding(false)} onAdd={(u) => { addUser(u); setAdding(false); }} />}

      <div className="text-[11px] text-slate-400 px-1 mt-3">Temporary access auto-expires on its end date — a one-week sitter won't keep getting in. TODO(real-build): enforce expiry + per-day time windows server-side.</div>
    </>
  );
}

function Toggle({ on, label, onClick, disabled }) {
  return (
    <button disabled={disabled} onClick={onClick} className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-full flex items-center gap-1 ${on ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"} ${disabled ? "opacity-50" : ""}`}>
      {on && <Check size={12} />}{label}
    </button>
  );
}

// A row in the parent's "Pending requests" queue. Tap Approve to expand
// the role + access form, then submit → server creates the profile and
// the queue shrinks.
function PendingRequestRow({ req, onApprove, onDeny }) {
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState(req.displayName || (req.email || "").split("@")[0] || "");
  const [role, setRole] = useState("helper");
  const [relationship, setRelationship] = useState("");
  const [temp, setTemp] = useState(false);
  const [expires, setExpires] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
  const ready = name.trim().length > 0 && (!temp || !!expires);
  const submit = () => {
    onApprove({
      name: name.trim(),
      role,
      relationship: relationship.trim() || null,
      accessType: temp ? "temporary" : "permanent",
      accessExpires: temp ? expires : null,
    });
  };
  const requestedAt = req.requestedAt ? new Date(req.requestedAt).toLocaleString() : "";
  if (!expanded) {
    return (
      <div className="flex items-center gap-2 py-2 border-t border-amber-200 first:border-t-0">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">{req.displayName || req.email}</div>
          <div className="text-[11px] text-amber-700 truncate">{req.email}{requestedAt ? ` · ${requestedAt}` : ""}</div>
        </div>
        <button onClick={onDeny} className="text-xs font-bold px-2.5 py-1.5 rounded-xl bg-white border border-rose-200 text-rose-600">Deny</button>
        <button onClick={() => setExpanded(true)} className="text-xs font-bold px-2.5 py-1.5 rounded-xl bg-emerald-600 text-white">Approve…</button>
      </div>
    );
  }
  const Switch = ({ on }) => <span className={`w-10 h-6 rounded-full p-0.5 transition shrink-0 ${on ? "bg-emerald-500" : "bg-slate-300"}`}><span className={`block w-5 h-5 bg-white rounded-full transition ${on ? "translate-x-4" : ""}`} /></span>;
  return (
    <div className="py-2 border-t border-amber-200 first:border-t-0">
      <div className="text-[11px] text-amber-700 mb-2">{req.email}{requestedAt ? ` · ${requestedAt}` : ""}</div>
      <Field label="Name shown in the app"><input value={name} onChange={(e) => setName(e.target.value)} className="ppl-input" /></Field>
      <div className="mt-2"><Field label="Relationship (optional)"><input value={relationship} onChange={(e) => setRelationship(e.target.value)} placeholder="Aunt, sitter, friend…" className="ppl-input" /></Field></div>
      <div className="mt-3 text-xs font-semibold text-slate-500 mb-1">Role</div>
      <div className="grid grid-cols-2 gap-2">
        {[["helper", "Helper / Sitter"], ["grandparent", "Grandparent"], ["guest", "Guest (temporary)"], ["parent", "Parent admin"]].map(([k, l]) => (
          <button key={k} type="button" onClick={() => { setRole(k); if (k === "guest") setTemp(true); }} className={`py-2 rounded-xl text-xs font-semibold ${role === k ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>{l}</button>
        ))}
      </div>
      <button type="button" onClick={() => setTemp(!temp)} className="mt-3 w-full flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2.5">
        <span className="text-sm font-semibold">Temporary access</span><Switch on={temp} />
      </button>
      {temp && (
        <div className="mt-2">
          <Field label="Access ends after"><input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} className="ppl-input" /></Field>
          <div className="text-[11px] text-slate-400 mt-1">After this date they can't load the app.</div>
        </div>
      )}
      <div className="flex gap-2 mt-3">
        <button onClick={() => setExpanded(false)} className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-500 font-bold text-xs">Cancel</button>
        <button disabled={!ready} onClick={submit} className={`flex-1 py-2 rounded-xl font-bold text-xs text-white ${ready ? "bg-emerald-600" : "bg-slate-200 text-slate-400"}`}>Approve & create profile</button>
      </div>
      <style>{`.ppl-input{width:100%;border:1px solid #e2e8f0;border-radius:0.75rem;padding:0.5rem 0.7rem;font-size:0.9rem;outline:none}.ppl-input:focus{border-color:#6366f1}`}</style>
    </div>
  );
}

// Per-profile access-window editor: permanent or temporary-with-expiry.
// Existing UI already shows the badge + auto-disables expired users;
// this is the place to change the window after the fact.
function AccessEditor({ user, onSave }) {
  const [editing, setEditing] = useState(false);
  const [temp, setTemp] = useState(user.accessType === "temporary");
  const [expires, setExpires] = useState(user.accessExpires || (() => {
    const d = new Date(); d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  })());
  const save = () => {
    onSave({
      accessType: temp ? "temporary" : "permanent",
      accessExpires: temp ? expires : null,
    });
    setEditing(false);
  };
  const summary = user.accessType === "temporary"
    ? (user.accessExpires ? `Timed · ends ${fmtShort(user.accessExpires)}` : "Timed")
    : "Permanent";
  if (!editing) {
    return (
      <div className="mt-2 flex items-center gap-2">
        <span className="text-[11px] font-semibold text-slate-400 shrink-0">Access</span>
        <span className="text-[11px] text-slate-600 flex-1 truncate">{summary}</span>
        <button onClick={() => setEditing(true)} className="text-[11px] font-semibold text-indigo-600 shrink-0">Edit</button>
      </div>
    );
  }
  const Switch = ({ on }) => <span className={`w-10 h-6 rounded-full p-0.5 transition shrink-0 ${on ? "bg-emerald-500" : "bg-slate-300"}`}><span className={`block w-5 h-5 bg-white rounded-full transition ${on ? "translate-x-4" : ""}`} /></span>;
  return (
    <div className="mt-2">
      <button type="button" onClick={() => setTemp(!temp)} className="w-full flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2.5">
        <span className="text-sm font-semibold">Temporary access</span><Switch on={temp} />
      </button>
      {temp && (
        <div className="mt-2">
          <Field label="Access ends after"><input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} className="ppl-input" /></Field>
        </div>
      )}
      <div className="flex gap-2 mt-2">
        <button onClick={() => setEditing(false)} className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-500 font-bold text-xs">Cancel</button>
        <button onClick={save} className="flex-1 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs">Save</button>
      </div>
      <style>{`.ppl-input{width:100%;border:1px solid #e2e8f0;border-radius:0.75rem;padding:0.5rem 0.7rem;font-size:0.9rem;outline:none}.ppl-input:focus{border-color:#6366f1}`}</style>
    </div>
  );
}

// Inline editor for a profile's login email. Saving an email lets that
// person sign in via Supabase Auth with that address — the
// claim_profile_by_email RPC stamps auth_user_id on their first login.
function EmailEditor({ user, onSave }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(user.email || "");
  const valid = !value.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  const save = () => {
    const v = value.trim().toLowerCase();
    onSave(v || null);
    setEditing(false);
  };
  const cancel = () => { setValue(user.email || ""); setEditing(false); };
  if (!editing) {
    return (
      <div className="mt-2 flex items-center gap-2">
        <span className="text-[11px] font-semibold text-slate-400 shrink-0">Login email</span>
        <span className="text-[11px] text-slate-600 truncate flex-1">{user.email || <span className="text-slate-400 italic">not set</span>}</span>
        <button onClick={() => setEditing(true)} className="text-[11px] font-semibold text-indigo-600 shrink-0">{user.email ? "Edit" : "Attach"}</button>
      </div>
    );
  }
  return (
    <div className="mt-2">
      <div className="flex gap-2 items-center">
        <input
          type="email"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="name@example.com"
          className="ppl-input flex-1"
          style={{ width: "auto" }}
        />
        <button disabled={!valid} onClick={save} className={`text-xs font-bold px-3 py-2 rounded-xl ${valid ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-400"}`}>Save</button>
        <button onClick={cancel} className="text-xs font-bold px-3 py-2 rounded-xl bg-slate-100 text-slate-500">Cancel</button>
      </div>
      <div className="text-[10px] text-slate-400 mt-1">
        They sign up at the login screen with this email — once they do, they're auto-linked to this profile.
      </div>
      <style>{`.ppl-input{width:100%;border:1px solid #e2e8f0;border-radius:0.75rem;padding:0.5rem 0.7rem;font-size:0.9rem;outline:none}.ppl-input:focus{border-color:#6366f1}`}</style>
    </div>
  );
}

function AddPersonForm({ onCancel, onAdd }) {
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [role, setRole] = useState("helper");
  const [emoji, setEmoji] = useState("🙂");
  const [email, setEmail] = useState("");
  const [temp, setTemp] = useState(false);
  const [expires, setExpires] = useState("2026-06-13");
  const [approveSimple, setApproveSimple] = useState(false);
  const emojis = ["🙂", "🧡", "🧩", "👵", "👴", "🧑", "👩", "👨", "⭐", "🦖"];
  const colors = { parent: "#2563eb", grandparent: "#7c3aed", helper: "#0d9488", guest: "#64748b" };
  const emailOk = !email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const ready = name.trim().length > 0 && emailOk;
  const submit = () => onAdd({
    name: name.trim(),
    relationship: relationship.trim() || (role === "guest" ? "Guest sitter" : role === "grandparent" ? "Grandparent" : "Helper"),
    role, emoji, color: colors[role] || "#64748b", active: true,
    email: email.trim().toLowerCase() || null,
    accessType: temp ? "temporary" : "permanent",
    accessExpires: temp ? expires : null,
    permissions: { approveSimple, approveAll: role === "parent", viewReports: role !== "guest" },
  });
  const Switch = ({ on }) => <span className={`w-10 h-6 rounded-full p-0.5 transition shrink-0 ${on ? "bg-emerald-500" : "bg-slate-300"}`}><span className={`block w-5 h-5 bg-white rounded-full transition ${on ? "translate-x-4" : ""}`} /></span>;
  return (
    <Card className="p-4 mt-2">
      <div className="font-bold text-sm mb-2">Add a person</div>
      <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="First name" className="ppl-input" /></Field>
      <div className="mt-2"><Field label="Relationship (optional)"><input value={relationship} onChange={(e) => setRelationship(e.target.value)} placeholder="Aunt, sitter, friend…" className="ppl-input" /></Field></div>
      <div className="mt-2">
        <Field label="Login email (optional)"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" className="ppl-input" /></Field>
        <div className="text-[10px] text-slate-400 mt-1">Lets them sign in. They sign up at the login screen with this email and get auto-linked to this profile.</div>
      </div>

      <div className="mt-3 text-xs font-semibold text-slate-500 mb-1">Role</div>
      <div className="grid grid-cols-2 gap-2">
        {[["helper", "Helper / Sitter"], ["grandparent", "Grandparent"], ["guest", "Guest (temporary)"], ["parent", "Parent admin"]].map(([k, l]) => (
          <button key={k} onClick={() => { setRole(k); if (k === "guest") setTemp(true); }} className={`py-2 rounded-xl text-xs font-semibold ${role === k ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>{l}</button>
        ))}
      </div>

      <div className="mt-3 text-xs font-semibold text-slate-500 mb-1">Avatar</div>
      <div className="flex flex-wrap gap-1.5">
        {emojis.map((e) => <button key={e} onClick={() => setEmoji(e)} className={`w-9 h-9 rounded-xl text-lg grid place-items-center ${emoji === e ? "bg-indigo-100 ring-2 ring-indigo-400" : "bg-slate-100"}`}>{e}</button>)}
      </div>

      <button onClick={() => setTemp(!temp)} className="mt-3 w-full flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2.5">
        <span className="text-sm font-semibold">Temporary access</span><Switch on={temp} />
      </button>
      {temp && (
        <div className="mt-2">
          <Field label="Access ends after"><input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} className="ppl-input" /></Field>
          <div className="text-[11px] text-slate-400 mt-1">After this date they can't log in. Good for a one-week babysitter.</div>
        </div>
      )}
      {role !== "parent" && role !== "guest" && (
        <button onClick={() => setApproveSimple(!approveSimple)} className="mt-3 w-full flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2.5">
          <span className="text-sm font-semibold">Can approve simple tasks</span><Switch on={approveSimple} />
        </button>
      )}

      <div className="flex gap-2 mt-4">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-500 font-bold text-sm">Cancel</button>
        <button disabled={!ready} onClick={submit} className={`flex-1 py-2.5 rounded-xl font-bold text-sm text-white ${ready ? "bg-indigo-600" : "bg-slate-200 text-slate-400"}`}>Add person</button>
      </div>
      <style>{`.ppl-input{width:100%;border:1px solid #e2e8f0;border-radius:0.75rem;padding:0.5rem 0.7rem;font-size:0.9rem;outline:none}.ppl-input:focus{border-color:#6366f1}`}</style>
    </Card>
  );
}

// ===================== PARENT: ACTIVITIES =====================
const ACT_STATUS = { active: { label: "Active", cls: "bg-emerald-100 text-emerald-700" }, break: { label: "On break", cls: "bg-amber-100 text-amber-700" }, seasonal: { label: "Seasonal", cls: "bg-sky-100 text-sky-700" }, archived: { label: "Archived", cls: "bg-slate-200 text-slate-500" } };
const ACT_PALETTE = ["#2563eb", "#e11d48", "#ea580c", "#ca8a04", "#16a34a", "#0891b2", "#7c3aed", "#c026d3", "#db2777", "#65a30d", "#9333ea", "#0ea5e9", "#64748b"];

function ManageActivities({ activities, addActivity, updateActivity, addTask, streaks, setStreak, stopStreak, bumpStreak, setProgressActId }) {
  const [adding, setAdding] = useState(false);
  const archived = activities.filter((a) => a.status === "archived");
  return (
    <>
      <div className="flex gap-2 mb-1">
        {Object.entries(PILLARS).map(([k, p]) => <div key={k} className="flex-1 rounded-2xl p-2 text-center" style={{ background: p.color + "18" }}><div className="text-lg">{p.emoji}</div><div className="text-[11px] font-bold" style={{ color: p.color }}>{p.label}</div></div>)}
      </div>
      {Object.entries(PILLARS).map(([pk, p]) => {
        const list = activities.filter((a) => a.pillar === pk && a.status !== "archived");
        return (
          <div key={pk}>
            <SectionTitle icon={<span className="text-base">{p.emoji}</span>}>{p.label}</SectionTitle>
            {list.length === 0 ? <p className="text-xs text-slate-400 px-1">None yet.</p> : list.map((a) => <ActivityRow key={a.id} a={a} onUpdate={updateActivity} streaks={streaks} setStreak={setStreak} stopStreak={stopStreak} bumpStreak={bumpStreak} onProgress={setProgressActId} />)}
          </div>
        );
      })}

      {archived.length > 0 && (
        <>
          <SectionTitle icon={<Archive size={16} className="text-slate-400" />}>Archive</SectionTitle>
          {archived.map((a) => (
            <Card key={a.id} className="p-0 overflow-hidden flex items-stretch mb-2 opacity-75">
              <div style={{ background: a.color }} className="w-2.5 shrink-0" />
              <div className="p-3 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="font-bold text-sm flex-1 min-w-0">{a.name}</div>
                  <button onClick={() => updateActivity(a.id, { status: "active" })} className="text-[11px] font-bold text-indigo-600 shrink-0">Restore</button>
                </div>
                {a.note && <div className="text-[11px] text-slate-400 mt-0.5">{a.note}</div>}
              </div>
            </Card>
          ))}
        </>
      )}

      {!adding && <button onClick={() => setAdding(true)} className="w-full mt-3 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm flex items-center justify-center gap-2"><Plus size={16} /> Add an activity</button>}
      {adding && <AddActivityForm onCancel={() => setAdding(false)} onAdd={(a, asTask) => { addActivity(a); if (asTask) addTask({ id: "t_" + Date.now(), title: a.name, category: a.pillar, activityType: a.name, activityId: a.id, required: false, starValue: a.starValue || 5, proofRequired: false, proofType: null, approvalRequired: true, mode: "both", minutes: 30 }); setAdding(false); }} />}
      <div className="text-[11px] text-slate-400 px-1 mt-3">Edit, pause, archive, or add anything — hockey, rugby, whatever's next. Each activity carries its own color strip and can track a daily streak.</div>
    </>
  );
}

function CopyAddressButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        try { await navigator.clipboard.writeText(text); } catch { /* clipboard blocked */ }
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${copied ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
      title="Copy address"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function ActivityRow({ a, onUpdate, streaks, setStreak, stopStreak, bumpStreak, onProgress }) {
  const [editColor, setEditColor] = useState(false);
  const [editName, setEditName] = useState(false);
  const [nameVal, setNameVal] = useState(a.name);
  const [openStreak, setOpenStreak] = useState(false);
  const [editAddr, setEditAddr] = useState(false);
  const s = ACT_STATUS[a.status] || ACT_STATUS.active;
  const st = streaks?.[a.id];
  return (
    <Card className="p-0 overflow-hidden flex items-stretch mb-2">
      <div style={{ background: a.color }} className="w-2.5 shrink-0" />
      <div className="p-3 flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {editName
            ? <input autoFocus value={nameVal} onChange={(e) => setNameVal(e.target.value)} onBlur={() => { if (nameVal.trim()) onUpdate(a.id, { name: nameVal.trim(), short: nameVal.trim().split(" ")[0] }); setEditName(false); }} className="font-bold text-sm flex-1 min-w-0 border border-slate-200 rounded px-1.5 py-0.5" />
            : <div className="font-bold text-sm flex-1 min-w-0 flex items-center gap-1" onClick={() => { setNameVal(a.name); setEditName(true); }}>{a.name} <Pencil size={11} className="text-slate-300" /></div>}
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${s.cls}`}>{s.label}</span>
        </div>
        {a.note && <div className="text-[11px] text-slate-400 mt-0.5">{a.note}</div>}
        {a.address && !editAddr && (
          <div className="flex items-center gap-2 mt-1">
            <a href={`https://maps.google.com/?q=${encodeURIComponent(a.address)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600"><MapPin size={11} /> {a.address}</a>
            <CopyAddressButton text={a.address} />
          </div>
        )}
        {editAddr && (
          <div className="mt-2 flex gap-2">
            <input autoFocus defaultValue={a.address || ""} onBlur={(e) => { onUpdate(a.id, { address: e.target.value.trim() }); setEditAddr(false); }} placeholder="Street, city — for whoever drives him" className="flex-1 border border-slate-200 rounded-lg px-2 py-1 text-sm" />
          </div>
        )}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {["active", "break", "seasonal", "archived"].map((stt) => <button key={stt} onClick={() => onUpdate(a.id, { status: stt })} className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${a.status === stt ? ACT_STATUS[stt].cls : "bg-slate-100 text-slate-400"}`}>{ACT_STATUS[stt].label}</button>)}
          <button onClick={() => setEditAddr((v) => !v)} className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-sky-100 text-sky-600 flex items-center gap-1"><MapPin size={12} /> {a.address ? "Edit address" : "Add address"}</button>
          <button onClick={() => setEditColor((v) => !v)} className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 flex items-center gap-1"><Palette size={12} /> Color</button>
          <button onClick={() => setOpenStreak((v) => !v)} className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-orange-100 text-orange-600 flex items-center gap-1"><Flame size={12} /> {st ? `Streak ${st.current}d` : "Track streak"}</button>
          {onProgress && <button onClick={() => onProgress(a.id)} className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-600 flex items-center gap-1"><CalIcon size={12} /> Progress</button>}
        </div>
        {editColor && <div className="flex flex-wrap gap-1.5 mt-2">{ACT_PALETTE.map((c) => <button key={c} onClick={() => { onUpdate(a.id, { color: c }); setEditColor(false); }} className="w-7 h-7 rounded-lg" style={{ background: c, outline: a.color === c ? "2px solid #1e293b" : "none", outlineOffset: "1px" }} />)}</div>}
        {openStreak && (st ? (
          <div className="mt-2 bg-orange-50 rounded-xl p-3 space-y-2">
            <div className="flex gap-2">
              <label className="flex-1 text-[11px] font-semibold text-slate-500">Current<input type="number" value={st.current} onChange={(e) => setStreak(a.id, { current: Number(e.target.value) })} className="w-full mt-0.5 border border-slate-200 rounded-lg px-2 py-1 text-sm" /></label>
              <label className="flex-1 text-[11px] font-semibold text-slate-500">Best ever<input type="number" value={st.longest} onChange={(e) => setStreak(a.id, { longest: Number(e.target.value) })} className="w-full mt-0.5 border border-slate-200 rounded-lg px-2 py-1 text-sm" /></label>
            </div>
            <label className="block text-[11px] font-semibold text-slate-500">Since<input value={st.since} onChange={(e) => setStreak(a.id, { since: e.target.value })} placeholder="2025-08-01" className="w-full mt-0.5 border border-slate-200 rounded-lg px-2 py-1 text-sm" /></label>
            <div className="flex gap-2">
              <button onClick={() => bumpStreak(a.id)} className="flex-1 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-bold">+1 day today</button>
              <button onClick={() => stopStreak(a.id)} className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-500 text-xs font-bold">Stop</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setStreak(a.id, { current: 0, longest: 0, since: TODAY_ISO, lastDate: "" })} className="mt-2 block text-[11px] font-bold text-orange-600">Start tracking this streak →</button>
        ))}
      </div>
    </Card>
  );
}

function AddActivityForm({ onCancel, onAdd }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#7c3aed");
  const [pillar, setPillar] = useState("brain");
  const [asTask, setAsTask] = useState(true);
  const [stars, setStars] = useState(5);
  const [address, setAddress] = useState("");
  const ready = name.trim().length > 0;
  return (
    <Card className="p-4 mt-2">
      <div className="font-bold text-sm mb-2">Add an activity</div>
      <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Chess Club, Painting Minis" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" /></Field>
      <div className="mt-3"><Field label="Address (optional)"><input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Where it happens — for whoever drives him" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" /></Field></div>
      <div className="mt-3 text-xs font-semibold text-slate-500 mb-1">Pillar</div>
      <div className="grid grid-cols-3 gap-2">{Object.entries(PILLARS).map(([k, p]) => <button key={k} onClick={() => setPillar(k)} className={`py-2 rounded-xl text-xs font-semibold ${pillar === k ? "text-white" : "bg-slate-100 text-slate-500"}`} style={pillar === k ? { background: p.color } : {}}>{p.emoji} {p.label}</button>)}</div>
      <div className="mt-3 text-xs font-semibold text-slate-500 mb-1">Color strip</div>
      <div className="flex flex-wrap gap-1.5">{ACT_PALETTE.map((c) => <button key={c} onClick={() => setColor(c)} className="w-8 h-8 rounded-lg" style={{ background: c, outline: color === c ? "2px solid #1e293b" : "none", outlineOffset: "1px" }} />)}</div>
      <button onClick={() => setAsTask((v) => !v)} className="mt-3 w-full flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2.5">
        <span className="text-sm font-semibold">Add to daily missions (earns stars)</span>
        <span className={`w-10 h-6 rounded-full p-0.5 transition shrink-0 ${asTask ? "bg-emerald-500" : "bg-slate-300"}`}><span className={`block w-5 h-5 bg-white rounded-full transition ${asTask ? "translate-x-4" : ""}`} /></span>
      </button>
      {asTask && <div className="mt-2 flex items-center gap-2"><span className="text-xs text-slate-500">Stars:</span>{[3, 5, 10].map((n) => <button key={n} onClick={() => setStars(n)} className={`px-3 py-1 rounded-lg text-sm font-bold ${stars === n ? "bg-amber-400 text-white" : "bg-slate-100 text-slate-500"}`}>{n}⭐</button>)}</div>}
      <div className="flex gap-2 mt-4">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-500 font-bold text-sm">Cancel</button>
        <button disabled={!ready} onClick={() => onAdd({ id: "a_" + Date.now(), name: name.trim(), short: name.trim().split(" ")[0], color, pillar, status: "active", note: "", address: address.trim(), schedule: [], starValue: stars }, asTask)} className={`flex-1 py-2.5 rounded-xl font-bold text-sm text-white ${ready ? "bg-indigo-600" : "bg-slate-200 text-slate-400"}`}>Add</button>
      </div>
    </Card>
  );
}

// ===================== PARENT: TASKS & CHORES =====================
function ManageTasks({ tasks, updateTask, removeTask, addTask, activities }) {
  const [panel, setPanel] = useState(null); // null | 'chore' | 'task'
  return (
    <>
      <div className="flex gap-2 mb-2">
        <button onClick={() => setPanel(panel === "chore" ? null : "chore")} className="flex-1 py-2.5 rounded-2xl bg-slate-700 text-white font-bold text-sm flex items-center justify-center gap-1"><Plus size={15} /> Chore</button>
        <button onClick={() => setPanel(panel === "task" ? null : "task")} className="flex-1 py-2.5 rounded-2xl bg-indigo-600 text-white font-bold text-sm flex items-center justify-center gap-1"><Plus size={15} /> Task</button>
      </div>
      {panel === "chore" && <AddChoreForm onAdd={(t) => { addTask(t); setPanel(null); }} onCancel={() => setPanel(null)} />}
      {panel === "task" && <AddTaskForm activities={activities} onAdd={(t) => { addTask(t); setPanel(null); }} onCancel={() => setPanel(null)} />}
      {tasks.map((t) => <TaskEditRow key={t.id} t={t} activities={activities} updateTask={updateTask} removeTask={removeTask} />)}
      <div className="text-[11px] text-slate-400 px-1 mt-3">Add a chore (feed the dog), a one-off task (recital sheet music), pause anything, or remove it. Paused tasks drop off Reznor's board but keep their history.</div>
    </>
  );
}

function TaskEditRow({ t, activities, updateTask, removeTask }) {
  const [edit, setEdit] = useState(false);
  const d = actFor(t, activities);
  return (
    <div className="rounded-2xl overflow-hidden border border-slate-100 flex items-stretch mb-2" style={{ opacity: t.active === false ? 0.5 : 1 }}>
      <div style={{ background: d.color }} className="w-2.5 shrink-0" />
      <div className="p-3 flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {edit
            ? <input value={t.title} onChange={(e) => updateTask(t.id, { title: e.target.value })} className="font-bold text-sm flex-1 min-w-0 border border-slate-200 rounded px-1.5 py-0.5" />
            : <div className="font-bold text-sm flex-1 min-w-0">{t.title}</div>}
          <div className="flex items-center gap-1 shrink-0"><input type="number" value={t.starValue} onChange={(e) => updateTask(t.id, { starValue: Number(e.target.value) })} className="w-12 border border-slate-200 rounded px-1.5 py-0.5 text-sm" /><span className="text-xs">⭐</span></div>
          <button onClick={() => setEdit((v) => !v)} className="p-1 text-slate-400 shrink-0"><Pencil size={15} /></button>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: d.color + "22", color: d.color }}>{d.label}</span>
          <button onClick={() => updateTask(t.id, { required: !t.required })} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${t.required ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-400"}`}>{t.required ? "Required" : "Optional"}</button>
          <button onClick={() => updateTask(t.id, { proofRequired: !t.proofRequired, proofType: !t.proofRequired ? (t.proofType || "photo") : t.proofType })} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${t.proofRequired ? "bg-sky-100 text-sky-600" : "bg-slate-100 text-slate-400"}`}>{t.proofRequired ? "Needs photo" : "No proof"}</button>
          <span className="text-[10px] text-slate-400">{t.mode === "both" ? "every day" : t.mode + " only"}{t.active === false ? " · paused" : ""}</span>
        </div>
        {edit && (
          <div className="flex gap-2 mt-2">
            <button onClick={() => updateTask(t.id, { active: t.active === false })} className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold">{t.active === false ? "Un-pause" : "Pause"}</button>
            <button onClick={() => removeTask(t.id)} className="px-3 py-2 rounded-xl bg-rose-100 text-rose-600 text-xs font-bold flex items-center gap-1"><X size={14} /> Remove</button>
          </div>
        )}
      </div>
    </div>
  );
}

function AddChoreForm({ onAdd, onCancel }) {
  const [name, setName] = useState("");
  const [stars, setStars] = useState(3);
  return (
    <Card className="p-4 mb-2">
      <div className="font-bold text-sm mb-2">New chore</div>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Feed the dog" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm mb-2" />
      <div className="flex items-center gap-2 mb-3"><span className="text-xs text-slate-500">Stars</span>{[2, 3, 5].map((n) => <button key={n} onClick={() => setStars(n)} className={`px-3 py-1 rounded-lg text-sm font-bold ${stars === n ? "bg-amber-400 text-white" : "bg-slate-100 text-slate-500"}`}>{n}⭐</button>)}</div>
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-500 font-bold text-sm">Cancel</button>
        <button disabled={!name.trim()} onClick={() => onAdd({ id: "t_" + Date.now(), title: name.trim(), category: "Chores", activityType: "Chores", activityId: "a_chores", required: true, starValue: stars, proofRequired: false, proofType: null, approvalRequired: false, mode: "both", minutes: 5, active: true })} className={`flex-1 py-2.5 rounded-xl font-bold text-sm text-white ${name.trim() ? "bg-indigo-600" : "bg-slate-200 text-slate-400"}`}>Add chore</button>
      </div>
    </Card>
  );
}

function AddTaskForm({ activities, onAdd, onCancel }) {
  const opts = activities.filter((a) => a.status !== "archived");
  const [name, setName] = useState("");
  const [actId, setActId] = useState(opts[0]?.id);
  const [stars, setStars] = useState(5);
  const [required, setRequired] = useState(true);
  const [proof, setProof] = useState(false);
  const [when, setWhen] = useState("both");
  const act = opts.find((a) => a.id === actId);
  return (
    <Card className="p-4 mb-2">
      <div className="font-bold text-sm mb-2">New task</div>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sight-read recital sheet music" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm mb-2" />
      <div className="text-xs font-semibold text-slate-500 mb-1">Activity</div>
      <div className="flex flex-wrap gap-1.5 mb-2">{opts.map((a) => <button key={a.id} onClick={() => setActId(a.id)} className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={actId === a.id ? { background: a.color, color: "#fff" } : { background: "#f1f5f9", color: "#64748b" }}>{a.short || a.name}</button>)}</div>
      <div className="flex items-center gap-2 mb-2"><span className="text-xs text-slate-500">Stars</span>{[3, 5, 10, 15].map((n) => <button key={n} onClick={() => setStars(n)} className={`px-2.5 py-1 rounded-lg text-sm font-bold ${stars === n ? "bg-amber-400 text-white" : "bg-slate-100 text-slate-500"}`}>{n}</button>)}</div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        <button onClick={() => setRequired((v) => !v)} className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${required ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-400"}`}>{required ? "Required" : "Optional"}</button>
        <button onClick={() => setProof((v) => !v)} className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${proof ? "bg-sky-100 text-sky-600" : "bg-slate-100 text-slate-400"}`}>{proof ? "Needs photo" : "No proof"}</button>
      </div>
      <div className="text-xs font-semibold text-slate-500 mb-1">When</div>
      <div className="flex gap-1.5 mb-3">{[["both", "Every day"], ["summer", "Summer only"], ["school", "School only"]].map(([k, l]) => <button key={k} onClick={() => setWhen(k)} className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${when === k ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>{l}</button>)}</div>
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-500 font-bold text-sm">Cancel</button>
        <button disabled={!name.trim() || !act} onClick={() => onAdd({ id: "t_" + Date.now(), title: name.trim(), category: act.pillar, activityType: act.name, activityId: act.id, required, starValue: stars, proofRequired: proof, proofType: proof ? "photo" : null, approvalRequired: true, mode: when, minutes: 20, active: true })} className={`flex-1 py-2.5 rounded-xl font-bold text-sm text-white ${name.trim() && act ? "bg-indigo-600" : "bg-slate-200 text-slate-400"}`}>Add task</button>
      </div>
    </Card>
  );
}

// ===================== HELPER / GRANDPARENT =====================
function HelperToday(props) {
  const locked = !!props.user?.easyLocked;
  const [easy, setEasy] = useState(locked || props.user?.role === "grandparent");
  const showEasy = locked || easy;
  return showEasy
    ? <EasyChecklist {...props} onFull={locked ? null : () => setEasy(false)} />
    : <HelperChecklist {...props} onEasy={() => setEasy(true)} />;
}

// Parents can drop into Easy mode when tired, and always exit it.
function ParentTodayHome(props) {
  const [easy, setEasy] = useState(false);
  return easy
    ? <EasyChecklist {...props} onFull={() => setEasy(false)} />
    : <ParentToday {...props} onEasy={() => setEasy(true)} />;
}

// Big, calm, must-dos-only view for a tired grandma babysitting.
function EasyChecklist({ todaysTasks, compByTask, submitTask, undoTask, user, mode, priorities, activities, onFull, familyId }) {
  const onPhoto = async (t, file) => {
    if (!file) return;
    try {
      const { path, name } = await uploadFamilyPhoto({ file, familyId, kind: "proof" });
      const geo = await captureLocation();
      submitTask(t.id, { proof: [{ type: "photo", name, path, geo, by: user.id, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }] });
    } catch (err) {
      alert("Photo upload failed: " + (err.message || err));
    }
  };
  const essentials = todaysTasks.filter((t) => { const lvl = levelOf(t, mode, priorities); return lvl === "must" || lvl === "today"; });
  const ordered = sortByLevel(essentials.length ? essentials : todaysTasks.filter((t) => t.required), mode, priorities);
  const remaining = ordered.filter((t) => { const c = compByTask[t.id]; return !(c?.status === "approved" || c?.status === "pending"); });
  const allDone = remaining.length === 0;
  return (
    <div className="px-4 pt-4 pb-10">
      <div className="rounded-3xl p-5 text-white text-center" style={{ background: "linear-gradient(135deg,#f59e0b,#ec4899)" }}>
        <div className="text-2xl font-extrabold">Hi {user.name}! 💛</div>
        <div className="text-base opacity-95 mt-1">{allDone ? "Everything's done — go relax! 🎉" : `Just ${remaining.length} important thing${remaining.length > 1 ? "s" : ""} today.`}</div>
      </div>

      {allDone ? (
        <div className="text-center py-12"><div className="text-6xl mb-3">🎉</div><div className="text-xl font-extrabold text-slate-700">All done!</div><div className="text-slate-400 mt-1 px-6">Reznor's must-dos are finished. Put your feet up — you've got this.</div></div>
      ) : (
        <div className="mt-4 space-y-3">
          {ordered.map((t) => {
            const c = compByTask[t.id];
            const done = c?.status === "approved" || c?.status === "pending";
            const canMark = user.role === "parent" || !t.approvalRequired || t.proofType === null || user.permissions?.approveSimple;
            const d = actFor(t, activities);
            return (
              <div key={t.id} className={`rounded-3xl p-5 border-2 ${done ? "border-emerald-200 bg-emerald-50" : "border-slate-100 bg-white"}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-16 h-16 rounded-2xl grid place-items-center shrink-0 ${done ? "opacity-60" : ""}`} style={{ background: d.color }}><TaskIcon type={t.activityType} color="#ffffff" /></div>
                  <div className="flex-1 min-w-0"><div className={`text-xl font-extrabold leading-tight ${done ? "text-slate-400 line-through" : ""}`}>{t.title}</div><div className="text-sm text-slate-400 mt-0.5">{done ? "Done ✓" : `${t.minutes} min`}</div></div>
                  {done && <button onClick={() => undoTask(t.id)} className="shrink-0 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-500 text-sm font-bold flex items-center gap-1"><RotateCcw size={16} /> Undo</button>}
                </div>
                {!done && (
                  <div className="flex gap-2 mt-4">
                    <button disabled={!canMark} onClick={() => submitTask(t.id, {})} className={`flex-1 py-4 rounded-2xl text-white text-lg font-extrabold flex items-center justify-center gap-2 ${canMark ? "bg-emerald-500 active:scale-95" : "bg-slate-200 text-slate-400"}`}><Check size={24} /> {canMark ? "Done!" : "Parent only"}</button>
                    <label className="w-16 rounded-2xl bg-slate-100 grid place-items-center cursor-pointer active:scale-95"><Camera size={24} className="text-slate-500" /><input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onPhoto(t, e.target.files?.[0])} /></label>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-7">
        <div className="text-xs font-bold text-slate-400 text-center mb-2">Need a grown-up?</div>
        <div className="grid grid-cols-2 gap-2">
          {CONTACTS.filter((c) => /mom|dad|mike|krissie/i.test(c.label)).slice(0, 2).map((c) => (
            <button key={c.label} className="py-4 rounded-2xl bg-rose-500 text-white text-center font-extrabold flex items-center justify-center gap-2 active:scale-95"><Phone size={20} /> {c.label.replace(/\s*\(.*\)/, "")}</button>
          ))}
        </div>
      </div>
      {onFull
        ? <button onClick={onFull} className="w-full mt-4 py-3 rounded-2xl bg-slate-100 text-slate-500 font-bold text-sm">Show everything</button>
        : <div className="w-full mt-4 py-3 rounded-2xl bg-slate-50 text-slate-300 font-bold text-sm text-center flex items-center justify-center gap-1"><Lock size={13} /> Easy mode (set by parents)</div>}
    </div>
  );
}

function HelperChecklist({ todaysTasks, compByTask, submitTask, undoTask, user, mode, priorities, users, activities, onEasy, familyId }) {
  const ordered = sortByLevel(todaysTasks, mode, priorities);
  const onPhoto = async (t, file) => {
    if (!file) return;
    try {
      const { path, name } = await uploadFamilyPhoto({ file, familyId, kind: "proof" });
      const geo = await captureLocation();
      submitTask(t.id, { proof: [{ type: "photo", name, path, geo, by: user.id, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }] });
    } catch (err) {
      alert("Photo upload failed: " + (err.message || err));
    }
  };
  return (
    <div className="px-4 pt-4">
      <div className="rounded-3xl p-4 text-white" style={{ background: "linear-gradient(135deg,#0d9488,#0891b2)" }}>
        <div className="flex items-center justify-between">
          <div className="font-bold">Hi {user.name}! 🧡</div>
          {onEasy && <button onClick={onEasy} className="text-[11px] font-bold bg-white/20 rounded-full px-2.5 py-1">💛 Easy mode</button>}
        </div>
        <div className="text-sm opacity-90 mt-0.5">Snap a photo at swim, drums, etc. — parents love seeing it, and it logs the time & place. 📍</div>
      </div>
      <SectionTitle icon={<ClipboardList size={16} className="text-teal-500" />}>Today's checklist <span className="text-[11px] font-normal text-slate-400">· most important first</span></SectionTitle>
      {ordered.map((t) => {
        const c = compByTask[t.id];
        const done = c?.status === "approved" || c?.status === "pending";
        const canMark = !t.approvalRequired || t.proofType === null || user.permissions?.approveSimple;
        const d = actFor(t, activities);
        const lvl = levelOf(t, mode, priorities);
        const P = PRIORITY[lvl];
        const ov = priorities?.[t.id];
        return (
          <div key={t.id} className={`rounded-2xl overflow-hidden border border-slate-100 flex items-stretch mb-2 ${done ? "opacity-60" : ""}`} style={{ background: lvl === "normal" ? d.color + "12" : P.wash }}>
            <div style={{ background: d.color }} className="w-12 shrink-0 grid place-items-center"><TaskIcon type={t.activityType} color="#ffffff" /></div>
            <div className="flex items-center gap-2 p-3 flex-1 min-w-0">
              <button
                disabled={!canMark || done}
                onClick={() => submitTask(t.id, {})}
                className={`w-8 h-8 rounded-xl grid place-items-center shrink-0 ${done ? "bg-emerald-500 text-white" : canMark ? "border-2 border-slate-300 bg-white" : "bg-slate-50 border border-slate-100"}`}>
                {done ? <Check size={16} /> : canMark ? null : <span className="text-[9px] text-slate-300">parent</span>}
              </button>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{t.title}</div>
                <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                  <PriorityBadge level={lvl} scope={ov?.scope} />
                  <span className="text-[11px] text-slate-400">{c ? STATUS_META[c.status].label : `${t.minutes} min`}</span>
                </div>
              </div>
              {!done && (
                <label className="shrink-0 w-9 h-9 rounded-xl bg-white border border-slate-200 grid place-items-center cursor-pointer active:scale-95">
                  <Camera size={16} className="text-slate-500" />
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onPhoto(t, e.target.files?.[0])} />
                </label>
              )}
              {done && <button onClick={() => undoTask(t.id)} className="shrink-0 px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 text-[11px] font-bold flex items-center gap-1"><RotateCcw size={13} /> Undo</button>}
              <StarPill n={t.starValue} tone={done ? "emerald" : "slate"} />
            </div>
          </div>
        );
      })}
      <p className="text-[11px] text-slate-400 px-1 mt-1">📷 Photo check-ins log the time and location for the parents. Red = non-negotiable, amber = do today.</p>
    </div>
  );
}

function HelperNotes({ handoff, users, addHandoff }) {
  return <div className="px-4 pt-4"><h2 className="font-extrabold text-lg px-1 mb-2">Notes & Handoff</h2><HandoffFull handoff={handoff} users={users} addHandoff={addHandoff} /></div>;
}

function CareInfo() {
  return (
    <div className="px-4 pt-4">
      <h2 className="font-extrabold text-lg px-1 mb-2">Care & Contacts</h2>
      <SectionTitle icon={<Phone size={16} className="text-rose-500" />}>Contacts</SectionTitle>
      {CONTACTS.map((c) => <Card key={c.label} className="p-3 mb-2 flex items-center justify-between"><span className="text-sm font-semibold">{c.label}</span><span className="text-sm text-slate-500">{c.value}</span></Card>)}
      <SectionTitle icon={<Heart size={16} className="text-rose-500" />}>Care notes</SectionTitle>
      {CARE_NOTES.map((n, i) => <Card key={i} className="p-3 mb-2 text-sm text-slate-600">{n}</Card>)}
    </div>
  );
}

// ===================== BOTTOM NAV =====================
function BottomNav({ user, tab, setTab }) {
  const sets = {
    kid: [
      { k: "today", icon: Trophy, label: "Missions" },
      { k: "board", icon: Map, label: "Board" },
      { k: "streaks", icon: Flame, label: "Streaks" },
      { k: "dream", icon: Target, label: "Dream" },
      { k: "rewards", icon: Gift, label: "Rewards" },
      { k: "stars", icon: Star, label: "Stars" },
      { k: "school", icon: GraduationCap, label: "Quest" },
    ],
    parent: [
      { k: "today", icon: Home, label: "Today" },
      { k: "approvals", icon: Check, label: "Approve" },
      { k: "rewards", icon: Gift, label: "Rewards" },
      { k: "calendar", icon: CalIcon, label: "Calendar" },
      { k: "more", icon: ClipboardList, label: "More" },
      // "Coach" → Coach Mode (parent companion). The kid still calls it
      // Quest in his nav; the parent's nav surfaces the coaching seam.
      { k: "school", icon: GraduationCap, label: "Coach" },
    ],
    grandparent: [
      { k: "today", icon: ClipboardList, label: "Checklist" },
      { k: "notes", icon: Users, label: "Notes" },
      { k: "care", icon: Heart, label: "Care" },
    ],
    helper: [
      { k: "today", icon: ClipboardList, label: "Checklist" },
      // Helpers can approve pending submissions same as parents — same
      // decide() path under the hood.
      { k: "approvals", icon: Check, label: "Approve" },
      // Helpers (Krissie / Sara) coach Reznor in the curriculum too —
      // same Coach Mode the parents get, same shared row.
      { k: "school", icon: GraduationCap, label: "Coach" },
      { k: "notes", icon: Users, label: "Notes" },
      { k: "care", icon: Heart, label: "Care" },
    ],
    guest: [
      { k: "today", icon: ClipboardList, label: "Checklist" },
      { k: "notes", icon: Users, label: "Notes" },
    ],
  };
  const items = sets[user.role] || sets.helper;
  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex justify-around px-2 py-2"
      // FIXED + z-50: BoardGame chips were rendering OVER the nav on
      // scroll because they're absolutely positioned inside the scroll
      // container and the nav was sibling-absolute at the same stacking
      // level. Pinning to viewport with a hard z-index means the game
      // ALWAYS scrolls UNDER the nav — non-negotiable per the AAA brief.
      // Honor the iPhone home-indicator safe area so the nav floats above
      // the gesture bar instead of sitting under it.
      style={{
        zIndex: 50,
        paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
      }}
    >
      {items.map(({ k, icon: Icon, label }) => {
        const active = tab === k;
        return (
          <button
            key={k}
            onClick={() => {
              // Tapping the same tab is a no-op — don't burn juice on it.
              if (tab === k) return;
              juice.burst("light", "tap");
              setTab(k);
            }}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition active:scale-95 ${active ? "text-indigo-600" : "text-slate-400"}`}
          >
            <Icon size={22} className={active ? "fill-indigo-100" : ""} />
            <span className="text-[10px] font-semibold">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
