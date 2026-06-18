import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Star, Check, X, Clock, Camera, BookOpen, Drum, Trophy, Gift, Calendar as CalIcon,
  ClipboardList, Users, Home, Sparkles, Sun, GraduationCap, Plus, ChevronLeft, ChevronRight,
  Image as ImageIcon, Phone, Heart, AlertCircle, RotateCcw, Music, Award, Target, Flag, Palette, Church, Flame, Archive, Pencil, MapPin, Medal, Lock, Share2, Search, LogOut, Map as MapIcon, Settings, TrendingUp, Download, Play, Receipt as ReceiptIcon
} from "lucide-react";
import KidGameHome from "./KidGameHome.jsx";
import OnboardingWizard from "./OnboardingWizard.jsx";
import SummerQuest from "./SummerQuest.jsx";
import PhotoGallery from "./PhotoGallery.jsx";
import Insights from "./Insights.jsx";
import MusicLibrary from "./MusicLibrary.jsx";
import DataExport from "./DataExport.jsx";
import MilestoneSlideshow from "./MilestoneSlideshow.jsx";
import ParentCompanion from "./summerQuest/ParentCompanion.jsx";
import { useSummerQuestProgress } from "./summerQuest/useSummerQuestProgress.js";
import SongLogger from "./SongLogger.jsx";
import BoardGame, { BOARD_THEMES, DEFAULT_BOARD_THEME } from "./BoardGame.jsx";
import CustomizationHub, { FONT_SCALE_PCT, THEMES } from "./CustomizationHub.jsx";
import { uploadFamilyPhoto, useSignedUrl, uploadFamilyAudio } from "./lib/storage.js";
import { maybeDeleteUnusedPaths, pathsFromProof } from "./lib/storageGc.js";
import { STAT_TEMPLATE_LIST, schemaFromTemplate, templateLabel, hasStatSchema } from "./lib/statTemplates.js";
import { classifyItem as classifyShoppingItem, SECTION_ORDER as SHOPPING_SECTION_ORDER, SECTION_EMOJI as SHOPPING_SECTION_EMOJI } from "./lib/shoppingSections.js";
import ReceiptScanner from "./ReceiptScanner.jsx";
import Receipts from "./Receipts.jsx";
import {
  DEFAULT_LIST_KEY as SHOPPING_DEFAULT_LIST_KEY,
  DEFAULT_LIST_NAME as SHOPPING_DEFAULT_LIST_NAME,
  normalizeListKey as shoppingNormalizeListKey,
  getOrderedLists as shoppingGetOrderedLists,
  filterItemsForList as shoppingFilterItemsForList,
  countItemsByList as shoppingCountItemsByList,
  settingsAfterCreateList as shoppingSettingsAfterCreateList,
  getActiveListEntry as shoppingGetActiveListEntry,
  settingsAfterSetActive as shoppingSettingsAfterSetActive,
  settingsAfterRename as shoppingSettingsAfterRename,
  settingsAfterMerge as shoppingSettingsAfterMerge,
  settingsAfterDelete as shoppingSettingsAfterDelete,
  settingsAfterReorder as shoppingSettingsAfterReorder,
} from "./lib/shoppingLists.js";
import { pickFirstMatch as pickSongMatch } from "./lib/enrichSongITunes.js";
import { searchOpenLibrary } from "./lib/enrichBook.js";
import { searchGoogleBooks } from "./lib/enrichBookGoogle.js";
import { searchITunesBooks } from "./lib/enrichBookITunes.js";
import { useBookWebSearch } from "./lib/useBookWebSearch.js";
import { applyCustomOrder, nudgeOrder } from "./lib/libraryOrder.js";
import { confetti } from "./lib/confetti.js";
import { milestone } from "./lib/milestone.js";
import MilestoneCelebrate from "./MilestoneCelebrate.jsx";
import { practiceTimerStore } from "./lib/practiceTimerStore.js";
import PracticeTimerBanner from "./PracticeTimerBanner.jsx";
import { nextBirthdayInfo, upcomingBirthdays } from "./lib/birthdays.js";
import { supabase } from "./lib/supabase.js";
import { toApp } from "./data/transform.js";
import { juice } from "./lib/juice.js";
import { starBurst } from "./lib/starBurst.js";
import StarBurstLayer from "./StarBurstLayer.jsx";
import { levelUp } from "./lib/levelUp.js";
import LevelUpLayer from "./LevelUpLayer.jsx";
import OnboardingOverlay from "./OnboardingOverlay.jsx";
import { useBottomSheet } from "./lib/sheet.js";
import { runDataAudit, auditSummary } from "./lib/dataAudit.js";
import { lightbox } from "./lib/lightbox.js";
import { giftEditor } from "./lib/giftEditor.js";
import { toast } from "./lib/toast.js";
import { activeLangs, tt as i18nTt, taskTitle as i18nTaskTitle, activityName as i18nActivityName, LANG_LABELS, setCurrentLangs, titleOf as i18nTitleOf, nameOf as i18nNameOf, tOf as i18nTOf } from "./lib/i18n.js";

/* =====================================================================
   REZNOR COMMAND CENTER — family activity tracker
   Vite + React 18 + Supabase + Netlify. State persists per-family via
   the makeSyncedSetter pattern in this file; photos live in Supabase
   storage bucket `family-photos` (see src/lib/storage.js).
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

// CHILD removed 2026-06-15 — these were Lynch-specific defaults
// (Reznor's name, Movie Night / Universal as reward tiers, a
// starBankBase of 60 carried over from in-memory days). Replaced
// with: profile.name from the active kid; nextRewardTitle /
// nextRewardCost / bigRewardTitle / bigRewardCost derived from the
// rewards table; starBankBase fixed to 0 (every star is now an
// actual completion or gift).

// Contacts + care notes were previously hardcoded with Lynch-specific
// values (Mike / Krissie / Reznor's drum notes) and leaked into every
// other family's helper/grandparent view. CareInfo now derives contacts
// from the current family's parents in `users`; care notes are an empty
// stub until parent-editable family settings land.

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

// Generic weekday slots for the flexible weekly-schedule picker.
// Each family's TIMES live in familySettings.weeklyActivityTimes (per
// activity, per day) so no Reznor-specific defaults leak. Sunday is
// omitted by convention — flexible-schedule activities default to
// "any day except Sunday"; parents can include Sunday by adding it
// via the per-day picker in Manage Activities if needed.
const TKD_SLOTS = [
  { day: "Monday",    time: "" },
  { day: "Tuesday",   time: "" },
  { day: "Wednesday", time: "" },
  { day: "Thursday",  time: "" },
  { day: "Friday",    time: "" },
  { day: "Saturday",  time: "" },
];
const TKD_TARGET = 2;

// ---------- SEED: HANDOFF NOTES ----------
const SEED_HANDOFF = [
  { id: "h1", authorId: "u_krissie", note: "Spanish reading + Duolingo are done. Drums still need 30 more min — split into two short sessions, he was tired after swim.", pinned: true, time: "9:40 AM" },
  { id: "h2", authorId: "u_sara", note: "Bed made, breakfast done. Heading to park for movement now.", pinned: false, time: "8:15 AM" },
];

// Status labels read through i18n at render time so a bilingual /
// Spanish-only family sees translated text. Color classes stay flat
// (they're not language-sensitive). Use `STATUS_LABEL(status)` for
// the human label and STATUS_META[status].color for the chip class.
const STATUS_META = {
  not_started: { color: "bg-slate-100 text-slate-500" },
  pending:     { color: "bg-amber-100 text-amber-700" },
  approved:    { color: "bg-emerald-100 text-emerald-700" },
  needs_fix:   { color: "bg-rose-100 text-rose-700" },
  skipped:     { color: "bg-slate-100 text-slate-400" },
  draft:       { color: "bg-amber-100 text-amber-700" },
};
const STATUS_LABEL = (status) => {
  const k = `status_${status || "not_started"}`;
  return i18nTOf(k, status || "Not started");
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
// Resolve the active kid's display name from the users list. Falls
// back to "your kid" so the strings stay grammatical for any family
// that hasn't picked one. Used in confirm dialogs, tooltips, stat
// detail headers — every place we used to hard-code "Reznor".
const kidName = (users) => (users || []).find((u) => u.role === "kid")?.name || "your kid";

const fmtDate = (d) => d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
const fmtShort = (d) => d ? new Date(d + "T12:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";
// Bilingual day-break header — Reznor speaks Spanish + English; Mike
// wants both languages whenever we show what day a thing happened.
// Returns e.g. "Today / Hoy", "Yesterday / Ayer", "Monday, Jun 9 /
// Lunes, 9 jun". Pass an ISO YYYY-MM-DD string.
const fmtBilingualDay = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso + "T12:00");
  const todayD = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const that = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((todayD - that) / 86400000);
  if (diffDays === 0) return "Today / Hoy";
  if (diffDays === 1) return "Yesterday / Ayer";
  const en = d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  // Spanish locale: weekday + day + month, lowercased per Spanish norm.
  const es = d.toLocaleDateString("es-ES", { weekday: "long", month: "short", day: "numeric" });
  // Capitalize weekday (Spanish toLocaleDateString returns lowercase).
  const esCap = es.charAt(0).toUpperCase() + es.slice(1);
  return `${en} / ${esCap}`;
};
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

// Parent-curated Top 8 — the board's source of truth.
// The 7 daily-core items every weekday defaults to. Day-of-week
// scheduled classes (Hip Hop, Swim, Church) layer in via task.days
// when the weekly default is bootstrapped — see bootstrapWeeklyTopEight.
const DEFAULT_DAILY_CORE_IDS = [
  "t_drums", "t_eng", "t_spa_read", "t_duo", "t_write", "t_math", "t_bed",
];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Bootstrap the weekly Top 8 default from the current task catalog.
// Each weekday's default = the 7 daily-core IDs that exist + active +
// any task whose days field includes that weekday (Hip Hop Mon, Swim
// Tue/Thu, Church Sun in current data). This only runs when the parent
// hasn't yet set their own weekly plan; once they edit, their saved
// value wins.
function bootstrapWeeklyTopEight(tasks) {
  const byDay = {};
  const alive = (id) => (tasks || []).some((t) => t.id === id && t.active !== false);
  for (const day of WEEKDAYS) {
    const core = DEFAULT_DAILY_CORE_IDS.filter(alive);
    const scheduled = (tasks || [])
      .filter((t) => Array.isArray(t.days) && t.days.includes(day) && t.active !== false)
      .map((t) => t.id);
    byDay[day] = [...core, ...scheduled];
  }
  return byDay;
}
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
  { id: "a_tkd",   name: "Taekwondo",                 short: "TKD",     color: "#dc2626", pillar: "body",  status: "active",   note: "Pick ~2 days/week (any day but Sunday)", address: "", schedule: [], weeklySchedule: true, weeklyTarget: 2 },
  { id: "a_dance", name: "Hip Hop Dance",             short: "Dance",   color: "#db2777", pillar: "body",  status: "active",   note: "", address: "", schedule: [{ day: "Monday", time: "5:30–6:30 PM" }] },
  { id: "a_bball", name: "Basketball",                short: "Ball",    color: "#65a30d", pillar: "body",  status: "break",    note: "On hiatus", schedule: [] },
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
  // label is rendered all over (MiniRow chip, ActivityRow header, etc.)
  // — route through i18nNameOf so a Spanish/Both family sees translated
  // names. Falls back to the short / name as before.
  if (a) return { color: a.color, tint: a.color + "22", label: i18nNameOf(a) || a.short || a.name, pillar: a.pillar };
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
  { id: "treasure3", kind: "trophy", emoji: "🗝️", title: "Treasure Trio", desc: "3 days in a row opening the treasure", test: (c) => c.treasureStreak >= 3, goal: 3, val: (c) => c.treasureStreak },
  { id: "treasure7", kind: "trophy", emoji: "🏆", title: "Week of Treasures", desc: "7 days in a row opening the treasure", test: (c) => c.treasureStreak >= 7, goal: 7, val: (c) => c.treasureStreak },
  { id: "treasure14", kind: "trophy", emoji: "💎", title: "Treasure Fortnight", desc: "14 days in a row", test: (c) => c.treasureStreak >= 14, goal: 14, val: (c) => c.treasureStreak },
  { id: "treasure30", kind: "trophy", emoji: "👑", title: "Treasure King", desc: "30 days in a row — every day a clean sweep", test: (c) => c.treasureStreak >= 30, goal: 30, val: (c) => c.treasureStreak },
];
// Reznor was upset that books he'd read pre-app (archived) weren't
// counting in the finished tally. Archive entries ARE finished — the
// status name just records that the read happened before the app
// existed. Use this everywhere we filter for "books Reznor has
// finished" so the count is honest. preTracking is the same concept
// expressed on actively-tracked rows; keep both included.
const isBookFinished = (b) => b?.status === "finished" || b?.status === "archive" || b?.preTracking;

function buildAchCtx({ completions, todaysTasks, compByTask, starBank, streaks, books, treasureStreak = 0 }) {
  const doneToday = todaysTasks.filter((t) => ["approved", "pending"].includes(compByTask[t.id]?.status)).length;
  const allToday = todaysTasks.length > 0 && todaysTasks.every((t) => ["approved", "pending"].includes(compByTask[t.id]?.status));
  const drumsDone = !!compByTask["t_drums"];
  const photoToday = Object.values(compByTask).some((c) => (c?.proof || []).some((p) => p.type === "photo"));
  const booksFinished = (books || []).filter(isBookFinished).length;
  const spanishBook = (books || []).some((b) => isBookFinished(b) && b.lang === "Spanish");
  return { doneToday, allToday, drumsDone, photoToday, starBank, booksFinished, spanishBook, drumStreak: streaks?.a_drums?.current || 0, spaStreak: streaks?.a_spa?.current || 0, treasureStreak };
}

// Treasure-day streak — count consecutive days from today walking back
// where Reznor cleared ALL of that day's Top 8 (= opened the treasure).
// Honest limitation: the Top 8 for prior days is computed using the
// CURRENT topPriorities + tasks config, not historical snapshots. If a
// parent changed the plan, the count uses today's plan retroactively.
// Acceptable approximation; the alternative would be storing daily
// treasure-opened flags which adds complexity for marginal honesty gain.
function computeTreasureStreak({ completions, tasks, topPriorities, taskNaDays }) {
  if (!Array.isArray(completions) || !Array.isArray(tasks)) return 0;
  const bootstrap = bootstrapWeeklyTopEight(tasks);
  // Pre-bucket approved completions by date for O(1) lookup per day.
  const approvedByDate = new Map();
  for (const c of completions) {
    if (c.status !== "approved" || !c.completionDate) continue;
    const set = approvedByDate.get(c.completionDate) || new Set();
    set.add(c.taskId);
    approvedByDate.set(c.completionDate, set);
  }
  let streak = 0;
  const cursor = new Date(today);
  for (let i = 0; i < 366; i++) {
    const iso = isoLocal(cursor);
    const weekday = cursor.toLocaleDateString("en-US", { weekday: "long" });
    const dailyOverride = topPriorities?.daily?.[iso];
    const weeklyPlan = topPriorities?.weekly?.[weekday];
    const ids = Array.isArray(dailyOverride)
      ? dailyOverride
      : (Array.isArray(weeklyPlan) ? weeklyPlan : bootstrap[weekday]);
    // N/A list for this day — parent-marked exceptions (sick day,
    // travel). Removed from the required set so the streak survives
    // genuine non-applicable days.
    const naSet = new Set((taskNaDays || {})[iso] || []);
    // Only count tasks that still exist + are active. Otherwise a deleted
    // task from yesterday would make every prior day permanently failed.
    const required = (ids || []).filter((id) =>
      !naSet.has(id) && tasks.some((t) => t.id === id && t.active !== false)
    );
    if (required.length === 0) break;
    const approvedForDay = approvedByDate.get(iso) || new Set();
    const allDone = required.every((id) => approvedForDay.has(id));
    if (!allDone) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
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
  // Scope the persistent practice timer to the current family the
  // moment we have a familyId. Without this, the timer's localStorage
  // entry was global across every signed-in account on the browser,
  // and Mike caught a timer started on his Lynch profile showing up
  // on a separate burdenthemovie@gmail.com test family. Family data
  // never crosses the wire — sign-out / sign-in into a different
  // family clears the in-memory state via setNamespace("").
  useEffect(() => {
    practiceTimerStore.setNamespace(familyId || "");
  }, [familyId]);

  // Each persistent entity hydrates from `initial` (Supabase). Empty
  // means a brand-new family — the OnboardingWizard renders below before
  // any of this matters. We no longer fall back to in-file SEEDs at
  // runtime because that ghost-wrote Lynch family data (u_reznor, the
  // 317-day drum streak, Krissie's handoff note, cmp_drums_20260606)
  // into other families' DBs the moment their state mutated. The seeds
  // remain in this file only as Lynch-family historical reference and
  // are NEVER used as a runtime fallback in code below.
  const [users, _setUsers] = useState(() => initial?.profiles ?? []);
  const [tasks, _setTasks] = useState(() => initial?.tasks ?? []);
  const [rewards, _setRewards] = useState(() => initial?.rewards ?? []);
  const [completions, _setCompletions] = useState(() => initial?.completions ?? []);
  const [redemptions, _setRedemptions] = useState(() => initial?.redemptions ?? []);
  const [giftedRaw, _setGifted] = useState(() => initial?.gifted ?? []);
  // Hide soft-deleted gifts from every read site. The raw array
  // keeps deleted rows for audit (deletedAt + deletedBy stamped),
  // and the sync layer pushes them so they persist; this view is
  // the one rendered.
  const gifted = useMemo(() => (giftedRaw || []).filter((g) => !g.deletedAt), [giftedRaw]);
  const [streaks, _setStreaks] = useState(() => initial?.streaks ?? {});
  const [books, _setBooks] = useState(() => initial?.books ?? []);
  const [awards, _setAwards] = useState(() => initial?.awards ?? []);
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
  const [events, _setEvents] = useState(() => initial?.events ?? []);
  const [handoff, _setHandoff] = useState(() => initial?.handoffNotes ?? []);
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
  const [priorities, setPriorities] = familySetting("priorities", {});
  // Parent-curated Top 8 — drives the board, kid missions tab, and
  // kid home main/side quests. Two layers:
  //   weekly[DayOfWeek] — the standing plan parents tweak rarely
  //   daily[YYYY-MM-DD] — per-date overrides for "today's different"
  // Resolution: daily[today] || weekly[<weekday>] || bootstrap[<weekday>].
  // No cap on length — Top 8 is the default expectation but parents
  // can add ad-hoc items in the editor so the board grows when needed.
  const [topPriorities, setTopPriorities] = familySetting("topPriorities", { weekly: {}, daily: {} });
  // dailyRequiredCount — how many "must-do today" tasks the family
  // expects per day. Default 8 matches Lynch's historical "Top 8"
  // framing, but Mike's directive 2026-06-15: "instead of forcing a
  // top 8 we should have the parent choose how many they want." So
  // every Top-N copy site reads from this number, and onboarding
  // exposes an inline picker for empty-state families.
  const [dailyRequiredCount, setDailyRequiredCount] = familySetting("dailyRequiredCount", 8);
  // taskNaDays: per-ISO-date list of task IDs marked N/A — Reznor was
  // sick, traveling, or the task genuinely doesn't apply. Distinct from
  // priorities (which describe importance) and topPriorities (which
  // describe the day's plan). Honored everywhere a task is enumerated
  // for a date: todaysTasks (parent view), todaysTopEight (kid board),
  // computeTreasureStreak (streak math). Keeps the streak honest when
  // life gets in the way. Shape: { "2026-06-11": ["drums", "books"] }
  const [taskNaDays, setTaskNaDays] = familySetting("taskNaDays", {});
  // pinnedBonus: per-date set of task IDs the parent explicitly
  // pinned to today's BONUS section. Mike's flow: Mr. Voyce piano is
  // usually only Tuesday, but sometimes there's a gig conflict and
  // it moves to Wednesday — the parent needs a one-tap "add to
  // today" affordance that doesn't require editing the task's
  // standing schedule. Format mirrors taskNaDays:
  //   { "2026-06-13": ["t_piano", "t_tkd"] }
  // Pinned tasks bypass the mode/days schedule filter and appear in
  // todaysTasks (so they enter the Bonus section since they're not
  // in topPriorities.daily / Top 8). Removing the pin restores the
  // standing schedule's behavior for that day.
  const [pinnedBonus, setPinnedBonus] = familySetting("pinnedBonus", {});
  // todayOrder: parent-curated row order per section on the Today
  // page. Mike asked for the same drag/drop pattern the More menu
  // has, applied to Still-to-do + Bonus. Listed task IDs render in
  // the saved order at the top of their section; anything not in
  // the list falls in after, in its natural sort order. Cleared
  // entries (deleted tasks, items that moved sections) are dropped
  // silently so the order stays clean.
  //   { mustDo: [taskId, ...], bonus: [taskId, ...] }
  const [todayOrder, setTodayOrder] = familySetting("todayOrder", { mustDo: [], bonus: [] });
  // songPlayRequests: kid-initiated change requests against existing
  // song_plays. Reznor (6yo) can SEE every play row in the Most Played
  // card but should NOT be able to silently delete or re-attribute one
  // — a mis-tap would erase a real practice session. Each request is
  // an envelope {id, playId, kind, payload, by, at} that lands in the
  // parent Approvals queue. On approve, the parent applies the change
  // (removeSongPlay / updateSongPlay); on deny we just drop it. Same
  // approve-the-mutation pattern as rewardRequests, scoped to plays.
  const [songPlayRequests, setSongPlayRequests] = familySetting("songPlayRequests", []);
  // Library custom shelf order. One key per domain — ordered array of
  // ids. When the Shelf view is active in MusicLibrary / ReadingLibrary,
  // items are displayed in this order; items not in the array are
  // appended at the end so new additions appear without breaking the
  // saved curation. Reorder writes through the synced setter so both
  // parents see the same shelf.
  const [libraryOrder, setLibraryOrder] = familySetting("libraryOrder", { songs: [], books: [] });
  // displayLangs lives at the family level (not per-user) because Mike's
  // intent when he toggles it is "set this for Reznor + everyone in the
  // family." Per-user would mean Mike sets Both on his profile but
  // Reznor's view still defaults to English because his profile has no
  // setting — confusing and what was happening before. Default ["en"].
  const [displayLangs, setDisplayLangs] = familySetting("displayLangs", ["en"]);
  // tkdDays/tkdTimes default empty so brand-new families don't see
  // Reznor's "Monday" pre-pick or hardcoded time blocks. Lynch's
  // existing saved values still win because familySetting reads from
  // jsonb when present (these have been actively set for months).
  const [tkdDays, setTkdDays] = familySetting("tkdDays", []);
  const [tkdTimes, setTkdTimes] = familySetting("tkdTimes", {});
  // Generic weekly schedules — any activity that opts in (via
  // a.weeklySchedule === true) gets a per-week day picker on the
  // Calendar. Mike's framing: "When Basketball does come back in
  // the rotation. It's only 2 months at a time and each new season
  // has different practice days. We need the flexibility to add
  // these when needed and to hide when they aren't active."
  //   weeklyActivityDays: { a_basketball: ["Tuesday","Thursday"] }
  //   weeklyActivityTimes: { a_basketball: { Tuesday: "5pm" } }
  // Backwards-compat: the existing tkdDays / tkdTimes settings stay
  // the canonical source for a_tkd until a parent uses the generic
  // picker on Taekwondo; then the migration below merges them.
  const [weeklyActivityDays, setWeeklyActivityDays] = familySetting("weeklyActivityDays", {});
  const [weeklyActivityTimes, setWeeklyActivityTimes] = familySetting("weeklyActivityTimes", {});
  const [taskNotes, setTaskNotes] = familySetting("taskNotes", {});
  // Per-family learning goals — each entry is { area, note }. Empty
  // for brand-new families; the Skills page lets parents add/edit/
  // remove entries freely (per the total-control memory rule). Lynch
  // gets their existing 5 areas via the migration backfill.
  const [learningGoals, setLearningGoals] = familySetting("learningGoals", []);
  // Carry-over star bank base — historical pre-completion stars that
  // existed before this family started tracking via the DB. Lynch
  // gets 60 backfilled via 20260615081500_lynch_starbank_base.sql;
  // new families default to 0 and only see their actual earnings.
  const [starBankBase] = familySetting("starBankBase", 0);
  // Temp-week overrides — arr of { id, startDate, endDate, label }.
  // When today's date falls inside any range, the calendar suppresses
  // recurring entries (weekly events + activity schedules) so the
  // "vacation week / Disney day / visit Xander" week is shown clean
  // and the parent fills it in with one-off entries.
  const [weekOverrides, setWeekOverrides] = familySetting("weekOverrides", []);
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
  // Deep-link target so the Today empty-state QuickStart card can
  // route a tap directly to More → Activities / Tasks / Rewards
  // without forcing the parent to navigate twice. MoreParent reads
  // this on mount and clears it. NULL = no deep link, render the
  // normal More menu.
  const [pendingMoreSub, setPendingMoreSub] = useState(null);
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
  // Activities table — per-family, edited via Manage Activities. Empty
  // for brand-new families; the Manage Activities page offers a preset
  // pack picker (Sports / Music / Martial Arts / …) for opt-in seeding.
  // Lynch's existing catalog migrates via the one-off backfill in
  // 20260614220000_activities_per_family.sql.
  const [activities, _setActivities] = useState(() => initial?.activities ?? []);
  const setActivities = makeSyncedSetter(_setActivities, "activities", sync);
  // Free-form practice sessions (Modacity-style) with optional 30s
  // audio clip. Independent of completions and song_plays — see the
  // schema comment in 20260615091800_practice_sessions.sql.
  const [practiceSessions, _setPracticeSessions] = useState(() => initial?.practiceSessions ?? []);
  const setPracticeSessions = makeSyncedSetter(_setPracticeSessions, "practiceSessions", sync);
  // Shared family shopping list. Stupid-simple list of titles with
  // checked flag — anyone in the family can read/write; Krissie
  // adds at the store, Mike checks off at home.
  const [shoppingItems, _setShoppingItems] = useState(() => initial?.shoppingItems ?? []);
  const setShoppingItems = makeSyncedSetter(_setShoppingItems, "shoppingItems", sync);
  // RS-1 receipts — image pointer + parsed payload + reviewed
  // items_reviewed array (the promotion contract RS-2 will read to
  // mint purchase rows). Entity wiring landed in Commit A; the
  // state hook + addReceipt helper land here for the real review UI.
  const [receipts, _setReceipts] = useState(() => initial?.receipts ?? []);
  const setReceipts = makeSyncedSetter(_setReceipts, "receipts", sync);
  // Daily kid mood check-ins. One row per (profileId, date). Reznor
  // taps a 3-emoji row on his Today; parents see a 7-day mood strip
  // on theirs.
  const [dailyCheckins, _setDailyCheckins] = useState(() => initial?.dailyCheckins ?? []);
  const setDailyCheckins = makeSyncedSetter(_setDailyCheckins, "dailyCheckins", sync);
  const setMoodCheckin = (profileId, mood, note = "") => {
    if (!profileId || !mood) return;
    const today = new Date().toISOString().slice(0, 10);
    setDailyCheckins((prev) => {
      const existing = prev.find((c) => c.profileId === profileId && c.date === today);
      if (existing) return prev.map((c) => c.id === existing.id ? { ...c, mood, note: note || c.note } : c);
      return [...prev, {
        id: "chk_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
        profileId,
        date: today,
        mood,
        note,
        createdAt: new Date().toISOString(),
      }];
    });
  };
  const addPracticeSession = (s) => setPracticeSessions((prev) => [...prev, { ...s, id: s.id || ("ps_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6)) }]);
  // addShoppingItem auto-routes by ACTED-AS profile role:
  //   kid acting (currentUserId points at a kid profile) → request_status='pending',
  //     parent sees it in a Pending Requests card with Approve / Decline.
  //   parent / helper / grandparent → request_status=null (on the list).
  // The doc's soul-feature: Reznor adds "drumsticks" → it sits as a
  // pending request → Mike/Krissie approve onto the real list.
  const addShoppingItem = (title, notes = "", { brand, listName, section } = {}) => {
    const t = (title || "").trim();
    if (!t) return;
    const actorProfile = users.find((u) => u.id === currentUserId);
    const isKidActing = actorProfile?.role === "kid";
    // Auto-classify into a store section (Produce / Dairy / Pantry /
    // etc.) so the grouped view at the store doesn't make Krissie
    // backtrack. Parent can override from the edit sheet.
    const resolvedSection = (section || classifyShoppingItem(t)).slice(0, 32);
    setShoppingItems((prev) => [...prev, {
      id: "si_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
      title: t,
      notes,
      brand: brand || "",
      section: resolvedSection,
      listName: (listName || "Grocery").slice(0, 32),
      checked: false,
      checkedAt: null,
      checkedBy: null,
      addedBy: currentUserId || currentProfileId || null,
      requestStatus: isKidActing ? "pending" : null,
      decidedBy: null,
      decidedAt: null,
      declineReason: "",
      createdAt: new Date().toISOString(),
    }]);
  };
  const decideShoppingRequest = (id, decision, declineReason = "") => {
    if (!["approved", "declined"].includes(decision)) return;
    const actor = currentProfileId || currentUserId || null;
    setShoppingItems((prev) => prev.map((it) => it.id === id ? {
      ...it,
      requestStatus: decision,
      decidedBy: actor,
      decidedAt: new Date().toISOString(),
      declineReason: decision === "declined" ? (declineReason || "Not this week").slice(0, 80) : "",
    } : it));
  };
  // RS-1 addReceipt — single INSERT of a reviewed receipt. Caller
  // (ReceiptScanner.commitReceipt) builds the full row including
  // the ocr_raw promotion contract (vision verbatim + items_reviewed
  // with title/brand/qty/unit/unit_price/line_total/
  // auto_matched_shopping_item_id/match_confidence/
  // confirmed_shopping_item_id/source). We just stamp id +
  // uploaded_by + createdAt and route through the sync layer. The
  // current acted-as profile is the uploader.
  const addReceipt = (r) => {
    setReceipts((prev) => [
      {
        id: r.id || ("rcp_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8)),
        uploadedBy: r.uploadedBy || currentUserId || currentProfileId || null,
        createdAt: r.createdAt || new Date().toISOString(),
        ...r,
      },
      ...prev,
    ]);
  };
  // RS-1 soft-delete — flip deleted_at on a receipt row. Spending
  // math (next brick) MUST filter on deletedAt to keep totals honest.
  const softDeleteReceipt = (id) => setReceipts((prev) => prev.map((r) =>
    r.id === id ? { ...r, deletedAt: new Date().toISOString() } : r
  ));
  // RS-1 updateReceipt — patch any subset of receipt-level fields
  // (storeName / purchasedAt / subtotal / tax / total) and/or ocrRaw
  // (notably items_reviewed). Receipts detail view uses this for the
  // edit-after-save path required by the editable-after-save rule.
  // The sync layer's PostgREST batch updater (transform.toDb.receipt)
  // serializes the row from the merged shape.
  const updateReceipt = (id, patch) => setReceipts((prev) => prev.map((r) =>
    r.id === id ? { ...r, ...patch } : r
  ));
  const toggleShoppingItem = (id) => setShoppingItems((prev) => prev.map((it) => {
    if (it.id !== id) return it;
    const nowChecked = !it.checked;
    return {
      ...it,
      checked: nowChecked,
      checkedAt: nowChecked ? new Date().toISOString() : null,
      checkedBy: nowChecked ? (currentProfileId || currentUserId || null) : null,
    };
  }));
  const removeShoppingItem = (id) => setShoppingItems((prev) => prev.filter((it) => it.id !== id));
  const clearCheckedShoppingItems = () => setShoppingItems((prev) => prev.filter((it) => !it.checked));
  const renameShoppingItem = (id, title) => setShoppingItems((prev) => prev.map((it) => it.id === id ? { ...it, title } : it));
  const updateShoppingItem = (id, patch) => setShoppingItems((prev) => prev.map((it) => it.id === id ? { ...it, ...patch } : it));
  // 1d — bulk relabel for rename / merge / delete. Match items by
  // normalized current listName so legacy capital-G "Grocery" items
  // and forward-clean lowercase items both follow. One setShoppingItems
  // call → one sync round trip. fromKey already normalized; toKey
  // stored as-given (callers always pass a normalized key).
  const relabelShoppingItemsByListKey = (fromKey, toKey) =>
    setShoppingItems((prev) => prev.map((it) => {
      const itemKey = (it.listName || "Grocery").toLowerCase().trim().replace(/\s+/g, " ");
      return itemKey === fromKey ? { ...it, listName: toKey } : it;
    }));
  const removePracticeSession = (id) => setPracticeSessions((prev) => {
    const target = prev.find((s) => s.id === id);
    const next = prev.filter((s) => s.id !== id);
    if (target?.audioPath) {
      maybeDeleteUnusedPaths([target.audioPath], {
        completions, books, songs, gifted: giftedRaw, albumPhotos, users, awards,
      });
    }
    return next;
  });
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
  // Pinned-today set — Mike's hard rules:
  //   "If the calendar shows Taekwondo today, it must at least be in
  //    the bonus."
  //   "If I add it to the board game, it must move into the to-do
  //    today list."
  // Two parents complained the calendar TKD-day picker and board
  // game additions silently dropped because the underlying task was
  // mode="school" while the family was in summer. Now: any task
  // pinned to today (via topPriorities.daily — that's where the
  // board game writes — OR via tkdDays + Taekwondo) bypasses the
  // mode/days filter and forces its way into todaysTasks. Board-
  // game items also enter the must-do list because they're already
  // in topEightIds; calendar TKD picks land as bonus (in todaysTasks
  // but not topEight) — exactly matching Mike's "at least bonus"
  // floor and "must-do for board" ceiling.
  const pinnedToday = useMemo(() => {
    const set = new Set();
    const daily = topPriorities?.daily?.[TODAY_ISO];
    if (Array.isArray(daily)) daily.forEach((id) => set.add(id));
    // Calendar TKD pick: today's weekday is in tkdDays → pin the
    // Taekwondo task even if its mode/days say otherwise.
    if (Array.isArray(tkdDays) && tkdDays.includes(WEEKDAY)) set.add("t_tkd");
    // Generic weekly-schedule picks. For any activity opted into the
    // per-week picker, if today's weekday is in its day list, pin
    // every active task that belongs to that activity. Covers
    // basketball / swim / drums when seasons rotate.
    if (weeklyActivityDays && typeof weeklyActivityDays === "object") {
      for (const [actId, dayList] of Object.entries(weeklyActivityDays)) {
        if (!Array.isArray(dayList) || !dayList.includes(WEEKDAY)) continue;
        for (const t of tasks) {
          if (t.active === false) continue;
          if (t.activityId === actId) set.add(t.id);
        }
      }
    }
    // Generic per-date bonus pins (Phase 2). Mike's add-to-today
    // picker writes here.
    const bonus = pinnedBonus?.[TODAY_ISO];
    if (Array.isArray(bonus)) bonus.forEach((id) => set.add(id));
    return set;
  }, [topPriorities, tkdDays, weeklyActivityDays, tasks, pinnedBonus]);

  const todaysTasks = useMemo(() => {
    const naSet = new Set(taskNaDays?.[TODAY_ISO] || []);
    return tasks.filter((t) => {
      if (t.active === false) return false;
      if (naSet.has(t.id)) return false;
      // Pinned bypass: calendar / board-game additions always show.
      if (pinnedToday.has(t.id)) return true;
      // any_day bypass: flexible-schedule activities (Taekwondo
      // practice, makeup piano) appear every day even if mode/days
      // would otherwise filter them out.
      if (t.anyDay) return true;
      // Otherwise apply the standard schedule filter.
      return (t.mode === "both" || t.mode === mode)
        && (!t.days || t.days.includes(WEEKDAY));
    });
  }, [tasks, mode, taskNaDays, pinnedToday]);
  // Tasks the parent marked N/A today — surfaced as a small restore
  // strip so the action is recoverable in one tap. Same source-of-
  // truth filter as todaysTasks above (so we never show a deleted or
  // off-schedule task as "N/A today"). The pinned-today bypass also
  // applies here so a parent who NA'd a pinned task can still
  // restore it.
  const todaysNATasks = useMemo(() => {
    const naIds = new Set(taskNaDays?.[TODAY_ISO] || []);
    if (naIds.size === 0) return [];
    return tasks.filter((t) => {
      if (!naIds.has(t.id)) return false;
      if (t.active === false) return false;
      if (pinnedToday.has(t.id)) return true;
      if (t.anyDay) return true;
      return (t.mode === "both" || t.mode === mode)
        && (!t.days || t.days.includes(WEEKDAY));
    });
  }, [tasks, mode, taskNaDays, pinnedToday]);
  // The parent-curated Top 8 in canonical task-object form. Source of
  // truth for the board, kid missions, kid home quests. Sparse entries
  // (deleted tasks, inactive tasks) are dropped silently so the board
  // can never strand the kid on something that doesn't exist anymore.
  const todaysTopEight = useMemo(() => {
    const bootstrap = bootstrapWeeklyTopEight(tasks);
    const dailyOverride = topPriorities?.daily?.[TODAY_ISO];
    const weeklyPlan = topPriorities?.weekly?.[WEEKDAY];
    const ids = Array.isArray(dailyOverride)
      ? dailyOverride
      : (Array.isArray(weeklyPlan) ? weeklyPlan : bootstrap[WEEKDAY]);
    const naSet = new Set(taskNaDays?.[TODAY_ISO] || []);
    return (ids || [])
      .map((id) => tasks.find((t) => t.id === id))
      .filter((t) => t && t.active !== false && !naSet.has(t.id));
  }, [tasks, topPriorities, taskNaDays]);
  // Imperative helpers — write directly to the topPriorities jsonb.
  // setDailyTopEight pins a per-date override; resetDailyTopEight drops
  // it back to the weekly default; setWeeklyTopEight updates the
  // standing plan for a weekday.
  const setDailyTopEight = (dateIso, taskIds) =>
    setTopPriorities((prev) => ({
      ...(prev || {}),
      weekly: (prev?.weekly) || {},
      daily: { ...((prev?.daily) || {}), [dateIso]: taskIds },
    }));
  const resetDailyTopEight = (dateIso) =>
    setTopPriorities((prev) => {
      const next = { ...((prev?.daily) || {}) };
      delete next[dateIso];
      return { ...(prev || {}), weekly: (prev?.weekly) || {}, daily: next };
    });
  const setWeeklyTopEight = (weekday, taskIds) =>
    setTopPriorities((prev) => ({
      ...(prev || {}),
      weekly: { ...((prev?.weekly) || {}), [weekday]: taskIds },
      daily: (prev?.daily) || {},
    }));
  // N/A-for-a-day helpers. markTaskNA pins a task as not applicable for
  // an ISO date (sick day, travel, schedule conflict). restoreTaskFromNA
  // undoes it. Both write into the taskNaDays jsonb. We dedupe on add
  // and drop the date key entirely when its list goes empty so the JSON
  // stays compact.
  const markTaskNA = (dateIso, taskId) =>
    setTaskNaDays((prev) => {
      const existing = new Set((prev || {})[dateIso] || []);
      existing.add(taskId);
      return { ...(prev || {}), [dateIso]: Array.from(existing) };
    });
  const restoreTaskFromNA = (dateIso, taskId) =>
    setTaskNaDays((prev) => {
      const list = ((prev || {})[dateIso] || []).filter((id) => id !== taskId);
      const next = { ...(prev || {}) };
      if (list.length === 0) delete next[dateIso];
      else next[dateIso] = list;
      return next;
    });
  // pinTaskToToday / unpinTaskFromToday — generic per-date bonus
  // pinning. Mike's Phase 2: "Add to today" picker writes here so
  // any task can land in today's bonus regardless of its standing
  // schedule. Same dedupe/compact pattern as taskNaDays. Removing
  // the pin ALSO clears the N/A for that day so the standing
  // schedule resumes cleanly (the parent's intent when they unpin
  // is "I'm done with this for today" not "block it forever").
  const pinTaskToToday = (dateIso, taskId) =>
    setPinnedBonus((prev) => {
      const existing = new Set((prev || {})[dateIso] || []);
      existing.add(taskId);
      return { ...(prev || {}), [dateIso]: Array.from(existing) };
    });
  const unpinTaskFromToday = (dateIso, taskId) =>
    setPinnedBonus((prev) => {
      const list = ((prev || {})[dateIso] || []).filter((id) => id !== taskId);
      const next = { ...(prev || {}) };
      if (list.length === 0) delete next[dateIso];
      else next[dateIso] = list;
      return next;
    });
  // requestSongPlayChange — kid-side entry point. Builds an envelope
  // and pushes it onto songPlayRequests. The play row itself is NOT
  // mutated until a parent approves; that's the whole point.
  // kind: "remove" — delete the play row
  //       "update" — patch playedOn / notes
  const requestSongPlayChange = (playId, kind, payload) => {
    if (!playId || !kind) return;
    setSongPlayRequests((prev) => [
      ...(prev || []),
      {
        id: "spr_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
        playId,
        kind,
        payload: payload || null,
        by: currentUserId,
        at: new Date().toISOString(),
      },
    ]);
  };
  // decideSongPlayRequest — parent-side. Applies the change on approve,
  // drops the envelope on deny. Either way the request leaves the
  // queue — denied items are not retained (kid can re-ask). The
  // mutation reuses the same setters as direct edits so the sync
  // layer + actor-identity trigger behave identically.
  const decideSongPlayRequest = (id, decision) => {
    const req = (songPlayRequests || []).find((r) => r.id === id);
    if (!req) return;
    if (decision === "approve") {
      if (req.kind === "remove") removeSongPlay(req.playId);
      else if (req.kind === "update" && req.payload) updateSongPlay(req.playId, req.payload);
    }
    setSongPlayRequests((prev) => (prev || []).filter((r) => r.id !== id));
  };
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
  const giftedToday = gifted.filter((g) => g.date === TODAY_ISO).reduce((s, g) => s + (Number(g.stars) || 0), 0);
  const starBank = (Number(starBankBase) || 0) + earnedAllTime + giftedTotal - redeemedTotal;
  // Active rewards sorted cheapest-first. Drives the "next reward" /
  // "big goal" tiles below — per-family, derived from the rewards
  // table instead of the hardcoded Lynch defaults (Movie Night /
  // Universal). Tiles render only when there's at least one active
  // reward; brand-new families with empty rewards see nothing.
  const activeRewardsAsc = useMemo(
    () => (rewards || []).filter((r) => r.active !== false).slice().sort((a, b) => (a.starCost || 0) - (b.starCost || 0)),
    [rewards]
  );
  const nextRewardObj = activeRewardsAsc.find((r) => (r.starCost || 0) > starBank) || activeRewardsAsc[activeRewardsAsc.length - 1] || null;
  const bigRewardObj = activeRewardsAsc[activeRewardsAsc.length - 1] || null;
  const nextRewardTitle = nextRewardObj?.title || "";
  const nextRewardCost = nextRewardObj?.starCost || 0;
  const bigRewardTitle = bigRewardObj?.title || "";
  const bigRewardCost = bigRewardObj?.starCost || 0;
  // Today-only stats (what the labels actually say). Honest now.
  // "Earned today" MUST include bonus gifts so the parent + kid see
  // exactly the same total that landed in the bank today. Hiding
  // bonus stars in a separate widget would let "Earned today" lag
  // behind the actual bank movement and break trust the first time
  // Reznor noticed. (Mike: "We cannot have hidden info that breaks
  // trust." 2026-06-12.)
  const earnedToday = approvedAll
    .filter((c) => c.completionDate === TODAY_ISO)
    .reduce((s, c) => s + (c.awardedStars || 0), 0)
    + giftedToday;
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
  // saveDraft — write a work-in-progress completion to the day's slot
  // without firing the submit gauntlet (no auto-approve, no streak
  // bump, no juice, no celebrate, no kid pop). Mike: Drums is 45min-
  // 2hr across Drumeo + Melodics + Drumscribe + songs; he wants to
  // log pieces as Reznor finishes them and submit once it's all
  // there. Status: 'draft'. Replaces today's prior draft for the
  // same task, but never clobbers an already-submitted row.
  const saveDraft = (taskId, payload) => {
    const t = tasks.find((x) => x.id === taskId);
    if (!t) return;
    const kid = users.find((u) => u.role === "kid");
    const kidId = kid?.id || currentUserId;
    setCompletions((prev) => {
      // If today's row for this task isn't draft and isn't not-started
      // (e.g., already pending / approved / needs_fix), don't overwrite
      // it — a draft save shouldn't undo a submission. The existing
      // edit-in-place flow handles that case instead.
      const todays = prev.find((c) => c.taskId === taskId && (c.completionDate || null) === TODAY_ISO);
      if (todays && todays.status !== "draft") return prev;
      const others = prev.filter((c) => !(c.taskId === taskId && (c.completionDate || null) === TODAY_ISO));
      return [...others, {
        id: todays?.id || ("cmp_" + Date.now()),
        taskId,
        status: "draft",
        awardedStars: 0,
        pendingStars: 0,
        completedBy: kidId,
        submittedBy: currentProfileId || currentUserId,
        approvedBy: null,
        notes: payload.notes || "",
        proof: payload.proof || [],
        extra: payload.extra || {},
        completionDate: TODAY_ISO,
      }];
    });
    setOpenTask(null);
  };
  // Patch any field on an existing completion — used by the Completion
  // Detail sheet to retroactively add photos, edit notes, etc.
  // Krissie's ask: parents (and Reznor) need a way to drop a photo onto
  // a chore that was already submitted. updateCompletion routes through
  // setCompletions so the Supabase sync layer picks it up the same way
  // it does for submit/decide/undo.
  // updateCompletion patches the row + optionally appends an audit
  // entry. meta = { by, summary } turns a silent patch into a tracked
  // edit: the History tab in CompletionDetailSheet renders these so
  // weeks later "why does this row say +10 instead of +5?" has an
  // answer. Audit lives in extra.history (jsonb, no migration).
  const updateCompletion = (completionId, patch, meta) => {
    setCompletions((prev) => prev.map((c) => {
      if (c.id !== completionId) return c;
      const next = { ...c, ...patch };
      if (meta && meta.summary) {
        const prevHistory = Array.isArray(c.extra?.history) ? c.extra.history : [];
        const entry = {
          at: new Date().toISOString(),
          by: meta.by || null,
          summary: meta.summary,
          // Snapshot only the keys actually patched so the row stays
          // readable. Stringified values keep the jsonb compact.
          changes: Object.keys(patch).map((k) => ({
            field: k,
            before: c[k] === undefined ? null : c[k],
            after: patch[k] === undefined ? null : patch[k],
          })),
        };
        next.extra = { ...(next.extra || {}), history: [entry, ...prevHistory] };
      }
      return next;
    }));
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
    setCompletions((prev) => {
      const next = prev.map((c) => {
        if (c.id !== completionId) return c;
        const existing = Array.isArray(c.proof) ? c.proof : [];
        return { ...c, proof: existing.filter((p) => p.path !== path) };
      });
      // Storage GC — fire-and-forget after the state update so the
      // ref-count check sees the post-update completions array.
      // Dedup may mean this path is still referenced by another row;
      // the helper will skip the delete in that case.
      maybeDeleteUnusedPaths([path], {
        completions: next, books, songs, gifted: giftedRaw, albumPhotos, users, awards,
      });
      return next;
    });
  };
  const undoTask = (taskId) => {
    // "Unmark today" — only touch today's completion. Yesterday's row stays
    // in the array so history isn't destroyed.
    const c = completions.find((x) => x.taskId === taskId && (x.completionDate || null) === TODAY_ISO);
    setCompletions((prev) => {
      const next = prev.filter((x) => !(x.taskId === taskId && (x.completionDate || null) === TODAY_ISO));
      // Cascade-delete proof photos that nobody else uses. Ref-count
      // against the post-update completions array so the removed
      // row's own paths don't self-reference.
      const proofPaths = pathsFromProof(c?.proof);
      if (proofPaths.length > 0) {
        maybeDeleteUnusedPaths(proofPaths, {
          completions: next, books, songs, gifted: giftedRaw, albumPhotos, users, awards,
        });
      }
      return next;
    });
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
    // Look up the target row in the pre-update array so we can
    // build the patch from c.pendingStars accurately. setCompletions
    // hasn't applied yet on this tick so `completions.find` returns
    // the row as it was when the parent tapped Approve.
    const target = completions.find((c) => c.id === completionId);
    if (!target) return;
    // Build patch + audit summary by decision. Routing through
    // updateCompletion (instead of raw setCompletions) layers an
    // `extra.history` entry so weeks later "who approved this with
    // a +5 bonus?" has an answer in the CompletionDetailSheet's
    // Edit history. Audit lives in jsonb — no schema change.
    let patch;
    let summary;
    const actor = currentProfileId || currentUserId;
    if (decision === "approve") {
      patch = {
        status: "approved",
        awardedStars: target.pendingStars + bonus,
        pendingStars: 0,
        approvedBy: actor,
      };
      summary = bonus > 0 ? `Approved with +${bonus} bonus` : "Approved";
    } else if (decision === "needs_fix") {
      patch = { status: "needs_fix", pendingStars: 0 };
      summary = "Marked Needs fix";
    } else if (decision === "reject") {
      patch = { status: "skipped", pendingStars: 0, awardedStars: 0 };
      summary = "Rejected";
    } else {
      return;
    }
    updateCompletion(completionId, patch, { by: actor, summary });
    // Effects — streak bump, juice, star-burst fly. Unchanged from
    // the previous implementation; just moved below the audit write
    // so the order is "record, then react."
    if (decision === "approve") {
      const tk = tasks.find((x) => x.id === target.taskId);
      const aid = tk?.activityId || TYPE_TO_ACT[tk?.activityType];
      if (aid) bumpStreak(aid); // only bumps if that activity is being tracked
      juice.burst("success", "approve");
      const flyValue = (target.pendingStars || 0) + (bonus || 0);
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
  // decideReward — parent approves or denies a star redemption.
  // Trust audit finding #1 (🔴 critical): the previous version
  // just flipped `status` with no actor + no timestamp, leaving
  // 100⭐ approvals untraceable. Now we stamp approvedBy +
  // approvedAt so disputes ("which parent okayed this?") always
  // have an answer. Mirrors the completion approval pattern.
  const decideReward = (rdId, status) => {
    const actor = currentProfileId || currentUserId;
    const now = new Date().toISOString();
    setRedemptions((prev) => prev.map((r) => r.id === rdId
      ? { ...r, status, approvedBy: actor, approvedAt: now }
      : r
    ));
  };

  const addHandoff = (text) => {
    if (!text.trim()) return;
    setHandoff((prev) => [{ id: "h_" + Date.now(), authorId: currentUserId, note: text, pinned: false, time: "now" }, ...prev]);
  };
  const addEvent = (ev) => setEvents((prev) => [...prev, { ...ev, id: "ev_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6) }]);
  const updateEvent = (id, patch) => setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  const removeEvent = (id) => setEvents((prev) => prev.filter((e) => e.id !== id));
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
    if (error) { toast.error("Approve failed: " + error.message); return; }
    await reloadPending();
  };

  const denyRegistration = async (authUserId) => {
    const { error } = await supabase.rpc("deny_registration", { p_auth_user_id: authUserId });
    if (error) { toast.error("Deny failed: " + error.message); return; }
    await reloadPending();
  };
  const setPriority = (taskId, level, scope) => setPriorities((prev) => ({ ...prev, [taskId]: { level, scope, by: currentUserId } }));
  const clearPriority = (taskId) => setPriorities((prev) => { const n = { ...prev }; delete n[taskId]; return n; });
  // date must be ISO (YYYY-MM-DD) — Postgres date column rejects the
  // human-readable fmtDate ("Wednesday, June 10") form. Krissie hit
  // this on bonus-star gifting bedtime 2026-06-10.
  // giftStars — accepts either the legacy positional form (label, stars)
  // or the richer object form { label, stars, taskId, activityId,
  // bookId, songId, photoPath, photoName }. The richer payload stashes
  // task/activity/photo metadata into extra so every gift surface can
  // render a real thumbnail and attribute correctly.
  //
  // We also stamp bookTitle / songTitle alongside the ids so the
  // ProofThumb lookup has a robust fallback if the id ever fails to
  // match (book got renamed, recreated, etc.). Belt + suspenders.
  const giftStars = (labelOrPayload, n) => {
    const payload = typeof labelOrPayload === "object" && labelOrPayload !== null
      ? labelOrPayload
      : { label: labelOrPayload, stars: n };
    const { label, stars, taskId, activityId, bookId, songId, photoPath, photoName } = payload;
    const extra = {};
    if (taskId) extra.taskId = taskId;
    if (activityId) extra.activityId = activityId;
    if (bookId) {
      extra.bookId = bookId;
      const b = books.find((x) => x.id === bookId);
      if (b) extra.bookTitle = b.canonicalTitle || b.title || null;
    }
    if (songId) {
      extra.songId = songId;
      const s = songs.find((x) => x.id === songId);
      if (s) extra.songTitle = s.canonicalTitle || s.title || null;
    }
    if (photoPath) extra.photoPath = photoPath;
    if (photoName) extra.photoName = photoName;
    setGifted((prev) => [{
      id: "g_" + Date.now(),
      label,
      stars,
      by: currentUserId,
      date: TODAY_ISO,
      extra,
    }, ...prev]);
  };
  // Soft-delete a gift row by id. Used by the Star Ledger to
  // correct duplicates after the fact (the 'Krissie double-gifted'
  // case). Trust audit finding #3: destructive removes had no
  // record of who did it or when. Now we stamp deletedAt + deletedBy
  // on the row instead of dropping it, and append an audit entry
  // to extra.history so the "who removed the +10⭐ gift?" question
  // always has an answer. DataProvider filters deleted rows out
  // before they reach the app, so the UX is identical to before.
  const removeGift = (id) => setGifted((prev) => prev.map((g) => {
    if (g.id !== id) return g;
    const actor = currentProfileId || currentUserId;
    const prevHistory = Array.isArray(g.extra?.history) ? g.extra.history : [];
    const entry = {
      at: new Date().toISOString(),
      by: actor,
      summary: `Removed bonus (-${g.stars}⭐: ${g.label || "Bonus"})`,
      changes: [{ field: "deletedAt", before: null, after: "<now>" }],
    };
    return {
      ...g,
      deletedAt: new Date().toISOString(),
      deletedBy: actor,
      extra: { ...(g.extra || {}), history: [entry, ...prevHistory] },
    };
  }));
  // Update an existing bonus gift in place. Mike's rule: parents can
  // edit anything they created from any surface where they see it.
  // Patch shape mirrors the gifted row — label / stars / extra fields.
  // Trust audit finding #4: silent edits had no audit. Now we
  // snapshot label / stars changes into extra.history so a future
  // dispute ("I swear I gave +10, not +5") has a paper trail.
  const updateGift = (id, patch) =>
    setGifted((prev) => prev.map((g) => {
      if (g.id !== id) return g;
      const trackedKeys = ["label", "stars"];
      const changes = trackedKeys
        .filter((k) => patch && k in patch && patch[k] !== g[k])
        .map((k) => ({ field: k, before: g[k] ?? null, after: patch[k] ?? null }));
      const next = { ...g, ...patch, extra: { ...(g.extra || {}), ...((patch && patch.extra) || {}) } };
      if (changes.length === 0) return next;
      const prevHistory = Array.isArray(next.extra?.history) ? next.extra.history : [];
      const summary = changes.length === 1
        ? `Edited ${changes[0].field}`
        : `Edited ${changes.map((c) => c.field).join(" + ")}`;
      next.extra = {
        ...next.extra,
        history: [{
          at: new Date().toISOString(),
          by: currentProfileId || currentUserId,
          summary,
          changes,
        }, ...prevHistory],
      };
      return next;
    }));
  const toggleTkdDay = (day) => setTkdDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  const setTkdTime = (day, time) => setTkdTimes((prev) => ({ ...prev, [day]: time }));
  // Generic toggles — basketball / swim / any activity with
  // weeklySchedule=true uses these. Writes a per-activity entry in
  // the weeklyActivityDays / Times settings. Removing the last day
  // for an activity drops the key entirely to keep the JSON tidy.
  const toggleWeeklyDay = (activityId, day) => {
    setWeeklyActivityDays((prev) => {
      const list = (prev?.[activityId] || []).slice();
      const i = list.indexOf(day);
      if (i >= 0) list.splice(i, 1);
      else list.push(day);
      const next = { ...(prev || {}) };
      if (list.length === 0) delete next[activityId];
      else next[activityId] = list;
      return next;
    });
  };
  const setWeeklyDayTime = (activityId, day, time) => {
    setWeeklyActivityTimes((prev) => {
      const byDay = { ...((prev?.[activityId]) || {}) };
      if (time) byDay[day] = time;
      else delete byDay[day];
      const next = { ...(prev || {}) };
      if (Object.keys(byDay).length === 0) delete next[activityId];
      else next[activityId] = byDay;
      return next;
    });
  };
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
  // removeRewardRequest — clears a wish row from the kid's Dream
  // Plan view. Mike's framing: "No, that's very farMs" was Reznor
  // mis-typing Knotts Berry Farms; the typo'd row stayed forever
  // even after Knotts was approved. Two clean-up paths:
  //   - APPROVED wishes: anyone can tap "Got it" — the reward
  //     already exists in the rewards table, so removing the
  //     request row loses zero meaningful data. Not a "delete"
  //     under the kids-never-delete rule.
  //   - REQUESTED / DECLINED wishes: parent-only. The Dream Plan
  //     UI gates the X button by checking the AUTH identity (not
  //     the acted-as profile) so Mike acting as Reznor still gets
  //     the X.
  const removeRewardRequest = (id) => {
    setRewardRequests((prev) => prev.filter((w) => w.id !== id));
  };
  const addTaskNote = (taskId, text) => { if (!text.trim()) return; setTaskNotes((prev) => ({ ...prev, [taskId]: [{ text: text.trim(), by: currentUserId, time: "now" }, ...(prev[taskId] || [])] })); };
  const addBook = (b) => setBooks((prev) => [b, ...prev]);
  const updateBook = (id, patch) => setBooks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const removeBook = (id) => {
    const target = books.find((b) => b.id === id);
    setBooks((prev) => {
      const next = prev.filter((b) => b.id !== id);
      // GC the book's custom cover (if any) after the row is gone.
      // Dedup may keep the path alive via another book / completion
      // proof / cover; helper handles that.
      if (target?.customCoverPath) {
        maybeDeleteUnusedPaths([target.customCoverPath], {
          completions, books: next, songs, gifted: giftedRaw, albumPhotos, users, awards,
        });
      }
      return next;
    });
  };
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
    const target = songs.find((s) => s.id === id);
    setSongs((prev) => {
      const next = prev.filter((s) => s.id !== id);
      // GC the song's custom cover (if any) — albumCover dedup means
      // the path might still be in use by another song from the same
      // canonical album; helper checks before deleting.
      if (target?.customCoverPath) {
        maybeDeleteUnusedPaths([target.customCoverPath], {
          completions, books, songs: next, gifted: giftedRaw, albumPhotos, users, awards,
        });
      }
      return next;
    });
    setSongPlays((prev) => prev.filter((p) => p.songId !== id));
  };
  const removeSongPlay = (id) => setSongPlays((prev) => prev.filter((p) => p.id !== id));
  // Edit a single play row — picked wrong song, logged the wrong
  // date, want to drop a note. Shallow patch so the toDb mapper
  // gets the same row shape it would for a fresh insert.
  const updateSongPlay = (id, patch) =>
    setSongPlays((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  // Phase 6b: shallow patcher for enrichment fields (cover_url,
  // canonical_*, match_status). Mirrors updateBook's contract.
  const updateSong = (id, patch) =>
    setSongs((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

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

  // Display languages — family-wide setting so a parent's toggle covers
  // every member's view (parent, kid, helper). Drives bilingual rendering
  // of task names, activity names, nav labels, and section headers.
  // Default is English-only; the parent flips it from More → Languages.
  const langs = activeLangs({ displayLangs });
  // Mirror to the module-level holder so deeply nested components can
  // call i18nTitleOf(task) / i18nNameOf(activity) without prop-drilling
  // langs through every signature.
  useEffect(() => { setCurrentLangs(langs); }, [langs.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Streak milestone confetti. Watches every streak and fires when
  // current crosses a milestone (7, 14, 30, 50, 100, 200, 300, 365,
  // 500, 1000) or sets a NEW personal best beyond 30 days. The first
  // render seeds the ref with whatever's already there so a session
  // reload doesn't re-fire historical milestones.
  const _seenStreakRef = React.useRef(null);
  useEffect(() => {
    const STREAK_MILESTONES = [7, 14, 30, 50, 100, 200, 300, 365, 500, 730, 1000];
    const snap = {};
    for (const [aid, s] of Object.entries(streaks || {})) {
      snap[aid] = { current: Number(s?.current) || 0, longest: Number(s?.longest) || 0 };
    }
    if (_seenStreakRef.current === null) {
      _seenStreakRef.current = snap;
      return;
    }
    const prev = _seenStreakRef.current;
    let fired = false;
    for (const aid of Object.keys(snap)) {
      const before = prev[aid]?.current || 0;
      const after  = snap[aid].current;
      if (after <= before) continue;
      const crossed = STREAK_MILESTONES.find((m) => after >= m && before < m);
      const newBest = snap[aid].longest > (prev[aid]?.longest || 0) && snap[aid].longest >= 30 && !crossed;
      if (!crossed && !newBest) continue;
      if (fired) continue;
      try { juice.burst("success", "levelUp"); } catch (_) { /* skip */ }
      const actName = (activities || []).find((a) => a.id === aid)?.name || aid;
      if (crossed) {
        milestone.show({
          title: `${crossed} day ${actName} streak!`,
          subtitle: "Treasure unlocked — keep going.",
          kind: "streak",
        });
      } else {
        // New personal best — smaller treasure cinematic but still
        // chest-worthy past 30 days.
        milestone.show({
          title: `New best · ${snap[aid].current} days`,
          subtitle: `${actName} · personal record`,
          kind: "personal-best",
        });
      }
      fired = true;
    }
    _seenStreakRef.current = snap;
  }, [streaks]);

  // One-shot duration backfill — pre-2026-06-14 songs were enriched
  // before we captured trackTimeMillis, so their durationMs is null.
  // Walk once per session, re-hit iTunes for each missing one, patch
  // duration only (don't touch matchStatus / coverUrl — those were
  // already curated). Serial loop with 250ms gaps keeps us under
  // Apple's loose throttle even for ~60-song libraries.
  const _durationBackfillRef = React.useRef(false);
  useEffect(() => {
    if (_durationBackfillRef.current) return;
    // Any song with a title but no duration is a candidate — we don't
    // require prior iTunes matching. Reznor's Fade to Black / Toxicity
    // were added via SongLogger before MusicLibrary ever mounted to
    // auto-enrich them, so they had no externalSource. The earlier
    // matchStatus gate skipped them entirely. Now we re-hit iTunes
    // for anything missing duration, populate if a match comes back,
    // leave null + matchStatus untouched if not.
    const stale = (songs || []).filter(
      (s) =>
        !Number.isFinite(s.durationMs)
        && s.matchStatus !== "rejected"
        && (s.canonicalTitle || s.title)
    );
    if (stale.length === 0) return;
    _durationBackfillRef.current = true;
    let cancelled = false;
    (async () => {
      for (const s of stale) {
        if (cancelled) return;
        try {
          const match = await pickSongMatch(
            s.canonicalTitle || s.title,
            s.canonicalArtist || s.artist || ""
          );
          if (cancelled) return;
          if (match?.durationMs) {
            updateSong(s.id, { durationMs: match.durationMs });
          }
        } catch { /* skip + continue */ }
        await new Promise((r) => setTimeout(r, 250));
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songs.length]);

  // Siri Shortcut / URL-deeplink quick complete. Parent sets up an iOS
  // Shortcut that opens `?qc=drums` → app marks today's matching task
  // complete. Idempotent: if today's completion already exists, we
  // toast "already done" instead of doubling up. Matches by task id,
  // activityType, or fuzzy title — forgives "drum" vs "Drums".
  const _qcFiredRef = React.useRef(false);
  useEffect(() => {
    if (_qcFiredRef.current) return;
    if (!tasks || tasks.length === 0) return; // wait for tasks to hydrate
    let qc = null;
    try {
      const params = new URLSearchParams(window.location.search);
      qc = params.get("qc") || params.get("quickComplete");
    } catch (_) { return; }
    if (!qc) return;
    _qcFiredRef.current = true;
    const norm = (s) => (s || "").toLowerCase().trim();
    const q = norm(qc);
    const match = tasks.find((t) => t.id === qc)
      || tasks.find((t) => norm(t.activityType) === q)
      || tasks.find((t) => norm(t.title) === q)
      || tasks.find((t) => norm(t.title).includes(q))
      || tasks.find((t) => norm(t.activityType).includes(q));
    if (!match) {
      toast.error(`Couldn't find a task matching "${qc}".`);
    } else if (compByTask[match.id]?.status === "approved") {
      toast.success(`${match.title} already done today ✨`);
    } else {
      submitTask(match.id, { notes: "Logged via Siri Shortcut" });
      toast.success(`✓ Logged ${match.title}`);
    }
    // Clear the query string so a future refresh doesn't re-fire.
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("qc");
      url.searchParams.delete("quickComplete");
      window.history.replaceState({}, "", url.pathname + (url.search ? url.search : "") + url.hash);
    } catch (_) { /* fine */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks.length]);

  const [hubOpen, setHubOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

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
    // Bilingual title — KidGameHome renders q.title directly, so the
    // translation has to happen here at the source. Falls back to raw
    // title for any custom task without a seeded translation.
    return { id: t.id, title: i18nTitleOf(t), xp: (t.starValue || 0) * 10, done: !!c, subtasks: subs };
  };
  const _booksFinished = (books || []).filter(isBookFinished).length;
  const _songsToday = (songPlays || []).filter((p) => p.playedOn === TODAY_ISO).length;
  // Hero XP + level — derived, never stored. See xpForLevel / levelFromXp.
  const _xp = starBank * 10;
  const _levelN = levelFromXp(_xp);
  const _xpAtLevel = xpForLevel(_levelN);
  const _xpAtNext = xpForLevel(_levelN + 1);
  // Next-badge pull-forward — derived from the canonical ACHIEVEMENTS list.
  const _treasureStreak = computeTreasureStreak({ completions, tasks, topPriorities, taskNaDays });
  const _achCtx = buildAchCtx({ completions, todaysTasks, compByTask, starBank, streaks, books, treasureStreak: _treasureStreak });
  const _nextBadge = nextBadgeFor(_achCtx);
  const _nextBadgeValue = _nextBadge?.val ? _nextBadge.val(_achCtx) : 0;
  const kidData = {
    name: user?.name,
    avatar: user?.photo || user?.emoji || "🧑‍🚀",
    stars: starBank,
    streak: { current: _drumCurrent, milestone: _milestone, fillPct: (_drumCurrent / _milestone) * 100 },
    nextReward: { title: nextRewardTitle, cost: nextRewardCost, have: starBank },
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
    mainQuests: todaysTopEight.filter((t) => t.required).map(_questFromTask),
    sideQuests: todaysTopEight.filter((t) => !t.required).map(_questFromTask),
    treasureStreak: _treasureStreak,
    giftedToday,
    earnedToday,
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
    user, users, tasks, todaysTasks, todaysTopEight, todaysNATasks, topPriorities, setDailyTopEight, resetDailyTopEight, setWeeklyTopEight, taskNaDays, markTaskNA, restoreTaskFromNA, pinnedBonus, pinTaskToToday, unpinTaskFromToday, todayOrder, setTodayOrder, songPlayRequests, requestSongPlayChange, decideSongPlayRequest, libraryOrder, setLibraryOrder, currentPrefs, setPref, langs, displayLangs, setDisplayLangs, rewards, completions, compByTask, events, handoff, redemptions,
    mode, setMode, earnedToday, pendingStars, availableToday, starBank, redeemedTotal, giftedTotal,
    priorities, setPriority, clearPriority, gifted, giftStars, tkdDays, tkdTimes, toggleTkdDay, setTkdTime, weeklyActivityDays, weeklyActivityTimes, toggleWeeklyDay, setWeeklyDayTime,
    activities, addActivity, updateActivity, addTask, updateTask, removeTask, addReward, updateReward, removeReward, streaks, setStreak, stopStreak, bumpStreak, setDetailId, taskNotes, addTaskNote, setProgressActId, books, addBook, updateBook, removeBook, subProgress, toggleSub, undoTask, awards, addAward, removeAward,
    submitTask, saveDraft, decide, requestReward, decideReward, addHandoff, addEvent, addUser, updateUser, removeUser, openTask, setOpenTask, setTab, rewardRequests, addRewardRequest, decideRewardRequest, removeRewardRequest,
    openCompletionId, setOpenCompletionId, updateCompletion, addCompletionPhoto, removeCompletionPhoto,
    pendingRegistrations, approveRegistration, denyRegistration, currentProfileId, setCurrentUserId,
    kidData,
    familyId, signOut, sessionEmail,
    songs, songPlays, addSong, addSongPlay, removeSong, removeSongPlay, updateSongPlay, updateSong,
    removeGift,
    setStatDetailId,
    earnedAllTime,
    boardState, setBoardLastPosition, setTreasureClaimed,
    summerQuest, setSummerQuest,
    boardTheme, setBoardTheme,
    boardDailyCap, setBoardDailyCap,
    albumPhotos, setAlbumPhotos,
    learningGoals, setLearningGoals,
    updateEvent, removeEvent,
    weekOverrides, setWeekOverrides,
    nextRewardTitle, nextRewardCost,
    bigRewardTitle, bigRewardCost,
    pendingMoreSub, setPendingMoreSub,
    practiceSessions, addPracticeSession, removePracticeSession,
    shoppingItems, addShoppingItem, toggleShoppingItem, removeShoppingItem, clearCheckedShoppingItems, renameShoppingItem, updateShoppingItem, decideShoppingRequest,
    relabelShoppingItemsByListKey,
    receipts, addReceipt, softDeleteReceipt, updateReceipt,
    familySettings, setFamilySettings,
    dailyCheckins, setMoodCheckin,
    familySetting, // for EmailSetup's digestRecipients toggle (and anything else later)
    dailyRequiredCount, setDailyRequiredCount,
  };

  // First-run gate: a freshly-created family has a parent profile (from
  // create_family RPC) but no kid yet. Render the OnboardingWizard so
  // they can name their first kid before entering the app. Lynch and
  // every existing family pass this check because they have kids.
  const hasKid = users.some((u) => u.role === "kid");
  if (!hasKid) {
    const me = users.find((u) => u.id === currentProfileId);
    return (
      <OnboardingWizard
        parentName={me?.name}
        onCreateKid={async ({ name, emoji, color, grade }) => {
          addUser({
            name,
            role: "kid",
            // is_child is the bypass the actor guard checks when a
            // non-admin parent submits a completion on behalf of the
            // kid. A DB trigger (2026-06-16) now pins this to
            // (role = 'kid') regardless of what the client sends, but
            // we set it here too so the code matches the truth.
            is_child: true,
            emoji,
            color,
            grade: grade || null,
            relationship: "Kid",
            active: true,
            accessType: "permanent",
            accessExpires: null,
            permissions: {},
          });
        }}
      />
    );
  }

  return (
    <div
      className="flex justify-center"
      style={{
        // App-shell layout (2026-06-16). Outer container is locked to the
        // visible viewport with overflow:hidden so the BODY itself can't
        // scroll on iOS Safari — that body-scroll was letting users drag
        // the whole shell up and exposed a gap below the BottomNav. The
        // ONLY scrolling region in the whole tree is the flex-1 middle
        // inside the shell.
        height: "100dvh",
        overflow: "hidden",
        background: (THEMES[currentPrefs.theme] || THEMES.white).bg,
        color: (THEMES[currentPrefs.theme] || THEMES.white).fg,
        fontFamily: "ui-rounded, 'SF Pro Rounded', system-ui, sans-serif",
      }}
    >
      <div
        className="w-full max-w-md flex flex-col relative shadow-xl overflow-hidden"
        style={{
          background: (THEMES[currentPrefs.theme] || THEMES.white).bg,
          // 100dvh = dynamic viewport, tracks iOS Safari URL-bar show/hide.
          // Locking the shell to exactly viewport height + flex-column means
          // TopBar (first child) sits at the top, BottomNav (last child)
          // sits at the bottom, and the flex-1 middle absorbs the rest.
          // No position:fixed, no position:sticky — just flex flow. iOS
          // Safari's position:fixed visual-viewport bug doesn't apply
          // because nothing depends on it for the bars.
          height: "100dvh",
        }}
      >
        <TopBar user={user} mode={mode} onSwitch={() => { setCurrentUserId(null); }} onSignOut={signOut} sessionEmail={sessionEmail} onOpenHub={() => setHubOpen(true)} onOpenSearch={() => setSearchOpen(true)} />
        <PracticeTimerBanner activities={activities} onOpen={() => { setPendingMoreSub("practice"); setTab("more"); }} />
        <div className="flex-1 overflow-y-auto">
          <Router tab={tab} {...shared} />
        </div>
        <BottomNav user={user} tab={tab} setTab={setTab} langs={langs} />
        <BetaFeedbackChip familyName={user?.familyName} kidName={user?.name} />
        {searchOpen && (
          <SearchSheet
            onClose={() => setSearchOpen(false)}
            tasks={tasks}
            activities={activities}
            books={books}
            songs={songs}
            rewards={rewards}
            events={events}
            shoppingItems={shoppingItems}
            completions={completions}
            users={users}
            onPickTask={(t) => { setSearchOpen(false); setOpenTask(t); }}
            onPickCompletion={(c) => { setSearchOpen(false); setOpenCompletionId(c.id); }}
            onPickEvent={() => { setSearchOpen(false); setTab("calendar"); }}
            onPickShopping={() => { setSearchOpen(false); setPendingMoreSub("shopping"); setTab("more"); }}
            onPickReward={() => { setSearchOpen(false); setTab("rewards"); }}
            onPickActivity={() => { setSearchOpen(false); setPendingMoreSub("activities"); setTab("more"); }}
            onPickBook={() => { setSearchOpen(false); setPendingMoreSub("library"); setTab("more"); }}
            onPickSong={() => { setSearchOpen(false); setPendingMoreSub("music_library"); setTab("more"); }}
            onPickPage={(p) => {
              setSearchOpen(false);
              if (p.kind === "more") { setPendingMoreSub(p.key); setTab("more"); }
              else if (p.kind === "tab") { setTab(p.key); }
            }}
          />
        )}
        {openTask && (
          <TaskSheet
            task={openTask}
            existing={compByTask[openTask.id]}
            role={user?.role}
            onClose={() => setOpenTask(null)}
            onSubmit={submitTask}
            onSaveDraft={saveDraft}
            familyId={familyId}
            songs={songs}
            songPlays={songPlays}
            addSong={addSong}
            addSongPlay={addSongPlay}
            books={books}
            updateBook={updateBook}
            addBook={addBook}
            updateCompletion={updateCompletion}
            actorId={user?.id}
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
              songs={songs}
              songPlays={songPlays}
              books={books}
              onClose={() => setOpenCompletionId(null)}
              onAddPhoto={(photo) => addCompletionPhoto(c.id, photo)}
              onRemovePhoto={(path) => removeCompletionPhoto(c.id, path)}
              onUpdateNotes={(notes) => updateCompletion(c.id, { notes }, { by: currentUserId, summary: "Edited notes" })}
              onUndo={() => undoTask(c.taskId)}
              onEditTask={(taskId) => setDetailId(taskId)}
              onEditDetails={() => { setOpenCompletionId(null); setOpenTask(t); }}
            />
          );
        })()}
        {detailId && (() => {
          const t = tasks.find((x) => x.id === detailId);
          if (!t) return null;
          return <DetailSheet task={t} onClose={() => setDetailId(null)} activities={activities} streaks={streaks} completions={completions} priorities={priorities} setPriority={setPriority} clearPriority={clearPriority} updateTask={updateTask} removeTask={(id) => { removeTask(id); setDetailId(null); }} setStreak={setStreak} stopStreak={stopStreak} bumpStreak={bumpStreak} taskNotes={taskNotes} addTaskNote={addTaskNote} users={users} songs={songs} songPlays={songPlays} />;
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
            base={Number(starBankBase) || 0}
            role={user?.role}
            removeGift={removeGift}
            songs={songs}
            songPlays={songPlays}
            albumPhotos={albumPhotos}
            books={books}
          />
        )}
      </div>
      <StarBurstLayer />
      <LevelUpLayer />
      <MilestoneCelebrate />
      <PhotoLightboxOverlay />
      <ToastLayer />
      <EditGiftSheet
        updateGift={updateGift}
        removeGift={removeGift}
        tasks={tasks}
        activities={activities}
        books={books}
        songs={songs}
        addBook={addBook}
        addSong={addSong}
        updateBook={updateBook}
        familyId={familyId}
      />
      {!welcomeDismissed && (
        <OnboardingOverlay
          user={user}
          onDismiss={() => setWelcomeDismissed(true)}
        />
      )}
    </div>
  );
}

// Full-screen photo viewer triggered by lightbox.open({src, alt}) from
// anywhere in the tree. Tap backdrop or the × closes. Double-tap toggles
// 1× ↔ 2.5× zoom for desktop and tap-to-zoom mobile use. Pinch-zoom on
// the image works natively via touch-action: pinch-zoom. Escape closes.
function PhotoLightboxOverlay() {
  const [photo, setPhoto] = useState(null);
  const [zoomed, setZoomed] = useState(false);
  useEffect(() => lightbox.subscribe((next) => {
    setPhoto(next);
    setZoomed(false);
  }), []);
  useEffect(() => {
    if (!photo) return;
    const onKey = (e) => { if (e.key === "Escape") lightbox.close(); };
    window.addEventListener("keydown", onKey);
    // Prevent page scroll while open.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [photo]);
  if (!photo) return null;
  return (
    <div
      onClick={() => lightbox.close()}
      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); lightbox.close(); }}
        aria-label="Close"
        className="absolute top-4 right-4 z-10 w-11 h-11 rounded-full bg-white/15 backdrop-blur hover:bg-white/25 grid place-items-center text-white active:scale-95"
      >
        <X size={22} />
      </button>
      <div
        className="relative w-full h-full overflow-auto flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
        style={{ touchAction: "pinch-zoom" }}
      >
        <img
          src={photo.src}
          alt={photo.alt || ""}
          onDoubleClick={() => setZoomed((z) => !z)}
          onClick={(e) => {
            // Single-tap on image: toggle zoom too — most parents on
            // mobile won't think to double-tap. Backdrop click is
            // handled by the outer div via stopPropagation above.
            e.stopPropagation();
            setZoomed((z) => !z);
          }}
          style={{
            maxWidth: "100vw",
            maxHeight: "100vh",
            transform: zoomed ? "scale(2.5)" : "scale(1)",
            transformOrigin: "center center",
            transition: "transform 220ms ease",
            cursor: zoomed ? "zoom-out" : "zoom-in",
            touchAction: "pinch-zoom",
          }}
          draggable={false}
        />
      </div>
      <div className="absolute bottom-4 left-0 right-0 text-center text-white/70 text-[11px] pointer-events-none">
        Tap to {zoomed ? "shrink" : "zoom"} · pinch to zoom · tap outside to close
      </div>
    </div>
  );
}

// EditGiftSheet — universal "tap to edit a bonus gift" surface. Any
// gift row in the app calls giftEditor.open(gift) on tap; this
// overlay subscribes and renders a pre-filled form. Mike's rule:
// ToastLayer — bottom-of-screen soft notifications. Replaces native
// window.alert() on the upload failure paths. Subscribes to the
// toast singleton, animates in, auto-dismisses after the duration.
// Color-coded by kind: error = amber, success = emerald, info = slate.
function ToastLayer() {
  const [toasts, setToasts] = useState([]);
  useEffect(() => toast.subscribe((t) => {
    setToasts((prev) => [...prev, t]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== t.id));
    }, t.duration);
  }), []);
  if (toasts.length === 0) return null;
  return (
    <div
      className="fixed left-0 right-0 flex flex-col items-center gap-2 px-4 pointer-events-none"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 90px)", zIndex: 9997 }}
      aria-live="polite"
    >
      {toasts.map((t) => {
        const cls =
          t.kind === "error" ? "bg-amber-50 border-amber-300 text-amber-900"
          : t.kind === "success" ? "bg-emerald-50 border-emerald-300 text-emerald-900"
          : "bg-slate-50 border-slate-300 text-slate-800";
        const icon =
          t.kind === "error" ? <AlertCircle size={16} />
          : t.kind === "success" ? <Check size={16} />
          : <Sparkles size={16} />;
        return (
          <div
            key={t.id}
            className={`pointer-events-auto max-w-md w-full rounded-2xl border shadow-lg px-4 py-2.5 text-sm font-semibold flex items-center gap-2 ${cls}`}
            role={t.kind === "error" ? "alert" : "status"}
          >
            <span className="shrink-0">{icon}</span>
            <span className="flex-1 leading-snug">{t.message}</span>
            <button
              type="button"
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              className="text-current opacity-50 hover:opacity-100 p-0.5"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// editing must be easy + findable + confirmed.
//
// Form mirrors the gift create flow (label, stars, optional task →
// book / song picker, photo). All changes go through window.confirm
// summarizing the bank impact. Delete also confirms. Cancel discards
// the draft.
function EditGiftSheet({ updateGift, removeGift, tasks = [], activities = [], books = [], songs = [], addBook, addSong, updateBook, familyId }) {
  const [gift, setGift] = useState(null);
  const [label, setLabel] = useState("");
  const [stars, setStars] = useState(5);
  const [taskId, setTaskId] = useState("");
  const [bookId, setBookId] = useState("");
  const [songId, setSongId] = useState("");
  const [photo, setPhoto] = useState(null); // { path, name }
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  // Inline add-new state matches the GiftStarsCard pattern so a
  // parent editing a gift can also add a missing book or song
  // without leaving the sheet.
  const [addingBook, setAddingBook] = useState(false);
  const [newBookTitle, setNewBookTitle] = useState("");
  const [newBookAuthor, setNewBookAuthor] = useState("");
  const [addingSong, setAddingSong] = useState(false);
  const [newSongTitle, setNewSongTitle] = useState("");
  const [newSongArtist, setNewSongArtist] = useState("");

  useEffect(() => giftEditor.subscribe((next) => {
    setGift(next);
    if (next) {
      setLabel(next.label || "");
      setStars(Number(next.stars) || 0);
      setTaskId(next.extra?.taskId || "");
      setBookId(next.extra?.bookId || "");
      setSongId(next.extra?.songId || "");
      setPhoto(next.extra?.photoPath ? { path: next.extra.photoPath, name: next.extra.photoName || i18nTOf("gs_photo_attached", "Photo attached") } : null);
      setAddingBook(false); setNewBookTitle(""); setNewBookAuthor("");
      setAddingSong(false); setNewSongTitle(""); setNewSongArtist("");
    }
  }), []);
  useEffect(() => {
    if (!gift) return;
    const onKey = (e) => { if (e.key === "Escape") giftEditor.close(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [gift]);

  if (!gift) return null;

  const selectedTask = tasks.find((t) => t.id === taskId);
  const selectedActivity = activities.find((a) => a.id === (selectedTask?.activityId
    || selectedTask?.activityType?.toLowerCase().replace(/\s/g, "_")));
  const isReading = selectedActivity?.id === "books" || /book|read/i.test(selectedTask?.activityType || "");
  const isDrums = selectedActivity?.id === "drums" || /drum/i.test(selectedTask?.activityType || "");

  const handlePickPhoto = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      const { path, name } = await uploadFamilyPhoto({ file: f, familyId, kind: "proof" });
      setPhoto({ path, name });
    } catch (err) {
      toast.error(i18nTOf("gs_photo_upload_fail", "Photo upload failed: {msg}").replaceAll("{msg}", err.message || err));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const saveNewBook = () => {
    const t = newBookTitle.trim();
    if (!t || !addBook) return;
    const id = "b_" + Date.now();
    addBook({ id, title: t, author: newBookAuthor.trim() || null, status: "reading", started: TODAY_ISO });
    setBookId(id);
    setAddingBook(false);
    setNewBookTitle(""); setNewBookAuthor("");
  };
  const saveNewSong = () => {
    const t = newSongTitle.trim();
    if (!t || !addSong) return;
    const id = addSong({ title: t, artist: newSongArtist.trim() || null });
    if (id) setSongId(id);
    setAddingSong(false);
    setNewSongTitle(""); setNewSongArtist("");
  };

  const submit = () => {
    const trimmed = label.trim();
    if (!trimmed) return;
    const newStars = Number(stars) || 0;
    const oldStars = Number(gift.stars) || 0;
    const delta = newStars - oldStars;
    const summary = delta === 0
      ? i18nTOf("eg_save_same", "Save changes to \"{label}\"?\n\nStar amount stays at {n}.").replaceAll("{label}", trimmed).replaceAll("{n}", newStars)
      : delta > 0
        ? i18nTOf("eg_save_up", "Save changes to \"{label}\"?\n\nThe star bank will go up by {n} stars.").replaceAll("{label}", trimmed).replaceAll("{n}", delta)
        : i18nTOf("eg_save_down", "Save changes to \"{label}\"?\n\nThe star bank will drop by {n} stars.").replaceAll("{label}", trimmed).replaceAll("{n}", Math.abs(delta));
    if (!window.confirm(summary)) return;
    // Stamp bookTitle / songTitle alongside the ids so ProofThumb's
    // title fallback always has data to work with, even if the book
    // gets renamed or recreated later. Same belt+suspenders as
    // giftStars on the create path.
    const pickedBook = bookId ? books.find((b) => b.id === bookId) : null;
    const pickedSong = songId ? songs.find((s) => s.id === songId) : null;
    const patch = {
      label: trimmed,
      stars: newStars,
      extra: {
        taskId: taskId || undefined,
        activityId: selectedActivity?.id || undefined,
        bookId: bookId || undefined,
        bookTitle: pickedBook ? (pickedBook.canonicalTitle || pickedBook.title) : undefined,
        songId: songId || undefined,
        songTitle: pickedSong ? (pickedSong.canonicalTitle || pickedSong.title) : undefined,
        photoPath: photo?.path || undefined,
        photoName: photo?.name || undefined,
      },
    };
    updateGift(gift.id, patch);
    giftEditor.close();
  };

  const onDelete = () => {
    const msg = i18nTOf("eg_delete_confirm", "Delete this gift?\n\n\"{label}\" (+{n}⭐)\n\nThe star bank will drop by {n} stars and the row goes away.")
      .replaceAll("{label}", gift.label || i18nTOf("ks_bonus_fallback", "Bonus"))
      .replaceAll("{n}", gift.stars);
    if (!window.confirm(msg)) return;
    removeGift(gift.id);
    giftEditor.close();
  };

  const taskOptions = [...tasks].filter((t) => t.active !== false).sort((a, b) => (a.title || "").localeCompare(b.title || ""));
  const bookStatusOrder = { reading: 0, wishlist: 1, finished: 2, archive: 3, dropped: 4 };
  const bookOptions = [...books].sort((a, b) =>
    (bookStatusOrder[a.status] ?? 9) - (bookStatusOrder[b.status] ?? 9)
    || (a.title || "").localeCompare(b.title || "")
  );
  const songOptions = [...songs].sort((a, b) =>
    (a.canonicalTitle || a.title || "").localeCompare(b.canonicalTitle || b.title || "")
  );

  return (
    <div
      className="fixed inset-0 z-[99] flex items-end sm:items-center justify-center"
      style={{ fontFamily: "inherit" }}
    >
      <div onClick={() => giftEditor.close()} className="absolute inset-0 bg-slate-900/55 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-[10px] uppercase tracking-widest font-bold text-amber-600">{i18nTOf("eg_kicker", "Edit bonus stars")}</div>
            <div className="text-lg font-extrabold text-slate-900">{gift.label || i18nTOf("ks_bonus_fallback", "Bonus")}</div>
            <div className="text-[11px] text-slate-400">{gift.date} · {i18nTOf("eg_currently", "currently {n}⭐").replaceAll("{n}", gift.stars)}</div>
          </div>
          <button onClick={() => giftEditor.close()} className="text-slate-400 p-1.5 -mr-1.5"><X size={20} /></button>
        </div>

        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={i18nTOf("gs_label_ph", "What did they do? e.g. Extra 30 min reading")} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm mb-2" />

        <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">
          {i18nTOf("gs_for_task", "For which task?")} <span className="font-normal text-slate-400 normal-case">{i18nTOf("gs_optional_aside", "(optional)")}</span>
        </label>
        <select value={taskId} onChange={(e) => { setTaskId(e.target.value); }} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm mb-2 bg-white">
          <option value="">{i18nTOf("gs_general_bonus", "— general bonus —")}</option>
          {taskOptions.map((t) => (<option key={t.id} value={t.id}>{i18nTitleOf(t)}</option>))}
        </select>

        {isReading && (
          <>
            <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">
              {i18nTOf("gs_which_book", "Which book?")} <span className="font-normal text-slate-400 normal-case">{i18nTOf("gs_optional_aside", "(optional)")}</span>
            </label>
            {!addingBook ? (
              <>
                <select value={bookId} onChange={(e) => setBookId(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm mb-1.5 bg-white">
                  <option value="">{i18nTOf("gs_pick_book", "— pick a book —")}</option>
                  {bookOptions.map((b) => (<option key={b.id} value={b.id}>{b.title}{b.status && b.status !== "reading" ? ` (${b.status})` : ""}</option>))}
                </select>
                {addBook && (
                  <button type="button" onClick={() => setAddingBook(true)} className="text-[11px] font-bold text-indigo-600 mb-2 flex items-center gap-1">
                    <Plus size={12} /> {i18nTOf("gs_add_new_book", "Add a new book")}
                  </button>
                )}
              </>
            ) : (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-2 mb-2">
                <input value={newBookTitle} onChange={(e) => setNewBookTitle(e.target.value)} placeholder={i18nTOf("gs_book_title_ph", "Book title")} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm mb-1.5 bg-white" />
                <input value={newBookAuthor} onChange={(e) => setNewBookAuthor(e.target.value)} placeholder={i18nTOf("gs_book_author_ph", "Author (optional)")} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm mb-1.5 bg-white" />
                <div className="flex gap-1.5">
                  <button type="button" onClick={() => { setAddingBook(false); setNewBookTitle(""); setNewBookAuthor(""); }} className="flex-1 text-[11px] font-bold bg-slate-200 text-slate-700 rounded-lg py-1.5">{i18nTOf("gs_cancel", "Cancel")}</button>
                  <button type="button" disabled={!newBookTitle.trim()} onClick={saveNewBook} className={`flex-1 text-[11px] font-bold rounded-lg py-1.5 ${newBookTitle.trim() ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-400"}`}>{i18nTOf("gs_add_book", "Add book")}</button>
                </div>
              </div>
            )}
          </>
        )}

        {isDrums && (
          <>
            <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">
              {i18nTOf("gs_which_song", "Which song?")} <span className="font-normal text-slate-400 normal-case">{i18nTOf("gs_optional_aside", "(optional)")}</span>
            </label>
            {!addingSong ? (
              <>
                <select value={songId} onChange={(e) => setSongId(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm mb-1.5 bg-white">
                  <option value="">{i18nTOf("gs_pick_song", "— pick a song —")}</option>
                  {songOptions.map((s) => (<option key={s.id} value={s.id}>{s.canonicalTitle || s.title}{(s.canonicalArtist || s.artist) ? ` — ${s.canonicalArtist || s.artist}` : ""}</option>))}
                </select>
                {addSong && (
                  <button type="button" onClick={() => setAddingSong(true)} className="text-[11px] font-bold text-indigo-600 mb-2 flex items-center gap-1">
                    <Plus size={12} /> {i18nTOf("gs_add_new_song", "Add a new song")}
                  </button>
                )}
              </>
            ) : (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-2 mb-2">
                <input value={newSongTitle} onChange={(e) => setNewSongTitle(e.target.value)} placeholder={i18nTOf("gs_song_title_ph", "Song title")} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm mb-1.5 bg-white" />
                <input value={newSongArtist} onChange={(e) => setNewSongArtist(e.target.value)} placeholder={i18nTOf("gs_song_artist_ph", "Artist (optional)")} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm mb-1.5 bg-white" />
                <div className="flex gap-1.5">
                  <button type="button" onClick={() => { setAddingSong(false); setNewSongTitle(""); setNewSongArtist(""); }} className="flex-1 text-[11px] font-bold bg-slate-200 text-slate-700 rounded-lg py-1.5">{i18nTOf("gs_cancel", "Cancel")}</button>
                  <button type="button" disabled={!newSongTitle.trim()} onClick={saveNewSong} className={`flex-1 text-[11px] font-bold rounded-lg py-1.5 ${newSongTitle.trim() ? "bg-purple-600 text-white" : "bg-slate-200 text-slate-400"}`}>{i18nTOf("gs_add_song", "Add song")}</button>
                </div>
              </div>
            )}
          </>
        )}

        <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">{i18nTOf("gs_stars_label", "Stars")}</label>
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {[3, 5, 10, 15, 20, 30].map((n) => (
            <button key={n} type="button" onClick={() => setStars(n)} className={`px-3 py-1.5 rounded-xl text-sm font-bold ${stars === n ? "bg-amber-400 text-white" : "bg-slate-100 text-slate-500"}`}>{n}⭐</button>
          ))}
          <input type="number" value={stars} onChange={(e) => setStars(Number(e.target.value))} className="w-20 text-sm border border-slate-200 rounded-xl px-2 py-1.5" />
        </div>

        <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">
          {i18nTOf("gs_photo_proof", "Photo proof")} <span className="font-normal text-slate-400 normal-case">{i18nTOf("gs_optional_aside", "(optional)")}</span>
        </label>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePickPhoto} />
        {photo ? (
          <div className="flex items-center gap-2 mb-3 bg-emerald-50 border border-emerald-200 rounded-xl p-2">
            <Camera size={14} className="text-emerald-600 shrink-0" />
            <div className="text-[11px] font-bold text-emerald-700 flex-1 truncate">{photo.name || i18nTOf("gs_photo_attached", "Photo attached")}</div>
            <button onClick={() => setPhoto(null)} className="text-emerald-700 text-[11px] font-bold">{i18nTOf("gs_photo_remove", "Remove")}</button>
          </div>
        ) : (
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className={`w-full mb-3 py-2 rounded-xl border border-dashed text-[12px] font-bold flex items-center justify-center gap-1.5 ${uploading ? "bg-slate-50 text-slate-400 border-slate-200" : "bg-white text-indigo-600 border-indigo-300"}`}>
            {uploading ? i18nTOf("gs_photo_uploading", "Uploading…") : (<><Camera size={13} /> {i18nTOf("gs_photo_add", "Add a photo")}</>)}
          </button>
        )}

        <div className="flex gap-2">
          <button type="button" onClick={onDelete} className="px-3 py-2.5 rounded-xl bg-rose-50 text-rose-700 font-bold text-sm">{i18nTOf("eg_delete", "Delete")}</button>
          <button type="button" onClick={() => giftEditor.close()} className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm">{i18nTOf("gs_cancel", "Cancel")}</button>
          <button type="button" disabled={!label.trim() || uploading} onClick={submit} className={`flex-1 py-2.5 rounded-xl font-bold text-sm text-white ${label.trim() && !uploading ? "bg-amber-500" : "bg-slate-200 text-slate-400"}`}>{i18nTOf("eg_save", "Save")}</button>
        </div>
      </div>
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
    // Kid tap routing — Mike's rule: "Reznor's page, if he clicks
    // a task or activity or chore, he should see the pictures or
    // stats. Let him be proud of what he's done."
    // For approved (or pending) tasks today, open the
    // CompletionDetailSheet (Photos / Notes / Stats hero / Edit).
    // Otherwise drop into the submit sheet so he can still log work.
    // Mirrors KidMissions' behavior so home + missions feel
    // consistent on the kid side.
    const openQuestSheet = (questId) => {
      const t = props.tasks.find((x) => x.id === questId);
      if (!t) return;
      const c = props.compByTask?.[questId];
      const showStats = c?.id && (c.status === "approved" || c.status === "pending");
      if (showStats) {
        props.setOpenCompletionId?.(c.id);
      } else {
        props.setOpenTask(t);
      }
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
        onTapHeroLevel={() => {
          // Replay the cinematic. The auto-detector at line 1137 fires on
          // crossing UP; this is the kid-side "let me see that again"
          // path so Reznor experiences the level-up moment even if the
          // qualifying completion was approved on the parent's screen.
          const lv = props.kidData?.level?.value;
          if (!lv) return;
          juice.burst("success", "levelUp");
          levelUp.show({
            level: lv,
            prevLevel: Math.max(0, lv - 1),
            title: props.kidData?.level?.title || "",
          });
        }}
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
      child={kid.name || "your kid"}
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
      child={kid.name || "your kid"}
      mode={mode}
      done={done}
      onSave={save}
    />
  );
}

// ===================== SHARED UI =====================
function TopBar({ user, mode, onSwitch, onSignOut, sessionEmail, onOpenHub, onOpenSearch }) {
  // Layout-wise this is the first flex-child of the 100dvh shell. No
  // sticky/fixed positioning needed — flex flow keeps it at the top
  // of the viewport and the middle scrolls under it. Kept z-20 only
  // so search/modal overlays inside the middle never paint above the
  // TopBar's border.
  return (
    <div className="relative z-20 flex-shrink-0 bg-white border-b border-slate-100 px-3 py-3 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Avatar user={user} size={36} />
        <div className="min-w-0">
          <div className="text-sm font-bold leading-tight truncate">{user.name}</div>
          <div className="text-[11px] text-slate-400 leading-tight truncate">{user.accessType === "temporary" ? `Guest · until ${fmtShort(user.accessExpires)}` : user.relationship}</div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {onOpenSearch && (
          <button
            onClick={onOpenSearch}
            title="Search"
            aria-label="Search"
            className="w-7 h-7 rounded-full grid place-items-center text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <Search size={14} />
          </button>
        )}
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
function StoredPhoto({ path, url, alt = "", className = "", fallback = null, clickable = true, onClick }) {
  const signed = useSignedUrl(url ? null : path);
  const src = url || signed;
  if (!src) return fallback;
  const handleClick = (e) => {
    if (onClick) { onClick(e); return; }
    if (!clickable) return;
    e.stopPropagation();
    lightbox.open({ src, alt });
  };
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onClick={handleClick}
      style={clickable && !onClick ? { cursor: "zoom-in" } : undefined}
    />
  );
}

// Pull the first photo proof off a completion, if there is one.
// Proof entries can be {type:"photo", path, url, name, ...} or legacy
// {name,...} for non-photo notes — we only want the photo ones.
function firstProofPhoto(c) {
  if (!c || !Array.isArray(c.proof)) return null;
  return c.proof.find((p) => (p?.type === "photo" || p?.path || p?.url) && (p?.path || p?.url)) || null;
}

// ProofThumb: tiny square that shows the completion's first proof
// photo if there is one; otherwise the book cover (for reading rows)
// or song cover (for drum rows); otherwise the activity icon tile.
// Used in every "completion row" surface (today list, Star Ledger,
// per-day breakdown, gift rows). Krissie called this out: a Make-Bed
// row with a photo of the made bed should LOOK like the bed; a
// Reading row should look like the book cover; a Drums row should
// look like the album art. Real visuals make the parent view scannable.
//
// Lookup keys (any can be present on the completion):
//   completion.proof[0] → photo path/url
//   completion.extra.bookId / extra.bookTitle → cover from `books`
//   completion.extra.songId → cover from `songs`
// gifted rows pass `gift` instead of `completion` and we read their
// extra.photoPath / extra.bookId / extra.songId.
// Normalize a string for label/title matching: lowercased, accent-
// stripped, collapsed whitespace. NFD + strip-combining-marks handles
// "Niño" vs "nino", "café" vs "cafe", etc.
function normForMatch(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Short / common words that are NOT meaningful matches on their own.
// "One" inside "in one sitting" was matching Metallica's "One" song
// (whose iTunes cover is the ...And Justice for All album art),
// stomping the actual book cover Mike picked. Same kind of bug
// waiting to happen with "the", "vol", "two", "all", etc. so the
// list covers common short tokens in both English and Spanish.
const FUZZY_STOP_WORDS = new Set([
  "one", "two", "the", "and", "for", "you", "him", "her", "his",
  "she", "all", "are", "was", "but", "not", "yes", "vol", "vol.",
  "ed.", "no.", "uno", "los", "las", "del", "que", "con",
]);

// Score how well a candidate title (book or song) matches a gift label.
// Returns 0 if no useful match — caller filters those out.
//   Direct substring (title-in-label, the strongest signal)  → 100+len
//   Reverse substring (label-in-title, label is short query) →  80+len
//   Shared significant words (5+ chars, both directions)     →  20·count
// 0 otherwise. Higher = better. Helps a 7-volume series pick "Vol 8"
// over "Vol" automatically (longer literal match beats shorter one).
//
// Floor for direct substring matches is 5 chars OR multi-word titles —
// a single 3-letter word title can't reliably match anything. The 5+
// floor + stop word list together prevent the "One" → "...And Justice
// for All" leak Mike hit.
function scoreTitleAgainstLabel(title, label) {
  const t = normForMatch(title);
  const l = normForMatch(label);
  if (!t || !l) return 0;
  const tIsMultiWord = t.includes(" ");
  const tLongEnough = t.length >= 5;
  // Direct substring — require multi-word OR 5+ chars OR not a stop
  // word. Single short common words ("one", "the", "vol") never match.
  if (l.includes(t)) {
    if (!tIsMultiWord && !tLongEnough) return 0;
    if (!tIsMultiWord && FUZZY_STOP_WORDS.has(t)) return 0;
    return 100 + t.length;
  }
  if (t.includes(l) && l.length >= 5 && !FUZZY_STOP_WORDS.has(l)) {
    return 80 + l.length;
  }
  const significantWords = (s) => new Set(
    s.split(/\s+/).filter((w) => w.length >= 5 && !FUZZY_STOP_WORDS.has(w))
  );
  const tw = significantWords(t);
  const lw = significantWords(l);
  if (tw.size === 0 || lw.size === 0) return 0;
  let shared = 0;
  for (const w of tw) if (lw.has(w)) shared++;
  return shared > 0 ? 20 * shared : 0;
}

// Pick the best-matching book for a gift label across canonical and
// raw title fields. Used when the gift has no explicit bookId (parent
// typed the label without using the picker).
function findBookForGiftLabel(label, books) {
  let best = null;
  let bestScore = 0;
  for (const b of (books || [])) {
    const candidates = [b.canonicalTitle, b.title].filter(Boolean);
    for (const t of candidates) {
      const s = scoreTitleAgainstLabel(t, label);
      if (s > bestScore) { bestScore = s; best = b; }
    }
  }
  return bestScore > 0 ? best : null;
}

// Same shape for songs. Same scoring — Mike's rule covers song
// covers identically to book covers.
function findSongForGiftLabel(label, songs) {
  let best = null;
  let bestScore = 0;
  for (const s of (songs || [])) {
    const candidates = [s.canonicalTitle, s.title].filter(Boolean);
    for (const t of candidates) {
      const sc = scoreTitleAgainstLabel(t, label);
      if (sc > bestScore) { bestScore = sc; best = s; }
    }
  }
  return bestScore > 0 ? best : null;
}

function ProofThumb({ completion, gift, activity, task, books = [], songs = [], songPlays = [], size = 36, clickable = true }) {
  // Proof photo (from completion or gift).
  const proofPhoto = firstProofPhoto(completion);
  const giftPhotoPath = gift?.extra?.photoPath || null;
  // Book + song lookups. Try every possible match path: id first, then
  // bookTitle against raw title, then against canonical title — all
  // case-insensitive. Bug Mike hit: when bookId was set but didn't
  // resolve (book got renamed / re-created / id drift), the lookup
  // gave up instead of trying the title fallback. Now bookTitle is
  // always tried as a backup if the id miss happens.
  const meta = completion?.extra || gift?.extra || {};
  // Multi-book reading completions store extra.bookIds[]; the FIRST
  // picked book represents the row visually. Legacy single bookId
  // still works as a fallback for completions saved before multi-book.
  const bookId = (Array.isArray(meta.bookIds) && meta.bookIds[0]) || meta.bookId;
  const bookTitle = meta.bookTitle;
  let book = null;
  if (bookId) book = books.find((b) => b.id === bookId);
  if (!book && bookTitle) {
    const bt = bookTitle.toLowerCase();
    book = books.find((b) =>
      (b.title || "").toLowerCase() === bt
      || (b.canonicalTitle || "").toLowerCase() === bt
    );
  }
  // Label fuzzy fallback — ONLY runs when the gift has no explicit
  // book/song id from the picker. If the user picked something, we
  // trust their choice and never fall back to fuzzy. This prevents
  // the bug Mike hit where picking "Los Tipos Malos Vol 8" was
  // getting clobbered by fuzzy-matching "one" in the label to
  // Metallica's "One" song.
  const userPickedBook = !!meta.bookId;
  const userPickedSong = !!meta.songId;
  if (!book && !userPickedBook && gift?.label && Array.isArray(books)) {
    book = findBookForGiftLabel(gift.label, books);
  }
  let labelSong = null;
  if (!userPickedSong && gift?.label && Array.isArray(songs)) {
    labelSong = findSongForGiftLabel(gift.label, songs);
  }
  // Activity-aware preference. The completion knows what kind of task
  // it is via task.activityType / task.proofType. Reading + Drums each
  // have a more meaningful "what was done" image than a generic proof
  // photo — the book the kid read, the song he practiced. Use that as
  // the FIRST choice when available.
  const at = (task?.activityType || "").toLowerCase();
  const pt = (task?.proofType || "").toLowerCase();
  const isReading = pt === "reading" || /read|book/.test(at);
  const isDrums = pt === "drums" || /drum/.test(at);
  // For drums: pull the FIRST song play that matches the completion's
  // date. We use sorted-by-id (timestamped) ascending so "first played"
  // wins. Falls back to extra.songId, then to extra.songTitle if the
  // id ever fails to resolve (same belt+suspenders as the book path).
  let song = null;
  if (meta.songId) song = songs.find((s) => s.id === meta.songId);
  if (!song && meta.songTitle) {
    const st = meta.songTitle.toLowerCase();
    song = songs.find((s) =>
      (s.title || "").toLowerCase() === st
      || (s.canonicalTitle || "").toLowerCase() === st
    );
  }
  if (!song && isDrums && completion?.completionDate && Array.isArray(songPlays)) {
    const todayPlays = songPlays
      .filter((p) => p.playedOn === completion.completionDate)
      .sort((a, b) => (a.id || "").localeCompare(b.id || ""));
    const firstPlay = todayPlays[0];
    if (firstPlay) song = songs.find((s) => s.id === firstPlay.songId);
  }
  // Promote label-matched song to the resolved song when nothing else
  // got us one. Gift labels like "Mastered Master of Puppets" surface
  // the album art even without an explicit songId pick.
  if (!song && labelSong) song = labelSong;
  // Custom uploads (storage paths). One useSignedUrl per slot — hooks
  // must be called unconditionally in stable order.
  const proofSigned = useSignedUrl(proofPhoto && !proofPhoto.url ? proofPhoto.path : null);
  const giftSigned = useSignedUrl(giftPhotoPath);
  const bookCustomSigned = useSignedUrl(book?.customCoverPath || null);
  const songCustomSigned = useSignedUrl(song?.customCoverPath || null);
  const bookCoverSrc = bookCustomSigned || book?.coverUrl || null;
  const songCoverSrc = songCustomSigned || song?.coverUrl || null;
  const proofSrc = proofPhoto && (proofPhoto.url || proofSigned);
  // Resolution order:
  //   Reading task → book cover preferred (the book IS what was read).
  //                  Falls back to proof photo, then gift photo. NEVER
  //                  falls back to a song cover — a Spanish reading
  //                  bonus must not surface Metallica album art just
  //                  because the label happened to contain a common
  //                  short English word.
  //   Drums task   → song cover preferred. Same cross-domain rule —
  //                  never falls back to a book cover.
  //   Otherwise    → proof photo, then gift photo, then book cover,
  //                  then song cover, then null.
  // Mike's rule: a real cover or photo means "done"; the activity icon
  // means "not done yet or you forgot to attach proof — fix this."
  let src = null;
  if (isReading) {
    src = bookCoverSrc || proofSrc || giftSigned;
  } else if (isDrums) {
    src = songCoverSrc || proofSrc || giftSigned;
  } else {
    src = proofSrc || giftSigned || bookCoverSrc || songCoverSrc;
  }
  const cls = "rounded-2xl shrink-0 object-cover bg-slate-100";
  const style = { width: size, height: size, ...(clickable && src ? { cursor: "zoom-in" } : {}) };
  if (src) {
    return (
      <img
        src={src}
        alt=""
        loading="lazy"
        className={cls}
        style={style}
        onClick={clickable ? (e) => { e.stopPropagation(); lightbox.open({ src }); } : undefined}
        onError={(e) => { e.currentTarget.style.display = "none"; }}
      />
    );
  }
  return (
    <div
      className="rounded-2xl grid place-items-center shrink-0"
      style={{ ...style, background: (activity?.color || "#94a3b8") + "22", color: activity?.color || "#475569" }}
    >
      <TaskIcon type={task?.activityType} color={activity?.color || "#475569"} />
    </div>
  );
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
            Family Command Center
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
          Pick a profile to use. Sign out when you're done sharing the device.
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
function KidMissions({ todaysTasks, todaysTopEight, compByTask, setOpenTask, setOpenCompletionId, availableToday, earnedToday, pendingStars, starBank, mode, priorities, user, users, activities, streaks, subProgress, toggleSub, undoTask, dailyCheckins = [], setMoodCheckin }) {
  // Read from the parent-curated Top 8 so the kid's missions tab,
  // home quests, and the board all show the same list. Fall back to
  // the broader todaysTasks only if Top 8 is somehow empty.
  const sourceList = (todaysTopEight && todaysTopEight.length > 0) ? todaysTopEight : todaysTasks;
  const done = sourceList.filter((t) => compByTask[t.id]?.status === "approved").length;
  const ordered = sortByLevel(sourceList, mode, priorities);
  return (
    <div className="px-4 pt-4">
      <div className="rounded-3xl p-5 text-white relative overflow-hidden" style={{ background: "linear-gradient(135deg,#f59e0b,#ef4444)" }}>
        <Sparkles className="absolute -right-3 -top-3 opacity-20" size={90} />
        <div className="text-sm font-semibold opacity-90">Hey {user?.name || "there"}! 🚀</div>
        <div className="text-2xl font-extrabold mt-1">Today's Missions</div>
        <div className="flex gap-2 mt-4">
          <KidStat label="Earned" value={earnedToday} icon={<Star size={14} className="fill-current" />} />
          <KidStat label="Pending" value={pendingStars} icon={<Clock size={14} />} />
          <KidStat label="Can earn" value={availableToday} icon={<Trophy size={14} />} />
        </div>
        <div className="mt-4 bg-white/20 rounded-full h-3 overflow-hidden">
          <div className="h-full bg-white rounded-full transition-all" style={{ width: `${sourceList.length ? (done / sourceList.length) * 100 : 0}%` }} />
        </div>
        <div className="text-[11px] mt-1 opacity-90">{done} of {sourceList.length} missions complete</div>
      </div>

      <div className="mt-3"><PiggyBank stars={starBank} kidName={user?.name} /></div>

      {/* Daily mood check-in. One tap; today's pick stays highlighted. */}
      {user?.id && setMoodCheckin && (() => {
        const todayIso = new Date().toISOString().slice(0, 10);
        const todayCheckin = dailyCheckins.find((c) => c.profileId === user.id && c.date === todayIso);
        const moods = [
          { v: "happy", emoji: "😊", label: "Good day" },
          { v: "ok",    emoji: "😐", label: "Just okay" },
          { v: "off",   emoji: "😞", label: "Off day" },
        ];
        return (
          <Card className="p-3 mt-3 bg-gradient-to-br from-sky-50 to-violet-50 border-sky-100">
            <div className="text-[11px] uppercase tracking-wider font-bold text-slate-500 mb-2">How are you today?</div>
            <div className="flex gap-2">
              {moods.map((m) => (
                <button
                  key={m.v}
                  type="button"
                  onClick={() => setMoodCheckin(user.id, m.v)}
                  className={`flex-1 py-3 rounded-2xl flex flex-col items-center gap-0.5 transition active:scale-95 ${todayCheckin?.mood === m.v ? "bg-white ring-2 ring-sky-400 shadow" : "bg-white/70"}`}
                >
                  <span className="text-2xl leading-none">{m.emoji}</span>
                  <span className="text-[10px] font-bold text-slate-600">{m.label}</span>
                </button>
              ))}
            </div>
            {todayCheckin && (
              <div className="text-[10px] text-center text-slate-400 mt-1.5">Saved — your parents can see this.</div>
            )}
          </Card>
        );
      })()}

      <StreakStrip streaks={streaks} activities={activities} />

      <SectionTitle icon={<Trophy size={16} className="text-rose-500" />}>{i18nTOf("sec_today_missions", "Today's missions")} <span className="text-[11px] font-normal text-slate-400">· {i18nTOf("hint_most_important_first", "most important first")}</span></SectionTitle>
      {ordered.map((t) => {
        const c = compByTask[t.id];
        // Approved task → tap opens the CompletionDetailSheet (photos
        // / notes / stats / edit) instead of the submit sheet. Pending
        // / not-started keep the old submit-sheet behavior.
        const isApproved = c?.status === "approved";
        const onOpen = isApproved && c?.id
          ? () => setOpenCompletionId(c.id)
          : () => setOpenTask(t);
        /* Kids never delete (per memory rule). undoTask is intentionally
            NOT passed — the "Oops — undo this" affordance hides for kids
            so a mis-tap can't retract a real submission. Parent undoes
            via the Approvals tab if it was a mistake. */
        return <MissionCard key={t.id} task={t} comp={c} onOpen={onOpen} mode={mode} priorities={priorities} users={users} activities={activities} streaks={streaks} subProgress={subProgress} toggleSub={toggleSub} />;
      })}

      {/* Extra-credit / bonus stars at the bottom — anything on today's
          full task list that wasn't in the Top 8. Mike: "Reznor should
          see what he can do as well." Sums the star value so the kid
          sees how many extra stars are within reach. */}
      {(() => {
        const topIds = new Set((todaysTopEight || []).map((t) => t.id));
        const extras = (todaysTasks || [])
          .filter((t) => !topIds.has(t.id))
          .filter((t) => {
            const c = compByTask[t.id];
            return !c || ["not_started", "needs_fix", "draft"].includes(c?.status);
          });
        if (extras.length === 0) return null;
        const orderedExtras = sortByLevel(extras, mode, priorities);
        const totalExtra = orderedExtras.reduce((s, t) => s + (Number(t.starValue) || 0), 0);
        return (
          <>
            <SectionTitle
              icon={<Sparkles size={16} className="text-amber-500" />}
              right={<span className="text-[11px] font-bold text-amber-600">+{totalExtra}⭐ up for grabs</span>}
            >
              Extra credit ⭐ <span className="text-[11px] font-normal text-slate-400">· not required</span>
            </SectionTitle>
            {orderedExtras.map((t) => {
              const c = compByTask[t.id];
              const isApproved = c?.status === "approved";
              const onOpen = isApproved && c?.id
                ? () => setOpenCompletionId(c.id)
                : () => setOpenTask(t);
              /* Kids never delete (per memory rule). undoTask is intentionally
            NOT passed — the "Oops — undo this" affordance hides for kids
            so a mis-tap can't retract a real submission. Parent undoes
            via the Approvals tab if it was a mistake. */
        return <MissionCard key={t.id} task={t} comp={c} onOpen={onOpen} mode={mode} priorities={priorities} users={users} activities={activities} streaks={streaks} subProgress={subProgress} toggleSub={toggleSub} />;
            })}
          </>
        );
      })()}
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
              <div className="font-bold text-sm flex items-center gap-2 flex-wrap">{i18nTitleOf(task)}{doneish && <Check size={14} className="text-emerald-500" />}</div>
              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: d.color + "22", color: d.color }}>{d.label}</span>
                <span className="text-[11px] text-slate-400">{subs ? `${subDone}/${subs.length} parts` : `${task.minutes} min${task.proofRequired ? " · proof" : ""}`}</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap mt-1">
                <PriorityBadge level={lvl} scope={ov?.scope} />
                {st && <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600">🔥 {st.current}</span>}
                {submitted && <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${m.color}`}>{STATUS_LABEL(status)}</span>}
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
  role,
  removeGift,
  songs,
  songPlays,
  albumPhotos,
  books,
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

  const KID = kidName(users);
  // Interpolate the kid's name into the localized subtitle string —
  // i18n keeps {kid} as the placeholder so any future translation
  // shipped in i18n.js can decide where the name slots in (e.g. for
  // Spanish word order). Falls back to the raw English template
  // if no translation has been added yet.
  const fmtSubt = (key, fallback) => i18nTOf(key, fallback).replaceAll("{kid}", KID);
  const TITLES = {
    earned: { title: i18nTOf("stat_meta_earned_title", "Earned today"), subtitle: fmtSubt("stat_meta_earned_sub", "Every star {kid} banked since midnight.") },
    pending: { title: i18nTOf("stat_meta_pending_title", "Pending approval (today)"), subtitle: i18nTOf("stat_meta_pending_sub", "Today's submissions waiting on a grown-up.") },
    bank: { title: i18nTOf("stat_meta_bank_title", "Total star bank"), subtitle: i18nTOf("stat_meta_bank_sub", "What's in the piggy right now, and where it came from.") },
    available: { title: i18nTOf("stat_meta_available_title", "Stars available today"), subtitle: fmtSubt("stat_meta_available_sub", "Every star {kid} could earn if everything on today's list got done.") },
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
            <div className="text-sm font-bold text-slate-800 truncate">{i18nTitleOf(t) || taskId}</div>
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
        <ProofThumb completion={c} activity={a} task={t} books={books} songs={songs} songPlays={songPlays} size={36} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-slate-800 truncate">{i18nTitleOf(t) || c.taskId}</div>
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
    // Bonus gifts are part of "earned today" now — the headline number
    // includes them, so the detail list MUST list them too. Hiding a
    // contributor here would put the number out of sync with what the
    // parent can see, which is exactly the kind of hidden math that
    // erodes trust.
    const giftedTodayList = (gifted || []).filter((g) => g.date === TODAY_ISO);
    const giftedTodaySum = giftedTodayList.reduce((s, g) => s + (Number(g.stars) || 0), 0);
    const totalRowCount = todaysApproved.length + giftedTodayList.length;
    body = (
      <>
        <div className="bg-emerald-50 rounded-2xl p-4 mb-3 text-center">
          <div className="text-4xl font-extrabold text-emerald-700">{earnedToday}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {i18nTOf("stat_subt_earned", "stars earned today across")} {totalRowCount} {totalRowCount === 1 ? i18nTOf("stat_subt_thing", "thing") : i18nTOf("stat_subt_things", "things")}
          </div>
          {giftedTodaySum > 0 && (
            <div className="text-[10px] text-emerald-700/80 mt-1 font-bold">
              {i18nTOf("stat_subt_bonus_includes", "includes")} {giftedTodaySum}⭐ {i18nTOf("stat_subt_in_bonus_gifts", "in bonus gifts")}
            </div>
          )}
        </div>
        {totalRowCount === 0
          ? <Card className="p-4 text-center text-sm text-slate-400">{i18nTOf("stat_subt_nothing_earned", "Nothing earned yet today. 💤")}</Card>
          : (
            <Card className="p-2">
              {todaysApproved.map((c) => <TodayLine key={c.id} c={c} />)}
              {giftedTodayList.map((g) => {
                const gTask = g.extra?.taskId ? (tasks || []).find((t) => t.id === g.extra.taskId) : null;
                const gAct = g.extra?.activityId
                  ? (activities || []).find((a) => a.id === g.extra.activityId)
                  : (gTask
                      ? (activities || []).find((a) => a.id === (gTask.activityId
                          || gTask.activityType?.toLowerCase().replace(/\s/g, "_")))
                      : null);
                const giver = (users || []).find((u) => u.id === g.by)?.name || "—";
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => giftEditor.open(g)}
                    className="w-full flex items-center gap-2 py-2 border-b border-slate-100 last:border-0 text-left active:scale-[0.99] transition"
                    title="Tap to edit this bonus"
                  >
                    <ProofThumb gift={g} activity={gAct} task={gTask} books={books} songs={songs} songPlays={songPlays} size={36} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-slate-800 truncate flex items-center gap-1">
                        <Sparkles size={12} className="text-amber-500 shrink-0" />
                        {g.label || "Bonus"}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        bonus stars · from {giver}{gTask?.title ? ` · ${gTask.title}` : ""} · tap to edit
                      </div>
                    </div>
                    <StarPill n={Number(g.stars) || 0} tone="emerald" />
                  </button>
                );
              })}
            </Card>
          )}
      </>
    );
  } else if (kind === "pending") {
    body = (
      <>
        <div className="bg-amber-50 rounded-2xl p-4 mb-3 text-center">
          <div className="text-4xl font-extrabold text-amber-700">{pendingStars}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">{i18nTOf("stat_subt_pending", "stars sitting in today's pending —")} {todaysPending.length} {todaysPending.length === 1 ? i18nTOf("stat_subt_task", "task") : i18nTOf("stat_subt_tasks", "tasks")} {i18nTOf("stat_subt_waiting_on_you", "waiting on you")}</div>
        </div>
        {todaysPending.length === 0
          ? <Card className="p-4 text-center text-sm text-slate-400">{i18nTOf("stat_subt_nothing_waiting", "Nothing waiting today. 🎉")}</Card>
          : <Card className="p-2">{todaysPending.map((c) => <TodayLine key={c.id} c={c} />)}</Card>}
        <p className="text-[11px] text-slate-400 px-1 mt-2">{i18nTOf("stat_subt_older_pending", "Older un-approved submissions live in the Approvals tab.")}</p>
      </>
    );
  } else if (kind === "bank") {
    const lineCls = "flex items-center justify-between py-2 border-b border-slate-100 last:border-0";
    body = (
      <>
        <div className="bg-violet-50 rounded-2xl p-4 mb-3 text-center">
          <div className="text-4xl font-extrabold text-violet-700">{starBank}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">{i18nTOf("stat_subt_in_bank", "stars in the bank right now")}</div>
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

        {/* Star ledger — every individual line item that contributed
            to the bank, newest first. Earned stars (approved completions)
            stay read-only here; tap-to-edit lives in CompletionDetailSheet.
            Gifts are parent-deletable (the 'Krissie double-gifted' use
            case). Redemptions are read-only — those are decisions
            made through the rewards flow. */}
        <StarLedger
          completions={completions}
          tasks={tasks}
          gifted={gifted}
          redemptions={redemptions}
          users={users}
          base={base}
          isParent={role === "parent"}
          onRemoveGift={removeGift}
          songs={songs}
          songPlays={songPlays}
          albumPhotos={albumPhotos}
          books={books}
          activities={activities}
        />
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
                  <div className="text-sm font-bold text-slate-800 truncate">{i18nTitleOf(t)}</div>
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

// StarLedger — every line item that contributed to the bank, sorted
// newest-first. Earned (approved completion) + Gifted + Redeemed +
// Base. Gifts get a small × so a parent can delete a duplicate
// without leaving the sheet. Mirrors the Portfolio fix's per-row
// honest-date treatment.
//
// Tapping any row drills into DayBreakdown — the per-day audit view
// showing every completion, gift, redemption, song, photo, and book
// activity for that ISO date. Answers "what actually happened on
// June 9?" without leaving the bank sheet.
function StarLedger({
  completions, tasks, gifted, redemptions, users, base, isParent, onRemoveGift,
  songs, songPlays, albumPhotos, books, activities,
}) {
  const [selectedDay, setSelectedDay] = useState(null);
  const fmtRowDate = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso + "T12:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };
  const items = [];
  for (const c of (completions || [])) {
    if (c.status !== "approved" || !c.awardedStars) continue;
    const t = (tasks || []).find((x) => x.id === c.taskId);
    const a = (activities || []).find((x) => x.id === (t?.activityId || t?.activityType?.toLowerCase().replace(/\s/g, "_")));
    items.push({
      key: `c-${c.id}`,
      kind: "earned",
      date: c.completionDate || "",
      label: t?.title || c.taskId,
      sub: c.extra?.bookTitle ? c.extra.bookTitle : "",
      stars: c.awardedStars,
      who: users.find((u) => u.id === c.approvedBy)?.name || "",
      completion: c,
      task: t,
      activity: a,
    });
  }
  for (const g of (gifted || [])) {
    // Pull the task/activity context out of extra so the row can
    // show a real subtitle and ProofThumb can resolve a thumbnail.
    const gTask = g.extra?.taskId ? (tasks || []).find((x) => x.id === g.extra.taskId) : null;
    const gActivity = g.extra?.activityId
      ? (activities || []).find((x) => x.id === g.extra.activityId)
      : (gTask
          ? (activities || []).find((x) => x.id === (gTask.activityId
              || gTask.activityType?.toLowerCase().replace(/\s/g, "_")))
          : null);
    items.push({
      key: `g-${g.id}`,
      id: g.id,
      kind: "gift",
      date: g.date || "",
      label: g.label || "Bonus",
      sub: gTask?.title ? gTask.title : "bonus",
      stars: Number(g.stars) || 0,
      who: users.find((u) => u.id === g.by)?.name || "",
      deletable: true,
      gift: g,
      task: gTask,
      activity: gActivity,
    });
  }
  for (const r of (redemptions || [])) {
    if (r.status !== "approved") continue;
    items.push({
      key: `r-${r.id}`,
      kind: "redeemed",
      date: r.completionDate || "",
      label: r.title || "Reward",
      sub: "redeemed",
      stars: -Math.abs(r.cost || 0),
      who: users.find((u) => u.id === r.requestedBy)?.name || "",
    });
  }
  items.sort((a, b) => {
    if (a.date !== b.date) return (b.date || "").localeCompare(a.date || "");
    return b.key.localeCompare(a.key);
  });

  if (selectedDay) {
    return (
      <DayBreakdown
        iso={selectedDay}
        onBack={() => setSelectedDay(null)}
        completions={completions}
        tasks={tasks}
        activities={activities}
        gifted={gifted}
        redemptions={redemptions}
        users={users}
        songs={songs}
        songPlays={songPlays}
        albumPhotos={albumPhotos}
        books={books}
        isParent={isParent}
        onRemoveGift={onRemoveGift}
      />
    );
  }

  return (
    <div className="mt-4">
      <div className="flex items-baseline justify-between mb-2 px-1">
        <div className="text-sm font-extrabold text-slate-700">Star ledger</div>
        <div className="text-[10px] text-slate-400">{items.length} {items.length === 1 ? "entry" : "entries"} · base {base}⭐ before this list</div>
      </div>
      {items.length === 0 ? (
        <Card className="p-3 text-center text-xs text-slate-400">No activity yet.</Card>
      ) : (
        <Card className="p-2">
          {items.map((row) => {
            const color =
              row.kind === "earned" ? "text-emerald-700"
              : row.kind === "gift" ? "text-pink-700"
              : "text-rose-700";
            const bg =
              row.kind === "earned" ? "bg-emerald-50"
              : row.kind === "gift" ? "bg-pink-50"
              : "bg-rose-50";
            const icon =
              row.kind === "earned" ? "⭐"
              : row.kind === "gift" ? "✨"
              : "🎁";
            return (
              <div key={row.key} className="flex items-center gap-2 py-1.5 border-b border-slate-100 last:border-0">
                <button
                  type="button"
                  onClick={() => {
                    // Gifts: tap to edit (per Mike's edit-everywhere
                    // rule). Earned + redeemed rows: tap drills into
                    // the per-day breakdown.
                    if (row.kind === "gift" && row.gift && isParent) giftEditor.open(row.gift);
                    else if (row.date) setSelectedDay(row.date);
                  }}
                  className="flex-1 flex items-center gap-2 min-w-0 text-left active:scale-[0.99] transition"
                  title={row.kind === "gift" && isParent ? "Tap to edit this bonus" : (row.date ? "See everything that happened this day" : "")}
                >
                  {(row.kind === "earned" && row.completion) || (row.kind === "gift" && row.gift) ? (
                    <ProofThumb
                      completion={row.completion}
                      gift={row.gift}
                      activity={row.activity}
                      task={row.task}
                      books={books}
                      songs={songs}
                      songPlays={songPlays}
                      size={28}
                    />
                  ) : (
                    <div className={`w-7 h-7 rounded-lg grid place-items-center shrink-0 ${bg}`}>
                      <span className="text-sm">{icon}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-bold text-slate-800 truncate">
                      {row.label}
                      {row.sub && <span className="text-slate-400 font-normal"> · {row.sub}</span>}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {fmtRowDate(row.date)}
                      {row.who ? ` · ${row.who}` : ""}
                    </div>
                  </div>
                  <div className={`text-sm font-extrabold tabular-nums shrink-0 ${color}`}>
                    {row.stars > 0 ? "+" : ""}{row.stars}⭐
                  </div>
                </button>
                {row.deletable && isParent && onRemoveGift && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Delete this gift?\n\n"${row.label}" (+${row.stars}⭐)\n\nThe star bank will drop by ${row.stars} stars.`)) {
                        onRemoveGift(row.id);
                      }
                    }}
                    className="text-slate-300 hover:text-rose-500 p-1 shrink-0"
                    aria-label="Delete gift"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}

// DayBreakdown — everything that happened on a single ISO date.
// Reached by tapping a row in the Star Ledger. Per the user's
// "honest data audit" theme: nothing derived, nothing fudged — each
// section pulls straight from its source table filtered by date.
//
// Sections (in order of "is it stars-related?"):
//   1. Stars summary — net for the day
//   2. Completions — approved + pending, with task title + actor
//   3. Gifts — same parent-only delete UX as the ledger
//   4. Redemptions
//   5. Songs played — title + canonical + notes
//   6. Photos uploaded — count + previewed in PhotoGallery
//   7. Books — started / finished that day
function DayBreakdown({
  iso, onBack,
  completions, tasks, activities, gifted, redemptions, users,
  songs, songPlays, albumPhotos, books,
  isParent, onRemoveGift,
}) {
  const dayDate = new Date(iso + "T12:00");
  const dayLabel = dayDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  const dayCompletions = (completions || []).filter((c) => c.completionDate === iso);
  const dayApproved = dayCompletions.filter((c) => c.status === "approved");
  const dayPending = dayCompletions.filter((c) => c.status === "pending");
  const dayGifts = (gifted || []).filter((g) => g.date === iso);
  const dayRedemptions = (redemptions || []).filter((r) => r.completionDate === iso && r.status === "approved");
  const daySongs = (songPlays || []).filter((p) => p.playedOn === iso);
  const dayPhotos = (albumPhotos || []).filter((p) => (p.takenAt || (p.createdAt || "").slice(0, 10)) === iso);
  const dayBooksFinished = (books || []).filter((b) => b.finished === iso);
  const dayBooksStarted = (books || []).filter((b) => b.started === iso && b.finished !== iso);

  const earnedNet = dayApproved.reduce((s, c) => s + (c.awardedStars || 0), 0);
  const giftedNet = dayGifts.reduce((s, g) => s + (Number(g.stars) || 0), 0);
  const redeemedNet = dayRedemptions.reduce((s, r) => s + (r.cost || 0), 0);
  const net = earnedNet + giftedNet - redeemedNet;

  const taskTitle = (id) => (tasks || []).find((t) => t.id === id)?.title || id;
  const taskById = (id) => (tasks || []).find((t) => t.id === id);
  const actByTask = (t) => (activities || []).find((a) => a.id === (t?.activityId || t?.activityType?.toLowerCase().replace(/\s/g, "_")));
  const userName = (id) => (users || []).find((u) => u.id === id)?.name || "";
  const songName = (id) => {
    const s = (songs || []).find((x) => x.id === id);
    if (!s) return "(deleted song)";
    return s.canonicalTitle || s.title || "(unknown)";
  };
  const songArtist = (id) => {
    const s = (songs || []).find((x) => x.id === id);
    return s ? (s.canonicalArtist || s.artist || "") : "";
  };

  const Section = ({ title, count, accent, children }) => (
    <div className="mt-3">
      <div className="flex items-baseline justify-between px-1 mb-1">
        <div className={`text-[11px] font-extrabold uppercase tracking-wider ${accent}`}>{title}</div>
        <div className="text-[10px] text-slate-400 tabular-nums">{count}</div>
      </div>
      {children}
    </div>
  );

  const isEmpty = !dayApproved.length && !dayPending.length && !dayGifts.length && !dayRedemptions.length
    && !daySongs.length && !dayPhotos.length && !dayBooksFinished.length && !dayBooksStarted.length;

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-[12px] font-bold text-violet-700 mb-2 px-1 active:opacity-70"
      >
        <ChevronLeft size={14} /> Back to ledger
      </button>

      <div className="bg-gradient-to-br from-violet-50 to-indigo-50 rounded-2xl p-4 mb-2 text-center border border-violet-100">
        <div className="text-[11px] font-bold text-violet-700 uppercase tracking-wider">{dayLabel}</div>
        <div className={`text-3xl font-extrabold mt-1 tabular-nums ${net >= 0 ? "text-violet-700" : "text-rose-700"}`}>
          {net > 0 ? "+" : ""}{net}⭐
        </div>
        <div className="text-[10px] text-slate-500 mt-0.5">net stars this day</div>
      </div>

      {isEmpty ? (
        <Card className="p-4 text-center text-xs text-slate-400">
          Nothing logged on this day.
        </Card>
      ) : (
        <>
          {dayApproved.length > 0 && (
            <Section title={`Earned · +${earnedNet}⭐`} count={dayApproved.length} accent="text-emerald-700">
              <Card className="p-2">
                {dayApproved.map((c) => {
                  const t = taskById(c.taskId);
                  const a = actByTask(t);
                  return (
                    <div key={c.id} className="flex items-center gap-2 py-1.5 border-b border-slate-100 last:border-0">
                      <ProofThumb completion={c} activity={a} task={t} books={books} songs={songs} songPlays={songPlays} size={28} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-bold text-slate-800 truncate">{taskTitle(c.taskId)}</div>
                        <div className="text-[10px] text-slate-400">approved by {userName(c.approvedBy) || "—"}</div>
                      </div>
                      <div className="text-sm font-extrabold text-emerald-700 tabular-nums shrink-0">+{c.awardedStars}⭐</div>
                    </div>
                  );
                })}
              </Card>
            </Section>
          )}
          {dayPending.length > 0 && (
            <Section title="Pending approval" count={dayPending.length} accent="text-amber-700">
              <Card className="p-2">
                {dayPending.map((c) => {
                  const t = taskById(c.taskId);
                  const a = actByTask(t);
                  return (
                    <div key={c.id} className="flex items-center gap-2 py-1.5 border-b border-slate-100 last:border-0">
                      <ProofThumb completion={c} activity={a} task={t} books={books} songs={songs} songPlays={songPlays} size={28} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-bold text-slate-800 truncate">{taskTitle(c.taskId)}</div>
                        <div className="text-[10px] text-slate-400">submitted by {userName(c.submittedBy) || "—"}</div>
                      </div>
                      <div className="text-[10px] font-bold text-amber-700 shrink-0">awaiting</div>
                    </div>
                  );
                })}
              </Card>
            </Section>
          )}
          {dayGifts.length > 0 && (
            <Section title={`Gifted · +${giftedNet}⭐`} count={dayGifts.length} accent="text-pink-700">
              <Card className="p-2">
                {dayGifts.map((g) => {
                  const gTask = g.extra?.taskId ? taskById(g.extra.taskId) : null;
                  const gActivity = g.extra?.activityId
                    ? (activities || []).find((a) => a.id === g.extra.activityId)
                    : actByTask(gTask);
                  return (
                    <div key={g.id} className="flex items-center gap-2 py-1.5 border-b border-slate-100 last:border-0">
                      <button
                        type="button"
                        onClick={() => isParent && giftEditor.open(g)}
                        className="flex-1 flex items-center gap-2 min-w-0 text-left"
                        title={isParent ? "Tap to edit this bonus" : ""}
                      >
                        <ProofThumb gift={g} activity={gActivity} task={gTask} books={books} songs={songs} size={28} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-bold text-slate-800 truncate">{g.label || "Bonus"}</div>
                          <div className="text-[10px] text-slate-400 truncate">
                            from {userName(g.by) || "—"}
                            {gTask?.title ? ` · ${gTask.title}` : ""}
                            {isParent ? " · tap to edit" : ""}
                          </div>
                        </div>
                      </button>
                      <div className="text-sm font-extrabold text-pink-700 tabular-nums shrink-0">+{Number(g.stars) || 0}⭐</div>
                      {isParent && onRemoveGift && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete this gift?\n\n"${g.label || "Bonus"}" (+${g.stars}⭐)\n\nThe star bank will drop by ${g.stars} stars.`)) {
                              onRemoveGift(g.id);
                            }
                          }}
                          className="text-slate-300 hover:text-rose-500 p-1 shrink-0"
                          aria-label="Delete gift"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </Card>
            </Section>
          )}
          {dayRedemptions.length > 0 && (
            <Section title={`Redeemed · −${redeemedNet}⭐`} count={dayRedemptions.length} accent="text-rose-700">
              <Card className="p-2">
                {dayRedemptions.map((r) => (
                  <div key={r.id} className="flex items-center gap-2 py-1.5 border-b border-slate-100 last:border-0">
                    <div className="w-7 h-7 rounded-lg bg-rose-50 grid place-items-center shrink-0 text-sm">🎁</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-bold text-slate-800 truncate">{r.title || "Reward"}</div>
                      <div className="text-[10px] text-slate-400">for {userName(r.requestedBy) || "—"}</div>
                    </div>
                    <div className="text-sm font-extrabold text-rose-700 tabular-nums shrink-0">−{r.cost || 0}⭐</div>
                  </div>
                ))}
              </Card>
            </Section>
          )}
          {daySongs.length > 0 && (
            <Section title="Songs played" count={daySongs.length} accent="text-purple-700">
              <Card className="p-2">
                {daySongs.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 py-1.5 border-b border-slate-100 last:border-0">
                    <div className="w-7 h-7 rounded-lg bg-purple-50 grid place-items-center shrink-0">
                      <Music size={13} className="text-purple-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-bold text-slate-800 truncate">{songName(p.songId)}</div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {songArtist(p.songId)}
                        {p.notes ? `${songArtist(p.songId) ? " · " : ""}${p.notes}` : ""}
                      </div>
                    </div>
                  </div>
                ))}
              </Card>
            </Section>
          )}
          {dayPhotos.length > 0 && (
            <Section title="Photos uploaded" count={dayPhotos.length} accent="text-cyan-700">
              <Card className="p-2">
                {dayPhotos.slice(0, 6).map((p, i) => (
                  <div key={p.id || i} className="flex items-center gap-2 py-1.5 border-b border-slate-100 last:border-0">
                    <div className="w-7 h-7 rounded-lg bg-cyan-50 grid place-items-center shrink-0">
                      <Camera size={13} className="text-cyan-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-bold text-slate-800 truncate">
                        {p.caption || <span className="font-normal text-slate-400">(no caption)</span>}
                      </div>
                    </div>
                  </div>
                ))}
                {dayPhotos.length > 6 && (
                  <div className="text-[10px] text-slate-400 text-center pt-1.5">
                    + {dayPhotos.length - 6} more
                  </div>
                )}
              </Card>
            </Section>
          )}
          {(dayBooksFinished.length + dayBooksStarted.length) > 0 && (
            <Section title="Books" count={dayBooksFinished.length + dayBooksStarted.length} accent="text-indigo-700">
              <Card className="p-2">
                {dayBooksFinished.map((b) => (
                  <div key={`f-${b.id}`} className="flex items-center gap-2 py-1.5 border-b border-slate-100 last:border-0">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 grid place-items-center shrink-0">
                      <BookOpen size={13} className="text-indigo-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-bold text-slate-800 truncate">{b.title}</div>
                      <div className="text-[10px] text-slate-400 truncate">finished · {b.author || "unknown author"}</div>
                    </div>
                  </div>
                ))}
                {dayBooksStarted.map((b) => (
                  <div key={`s-${b.id}`} className="flex items-center gap-2 py-1.5 border-b border-slate-100 last:border-0">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 grid place-items-center shrink-0">
                      <BookOpen size={13} className="text-indigo-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-bold text-slate-800 truncate">{b.title}</div>
                      <div className="text-[10px] text-slate-400 truncate">started · {b.author || "unknown author"}</div>
                    </div>
                  </div>
                ))}
              </Card>
            </Section>
          )}
        </>
      )}
    </div>
  );
}

// Split out so we can call hooks (useBottomSheet) without violating
// the rules-of-hooks early-return pattern in the parent function.
function StatDetailSheet({ onClose, meta, body, tally }) {
  const { handleClose, dragHandlers, backdropStyle, sheetStyle } = useBottomSheet({ onClose });
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center" style={{ fontFamily: "inherit" }}>
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
  onUndo, onEditTask, onEditDetails, familyId, role,
  songs = [], songPlays = [], books = [],
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
      toast.error("Photo upload failed: " + (err.message || err));
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
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" style={{ fontFamily: "inherit" }}>
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
            <div className="font-extrabold text-slate-900 leading-tight truncate">{i18nTitleOf(task)}</div>
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
                {(() => { const k = (users || []).find((u) => u.role === "kid"); return k?.name ? `No photos yet. Add one if ${k.name} forgot 📸` : "No photos yet. Add one if it was missed 📸"; })()}
              </div>
            )}
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {photos.map((p) => (
                  <CompletionPhotoTile
                    key={p.path}
                    photo={p}
                    /* "Kids never delete" rule — only parents see the X
                        on a proof photo. Kids can still tap the photo
                        to view it full-screen via the lightbox; the
                        destructive action is the only thing gated. */
                    canRemove={isParent}
                    onRemove={() => onRemovePhoto(p.path)}
                  />
                ))}
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
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
            {(() => {
              // "What actually happened" panel — Mike's exact ask:
              //   "Stats should be real stats. I shouldn't need to go
              //    into Edit details to see drums minutes."
              // Render BEFORE the bureaucratic metadata so Drumeo /
              // Melodics / songs / book / minutes show at-a-glance.
              const at = (task?.activityType || "").toLowerCase();
              const pt = (task?.proofType || "").toLowerCase();
              const isDrumsRow = pt === "drums" || /drum/.test(at);
              const isReadingRow = pt === "reading" || /read|book/.test(at);
              const isPhotoRow = pt === "photo";
              const x = completion?.extra || {};
              const compDate = completion?.completionDate || "";

              // Generic schema-driven hero — kicks in when the task
              // has a stat_schema AND no special-case branch matches.
              // Basketball / piano / soccer / etc. land here.
              // Numbers (minutes/count) become tile rows; minutes is
              // promoted as the hero number; text values become pill
              // chips. Matches the polished look of the drums hero
              // without the song-plays join (those are drums-only).
              if (hasStatSchema(task) && !isDrumsRow && !isReadingRow && !isPhotoRow) {
                // Pick practice[] or game[] based on the completion's
                // stored isGame flag. Plan B iter 3 ships the toggle
                // in TaskSheet; this hero card reads the result.
                const isGameRow = !!x.isGame;
                const gameFields = Array.isArray(task.statSchema?.game) ? task.statSchema.game : [];
                const practiceFields = Array.isArray(task.statSchema?.practice) ? task.statSchema.practice : [];
                const fields = isGameRow && gameFields.length > 0 ? gameFields : practiceFields;
                const numericFields = fields.filter((f) => f.type === "minutes" || f.type === "count");
                const textFields = fields.filter((f) => f.type === "text");
                const filledNumerics = numericFields.filter((f) => Number(x[f.key]) > 0);
                const filledTexts = textFields.filter((f) => x[f.key] && String(x[f.key]).trim());
                if (filledNumerics.length === 0 && filledTexts.length === 0) return null;
                // Hero number: first minutes field with a value wins;
                // otherwise the highest count.
                const minutesField = numericFields.find((f) => f.type === "minutes" && Number(x[f.key]) > 0);
                const heroVal = minutesField ? Number(x[minutesField.key]) : Math.max(0, ...filledNumerics.map((f) => Number(x[f.key]) || 0));
                const heroLabel = minutesField ? "min total" : (filledNumerics[0]?.label || "");
                // Visual gear: game days get a warm amber/orange/rose
                // gradient + 🏆 header so a parent can scan their kid's
                // history at a glance and pick out game days.
                const gradient = isGameRow
                  ? "linear-gradient(135deg, #7f1d1d 0%, #c2410c 35%, #f59e0b 75%, #fde68a 100%)"
                  : "linear-gradient(135deg, #4338ca 0%, #7c3aed 45%, #ec4899 100%)";
                const headerLabel = isGameRow ? "🏆 Game day" : "📊 What he did";
                return (
                  <div
                    className="rounded-3xl p-4 mb-2 text-white relative overflow-hidden border-2 border-white/15 shadow-xl"
                    style={{ background: gradient }}
                  >
                    <span aria-hidden="true" className="absolute pointer-events-none" style={{ left: "20%", top: "20%", color: "rgba(255,255,255,0.5)", fontSize: 12 }}>✦</span>
                    <span aria-hidden="true" className="absolute pointer-events-none" style={{ left: "78%", top: "26%", color: "rgba(255,255,255,0.4)", fontSize: 10 }}>✦</span>
                    <div className="relative">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-white/80 font-extrabold flex items-center gap-1.5 mb-2">
                        {headerLabel}
                      </div>
                      {heroVal > 0 && (
                        <div className="flex items-baseline gap-2 mb-3">
                          <span className="text-5xl font-extrabold tracking-tight leading-none" style={{ textShadow: "0 0 12px rgba(253,224,71,0.55)" }}>
                            {heroVal}
                          </span>
                          <span className="text-sm font-bold text-white/70">{heroLabel}</span>
                        </div>
                      )}
                      {filledNumerics.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          {filledNumerics.slice(0, 6).map((f) => (
                            <div key={f.key} className="rounded-2xl bg-white/15 backdrop-blur p-2.5 text-center border border-white/10">
                              <div className="text-xl font-extrabold leading-none">{Number(x[f.key]) || 0}</div>
                              <div className="text-[9px] uppercase tracking-widest text-white/70 font-bold mt-1 truncate">{f.label}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      {filledTexts.length > 0 && (
                        <>
                          <div className="text-[10px] uppercase tracking-wider font-bold text-white/70 mb-1.5">Notes</div>
                          <div className="space-y-1">
                            {filledTexts.map((f) => (
                              <div key={f.key} className="text-[12px] text-white/90">
                                <span className="text-white/60 font-bold">{f.label}: </span>{x[f.key]}
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              }

              if (isDrumsRow) {
                const drumeo = Number(x.drumeo) || 0;
                const melodics = Number(x.melodics) || 0;
                // Pull songs actually played that day from the canonical
                // song_plays rows (not extra.songList — that's free
                // text). Then enrich with covers via the album-dedup map.
                const daysPlays = (songPlays || []).filter((p) => (p.playedOn || p.played_on) === compDate);
                const byId = Object.fromEntries((songs || []).map((s) => [s.id, s]));
                const playedSongs = daysPlays.map((p) => byId[p.songId || p.song_id]).filter(Boolean);
                // Honest minutes: drumeo + melodics + sum(played-song
                // durations). Songs without a backfilled duration
                // contribute 0 rather than guessing, so an unenriched
                // library can't inflate the number.
                const songMs = playedSongs.reduce((acc, s) => acc + (Number(s?.durationMs) || 0), 0);
                const songMin = Math.round(songMs / 60000);
                const total = drumeo + melodics + songMin;
                // Fallback to the typed songList if no canonical plays
                // exist (legacy completions, draft sessions where the
                // parent typed names but never picked from picker).
                const typedList = (x.songList || "").trim();
                const typedTitles = typedList ? typedList.split(/,\s*/).filter(Boolean) : [];
                const hasAnything = total > 0 || playedSongs.length > 0 || typedTitles.length > 0;
                if (!hasAnything) return null;
                return (
                  <div
                    className="rounded-3xl p-4 mb-2 text-white relative overflow-hidden border-2 border-white/15 shadow-xl"
                    style={{ background: "linear-gradient(135deg, #1e293b 0%, #4338ca 35%, #7c3aed 70%, #f97316 100%)" }}
                  >
                    <div className="relative">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-white/80 font-extrabold flex items-center gap-1.5 mb-2">
                        🥁 What he played
                      </div>
                      <div className="flex items-baseline gap-2 mb-3">
                        <span className="text-5xl font-extrabold tracking-tight leading-none" style={{ textShadow: "0 0 12px rgba(253,224,71,0.55)" }}>
                          {total}
                        </span>
                        <span className="text-sm font-bold text-white/70">min total</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="rounded-2xl bg-white/15 backdrop-blur p-2.5 text-center border border-white/10">
                          <div className="text-xl font-extrabold leading-none">{drumeo}</div>
                          <div className="text-[9px] uppercase tracking-widest text-white/70 font-bold mt-1">Drumeo</div>
                        </div>
                        <div className="rounded-2xl bg-white/15 backdrop-blur p-2.5 text-center border border-white/10">
                          <div className="text-xl font-extrabold leading-none">{melodics}</div>
                          <div className="text-[9px] uppercase tracking-widest text-white/70 font-bold mt-1">Melodics</div>
                        </div>
                        <div className="rounded-2xl bg-white/15 backdrop-blur p-2.5 text-center border border-white/10">
                          <div className="text-xl font-extrabold leading-none">
                            {songMin > 0 ? songMin : (playedSongs.length || typedTitles.length)}
                          </div>
                          <div className="text-[9px] uppercase tracking-widest text-white/70 font-bold mt-1">
                            {songMin > 0
                              ? `${playedSongs.length} ${playedSongs.length === 1 ? "song" : "songs"}`
                              : "Songs"}
                          </div>
                        </div>
                      </div>
                      {(playedSongs.length > 0 || typedTitles.length > 0) && (
                        <>
                          <div className="text-[10px] uppercase tracking-wider font-bold text-white/70 mb-1.5">Songs</div>
                          <div className="flex flex-wrap gap-1.5">
                            {playedSongs.map((s, i) => (
                              <span key={s.id + "-" + i} className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/15 backdrop-blur text-white border border-white/20">
                                🎸 {s.canonicalTitle || s.title}
                              </span>
                            ))}
                            {playedSongs.length === 0 && typedTitles.map((t, i) => (
                              <span key={"typed-" + i} className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/15 backdrop-blur text-white border border-white/20">
                                🎸 {t}
                              </span>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              }
              if (isReadingRow) {
                // Multi-book session support — prefer bookIds[], fall
                // back to single bookId (legacy completions), then
                // bookTitle as last-ditch.
                const idsArr = Array.isArray(x.bookIds) && x.bookIds.length > 0
                  ? x.bookIds
                  : (x.bookId ? [x.bookId] : []);
                const titles = idsArr
                  .map((id) => {
                    const b = books.find((bk) => bk.id === id);
                    return b ? (b.canonicalTitle || b.title) : "";
                  })
                  .filter(Boolean);
                const titleText = titles.length > 0
                  ? titles.join(" · ")
                  : (x.bookTitle || "—");
                const lang = x.lang || "—";
                const minutes = Number(x.minutes) || 0;
                const finished = !!x.markFinished;
                return (
                  <div
                    className="rounded-3xl p-4 mb-2 text-white relative overflow-hidden border-2 border-white/15 shadow-xl"
                    style={{ background: "linear-gradient(135deg, #0c4a6e 0%, #0369a1 45%, #b45309 100%)" }}
                  >
                    <div className="relative">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-white/80 font-extrabold flex items-center gap-1.5 mb-2">
                        📚 {titles.length > 1 ? `What he read · ${titles.length} books` : "What he read"}
                      </div>
                      <div className="text-base font-extrabold leading-tight mb-3 line-clamp-2 break-words">{titleText}</div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-2xl bg-white/15 backdrop-blur p-2.5 text-center border border-white/10">
                          <div className="text-xl font-extrabold leading-none">{minutes}</div>
                          <div className="text-[9px] uppercase tracking-widest text-white/70 font-bold mt-1">min</div>
                        </div>
                        <div className="rounded-2xl bg-white/15 backdrop-blur p-2.5 text-center border border-white/10">
                          <div className="text-xl font-extrabold leading-none">{lang === "Spanish" ? "🇪🇸" : "🇺🇸"}</div>
                          <div className="text-[9px] uppercase tracking-widest text-white/70 font-bold mt-1">{lang}</div>
                        </div>
                        <div className="rounded-2xl bg-white/15 backdrop-blur p-2.5 text-center border border-white/10">
                          <div className="text-xl font-extrabold leading-none">{finished ? "✓" : "—"}</div>
                          <div className="text-[9px] uppercase tracking-widest text-white/70 font-bold mt-1">{finished ? "finished" : "in progress"}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
              if (isPhotoRow && (x.title || photos.length > 0)) {
                return (
                  <div
                    className="rounded-3xl p-4 mb-2 text-white relative overflow-hidden border-2 border-white/15 shadow-xl"
                    style={{ background: "linear-gradient(135deg, #831843 0%, #be185d 50%, #f59e0b 100%)" }}
                  >
                    <div className="relative">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-white/80 font-extrabold mb-2">
                        🎨 What he made
                      </div>
                      <div className="text-xl font-extrabold leading-tight mb-1 truncate">{x.title || "Untitled"}</div>
                      <div className="text-[12px] text-white/80">{photos.length} photo{photos.length === 1 ? "" : "s"} attached</div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

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

            {/* Edit history — appended by updateCompletion whenever a
                parent edits this row. Answers "why does this completion
                say what it says now?" weeks after the fact. Newest first
                so the most recent change is at the top. */}
            {Array.isArray(completion?.extra?.history) && completion.extra.history.length > 0 && (
              <div className="mt-3">
                <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider px-1 mb-1">
                  Edit history
                </div>
                <div className="rounded-2xl bg-slate-50 border border-slate-100 divide-y divide-slate-200">
                  {completion.extra.history.map((h, i) => {
                    const whoName = users?.find((u) => u.id === h.by)?.name || "—";
                    const when = h.at ? new Date(h.at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";
                    return (
                      <div key={i} className="p-2.5">
                        <div className="flex items-baseline justify-between gap-2">
                          <div className="text-[12px] font-bold text-slate-700">{h.summary || "Edit"}</div>
                          <div className="text-[10px] text-slate-400 shrink-0">{when}</div>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">by {whoName}</div>
                        {Array.isArray(h.changes) && h.changes.length > 0 && (
                          <div className="mt-1.5 space-y-0.5">
                            {h.changes.map((ch, j) => (
                              <div key={j} className="text-[10px] text-slate-500">
                                <span className="font-bold text-slate-600">{ch.field}:</span>{" "}
                                <span className="line-through text-slate-400">{formatHistoryValue(ch.before)}</span>
                                <span className="mx-1">→</span>
                                <span className="text-slate-700">{formatHistoryValue(ch.after)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "edit" && (
          <div className="space-y-2">
            {/* In-place edit (parent-only) — change the book picked, the
                minutes, the notes, etc. without an undo+resubmit cycle.
                Star/status/identity stay locked; only human fields move. */}
            {isParent && onEditDetails && (
              <button
                type="button"
                onClick={() => onEditDetails()}
                className="w-full py-3 rounded-2xl bg-indigo-600 text-white font-extrabold text-sm active:scale-95"
              >
                💾 Edit this completion's details
              </button>
            )}
            {/* Un-mark is a destructive action. Per the "kids never
                delete" rule, only parents see the button. Kids see a
                gentle "ask a grown-up" line so they understand the
                shape of the rule without a do-nothing button to tap. */}
            {isParent ? (
              <button
                type="button"
                onClick={() => { onUndo(); onClose(); }}
                className="w-full py-3 rounded-2xl bg-rose-50 text-rose-700 font-extrabold text-sm active:scale-95"
              >
                ↺ Un-mark this task (today)
              </button>
            ) : (
              <div className="w-full py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-500 font-bold text-xs text-center px-3">
                🔒 Only a grown-up can undo or change this. Ask Mom or Dad if something's wrong.
              </div>
            )}
            {isParent && (
              <button
                type="button"
                onClick={() => { onEditTask?.(task.id); onClose(); }}
                className="w-full py-3 rounded-2xl bg-indigo-50 text-indigo-700 font-extrabold text-sm active:scale-95"
              >
                ✏️ Edit task settings (all days, not just this one)
              </button>
            )}
            <div className="text-[11px] text-slate-400 px-1 mt-2 leading-snug">
              {isParent
                ? <>Un-mark removes only today's completion — yesterday's history stays. Edit task changes the activity, stars, or rules for everyone going forward.</>
                : <>Your work is safe — only grown-ups can change or remove it.</>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Render a before/after value from the edit history into something a
// human can scan. Objects (extra, proof) collapse to their shape; long
// strings get truncated; nullish becomes "—" so the diff stays legible.
function formatHistoryValue(v) {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") {
    if (!v.trim()) return "(empty)";
    return v.length > 32 ? v.slice(0, 32) + "…" : v;
  }
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return `[${v.length} item${v.length === 1 ? "" : "s"}]`;
  if (typeof v === "object") {
    const keys = Object.keys(v);
    if (keys.length === 0) return "{}";
    return `{${keys.slice(0, 3).join(", ")}${keys.length > 3 ? "…" : ""}}`;
  }
  return String(v);
}

// Inline thumbnail row for the multi-photo upload UI in TaskSheet.
// Resolves the storage path to a signed URL on demand. Tap → remove.
function PhotoThumbnail({ photo, onRemove }) {
  const signed = useSignedUrl(photo?.path || null);
  const src = photo?.url || signed;
  return (
    <div className="relative w-20 h-20 rounded-xl bg-slate-100 overflow-hidden shrink-0">
      {src ? (
        <img src={src} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full grid place-items-center text-slate-300"><Camera size={18} /></div>
      )}
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove?.(); }}
        className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-slate-900/70 text-white grid place-items-center"
        title="Remove photo"
      >
        <X size={11} />
      </button>
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6" onClick={onClose}>
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

function PiggyBank({ stars, kidName }) {
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
        <div className="text-[11px] font-bold text-pink-700/70 uppercase tracking-wide">{kidName ? `${kidName}'s Star Bank` : "Star Bank"}</div>
        <div className="text-3xl font-extrabold text-pink-700 leading-none">{stars} <span className="text-xl">⭐</span></div>
      </div>
    </div>
  );
}

// ===================== KID: DREAM PLAN (interactive) =====================
function DreamPlan({ rewards, starBank, rewardRequests, addRewardRequest, removeRewardRequest, user, users = [], currentProfileId }) {
  const active = rewards.filter((r) => r.active);
  const [picked, setPicked] = useState([]);
  const [perDay, setPerDay] = useState(25);
  const [wish, setWish] = useState("");
  const [wishNote, setWishNote] = useState("");
  const [wishOpen, setWishOpen] = useState(false);
  const myWishes = (rewardRequests || []).filter((w) => w.by === user?.id);
  // Auth-side parent check — Mike acting as Reznor still gets the
  // parent-only X button because we read the AUTH identity, not
  // the acted-as profile. Same pattern submitTask uses to gate
  // auto-approve so a stale-bundle helper can't forge a parent.
  const authProfile = users.find((u) => u.id === currentProfileId);
  const isAuthParent = !!(authProfile?.role === "parent" || authProfile?.isAdmin);
  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const chosen = active.filter((r) => picked.includes(r.id)).sort((a, b) => a.starCost - b.starCost);
  const total = chosen.reduce((s, r) => s + r.starCost, 0);
  const need = Math.max(0, total - starBank);
  const days = need <= 0 ? 0 : Math.ceil(need / perDay);
  const pace = perDay <= 15 ? "Chill pace 🐢" : perDay <= 35 ? "Hero pace 🦸" : "Legend pace ⚡";
  let run = 0;
  const WISH_STATUS = {
    requested: { label: "Waiting for a parent ⏳", cls: "bg-amber-100 text-amber-600" },
    approved: { label: "Approved! 🎉", cls: "bg-emerald-100 text-emerald-600" },
    // DB constraint uses "declined"; we accept "denied" as a legacy
    // alias from any pre-fix saved rows so the kid view still renders.
    declined: { label: "Not this time", cls: "bg-slate-100 text-slate-400" },
    denied:   { label: "Not this time", cls: "bg-slate-100 text-slate-400" },
  };
  return (
    <div className="px-4 pt-4">
      <div className="rounded-3xl p-5 text-white" style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)" }}>
        <div className="flex items-center gap-2 text-sm font-semibold opacity-90"><Target size={16} /> My Dream Plan</div>
        <div className="text-xl font-extrabold mt-1">Pick what you're dreaming of 🌟</div>
        <div className="text-[12px] opacity-90 mt-1">Tap rewards to add them — I'll show you how to get there!</div>
      </div>

      <SectionTitle icon={<Sparkles size={16} className="text-violet-500" />}>{i18nTOf("sec_wish_new", "Wish for something new")}</SectionTitle>
      {!wishOpen && <button onClick={() => setWishOpen(true)} className="w-full py-3 rounded-2xl bg-violet-600 text-white font-bold text-sm flex items-center justify-center gap-1"><Plus size={15} /> Make a wish</button>}
      {wishOpen && (
        <Card className="p-4">
          <input value={wish} onChange={(e) => setWish(e.target.value)} placeholder="e.g. Go fishing, theme park day, sleepover" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm mb-2" />
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
          {myWishes.map((w) => {
            const isApproved = w.status === "approved";
            const isDeclined = w.status === "declined" || w.status === "denied";
            return (
              <Card key={w.id} className="p-3 mb-2 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-violet-100 grid place-items-center text-lg shrink-0">⭐</div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate">{w.title}</div>
                  <div className="text-[11px] text-slate-400 truncate">{isApproved && w.starCost ? `${w.starCost}⭐ — now in your rewards!` : (w.note || "your wish")}</div>
                </div>
                {isApproved && removeRewardRequest ? (
                  /* Approved → "Got it!" button anyone can tap to
                     dismiss the row. The reward already exists in the
                     rewards table; removing this request is just
                     clearing a notification-style entry, not a
                     destructive delete. */
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Got it — clear "${w.title}" from your wishes? It's already in your rewards.`)) {
                        removeRewardRequest(w.id);
                      }
                    }}
                    className="text-[11px] font-extrabold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 active:scale-95 rounded-full px-3 py-1.5 flex items-center gap-1 shrink-0"
                    title="Tap to acknowledge and clear from your wishes"
                  >
                    Got it! 👍
                  </button>
                ) : (
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${WISH_STATUS[w.status].cls}`}>{WISH_STATUS[w.status].label}</span>
                )}
                {/* Parent cleanup — declined / requested wishes can be
                    cleared by the parent (auth identity, so Mike
                    acting as Reznor still sees the X). Per the
                    kids-never-delete rule, kids see nothing. */}
                {isAuthParent && removeRewardRequest && !isApproved && (
                  <button
                    type="button"
                    onClick={() => {
                      const verb = isDeclined ? "Remove this denied wish?" : "Withdraw this wish?";
                      if (window.confirm(`${verb}\n\n"${w.title}"`)) {
                        removeRewardRequest(w.id);
                      }
                    }}
                    className="text-slate-400 hover:text-rose-500 active:scale-90 shrink-0 p-1"
                    title="Parent: remove this wish row"
                    aria-label="Remove wish"
                  >
                    <X size={14} />
                  </button>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <SectionTitle icon={<Gift size={16} className="text-violet-500" />}>{i18nTOf("sec_choose_dreams", "Choose your dreams")}</SectionTitle>
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

          <SectionTitle icon={<Trophy size={16} className="text-amber-500" />}>{i18nTOf("sec_unlock_order", "Unlock order")}</SectionTitle>
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
      {entries.length === 0 && <p className="text-sm text-slate-400 px-1 mt-4">{i18nTOf("empty_streaks", "No streaks yet — ask a parent to start tracking one!")}</p>}
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
function TaskSheet({ task, existing, role, onClose, onSubmit, onSaveDraft, familyId, songs, songPlays, addSong, addSongPlay, books = [], updateBook, addBook, updateCompletion, actorId }) {
  const [notes, setNotes] = useState(existing?.notes || "");
  const [bookTitle, setBookTitle] = useState(existing?.extra?.bookTitle || "");
  const [lang, setLang] = useState(existing?.extra?.lang || "English");
  const [minutes, setMinutes] = useState(existing?.extra?.minutes || task.minutes);
  // Photos — up to 3 per task. Initialised from any existing proof
  // (filter to photo entries with a path or url). Mike: "One photo
  // is too limiting. But 3 should be the max for an activity."
  const MAX_PHOTOS = 3;
  const [photos, setPhotos] = useState(() => {
    if (!existing?.proof) return [];
    return existing.proof
      .filter((p) => (p?.type === "photo" || p?.path || p?.url) && (p?.path || p?.url))
      .slice(0, MAX_PHOTOS);
  });
  const [uploading, setUploading] = useState(false);
  // Initialise drum subs from a saved draft so reopening picks up
  // where the parent left off (Drumeo 17 min, then Melodics 37 min,
  // etc.). Otherwise default to empty so a fresh submission still
  // shows blank inputs.
  const [drumeo, setDrumeo] = useState(existing?.extra?.drumeo ? String(existing.extra.drumeo) : "");
  const [melodics, setMelodics] = useState(existing?.extra?.melodics ? String(existing.extra.melodics) : "");
  const [songList, setSongList] = useState(existing?.extra?.songList || "");
  const [title, setTitle] = useState(existing?.extra?.title || "");
  // Reading picker — bookIds is the list of books logged in this one
  // session (Mike: Reznor read 3 books today, one completion). Stored
  // as extra.bookIds[]; for back-compat the legacy single extra.bookId
  // is also written (= bookIds[0]) so older read sites keep resolving
  // a cover. markFinished is the "I finished this book today" check —
  // it applies to ALL picked books, so a Library session that wraps
  // up multiple books works in one tap.
  const [bookIds, setBookIds] = useState(() => {
    const arr = existing?.extra?.bookIds;
    if (Array.isArray(arr) && arr.length > 0) return arr.filter(Boolean);
    const one = existing?.extra?.bookId;
    return one ? [one] : [];
  });
  const [markFinished, setMarkFinished] = useState(false);
  const [bookSearch, setBookSearch] = useState("");
  // Web-search state driven by the shared useBookWebSearch hook. The
  // hook handles debounce + Google → OL fallback + retry. `skip` gates
  // the call so we don't fetch when local library already has enough
  // matches for the query.
  // "Also use this photo as the book cover" — visible whenever the
  // picked book has no cover yet OR a brand new book is about to be
  // created from a typed title. Mike: the proof photo and the official
  // book cover are different artifacts. The library should only show
  // the official cover; the proof photo stays on the completion and
  // shows in the "fun" places. This checkbox lets the parent declare
  // intent in one tap when uploading.
  const [useAsBookCover, setUseAsBookCover] = useState(false);

  const isReading = task.proofType === "reading";
  const isDrums = task.proofType === "drums";
  const isPhoto = task.proofType === "photo";

  // Schema-driven generic stats path. Only kicks in when the task
  // has a stat_schema AND no proofType special case is active —
  // drums/reading/photo keep their existing polished branches.
  // Basketball / piano / soccer / etc. (no proofType set) hit this
  // branch and render inputs straight from the task's schema.
  const useSchemaFields = hasStatSchema(task) && !isReading && !isDrums && !isPhoto;
  // Game-day mode (Plan B iter 3). A task whose template defines
  // BOTH practice[] and game[] arrays can flip between them via a
  // toggle in the submit sheet. Basketball / soccer / hockey have
  // game variants; piano / guitar / singing don't (game[] absent).
  const hasGameSchema = useSchemaFields
    && Array.isArray(task.statSchema?.game)
    && task.statSchema.game.length > 0;
  const [isGame, setIsGame] = useState(() =>
    useSchemaFields && existing?.extra?.isGame === true
  );
  // Active fields depend on the toggle. The two arrays often share
  // keys (e.g. "minutes" on both practice + game) which is fine —
  // the same value carries over when the toggle flips.
  const schemaFields = useSchemaFields
    ? (isGame && hasGameSchema ? task.statSchema.game : task.statSchema.practice) || []
    : [];
  // Seed values for EVERY key across both arrays so flipping the
  // toggle mid-flow doesn't lose data the parent already typed in
  // the other mode.
  const allSchemaKeys = useSchemaFields
    ? (() => {
        const s = new Set();
        for (const f of (task.statSchema.practice || [])) s.add(f.key);
        for (const f of (task.statSchema.game || [])) s.add(f.key);
        return Array.from(s);
      })()
    : [];
  const [schemaValues, setSchemaValues] = useState(() => {
    const seed = {};
    if (!useSchemaFields) return seed;
    for (const k of allSchemaKeys) {
      const v = existing?.extra?.[k];
      seed[k] = v === undefined || v === null ? "" : String(v);
    }
    return seed;
  });
  const setSchemaField = (key, value) => setSchemaValues((prev) => ({ ...prev, [key]: value }));
  // Pack the schema values into extra. Only the active fields'
  // values get written so practice extras don't bleed into a game
  // row (and vice-versa). isGame is stamped so the Stats hero card
  // knows which schema to render later.
  const schemaExtra = () => {
    if (!useSchemaFields) return {};
    const out = { isGame: !!isGame };
    for (const f of schemaFields) {
      const raw = schemaValues[f.key];
      if (raw === undefined || raw === "") continue;
      if (f.type === "minutes" || f.type === "count") out[f.key] = Number(raw) || 0;
      else out[f.key] = String(raw);
    }
    return out;
  };

  // Picker list: books filtered by fuzzy match (typos OK — "tipos malos"
  // finds "Los Tipos Malos", "rrr" finds Three R's, etc.) + sorted by
  // "what's most useful at submit time" — reading-in-progress first
  // (most likely match), then wishlist, then archive (re-read
  // candidates), then finished/dropped. Top 20 keeps the dropdown
  // bounded.
  const pickerBooks = useMemo(() => {
    if (!isReading) return [];
    const all = (books || []).map((b) => ({
      ...b,
      _display: b.canonicalTitle || b.title || "",
    }));
    const needle = bookSearch.trim();
    const filtered = needle
      ? all.map((b) => {
          const hay = [
            b._display, b.title,
            b.canonicalAuthor,
            b.lang, b.level,
            b.eraLabel,
          ].filter(Boolean).join(" ");
          return { b, m: fuzzyMatch(needle, hay) };
        }).filter((x) => x.m.hit).sort((a, b) => b.m.score - a.m.score).map((x) => x.b)
      : all;
    const statusOrder = { reading: 0, wishlist: 1, dropped: 3, finished: 4 };
    return filtered
      .sort((a, b) => {
        // Only re-sort by status when there's no query — when the user
        // is typing, fuzzy-score order is what they want.
        if (needle) return 0;
        const aArch = a.preTracking ? 2 : (statusOrder[a.status] ?? 99);
        const bArch = b.preTracking ? 2 : (statusOrder[b.status] ?? 99);
        if (aArch !== bArch) return aArch - bArch;
        return a._display.localeCompare(b._display);
      })
      .slice(0, 20);
  }, [books, bookSearch, isReading]);

  // pickedBooks: dereferenced from bookIds against the live books prop.
  // filter(Boolean) handles a transient race where addBook (web result
  // path) hasn't yet propagated through the sync layer — the chip
  // re-appears on the next render once the row lands.
  const pickedBooks = useMemo(
    () => bookIds.map((id) => (books || []).find((b) => b.id === id)).filter(Boolean),
    [bookIds, books]
  );
  // Legacy single-book reference for code paths inside doSubmit that
  // still target one book (cover stamping, etc.). When there are 2+
  // picked books, those single-book operations apply to the FIRST
  // picked book — the parent's first explicit choice.
  const pickedBook = pickedBooks[0] || null;

  // Tap a result → ADD to bookIds (Mike's multi-book ask). Pre-fills
  // title/lang from this book so the gate + free-typed title field
  // reflect what the parent most recently picked. Won't double-add.
  const pickBook = (b) => {
    setBookIds((prev) => prev.includes(b.id) ? prev : [...prev, b.id]);
    setBookTitle(b._display || b.canonicalTitle || b.title || "");
    if (b.lang) setLang(b.lang);
    setBookSearch("");
    setWebResults([]);
  };
  const removePickedBook = (id) => {
    setBookIds((prev) => prev.filter((x) => x !== id));
  };
  const clearAllPicks = () => {
    setBookIds([]);
  };

  // Add a result from the web search (Open Library) → create a new
  // book row in the family's catalog + add it to this session. The
  // book lands with auto-match status so the catalog enrichment
  // pipeline doesn't try to re-fetch it later.
  const addWebBook = (r) => {
    if (!r || !r.title || !addBook) return;
    const newId = "b_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
    const todayIso = new Date().toISOString().slice(0, 10);
    addBook({
      id: newId,
      title: r.title,
      lang: lang || "English",
      status: "reading",
      started: todayIso,
      finished: "",
      level: "",
      rating: 0,
      notes: "",
      preTracking: false,
      eraLabel: "",
      readCount: 1,
      coverUrl: r.coverUrl || "",
      canonicalTitle: r.title || "",
      canonicalAuthor: r.author || "",
      customCoverPath: "",
      externalSource: r.externalSource || "open_library",
      externalId: r.externalId || "",
      enrichedAt: new Date().toISOString(),
      matchStatus: "auto",
    });
    setBookIds((prev) => prev.includes(newId) ? prev : [...prev, newId]);
    setBookTitle(r.title);
    setBookSearch("");
    setWebResults([]);
  };

  const { results: webResults, searching: webSearching, error: webError, retry: retryWebSearch } = useBookWebSearch(bookSearch, {
    enabled: isReading,
    skip: pickerBooks.length >= 5,
  });

  // Upload the file to family-photos under <familyId>/proof/ and store
  // the returned path on the photo object. The legacy `url` field is
  // omitted; display code resolves path → signed URL on demand.
  // handleFile appends one upload to the photos array, capped at
  // MAX_PHOTOS. Reading the existing length captures it as of the
  // tap, so a rapid double-tap can't sneak past the cap.
  //
  // Auto-save draft on every photo mutation. Krissie's flow that
  // exposed the bug: opened Make Bed, uploaded Reznor's made-bed
  // photo, then closed the sheet without explicitly tapping Submit
  // or Save progress. The photo lived in Supabase storage but no
  // completion row referenced it — so on next open the photo was
  // "gone." Auto-saving a draft the moment a photo is uploaded (or
  // removed) means closing the sheet without a final tap can never
  // orphan an upload again. Skipped when editing an already-approved
  // row (we don't want to overwrite an approved completion with a
  // draft) and when onSaveDraft isn't provided (helper / kid paths).
  const isApprovedEdit = existing?.status === "approved";
  const persistDraft = (nextPhotos) => {
    if (isApprovedEdit) return;
    if (!onSaveDraft) return;
    const proof = (nextPhotos || []).map((p) => ({ type: "photo", name: p.name, path: p.path }));
    const extra = {};
    if (isReading) Object.assign(extra, { bookTitle, lang, minutes, bookIds: [...bookIds], bookId: bookIds[0] || null, markFinished });
    if (isPhoto) Object.assign(extra, { title });
    if (isDrums) Object.assign(extra, { drumeo, melodics, songList, totalMin: (Number(drumeo) || 0) + (Number(melodics) || 0) });
    if (useSchemaFields) Object.assign(extra, schemaExtra());
    onSaveDraft(task.id, { notes, proof, extra });
  };
  const handleFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (photos.length >= MAX_PHOTOS) {
      toast.error(i18nTOf("ts_max_photos", "Max {n} photos per task.").replaceAll("{n}", MAX_PHOTOS));
      e.target.value = "";
      return;
    }
    setUploading(true);
    try {
      const { path, name } = await uploadFamilyPhoto({ file: f, familyId, kind: "proof" });
      const newPhoto = { type: "photo", name, path };
      const nextPhotos = photos.length >= MAX_PHOTOS ? photos : [...photos, newPhoto];
      setPhotos(nextPhotos);
      // Auto-save the draft so the photo can't be lost by closing the
      // sheet without explicit submit. Surfaces a tiny "Saved" toast so
      // the parent sees that the photo is safely attached.
      persistDraft(nextPhotos);
      if (!isApprovedEdit && onSaveDraft) toast.success?.(i18nTOf("ts_photo_saved", "Photo saved 📸"));
    } catch (err) {
      toast.error(i18nTOf("ts_photo_upload_fail", "Photo upload failed: {msg}").replaceAll("{msg}", err.message || err));
    } finally {
      setUploading(false);
      e.target.value = ""; // allow picking the same file again after remove
    }
  };
  const removePhotoAt = (idx) => {
    const nextPhotos = photos.filter((_, i) => i !== idx);
    setPhotos(nextPhotos);
    // Keep the draft in sync so a remove can't bring back a deleted photo
    // on next open. No toast — silent removal is the right UX.
    persistDraft(nextPhotos);
  };
  // Back-compat shims for code paths that read `photo` / `photoPreview`
  // (single-photo gating, the "use as book cover" checkbox, etc.).
  // They now reflect the first photo in the array.
  const photo = photos[0] || null;
  const photoPreview = useSignedUrl(photo?.path);

  // gates
  let ready = true;
  let gateMsg = "";
  if (uploading) { ready = false; gateMsg = i18nTOf("ts_gate_uploading", "Photo still uploading…"); }
  if (isReading && pickedBooks.length === 0 && !bookTitle.trim()) { ready = false; gateMsg = i18nTOf("ts_gate_book_title", "Pick at least one book or type a title to submit."); }
  if (isPhoto && photos.length === 0) { ready = false; gateMsg = i18nTOf("ts_gate_photo", "Add a photo of your work to submit."); }
  if (isDrums && (!drumeo && !melodics && !songList)) { ready = false; gateMsg = i18nTOf("ts_gate_drums", "Log at least one of Drumeo / Melodics / songs."); }

  const doSubmit = () => {
    // Strip any legacy preview URL from the stored proof item.
    const proof = photos.map((p) => ({ type: "photo", name: p.name, path: p.path }));
    const extra = {};
    if (isReading) Object.assign(extra, { bookTitle, lang, minutes, bookIds: [...bookIds], bookId: bookIds[0] || null, markFinished });
    if (isPhoto) Object.assign(extra, { title });
    if (isDrums) Object.assign(extra, { drumeo, melodics, songList, totalMin: (Number(drumeo) || 0) + (Number(melodics) || 0) });
    if (useSchemaFields) Object.assign(extra, schemaExtra());

    // Reading-side writes — keep the catalog in sync with what just got
    // read. This is the unification Mike asked for: one book, one row,
    // re-reads incrementing read_count; archive entries can graduate
    // into actively-tracked rows on re-read while keeping their
    // pre-tracking historical marker intact.
    if (isReading) {
      const todayIso = new Date().toISOString().slice(0, 10);
      // Multi-book submit: every picked book gets the same status
      // patch (finished/reading), and re-read candidates increment
      // readCount. The "use this photo as the cover" stamp only
      // applies to the FIRST picked book — one proof photo can't
      // logically be the cover of multiple titles.
      if (pickedBooks.length > 0 && updateBook) {
        pickedBooks.forEach((pb, idx) => {
          const patch = {};
          const wasRereadCandidate =
            pb.status === "finished" ||
            pb.status === "dropped" ||
            pb.preTracking;
          if (markFinished) {
            patch.status = "finished";
            patch.finished = todayIso;
            if (!pb.started) patch.started = todayIso;
            if (wasRereadCandidate) {
              patch.readCount = (pb.readCount || 1) + 1;
            }
          } else if (pb.status !== "reading") {
            patch.status = "reading";
            patch.finished = "";
            patch.started = todayIso;
            if (wasRereadCandidate) {
              patch.readCount = (pb.readCount || 1) + 1;
            }
          }
          // "Also use as cover" applies only to the first picked
          // book + when that book has no cover yet — keeps the photo
          // = cover declaration unambiguous for multi-book sessions.
          if (idx === 0 && useAsBookCover && photo?.path && !pb.customCoverPath) {
            patch.customCoverPath = photo.path;
          }
          if (Object.keys(patch).length > 0) updateBook(pb.id, patch);
        });
      } else if (pickedBooks.length === 0 && bookTitle.trim() && addBook) {
        // Free-typed title with no existing match — create a new book
        // row so the next session can pick it instead of re-typing.
        addBook({
          id: "b_" + Date.now(),
          title: bookTitle.trim(),
          lang,
          status: markFinished ? "finished" : "reading",
          started: todayIso,
          finished: markFinished ? todayIso : "",
          level: "",
          rating: 0,
          notes: "",
          preTracking: false,
          eraLabel: "",
          readCount: 1,
          coverUrl: "",
          canonicalTitle: "",
          canonicalAuthor: "",
          customCoverPath: (useAsBookCover && photo?.path) ? photo.path : "",
          externalSource: "",
          externalId: "",
          enrichedAt: null,
          matchStatus: "unmatched",
        });
      }
    }

    if (canEdit && existing) {
      // Edit mode: patch the existing completion in place. Status,
      // awarded_stars, pending_stars, submitted_by, approved_by all
      // stay untouched — only the human-meaningful fields change.
      // Skips streak bump, juice, celebrate — those already fired on
      // the original submit. Clean way to fix the book pick or
      // minutes hours later without an undo+resubmit round trip.
      updateCompletion(existing.id, { notes, proof, extra }, { by: actorId, summary: "Edited completion details" });
      onClose();
    } else {
      onSubmit(task.id, { notes, proof, extra });
    }
  };

  // doSaveDraft writes the in-progress state without firing the
  // submit gauntlet. No gate enforcement (drafts can be partial), no
  // streak bump, no juice. The parent picks back up next time they
  // tap into the task.
  const doSaveDraft = () => {
    const proof = photos.map((p) => ({ type: "photo", name: p.name, path: p.path }));
    const extra = {};
    if (isReading) Object.assign(extra, { bookTitle, lang, minutes, bookIds: [...bookIds], bookId: bookIds[0] || null, markFinished });
    if (isPhoto) Object.assign(extra, { title });
    if (isDrums) Object.assign(extra, { drumeo, melodics, songList, totalMin: (Number(drumeo) || 0) + (Number(melodics) || 0) });
    if (useSchemaFields) Object.assign(extra, schemaExtra());
    onSaveDraft?.(task.id, { notes, proof, extra });
  };

  const alreadyApproved = existing?.status === "approved";
  // Edit mode: parents (or admins) can change the details of an
  // already-approved completion in place — picking a different book,
  // fixing minutes, swapping the markFinished flag — without undoing
  // and re-submitting. The patch goes through updateCompletion which
  // preserves status / awarded_stars / submitted_by / approved_by, so
  // editing is purely about the human-meaningful fields, not the
  // economy. Kids can't enter edit mode (would let them tweak their
  // own stars).
  const canEdit = alreadyApproved && role === "parent" && !!updateCompletion;

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
    <div className="fixed inset-0 z-[60] flex items-end justify-center" style={{ fontFamily: "inherit" }}>
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
            <div className="font-extrabold text-lg">{i18nTitleOf(task)}</div>
            <div className="text-xs text-slate-400">{i18nTOf("ts_minutes_worth", "{m} min · worth {n} ⭐").replaceAll("{m}", task.minutes).replaceAll("{n}", task.starValue)}{task.bonusStarValue ? i18nTOf("ts_bonus_possible", " (+{n} bonus possible)").replaceAll("{n}", task.bonusStarValue) : ""}</div>
          </div>
        </div>

        {alreadyApproved && (
          <div className="mt-4 bg-emerald-50 text-emerald-700 rounded-2xl p-3 text-sm font-semibold flex items-center gap-2">
            <Check size={16} />
            <span className="flex-1">{i18nTOf("ts_approved_banked", "Approved — {n} ⭐ banked! 🎉").replaceAll("{n}", existing.awardedStars)}</span>
            {canEdit && (
              <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-600 bg-emerald-100 rounded-full px-2 py-0.5">{i18nTOf("ts_edit_mode", "edit mode")}</span>
            )}
          </div>
        )}

        {(!alreadyApproved || canEdit) && (
          <div className="mt-4 space-y-3">
            {/* Schema-driven stat inputs — Plan B iter 2.
                Renders only for tasks with a stat_schema AND no
                proofType special case. Drums / reading / photo
                tasks keep their existing polished UI below. */}
            {useSchemaFields && schemaFields.length > 0 && (
              <div className={`rounded-2xl border p-3 ${isGame ? "bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 border-amber-200" : "bg-gradient-to-br from-indigo-50 via-violet-50 to-pink-50 border-indigo-100"}`}>
                <div className={`text-[10px] uppercase tracking-widest font-extrabold mb-2 flex items-center gap-1 ${isGame ? "text-amber-700" : "text-indigo-700"}`}>
                  {isGame ? "🏆 Game stats" : "📊 Practice stats"}
                </div>
                {hasGameSchema && (
                  <button
                    type="button"
                    onClick={() => setIsGame((v) => !v)}
                    className={`w-full flex items-center justify-between rounded-xl border-2 p-2.5 mb-3 active:scale-[0.99] transition ${isGame ? "bg-amber-100 border-amber-300" : "bg-white border-slate-200"}`}
                  >
                    <div className="text-left">
                      <div className="text-[11px] font-extrabold text-slate-800 flex items-center gap-1.5">
                        🏆 Game day?
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {isGame ? "Logging game stats (points, assists, etc.)" : "Tap to log a game instead of practice"}
                      </div>
                    </div>
                    <span className={`w-10 h-6 rounded-full p-0.5 transition shrink-0 ${isGame ? "bg-amber-500" : "bg-slate-300"}`}>
                      <span className={`block w-5 h-5 bg-white rounded-full transition ${isGame ? "translate-x-4" : ""}`} />
                    </span>
                  </button>
                )}
                <div className="space-y-2">
                  {schemaFields.map((f) => {
                    const v = schemaValues[f.key] ?? "";
                    const isNumeric = f.type === "minutes" || f.type === "count";
                    const unit = f.type === "minutes" ? "min" : null;
                    return (
                      <Field key={f.key} label={f.label}>
                        <div className="flex items-center gap-2">
                          <input
                            type={isNumeric ? "number" : "text"}
                            inputMode={isNumeric ? "numeric" : undefined}
                            min={isNumeric ? 0 : undefined}
                            value={v}
                            onChange={(e) => setSchemaField(f.key, e.target.value)}
                            placeholder={isNumeric ? "0" : ""}
                            className="input"
                          />
                          {unit && <span className="text-xs text-slate-400 shrink-0">{unit}</span>}
                        </div>
                      </Field>
                    );
                  })}
                </div>
              </div>
            )}

            {isReading && (
              <>
                {/* Book picker — search the family's library AND the web.
                    Reznor read 3 books today? Tap each one and the chips
                    below the search box show what's logged for this
                    session. Local matches always come first; if a book
                    isn't in the library yet, an Open Library search runs
                    automatically so the parent can add it in one tap. */}
                <div>
                  <div className="text-xs font-semibold text-slate-500 mb-1">
                    {pickedBooks.length > 0
                      ? i18nTOf("field_book_pick_more", "Add more books, or keep going")
                      : i18nTOf("field_book_pick_or_type", "Pick from library, or type a new one below")}
                  </div>
                  {pickedBooks.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {pickedBooks.map((pb) => {
                        const title = pb.canonicalTitle || pb.title || i18nTOf("ts_book_untitled", "(untitled)");
                        const isRereadCandidate = pb.preTracking || pb.status === "finished" || pb.status === "dropped";
                        const round = isRereadCandidate ? ` · R${(pb.readCount || 1) + 1}` : "";
                        const coverSrc = pb.coverUrl || "";
                        return (
                          <span key={pb.id} className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full pl-1 pr-1 py-0.5 text-[12px] font-bold max-w-full">
                            <span className="w-6 h-8 rounded bg-emerald-100 grid place-items-center shrink-0 relative overflow-hidden">
                              <Check size={12} className="text-emerald-600" />
                              {coverSrc && (
                                <img
                                  src={coverSrc}
                                  alt=""
                                  className="absolute inset-0 w-full h-full object-cover"
                                  loading="lazy"
                                  referrerPolicy="no-referrer"
                                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                                />
                              )}
                            </span>
                            <span className="truncate max-w-[160px] py-1">{title}{round}</span>
                            <button onClick={() => removePickedBook(pb.id)} className="text-emerald-600 p-0.5 active:scale-95" aria-label={i18nTOf("ts_picked_remove", "Remove this book")}>
                              <X size={12} />
                            </button>
                          </span>
                        );
                      })}
                      {pickedBooks.length > 1 && (
                        <button onClick={clearAllPicks} className="text-[11px] text-slate-400 font-bold underline px-1">
                          {i18nTOf("ts_picked_clear_all", "Clear all")}
                        </button>
                      )}
                    </div>
                  )}
                  <input
                    value={bookSearch}
                    onChange={(e) => setBookSearch(e.target.value)}
                    placeholder={i18nTOf("field_book_search_placeholder", "Search books he's read or is reading…")}
                    className="input"
                  />
                  {bookSearch.trim() && pickerBooks.length > 0 && (
                    <div className="mt-2 max-h-56 overflow-y-auto rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100">
                      {pickerBooks
                        .filter((b) => !bookIds.includes(b.id))
                        .map((b) => {
                          const statusLabel =
                            b.preTracking ? i18nTOf("ts_book_archive", "Archive · {era}").replaceAll("{era}", b.eraLabel || i18nTOf("ts_book_era_unset", "era unset"))
                            : b.status === "finished" ? i18nTOf("ts_book_status_finished", "Finished")
                            : b.status === "wishlist" ? i18nTOf("ts_book_status_wishlist", "Wishlist")
                            : b.status === "dropped" ? i18nTOf("ts_book_status_dropped", "Dropped")
                            : i18nTOf("ts_book_status_reading", "Reading");
                          const statusColor =
                            b.preTracking ? "bg-amber-100 text-amber-800"
                            : b.status === "finished" ? "bg-emerald-100 text-emerald-700"
                            : b.status === "wishlist" ? "bg-violet-100 text-violet-700"
                            : b.status === "dropped" ? "bg-slate-200 text-slate-500"
                            : "bg-sky-100 text-sky-700";
                          const isRereadCandidate = b.preTracking || b.status === "finished" || b.status === "dropped";
                          return (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => pickBook(b)}
                              className="w-full flex items-center gap-2 p-2 text-left active:scale-[0.99]"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold text-slate-800 truncate">{b._display || i18nTOf("ts_book_untitled", "(untitled)")}</div>
                                <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${statusColor}`}>{statusLabel}</span>
                                  {b.lang && <span className="text-[10px] text-slate-500">{b.lang}</span>}
                                  {(b.readCount || 1) > 1 && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                                      {i18nTOf("ts_read_count", "Read {n}×").replaceAll("{n}", b.readCount)}
                                    </span>
                                  )}
                                  {isRereadCandidate && (
                                    <span className="text-[10px] text-amber-600 font-bold">{i18nTOf("ts_round_hint", "round {n}?").replaceAll("{n}", (b.readCount || 1) + 1)}</span>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  )}
                  {/* Web search — fires automatically when the local
                      library has nothing for the query. Open Library
                      returns cover thumb + title + author + year so
                      a one-tap add gives the new book a real cover
                      out of the gate. */}
                  {bookSearch.trim().length >= 3 && (webSearching || webResults.length > 0 || webError) && (
                    <div className="mt-2 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-2">
                      <div className="text-[10px] uppercase tracking-wider font-bold text-indigo-700 mb-1 px-1">
                        {webSearching ? i18nTOf("ts_web_searching", "Searching the web…") : i18nTOf("ts_web_results", "From the web (tap to add)")}
                      </div>
                      {webError && !webSearching && (
                        <div className="bg-white rounded-xl p-2 flex items-center gap-2">
                          <div className="flex-1 text-[11px] text-slate-600 leading-snug">
                            {i18nTOf("ts_web_error_msg", "Couldn't reach the book service. Could be a hiccup.")}
                          </div>
                          <button
                            type="button"
                            onClick={() => retryWebSearch()}
                            className="text-[11px] font-bold text-white bg-indigo-600 rounded-lg px-3 py-1.5 active:scale-95 shrink-0"
                          >
                            {i18nTOf("ts_web_retry", "Try again")}
                          </button>
                        </div>
                      )}
                      {webResults.length > 0 && (
                        <div className="bg-white rounded-xl divide-y divide-slate-100 overflow-hidden">
                          {webResults.map((r, i) => (
                            <button
                              key={`web-${i}`}
                              type="button"
                              onClick={() => addWebBook(r)}
                              className="w-full flex items-center gap-2 p-2 text-left active:scale-[0.99]"
                            >
                              <div className="w-10 h-14 rounded bg-slate-100 grid place-items-center shrink-0 relative overflow-hidden">
                                <BookOpen size={14} className="text-slate-300" />
                                {r.coverThumbUrl && (
                                  <img
                                    src={r.coverThumbUrl}
                                    alt=""
                                    className="absolute inset-0 w-full h-full object-cover"
                                    loading="lazy"
                                    referrerPolicy="no-referrer"
                                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                                  />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold text-slate-800 truncate">{r.title || i18nTOf("ts_book_untitled", "(untitled)")}</div>
                                <div className="text-[11px] text-slate-500 truncate">
                                  {r.author || i18nTOf("ts_web_author_unknown", "Author unknown")}{r.year ? ` · ${r.year}` : ""}
                                </div>
                              </div>
                              <Plus size={16} className="text-indigo-500 shrink-0" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {pickedBooks.length === 0 && (
                  <Field label={i18nTOf("field_book_title_required", "Book title *")}>
                    <input
                      value={bookTitle}
                      onChange={(e) => setBookTitle(e.target.value)}
                      placeholder={i18nTOf("ts_book_title_ph", "e.g. Dog Man")}
                      className="input"
                    />
                  </Field>
                )}
                <div className="flex gap-2">
                  <button onClick={() => setLang("English")} className={`flex-1 py-2 rounded-2xl text-sm font-semibold ${lang === "English" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>{i18nTOf("ts_lang_english", "English")}</button>
                  <button onClick={() => setLang("Spanish")} className={`flex-1 py-2 rounded-2xl text-sm font-semibold ${lang === "Spanish" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>{i18nTOf("ts_lang_spanish", "Spanish 🇪🇸")}</button>
                </div>
                <Field label={i18nTOf("ts_minutes_read", "Minutes read")}><input type="number" value={minutes} onChange={(e) => setMinutes(e.target.value)} className="input" /></Field>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={markFinished}
                    onChange={(e) => setMarkFinished(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-slate-700">
                    {pickedBooks.length > 1
                      ? i18nTOf("ts_finished_today_many", "✅ He finished these books today")
                      : i18nTOf("ts_finished_today", "✅ He finished this book today")}
                    {pickedBook && (pickedBook.preTracking || pickedBook.status === "finished" || pickedBook.status === "dropped")
                      ? i18nTOf("ts_round_suffix", " (Round {n})").replaceAll("{n}", (pickedBook.readCount || 1) + 1)
                      : ""}
                  </span>
                </label>
              </>
            )}

            {isPhoto && (
              <>
                <Field label={i18nTOf("field_title_optional", "Title (optional)")}><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={i18nTOf("field_name_your_work", "Name your work")} className="input" /></Field>
                <div>
                  <div className="text-xs font-semibold text-slate-500 mb-1">
                    {i18nTOf("field_photos_of_your_work", "Photos of your work *")} <span className="font-normal text-slate-400">({photos.length}/{MAX_PHOTOS})</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {photos.map((p, i) => (<PhotoThumbnail key={i} photo={p} onRemove={() => removePhotoAt(i)} />))}
                    {photos.length < MAX_PHOTOS && (
                      <label className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-200 grid place-items-center cursor-pointer hover:bg-slate-50 shrink-0">
                        {uploading
                          ? <span className="text-[10px] text-slate-400">{i18nTOf("ts_uploading_small", "Uploading…")}</span>
                          : <Camera size={20} className="text-slate-300" />}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFile}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>
              </>
            )}

            {isDrums && (
              <>
                {/* Today's session card — surfaces every song already
                    logged today before the parent edits the inputs.
                    Mike's frustration: he'd save a draft, add songs later
                    via the picker, and the songList field stayed empty
                    even though play rows existed. Now we read song_plays
                    directly and show them, with a one-tap "Add to list"
                    that fills the songList field if it's still empty.
                    Songs added via the picker BELOW also flow into
                    songList automatically (see onSongLogged below) so
                    going forward the field stays in sync. */}
                {(() => {
                  const todaysPlays = (songPlays || [])
                    .filter((p) => (p.playedOn || p.played_on) === TODAY_ISO);
                  if (todaysPlays.length === 0) return null;
                  const byId = Object.fromEntries((songs || []).map((s) => [s.id, s]));
                  const titles = todaysPlays.map((p) => {
                    const s = byId[p.songId || p.song_id];
                    return s ? (s.canonicalTitle || s.title || "(unknown)") : "(unknown)";
                  });
                  // Total session minutes derived from current input
                  // state so the card always matches what's typed.
                  const totalMin = (Number(drumeo) || 0) + (Number(melodics) || 0);
                  const missing = titles.filter((t) => !songList.toLowerCase().includes(t.toLowerCase()));
                  return (
                    <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-3 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-[10px] uppercase tracking-widest font-extrabold text-amber-700 flex items-center gap-1.5">
                          🥁 Today's session
                        </div>
                        <div className="text-[11px] font-extrabold text-amber-700 tabular-nums">
                          {totalMin} min · {todaysPlays.length} {todaysPlays.length === 1 ? "play" : "plays"}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mb-2">
                        <div className="rounded-xl bg-white/60 backdrop-blur p-2 text-center">
                          <div className="text-lg font-extrabold text-amber-700 leading-none">{Number(drumeo) || 0}</div>
                          <div className="text-[9px] uppercase tracking-wider text-amber-600 font-bold mt-0.5">Drumeo</div>
                        </div>
                        <div className="rounded-xl bg-white/60 backdrop-blur p-2 text-center">
                          <div className="text-lg font-extrabold text-amber-700 leading-none">{Number(melodics) || 0}</div>
                          <div className="text-[9px] uppercase tracking-wider text-amber-600 font-bold mt-0.5">Melodics</div>
                        </div>
                        <div className="rounded-xl bg-white/60 backdrop-blur p-2 text-center">
                          <div className="text-lg font-extrabold text-amber-700 leading-none">{todaysPlays.length}</div>
                          <div className="text-[9px] uppercase tracking-wider text-amber-600 font-bold mt-0.5">Songs</div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {titles.map((t, i) => (
                          <span key={i} className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                            ✓ {t}
                          </span>
                        ))}
                      </div>
                      {missing.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            const append = missing.join(", ");
                            setSongList((prev) => prev.trim() ? `${prev.trim()}, ${append}` : append);
                          }}
                          className="w-full text-[11px] font-bold py-1.5 rounded-lg bg-white text-amber-700 border border-amber-300 active:scale-[0.99]"
                        >
                          + Add {missing.length} missing song{missing.length === 1 ? "" : "s"} to the list below
                        </button>
                      )}
                    </div>
                  );
                })()}

                <div className="grid grid-cols-2 gap-2">
                  <Field label={i18nTOf("field_drumeo_min", "Drumeo min")}><input type="number" value={drumeo} onChange={(e) => setDrumeo(e.target.value)} className="input" /></Field>
                  <Field label={i18nTOf("field_melodics_min", "Melodics min")}><input type="number" value={melodics} onChange={(e) => setMelodics(e.target.value)} className="input" /></Field>
                </div>
                <Field label={i18nTOf("field_drumscribe_songs", "Drumscribe / YouTube songs")}><input value={songList} onChange={(e) => setSongList(e.target.value)} placeholder={i18nTOf("field_drumscribe_placeholder", "Song 1, Song 2…")} className="input" /></Field>
                {addSongPlay && (
                  <SongLogger
                    songs={songs || []}
                    songPlays={songPlays || []}
                    addSong={addSong}
                    addSongPlay={addSongPlay}
                    fuzzyMatch={fuzzyMatch}
                    todayIso={TODAY_ISO}
                    onSongLogged={(title) => {
                      // Auto-sync the picker into the typed-songList
                      // field so the parent doesn't have to remember to
                      // type what they just tapped. Idempotent — already-
                      // present titles aren't re-appended.
                      setSongList((prev) => {
                        const t = (prev || "").trim();
                        if (t.toLowerCase().includes(title.toLowerCase())) return prev;
                        return t ? `${t}, ${title}` : title;
                      });
                    }}
                  />
                )}
                <div className="bg-amber-50 rounded-2xl p-3 text-xs text-amber-700">{i18nTOf("field_drums_goal_hint", "🎯 Goal: 1 hour · Stretch: 2 hours. Parent can adjust stars for effort.")}</div>
                <div>
                  <div className="text-xs font-semibold text-slate-500 mb-1">
                    {i18nTOf("field_screenshots", "Screenshots / photos")} <span className="font-normal text-slate-400">({photos.length}/{MAX_PHOTOS})</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {photos.map((p, i) => (<PhotoThumbnail key={i} photo={p} onRemove={() => removePhotoAt(i)} />))}
                    {photos.length < MAX_PHOTOS && (
                      <label className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-200 grid place-items-center cursor-pointer hover:bg-slate-50 shrink-0">
                        {uploading
                          ? <span className="text-[10px] text-slate-400">{i18nTOf("ts_uploading_small", "Uploading…")}</span>
                          : <Camera size={20} className="text-slate-300" />}
                        <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
                      </label>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Optional photo upload — available on EVERY task type
                that doesn't already have a required-photo or screenshot
                slot. Mike's rule: every chore/activity should let the
                parent attach a photo at log time. Laundry, Make Bed,
                Reading — they all benefit from visual proof in the
                portfolio + done area. Uses the same `photo` state that
                isPhoto/isDrums use, so doSubmit packs it into proof
                regardless of task type. */}
            {!isPhoto && !isDrums && (
              <div>
                <div className="text-xs font-semibold text-slate-500 mb-1">
                  {i18nTOf("field_photos_optional", "Photos (optional)")} <span className="font-normal text-slate-400">({photos.length}/{MAX_PHOTOS})</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {photos.map((p, i) => (<PhotoThumbnail key={i} photo={p} onRemove={() => removePhotoAt(i)} />))}
                  {photos.length < MAX_PHOTOS && (
                    <label className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-200 grid place-items-center cursor-pointer hover:bg-slate-50 shrink-0">
                      {uploading
                        ? <span className="text-[10px] text-slate-400">{i18nTOf("ts_uploading_small", "Uploading…")}</span>
                        : <Camera size={20} className="text-slate-300" />}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFile}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            )}

            {/* "Also use this as the book cover" — visible only for a
                reading task with a photo attached and a book that has
                no cover yet (or a brand-new typed title). Mike's rule:
                a photo of Reznor reading and the book's official cover
                are different artifacts; the library only shows the
                official cover. This one tap lets the parent declare
                intent without uploading the same file twice. */}
            {isReading && photo && (() => {
              const bookHasNoCover = pickedBook
                ? !pickedBook.customCoverPath && !pickedBook.coverUrl
                : !!bookTitle.trim(); // new book = no cover yet
              if (!bookHasNoCover) return null;
              return (
                <label className="flex items-start gap-2 text-[12px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl p-2.5 mt-1">
                  <input
                    type="checkbox"
                    checked={useAsBookCover}
                    onChange={(e) => setUseAsBookCover(e.target.checked)}
                    className="w-4 h-4 mt-0.5"
                  />
                  <span>
                    {i18nTOf("ts_also_cover_label", "Also use this as the book's cover")}
                    <span className="block text-[11px] font-normal text-indigo-600/80 mt-0.5">
                      {i18nTOf("ts_also_cover_hint", "Only do this if the photo IS the book cover (not the kid reading). The Reading Library will show it.")}
                    </span>
                  </span>
                </label>
              );
            })()}

            <Field label={i18nTOf("field_note_optional", "Note (optional)")}><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="input resize-none" placeholder={i18nTOf("field_note_placeholder", "Anything to tell a grown-up?")} /></Field>

            {!ready && <div className="text-xs text-rose-500 flex items-center gap-1"><AlertCircle size={13} /> {gateMsg}</div>}

            <button disabled={!ready} onClick={doSubmit}
              className={`w-full py-4 rounded-2xl font-extrabold text-white text-base transition ${
                ready
                  ? (canEdit ? "bg-indigo-600 active:scale-95" : "bg-emerald-500 active:scale-95")
                  : "bg-slate-200 text-slate-400"
              }`}>
              {canEdit
                ? i18nTOf("act_save_changes", "Save changes 💾")
                : (task.approvalRequired ? i18nTOf("act_submit_for_stars", "Submit for Stars ⭐") : i18nTOf("act_mark_done", "Mark Done ✓"))}
            </button>
            {/* Save progress — keeps everything entered so far as a
                draft. No streak bump, no stars, no Approvals queue
                appearance. Reopen the task to pick up where you left
                off. Hidden in edit mode (the row is already submitted).
                Mike: Drums is 45min-2hr; he wants to log Drumeo first,
                come back later for Melodics, then add songs one at a
                time. */}
            {!canEdit && onSaveDraft && (
              <button
                type="button"
                onClick={doSaveDraft}
                disabled={uploading}
                className={`w-full mt-2 py-3 rounded-2xl font-bold text-sm transition ${
                  uploading
                    ? "bg-slate-100 text-slate-400"
                    : "bg-amber-50 text-amber-700 border border-amber-200 active:scale-95"
                }`}
              >
                {i18nTOf("act_save_progress", "💾 Save progress — come back later")}
              </button>
            )}
            <button onClick={handleClose} className="w-full py-2 text-slate-400 text-sm font-semibold">{i18nTOf("act_cancel", "Cancel")}</button>
          </div>
        )}
        {alreadyApproved && !canEdit && <button onClick={handleClose} className="w-full py-3 mt-4 text-slate-400 text-sm font-semibold">{i18nTOf("act_close", "Close")}</button>}
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
          <div className="w-8 text-center">{i18nTOf("ds_wk_short", "Wk")}</div>
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
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full" style={{ background: color }} /> {i18nTOf("ds_legend_did_it", "did it")}</span>
          <span>{i18nTOf("ds_legend_wk", "Wk = days that week")}</span>
        </div>
      </Card>
      <div className="grid grid-cols-3 gap-2 mt-3">
        <Card className="p-3 text-center"><div className="text-2xl font-extrabold" style={{ color }}>{weekDone}</div><div className="text-[11px] text-slate-400">{i18nTOf("ds_stat_this_week", "this week")}</div></Card>
        <Card className="p-3 text-center"><div className="text-2xl font-extrabold text-slate-700">{monthDone}</div><div className="text-[11px] text-slate-400">{i18nTOf("ril_this_month", "this month")}</div></Card>
        <Card className="p-3 text-center"><div className="text-2xl font-extrabold text-orange-500">🔥{s?.current ?? 0}</div><div className="text-[11px] text-slate-400">{i18nTOf("ds_stat_streak", "streak")}</div></Card>
      </div>
    </>
  );
}

function DetailSheet({ task, onClose, activities, streaks, completions, priorities, setPriority, clearPriority, updateTask, removeTask, setStreak, stopStreak, bumpStreak, taskNotes, addTaskNote, users, songs = [], songPlays = [] }) {
  const d = actFor(task, activities);
  const aid = task.activityId || TYPE_TO_ACT[task.activityType];
  const s = streaks[aid];
  const ov = priorities?.[task.id];
  const [note, setNote] = useState("");
  const [tab, setTab] = useState("stats");
  const notes = taskNotes?.[task.id] || [];
  const proofs = completions.filter((c) => c.taskId === task.id).flatMap((c) => (c.proof || []).filter((p) => p.path || p.url));
  const { handleClose, dragHandlers, backdropStyle, sheetStyle } = useBottomSheet({ onClose });

  // Drums-aware "Today's session" card — Mike's rule: tapping the drums
  // task ANYWHERE should show how long for Drumeo + Melodics + every
  // song played today. Pulls from the latest drums completion today
  // (any status: draft, pending, approved) so saved-drafts surface
  // their minutes immediately. Songs come from song_plays filtered to
  // today regardless of the completion — covers the case where Reznor
  // logged plays via the picker on the kid app without any completion
  // attached yet.
  const isDrumsTask = task.proofType === "drums" || /drum/i.test(task.activityType || "");
  const drumsSession = (() => {
    if (!isDrumsTask) return null;
    const todaysComp = completions
      .filter((c) => c.taskId === task.id && c.completionDate === TODAY_ISO)
      .sort((a, b) => (b.id || "").localeCompare(a.id || ""))[0];
    const drumeo = Number(todaysComp?.extra?.drumeo) || 0;
    const melodics = Number(todaysComp?.extra?.melodics) || 0;
    const todaysPlays = (songPlays || []).filter((p) => (p.playedOn || p.played_on) === TODAY_ISO);
    const byId = Object.fromEntries((songs || []).map((s) => [s.id, s]));
    const songTitles = todaysPlays.map((p) => {
      const s = byId[p.songId || p.song_id];
      return s ? (s.canonicalTitle || s.title || "(unknown)") : "(unknown)";
    });
    return {
      drumeo,
      melodics,
      totalMin: drumeo + melodics,
      songCount: todaysPlays.length,
      songTitles,
      status: todaysComp?.status || null,
    };
  })();

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
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
              <div className="font-extrabold text-lg leading-tight">{i18nTitleOf(task)}</div>
              <div className="text-[12px] opacity-90">{d.label} · {task.starValue}⭐{task.required ? i18nTOf("ds_required", " · required") : i18nTOf("ds_optional", " · optional")}</div>
            </div>
            <button onClick={handleClose} className="w-8 h-8 rounded-full bg-white/20 grid place-items-center"><X size={18} /></button>
          </div>
          <div className="flex">
            {[
              ["stats", i18nTOf("ds_tab_stats",  "Stats")],
              ["media", i18nTOf("ds_tab_photos", "Photos")],
              ["notes", i18nTOf("ds_tab_notes",  "Notes")],
              ["edit",  i18nTOf("ds_tab_edit",   "Edit")],
            ].map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} className={`flex-1 py-2.5 text-sm font-bold ${tab === k ? "bg-slate-50 text-slate-800" : "text-white/80"}`} style={tab === k ? { borderTopLeftRadius: 0 } : {}}>{l}{k === "media" && proofs.length ? ` (${proofs.length})` : ""}{k === "notes" && notes.length ? ` (${notes.length})` : ""}</button>
            ))}
          </div>
        </div>

        <div className="p-4">
          {tab === "stats" && (
            <>
              {/* Drums Today — the data-and-stats card Mike wanted.
                  Renders ABOVE the streak strip + calendar so tapping
                  drums anywhere immediately shows what's been played.
                  Only renders when there's actual session data so we
                  don't show a wall of zeros on a fresh day. */}
              {drumsSession && (drumsSession.totalMin > 0 || drumsSession.songCount > 0) && (
                <div
                  className="rounded-3xl p-4 mb-3 text-white relative overflow-hidden border-2 border-white/15 shadow-xl"
                  style={{
                    background: "linear-gradient(135deg, #1e293b 0%, #4338ca 35%, #7c3aed 70%, #f97316 100%)",
                  }}
                >
                  <span aria-hidden="true" className="absolute pointer-events-none" style={{ left: "18%", top: "22%", color: "rgba(255,255,255,0.5)", fontSize: 12 }}>✦</span>
                  <span aria-hidden="true" className="absolute pointer-events-none" style={{ left: "72%", top: "20%", color: "rgba(255,255,255,0.4)", fontSize: 10 }}>✦</span>
                  <span aria-hidden="true" className="absolute pointer-events-none" style={{ left: "88%", top: "70%", color: "rgba(255,255,255,0.35)", fontSize: 14 }}>✦</span>
                  <div className="relative">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-white/80 font-extrabold flex items-center gap-1.5">
                        🥁 Today's drum session
                      </div>
                      {drumsSession.status === "draft" && (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-amber-200 bg-amber-500/30 rounded-full px-2 py-0.5 border border-amber-300/40">
                          draft
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="text-5xl font-extrabold tracking-tight leading-none" style={{ textShadow: "0 0 12px rgba(253,224,71,0.55)" }}>
                        {drumsSession.totalMin}
                      </span>
                      <span className="text-sm font-bold text-white/70">min total</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="rounded-2xl bg-white/15 backdrop-blur p-2.5 text-center border border-white/10">
                        <div className="text-xl font-extrabold leading-none">{drumsSession.drumeo}</div>
                        <div className="text-[9px] uppercase tracking-widest text-white/70 font-bold mt-1">Drumeo</div>
                      </div>
                      <div className="rounded-2xl bg-white/15 backdrop-blur p-2.5 text-center border border-white/10">
                        <div className="text-xl font-extrabold leading-none">{drumsSession.melodics}</div>
                        <div className="text-[9px] uppercase tracking-widest text-white/70 font-bold mt-1">Melodics</div>
                      </div>
                      <div className="rounded-2xl bg-white/15 backdrop-blur p-2.5 text-center border border-white/10">
                        <div className="text-xl font-extrabold leading-none">{drumsSession.songCount}</div>
                        <div className="text-[9px] uppercase tracking-widest text-white/70 font-bold mt-1">Songs</div>
                      </div>
                    </div>
                    {drumsSession.songTitles.length > 0 && (
                      <>
                        <div className="text-[10px] uppercase tracking-wider font-bold text-white/70 mb-1">
                          Played today
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {drumsSession.songTitles.map((t, i) => (
                            <span key={i} className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/15 backdrop-blur text-white border border-white/20">
                              🎸 {t}
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {s && <div className="grid grid-cols-2 gap-2 mb-3">
                <Card className="p-3 text-center"><div className="text-2xl font-extrabold text-orange-500">🔥{s.current}</div><div className="text-[11px] text-slate-400">{i18nTOf("ds_current_streak", "current streak")}</div></Card>
                <Card className="p-3 text-center"><div className="text-2xl font-extrabold text-slate-700">{s.longest}</div><div className="text-[11px] text-slate-400">{i18nTOf("ds_best_ever", "best ever")}</div></Card>
              </div>}
              <HistoryCalendar activityId={aid} color={d.color} streaks={streaks} />
              <div className="text-[11px] text-slate-400 px-1 mt-2">{i18nTOf("ds_stats_hint", "Filled = did it, connected across the week. The {wk} column shows how many days that week. Tap ‹ › to scroll months.").replaceAll("{wk}", i18nTOf("ds_wk_short", "Wk"))}</div>
            </>
          )}

          {tab === "media" && (
            <>
              {proofs.length === 0 && <Card className="p-6 text-center text-slate-400 text-sm">{i18nTOf("ds_no_media", "No photos or videos yet. A grown-up can snap one from the checklist — it'll show here with the date & place. 📷")}</Card>}
              <div className="grid grid-cols-2 gap-2">
                {proofs.map((p, i) => (
                  <div key={i} className="rounded-xl overflow-hidden">
                    <StoredPhoto path={p.path} url={p.url} alt="" className="w-full h-32 object-cover" fallback={<div className="w-full h-32 bg-slate-100 animate-pulse" />} />
                    {p.geo && <div className="text-[10px] text-slate-400 mt-0.5">📍 {p.geo.label}{p.time ? ` · ${p.time}` : ""}</div>}
                  </div>
                ))}
              </div>
              <div className="text-[11px] text-slate-400 px-1 mt-2">{i18nTOf("ds_media_hint", "Every photo you attach here joins the year-long portfolio.")}</div>
            </>
          )}

          {tab === "notes" && (
            <>
              <Card className="p-3 mb-2">
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder={i18nTOf("ds_note_ph", "Add a note about this — progress, what to work on, what the teacher said…")} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none" />
                <button onClick={() => { addTaskNote(task.id, note); setNote(""); }} disabled={!note.trim()} className={`w-full mt-2 py-2.5 rounded-xl font-bold text-sm text-white ${note.trim() ? "bg-indigo-600" : "bg-slate-200 text-slate-400"}`}>{i18nTOf("ds_add_note", "Add note")}</button>
              </Card>
              {notes.length === 0 && <p className="text-sm text-slate-400 px-1">{i18nTOf("empty_notes", "No notes yet.")}</p>}
              {notes.map((n, i) => (
                <Card key={i} className="p-3 mb-2 text-sm">
                  <div className="text-[11px] text-slate-400 mb-0.5">{users.find((u) => u.id === n.by)?.name || i18nTOf("ds_note_parent_fallback", "Parent")} · {n.time}</div>
                  {n.text}
                </Card>
              ))}
            </>
          )}

          {tab === "edit" && (
            <>
              <Card className="p-3 mb-2">
                <div className="flex items-center justify-between"><span className="text-sm font-semibold">{i18nTOf("ds_star_value", "Star value")}</span>
                  <div className="flex items-center gap-1"><input type="number" value={task.starValue} onChange={(e) => updateTask(task.id, { starValue: Number(e.target.value) })} className="w-16 border border-slate-200 rounded px-2 py-1 text-sm" /><span className="text-xs">⭐</span></div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <button onClick={() => updateTask(task.id, { required: !task.required })} className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${task.required ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-400"}`}>{task.required ? i18nTOf("manage_tasks_required", "Required") : i18nTOf("manage_tasks_optional", "Optional")}</button>
                  <button onClick={() => updateTask(task.id, { proofRequired: !task.proofRequired, proofType: !task.proofRequired ? (task.proofType || "photo") : task.proofType })} className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${task.proofRequired ? "bg-sky-100 text-sky-600" : "bg-slate-100 text-slate-400"}`}>{task.proofRequired ? i18nTOf("manage_tasks_needs_photo", "Needs photo") : i18nTOf("manage_tasks_no_proof", "No proof")}</button>
                </div>
              </Card>

              <Card className="p-3 mb-2">
                <div className="text-sm font-semibold mb-1">{i18nTOf("ds_priority", "Priority")}</div>
                <div className="flex gap-1.5 flex-wrap">
                  {[
                    ["must",  i18nTOf("mr_level_must",  "Non-negotiable")],
                    ["today", i18nTOf("mr_level_today", "Do today")],
                    ["extra", i18nTOf("mr_level_extra", "Extra credit")],
                  ].map(([k, l]) => <button key={k} onClick={() => setPriority(task.id, k, ov?.scope || "today")} className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={ov?.level === k ? { background: PRIORITY[k].dot, color: "#fff" } : { background: "#f1f5f9", color: "#64748b" }}>{l}</button>)}
                  <button onClick={() => clearPriority(task.id)} className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-400">{i18nTOf("ds_clear", "Clear")}</button>
                </div>
                {ov?.level && (
                  <div className="flex gap-1.5 flex-wrap mt-2">
                    {[
                      ["today",  i18nTOf("mr_scope_today",  "Today")],
                      ["week",   i18nTOf("mr_scope_week",   "This week")],
                      ["month",  i18nTOf("mr_scope_month",  "This month")],
                      ["always", i18nTOf("mr_scope_always", "Always")],
                    ].map(([k, l]) => <button key={k} onClick={() => setPriority(task.id, ov.level, k)} className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${ov.scope === k ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>{l}</button>)}
                  </div>
                )}
              </Card>

              <Card className="p-3 mb-2">
                <div className="text-sm font-semibold mb-2 flex items-center gap-1"><Flame size={15} className="text-orange-500" /> {i18nTOf("ds_streak", "Streak")}</div>
                {s ? (
                  <>
                    <div className="flex gap-2">
                      <label className="flex-1 text-[11px] font-semibold text-slate-500">{i18nTOf("ds_streak_current", "Current")}<input type="number" value={s.current} onChange={(e) => setStreak(aid, { current: Number(e.target.value) })} className="w-full mt-0.5 border border-slate-200 rounded-lg px-2 py-1 text-sm" /></label>
                      <label className="flex-1 text-[11px] font-semibold text-slate-500">{i18nTOf("ds_streak_best", "Best")}<input type="number" value={s.longest} onChange={(e) => setStreak(aid, { longest: Number(e.target.value) })} className="w-full mt-0.5 border border-slate-200 rounded-lg px-2 py-1 text-sm" /></label>
                    </div>
                    {/* Since date — visible + editable. Pinning a real
                        start date makes the streak honest: a kid will ask
                        "since when?" and the parent can answer with the
                        right Sunday instead of a guess. */}
                    <label className="block text-[11px] font-semibold text-slate-500 mt-2">
                      {i18nTOf("ds_streak_since", "Since")}
                      <input
                        type="date"
                        value={s.since || ""}
                        max={TODAY_ISO}
                        onChange={(e) => setStreak(aid, { since: e.target.value })}
                        className="w-full mt-0.5 border border-slate-200 rounded-lg px-2 py-1 text-sm"
                      />
                    </label>
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => bumpStreak(aid)} className="flex-1 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-bold">{i18nTOf("ds_streak_plus_one", "+1 day today")}</button>
                      <button onClick={() => stopStreak(aid)} className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-500 text-xs font-bold">{i18nTOf("ds_streak_stop", "Stop")}</button>
                    </div>
                  </>
                ) : (
                  <button onClick={() => setStreak(aid, { current: 0, longest: 0, since: TODAY_ISO, lastDate: "" })} className="text-[11px] font-bold text-orange-600">{i18nTOf("ds_streak_start", "Start tracking a streak →")}</button>
                )}
              </Card>

              <div className="flex gap-2">
                <button onClick={() => updateTask(task.id, { active: task.active === false })} className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm">{task.active === false ? i18nTOf("ds_unpause_task", "Un-pause task") : i18nTOf("ds_pause_task", "Pause task")}</button>
                <button onClick={() => removeTask(task.id)} className="px-4 py-2.5 rounded-xl bg-rose-100 text-rose-600 font-bold text-sm flex items-center gap-1"><X size={15} /> {i18nTOf("ds_remove_task", "Remove")}</button>
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
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-slate-50 rounded-t-3xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 z-10 p-4 text-white flex items-center gap-3" style={{ background: activity.color }}>
          <div className="w-11 h-11 rounded-2xl bg-white/20 grid place-items-center text-xl">{PILLARS[activity.pillar]?.emoji}</div>
          <div className="flex-1 min-w-0"><div className="font-extrabold text-lg leading-tight">{i18nNameOf(activity)}</div><div className="text-[12px] opacity-90">{i18nTOf("ps_subtitle", "progress & consistency")}</div></div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 grid place-items-center"><X size={18} /></button>
        </div>
        <div className="p-4">
          <HistoryCalendar activityId={activity.id} color={activity.color} streaks={streaks} />
          <div className="text-[11px] text-slate-400 px-1 mt-2">{i18nTOf("ps_hint", "Filled = did it. The {wk} column shows how many days that week — spot which weeks ran hot. 🔥").replaceAll("{wk}", i18nTOf("ds_wk_short", "Wk"))}</div>
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
        <div className="text-sm opacity-90">{i18nTOf("rk_bank_subtitle", "in your star bank")}</div>
      </div>
      <SectionTitle icon={<Trophy size={16} className="text-amber-500" />}>{i18nTOf("sec_rewards_to_work", "Rewards to work toward")}</SectionTitle>
      {sorted.map((r) => {
        const afford = starBank >= r.starCost;
        const remaining = r.starCost - starBank;
        const reqd = redemptions.find((x) => x.rewardId === r.id);
        const statusLabel = reqd?.status === "requested" ? i18nTOf("rk_asked", "Asked!")
          : reqd?.status === "approved" ? i18nTOf("rk_status_approved", "approved")
          : reqd?.status === "denied" ? i18nTOf("rk_status_denied", "denied")
          : reqd?.status === "declined" ? i18nTOf("rk_status_declined", "declined")
          : (reqd?.status || "");
        return (
          <Card key={r.id} className="p-4 mb-2.5 flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-violet-100 grid place-items-center text-xl">🎁</div>
            <div className="flex-1">
              <div className="font-bold text-sm">{r.title}</div>
              <div className="text-[11px] text-slate-400">{afford ? i18nTOf("rk_can_get", "You can get this! 🎉") : i18nTOf("rk_more_to_go", "{n} more ⭐ to go").replaceAll("{n}", remaining)}</div>
              {!afford && <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-violet-400" style={{ width: `${Math.min(100, (starBank / r.starCost) * 100)}%` }} /></div>}
            </div>
            <div className="text-right">
              <StarPill n={r.starCost} tone={afford ? "emerald" : "slate"} />
              {afford && !reqd && <button onClick={() => requestReward(r)} className="block mt-1 text-[11px] font-bold text-violet-600">{i18nTOf("rk_ask", "Ask →")}</button>}
              {reqd && <div className="text-[10px] mt-1 font-semibold text-amber-600">{statusLabel}</div>}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function KidStars({ completions, tasks, starBank, earnedToday, pendingStars, gifted, activities, todaysTasks, compByTask, streaks, books, songs, songPlays, removeSongPlay, updateSongPlay, setStatDetailId, topPriorities, taskNaDays, user, songPlayRequests, requestSongPlayChange }) {
  const approved = completions.filter((c) => c.status === "approved");
  const treasureStreak = computeTreasureStreak({ completions, tasks: tasks || [], topPriorities, taskNaDays });
  const ctx = buildAchCtx({ completions, todaysTasks: todaysTasks || [], compByTask: compByTask || {}, starBank, streaks, books, treasureStreak });
  const dayWins = ACHIEVEMENTS.filter((a) => a.kind === "day");
  const trophies = ACHIEVEMENTS.filter((a) => a.kind === "trophy");
  const wonToday = dayWins.filter((a) => a.test(ctx)).length;
  return (
    <div className="px-4 pt-4">
      <PiggyBank stars={starBank} kidName={user?.name} />
      <div className="grid grid-cols-2 gap-2 mt-3">
        <BigStat label={i18nTOf("stat_earned_today", "Earned today")} value={earnedToday} onClick={() => setStatDetailId?.("earned")} />
        <BigStat label={i18nTOf("stat_pending_short", "Pending")} value={pendingStars} onClick={() => setStatDetailId?.("pending")} />
      </div>

      <SectionTitle icon={<Sparkles size={16} className="text-amber-500" />}>{i18nTOf("sec_todays_wins", "Today's wins")} <span className="text-[11px] font-normal text-slate-400">· {wonToday}/{dayWins.length}</span></SectionTitle>
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

      <MostPlayedSongs
        songs={songs || []}
        songPlays={songPlays || []}
        removeSongPlay={removeSongPlay}
        updateSongPlay={updateSongPlay}
        role={user?.role}
        songPlayRequests={songPlayRequests || []}
        requestSongPlayChange={requestSongPlayChange}
      />

      <SectionTitle icon={<Medal size={16} className="text-violet-500" />}>{i18nTOf("sec_trophy_case", "Trophy case")}</SectionTitle>
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
      <p className="text-[11px] text-slate-400 px-1 mt-2">{i18nTOf("ks_trophy_footer", "Win badges every single day — even before the big rewards. 🎉")}</p>

      <SectionTitle icon={<Award size={16} className="text-emerald-500" />}>{i18nTOf("sec_stars_earned", "Stars I've earned")}</SectionTitle>
      {approved.length === 0 && (gifted?.length || 0) === 0 && (
        <p className="text-sm text-slate-400 px-1">{i18nTOf("empty_approved_kid", "Nothing approved yet — go finish a mission! 🚀")}</p>
      )}
      {/* Single unified timeline — completions AND bonus gifts grouped
          by date, newest day first. Within a day, rows sort newest first
          via id-desc. Each day gets a bilingual Today/Yesterday/weekday
          header and a per-day star total. Mike's rule: "bonus stars
          shouldn't be separated. They need to be included in the day
          they were created to be grouped with everything else." */}
      {(() => {
        const items = [];
        for (const c of (approved || [])) {
          items.push({ kind: "completion", date: c.completionDate || "", id: c.id, stars: c.awardedStars || 0, c });
        }
        for (const g of (gifted || [])) {
          items.push({ kind: "gift", date: g.date || "", id: g.id, stars: Number(g.stars) || 0, g });
        }
        if (items.length === 0) return null;
        const buckets = new Map();
        for (const it of items) {
          if (!buckets.has(it.date)) buckets.set(it.date, []);
          buckets.get(it.date).push(it);
        }
        const days = [...buckets.entries()].sort((a, b) => (b[0] || "").localeCompare(a[0] || ""));
        return days.map(([iso, rows]) => {
          const sorted = [...rows].sort((a, b) => (b.id || "").localeCompare(a.id || ""));
          const dayTotal = sorted.reduce((s, r) => s + (r.stars || 0), 0);
          return (
            <div key={iso || "no-date"}>
              <div className="flex items-baseline justify-between px-1 mt-3 mb-1.5">
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700">
                  {iso ? fmtBilingualDay(iso) : i18nTOf("ks_undated", "Undated")}
                </div>
                <div className="text-[11px] font-extrabold text-emerald-700 tabular-nums">+{dayTotal}⭐</div>
              </div>
              {sorted.map((it) => {
                if (it.kind === "gift") {
                  const g = it.g;
                  const gTask = g.extra?.taskId ? tasks.find((t) => t.id === g.extra.taskId) : null;
                  const gAct = g.extra?.activityId
                    ? activities.find((a) => a.id === g.extra.activityId)
                    : (gTask
                        ? activities.find((a) => a.id === (gTask.activityId
                            || gTask.activityType?.toLowerCase().replace(/\s/g, "_")))
                        : null);
                  return (
                    <Card key={`g-${g.id}`} className="p-3 mb-2 flex items-center gap-3 border-amber-100 bg-amber-50/40">
                      <ProofThumb gift={g} activity={gAct} task={gTask} books={books} songs={songs} songPlays={songPlays} size={36} />
                      <div className="flex-1 text-sm font-semibold flex flex-col">
                        <span className="flex items-center gap-1">
                          <Sparkles size={11} className="text-amber-500 shrink-0" />
                          {g.label || i18nTOf("ks_bonus_fallback", "Bonus")}
                        </span>
                        <span className="text-[11px] text-slate-400 font-normal">
                          {i18nTOf("ks_bonus_prefix", "bonus")}{gTask ? ` · ${i18nTitleOf(gTask)}` : ""}
                        </span>
                      </div>
                      <StarPill n={g.stars} tone="emerald" />
                    </Card>
                  );
                }
                const c = it.c;
                const t = tasks.find((x) => x.id === c.taskId);
                const a = actFor(t || { activityType: "" }, activities);
                return (
                  <Card key={`c-${c.id}`} className="p-3 mb-2 flex items-center gap-3">
                    <ProofThumb completion={c} activity={a} task={t} books={books} songs={songs} songPlays={songPlays} size={36} />
                    <div className="flex-1 text-sm font-semibold">{i18nTitleOf(t)}{c.extra?.bookTitle && <span className="block text-[11px] text-slate-400 font-normal">{c.extra.bookTitle}</span>}</div>
                    <StarPill n={c.awardedStars} tone="emerald" />
                  </Card>
                );
              })}
            </div>
          );
        });
      })()}
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
function MostPlayedSongs({ songs, songPlays, removeSongPlay, updateSongPlay, role, songPlayRequests = [], requestSongPlayChange }) {
  const [openId, setOpenId] = useState(null);
  // Whole-section collapse. Default collapsed so the Stars view starts
  // tight; a tap on the header expands it. Mike asked for this so
  // Krissie / Reznor can scan the page without 10 song rows dominating.
  const [collapsed, setCollapsed] = useState(true);
  // Per-play edit state — only one row at a time, so a single id is
  // enough. Draft holds the unsaved date + notes so cancel can bail
  // without touching the database.
  const [editingPlayId, setEditingPlayId] = useState(null);
  const [draft, setDraft] = useState({ playedOn: "", notes: "" });
  // Kid-vs-parent gating. A six-year-old should not be one tap from
  // wiping a real practice session. For kid role both × and pencil
  // become "request a change" — the mutation only fires when a parent
  // approves it in the Approvals queue. Parent role keeps the direct
  // mutate behavior, since the parent is the authority on the data.
  const isKid = role === "kid";
  // Index of plays with an outstanding request, so we can hide the
  // action buttons and surface a "waiting on parent" pill.
  const pendingByPlayId = {};
  for (const r of songPlayRequests) {
    if (r.playId) pendingByPlayId[r.playId] = r;
  }
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
    .map(([songId, g]) => ({ song: byId[songId] || { id: songId, title: i18nTOf("mps_missing_song", "(missing)") }, ...g }))
    .sort((a, b) => (b.count - a.count) || ((b.last || "").localeCompare(a.last || "")))
    .slice(0, 10);
  if (ranked.length === 0) {
    return (
      <>
        <SectionTitle icon={<Music size={16} className="text-violet-500" />}>{i18nTOf("sec_most_played", "Most played songs")}</SectionTitle>
        <Card className="p-3 text-center text-xs text-slate-400">{i18nTOf("mps_no_songs", "No songs logged yet. Tap drums → log one!")}</Card>
      </>
    );
  }
  // Total plays for the chip in the collapsed header — quick scan of
  // "how much practice is in here?" without expanding.
  const totalPlays = songPlays.length;
  return (
    <>
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center justify-between mt-5 mb-2 px-1 text-left"
      >
        <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
          <Music size={16} className="text-violet-500" />
          {i18nTOf("mps_section", "Most played songs")}
          <span className="text-[11px] font-normal text-slate-400">· {i18nTOf("mps_top_n", "top {n}").replaceAll("{n}", ranked.length)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400">
          <span className="text-[11px] font-bold text-violet-600 bg-violet-50 rounded-full px-2 py-0.5">
            {totalPlays} {totalPlays === 1 ? i18nTOf("mps_plays_one", "play") : i18nTOf("mps_plays_many", "plays")}
          </span>
          <ChevronLeft size={14} className={`transition-transform ${collapsed ? "-rotate-90" : "rotate-90"}`} />
        </div>
      </button>
      {!collapsed && (
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
                      {song.artist || ""}{song.artist && last ? " · " : ""}{last ? i18nTOf("mps_last", "last: {date}").replaceAll("{date}", fmtShort(last)) : ""}
                    </div>
                  )}
                </div>
                <div className="text-xs font-extrabold text-violet-600 bg-violet-50 rounded-full px-2.5 py-1">
                  {count}×
                </div>
              </button>
              {open && (
                <div className="border-t border-slate-100 px-3 py-2 bg-slate-50">
                  <div className="text-[11px] font-bold text-slate-500 mb-1">{i18nTOf("mps_play_history", "Play history")}</div>
                  <div className="space-y-1">
                    {plays
                      .slice()
                      .sort((a, b) => (b.playedOn || "").localeCompare(a.playedOn || ""))
                      .slice(0, 20)
                      .map((p) => {
                        const isEditing = editingPlayId === p.id;
                        if (isEditing) {
                          return (
                            <div key={p.id} className="bg-white rounded-lg p-2 border border-indigo-200">
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <input
                                  type="date"
                                  value={draft.playedOn}
                                  onChange={(e) => setDraft((d) => ({ ...d, playedOn: e.target.value }))}
                                  className="text-[11px] border border-slate-200 rounded px-1.5 py-1 flex-1 min-w-0"
                                />
                              </div>
                              <input
                                type="text"
                                value={draft.notes}
                                onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                                placeholder={i18nTOf("mps_notes_ph", "Notes (optional)…")}
                                className="text-[11px] border border-slate-200 rounded px-1.5 py-1 w-full mb-1.5"
                              />
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!draft.playedOn) return;
                                    if (isKid) {
                                      requestSongPlayChange(p.id, "update", { playedOn: draft.playedOn, notes: draft.notes });
                                    } else {
                                      updateSongPlay(p.id, { playedOn: draft.playedOn, notes: draft.notes });
                                    }
                                    setEditingPlayId(null);
                                  }}
                                  className="flex-1 text-[10px] font-bold bg-indigo-600 text-white rounded py-1 active:scale-95"
                                >
                                  {isKid ? i18nTOf("mps_ask_parent", "Ask parent") : i18nTOf("mps_save", "Save")}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingPlayId(null)}
                                  className="flex-1 text-[10px] font-bold bg-slate-200 text-slate-700 rounded py-1 active:scale-95"
                                >
                                  {i18nTOf("mps_cancel", "Cancel")}
                                </button>
                              </div>
                            </div>
                          );
                        }
                        const pendingReq = pendingByPlayId[p.id];
                        return (
                          <div key={p.id} className="flex items-center justify-between text-[11px] text-slate-600">
                            <span className="truncate">{fmtShort(p.playedOn)}{p.notes ? ` — ${p.notes}` : ""}</span>
                            <div className="flex items-center gap-1 shrink-0">
                              {pendingReq ? (
                                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-full px-2 py-0.5">
                                  {pendingReq.kind === "remove" ? i18nTOf("mps_pending_remove", "⏳ remove pending") : i18nTOf("mps_pending_edit", "⏳ edit pending")}
                                </span>
                              ) : (
                                <>
                                  {updateSongPlay && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingPlayId(p.id);
                                        setDraft({ playedOn: p.playedOn || TODAY_ISO, notes: p.notes || "" });
                                      }}
                                      className="text-slate-300 hover:text-indigo-500"
                                      title={i18nTOf("mps_edit_play", "Edit this play")}
                                    >
                                      <Pencil size={11} />
                                    </button>
                                  )}
                                  {removeSongPlay && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const songTitle = song.canonicalTitle || song.title || i18nTOf("mps_this_song", "this song");
                                        const when = p.playedOn ? fmtShort(p.playedOn) : i18nTOf("mps_unknown_date", "an unknown date");
                                        const notesPart = p.notes ? `\n${p.notes}` : "";
                                        const askMsg = i18nTOf("mps_confirm_ask", "Ask a parent to remove this play?\n\n\"{song}\" — {when}{notes}\n\nIt'll show up in the parent's Approval queue. The play count won't change until they approve.")
                                          .replaceAll("{song}", songTitle).replaceAll("{when}", when).replaceAll("{notes}", notesPart);
                                        const removeMsg = i18nTOf("mps_confirm_remove", "Remove this play?\n\n\"{song}\" — {when}{notes}\n\nThe play count drops by 1 and this can't be undone.")
                                          .replaceAll("{song}", songTitle).replaceAll("{when}", when).replaceAll("{notes}", notesPart);
                                        if (isKid) {
                                          if (window.confirm(askMsg)) {
                                            requestSongPlayChange(p.id, "remove", null);
                                          }
                                        } else {
                                          if (window.confirm(removeMsg)) {
                                            removeSongPlay(p.id);
                                          }
                                        }
                                      }}
                                      className="text-slate-300 hover:text-rose-500"
                                      title={isKid ? i18nTOf("mps_ask_remove", "Ask parent to remove this play") : i18nTOf("mps_remove_play", "Remove this play")}
                                    >
                                      <X size={12} />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
      )}
    </>
  );
}

// StillTodoOnboarding — fills the "Still to do" slot when the family
// has no Top N curated yet. Mike's bug 2026-06-15: the section was
// happily declaring "✨ Top 8 complete — treasure ready to open!" on
// an account with literally zero tasks set up — a false celebration
// that confuses brand-new parents and breaks trust. Instead this card
// walks them straight to the two places they need to go (chores,
// activities) plus lets them set HOW MANY required tasks per day in
// one tap, so they don't have to leave to find a settings page.
function StillTodoOnboarding({ tasks = [], activities = [], dailyRequiredCount, setDailyRequiredCount, setTab, setPendingMoreSub }) {
  const hasTasks = (tasks || []).length > 0;
  const hasActiveActivities = (activities || []).some((a) => a.status === "active");
  const go = (subKey) => { setPendingMoreSub?.(subKey); setTab?.("more"); };
  const countChoices = [3, 5, 7, 8, 10];
  return (
    <Card className="p-4 mb-3 bg-gradient-to-br from-amber-50 to-rose-50 border-amber-200">
      <div className="flex items-start gap-2 mb-2">
        <span className="text-2xl shrink-0">🌱</span>
        <div>
          <div className="font-extrabold text-sm">Let's set up today's to-dos</div>
          <div className="text-[11px] text-slate-600 leading-snug mt-0.5">
            Add some chores and activities so your kid has a real list to work through. You can always change these later.
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-2">
        <button
          type="button"
          onClick={() => go("tasks")}
          className={`text-left rounded-xl px-3 py-2.5 border ${hasTasks ? "bg-emerald-50 border-emerald-200" : "bg-white border-slate-200"} active:scale-[0.98]`}
        >
          <div className="text-lg leading-none mb-1">{hasTasks ? "✅" : "🧹"}</div>
          <div className="text-[12px] font-extrabold">Add chores &amp; tasks</div>
          <div className="text-[10px] text-slate-500 leading-snug">Daily missions that earn stars.</div>
        </button>
        <button
          type="button"
          onClick={() => go("activities")}
          className={`text-left rounded-xl px-3 py-2.5 border ${hasActiveActivities ? "bg-emerald-50 border-emerald-200" : "bg-white border-slate-200"} active:scale-[0.98]`}
        >
          <div className="text-lg leading-none mb-1">{hasActiveActivities ? "✅" : "🎯"}</div>
          <div className="text-[12px] font-extrabold">Add activities</div>
          <div className="text-[10px] text-slate-500 leading-snug">Drums, swim, anything regular.</div>
        </button>
      </div>
      <div className="mt-3 rounded-xl bg-white/70 border border-amber-200 p-2.5">
        <div className="text-[10px] uppercase tracking-wider font-bold text-amber-700 mb-1.5">
          How many to-dos per day?
        </div>
        <div className="flex flex-wrap gap-1.5 items-center">
          {countChoices.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setDailyRequiredCount?.(n)}
              className={`text-[12px] font-extrabold px-3 py-1.5 rounded-full ${dailyRequiredCount === n ? "bg-amber-500 text-white" : "bg-white border border-amber-200 text-amber-700"}`}
            >
              {n}
            </button>
          ))}
          <span className="text-[10px] text-slate-500 ml-1">
            (currently {dailyRequiredCount})
          </span>
        </div>
        <div className="text-[10px] text-slate-500 mt-1.5 leading-snug">
          This is the count we celebrate as "complete." Easy to change anytime — just tap a different number.
        </div>
      </div>
    </Card>
  );
}

// ===================== PARENT: TODAY =====================
function ParentToday({ todaysTasks, compByTask, availableToday, earnedToday, pendingStars, starBank, handoff, users, mode, setMode, priorities, setPriority, clearPriority, giftStars, gifted = [], user, activities, streaks, setDetailId, setOpenCompletionId, onEasy, undoTask, setOpenTask, setStatDetailId, decide, todaysNATasks = [], markTaskNA, restoreTaskFromNA, pinnedBonus = {}, pinTaskToToday, unpinTaskFromToday, todayOrder = { mustDo: [], bonus: [] }, setTodayOrder, tasks = [], books = [], songs = [], songPlays = [], familyId, addBook, addSong, updateBook, todaysTopEight = [], langs = ["en"], nextRewardTitle = "", nextRewardCost = 0, bigRewardTitle = "", bigRewardCost = 0, rewards = [], events = [], completions = [], setTab, setPendingMoreSub, dailyCheckins = [], dailyRequiredCount = 8, setDailyRequiredCount }) {
  const [showAddPicker, setShowAddPicker] = useState(false);
  // Reorder mode is per-section so flipping it on for Bonus
  // doesn't add nudge buttons to Still-to-do too. Same pattern as
  // the MusicLibrary/ReadingLibrary shelf "Rearrange" toggle.
  const [reorderMustDo, setReorderMustDo] = useState(false);
  const [reorderBonus, setReorderBonus] = useState(false);
  // Apply the parent's saved per-section order. Listed IDs come
  // first in the saved order; unsaved tasks fall after, in natural
  // order. Missing tasks (deleted, moved sections) are silently
  // skipped.
  const applyOrder = (list, savedIds) => {
    if (!Array.isArray(savedIds) || savedIds.length === 0) return list;
    const byId = Object.fromEntries(list.map((t) => [t.id, t]));
    const seen = new Set();
    const out = [];
    for (const id of savedIds) {
      const t = byId[id];
      if (t && !seen.has(id)) { out.push(t); seen.add(id); }
    }
    for (const t of list) {
      if (!seen.has(t.id)) { out.push(t); seen.add(t.id); }
    }
    return out;
  };
  // moveInSection — used by the ↑ / ↓ nudge buttons in reorder mode.
  // Writes a fresh ordered ID array to todayOrder.section so the
  // saved order updates instantly.
  const moveInSection = (section, list, fromIdx, toIdx) => {
    if (!setTodayOrder) return;
    if (fromIdx === toIdx || toIdx < 0 || toIdx >= list.length) return;
    const next = list.slice();
    const [m] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, m);
    const ids = next.map((t) => t.id);
    setTodayOrder({ ...(todayOrder || {}), [section]: ids });
  };
  const resetSectionOrder = (section) => {
    if (!setTodayOrder) return;
    setTodayOrder({ ...(todayOrder || {}), [section]: [] });
  };
  const done = todaysTasks.filter((t) => compByTask[t.id]?.status === "approved");
  const pending = todaysTasks.filter((t) => compByTask[t.id]?.status === "pending");
  const todoRaw = todaysTasks.filter((t) => !compByTask[t.id] || ["not_started", "needs_fix", "draft"].includes(compByTask[t.id]?.status));
  const todo = sortByLevel(todoRaw, mode, priorities);
  // QuickStart guide for brand-new families. Shows until the parent
  // has logged their first completion. Each row deep-links to the
  // matching More sub-page via pendingMoreSub + setTab so it's a
  // single tap from "what do I do" to "I'm doing it."
  const hasCompletions = (completions || []).length > 0;
  const hasActiveActivities = (activities || []).some((a) => a.status === "active");
  const hasTasks = (tasks || []).length > 0;
  const hasRewards = (rewards || []).filter((r) => r.active !== false).length > 0;
  const hasCalendarEntries = (events || []).length > 0;
  const hasInvitedFamily = (users || []).some((u) => u.role !== "parent" && u.email);
  const allDone = hasActiveActivities && hasTasks && hasRewards && hasCalendarEntries && hasInvitedFamily;
  const showQuickStart = !hasCompletions && !allDone && setTab && setPendingMoreSub;
  const go = (subKey) => { setPendingMoreSub(subKey); setTab("more"); };

  return (
    <div className="px-4 pt-4">
      <div className="flex items-center justify-between px-1">
        <div className="text-xs text-slate-400">{fmtDate(today)}</div>
        {onEasy && <button onClick={onEasy} className="text-[11px] font-bold text-amber-600 bg-amber-50 rounded-full px-2.5 py-1 flex items-center gap-1">{i18nTOf("pt_easy_mode", "😴 Easy mode")}</button>}
      </div>

      {showQuickStart && (
        <Card className="p-4 mt-3 bg-gradient-to-br from-indigo-50 to-violet-50 border-indigo-100">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">👋</span>
            <div className="font-extrabold text-sm">Welcome — let's set up {user?.name || "your kid"}</div>
          </div>
          <div className="text-[11px] text-slate-500 mb-3 leading-snug">Five quick steps. Tap each to jump straight there. This card disappears as soon as your kid logs their first completion.</div>
          <div className="space-y-1.5">
            {[
              { sub: "people",     icon: "👨‍👩‍👧", title: "Invite your family", done: hasInvitedFamily,    hint: "Spouse, helpers, grandparents, the kid's own login — one-tap text/email invite per person." },
              { sub: "activities", icon: "🎯", title: "Add activities",  done: hasActiveActivities, hint: "From presets or Custom — drums, jujitsu, reading, anything." },
              { sub: "tasks",      icon: "🧹", title: "Add tasks + chores", done: hasTasks,        hint: "Daily missions and household chores that earn stars." },
              { sub: "rewards",    icon: "🎁", title: "Set a reward",     done: hasRewards,         hint: "What's the kid working toward? Movie, toy, day-out." },
              { sub: "calendar",   icon: "📅", title: "Drop the weekly schedule", done: hasCalendarEntries, hint: "Recurring practices, lessons, school stuff.", tab: "calendar" },
            ].map((r) => (
              <button
                key={r.sub}
                onClick={() => r.tab ? setTab(r.tab) : go(r.sub)}
                className={`w-full text-left flex items-start gap-2 rounded-xl px-3 py-2 ${r.done ? "bg-emerald-50 border border-emerald-200" : "bg-white border border-slate-100"}`}
              >
                <span className="text-lg shrink-0">{r.done ? "✅" : r.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold">{r.title}</div>
                  <div className="text-[10px] text-slate-500 leading-snug">{r.hint}</div>
                </div>
                <span className="text-slate-300 shrink-0 text-sm">›</span>
              </button>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-2 mt-2">
        <SummaryStat label={i18nTOf("stat_stars_available", "Stars available today")} value={availableToday} tone="slate" onClick={() => setStatDetailId?.("available")} />
        <SummaryStat label={i18nTOf("stat_earned_today", "Earned today")} value={earnedToday} tone="emerald" onClick={() => setStatDetailId?.("earned")} />
        <SummaryStat label={i18nTOf("stat_pending_approval", "Pending approval")} value={pendingStars} tone="amber" onClick={() => setStatDetailId?.("pending")} />
        <SummaryStat label={i18nTOf("stat_total_bank", "Total star bank")} value={starBank} tone="violet" onClick={() => setStatDetailId?.("bank")} />
      </div>

      <StreakStrip streaks={streaks} activities={activities} />

      {/* Coming up — birthday celebration card. Only renders when at
          least one family member has a birthday within 7 days, so
          it never competes with streak data unless it's actually
          imminent. */}
      {(() => {
        const upcoming = upcomingBirthdays(users || [], 7);
        if (upcoming.length === 0) return null;
        return (
          <Card className="p-3 mt-3 bg-gradient-to-br from-amber-50 to-rose-50 border-amber-200">
            <div className="text-[11px] uppercase tracking-wider font-bold text-amber-700 mb-1.5">🎂 Coming up</div>
            {upcoming.map(({ profile: p, info }) => (
              <div key={p.id} className="flex items-center gap-2 py-0.5">
                <span className="font-bold text-sm flex-1 truncate">{p.name}</span>
                <span className={`text-[11px] font-bold ${info.isToday ? "text-rose-600" : "text-slate-600"}`}>
                  {info.isToday ? "🎉 Today!" : `in ${info.daysUntil} day${info.daysUntil === 1 ? "" : "s"}`}
                </span>
              </div>
            ))}
          </Card>
        );
      })()}

      {/* Per-kid 7-day mood strip. Renders only when at least one
          check-in exists for the family. Tiny chip-row at a glance —
          tap a kid's chips for the full Insights moods view (future). */}
      {(() => {
        const kids = (users || []).filter((u) => u.role === "kid");
        if (kids.length === 0) return null;
        const days = [];
        const now = new Date();
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now.getTime() - i * 86400000);
          days.push(d.toISOString().slice(0, 10));
        }
        const moodEmoji = { happy: "😊", ok: "😐", off: "😞" };
        const moodTint = { happy: "bg-emerald-100", ok: "bg-slate-100", off: "bg-rose-100" };
        const anyCheckin = kids.some((k) => (dailyCheckins || []).some((c) => c.profileId === k.id));
        if (!anyCheckin) return null;
        return (
          <Card className="p-3 mt-3">
            <div className="text-[11px] uppercase tracking-wider font-bold text-slate-500 mb-2">Last 7 days · mood</div>
            {kids.map((k) => (
              <div key={k.id} className="flex items-center gap-2 mb-1.5 last:mb-0">
                <span className="text-xs font-bold w-16 truncate">{k.name}</span>
                <div className="flex gap-1 flex-1">
                  {days.map((iso) => {
                    const c = (dailyCheckins || []).find((x) => x.profileId === k.id && x.date === iso);
                    const d = new Date(iso + "T12:00");
                    const dayLabel = d.toLocaleDateString("en-US", { weekday: "narrow" });
                    return (
                      <div key={iso} className={`flex-1 rounded-lg py-1 text-center ${c ? moodTint[c.mood] : "bg-slate-50 border border-dashed border-slate-200"}`}>
                        <div className="text-base leading-none">{c ? moodEmoji[c.mood] : "·"}</div>
                        <div className="text-[8px] text-slate-400 leading-none mt-0.5">{dayLabel}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </Card>
        );
      })()}

      {nextRewardTitle ? (
        <Card className="p-4 mt-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold">{i18nTOf("pt_next_reward", "Next reward")}</span><span className="text-slate-500">{i18nTOf("pt_at_cost", "{name} @ {n} ⭐").replaceAll("{name}", nextRewardTitle).replaceAll("{n}", nextRewardCost)}</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full mt-2 overflow-hidden"><div className="h-full bg-amber-400" style={{ width: `${nextRewardCost > 0 ? Math.min(100, (starBank / nextRewardCost) * 100) : 0}%` }} /></div>
          <div className="flex items-center justify-between text-xs mt-3 text-slate-400">
            {bigRewardTitle && bigRewardTitle !== nextRewardTitle ? (
              <span>{i18nTOf("pt_big_goal", "Big goal: {name} @ {n} ⭐").replaceAll("{name}", bigRewardTitle).replaceAll("{n}", bigRewardCost)}</span>
            ) : <span />}
            <button onClick={() => setMode(mode === "summer" ? "school" : "summer")} className="font-semibold text-indigo-600">{i18nTOf("pt_switch_mode", "Switch to {mode} mode").replaceAll("{mode}", mode === "summer" ? i18nTOf("pt_mode_school", "School") : i18nTOf("pt_mode_summer", "Summer"))}</button>
          </div>
        </Card>
      ) : (
        <Card className="p-3 mt-3 bg-slate-50 border border-dashed border-slate-200">
          <div className="text-xs text-slate-500">Add rewards to set a "next reward" goal — More → Rewards.</div>
        </Card>
      )}

      <GiftStarsCard
        giftStars={giftStars}
        gifted={gifted}
        users={users}
        tasks={tasks}
        activities={activities}
        books={books}
        songs={songs}
        familyId={familyId}
        addBook={addBook}
        addSong={addSong}
        updateBook={updateBook}
      />

      <SectionTitle icon={<Clock size={16} className="text-amber-500" />}>{i18nTOf("sec_needs_approval_full", "Needs approval")} ({pending.length})</SectionTitle>
      {pending.length === 0 && <p className="text-xs text-slate-400 px-1">{i18nTOf("empty_pending_today", "Nothing waiting. 🎉")}</p>}
      {pending.map((t) => {
        const c = compByTask[t.id];
        return (
          <div key={t.id} className="mb-2.5">
            <MiniRow langs={langs} task={t} comp={c} tone="amber" mode={mode} priorities={priorities} users={users} activities={activities} books={books} songs={songs} songPlays={songPlays} onOpenDetail={setDetailId} undoTask={undoTask} />
            {/* Inline approve buttons — the home banner used to be
                a dead-end stat. Now every pending row is one tap from
                Approve / +5⭐ bonus / Needs fix / Reject. Same decide()
                action the Approvals tab uses, so star-burst + streak
                bump fire identically. */}
            {c?.id && decide && (
              <div className="flex gap-2 mt-1.5 px-1">
                <button onClick={() => decide(c.id, "approve")} className="flex-1 py-2 rounded-2xl bg-emerald-500 text-white font-bold text-sm active:scale-95 flex items-center justify-center gap-1"><Check size={15} />{i18nTOf("act_approve", "Approve")}</button>
                <button onClick={() => decide(c.id, "approve", 5)} className="px-3 py-2 rounded-2xl bg-violet-500 text-white font-bold text-sm active:scale-95">+5⭐</button>
                <button onClick={() => decide(c.id, "needs_fix")} className="px-3 py-2 rounded-2xl bg-amber-100 text-amber-700 font-bold text-sm active:scale-95" aria-label={i18nTOf("pt_needs_fix_aria", "Needs fix")}><RotateCcw size={15} /></button>
                <button onClick={() => decide(c.id, "reject")} className="px-3 py-2 rounded-2xl bg-rose-100 text-rose-600 font-bold text-sm active:scale-95" aria-label={i18nTOf("pt_reject_aria", "Reject")}><X size={15} /></button>
              </div>
            )}
          </div>
        );
      })}

      {/* Still to do — split into "for the treasure" (Top 8 / what
          Reznor needs to clear today to open the treasure) and "Bonus"
          (everything else). Krissie was getting overwhelmed by a flat
          15-row list; this surfaces the must-do at a glance and demotes
          the rest so it doesn't read as urgent. */}
      {(() => {
        const topEightIds = new Set((todaysTopEight || []).map((t) => t.id));
        const mustDoRaw = todo.filter((t) => topEightIds.has(t.id));
        const bonusRaw = todo.filter((t) => !topEightIds.has(t.id));
        // Apply the parent's saved custom order to each section
        // independently so a reorder in Bonus doesn't ripple into
        // Still-to-do. Reorder mode uses these ordered arrays for
        // the up/down nudges so the saved index = display index.
        const mustDo = applyOrder(mustDoRaw, todayOrder?.mustDo);
        const bonus = applyOrder(bonusRaw, todayOrder?.bonus);
        const renderEditRow = (t, section, idx, list) => (
          <Card key={t.id} className="p-2 mb-2 flex items-center gap-2">
            <div className="text-slate-400 select-none px-1" title="Drag to reorder">☰</div>
            <div className="flex-1 min-w-0 text-sm font-bold text-slate-700 truncate">{i18nTitleOf(t)}</div>
            <button
              type="button"
              onClick={() => moveInSection(section, list, idx, idx - 1)}
              disabled={idx === 0}
              className={`w-8 h-8 rounded-lg grid place-items-center ${idx === 0 ? "text-slate-200" : "text-slate-500 hover:bg-slate-100"}`}
              title="Move up"
            >▲</button>
            <button
              type="button"
              onClick={() => moveInSection(section, list, idx, idx + 1)}
              disabled={idx === list.length - 1}
              className={`w-8 h-8 rounded-lg grid place-items-center ${idx === list.length - 1 ? "text-slate-200" : "text-slate-500 hover:bg-slate-100"}`}
              title="Move down"
            >▼</button>
          </Card>
        );
        const renderRow = (t) => (
          <MiniRow langs={langs}
            key={t.id}
            task={t}
            comp={compByTask[t.id]}
            tone="slate"
            mode={mode}
            priorities={priorities}
            users={users}
            setPriority={setPriority}
            clearPriority={clearPriority}
            activities={activities}
            books={books}
            songs={songs}
            songPlays={songPlays}
            onOpenDetail={setDetailId}
            onMarkDone={setOpenTask}
            markTaskNA={markTaskNA}
          />
        );
        const SectionEditButtons = ({ active, onToggle, onReset, hasSaved }) => (
          <span className="flex items-center gap-1.5">
            {active && hasSaved && (
              <button
                type="button"
                onClick={onReset}
                className="text-[11px] font-bold text-slate-500"
                title="Clear custom order, return to default"
              >Reset</button>
            )}
            <button
              type="button"
              onClick={onToggle}
              className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${active ? "bg-indigo-600 text-white" : "bg-indigo-50 text-indigo-700"}`}
            >
              {active ? i18nTOf("act_done", "Done") : i18nTOf("more_edit_order", "Edit order")}
            </button>
          </span>
        );
        const hasMustDoOrder = (todayOrder?.mustDo || []).length > 0;
        const hasBonusOrder = (todayOrder?.bonus || []).length > 0;
        return (
          <>
            <SectionTitle
              icon={<Trophy size={16} className="text-amber-500" />}
              right={
                mustDo.length > 1 ? (
                  <SectionEditButtons
                    active={reorderMustDo}
                    onToggle={() => setReorderMustDo((v) => !v)}
                    onReset={() => resetSectionOrder("mustDo")}
                    hasSaved={hasMustDoOrder}
                  />
                ) : (
                  <span className="text-[11px] font-bold text-amber-600">{i18nTOf("hint_for_treasure", "for the treasure 🏆")}</span>
                )
              }
            >
              {i18nTOf("sec_for_treasure", "Still to do")} ({mustDo.length})
            </SectionTitle>
            {reorderMustDo && (
              <div className="text-[11px] text-slate-500 px-1 mb-2">
                {i18nTOf("more_reorder_hint", "Drag the ☰ handle to reorder, or tap ↑ / ↓. Changes save instantly.")}
              </div>
            )}
            {mustDo.length === 0 ? (
              todaysTopEight.length === 0 ? (
                <StillTodoOnboarding
                  tasks={tasks}
                  activities={activities}
                  dailyRequiredCount={dailyRequiredCount}
                  setDailyRequiredCount={setDailyRequiredCount}
                  setTab={setTab}
                  setPendingMoreSub={setPendingMoreSub}
                />
              ) : (
                <Card className="p-3 mb-2 text-center text-xs text-emerald-700 bg-emerald-50 border-emerald-200 font-bold">
                  {i18nTOf("pt_top_complete", "✨ Top {n} complete — treasure ready to open!").replaceAll("{n}", dailyRequiredCount)}
                </Card>
              )
            ) : (
              reorderMustDo
                ? mustDo.map((t, idx) => renderEditRow(t, "mustDo", idx, mustDo))
                : mustDo.map(renderRow)
            )}

            <SectionTitle
              icon={<Sparkles size={16} className="text-slate-300" />}
              right={
                <span className="flex items-center gap-1.5">
                  {bonus.length > 1 && (
                    <SectionEditButtons
                      active={reorderBonus}
                      onToggle={() => setReorderBonus((v) => !v)}
                      onReset={() => resetSectionOrder("bonus")}
                      hasSaved={hasBonusOrder}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setShowAddPicker(true)}
                    className="text-[11px] font-bold text-indigo-600 bg-indigo-50 rounded-full px-2.5 py-1 flex items-center gap-1 active:scale-95"
                    title="Add a task to today's bonus"
                  >
                    <Plus size={11} /> Add to today
                  </button>
                </span>
              }
            >
              {i18nTOf("sec_bonus", "Bonus")} ({bonus.length})
            </SectionTitle>
            {reorderBonus && (
              <div className="text-[11px] text-slate-500 px-1 mb-2">
                {i18nTOf("more_reorder_hint", "Drag the ☰ handle to reorder, or tap ↑ / ↓. Changes save instantly.")}
              </div>
            )}
            {bonus.length === 0 && (
              <p className="text-xs text-slate-400 px-1 mb-2">{i18nTOf("hint_extra_credit_not_required", "extra credit, not required")}</p>
            )}
            {reorderBonus
              ? bonus.map((t, idx) => renderEditRow(t, "bonus", idx, bonus))
              : bonus.map((t) => {
                  const isPinnedBonus = (pinnedBonus?.[TODAY_ISO] || []).includes(t.id);
                  return (
                    <div key={t.id} className="mb-2.5">
                      <MiniRow langs={langs}
                        task={t}
                        comp={compByTask[t.id]}
                        tone="slate"
                        mode={mode}
                        priorities={priorities}
                        users={users}
                        setPriority={setPriority}
                        clearPriority={clearPriority}
                        activities={activities}
                        books={books}
                        songs={songs}
                        songPlays={songPlays}
                        onOpenDetail={setDetailId}
                        onMarkDone={setOpenTask}
                        markTaskNA={markTaskNA}
                      />
                      {isPinnedBonus && unpinTaskFromToday && (
                        <button
                          type="button"
                          onClick={() => unpinTaskFromToday(TODAY_ISO, t.id)}
                          className="text-[10px] font-bold text-slate-400 hover:text-rose-500 mt-0.5 px-1 flex items-center gap-1"
                          title="Remove this task from today's bonus"
                        >
                          <X size={10} /> remove from today
                        </button>
                      )}
                    </div>
                  );
                })}
          </>
        );
      })()}

      {/* Add-to-today picker. Mike's flow: Mr. Voyce piano is
          usually Tuesday; sometimes a gig moves it to Wednesday.
          Tap "+ Add to today" → list of tasks NOT in today → pick
          → lands in Bonus via pinnedBonus. Excludes already-pinned
          AND already-in-today AND already-N/A items so the picker
          stays clean. */}
      {showAddPicker && (() => {
        const todayIds = new Set(todaysTasks.map((t) => t.id));
        const naIds = new Set((restoreTaskFromNA ? Object.keys({}) : []));
        const pickable = (tasks || [])
          .filter((t) => t.active !== false && !todayIds.has(t.id) && !naIds.has(t.id))
          .sort((a, b) => (a.title || "").localeCompare(b.title || ""));
        return (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
            <div onClick={() => setShowAddPicker(false)} className="absolute inset-0 bg-slate-900/55 backdrop-blur-sm" />
            <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 max-h-[80vh] overflow-y-auto shadow-2xl">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-[10px] uppercase tracking-widest font-bold text-indigo-600">Add to today's bonus</div>
                  <div className="text-base font-extrabold text-slate-800">Pick a task</div>
                </div>
                <button onClick={() => setShowAddPicker(false)} className="text-slate-400 p-1.5 -mr-1.5" aria-label="Close">
                  <X size={20} />
                </button>
              </div>
              {pickable.length === 0 ? (
                <div className="text-center text-sm text-slate-400 py-6">
                  Every active task is already on today's list. 🎉
                </div>
              ) : (
                <div className="space-y-1.5">
                  {pickable.map((t) => {
                    const d = actFor(t, activities);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          pinTaskToToday(TODAY_ISO, t.id);
                          setShowAddPicker(false);
                        }}
                        className="w-full flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:border-indigo-300 active:scale-[0.99] text-left"
                      >
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-slate-800 truncate">{i18nTitleOf(t)}</div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {d.label} · {t.starValue}⭐{t.mode !== "both" ? ` · ${t.mode} only` : ""}{t.days?.length ? ` · ${t.days.join(", ")}` : ""}
                          </div>
                        </div>
                        <Plus size={14} className="text-indigo-600 shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="text-[11px] text-slate-400 mt-3 px-1 leading-snug">
                Lands in Bonus for today only. Tomorrow it's back to the standing schedule.
              </div>
            </div>
          </div>
        );
      })()}

      {(() => {
        // Bonus stars belong in Done — they're contributions Reznor
        // made today that earned stars, same as a finished chore. Mike
        // explicitly wanted them visible here. We pull today's gifts and
        // count them in the section header so the total reads honest.
        const giftedTodayList = (gifted || []).filter((g) => g.date === TODAY_ISO);
        const doneTotalCount = done.length + giftedTodayList.length;
        return (
          <>
            <SectionTitle icon={<Check size={16} className="text-emerald-500" />}>{i18nTOf("sec_done_full", "Done")} ({doneTotalCount})</SectionTitle>
            {done.map((t) => {
              const c = compByTask[t.id];
              // Done rows: tap → CompletionDetailSheet (photos, notes,
              // stats, edit). Krissie's flow lives here on the parent side.
              return <MiniRow langs={langs} key={t.id} task={t} comp={c} tone="emerald" users={users} mode={mode} priorities={priorities} activities={activities} books={books} songs={songs} songPlays={songPlays} onOpenDetail={() => c?.id && setOpenCompletionId(c.id)} undoTask={undoTask} />;
            })}
            {giftedTodayList.map((g) => {
              const gTask = g.extra?.taskId ? tasks.find((t) => t.id === g.extra.taskId) : null;
              const gAct = g.extra?.activityId
                ? activities.find((a) => a.id === g.extra.activityId)
                : (gTask
                    ? activities.find((a) => a.id === (gTask.activityId
                        || gTask.activityType?.toLowerCase().replace(/\s/g, "_")))
                    : null);
              const giver = users.find((u) => u.id === g.by)?.name || "—";
              const taskSuffix = gTask
                ? i18nTOf("pt_bonus_row_task_suffix", " · {title}").replaceAll("{title}", i18nTitleOf(gTask))
                : "";
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => giftEditor.open(g)}
                  className="w-full text-left active:scale-[0.99] transition"
                  title={i18nTOf("pt_bonus_edit_title", "Tap to edit this bonus")}
                >
                  <Card className="p-3 mb-2 flex items-center gap-3 border-amber-100 bg-amber-50/40">
                    <ProofThumb gift={g} activity={gAct} task={gTask} books={books} songs={songs} songPlays={songPlays} size={36} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-800 truncate flex items-center gap-1">
                        <Sparkles size={12} className="text-amber-500 shrink-0" />
                        {g.label || i18nTOf("pt_bonus_fallback", "Bonus")}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {i18nTOf("pt_bonus_row_meta", "bonus stars · from {giver}{task} · tap to edit").replaceAll("{giver}", giver).replaceAll("{task}", taskSuffix)}
                      </div>
                    </div>
                    <StarPill n={Number(g.stars) || 0} tone="emerald" />
                  </Card>
                </button>
              );
            })}
          </>
        );
      })()}

      {/* N/A today — recoverable strip. Sick day, travel, schedule
          conflict: a parent taps "N/A" on a task and it disappears
          from the todo list, the kid board, and the streak math for
          today only. This strip surfaces every excluded task with a
          one-tap restore so the action is never lost. */}
      {todaysNATasks.length > 0 && (
        <>
          <SectionTitle icon={<X size={16} className="text-slate-400" />} right={<span className="text-[11px] text-slate-400">{i18nTOf("hint_tap_to_restore", "tap to restore")}</span>}>
            {i18nTOf("sec_na_today", "N/A today")} ({todaysNATasks.length})
          </SectionTitle>
          <div className="flex flex-wrap gap-1.5 px-1 mb-3">
            {todaysNATasks.map((t) => {
              const d = actFor(t, activities);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => restoreTaskFromNA && restoreTaskFromNA(TODAY_ISO, t.id)}
                  className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 active:scale-95 flex items-center gap-1.5"
                  title={i18nTOf("pt_restore_title", "Restore \"{title}\" to today's list").replaceAll("{title}", i18nTitleOf(t))}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: d.color }} />
                  {i18nTitleOf(t)}
                  <RotateCcw size={11} className="text-slate-400" />
                </button>
              );
            })}
          </div>
        </>
      )}

      <SectionTitle icon={<Users size={16} className="text-indigo-500" />}>{i18nTOf("sec_handoff", "Handoff notes")}</SectionTitle>
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
function MiniRow({ task, comp, tone, users, mode, priorities, setPriority, clearPriority, activities, onOpenDetail, undoTask, onMarkDone, markTaskNA, books = [], songs = [], songPlays = [], langs = ["en"] }) {
  const [open, setOpen] = useState(false);
  const by = comp?.approvedBy ? users?.find((u) => u.id === comp.approvedBy)?.name : null;
  const d = actFor(task, activities);
  const lvl = mode ? levelOf(task, mode, priorities) : "normal";
  const P = PRIORITY[lvl];
  const ov = priorities?.[task.id];
  const [pendLevel, setPendLevel] = useState(ov?.level || "today");
  const LEVELS = [
    ["must",  i18nTOf("mr_level_must", "Non-negotiable")],
    ["today", i18nTOf("mr_level_today", "Do today")],
    ["extra", i18nTOf("mr_level_extra", "Extra credit")],
  ];
  const SCOPES = [
    ["today",  i18nTOf("mr_scope_today", "Today")],
    ["week",   i18nTOf("mr_scope_week", "This week")],
    ["month",  i18nTOf("mr_scope_month", "This month")],
    ["always", i18nTOf("mr_scope_always", "Always")],
  ];
  // Activity-aware band thumbnail. Same resolution rules as ProofThumb:
  //   Reading completion → book cover preferred (the book IS what was read).
  //   Drums completion   → song cover preferred (the song IS what was practiced).
  //   Everything else    → proof photo wins.
  // Falls back to the colored activity band when nothing applies.
  // Mike specifically called out English reading rows missing the book
  // cover under Done — this is the fix.
  const proofPhoto = comp ? firstProofPhoto(comp) : null;
  const at = (task?.activityType || "").toLowerCase();
  const pt = (task?.proofType || "").toLowerCase();
  const isReadingRow = pt === "reading" || /read|book/.test(at);
  const isDrumsRow = pt === "drums" || /drum/.test(at);
  const meta = comp?.extra || {};
  // Multi-book completions store extra.bookIds[]; the FIRST picked
  // book provides the row's hero cover. Legacy bookId still works.
  const bookId = (Array.isArray(meta.bookIds) && meta.bookIds[0]) || meta.bookId;
  const bookTitle = meta.bookTitle;
  // Same robust id-then-title fallback as ProofThumb. The id-only
  // lookup before this could miss when the id lookup returned undef
  // (book renamed/recreated) — the bookTitle backup catches it.
  let book = null;
  if (bookId) book = books.find((b) => b.id === bookId);
  if (!book && bookTitle) {
    const bt = bookTitle.toLowerCase();
    book = books.find((b) =>
      (b.title || "").toLowerCase() === bt
      || (b.canonicalTitle || "").toLowerCase() === bt
    );
  }
  let song = null;
  if (meta.songId) song = songs.find((s) => s.id === meta.songId);
  if (!song && meta.songTitle) {
    const st = meta.songTitle.toLowerCase();
    song = songs.find((s) =>
      (s.title || "").toLowerCase() === st
      || (s.canonicalTitle || "").toLowerCase() === st
    );
  }
  if (!song && isDrumsRow && comp?.completionDate && Array.isArray(songPlays)) {
    const todayPlays = songPlays
      .filter((p) => p.playedOn === comp.completionDate)
      .sort((a, b) => (a.id || "").localeCompare(b.id || ""));
    const firstPlay = todayPlays[0];
    if (firstPlay) song = songs.find((s) => s.id === firstPlay.songId);
  }
  // Hooks must run unconditionally + in stable order. One useSignedUrl
  // per upload path, even if the slot ends up unused.
  const photoSigned = useSignedUrl(proofPhoto && !proofPhoto.url ? proofPhoto.path : null);
  const bookCustomSigned = useSignedUrl(book?.customCoverPath || null);
  const songCustomSigned = useSignedUrl(song?.customCoverPath || null);
  const proofResolved = proofPhoto ? (proofPhoto.url || photoSigned) : null;
  const bookCoverResolved = bookCustomSigned || book?.coverUrl || null;
  const songCoverResolved = songCustomSigned || song?.coverUrl || null;
  let photoSrc = null;
  if (isReadingRow) photoSrc = bookCoverResolved || proofResolved;
  else if (isDrumsRow) photoSrc = songCoverResolved || proofResolved;
  else photoSrc = proofResolved || bookCoverResolved || songCoverResolved;
  return (
    <div className="rounded-2xl overflow-hidden border border-slate-100 mb-2" style={{ background: lvl === "normal" ? d.color + "12" : P.wash }}>
      <div className="flex items-stretch cursor-pointer" onClick={() => onOpenDetail?.(task.id)}>
        {photoSrc ? (
          <img
            src={photoSrc}
            alt=""
            loading="lazy"
            className="w-12 shrink-0 object-cover"
            style={{ background: d.color, cursor: "zoom-in" }}
            onClick={(e) => { e.stopPropagation(); lightbox.open({ src: photoSrc }); }}
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        ) : (
          <div className="w-12 shrink-0 grid place-items-center" style={{ background: d.color }}><TaskIcon type={task.activityType} color="#ffffff" /></div>
        )}
        <div className="flex items-center gap-3 p-3 flex-1 min-w-0">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold flex items-center gap-1">{i18nTaskTitle(task, langs)}<ChevronLeft size={13} className="rotate-180 text-slate-300" /></div>
            {by && <span className="block text-[11px] text-slate-400 font-normal">✓ by {by}</span>}
            <div className="flex items-center gap-1.5 flex-wrap mt-1">
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: d.color + "22", color: d.color }}>{d.label}</span>
              <PriorityBadge level={lvl} scope={ov?.scope} />
            </div>
          </div>
          {setPriority && <button onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }} className={`p-1.5 rounded-lg shrink-0 ${lvl !== "normal" ? "text-slate-700" : "text-slate-300"}`}><Flag size={16} className={lvl !== "normal" ? "fill-current" : ""} /></button>}
          <StarPill n={comp?.awardedStars || comp?.pendingStars || task.starValue} tone={tone === "emerald" ? "emerald" : "amber"} />
          {/* Draft badge — a parent's saved work-in-progress lives
              here too (todo list includes drafts so they don't fall
              off the radar). Show "draft" with a pencil so they
              know to come back. Click still opens the task sheet. */}
          {comp?.status === "draft" && (
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 shrink-0 flex items-center gap-1">
              <Pencil size={10} /> Draft
            </span>
          )}
          {onMarkDone && (!comp || comp.status === "draft") && (
            <button
              onClick={(e) => { e.stopPropagation(); onMarkDone(task); }}
              title={comp?.status === "draft" ? "Open the saved draft" : `Mark done${users ? ` for ${kidName(users)}` : ""} (with photo proof if needed)`}
              className="p-1.5 rounded-lg shrink-0 text-emerald-600 hover:bg-emerald-50"
            >
              <Check size={16} />
            </button>
          )}
          {markTaskNA && !comp && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`Mark "${i18nTitleOf(task)}" as N/A for today?\n\nIt won't show on the board and the treasure-day streak will ignore it. You can restore it from the "N/A today" strip below.`)) {
                  markTaskNA(TODAY_ISO, task.id);
                }
              }}
              title="Mark N/A for today (sick day / travel / doesn't apply)"
              className="p-1.5 rounded-lg shrink-0 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={16} />
            </button>
          )}
          {undoTask && comp && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const wasApproved = comp.status === "approved";
                const stars = comp.awardedStars || comp.pendingStars || 0;
                const msg = `Mark "${i18nTitleOf(task)}" as NOT done?` +
                  (wasApproved && stars ? `\n\nThis will remove ${stars} ⭐ from the star bank.` : "") +
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

function GiftStarsCard({ giftStars, gifted = [], users = [], tasks = [], activities = [], books = [], songs = [], familyId, addBook, addSong, updateBook }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [amt, setAmt] = useState(5);
  // Picker state: optional task → derives activity → may unlock
  // book or song picker for reading / drum activities.
  const [taskId, setTaskId] = useState("");
  const [bookId, setBookId] = useState("");
  const [songId, setSongId] = useState("");
  // Inline add-new state — parent shouldn't have to leave the gift
  // form to add a book or song. Keeping everything in one place is
  // the rule. Toggle a tiny inline form; on save, the new row is
  // created via addBook/addSong and auto-selected.
  const [addingBook, setAddingBook] = useState(false);
  const [newBookTitle, setNewBookTitle] = useState("");
  const [newBookAuthor, setNewBookAuthor] = useState("");
  const [addingSong, setAddingSong] = useState(false);
  const [newSongTitle, setNewSongTitle] = useState("");
  const [newSongArtist, setNewSongArtist] = useState("");
  // "Did he finish it?" — only meaningful for reading gifts when a
  // book is picked. Marks the book finished + sets finished date on
  // submit. Equivalent to flipping it in Reading Library, but in line.
  const [markBookFinished, setMarkBookFinished] = useState(false);
  // Photo proof — same shape as TaskSheet's proof upload. We use the
  // family bucket so RLS applies. Path lives in extra.photoPath.
  const [photo, setPhoto] = useState(null); // { path, name }
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const resetForm = () => {
    setLabel(""); setAmt(5); setTaskId(""); setBookId(""); setSongId("");
    setPhoto(null); setMarkBookFinished(false);
    setAddingBook(false); setNewBookTitle(""); setNewBookAuthor("");
    setAddingSong(false); setNewSongTitle(""); setNewSongArtist("");
  };
  const close = () => { setOpen(false); resetForm(); };

  // Filter to today only — the existing 'gifted' rows carry `date` as
  // an ISO YYYY-MM-DD string (the bedtime 2026-06-10 fix). Sum + list
  // so the parent sees what's already been given and never accidentally
  // double-gifts the same activity.
  const giftedToday = (gifted || []).filter((g) => g.date === TODAY_ISO);
  const todayTotal = giftedToday.reduce((s, g) => s + (Number(g.stars) || 0), 0);

  // Derived: selected task + activity. Activity determines whether
  // the book or song picker shows.
  const selectedTask = tasks.find((t) => t.id === taskId);
  const selectedActivity = activities.find((a) => a.id === (selectedTask?.activityId
    || selectedTask?.activityType?.toLowerCase().replace(/\s/g, "_")));
  const isReading = selectedActivity?.id === "books" || /book|read/i.test(selectedTask?.activityType || "");
  const isDrums = selectedActivity?.id === "drums" || /drum/i.test(selectedTask?.activityType || "");

  // Photo upload handler — mirrors TaskSheet's pattern.
  const handlePickPhoto = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      const { path, name } = await uploadFamilyPhoto({ file: f, familyId, kind: "proof" });
      setPhoto({ path, name });
    } catch (err) {
      toast.error(i18nTOf("gs_photo_upload_fail", "Photo upload failed: {msg}").replaceAll("{msg}", err.message || err));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const submit = () => {
    const trimmed = label.trim();
    if (!trimmed) return;
    // Mark book finished if the parent ticked the box. Runs BEFORE
    // giftStars so the displayed book status updates the same render.
    if (bookId && markBookFinished && updateBook) {
      updateBook(bookId, { status: "finished", finished: TODAY_ISO });
    }
    giftStars({
      label: trimmed,
      stars: amt,
      taskId: taskId || undefined,
      activityId: selectedActivity?.id || undefined,
      bookId: bookId || undefined,
      songId: songId || undefined,
      photoPath: photo?.path || undefined,
      photoName: photo?.name || undefined,
    });
    close();
  };

  // Inline "Add new book" — auto-selects the new row so the parent
  // doesn't have to find it in the long select after creating it.
  const saveNewBook = () => {
    const t = newBookTitle.trim();
    if (!t || !addBook) return;
    const id = "b_" + Date.now();
    addBook({ id, title: t, author: newBookAuthor.trim() || null, status: "reading", started: TODAY_ISO });
    setBookId(id);
    setAddingBook(false);
    setNewBookTitle(""); setNewBookAuthor("");
  };
  const saveNewSong = () => {
    const t = newSongTitle.trim();
    if (!t || !addSong) return;
    // addSong dedupes by title+artist and returns the id (existing or new).
    const id = addSong({ title: t, artist: newSongArtist.trim() || null });
    if (id) setSongId(id);
    setAddingSong(false);
    setNewSongTitle(""); setNewSongArtist("");
  };

  if (!open) {
    return (
      <div className="mt-3">
        <button onClick={() => setOpen(true)} className="w-full py-3 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2" style={{ background: "linear-gradient(90deg,#f59e0b,#ec4899)" }}>
          <Sparkles size={16} /> {i18nTOf("gs_cta", "Gift bonus stars")}
          {todayTotal > 0 && (
            <span className="ml-1 text-[11px] font-extrabold bg-white/25 rounded-full px-2 py-0.5">
              {i18nTOf("gs_today_pill", "{n}⭐ today").replaceAll("{n}", todayTotal)}
            </span>
          )}
        </button>
        {/* Honest list of what's already been gifted today so the parent
            never accidentally double-gifts the same activity. */}
        {giftedToday.length > 0 && (
          <div className="mt-2 bg-amber-50 border border-amber-200 rounded-2xl p-2.5">
            <div className="text-[10px] uppercase tracking-wider font-bold text-amber-700 mb-1">{i18nTOf("gs_already_gifted_short", "Already gifted today")}</div>
            <div className="space-y-1">
              {giftedToday.map((g) => {
                const giver = users.find((u) => u.id === g.by)?.name || "—";
                return (
                  <div key={g.id} className="flex items-center gap-2 text-[12px]">
                    <span className="font-bold text-amber-700 tabular-nums shrink-0">+{g.stars}⭐</span>
                    <span className="flex-1 text-slate-700 truncate">{g.label}</span>
                    <span className="text-[10px] text-slate-400 shrink-0">{giver}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Sort tasks alphabetically for the picker. Includes inactive too —
  // a parent gifting for a paused task should still be able to credit
  // it. Limit to active tasks if needed later.
  const taskOptions = [...tasks].filter((t) => t.active !== false).sort((a, b) => (a.title || "").localeCompare(b.title || ""));
  // Books picker: prefer reading / currently active books. Same status
  // priority as the TaskSheet book picker — reading → wishlist →
  // anything-else last.
  const bookStatusOrder = { reading: 0, wishlist: 1, finished: 2, archive: 3, dropped: 4 };
  const bookOptions = [...books].sort((a, b) =>
    (bookStatusOrder[a.status] ?? 9) - (bookStatusOrder[b.status] ?? 9)
    || (a.title || "").localeCompare(b.title || "")
  );
  // Songs picker: by canonical title, then title.
  const songOptions = [...songs].sort((a, b) =>
    (a.canonicalTitle || a.title || "").localeCompare(b.canonicalTitle || b.title || "")
  );

  return (
    <Card className="p-4 mt-3">
      <div className="font-bold text-sm mb-1 flex items-center gap-2"><Sparkles size={15} className="text-amber-500" /> {i18nTOf("gs_cta", "Gift bonus stars")}</div>
      <div className="text-[11px] text-slate-400 mb-2">{i18nTOf("gs_intro", "For great stuff that isn't on the list — extra reading, helping others, kindness.")}</div>
      {giftedToday.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-2 mb-2">
          <div className="text-[10px] uppercase tracking-wider font-bold text-amber-700 mb-1">{i18nTOf("gs_already_gifted", "Already gifted today ({n}⭐)").replaceAll("{n}", todayTotal)}</div>
          {giftedToday.map((g) => (
            <div key={g.id} className="flex items-center gap-2 text-[11px]">
              <span className="font-bold text-amber-700 tabular-nums shrink-0">+{g.stars}⭐</span>
              <span className="flex-1 text-slate-700 truncate">{g.label}</span>
            </div>
          ))}
          <div className="text-[10px] text-amber-700 mt-1 font-bold">{i18nTOf("gs_no_double", "Don't double-gift — pick a different reason or amount.")}</div>
        </div>
      )}

      <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={i18nTOf("gs_label_ph", "What did they do? e.g. Extra 30 min reading")} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm mb-2" />

      {/* Optional task picker — credits the gift to a specific task so
          Insights, per-day breakdown, and the Star Ledger can attribute
          it. Leave blank for "general bonus." */}
      <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">
        {i18nTOf("gs_for_task", "For which task?")} <span className="font-normal text-slate-400 normal-case">{i18nTOf("gs_optional_aside", "(optional)")}</span>
      </label>
      <select
        value={taskId}
        onChange={(e) => { setTaskId(e.target.value); setBookId(""); setSongId(""); }}
        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm mb-2 bg-white"
      >
        <option value="">{i18nTOf("gs_general_bonus", "— general bonus —")}</option>
        {taskOptions.map((t) => (
          <option key={t.id} value={t.id}>{i18nTitleOf(t)}</option>
        ))}
      </select>

      {/* Book picker — visible whenever the picked task is reading.
          "Add a new book" lives inline so the parent never has to
          leave the gift flow to seed a missing title. "Mark finished"
          checkbox flips the book to status=finished + finished=today,
          equivalent to flipping it in Reading Library. */}
      {isReading && (
        <>
          <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">
            {i18nTOf("gs_which_book", "Which book?")} <span className="font-normal text-slate-400 normal-case">{i18nTOf("gs_optional_aside", "(optional)")}</span>
          </label>
          {!addingBook ? (
            <>
              <select
                value={bookId}
                onChange={(e) => { setBookId(e.target.value); setMarkBookFinished(false); }}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm mb-1.5 bg-white"
              >
                <option value="">{i18nTOf("gs_pick_book", "— pick a book —")}</option>
                {bookOptions.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title}{b.status && b.status !== "reading" ? ` (${b.status})` : ""}
                  </option>
                ))}
              </select>
              {addBook && (
                <button
                  type="button"
                  onClick={() => setAddingBook(true)}
                  className="text-[11px] font-bold text-indigo-600 mb-2 flex items-center gap-1"
                >
                  <Plus size={12} /> {i18nTOf("gs_add_new_book", "Add a new book")}
                </button>
              )}
              {bookId && updateBook && (() => {
                const pickedBook = books.find((b) => b.id === bookId);
                const alreadyFinished = pickedBook?.status === "finished" || pickedBook?.status === "archive";
                return (
                  <label className={`flex items-center gap-2 mb-2 text-[12px] font-bold ${alreadyFinished ? "text-slate-400" : "text-emerald-700"}`}>
                    <input
                      type="checkbox"
                      checked={alreadyFinished || markBookFinished}
                      disabled={alreadyFinished}
                      onChange={(e) => setMarkBookFinished(e.target.checked)}
                      className="w-4 h-4"
                    />
                    {alreadyFinished
                      ? i18nTOf("gs_already_finished", "✓ Already finished")
                      : i18nTOf("gs_kid_finished", "{kid} finished this book today 📚").replaceAll("{kid}", kidName(users))}
                  </label>
                );
              })()}
            </>
          ) : (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-2 mb-2">
              <input
                value={newBookTitle}
                onChange={(e) => setNewBookTitle(e.target.value)}
                placeholder={i18nTOf("gs_book_title_ph", "Book title")}
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm mb-1.5 bg-white"
              />
              <input
                value={newBookAuthor}
                onChange={(e) => setNewBookAuthor(e.target.value)}
                placeholder={i18nTOf("gs_book_author_ph", "Author (optional)")}
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm mb-1.5 bg-white"
              />
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => { setAddingBook(false); setNewBookTitle(""); setNewBookAuthor(""); }}
                  className="flex-1 text-[11px] font-bold bg-slate-200 text-slate-700 rounded-lg py-1.5 active:scale-95"
                >
                  {i18nTOf("gs_cancel", "Cancel")}
                </button>
                <button
                  type="button"
                  disabled={!newBookTitle.trim()}
                  onClick={saveNewBook}
                  className={`flex-1 text-[11px] font-bold rounded-lg py-1.5 active:scale-95 ${newBookTitle.trim() ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-400"}`}
                >
                  {i18nTOf("gs_add_book", "Add book")}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Song picker — visible when picked task is drums-related.
          Same inline "Add a new song" affordance as books so the
          parent can seed a missing title without leaving the flow. */}
      {isDrums && (
        <>
          <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">
            {i18nTOf("gs_which_song", "Which song?")} <span className="font-normal text-slate-400 normal-case">{i18nTOf("gs_optional_aside", "(optional)")}</span>
          </label>
          {!addingSong ? (
            <>
              <select
                value={songId}
                onChange={(e) => setSongId(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm mb-1.5 bg-white"
              >
                <option value="">{i18nTOf("gs_pick_song", "— pick a song —")}</option>
                {songOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.canonicalTitle || s.title}{(s.canonicalArtist || s.artist) ? ` — ${s.canonicalArtist || s.artist}` : ""}
                  </option>
                ))}
              </select>
              {addSong && (
                <button
                  type="button"
                  onClick={() => setAddingSong(true)}
                  className="text-[11px] font-bold text-indigo-600 mb-2 flex items-center gap-1"
                >
                  <Plus size={12} /> {i18nTOf("gs_add_new_song", "Add a new song")}
                </button>
              )}
            </>
          ) : (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-2 mb-2">
              <input
                value={newSongTitle}
                onChange={(e) => setNewSongTitle(e.target.value)}
                placeholder={i18nTOf("gs_song_title_ph", "Song title")}
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm mb-1.5 bg-white"
              />
              <input
                value={newSongArtist}
                onChange={(e) => setNewSongArtist(e.target.value)}
                placeholder={i18nTOf("gs_song_artist_ph", "Artist (optional)")}
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm mb-1.5 bg-white"
              />
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => { setAddingSong(false); setNewSongTitle(""); setNewSongArtist(""); }}
                  className="flex-1 text-[11px] font-bold bg-slate-200 text-slate-700 rounded-lg py-1.5 active:scale-95"
                >
                  {i18nTOf("gs_cancel", "Cancel")}
                </button>
                <button
                  type="button"
                  disabled={!newSongTitle.trim()}
                  onClick={saveNewSong}
                  className={`flex-1 text-[11px] font-bold rounded-lg py-1.5 active:scale-95 ${newSongTitle.trim() ? "bg-purple-600 text-white" : "bg-slate-200 text-slate-400"}`}
                >
                  {i18nTOf("gs_add_song", "Add song")}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Stars amount */}
      <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">{i18nTOf("gs_stars_label", "Stars")}</label>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {[3, 5, 10, 15, 20, 30].map((n) => <button key={n} onClick={() => setAmt(n)} className={`px-3 py-1.5 rounded-xl text-sm font-bold ${amt === n ? "bg-amber-400 text-white" : "bg-slate-100 text-slate-500"}`}>{n}⭐</button>)}
      </div>

      {/* Photo proof — same upload pattern as TaskSheet. Optional. */}
      <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">
        {i18nTOf("gs_photo_proof", "Photo proof")} <span className="font-normal text-slate-400 normal-case">{i18nTOf("gs_optional_aside", "(optional)")}</span>
      </label>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePickPhoto} />
      {photo ? (
        <div className="flex items-center gap-2 mb-3 bg-emerald-50 border border-emerald-200 rounded-xl p-2">
          <Camera size={14} className="text-emerald-600 shrink-0" />
          <div className="text-[11px] font-bold text-emerald-700 flex-1 truncate">{photo.name || i18nTOf("gs_photo_attached", "Photo attached")}</div>
          <button onClick={() => setPhoto(null)} className="text-emerald-700 text-[11px] font-bold">{i18nTOf("gs_photo_remove", "Remove")}</button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className={`w-full mb-3 py-2 rounded-xl border border-dashed text-[12px] font-bold flex items-center justify-center gap-1.5 ${uploading ? "bg-slate-50 text-slate-400 border-slate-200" : "bg-white text-indigo-600 border-indigo-300 active:scale-[0.99]"}`}
        >
          {uploading ? i18nTOf("gs_photo_uploading", "Uploading…") : <><Camera size={13} /> {i18nTOf("gs_photo_add", "Add a photo")}</>}
        </button>
      )}

      <div className="flex gap-2">
        <button onClick={close} className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-500 font-bold text-sm">{i18nTOf("gs_cancel", "Cancel")}</button>
        <button disabled={!label.trim() || uploading} onClick={submit} className={`flex-1 py-2.5 rounded-xl font-bold text-sm text-white ${label.trim() && !uploading ? "bg-amber-500" : "bg-slate-200 text-slate-400"}`}>{i18nTOf("gs_give_n", "Give {n}⭐").replaceAll("{n}", amt)}</button>
      </div>
    </Card>
  );
}

// ===================== PARENT: APPROVALS =====================
function Approvals({ completions, tasks, users, decide, songs = [], songPlays = [], songPlayRequests = [], decideSongPlayRequest }) {
  const pending = completions.filter((c) => c.status === "pending");
  const songReqs = songPlayRequests || [];
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
      <h2 className="font-extrabold text-lg px-1">{i18nTOf("app_queue_title", "Approval Queue")}</h2>
      <p className="text-xs text-slate-400 px-1 mb-2">{i18nTOf("app_queue_hint", "Stars stay pending until you approve.")}</p>
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
            <div className="text-[10px] uppercase tracking-widest text-white/70 font-bold">{i18nTOf("app_approved_today", "Approved Today")}</div>
            <div className="flex items-baseline gap-2">
              <span
                ref={tallyRef}
                data-star-bank
                className="text-3xl font-extrabold leading-none"
                style={{ display: "inline-block", transformOrigin: "left center" }}
              >
                {approvedToday}
              </span>
              <span className="text-sm font-bold text-white/70">{i18nTOf("app_banked", "⭐ banked")}</span>
            </div>
          </div>
        </div>
      </div>
      {pending.length === 0 && <Card className="p-6 text-center text-slate-400 text-sm mt-4">{i18nTOf("empty_all_caught_up", "All caught up! 🎉")}</Card>}
      {pending.map((c) => {
        const t = tasks.find((x) => x.id === c.taskId);
        const who = users.find((u) => u.id === (c.submittedBy || c.completedBy));
        return (
          <Card key={c.id} className="p-4 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 grid place-items-center"><TaskIcon type={t.activityType} /></div>
              <div className="flex-1">
                <div className="font-bold text-sm">{i18nTitleOf(t)}</div>
                <div className="text-[11px] text-slate-400">{i18nTOf("app_submitted_by", "Submitted by {name}").replaceAll("{name}", who?.name || "")}</div>
              </div>
              <StarPill n={c.pendingStars} tone="amber" />
            </div>

            {c.extra?.bookTitle && <Detail label={i18nTOf("app_detail_book", "Book")}>{c.extra.bookTitle} ({c.extra.lang}, {c.extra.minutes} min)</Detail>}
            {c.extra?.title && <Detail label={i18nTOf("app_detail_title", "Title")}>{c.extra.title}</Detail>}
            {c.extra?.drumeo !== undefined && (c.extra.drumeo || c.extra.melodics || c.extra.songList) && (
              <Detail label={i18nTOf("app_detail_drums", "Drums")}>Drumeo {c.extra.drumeo || 0}m · Melodics {c.extra.melodics || 0}m{c.extra.songList ? ` · ${c.extra.songList}` : ""}</Detail>
            )}
            {c.notes && <Detail label={i18nTOf("app_detail_note", "Note")}>{c.notes}</Detail>}
            {c.proof?.some((p) => p.path || p.url) && (() => {
              const ph = c.proof.find((p) => p.path || p.url);
              const g = ph.geo;
              return (
                <div className="mt-2">
                  <StoredPhoto path={ph.path} url={ph.url} alt="proof" className="rounded-xl h-32 w-full object-cover" fallback={<div className="rounded-xl h-32 w-full bg-slate-100 animate-pulse" />} />
                  {g && (
                    <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 flex-wrap">
                      📍 {g.label} {g.approx ? "" : `(${g.lat}, ${g.lng})`}
                      <a href={`https://maps.google.com/?q=${g.lat},${g.lng}`} target="_blank" rel="noreferrer" className="text-indigo-600 font-semibold">{i18nTOf("app_geo_map", "map")}</a>
                      {ph.time && <span className="text-slate-400">· {ph.time}</span>}
                      {ph.by && <span className="text-slate-400">· by {users.find((u) => u.id === ph.by)?.name || i18nTOf("app_by_helper", "helper")}</span>}
                    </div>
                  )}
                </div>
              );
            })()}
            {c.proof?.length > 0 && !c.proof.some((p) => p.path || p.url) && <Detail label={i18nTOf("app_detail_proof", "Proof")}>{c.proof.map((p) => p.name).join(", ")}</Detail>}

            <div className="flex gap-2 mt-3">
              <button onClick={() => decide(c.id, "approve")} className="flex-1 py-2.5 rounded-2xl bg-emerald-500 text-white font-bold text-sm active:scale-95 flex items-center justify-center gap-1"><Check size={16} />{i18nTOf("act_approve", "Approve")}</button>
              <button onClick={() => decide(c.id, "approve", 5)} className="px-3 py-2.5 rounded-2xl bg-violet-500 text-white font-bold text-sm active:scale-95">+5⭐</button>
              <button onClick={() => decide(c.id, "needs_fix")} className="px-3 py-2.5 rounded-2xl bg-amber-100 text-amber-700 font-bold text-sm active:scale-95"><RotateCcw size={16} /></button>
              <button onClick={() => decide(c.id, "reject")} className="px-3 py-2.5 rounded-2xl bg-rose-100 text-rose-600 font-bold text-sm active:scale-95"><X size={16} /></button>
            </div>
          </Card>
        );
      })}

      {/* Song-log change requests — kid-side asks to delete or edit
          one of his own play rows. Surfaced here so a parent never
          merges them silently and a mis-tapped kid action can't erase
          history. Same Approve / Deny pattern as completions. */}
      {songReqs.length > 0 && (
        <>
          <SectionTitle icon={<Music size={16} className="text-purple-500" />}>
            {i18nTOf("app_song_section", "Song log changes")} <span className="text-[11px] font-normal text-slate-400">· {songReqs.length}</span>
          </SectionTitle>
          {songReqs.map((req) => {
            const play = songPlays.find((p) => p.id === req.playId);
            const song = play ? songs.find((s) => s.id === play.songId) : null;
            const songTitle = song?.canonicalTitle || song?.title || i18nTOf("app_song_deleted", "(deleted song)");
            const who = users.find((u) => u.id === req.by)?.name || kidName(users);
            const kindLabel = req.kind === "remove" ? i18nTOf("app_song_remove", "Remove play") : i18nTOf("app_song_edit", "Edit play");
            const tileBg = req.kind === "remove" ? "bg-rose-50" : "bg-indigo-50";
            const tileFg = req.kind === "remove" ? "text-rose-700" : "text-indigo-700";
            return (
              <Card key={req.id} className="p-3 mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-9 h-9 rounded-xl ${tileBg} grid place-items-center shrink-0`}>
                    <Music size={15} className={tileFg} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-slate-800 truncate">
                      {kindLabel}: {songTitle}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {play ? fmtShort(play.playedOn) : "—"}
                      {play?.notes ? ` · "${play.notes}"` : ""}
                      {` · ${i18nTOf("app_song_asked_by", "asked by {name}").replaceAll("{name}", who)}`}
                    </div>
                  </div>
                </div>
                {req.kind === "update" && req.payload && (
                  <div className="mt-2 text-[11px] bg-slate-50 rounded-lg p-2">
                    <div className="text-slate-500 mb-0.5">{i18nTOf("app_song_change_to", "Wants to change to:")}</div>
                    <div className="font-bold text-slate-700">
                      {req.payload.playedOn ? fmtShort(req.payload.playedOn) : "—"}
                      {req.payload.notes ? ` · "${req.payload.notes}"` : ""}
                    </div>
                  </div>
                )}
                <div className="flex gap-2 mt-3">
                  <button onClick={() => decideSongPlayRequest?.(req.id, "approve")} className="flex-1 py-2 rounded-2xl bg-emerald-500 text-white font-bold text-sm active:scale-95 flex items-center justify-center gap-1">
                    <Check size={15} /> {i18nTOf("act_approve", "Approve")}
                  </button>
                  <button onClick={() => decideSongPlayRequest?.(req.id, "deny")} className="px-3 py-2 rounded-2xl bg-rose-100 text-rose-600 font-bold text-sm active:scale-95" aria-label={i18nTOf("app_deny_aria", "Deny")}>
                    <X size={15} />
                  </button>
                </div>
              </Card>
            );
          })}
        </>
      )}
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
        <span className="text-xs text-slate-500">{i18nTOf("rew_costs_label", "Costs")}</span>
        <input type="number" value={cost} onChange={(e) => setCost(Number(e.target.value))} className="w-20 border border-slate-200 rounded-xl px-2 py-1 text-sm" />
        <span className="text-xs text-slate-500">⭐</span>
        <button onClick={() => decideRewardRequest(w.id, "approved", cost)} className="ml-auto px-3 py-2 rounded-xl bg-emerald-500 text-white font-bold text-xs">{i18nTOf("act_approve", "Approve")}</button>
        <button onClick={() => decideRewardRequest(w.id, "declined")} className="px-3 py-2 rounded-xl bg-rose-100 text-rose-600 font-bold text-xs">{i18nTOf("act_deny", "Deny")}</button>
      </div>
    </Card>
  );
}

function RewardsParent({ rewards, redemptions, decideReward, starBank, addReward, updateReward, removeReward, rewardRequests, decideRewardRequest, users = [] }) {
  const requested = redemptions.filter((r) => r.status === "requested");
  const wishes = (rewardRequests || []).filter((w) => w.status === "requested");
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [cost, setCost] = useState(50);
  const [cat, setCat] = useState("Treat");
  const cats = [
    { key: "Everyday", label: i18nTOf("rew_cat_everyday", "Everyday") },
    { key: "Treat",    label: i18nTOf("rew_cat_treat", "Treat") },
    { key: "Creative", label: i18nTOf("rew_cat_creative", "Creative") },
    { key: "Big",      label: i18nTOf("rew_cat_big", "Big") },
  ];
  // Sort order for the All-rewards list. "high" = priciest at top
  // (good for scanning the big dreams). "low" = cheapest at top
  // (good for scanning what's already in reach). Persisted in-memory
  // only — cheap setting; Krissie/Mike each pick what they want per
  // session.
  const [rewardSort, setRewardSort] = useState("high");
  const sortedRewards = [...(rewards || [])].sort((a, b) => {
    const ac = Number(a.starCost) || 0;
    const bc = Number(b.starCost) || 0;
    return rewardSort === "high" ? bc - ac : ac - bc;
  });
  return (
    <div className="px-4 pt-4">
      <h2 className="font-extrabold text-lg px-1">{i18nTOf("rew_heading", "Rewards Store")}</h2>
      <p className="text-xs text-slate-400 px-1">{i18nTOf("rew_bank_hint", "Bank: {n} ⭐ · add, edit, or remove anything {kid}'s into.").replaceAll("{n}", starBank).replaceAll("{kid}", kidName(users))}</p>

      <SectionTitle icon={<Sparkles size={16} className="text-violet-500" />}>{i18nTOf("sec_wishes_from", "Wishes from")} {kidName(users)} {wishes.length > 0 && <span className="text-[11px] font-normal text-violet-500">· {i18nTOf("rew_wishes_new", "{n} new").replaceAll("{n}", wishes.length)}</span>}</SectionTitle>
      {wishes.length === 0 && <p className="text-xs text-slate-400 px-1">{i18nTOf("rew_no_wishes", "No new wishes. When one comes up, set the stars and approve it here.")}</p>}
      {wishes.map((w) => <WishApproveRow key={w.id} w={w} decideRewardRequest={decideRewardRequest} />)}

      <SectionTitle icon={<Gift size={16} className="text-violet-500" />}>{i18nTOf("sec_redemption_requests", "Redemption requests")}</SectionTitle>
      {requested.length === 0 && <p className="text-xs text-slate-400 px-1">{i18nTOf("rew_no_requests", "No pending requests.")}</p>}
      {requested.map((r) => (
        <Card key={r.id} className="p-3 mb-2 flex items-center gap-3">
          <div className="flex-1"><div className="font-bold text-sm">{r.title}</div><div className="text-[11px] text-slate-400">{r.cost} ⭐</div></div>
          <button onClick={() => decideReward(r.id, "approved")} className="px-3 py-2 rounded-xl bg-emerald-500 text-white font-bold text-xs">{i18nTOf("act_approve", "Approve")}</button>
          <button onClick={() => decideReward(r.id, "denied")} className="px-3 py-2 rounded-xl bg-rose-100 text-rose-600 font-bold text-xs">{i18nTOf("act_deny", "Deny")}</button>
        </Card>
      ))}

      <SectionTitle
        icon={<Trophy size={16} className="text-amber-500" />}
        right={
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setRewardSort((s) => (s === "high" ? "low" : "high"))}
              className="text-[11px] font-bold text-slate-500 bg-slate-100 rounded-full px-2.5 py-1 flex items-center gap-1"
              title={rewardSort === "high" ? i18nTOf("rew_sort_tooltip_low", "Switch to lowest first") : i18nTOf("rew_sort_tooltip_high", "Switch to highest first")}
            >
              {rewardSort === "high" ? i18nTOf("rew_sort_high_to_low", "★ high → low") : i18nTOf("rew_sort_low_to_high", "★ low → high")}
            </button>
            {!adding && (
              <button onClick={() => setAdding(true)} className="text-[11px] font-bold text-indigo-600 flex items-center gap-1">
                <Plus size={12} /> {i18nTOf("rew_add", "Add")}
              </button>
            )}
          </div>
        }
      >
        {i18nTOf("rew_section_all", "All rewards")}
      </SectionTitle>
      {adding && (
        <Card className="p-4 mb-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={i18nTOf("rew_new_ph", "e.g. New comic book")} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm mb-2" />
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-slate-500">{i18nTOf("rew_cost_label", "Cost")}</span>
            <input type="number" value={cost} onChange={(e) => setCost(Number(e.target.value))} className="w-20 border border-slate-200 rounded-xl px-2 py-1 text-sm" />
            <span className="text-xs text-slate-500">⭐</span>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-3">{cats.map((c) => <button key={c.key} onClick={() => setCat(c.key)} className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${cat === c.key ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>{c.label}</button>)}</div>
          <div className="flex gap-2">
            <button onClick={() => { setAdding(false); setName(""); }} className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-500 font-bold text-sm">{i18nTOf("act_cancel", "Cancel")}</button>
            <button disabled={!name.trim()} onClick={() => { addReward({ id: "r_" + Date.now(), title: name.trim(), starCost: cost, category: cat, active: true }); setAdding(false); setName(""); setCost(50); }} className={`flex-1 py-2.5 rounded-xl font-bold text-sm text-white ${name.trim() ? "bg-indigo-600" : "bg-slate-200 text-slate-400"}`}>{i18nTOf("rew_add_reward", "Add reward")}</button>
          </div>
        </Card>
      )}
      {sortedRewards.map((r) => <RewardEditRow key={r.id} r={r} updateReward={updateReward} removeReward={removeReward} />)}
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
          <div className="text-[11px] text-slate-400">{r.category}{r.active === false ? ` · ${i18nTOf("rew_hidden", "hidden")}` : ""}</div>
        </div>
        {edit
          ? <div className="flex items-center gap-1"><input type="number" value={r.starCost} onChange={(e) => updateReward(r.id, { starCost: Number(e.target.value) })} className="w-16 border border-slate-200 rounded px-1.5 py-0.5 text-sm" /><span className="text-xs">⭐</span></div>
          : <StarPill n={r.starCost} />}
        <button
          onClick={() => setEdit((v) => !v)}
          className="p-1.5 text-slate-400 hover:text-slate-600 active:scale-90"
          aria-label={edit ? i18nTOf("act_close", "Close") : i18nTOf("act_edit", "Edit")}
        >
          {edit ? <X size={16} /> : <Pencil size={15} />}
        </button>
      </div>
      {edit && (
        <div className="flex gap-2 mt-2">
          <button onClick={() => updateReward(r.id, { active: r.active === false })} className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold">{r.active === false ? i18nTOf("rew_show_in_store", "Show in store") : i18nTOf("rew_hide_from_store", "Hide from store")}</button>
          <button onClick={() => removeReward(r.id)} className="px-3 py-2 rounded-xl bg-rose-100 text-rose-600 text-xs font-bold flex items-center gap-1"><X size={14} /> {i18nTOf("act_remove", "Remove")}</button>
        </div>
      )}
    </Card>
  );
}

// ===================== PARENT: CALENDAR =====================
// Helpers used by SimpleWeekStrip — kept module-scope so both the
// strip and the underlying CalendarView can share the same formatting.
const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_NAMES_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
function startOfWeek(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - x.getDay());
  return x;
}
function fmtIso(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function fmt12(hhmm) {
  if (!hhmm) return "";
  const [hStr, mStr] = hhmm.split(":");
  let h = Number(hStr); const m = Number(mStr);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12; if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, "0")} ${ampm}`;
}
function inOverride(iso, overrides) {
  if (!iso || !overrides || !overrides.length) return null;
  return overrides.find((o) => iso >= o.startDate && iso <= o.endDate) || null;
}

// One row in the new week strip — Mon / Tue / etc. with the count of
// items and a thin colored bar showing what's scheduled. Tap to open
// the sheet for that day.
// Day cell — name + colored pills for every item on that day. Each
// pill shows title and (if set) time. Tap a pill → edits that entry
// directly. Tap empty space → opens the day sheet to add a new one.
function WeekDayCell({ items, weekday, label, overridden, isToday, onTapDay, onTapItem }) {
  return (
    <div
      onClick={onTapDay}
      className={`w-full cursor-pointer flex items-start gap-3 py-3 px-3 rounded-2xl mb-1.5 transition active:scale-[0.99] ${
        isToday ? "bg-indigo-50 border-2 border-indigo-200" : "bg-white border border-slate-100"
      }`}
    >
      <div className={`w-12 shrink-0 text-center ${isToday ? "text-indigo-700" : "text-slate-500"} pt-0.5`}>
        <div className="text-[10px] font-bold uppercase tracking-wider">{weekday}</div>
        <div className="text-xl font-extrabold leading-tight">{label}</div>
      </div>
      <div className="flex-1 min-w-0">
        {overridden && (
          <div className="text-[10px] font-bold uppercase tracking-wider text-violet-600 mb-1">{overridden.label || "This week is different"}</div>
        )}
        {items.length === 0 ? (
          <div className="text-sm text-slate-300 font-medium pt-1">Tap to add</div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {items.map((it) => (
              <span
                key={it.key}
                role={it.event ? "button" : undefined}
                tabIndex={it.event ? 0 : undefined}
                onClick={(e) => {
                  if (!it.event) return;
                  e.stopPropagation();
                  onTapItem && onTapItem(it.event);
                }}
                className={`inline-flex items-center gap-1 max-w-full px-2.5 py-1.5 rounded-full text-[12px] font-bold text-white shadow-sm leading-tight ${it.event ? "active:scale-95" : "opacity-90"}`}
                style={{ background: it.color || "#6366f1" }}
                title={it.subtitle || ""}
              >
                {it.recurring && <span className="text-[10px] leading-none">↻</span>}
                <span className="truncate">{it.title}</span>
                {it.time && <span className="text-white/85 font-semibold">· {fmt12(it.time)}</span>}
              </span>
            ))}
          </div>
        )}
      </div>
      <ChevronRight size={16} className="text-slate-300 shrink-0 mt-1" />
    </div>
  );
}

// Bottom-sheet body for a single day: list of entries + Add button.
function DaySheet({ iso, items, onAdd, onEdit, onClose }) {
  const d = new Date(iso + "T12:00");
  const dayLabel = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="font-extrabold text-lg">{dayLabel}</div>
        <button onClick={onClose} className="text-slate-400 text-sm font-bold">Close</button>
      </div>
      {items.length === 0 && (
        <div className="text-sm text-slate-400 mb-3">Nothing scheduled. Add the first thing below.</div>
      )}
      {items.map((it) => (
        <div
          key={it.key}
          className={`p-3 mb-2 rounded-xl border ${it.event ? "border-slate-200" : "border-slate-100 bg-slate-50"}`}
        >
          <div
            onClick={() => onEdit && it.event && onEdit(it.event)}
            className={`flex items-start gap-2 ${it.event ? "cursor-pointer" : ""}`}
          >
            <div className="w-1.5 self-stretch rounded-full shrink-0 min-h-[1.5rem]" style={{ background: it.color || "#6366f1" }} />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm truncate">{it.title}</div>
              {(it.time || it.subtitle) && (
                <div className="text-[11px] text-slate-500 truncate">
                  {it.time && <span>{fmt12(it.time)}</span>}
                  {it.time && it.subtitle && <span> · </span>}
                  {it.subtitle}
                </div>
              )}
              {it.address && (
                <div className="text-[11px] text-slate-600 mt-1 leading-snug select-text">{it.address}</div>
              )}
              {it.driverName && (
                <div className="text-[11px] font-bold text-indigo-700 mt-1">🚗 {it.driverName} taking</div>
              )}
            </div>
            {it.recurring && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600 shrink-0">Every {it.recurWeekdayLabel}</span>}
            {it.event && <ChevronRight size={14} className="text-slate-300 shrink-0 mt-0.5" />}
          </div>
          {it.address && <MapLinksRow address={it.address} size="sm" />}
        </div>
      ))}
      <button
        onClick={onAdd}
        className="w-full mt-2 py-3 rounded-2xl bg-indigo-600 text-white font-extrabold text-sm flex items-center justify-center gap-2"
      >
        <Plus size={16} /> Add to {WEEKDAY_NAMES_FULL[d.getDay()]}
      </button>
    </div>
  );
}

// Wheel-style time picker — three buttons-rows (hour, minute, AM/PM).
// Big tap targets, no keyboard, no free text. NULL = all-day toggle.
function TimePicker({ value, onChange }) {
  const allDay = !value;
  let h = 9, m = 0, ampm = "AM";
  if (value) {
    const [hStr, mStr] = value.split(":");
    let hh = Number(hStr);
    ampm = hh >= 12 ? "PM" : "AM";
    hh = hh % 12; if (hh === 0) hh = 12;
    h = hh;
    m = Number(mStr);
  }
  const setParts = (hh, mm, ap) => {
    let h24 = hh % 12;
    if (ap === "PM") h24 += 12;
    onChange(`${String(h24).padStart(2, "0")}:${String(mm).padStart(2, "0")}`);
  };
  return (
    <div>
      <button
        type="button"
        onClick={() => onChange(allDay ? "09:00" : null)}
        className={`text-[11px] font-bold px-2 py-1 rounded-full mb-2 ${allDay ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-500"}`}
      >
        {allDay ? "✓ All day" : "All day"}
      </button>
      {!allDay && (
        <div className="grid grid-cols-3 gap-1.5">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 text-center">Hour</div>
            <div className="max-h-32 overflow-y-auto bg-slate-50 rounded-xl p-1 space-y-0.5">
              {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((hh) => (
                <button key={hh} type="button" onClick={() => setParts(hh, m, ampm)} className={`w-full py-1.5 rounded-lg text-sm font-bold ${h === hh ? "bg-indigo-600 text-white" : "text-slate-600"}`}>{hh}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 text-center">Min</div>
            <div className="max-h-32 overflow-y-auto bg-slate-50 rounded-xl p-1 space-y-0.5">
              {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((mm) => (
                <button key={mm} type="button" onClick={() => setParts(h, mm, ampm)} className={`w-full py-1.5 rounded-lg text-sm font-bold ${m === mm ? "bg-indigo-600 text-white" : "text-slate-600"}`}>:{String(mm).padStart(2, "0")}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 text-center">AM/PM</div>
            <div className="bg-slate-50 rounded-xl p-1 space-y-0.5">
              <button type="button" onClick={() => setParts(h, m, "AM")} className={`w-full py-1.5 rounded-lg text-sm font-bold ${ampm === "AM" ? "bg-indigo-600 text-white" : "text-slate-600"}`}>AM</button>
              <button type="button" onClick={() => setParts(h, m, "PM")} className={`w-full py-1.5 rounded-lg text-sm font-bold ${ampm === "PM" ? "bg-indigo-600 text-white" : "text-slate-600"}`}>PM</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Build "open in maps" URLs. Apple Maps and Google Maps both accept
// query-style searches that handle either a free-text venue name or
// a street address. Waze's deeplink behaves the same. Encoded once;
// reused by every map button. Universal links work in iOS Safari,
// Android Chrome, and on desktop.
function mapsUrls(address) {
  const q = encodeURIComponent((address || "").trim());
  return {
    apple:  `https://maps.apple.com/?q=${q}`,
    google: `https://www.google.com/maps/search/?api=1&query=${q}`,
    waze:   `https://waze.com/ul?q=${q}&navigate=yes`,
  };
}

function MapLinksRow({ address, size = "sm" }) {
  const [copied, setCopied] = useState(false);
  if (!address || !address.trim()) return null;
  const trimmed = address.trim();
  const urls = mapsUrls(trimmed);
  const cls = size === "lg"
    ? "px-3 py-2 rounded-xl text-[12px]"
    : "px-2.5 py-1.5 rounded-full text-[11px]";
  const copy = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(trimmed);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Older browsers / restrictive contexts — fall back to a
      // hidden textarea select-and-copy so a Krissie-tier user
      // still gets the address onto their clipboard.
      try {
        const ta = document.createElement("textarea");
        ta.value = trimmed;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } catch {
        // Give up — the address text is still visible above; the
        // parent can long-press to copy manually.
      }
    }
  };
  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      <a href={urls.apple}  target="_blank" rel="noopener noreferrer" className={`${cls} bg-slate-100 text-slate-700 font-bold active:scale-95`}>📍 Apple Maps</a>
      <a href={urls.google} target="_blank" rel="noopener noreferrer" className={`${cls} bg-blue-50 text-blue-700 font-bold active:scale-95`}>🗺️ Google</a>
      <a href={urls.waze}   target="_blank" rel="noopener noreferrer" className={`${cls} bg-violet-50 text-violet-700 font-bold active:scale-95`}>🚗 Waze</a>
      <button type="button" onClick={copy} className={`${cls} ${copied ? "bg-emerald-100 text-emerald-700" : "bg-amber-50 text-amber-700"} font-bold active:scale-95`}>
        {copied ? "✓ Copied" : "📋 Copy"}
      </button>
    </div>
  );
}

// Convert "HH:MM" → minutes-since-midnight. Used by the overlap math.
function timeToMinutes(hhmm) {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map((x) => Number(x));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

// Return any events on the same date (or weekday, for recurring) that
// overlap the candidate's time window. Excludes the candidate itself
// when editing. Default 60-min duration when an event has none.
function findOverlaps({ candidate, allEvents = [], defaultDuration = 60 }) {
  const startA = timeToMinutes(candidate.time);
  if (startA == null) return []; // all-day events don't conflict
  const durA = Number.isFinite(candidate.durationMinutes) ? candidate.durationMinutes : defaultDuration;
  const endA = startA + durA;
  const isRecurA = Number.isInteger(candidate.recurWeekday);
  const weekdayA = isRecurA ? candidate.recurWeekday : (candidate.date ? new Date(candidate.date + "T12:00").getDay() : null);
  return allEvents.filter((ev) => {
    if (ev.id && candidate.id && ev.id === candidate.id) return false;
    const startB = timeToMinutes(ev.time);
    if (startB == null) return false;
    const durB = Number.isFinite(ev.durationMinutes) ? ev.durationMinutes : defaultDuration;
    const endB = startB + durB;
    // Day match: either both same iso date, or recurring + candidate weekday matches.
    const sameDay =
      (ev.date && candidate.date && ev.date === candidate.date)
      || (Number.isInteger(ev.recurWeekday) && weekdayA != null && ev.recurWeekday === weekdayA)
      || (isRecurA && ev.date && weekdayA === new Date(ev.date + "T12:00").getDay());
    if (!sameDay) return false;
    return startA < endB && startB < endA;
  });
}

// Add / edit event sheet body. Used for both new and existing events.
function EventEditSheet({ event, defaultDate, defaultRecurWeekday, activities = [], pastTitles = [], allEvents = [], drivers = [], onSave, onDelete, onClose }) {
  const isEdit = !!event;
  const [title, setTitle] = useState(event?.title || "");
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [date, setDate] = useState(event?.date || defaultDate || "");
  const [time, setTime] = useState(event?.time || null);
  const [durationMinutes, setDurationMinutes] = useState(event?.durationMinutes ?? null);
  const [driverProfileId, setDriverProfileId] = useState(event?.driverProfileId || "");
  const [recur, setRecur] = useState(
    Number.isInteger(event?.recurWeekday) ? event.recurWeekday :
    Number.isInteger(defaultRecurWeekday) ? defaultRecurWeekday : null
  );
  const [address, setAddress] = useState(event?.address || "");
  const [notes, setNotes] = useState(event?.notes || "");

  // Fuzzy autocomplete: surface up to 6 best matches from the family's
  // own activities and any titles they've used on past calendar
  // entries. Tap a row to fill the title (and reuse its color when
  // saved — colorForEvent matches the title back to an activity).
  const suggestions = useMemo(() => {
    const haystack = [];
    for (const a of activities) {
      if (a.status === "archived") continue;
      haystack.push({ key: "a:" + a.id, label: a.name, color: a.color, kind: "activity" });
      if (a.short && a.short.toLowerCase() !== a.name.toLowerCase()) {
        haystack.push({ key: "as:" + a.id, label: a.short, color: a.color, kind: "activity" });
      }
    }
    const seenPast = new Set(haystack.map((h) => h.label.toLowerCase()));
    for (const t of pastTitles) {
      const k = (t || "").trim();
      if (!k) continue;
      if (seenPast.has(k.toLowerCase())) continue;
      seenPast.add(k.toLowerCase());
      haystack.push({ key: "p:" + k, label: k, color: "#94a3b8", kind: "past" });
    }
    const q = title.trim();
    if (!q) return haystack.slice(0, 6);
    const scored = haystack
      .map((h) => ({ h, m: fuzzyMatch(q, h.label) }))
      .filter((x) => x.m.hit && x.h.label.toLowerCase() !== q.toLowerCase())
      .sort((a, b) => b.m.score - a.m.score)
      .slice(0, 6)
      .map((x) => x.h);
    return scored;
  }, [activities, pastTitles, title]);
  const repeatChecked = Number.isInteger(recur);
  const dayFor = (iso) => iso ? new Date(iso + "T12:00").getDay() : null;
  const toggleRepeat = () => {
    if (repeatChecked) {
      setRecur(null);
    } else {
      setRecur(dayFor(date) ?? new Date().getDay());
    }
  };
  const save = () => {
    if (!title.trim()) return;
    const payload = {
      title: title.trim(),
      date: date || null,
      time: time || null,
      durationMinutes: Number.isFinite(durationMinutes) ? durationMinutes : null,
      recurWeekday: repeatChecked ? recur : null,
      address: address.trim() || null,
      driverProfileId: driverProfileId || null,
      notes: notes.trim() || null,
      category: event?.category || "Activity",
    };
    onSave(payload);
  };
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="font-extrabold text-lg">{isEdit ? "Edit" : "Add to calendar"}</div>
        <button onClick={onClose} className="text-slate-400 text-sm font-bold">Close</button>
      </div>
      <label className="block text-[11px] uppercase tracking-wider font-bold text-slate-500 mb-1">What</label>
      <input
        value={title}
        onChange={(e) => { setTitle(e.target.value); setShowSuggestions(true); }}
        onFocus={() => setShowSuggestions(true)}
        placeholder="e.g. Soccer practice"
        autoFocus={!isEdit}
        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-base font-semibold"
      />
      {showSuggestions && suggestions.length > 0 && !isEdit && (
        <div className="mt-1.5 mb-3 rounded-xl border border-slate-100 bg-slate-50 p-1.5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500 px-1.5 mb-1">
            {title.trim() ? "Did you mean" : "Tap to use one you already have"}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => {
                  setTitle(s.label);
                  setShowSuggestions(false);
                  // Auto-fill the address from the matching activity if
                  // we don't have one yet. Saves Mike from retyping
                  // "Rose Bowl Aquatics, 360 N Arroyo Blvd…" every time.
                  if (!address.trim() && s.kind === "activity") {
                    const a = activities.find((x) => (x.name === s.label) || (x.short === s.label));
                    if (a?.address) setAddress(a.address);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-700 active:scale-95"
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color || "#94a3b8" }} />
                {s.label}
                {s.kind === "past" && <span className="text-[9px] font-medium text-slate-400">past</span>}
              </button>
            ))}
          </div>
        </div>
      )}
      {(!showSuggestions || suggestions.length === 0 || isEdit) && <div className="mb-3" />}
      <label className="block text-[11px] uppercase tracking-wider font-bold text-slate-500 mb-1">When</label>
      <input
        type="date"
        value={date || ""}
        onChange={(e) => setDate(e.target.value)}
        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-base mb-3"
      />
      <label className="block text-[11px] uppercase tracking-wider font-bold text-slate-500 mb-1">Time</label>
      <TimePicker value={time} onChange={setTime} />

      {time && (
        <>
          <label className="block text-[11px] uppercase tracking-wider font-bold text-slate-500 mb-1 mt-3">How long</label>
          <div className="flex flex-wrap gap-1.5">
            {[
              { v: 15, label: "15m" },
              { v: 30, label: "30m" },
              { v: 45, label: "45m" },
              { v: 60, label: "1h" },
              { v: 90, label: "1h 30m" },
              { v: 120, label: "2h" },
              { v: 180, label: "3h" },
            ].map((opt) => (
              <button
                key={opt.v}
                type="button"
                onClick={() => setDurationMinutes(durationMinutes === opt.v ? null : opt.v)}
                className={`px-2.5 py-1.5 rounded-full text-xs font-bold transition ${(durationMinutes === opt.v) ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {!Number.isFinite(durationMinutes) && (
            <div className="text-[10px] text-slate-400 mt-1">No length set — assumes 1 hour for conflict detection.</div>
          )}
        </>
      )}

      {(() => {
        if (!time) return null;
        const candidate = {
          id: event?.id,
          date: repeatChecked ? null : date,
          time,
          durationMinutes,
          recurWeekday: repeatChecked ? recur : null,
        };
        const overlaps = findOverlaps({ candidate, allEvents });
        if (overlaps.length === 0) return null;
        return (
          <Card className="mt-3 p-3 bg-amber-50 border border-amber-200">
            <div className="text-[11px] uppercase tracking-wider font-bold text-amber-700 mb-1">⚠️ Heads up — overlap</div>
            <div className="text-[12px] text-amber-800 leading-snug mb-1">This time conflicts with {overlaps.length === 1 ? "another scheduled item" : `${overlaps.length} other scheduled items`}:</div>
            <ul className="text-[12px] text-amber-900 pl-4 list-disc">
              {overlaps.map((o) => (
                <li key={o.id}>{o.title}{o.time ? ` · ${fmt12(o.time)}` : ""}{Number.isFinite(o.durationMinutes) ? ` (${o.durationMinutes}m)` : ""}</li>
              ))}
            </ul>
            <div className="text-[10px] text-amber-700 mt-2">You can still save — this is just a warning.</div>
          </Card>
        );
      })()}

      <button
        type="button"
        onClick={toggleRepeat}
        className={`w-full mt-4 flex items-center justify-between rounded-xl px-3 py-2.5 ${repeatChecked ? "bg-violet-50 border border-violet-200" : "bg-slate-50 border border-slate-200"}`}
      >
        <span className="text-sm font-semibold">Repeat every {date ? WEEKDAY_NAMES_FULL[dayFor(date)] : "week"}</span>
        <span className={`w-10 h-6 rounded-full p-0.5 transition shrink-0 ${repeatChecked ? "bg-emerald-500" : "bg-slate-300"}`}>
          <span className={`block w-5 h-5 bg-white rounded-full transition ${repeatChecked ? "translate-x-4" : ""}`} />
        </span>
      </button>
      <label className="block text-[11px] uppercase tracking-wider font-bold text-slate-500 mb-1 mt-4">Address (optional)</label>
      <input
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="e.g. 360 N Arroyo Blvd, Pasadena, CA 91103"
        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
      />
      {address.trim() && <MapLinksRow address={address} size="sm" />}

      {drivers.length > 0 && (
        <>
          <label className="block text-[11px] uppercase tracking-wider font-bold text-slate-500 mb-1 mt-4">Who's driving (optional)</label>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setDriverProfileId("")}
              className={`px-2.5 py-1.5 rounded-full text-xs font-bold ${!driverProfileId ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-500"}`}
            >
              — Not set
            </button>
            {drivers.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setDriverProfileId(p.id === driverProfileId ? "" : p.id)}
                className={`px-2.5 py-1.5 rounded-full text-xs font-bold ${driverProfileId === p.id ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700"}`}
              >
                🚗 {p.name}
              </button>
            ))}
          </div>
        </>
      )}

      <label className="block text-[11px] uppercase tracking-wider font-bold text-slate-500 mb-1 mt-4">Notes (optional)</label>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="What to bring, who's picking up, anything else…"
        rows={2}
        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none mb-3"
      />
      <div className="flex gap-2 mt-2">
        {isEdit && onDelete && (
          <button onClick={() => { if (confirm("Remove this from the calendar?")) { onDelete(); onClose(); } }} className="px-3 py-2.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 font-bold text-xs">Remove</button>
        )}
        <div className="flex-1" />
        <button onClick={onClose} className="px-3 py-2.5 rounded-xl bg-slate-100 text-slate-500 font-bold text-xs">Cancel</button>
        <button
          disabled={!title.trim()}
          onClick={() => { save(); onClose(); }}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs text-white ${title.trim() ? "bg-indigo-600" : "bg-slate-300"}`}
        >
          {isEdit ? "Save" : "Add"}
        </button>
      </div>
    </div>
  );
}

// Week-override picker. One toggle to mark the current visible week as
// "different" so recurring entries hide. Also lists active overrides.
function WeekOverrideCard({ weekStartIso, weekEndIso, overrides = [], setWeekOverrides }) {
  const active = inOverride(weekStartIso, overrides);
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState("");
  const startOverride = () => {
    const o = {
      id: "wo_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
      startDate: weekStartIso,
      endDate: weekEndIso,
      label: label.trim() || "This week is different",
    };
    setWeekOverrides([...(overrides || []), o]);
    setEditing(false);
    setLabel("");
  };
  const stopOverride = (id) => {
    setWeekOverrides((overrides || []).filter((o) => o.id !== id));
  };
  if (active) {
    return (
      <Card className="p-3 mb-3 bg-violet-50 border-violet-200">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-wider font-bold text-violet-600 mb-0.5">Override active</div>
            <div className="font-bold text-sm truncate">{active.label}</div>
            <div className="text-[11px] text-slate-500">Recurring entries hidden this week</div>
          </div>
          <button onClick={() => stopOverride(active.id)} className="text-xs font-bold px-2.5 py-1.5 rounded-xl bg-white text-violet-700 border border-violet-200">End override</button>
        </div>
      </Card>
    );
  }
  if (editing) {
    return (
      <Card className="p-3 mb-3 bg-violet-50 border-violet-200">
        <div className="text-xs font-bold text-violet-700 mb-2">Mark this week different</div>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Family trip, theme park day…"
          autoFocus
          className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm mb-2"
        />
        <div className="flex gap-2">
          <button onClick={() => { setEditing(false); setLabel(""); }} className="flex-1 py-1.5 rounded-lg bg-slate-100 text-slate-500 font-bold text-xs">Cancel</button>
          <button onClick={startOverride} className="flex-1 py-1.5 rounded-lg bg-violet-600 text-white font-bold text-xs">Start override</button>
        </div>
      </Card>
    );
  }
  return (
    <button
      onClick={() => setEditing(true)}
      className="w-full text-left mb-3 rounded-2xl border border-dashed border-violet-200 bg-white p-3 active:scale-[0.99]"
    >
      <div className="text-[11px] font-bold text-violet-600 uppercase tracking-wider">Make this week different</div>
      <div className="text-[11px] text-slate-500 mt-0.5">Vacation, Disney day, visiting family — hide the normal weekly schedule for this one week.</div>
    </button>
  );
}

function CalendarView({ events, addEvent, updateEvent, removeEvent, mode, tkdDays, tkdTimes, toggleTkdDay, setTkdTime, weeklyActivityDays = {}, weeklyActivityTimes = {}, toggleWeeklyDay, setWeeklyDayTime, activities, users = [], weekOverrides = [], setWeekOverrides }) {
  // Active activities that opted into the per-week day picker. Mike:
  // "We should be able to add another activity like Swim, Basketball,
  // Drums for when those do have days they change. … flexibility to
  // add these when needed and to hide them when they aren't needed."
  // Status-aware: paused / archived activities drop out automatically.
  const weeklyActivities = activities.filter((a) => a.weeklySchedule && a.status === "active");
  // Per-activity day lookup that respects legacy tkdDays / tkdTimes
  // for a_tkd. If the parent never touched the new generic picker for
  // Taekwondo, we read the original familySettings; otherwise the
  // generic state wins so flipping a new day in either UI is the
  // canonical source.
  const daysFor = (a) => {
    if (Array.isArray(weeklyActivityDays?.[a.id])) return weeklyActivityDays[a.id];
    if (a.id === "a_tkd") return tkdDays || [];
    return [];
  };
  const timesFor = (a) => {
    if (weeklyActivityTimes?.[a.id]) return weeklyActivityTimes[a.id];
    if (a.id === "a_tkd") return tkdTimes || {};
    return {};
  };
  const toggleDayFor = (a, day) => {
    // For a_tkd, write to BOTH the new generic state AND the legacy
    // tkdDays so the rest of the app (pinnedToday, treasure streak)
    // sees the same picks until everything's migrated.
    if (a.id === "a_tkd" && toggleTkdDay) toggleTkdDay(day);
    if (toggleWeeklyDay) toggleWeeklyDay(a.id, day);
  };
  const setTimeFor = (a, day, t) => {
    if (a.id === "a_tkd" && setTkdTime) setTkdTime(day, t);
    if (setWeeklyDayTime) setWeeklyDayTime(a.id, day, t);
  };
  // Build the weekly grid: scheduled fixed-day items + every weekly-
  // schedule activity's per-week picks + every RECURRING event from
  // the events table (recur_weekday set). The events bit keeps this
  // legacy view in sync with the new tap-day calendar — anything
  // Mike adds with "Repeat every Tuesday" shows here too. Dedupes
  // by title-to-activity match so a "Drums" activity entry + a
  // "Drum class" event don't both render side by side.
  const weekly = DAYS.map((day) => {
    const items = [];
    // 1. Fixed activity schedules.
    activities.forEach((a) => (a.schedule || []).forEach((s) => { if (s.day === day) items.push({ name: a.short || a.name, time: s.time, color: a.color, status: a.status, note: a.note }); }));
    // 2. Flexible weekly-schedule activity per-week picks.
    for (const a of weeklyActivities) {
      if (daysFor(a).includes(day)) {
        items.push({ name: a.short || a.name, time: timesFor(a)[day] || "set a time", color: a.color, weeklyPicked: true, status: a.status });
      }
    }
    // 3. Recurring events from the events table for this weekday.
    //    Skip events whose title fuzzily matches an existing activity
    //    that already has a schedule entry for this day — that's the
    //    "Drums activity + Drum class event" dedup. Both refer to the
    //    same Tuesday slot; we don't want two pills.
    const dayActivityNames = new Set(
      activities
        .filter((a) => (a.schedule || []).some((s) => s.day === day))
        .map((a) => (a.name || "").toLowerCase())
    );
    const weekdayIdx = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"].indexOf(day);
    for (const ev of events || []) {
      if (!Number.isInteger(ev.recurWeekday)) continue;
      if (ev.recurWeekday !== weekdayIdx) continue;
      const t = (ev.title || "").toLowerCase();
      const dupes = [...dayActivityNames].some((n) => n && (t.includes(n) || n.includes(t)));
      if (dupes) continue;
      // Inline color resolver (avoids forward-referencing the
      // colorForEvent helper which is declared further down — that
      // would hit a temporal dead zone). Match the title against any
      // activity for a tint; fall back to recurring-event violet.
      const matchAct = activities.find((a) => {
        const n = (a.name || "").toLowerCase();
        const s = (a.short || "").toLowerCase();
        return (n && t.includes(n)) || (s && t.includes(s));
      });
      items.push({
        name: ev.title,
        time: ev.time ? fmt12(ev.time) : "",
        color: matchAct?.color || "#7c3aed",
        status: "active",
        note: ev.notes || "",
        recurringEvent: true,
      });
    }
    return { day, items };
  });
  const statusTag = { break: i18nTOf("cal_status_break", "on break"), seasonal: i18nTOf("cal_status_seasonal", "seasonal") };
  // --- New simple week-strip UX -------------------------------------
  const [weekOffset, setWeekOffset] = useState(0); // 0 = this week
  const [openDay, setOpenDay] = useState(null);    // ISO yyyy-mm-dd
  const [editingEvent, setEditingEvent] = useState(null); // null | "new" | event obj
  const todayDate = new Date();
  const todayIso = fmtIso(todayDate);
  const weekStartDate = new Date(startOfWeek(todayDate));
  weekStartDate.setDate(weekStartDate.getDate() + weekOffset * 7);
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStartDate);
    d.setDate(d.getDate() + i);
    return d;
  });
  const weekStartIso = fmtIso(weekDates[0]);
  const weekEndIso = fmtIso(weekDates[6]);
  const weekOverride = inOverride(weekStartIso, weekOverrides);

  // Color-code events: if title contains/matches an activity name,
  // use that activity's color so "Drum class" / "Swim" / "Soccer
  // practice" inherit their owning activity's color. Otherwise fall
  // back to a category color so School / Activity / Field Trip are
  // visually distinct even without a linked activity.
  const CATEGORY_COLORS = {
    School:       "#0ea5e9",
    Activity:     "#10b981",
    "Field Trip": "#f59e0b",
    Personal:     "#a855f7",
    Other:        "#6366f1",
  };
  const colorForEvent = (ev) => {
    const t = (ev.title || "").toLowerCase();
    for (const a of activities || []) {
      const n = (a.name || "").toLowerCase();
      const s = (a.short || "").toLowerCase();
      if (!n) continue;
      if (t.includes(n) || (s && t.includes(s))) return a.color;
    }
    return CATEGORY_COLORS[ev.category] || CATEGORY_COLORS.Other;
  };

  // Build a per-day items list combining date-specific events and
  // recurring events (matched by weekday). Recurring entries hide
  // when the week is overridden — temp events for that week land as
  // date-specific entries on the right dates.
  const itemsForDate = (d) => {
    const iso = fmtIso(d);
    const wd = d.getDay();
    const list = [];
    for (const ev of events || []) {
      if (Number.isInteger(ev.recurWeekday)) {
        // Recurring: only render when no override AND weekday matches
        if (!weekOverride && ev.recurWeekday === wd) {
          list.push({
            key: ev.id + ":" + iso,
            title: ev.title,
            time: ev.time,
            subtitle: ev.notes,
            address: ev.address || "",
            driverName: ev.driverProfileId ? (users.find((u) => u.id === ev.driverProfileId)?.name || "") : "",
            color: colorForEvent(ev),
            recurring: true,
            recurWeekdayLabel: WEEKDAY_NAMES_FULL[ev.recurWeekday],
            event: ev,
          });
        }
      } else if (ev.date === iso) {
        list.push({
          key: ev.id,
          title: ev.title,
          time: ev.time,
          subtitle: ev.notes,
          address: ev.address || "",
          driverName: ev.driverProfileId ? (users.find((u) => u.id === ev.driverProfileId)?.name || "") : "",
          color: colorForEvent(ev),
          recurring: false,
          event: ev,
        });
      }
    }
    // Add activity recurring schedule items (read-only here — they're
    // edited under Manage Activities). Suppress when overridden.
    if (!weekOverride) {
      const dayName = WEEKDAY_NAMES_FULL[wd];
      for (const a of activities || []) {
        if (a.status !== "active") continue;
        for (const s of (a.schedule || [])) {
          if (s.day === dayName) {
            list.push({
              key: "act_" + a.id + ":" + iso,
              title: a.name,
              // schedule slots store times like "5:00–6:00 PM" — not
              // HH:MM. Pass as subtitle so fmt12 doesn't break.
              time: null,
              subtitle: s.time,
              address: a.address || "",
              color: a.color,
              recurring: false,
              event: null, // not editable from here
            });
          }
        }
      }
    }
    // Sort: timed first by time, then untimed by title.
    list.sort((a, b) => {
      const at = a.time || (a.subtitle && /\d/.test(a.subtitle) ? "99:99" : "99:99");
      const bt = b.time || (b.subtitle && /\d/.test(b.subtitle) ? "99:99" : "99:99");
      if (at !== bt) return at.localeCompare(bt);
      return (a.title || "").localeCompare(b.title || "");
    });
    return list;
  };

  const openDayItems = openDay ? itemsForDate(new Date(openDay + "T12:00")) : [];
  const openDayWeekday = openDay ? new Date(openDay + "T12:00").getDay() : null;

  const saveEvent = (payload) => {
    if (editingEvent && editingEvent !== "new") {
      updateEvent && updateEvent(editingEvent.id, payload);
    } else {
      addEvent && addEvent(payload);
    }
    setEditingEvent(null);
  };
  const deleteEvent = () => {
    if (editingEvent && editingEvent !== "new" && removeEvent) {
      removeEvent(editingEvent.id);
    }
    setEditingEvent(null);
  };

  // Schedule-scan state — sibling shape to the Shopping List scan.
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const [scanResults, setScanResults] = useState(null);
  const onScanFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setScanError("");
    setScanResults(null);
    setScanning(true);
    try {
      const { scanImage } = await import("./lib/visionScan.js");
      const j = await scanImage({ file, kind: "schedule" });
      if (j.status === "vision_not_configured") {
        setScanError("Vision isn't set up yet — paste ANTHROPIC_API_KEY into Netlify env vars first.");
      } else if (j.status !== "ok") {
        setScanError("Couldn't read that one — try a sharper photo or a screenshot.");
      } else if (!j.data?.events?.length) {
        setScanResults({ events: [] });
      } else {
        setScanResults({ events: j.data.events.map((ev) => ({ ...ev, picked: true })) });
      }
    } catch (err) {
      setScanError(String(err?.message || err));
    } finally {
      setScanning(false);
    }
  };
  const toggleScanPicked = (i) => setScanResults((s) => ({ ...s, events: s.events.map((ev, idx) => idx === i ? { ...ev, picked: !ev.picked } : ev) }));
  const commitScannedEvents = () => {
    const picked = (scanResults?.events || []).filter((ev) => ev.picked);
    for (const ev of picked) {
      addEvent && addEvent({
        title: ev.title || "Event",
        date: ev.date || null,
        time: ev.time || null,
        durationMinutes: Number.isFinite(ev.durationMinutes) ? ev.durationMinutes : null,
        recurWeekday: null,
        address: ev.address || null,
        notes: ev.notes || null,
        category: "Activity",
      });
    }
    setScanResults(null);
  };

  return (
    <div className="px-4 pt-4">
      <h2 className="font-extrabold text-lg px-1">{i18nTOf("cal_heading", "Calendar")}</h2>

      <label className="block mt-2">
        <input type="file" accept="image/*" onChange={onScanFile} className="hidden" />
        <span className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-bold text-xs cursor-pointer active:scale-[0.99]">
          📷 Scan a schedule / program / screenshot
        </span>
      </label>

      {scanning && (
        <Card className="p-3 mt-2 bg-slate-50 text-center">
          <div className="text-[12px] text-slate-500">Reading the schedule…</div>
        </Card>
      )}
      {scanError && !scanResults && (
        <Card className="p-3 mt-2 bg-rose-50 border-rose-200">
          <div className="text-[12px] text-rose-700">{scanError}</div>
        </Card>
      )}
      {scanResults && scanResults.events.length === 0 && (
        <Card className="p-3 mt-2 bg-slate-50 border-slate-200">
          <div className="text-[12px] text-slate-600">Didn't find any events. Try a sharper photo or a screenshot.</div>
          <button onClick={() => setScanResults(null)} className="mt-2 text-[11px] font-bold text-slate-500">Dismiss</button>
        </Card>
      )}
      {scanResults && scanResults.events.length > 0 && (
        <Card className="p-3 mt-2 bg-amber-50 border-amber-200">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] uppercase tracking-wider font-bold text-amber-700">Found {scanResults.events.length} event{scanResults.events.length === 1 ? "" : "s"}</div>
            <button onClick={() => setScanResults(null)} className="text-[11px] font-bold text-slate-500">Cancel</button>
          </div>
          <div className="text-[11px] text-amber-700 mb-2">Tap to uncheck any you don't want. You can edit details after adding.</div>
          {scanResults.events.map((ev, i) => (
            <div key={i} className="flex items-start gap-2 mb-2 last:mb-0 bg-white border border-slate-200 rounded-xl p-2">
              <button
                onClick={() => toggleScanPicked(i)}
                className={`w-6 h-6 rounded-full grid place-items-center shrink-0 transition active:scale-90 mt-0.5 ${ev.picked ? "bg-emerald-500 text-white" : "border-2 border-slate-200"}`}
              >
                {ev.picked && <Check size={13} />}
              </button>
              <div className={`flex-1 min-w-0 ${ev.picked ? "" : "opacity-50"}`}>
                <div className="font-bold text-sm truncate">{ev.title || "Event"}</div>
                <div className="text-[11px] text-slate-500 leading-snug">
                  {ev.date && <>{new Date(ev.date + "T12:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</>}
                  {ev.date && ev.time && <> · </>}
                  {ev.time && fmt12(ev.time)}
                  {Number.isFinite(ev.durationMinutes) && <> · {ev.durationMinutes}m</>}
                </div>
                {ev.address && <div className="text-[10px] text-slate-400 leading-snug mt-0.5">📍 {ev.address}</div>}
                {ev.notes && <div className="text-[10px] text-slate-500 leading-snug mt-0.5">{ev.notes}</div>}
              </div>
            </div>
          ))}
          <button
            onClick={commitScannedEvents}
            disabled={scanResults.events.filter((ev) => ev.picked).length === 0}
            className={`w-full mt-2 py-2.5 rounded-xl font-bold text-sm text-white ${scanResults.events.filter((ev) => ev.picked).length === 0 ? "bg-slate-300" : "bg-indigo-600 active:scale-95"}`}
          >
            Add {scanResults.events.filter((ev) => ev.picked).length} to calendar
          </button>
        </Card>
      )}

      {/* Week navigation strip */}
      <div className="flex items-center justify-between mt-3 mb-2">
        <button
          onClick={() => setWeekOffset((w) => w - 1)}
          className="px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs"
        >
          ‹ Prev
        </button>
        <div className="text-xs font-bold text-slate-700">
          {weekDates[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} –{" "}
          {weekDates[6].toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </div>
        <button
          onClick={() => setWeekOffset((w) => w + 1)}
          className="px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs"
        >
          Next ›
        </button>
      </div>

      {/* Week-override toggle */}
      <WeekOverrideCard
        weekStartIso={weekStartIso}
        weekEndIso={weekEndIso}
        overrides={weekOverrides}
        setWeekOverrides={setWeekOverrides}
      />

      {/* Weekly load gauge — total scheduled minutes across the week's
          items with a time. Surfaces "Reznor has 14h scheduled this
          week" in plain English; flips amber over 15h, rose over 20h
          per the research on overcommit / burnout patterns. */}
      {(() => {
        let totalMinutes = 0;
        for (const d of weekDates) {
          for (const it of itemsForDate(d)) {
            if (!it.time) continue;
            const dur = Number.isFinite(it.event?.durationMinutes) ? it.event.durationMinutes : 60;
            totalMinutes += dur;
          }
        }
        const hours = Math.round((totalMinutes / 60) * 10) / 10;
        const tone = hours >= 20 ? "rose" : hours >= 15 ? "amber" : hours >= 1 ? "emerald" : "slate";
        const palette = {
          slate:   { bg: "bg-slate-50",   border: "border-slate-200",   ink: "text-slate-500",   label: "Light week" },
          emerald: { bg: "bg-emerald-50", border: "border-emerald-200", ink: "text-emerald-700", label: "Healthy week" },
          amber:   { bg: "bg-amber-50",   border: "border-amber-200",   ink: "text-amber-700",   label: "Heavier than usual" },
          rose:    { bg: "bg-rose-50",    border: "border-rose-200",    ink: "text-rose-700",    label: "Overloaded — consider cutting one" },
        }[tone];
        return (
          <Card className={`p-3 mb-3 ${palette.bg} ${palette.border}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className={`text-[10px] uppercase tracking-wider font-bold ${palette.ink}`}>{palette.label}</div>
                <div className="text-sm font-extrabold text-slate-800">{hours}h scheduled this week</div>
              </div>
              <div className="text-[10px] text-slate-400 text-right max-w-[150px] leading-snug">
                {hours >= 15 && "Watch for burnout signs — tired, melt-downs, slipping streaks."}
                {hours < 15 && hours > 0 && "Room for a playdate or a slow morning."}
                {hours === 0 && "Wide open."}
              </div>
            </div>
          </Card>
        );
      })()}

      {/* The 7 day cells */}
      {weekDates.map((d) => {
        const iso = fmtIso(d);
        const items = itemsForDate(d);
        return (
          <WeekDayCell
            key={iso}
            weekday={WEEKDAY_NAMES[d.getDay()]}
            label={String(d.getDate())}
            items={items}
            overridden={weekOverride}
            isToday={iso === todayIso}
            onTapDay={() => setOpenDay(iso)}
            onTapItem={(ev) => { setOpenDay(iso); setEditingEvent(ev); }}
          />
        );
      })}

      {/* Day sheet — overlay */}
      {openDay && !editingEvent && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-end" onClick={() => setOpenDay(null)}>
          <div
            className="w-full max-w-md mx-auto bg-white rounded-t-3xl max-h-[80vh] overflow-y-auto"
            style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <DaySheet
              iso={openDay}
              items={openDayItems}
              onAdd={() => setEditingEvent("new")}
              onEdit={(ev) => setEditingEvent(ev)}
              onClose={() => setOpenDay(null)}
            />
          </div>
        </div>
      )}

      {/* Add/edit event sheet */}
      {editingEvent && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-end" onClick={() => setEditingEvent(null)}>
          <div
            className="w-full max-w-md mx-auto bg-white rounded-t-3xl max-h-[90vh] overflow-y-auto"
            style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <EventEditSheet
              event={editingEvent === "new" ? null : editingEvent}
              defaultDate={openDay || todayIso}
              defaultRecurWeekday={null}
              activities={activities}
              pastTitles={Array.from(new Set([
                ...(events || []).map((e) => e.title).filter(Boolean),
                "Playdate",
                "Birthday party",
                "Doctor appointment",
                "Dentist",
              ]))}
              allEvents={events}
              drivers={(users || []).filter((u) => ["parent","helper","grandparent","guest"].includes(u.role))}
              onSave={saveEvent}
              onDelete={editingEvent !== "new" ? deleteEvent : null}
              onClose={() => setEditingEvent(null)}
            />
          </div>
        </div>
      )}

      <Card className="p-3 mt-2 bg-amber-50 border-amber-100 flex items-center gap-2 text-sm text-amber-800"><Sun size={16} /> {i18nTOf("cal_summer_banner", "Summer Mode: June 11 – Sept 1, 2026. School starts back ~Sept 1.")}</Card>

      {/* One section per activity that opted into weeklySchedule. */}
      {weeklyActivities.map((a) => {
        const picked = daysFor(a);
        const times = timesFor(a);
        const target = Number(a.weeklyTarget) || 0;
        const need = target > 0 ? Math.max(0, target - picked.length) : 0;
        return (
          <div key={a.id}>
            <SectionTitle
              icon={<span className="w-3 h-3 rounded-full" style={{ background: a.color || "#64748b" }} />}
              right={target > 0 && (
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${picked.length >= target ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                  {picked.length} of {target} picked
                </span>
              )}
            >
              {a.name} this week
            </SectionTitle>
            <Card className="p-3 mb-1">
              <div className="text-[11px] text-slate-400 mb-2">
                Tap the days he'll go this week and set the time. Toggle the activity off under More → Activities when the season ends.
              </div>
              {TKD_SLOTS.map((s) => {
                const on = picked.includes(s.day);
                return (
                  <div key={s.day} className={`flex items-center gap-2 px-2 py-1.5 rounded-xl mb-1 ${on ? "bg-violet-50" : ""}`}>
                    <button onClick={() => toggleDayFor(a, s.day)} className={`w-7 h-7 rounded-lg grid place-items-center shrink-0 ${on ? "text-white" : "border-2 border-slate-200 text-transparent"}`} style={on ? { background: a.color || "#7c3aed" } : undefined}><Check size={15} /></button>
                    <div className="w-24 text-sm font-semibold text-slate-600 shrink-0">{s.day}</div>
                    {on
                      ? <input value={times[s.day] || ""} onChange={(e) => setTimeFor(a, s.day, e.target.value)} placeholder={i18nTOf("cal_tkd_set_time", "set time")} className="flex-1 min-w-0 border border-slate-200 rounded-lg px-2 py-1 text-xs" />
                      : <div className="flex-1 text-xs text-slate-400">{i18nTOf("cal_tkd_time_flexible", "time flexible")}</div>}
                  </div>
                );
              })}
              {target > 0 && (need > 0
                ? <div className="text-[11px] font-semibold text-amber-600 mt-1">Pick {need} more to hit the {target}×/week goal.</div>
                : <div className="text-[11px] font-semibold text-emerald-600 mt-1">Nice — on track for the week.</div>)}
            </Card>
          </div>
        );
      })}
      {weeklyActivities.length === 0 && (
        <Card className="p-3 mt-2 text-[12px] text-slate-500">
          No weekly-schedule activities yet. Turn one on under More → Activities → tap an activity → enable "Weekly schedule" for seasonal sports like Basketball or Swim.
        </Card>
      )}

      <SectionTitle icon={<Clock size={16} className="text-teal-500" />}>{i18nTOf("cal_kids_week", "{kid}'s week").replaceAll("{kid}", kidName(users))}</SectionTitle>
      <Card className="p-1 mb-1">
        {weekly.map((d) => (
          <div key={d.day} className="flex items-start gap-2 px-2 py-2 border-b border-slate-50 last:border-0">
            <div className="text-xs font-bold text-slate-500 w-24 shrink-0">{d.day}</div>
            <div className="flex-1 text-xs space-y-1">
              {d.items.length === 0
                ? <span className="text-slate-300">{i18nTOf("cal_free_rest", "— free / rest")}</span>
                : d.items.map((it, i) => {
                  const paused = it.status === "break" || it.status === "seasonal";
                  return (
                    <div key={i} className={`flex items-center gap-1.5 flex-wrap ${paused ? "opacity-50" : ""}`}>
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: it.color }} />
                      <span className="text-slate-600">{it.name}</span>
                      <span className="text-slate-400">· {it.time}</span>
                      {it.weeklyPicked && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600">{i18nTOf("cal_this_week_tag", "this week")}</span>}
                      {paused && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-500">{statusTag[it.status]}</span>}
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </Card>
      <div className="text-[11px] text-slate-400 px-1 mb-1">{mode === "school" ? i18nTOf("cal_school_hours", "School: 8:00 AM–2:10 PM, Mon–Fri.") : i18nTOf("cal_summer_hours", "Summer homeschool block: 8 AM–2 PM, Mon–Fri.")} {i18nTOf("cal_manage_hint", "Manage breaks & seasons under More → Activities.")}</div>

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
  return list.map((b) => ({
    b,
    m: fuzzyMatch(
      q,
      [
        b.title, b.canonicalTitle,
        b.canonicalAuthor,
        b.level, b.lang,
        b.eraLabel,
        b.notes,
      ].filter(Boolean).join(" ")
    ),
  })).filter((x) => x.m.hit).sort((a, b) => b.m.score - a.m.score).map((x) => x.b);
}

// Sort options for the Reading Library. Apply within each section
// (reading now / finished / archive) so the sections themselves stay
// meaningful — Mike wants to scan "what's actively being read" without
// it intermixing with finished books.
const BOOK_SORT_KEYS = [
  "reading_order", "added_newest", "added_oldest",
  "title_az", "title_za", "author_az",
  "finished_newest", "rating_high",
];
const bookSortLabel = (k) => ({
  reading_order:   i18nTOf("bso_reading_order", "Reading order"),
  added_newest:    i18nTOf("bso_added_newest", "Newest added"),
  added_oldest:    i18nTOf("bso_added_oldest", "Oldest added"),
  title_az:        i18nTOf("bso_title_az", "Title A–Z"),
  title_za:        i18nTOf("bso_title_za", "Title Z–A"),
  author_az:       i18nTOf("bso_author_az", "Author A–Z"),
  finished_newest: i18nTOf("bso_finished_newest", "Finished date"),
  rating_high:     i18nTOf("bso_rating_high", "Rating ★"),
}[k] || k);

// Natural-sort collator. Critical for series like "Vol 1, Vol 2, …
// Vol 10" — plain localeCompare treats "Vol 10" as alphabetically
// before "Vol 2" because it compares char-by-char. numeric: true tells
// the collator to recognize digit runs as numbers and order them
// numerically. Reznor's complaint: archive showed Vol 6, 5, 3, 4, 7,
// 2, 1 in random order. With this collator they sort Vol 1 … Vol 7.
const naturalCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
const natCmp = (a, b) => naturalCollator.compare(a || "", b || "");

function sortBooks(list, sort) {
  const sorted = [...list];
  const titleOf  = (b) => b.canonicalTitle  || b.title  || "";
  const authorOf = (b) => b.canonicalAuthor || "";
  const addedOf  = (b) => b.id || ""; // id is "b_<Date.now()>"; lexicographic sort = chronological
  switch (sort) {
    case "reading_order":
      // Pre-app archive books (preTracking) come first — Reznor read
      // them before the app started, so chronologically earliest.
      // Within archive, natural title sort respects "Vol 1, Vol 2…"
      // order so series stay in the order he actually read them.
      // Tracked finished books come next in true reading order
      // (finished ASC = oldest read first). Anything still in progress
      // (no finished date, not preTracking) sorts to the bottom by
      // natural title.
      sorted.sort((a, b) => {
        const aPre = a.preTracking ? 1 : 0;
        const bPre = b.preTracking ? 1 : 0;
        if (aPre !== bPre) return bPre - aPre; // archive (1) before tracked (0)
        if (a.preTracking && b.preTracking) return natCmp(titleOf(a), titleOf(b));
        // Both tracked. Finished date ASC, then natural title fallback.
        const aFin = a.finished || "";
        const bFin = b.finished || "";
        if (aFin && bFin) return aFin.localeCompare(bFin) || natCmp(titleOf(a), titleOf(b));
        if (aFin) return -1; // finished before not-finished
        if (bFin) return 1;
        return natCmp(titleOf(a), titleOf(b));
      });
      break;
    case "added_newest":    sorted.sort((a, b) => addedOf(b).localeCompare(addedOf(a)) || natCmp(titleOf(a), titleOf(b))); break;
    case "added_oldest":    sorted.sort((a, b) => addedOf(a).localeCompare(addedOf(b)) || natCmp(titleOf(a), titleOf(b))); break;
    case "title_az":        sorted.sort((a, b) => natCmp(titleOf(a), titleOf(b))); break;
    case "title_za":        sorted.sort((a, b) => natCmp(titleOf(b), titleOf(a))); break;
    case "author_az":       sorted.sort((a, b) => natCmp(authorOf(a), authorOf(b)) || natCmp(titleOf(a), titleOf(b))); break;
    case "finished_newest": sorted.sort((a, b) => (b.finished || "").localeCompare(a.finished || "") || natCmp(titleOf(a), titleOf(b))); break;
    case "rating_high":     sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0) || natCmp(titleOf(a), titleOf(b))); break;
    default: break;
  }
  return sorted;
}

// Compact grid tile — cover thumbnail with title beneath. Tapping a
// tile fires onTap(book) which the parent uses to open a bottom sheet
// with the full BookRow + edit panel. Keeps the grid uncluttered;
// editing is one tap away.
function BookGridTile({ b, onTap, selected = false }) {
  const customCoverSigned = useSignedUrl(b.customCoverPath || "");
  const displayCover = customCoverSigned || b.coverUrl || "";
  const title = b.canonicalTitle || b.title || "(untitled)";
  return (
    <button
      type="button"
      onClick={() => onTap?.(b)}
      className={`flex flex-col items-stretch text-left active:scale-[0.97] transition ${selected ? "ring-2 ring-indigo-500 rounded-xl" : ""}`}
      aria-label={`Open ${title}`}
    >
      <div className="aspect-[3/4] rounded-lg overflow-hidden border border-slate-200 bg-slate-100 mb-1 relative">
        {displayCover ? (
          <img
            src={displayCover}
            alt=""
            draggable={false}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        ) : (
          <div className="w-full h-full grid place-items-center text-slate-300">
            <BookOpen size={24} />
          </div>
        )}
        {b.status === "finished" && (
          <span className="absolute top-1 right-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500 text-white">
            ✓
          </span>
        )}
        {b.preTracking && (
          <span className="absolute top-1 left-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500 text-white">
            archive
          </span>
        )}
      </div>
      <div className="text-[11px] font-bold text-slate-800 line-clamp-2 leading-tight">{title}</div>
      {b.canonicalAuthor && (
        <div className="text-[10px] text-slate-500 truncate">{b.canonicalAuthor}</div>
      )}
    </button>
  );
}

// Larger cover tile for the Shelf view — 3:4 portrait (book covers are
// typically tall). Tap-to-open when not rearranging; ← → buttons when
// rearranging. Same pattern as SongShelfTile in MusicLibrary.jsx.
function BookShelfTile({ b, onTap, selected, rearranging, onNudgeLeft, onNudgeRight }) {
  const customCoverSigned = useSignedUrl(b.customCoverPath || "");
  const displayCover = customCoverSigned || b.coverUrl || "";
  const title = b.canonicalTitle || b.title || "(untitled)";
  return (
    <div className={`shrink-0 w-28 ${selected ? "ring-2 ring-indigo-500 rounded-xl" : ""}`}>
      <button
        type="button"
        onClick={onTap}
        disabled={!onTap}
        className="w-full aspect-[3/4] rounded-lg overflow-hidden border border-slate-200 bg-slate-100 relative active:scale-[0.97] transition disabled:active:scale-100"
        aria-label={`Open ${title}`}
      >
        {displayCover ? (
          <img
            src={displayCover}
            alt=""
            draggable={false}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        ) : (
          <div className="w-full h-full grid place-items-center text-slate-300">
            <BookOpen size={28} />
          </div>
        )}
        {b.status === "finished" && (
          <span className="absolute top-1 right-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500 text-white">✓</span>
        )}
        {b.preTracking && (
          <span className="absolute top-1 left-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500 text-white">archive</span>
        )}
      </button>
      <div className="text-[11px] font-bold text-slate-800 line-clamp-2 leading-tight mt-1.5">{title}</div>
      {b.canonicalAuthor && (
        <div className="text-[10px] text-slate-500 truncate">{b.canonicalAuthor}</div>
      )}
      {rearranging && (
        <div className="flex gap-1 mt-1.5">
          <button
            type="button"
            onClick={onNudgeLeft}
            className="flex-1 text-[11px] font-bold py-1 rounded-md bg-amber-100 text-amber-800 border border-amber-200 active:scale-95"
            aria-label="Move left"
          >
            ◀
          </button>
          <button
            type="button"
            onClick={onNudgeRight}
            className="flex-1 text-[11px] font-bold py-1 rounded-md bg-amber-100 text-amber-800 border border-amber-200 active:scale-95"
            aria-label="Move right"
          >
            ▶
          </button>
        </div>
      )}
    </div>
  );
}

function ReadingLibrary({ books, addBook, updateBook, removeBook, familyId, libraryOrder = { songs: [], books: [] }, setLibraryOrder }) {
  const [adding, setAdding] = useState(false);
  const [addingBacklog, setAddingBacklog] = useState(false);
  const [q, setQ] = useState("");
  const [viewMode, setViewMode] = useState("list");
  const [sort, setSort] = useState("reading_order");
  const [focusedBookId, setFocusedBookId] = useState(null);
  const [rearranging, setRearranging] = useState(false);
  // Language filter — "All" by default, narrows to English or Spanish.
  // Persists per session so a parent scanning Reznor's Spanish progress
  // doesn't have to re-pick it on every tab swap.
  const [langFilter, setLangFilter] = useState("All");
  const savedOrder = libraryOrder?.books || [];
  // Build the available-language set from data so future langs (e.g.,
  // French) auto-populate the chip row without a code change.
  const availableLangs = useMemo(() => {
    const set = new Set();
    for (const b of (books || [])) {
      if (b.lang && b.lang.trim()) set.add(b.lang.trim());
    }
    // Stable order: English first, Spanish second, then anything else
    // alphabetical — matches how Mike/Krissie think about Reznor's lineup.
    const known = ["English", "Spanish"].filter((l) => set.has(l));
    const others = [...set].filter((l) => !known.includes(l)).sort();
    return [...known, ...others];
  }, [books]);
  // Apply the language filter at the source so every downstream list
  // (reading, finished, archive, shelf) honors it.
  const langMatch = (b) => langFilter === "All" || (b.lang || "").trim() === langFilter;
  const langFiltered = (books || []).filter(langMatch);
  // Filtered views: archive books (preTracking) ARE finished books —
  // Reznor read them, we just don't have dates. They belong in the
  // Finished list so the count matches reality. The Archive section
  // stays separate for "books read pre-app" grouping (Reznor was
  // upset earlier that they weren't counted).
  const tracked = langFiltered.filter((b) => !b.preTracking);
  const archive = langFiltered.filter((b) => b.preTracking);
  const reading = sortBooks(searchBooks(tracked.filter((b) => b.status !== "finished"), q), sort);
  // Finished list now includes pre-tracking archive books too. We use
  // isBookFinished so any future status (e.g., "archive") is honored.
  const finished = sortBooks(searchBooks(langFiltered.filter(isBookFinished), q), sort);
  const archiveFiltered = sortBooks(searchBooks(archive, q), sort);
  const focusedBook = books.find((b) => b.id === focusedBookId);
  // Shelf view flattens the three sections into one curated shelf.
  // "Hold them in your hands" metaphor doesn't map cleanly to three
  // separate stacks, so the shelf shows everything in one row, with
  // the parent's saved order applied.
  const allFiltered = searchBooks(langFiltered, q);
  const shelfList = savedOrder.length > 0
    ? applyCustomOrder(allFiltered, savedOrder)
    : sortBooks(allFiltered, sort);
  const nudge = (id, direction) => {
    if (!setLibraryOrder) return;
    setLibraryOrder((prev) => {
      const next = nudgeOrder(prev?.books || [], shelfList, id, direction);
      return { ...(prev || {}), books: next };
    });
  };
  const resetShelfOrder = () => {
    if (!setLibraryOrder) return;
    setLibraryOrder((prev) => ({ ...(prev || {}), books: [] }));
  };
  // Count-based stats INCLUDE backlog. They're real books, just no dates.
  const thisMonth = tracked.filter((b) => b.status === "finished" && (b.finished || "").startsWith("2026-06")).length;
  const paces = tracked.filter((b) => b.status === "finished").map((b) => daysBetween(b.started, b.finished)).filter(Boolean);
  const avgPace = paces.length ? Math.round(paces.reduce((s, n) => s + n, 0) / paces.length) : null;
  // Finished count: explicit status=finished OR a pre-tracking archive
  // entry. Archive books ARE finished — Reznor read them, we just have
  // honest "no precise dates" framing instead of made-up timestamps.
  const finishedTotal = books.filter((b) => b.status === "finished" || b.preTracking).length;
  // Group backlog by era_label for the archive header. Uses a plain
  // object instead of `new Map()` because this file imports `Map`
  // from lucide-react as an icon — `new Map()` would resolve to the
  // icon and throw "fi is not a constructor" at runtime after
  // minification. The icon import is now aliased to MapIcon, but
  // the object form is also collision-proof regardless.
  const eraCounts = (() => {
    const m = {};
    for (const b of archive) {
      const k = b.eraLabel || i18nTOf("rl_era_unset", "Era unset");
      m[k] = (m[k] || 0) + 1;
    }
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  })();
  return (
    <>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <Card className="p-3 text-center"><div className="text-2xl font-extrabold text-emerald-500">{finishedTotal}</div><div className="text-[11px] text-slate-400">{i18nTOf("rl_stat_finished", "finished")}</div></Card>
        <Card className="p-3 text-center"><div className="text-2xl font-extrabold text-indigo-500">{thisMonth}</div><div className="text-[11px] text-slate-400">{i18nTOf("ril_this_month", "this month")}</div></Card>
        <Card className="p-3 text-center"><div className="text-2xl font-extrabold text-amber-500">{avgPace ? `${avgPace}d` : "—"}</div><div className="text-[11px] text-slate-400">{i18nTOf("ril_avg_per_book", "avg / book")}</div></Card>
      </div>

      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-3 py-2 mb-3">
        <Search size={16} className="text-slate-400 shrink-0" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={i18nTOf("rl_search_ph", "Search books — title, level, language…")} className="flex-1 text-sm outline-none bg-transparent" />
        {q && <button onClick={() => setQ("")} className="text-slate-300"><X size={15} /></button>}
      </div>

      {/* Language filter — only renders when we actually have multiple
          languages in the dataset, so a single-language family never
          sees a chip row that does nothing. */}
      {availableLangs.length > 1 && (
        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mr-1">{i18nTOf("rl_lang_label", "Language:")}</span>
          {["All", ...availableLangs].map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLangFilter(l)}
              className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                langFilter === l
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-slate-500 border border-slate-200"
              }`}
            >
              {l === "All" ? i18nTOf("rl_lang_all", "All") : l === "English" ? i18nTOf("rl_lang_en", "🇺🇸 English") : l === "Spanish" ? i18nTOf("rl_lang_es", "🇪🇸 Spanish") : l}
            </button>
          ))}
        </div>
      )}

      {/* View + sort row. View toggle stays a fixed 2-segment control;
          sort pills scroll horizontally so we don't crowd small screens. */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 shrink-0">
          {[["list", i18nTOf("rl_view_list", "List")], ["grid", i18nTOf("rl_view_grid", "Grid")], ["shelf", i18nTOf("rl_view_shelf", "Shelf")]].map(([k, label]) => (
            <button
              key={k}
              onClick={() => setViewMode(k)}
              className={`text-[11px] font-bold px-3 py-1.5 rounded-lg ${
                viewMode === k ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex-1 flex gap-1.5 overflow-x-auto scrollbar-thin">
          {BOOK_SORT_KEYS.map((k) => (
            <button
              key={k}
              onClick={() => setSort(k)}
              className={`shrink-0 text-[11px] font-bold px-2.5 py-1.5 rounded-full whitespace-nowrap ${
                sort === k ? "bg-indigo-600 text-white" : "bg-white text-slate-500 border border-slate-200"
              }`}
            >
              {bookSortLabel(k)}
            </button>
          ))}
        </div>
      </div>

      {!adding && !addingBacklog && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          <button onClick={() => setAdding(true)} className="py-2.5 rounded-2xl bg-indigo-600 text-white font-bold text-sm flex items-center justify-center gap-1"><Plus size={15} /> {i18nTOf("rl_add_book", "Add a book")}</button>
          <button onClick={() => setAddingBacklog(true)} className="py-2.5 rounded-2xl bg-amber-100 text-amber-800 font-bold text-sm flex items-center justify-center gap-1 border-2 border-amber-200"><Archive size={15} /> {i18nTOf("rl_add_backlog", "Add backlog")}</button>
        </div>
      )}
      {adding && <AddBookForm onAdd={(b) => { addBook(b); setAdding(false); }} onCancel={() => setAdding(false)} />}
      {addingBacklog && <AddBacklogBookForm onAdd={(b) => { addBook(b); setAddingBacklog(false); }} onCancel={() => setAddingBacklog(false)} />}

      {q && reading.length === 0 && finished.length === 0 && archiveFiltered.length === 0 && <p className="text-sm text-slate-400 px-1">{i18nTOf("rl_no_match", "No books match \"{q}\".").replaceAll("{q}", q)}</p>}

      {viewMode === "shelf" ? (
        // Shelf view — flattens all three sections into one curated
        // shelf so the "hold them in your hands" metaphor works. Tap
        // a cover to open the editor; toggle Rearrange to nudge.
        <>
          <div className="flex items-center gap-2 mb-2">
            <button
              type="button"
              onClick={() => setRearranging((v) => !v)}
              className={`text-[11px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1 ${
                rearranging ? "bg-amber-500 text-white" : "bg-white text-slate-600 border border-slate-200"
              }`}
            >
              {rearranging ? i18nTOf("rl_done_arranging", "Done arranging") : i18nTOf("rl_rearrange", "Rearrange")}
            </button>
            {savedOrder.length > 0 && (
              <button
                type="button"
                onClick={resetShelfOrder}
                className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-white text-slate-500 border border-slate-200"
              >
                {i18nTOf("rl_reset_shelf", "Reset shelf order")}
              </button>
            )}
            <div className="text-[10px] text-slate-400 ml-auto">
              {savedOrder.length > 0 ? i18nTOf("rl_custom_order", "custom order") : i18nTOf("rl_sorted_by", "sorted by {label}").replaceAll("{label}", bookSortLabel(sort))}
            </div>
          </div>
          <div className="-mx-4 overflow-x-auto scrollbar-thin pb-32">
            <div className="flex gap-3 px-4 min-w-min">
              {shelfList.map((b) => (
                <BookShelfTile
                  key={b.id}
                  b={b}
                  onTap={rearranging ? undefined : () => setFocusedBookId(b.id)}
                  selected={focusedBookId === b.id}
                  rearranging={rearranging}
                  onNudgeLeft={() => nudge(b.id, -1)}
                  onNudgeRight={() => nudge(b.id, 1)}
                />
              ))}
            </div>
          </div>
        </>
      ) : (
      <>
      <SectionTitle icon={<BookOpen size={16} className="text-sky-500" />}>{i18nTOf("sec_reading_now", "Reading now")} ({reading.length})</SectionTitle>
      {reading.length === 0 && !q && <p className="text-xs text-slate-400 px-1">{i18nTOf("rl_nothing_in_progress", "Nothing in progress.")}</p>}
      {viewMode === "list"
        ? reading.map((b) => <BookRow key={b.id} b={b} updateBook={updateBook} removeBook={removeBook} familyId={familyId} />)
        : (
          <div className="grid grid-cols-3 gap-2 mb-3">
            {reading.map((b) => (
              <BookGridTile key={b.id} b={b} onTap={() => setFocusedBookId(b.id)} selected={focusedBookId === b.id} />
            ))}
          </div>
        )
      }

      <SectionTitle icon={<Check size={16} className="text-emerald-500" />}>{i18nTOf("sec_finished", "Finished")} ({finished.length})</SectionTitle>
      {viewMode === "list"
        ? finished.map((b) => <BookRow key={b.id} b={b} updateBook={updateBook} removeBook={removeBook} familyId={familyId} />)
        : (
          <div className="grid grid-cols-3 gap-2 mb-3">
            {finished.map((b) => (
              <BookGridTile key={b.id} b={b} onTap={() => setFocusedBookId(b.id)} selected={focusedBookId === b.id} />
            ))}
          </div>
        )
      }

      {archive.length > 0 && (
        <>
          <SectionTitle icon={<Archive size={16} className="text-amber-600" />}>
            {i18nTOf("rl_archive_section", "Archive · pre-tracking ({n})").replaceAll("{n}", archive.length)}
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
          {viewMode === "list"
            ? archiveFiltered.map((b) => <BookRow key={b.id} b={b} updateBook={updateBook} removeBook={removeBook} familyId={familyId} />)
            : (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {archiveFiltered.map((b) => (
                  <BookGridTile key={b.id} b={b} onTap={() => setFocusedBookId(b.id)} selected={focusedBookId === b.id} />
                ))}
              </div>
            )
          }
          <div className="text-[11px] text-slate-400 px-1 mt-1 mb-3">
            {i18nTOf("rl_archive_note", "Backlog books count toward totals + author stats but have no real dates, so they don't appear in date-based views (slideshows, \"this month,\" etc.).")}
          </div>
        </>
      )}

      <div className="text-[11px] text-slate-400 px-1 mt-3">{i18nTOf("rl_search_hint", "Search is fuzzy — typos and partial titles still find the book. Logging start & finish dates shows pace; the level tag shows where they're reading.")}</div>
      </>
      )}

      {/* Tile-tap expand: same focused editor pattern for Grid and Shelf.
          BookRow renders the full edit toolkit; close button dismisses. */}
      {(viewMode === "grid" || viewMode === "shelf") && focusedBook && (
        <div
          className="fixed inset-x-0 z-[60] max-w-md mx-auto bg-white border-t border-slate-200 shadow-2xl rounded-t-2xl p-3 max-h-[70vh] overflow-y-auto"
          style={{ bottom: "calc(72px + env(safe-area-inset-bottom))" }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">{i18nTOf("rl_editing", "Editing")}</div>
            <button onClick={() => setFocusedBookId(null)} className="text-slate-400 p-1" aria-label={i18nTOf("rl_close_aria", "Close")}>
              <X size={16} />
            </button>
          </div>
          <BookRow b={focusedBook} updateBook={updateBook} removeBook={removeBook} familyId={familyId} />
        </div>
      )}
    </>
  );
}

function BookRow({ b, updateBook, removeBook, familyId }) {
  const [edit, setEdit] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [finding, setFinding] = useState(false);
  const fileRef = useRef(null);
  const pace = daysBetween(b.started, b.finished);
  // Custom cover takes precedence over OL. Mirrors EnrichedBookRow's
  // pattern so the same book has a consistent cover everywhere it
  // renders (Reading Library + Insights "Recent (tracked)").
  const customCoverSigned = useSignedUrl(b.customCoverPath || "");
  const displayCover = customCoverSigned || b.coverUrl || "";

  const onUpload = async (e) => {
    const f = e.target.files?.[0];
    if (!f || uploading || !updateBook || !familyId) return;
    setUploading(true);
    try {
      const { path } = await uploadFamilyPhoto({ file: f, familyId, kind: "cover" });
      updateBook(b.id, { customCoverPath: path });
    } catch (err) {
      toast.error(i18nTOf("br_cover_upload_fail", "Cover upload failed: {msg}").replaceAll("{msg}", err.message || err));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // Search the web for a cover for an existing book. Google primary,
  // OL fallback. If neither has one, surfaces an honest "no cover
  // available — upload one with the camera" message; the camera path
  // already exists right next to this button.
  const findCover = async () => {
    if (!updateBook || finding) return;
    setFinding(true);
    const title = b.canonicalTitle || b.title || "";
    const author = b.canonicalAuthor || "";
    try {
      let match = null;
      try {
        const gb = await searchGoogleBooks(title, author, 1);
        match = (gb && gb[0]) || null;
      } catch { /* fall through to OL */ }
      if (!match || !match.coverUrl) {
        try {
          const ol = await searchOpenLibrary(title, author, 1);
          match = (ol && ol[0]) || match || null;
        } catch { /* swallow */ }
      }
      if (!match || !match.coverUrl) {
        toast.error?.(i18nTOf("br_no_cover_found", "No cover found online. Tap the camera to use your own photo."));
        return;
      }
      updateBook(b.id, {
        coverUrl: match.coverUrl,
        canonicalTitle: match.title || b.canonicalTitle || b.title,
        canonicalAuthor: match.author || b.canonicalAuthor || "",
        externalSource: match.externalSource || b.externalSource || "",
        externalId: match.externalId || b.externalId || "",
        enrichedAt: new Date().toISOString(),
        matchStatus: "auto",
      });
      toast.success?.(i18nTOf("br_cover_found", "Cover added!"));
    } catch (err) {
      toast.error?.(i18nTOf("br_cover_search_fail", "Couldn't reach the book service. Try again in a moment."));
    } finally {
      setFinding(false);
    }
  };

  return (
    <Card className="p-3 mb-2">
      <div className="flex items-start gap-2">
        {displayCover ? (
          <img
            src={displayCover}
            alt=""
            draggable={false}
            className="w-10 h-14 object-cover rounded-md border border-slate-200 shrink-0 bg-slate-100"
            loading="lazy"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        ) : (
          <div className="text-xl pt-0.5">{b.lang === "Spanish" ? "🇪🇸" : "📘"}</div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm leading-tight">{b.title}</div>
          <div className="flex items-center gap-1.5 flex-wrap mt-1">
            {b.level && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600">{b.level}</span>}
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">{b.lang}</span>
            {b.status === "finished" && pace && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-600">{i18nTOf("br_read_in_days", "read in {n}d").replaceAll("{n}", pace)}</span>}
            {b.status === "finished" && b.rating > 0 && <span className="text-[10px]">{"⭐".repeat(b.rating)}</span>}
            {/* Honest pre-tracking badge — no date, just the era. */}
            {b.preTracking && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                {i18nTOf("br_pre_tracking", "Pre-tracking")}{b.eraLabel ? ` · ${b.eraLabel}` : ""}
              </span>
            )}
            {/* Re-read counter — only shows when > 1 to avoid clutter. */}
            {(b.readCount || 1) > 1 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                {i18nTOf("br_read_count", "Read {n}×").replaceAll("{n}", b.readCount)}
              </span>
            )}
          </div>
          {b.notes && <div className="text-[11px] text-slate-400 mt-1">{b.notes}</div>}
        </div>
        {updateBook && familyId && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={onUpload}
              className="hidden"
              aria-label={i18nTOf("br_upload_cover_aria", "Upload book cover")}
            />
            {!displayCover && (
              <button
                onClick={findCover}
                disabled={finding}
                className={`p-1 ${finding ? "text-slate-300" : "text-indigo-500 active:scale-90"}`}
                aria-label={i18nTOf("br_find_cover_aria", "Find cover online")}
                title={finding ? i18nTOf("br_finding_cover", "Searching…") : i18nTOf("br_find_cover", "Find cover online")}
              >
                <Search size={15} />
              </button>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className={`p-1 ${uploading ? "text-slate-300" : "text-slate-400 active:scale-90"}`}
              aria-label={b.customCoverPath ? i18nTOf("br_replace_cover", "Replace cover") : i18nTOf("br_use_my_cover", "Use my cover")}
              title={uploading ? i18nTOf("br_uploading", "Uploading…") : b.customCoverPath ? i18nTOf("br_replace_cover", "Replace cover") : i18nTOf("br_use_my_cover", "Use my cover")}
            >
              <Camera size={15} />
            </button>
          </>
        )}
        <button onClick={() => setEdit((v) => !v)} className="p-1 text-slate-400" aria-label={i18nTOf("br_edit_aria", "Edit")}><Pencil size={15} /></button>
      </div>
      {edit && <BookEditPanel b={b} updateBook={updateBook} removeBook={removeBook} onClose={() => setEdit(false)} familyId={familyId} onFindCover={findCover} finding={finding} />}
    </Card>
  );
}

// Full inline editor for a book row. Mirrors the field set of
// AddBookForm + AddBacklogBookForm so a parent can correct ANYTHING
// they typed wrong after saving — title, lang, level, status, dates
// (tracked), era (backlog), rating, notes. Single updateBook patch
// on Save so the persistence is one round-trip.
//
// Per the recon: no tracked ↔ backlog toggle in this panel. If the
// parent realizes a book is in the wrong bucket, they remove and
// re-add via the right button. Keeps the data honest.
function BookEditPanel({ b, updateBook, removeBook, onClose, familyId, onFindCover, finding = false }) {
  const isBacklog = !!b.preTracking;
  const [title, setTitle]   = useState(b.title || "");
  const [lang, setLang]     = useState(b.lang || "English");
  const [level, setLevel]   = useState(b.level || "");
  const [status, setStatus] = useState(b.status || "reading");
  const [started, setStarted]   = useState(b.started || "");
  const [finished, setFinished] = useState(b.finished || "");
  const [rating, setRating] = useState(b.rating || 0);
  const [notes, setNotes]   = useState(b.notes || "");
  // Canonical title/author — the enrichment-layer values. Editable
  // here so a parent can override Open Library's wrong / missing
  // answer without going through the Insights picker. Saving with a
  // non-empty canonical value locks matchStatus to "confirmed".
  const [canonicalTitle, setCanonicalTitle]   = useState(b.canonicalTitle || "");
  const [canonicalAuthor, setCanonicalAuthor] = useState(b.canonicalAuthor || "");
  // Cover management — uses the same custom_cover_path column the
  // Insights row writes. Upload + revert apply IMMEDIATELY (don't wait
  // for the main Save button) so a parent can preview the new cover
  // before saving the rest. Mirrors the BookRow / EnrichedBookRow pattern.
  const [uploading, setUploading] = useState(false);
  const coverFileRef = useRef(null);
  const customCoverSigned = useSignedUrl(b.customCoverPath || "");
  const displayCover = customCoverSigned || b.coverUrl || "";
  const onCoverUpload = async (e) => {
    const f = e.target.files?.[0];
    if (!f || uploading || !updateBook || !familyId) return;
    setUploading(true);
    try {
      const { path } = await uploadFamilyPhoto({ file: f, familyId, kind: "cover" });
      updateBook(b.id, { customCoverPath: path });
    } catch (err) {
      toast.error(i18nTOf("br_cover_upload_fail", "Cover upload failed: {msg}").replaceAll("{msg}", err.message || err));
    } finally {
      setUploading(false);
      if (coverFileRef.current) coverFileRef.current.value = "";
    }
  };
  const onClearCustomCover = () => updateBook?.(b.id, { customCoverPath: "" });

  // Cover chooser — Mike's "Try another cover" path. When Google's
  // first hit looks bad (e.g. an interior photo, foreign edition,
  // wrong book entirely), tap "Try other covers" to fan out to all
  // three sources in parallel and pick the right one by sight.
  // Sources with zero results are silently hidden, so a low-coverage
  // source like iTunes Books on a picture book doesn't show as an
  // empty section.
  const [chooserOpen, setChooserOpen] = useState(false);
  const [chooserLoading, setChooserLoading] = useState(false);
  const [chooserResults, setChooserResults] = useState({ google: [], itunes: [], openLibrary: [] });
  const [chooserError, setChooserError] = useState("");
  const openCoverChooser = async () => {
    setChooserOpen(true);
    setChooserError("");
    setChooserLoading(true);
    const q = b.canonicalTitle || b.title || "";
    const a = b.canonicalAuthor || "";
    try {
      const [gb, it, ol] = await Promise.allSettled([
        searchGoogleBooks(q, a, 6),
        searchITunesBooks(q, a, 6),
        searchOpenLibrary(q, a, 6),
      ]);
      const pick = (settled) => settled.status === "fulfilled" && Array.isArray(settled.value) ? settled.value : [];
      const results = {
        google: pick(gb).filter((r) => r.coverThumbUrl || r.coverUrl),
        itunes: pick(it).filter((r) => r.coverThumbUrl || r.coverUrl),
        openLibrary: pick(ol).filter((r) => r.coverThumbUrl || r.coverUrl),
      };
      setChooserResults(results);
      const total = results.google.length + results.itunes.length + results.openLibrary.length;
      if (total === 0) setChooserError(i18nTOf("br_chooser_no_results", "No alternative covers found. Tap the camera to use your own photo."));
    } catch (e) {
      setChooserError(i18nTOf("br_chooser_fail", "Couldn't reach the book services. Try again in a moment."));
    } finally {
      setChooserLoading(false);
    }
  };
  const applyChosenCover = (r) => {
    if (!r || !r.coverUrl) return;
    updateBook?.(b.id, {
      coverUrl: r.coverUrl,
      canonicalTitle: r.title || b.canonicalTitle || b.title,
      canonicalAuthor: r.author || b.canonicalAuthor || "",
      externalSource: r.externalSource || b.externalSource || "",
      externalId: r.externalId || b.externalId || "",
      enrichedAt: new Date().toISOString(),
      matchStatus: "confirmed",
    });
    toast.success?.(i18nTOf("br_cover_applied", "Cover updated!"));
    setChooserOpen(false);
  };
  // Backlog-only: era_label with preset pills + custom freeform.
  const presetMatch = isBacklog && (ERA_PRESETS.includes(b.eraLabel) ? b.eraLabel : (b.eraLabel ? "Custom" : ERA_PRESETS[0]));
  const [eraChoice, setEraChoice] = useState(presetMatch || ERA_PRESETS[0]);
  const [eraCustom, setEraCustom] = useState(isBacklog && !ERA_PRESETS.includes(b.eraLabel) ? (b.eraLabel || "") : "");
  const eraLabel = eraChoice === "Custom" ? eraCustom.trim() : eraChoice;

  const canSave = !!title.trim() && (!isBacklog || !!eraLabel);

  const onSave = () => {
    const patch = {
      title: title.trim(),
      lang,
      level: level.trim(),
      status,
      rating,
      notes: notes.trim(),
    };
    // Canonical fields: only patch if the user actually typed something
    // or changed an existing value. Setting either locks matchStatus to
    // "confirmed" so the auto-enrich effect leaves the row alone.
    const newCanonicalTitle = canonicalTitle.trim();
    const newCanonicalAuthor = canonicalAuthor.trim();
    const canonicalChanged =
      newCanonicalTitle !== (b.canonicalTitle || "") ||
      newCanonicalAuthor !== (b.canonicalAuthor || "");
    if (canonicalChanged) {
      patch.canonicalTitle = newCanonicalTitle;
      patch.canonicalAuthor = newCanonicalAuthor;
      if (newCanonicalTitle || newCanonicalAuthor) {
        patch.matchStatus = "confirmed";
        patch.enrichedAt = new Date().toISOString();
      }
    }
    if (isBacklog) {
      // Backlog rows: era_label drives the "when," dates stay null.
      patch.eraLabel = eraLabel;
      patch.started = "";
      patch.finished = "";
    } else {
      // Tracked rows: keep date semantics. Finished is only meaningful
      // when status === finished; clear it otherwise so the row stays
      // honest if a parent moves a finished book back to reading.
      patch.started = started || "";
      patch.finished = status === "finished" ? (finished || TODAY_ISO) : "";
    }
    updateBook(b.id, patch);
    onClose();
  };

  return (
    <div className={`mt-2 pt-2 border-t ${isBacklog ? "border-amber-200" : "border-slate-100"}`}>
      <div className={`flex items-center justify-between mb-2 ${isBacklog ? "text-amber-700" : "text-slate-500"}`}>
        <div className="text-[10px] uppercase tracking-wider font-bold">
          {isBacklog ? i18nTOf("br_editing_backlog", "Editing backlog entry") : i18nTOf("br_editing_book", "Editing book")}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="-mr-1 -mt-1 p-1.5 rounded-full hover:bg-slate-100 active:scale-90"
          aria-label={i18nTOf("br_cancel", "Cancel")}
        >
          <X size={16} />
        </button>
      </div>

      {/* Cover management — upload + revert apply IMMEDIATELY (writes to
          customCoverPath on tap). Survives panel cancel; lives independent
          of the main Save button. Library OR camera (no capture attr) —
          covers are always after-the-fact. */}
      {updateBook && familyId && (
        <div className="flex items-start gap-2 mb-3 p-2 rounded-xl bg-slate-50 border border-slate-200">
          {displayCover ? (
            <img
              src={displayCover}
              alt=""
              draggable={false}
              className="w-12 h-16 object-cover rounded-md border border-slate-200 shrink-0 bg-slate-100"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
          ) : (
            <div className="w-12 h-16 rounded-md bg-slate-100 border border-slate-200 grid place-items-center shrink-0 text-slate-300">
              <BookOpen size={18} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">
              {i18nTOf("br_cover_label", "Cover")} {b.customCoverPath ? i18nTOf("br_cover_custom", "· custom") : (b.coverUrl ? i18nTOf("br_cover_ol", "· Open Library") : i18nTOf("br_cover_none", "· none"))}
            </div>
            <input
              ref={coverFileRef}
              type="file"
              accept="image/*"
              onChange={onCoverUpload}
              className="hidden"
              aria-label={i18nTOf("br_upload_cover_aria", "Upload book cover")}
            />
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => coverFileRef.current?.click()}
                disabled={uploading}
                className={`flex-1 min-w-[120px] text-[11px] font-bold px-2 py-1.5 rounded-lg flex items-center justify-center gap-1 ${
                  uploading ? "bg-slate-200 text-slate-400" : "bg-white border border-slate-200 text-slate-600 active:scale-95"
                }`}
              >
                <Camera size={12} /> {uploading ? i18nTOf("br_uploading", "Uploading…") : b.customCoverPath ? i18nTOf("br_replace_cover", "Replace cover") : i18nTOf("br_use_my_cover", "Use my cover")}
              </button>
              {onFindCover && !b.customCoverPath && (
                <button
                  type="button"
                  onClick={onFindCover}
                  disabled={finding}
                  className={`text-[11px] font-bold px-2 py-1.5 rounded-lg flex items-center gap-1 ${finding ? "bg-slate-100 text-slate-400" : "bg-indigo-50 border border-indigo-200 text-indigo-700 active:scale-95"}`}
                  aria-label={i18nTOf("br_find_cover_aria", "Find cover online")}
                >
                  <Search size={12} /> {finding ? i18nTOf("br_finding_cover", "Searching…") : (b.coverUrl ? i18nTOf("br_recheck_cover", "Re-check cover") : i18nTOf("br_find_cover", "Find cover online"))}
                </button>
              )}
              {!b.customCoverPath && (
                <button
                  type="button"
                  onClick={openCoverChooser}
                  disabled={chooserLoading}
                  className={`text-[11px] font-bold px-2 py-1.5 rounded-lg flex items-center gap-1 ${chooserLoading ? "bg-slate-100 text-slate-400" : "bg-violet-50 border border-violet-200 text-violet-700 active:scale-95"}`}
                >
                  {chooserLoading ? i18nTOf("br_finding_cover", "Searching…") : i18nTOf("br_try_other_covers", "Try other covers")}
                </button>
              )}
              {b.customCoverPath && (
                <button
                  type="button"
                  onClick={onClearCustomCover}
                  className="text-[11px] font-bold px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 active:scale-95"
                  aria-label={i18nTOf("br_use_ol_aria", "Use the Open Library cover instead")}
                >
                  {i18nTOf("br_use_ol_cover", "Use OL cover")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {chooserOpen && (
        <div className="mb-3 rounded-2xl border border-violet-200 bg-violet-50/60 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] uppercase tracking-wider font-bold text-violet-700">
              {i18nTOf("br_chooser_title", "Other covers from the web")}
            </div>
            <button
              type="button"
              onClick={() => setChooserOpen(false)}
              className="text-[10px] font-bold text-slate-400 active:scale-95"
              aria-label={i18nTOf("br_chooser_close", "Close cover chooser")}
            >
              {i18nTOf("br_chooser_close_label", "Close")}
            </button>
          </div>
          {chooserLoading && (
            <div className="text-[11px] text-slate-500 px-1 py-2">
              {i18nTOf("br_chooser_loading", "Checking Google · iTunes Books · Open Library…")}
            </div>
          )}
          {!chooserLoading && chooserError && (
            <div className="text-[11px] text-slate-600 px-1 py-2 leading-snug">
              {chooserError}
            </div>
          )}
          {!chooserLoading && !chooserError && (
            <>
              {[
                { key: "google", label: i18nTOf("br_chooser_src_google", "Google Books"), color: "bg-emerald-100 text-emerald-700" },
                { key: "itunes", label: i18nTOf("br_chooser_src_itunes", "iTunes Books"), color: "bg-sky-100 text-sky-700" },
                { key: "openLibrary", label: i18nTOf("br_chooser_src_ol", "Open Library"), color: "bg-amber-100 text-amber-700" },
              ].map((src) => {
                const list = chooserResults[src.key];
                if (!Array.isArray(list) || list.length === 0) return null;
                return (
                  <div key={src.key} className="mb-3 last:mb-0">
                    <div className="flex items-center gap-1.5 mb-1.5 px-0.5">
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${src.color}`}>{src.label}</span>
                      <span className="text-[10px] text-slate-400">{list.length} {list.length === 1 ? "option" : "options"}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {list.map((r, i) => (
                        <button
                          key={`${src.key}-${i}`}
                          type="button"
                          onClick={() => applyChosenCover(r)}
                          className="flex flex-col items-stretch text-left active:scale-[0.97] transition"
                          title={r.title}
                        >
                          <div className="aspect-[3/4] rounded-lg overflow-hidden border border-slate-200 bg-slate-100 mb-1 relative">
                            <div className="absolute inset-0 grid place-items-center text-slate-300"><BookOpen size={20} /></div>
                            {r.coverThumbUrl && (
                              <img
                                src={r.coverThumbUrl}
                                alt=""
                                className="absolute inset-0 w-full h-full object-cover"
                                loading="lazy"
                                referrerPolicy="no-referrer"
                                onError={(e) => { e.currentTarget.style.display = "none"; }}
                              />
                            )}
                          </div>
                          <div className="text-[10px] font-bold text-slate-700 line-clamp-2 leading-tight">{r.title}</div>
                          {r.author && <div className="text-[9px] text-slate-400 truncate">{r.author}{r.year ? ` · ${r.year}` : ""}</div>}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={i18nTOf("br_book_title_ph", "Book title")}
        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm mb-2 bg-white"
      />

      <div className="flex gap-1.5 mb-2">
        {[["English", i18nTOf("br_lang_english", "English")], ["Spanish", i18nTOf("br_lang_spanish", "Spanish")]].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setLang(key)}
            className={`text-[11px] font-semibold px-3 py-1 rounded-full ${lang === key ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <input
        value={level}
        onChange={(e) => setLevel(e.target.value)}
        placeholder={i18nTOf("br_reading_level_ph", "Reading level (e.g. ~2nd grade)")}
        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm mb-2 bg-white"
      />

      {/* Canonical title + author — overrides Open Library's match.
          For books OL doesn't have (Spanish kids' books, niche titles),
          or when the parent already knows the right values. Saving with
          either field non-empty locks matchStatus to "confirmed" so
          auto-enrich won't overwrite. */}
      <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">
        {i18nTOf("br_canonical_label", "Canonical title & author")} <span className="text-slate-400 normal-case font-normal">{i18nTOf("br_canonical_aside", "(overrides Open Library)")}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <input
          value={canonicalTitle}
          onChange={(e) => setCanonicalTitle(e.target.value)}
          placeholder={i18nTOf("br_canonical_title_ph", "Canonical title")}
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
          aria-label={i18nTOf("br_canonical_title_aria", "Canonical title")}
        />
        <input
          value={canonicalAuthor}
          onChange={(e) => setCanonicalAuthor(e.target.value)}
          placeholder={i18nTOf("br_canonical_author_ph", "Author")}
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
          aria-label={i18nTOf("br_canonical_author_aria", "Canonical author")}
        />
      </div>

      {/* Status pill row */}
      <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">{i18nTOf("br_status_label", "Status")}</label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {[
          ["reading",  i18nTOf("br_status_reading", "reading")],
          ["finished", i18nTOf("br_status_finished", "finished")],
          ["wishlist", i18nTOf("br_status_wishlist", "wishlist")],
          ["dropped",  i18nTOf("br_status_dropped", "dropped")],
        ].map(([s, label]) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
              status === s
                ? (s === "finished" ? "bg-emerald-500 text-white"
                  : s === "wishlist" ? "bg-violet-500 text-white"
                  : s === "dropped" ? "bg-slate-400 text-white"
                  : "bg-amber-500 text-white")
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tracked rows: date inputs */}
      {!isBacklog && (
        <div className="grid grid-cols-2 gap-2 mb-2">
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 block mb-1">{i18nTOf("br_started_label", "Started")}</span>
            <input
              type="date"
              value={started}
              onChange={(e) => setStarted(e.target.value)}
              max={finished || undefined}
              className="w-full border border-slate-200 rounded-xl px-2 py-2 text-sm bg-white"
            />
          </label>
          <label className={`block ${status === "finished" ? "" : "opacity-50"}`}>
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 block mb-1">{i18nTOf("br_finished_label", "Finished")}</span>
            <input
              type="date"
              value={finished}
              onChange={(e) => setFinished(e.target.value)}
              min={started || undefined}
              disabled={status !== "finished"}
              className="w-full border border-slate-200 rounded-xl px-2 py-2 text-sm bg-white disabled:bg-slate-50"
            />
          </label>
        </div>
      )}

      {/* Backlog rows: era pill picker + custom */}
      {isBacklog && (
        <>
          <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">{i18nTOf("br_era_label", "Era")}</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {[...ERA_PRESETS, "Custom"].map((p) => {
              const label =
                p === "Kindergarten 2026" ? i18nTOf("br_era_kinder", "Kindergarten 2026")
                : p === "Before May 2026" ? i18nTOf("br_era_before_may", "Before May 2026")
                : p === "Custom" ? i18nTOf("br_era_custom", "Custom")
                : p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setEraChoice(p)}
                  className={`text-[11px] font-semibold px-3 py-1 rounded-full ${eraChoice === p ? "bg-amber-600 text-white" : "bg-white text-slate-600 border border-slate-200"}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {eraChoice === "Custom" && (
            <input
              value={eraCustom}
              onChange={(e) => setEraCustom(e.target.value)}
              placeholder={i18nTOf("br_era_custom_ph", "Custom era (e.g. \"Summer 2025\")")}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm mb-2 bg-white"
            />
          )}
        </>
      )}

      {/* Rating only meaningful when finished, but editable anytime */}
      <div className="flex items-center gap-1 mb-2">
        <span className="text-[11px] text-slate-500 mr-1">{i18nTOf("br_rating_label", "Rating")}</span>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(rating === n ? 0 : n)}
            className="text-sm"
            aria-label={i18nTOf("br_rate_n_stars", "Rate {n} stars").replaceAll("{n}", n)}
          >
            {n <= rating ? "⭐" : "☆"}
          </button>
        ))}
      </div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder={i18nTOf("br_notes_optional_ph", "Notes (optional)")}
        rows={2}
        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm mb-3 bg-white resize-y"
      />

      <div className="flex gap-2 mb-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 font-bold text-sm"
        >
          {i18nTOf("br_cancel", "Cancel")}
        </button>
        <button
          type="button"
          disabled={!canSave}
          onClick={onSave}
          className={`flex-1 py-2.5 rounded-xl font-bold text-sm text-white ${canSave ? (isBacklog ? "bg-amber-600" : "bg-indigo-600") : "bg-slate-200 text-slate-400"}`}
        >
          {i18nTOf("br_save_changes", "Save changes")}
        </button>
      </div>

      <button
        type="button"
        onClick={() => removeBook(b.id)}
        className="w-full py-2 rounded-xl bg-rose-100 text-rose-600 text-xs font-bold flex items-center justify-center gap-1"
      >
        <X size={13} /> {i18nTOf("br_remove_book", "Remove this book")}
      </button>

      {/* Honest note about re-classifying */}
      <div className="text-[10px] text-slate-400 mt-2 leading-snug">
        {i18nTOf("br_reclassify_hint", "To convert this book between tracked ↔ backlog, remove and re-add via the matching button on the Reading Library header.")}
      </div>
    </div>
  );
}

function AddBookForm({ onAdd, onCancel }) {
  const [title, setTitle] = useState("");
  const [lang, setLang] = useState("English");
  const [level, setLevel] = useState("");
  const [started, setStarted] = useState(TODAY_ISO);
  const { results: webResults, searching: webSearching, error: webError, retry: retryWebSearch } = useBookWebSearch(title);

  // Tap a web result → emit a complete book object with canonical
  // title, author, and a real cover URL. Mike's "fuzzy search to work
  // when I add a book" — one tap, the book lands in the library with
  // a proper cover instead of needing manual title-only typing.
  const addFromWeb = (r) => {
    if (!r || !r.title) return;
    onAdd({
      id: "b_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
      title: r.title,
      lang,
      status: "reading",
      started,
      finished: "",
      level: level.trim(),
      rating: 0,
      notes: "",
      preTracking: false,
      eraLabel: "",
      readCount: 1,
      coverUrl: r.coverUrl || "",
      canonicalTitle: r.title || "",
      canonicalAuthor: r.author || "",
      customCoverPath: "",
      externalSource: r.externalSource || "",
      externalId: r.externalId || "",
      enrichedAt: new Date().toISOString(),
      matchStatus: "auto",
    });
  };

  return (
    <Card className="p-4 mb-3">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={i18nTOf("br_book_title_ph", "Book title — start typing to search the web")}
        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm mb-2"
      />
      {/* Web results — same shape as the completion picker. */}
      {title.trim().length >= 3 && (webSearching || webResults.length > 0 || webError) && (
        <div className="mb-2 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-2">
          <div className="text-[10px] uppercase tracking-wider font-bold text-indigo-700 mb-1 px-1">
            {webSearching ? i18nTOf("ts_web_searching", "Searching the web…") : i18nTOf("ts_web_results", "From the web (tap to add)")}
          </div>
          {webError && !webSearching && (
            <div className="bg-white rounded-xl p-2 flex items-center gap-2">
              <div className="flex-1 text-[11px] text-slate-600 leading-snug">
                {i18nTOf("ts_web_error_msg", "Couldn't reach the book service. Could be a hiccup.")}
              </div>
              <button
                type="button"
                onClick={() => retryWebSearch()}
                className="text-[11px] font-bold text-white bg-indigo-600 rounded-lg px-3 py-1.5 active:scale-95 shrink-0"
              >
                {i18nTOf("ts_web_retry", "Try again")}
              </button>
            </div>
          )}
          {webResults.length > 0 && (
            <div className="bg-white rounded-xl divide-y divide-slate-100 overflow-hidden">
              {webResults.map((r, i) => (
                <button
                  key={`web-${i}`}
                  type="button"
                  onClick={() => addFromWeb(r)}
                  className="w-full flex items-center gap-2 p-2 text-left active:scale-[0.99]"
                >
                  <div className="w-10 h-14 rounded bg-slate-100 grid place-items-center shrink-0 relative overflow-hidden">
                    <BookOpen size={14} className="text-slate-300" />
                    {r.coverThumbUrl && (
                      <img
                        src={r.coverThumbUrl}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-slate-800 truncate">{r.title || i18nTOf("ts_book_untitled", "(untitled)")}</div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {r.author || i18nTOf("ts_web_author_unknown", "Author unknown")}{r.year ? ` · ${r.year}` : ""}
                    </div>
                  </div>
                  <Plus size={16} className="text-indigo-500 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="flex gap-1.5 mb-2">{[["English", i18nTOf("br_lang_english", "English")], ["Spanish", i18nTOf("br_lang_spanish", "Spanish")]].map(([key, label]) => <button key={key} onClick={() => setLang(key)} className={`text-[11px] font-semibold px-3 py-1 rounded-full ${lang === key ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>{label}</button>)}</div>
      <input value={level} onChange={(e) => setLevel(e.target.value)} placeholder={i18nTOf("br_reading_level_ph", "Reading level (e.g. ~2nd grade)")} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm mb-2" />
      <label className="text-[11px] font-semibold text-slate-500 block mb-2">{i18nTOf("br_started_label", "Started")}<input type="date" value={started} onChange={(e) => setStarted(e.target.value)} className="w-full mt-0.5 border border-slate-200 rounded-xl px-3 py-2 text-sm" /></label>
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-500 font-bold text-sm">{i18nTOf("br_cancel", "Cancel")}</button>
        <button disabled={!title.trim()} onClick={() => onAdd({ id: "b_" + Date.now(), title: title.trim(), lang, status: "reading", started, finished: "", level: level.trim(), rating: 0, notes: "" })} className={`flex-1 py-2.5 rounded-xl font-bold text-sm text-white ${title.trim() ? "bg-indigo-600" : "bg-slate-200 text-slate-400"}`}>{i18nTOf("br_add_book", "Add book")}</button>
      </div>
      <div className="text-[10px] text-slate-400 text-center mt-2 leading-snug">
        {i18nTOf("br_add_book_hint", "Pick from the web above for a real cover, or hit Add book to save the title only.")}
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
        <Archive size={13} /> {i18nTOf("br_backlog_kicker", "Backlog entry · no real date needed")}
      </div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={i18nTOf("br_book_title_ph", "Book title")} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm mb-2 bg-white" />
      <div className="flex gap-1.5 mb-2">{[["English", i18nTOf("br_lang_english", "English")], ["Spanish", i18nTOf("br_lang_spanish", "Spanish")]].map(([key, label]) => <button key={key} onClick={() => setLang(key)} className={`text-[11px] font-semibold px-3 py-1 rounded-full ${lang === key ? "bg-amber-600 text-white" : "bg-white text-slate-500 border border-slate-200"}`}>{label}</button>)}</div>
      <input value={level} onChange={(e) => setLevel(e.target.value)} placeholder={i18nTOf("br_reading_level_opt_ph", "Reading level (optional)")} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm mb-2 bg-white" />
      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">{i18nTOf("br_era_label", "Era")}</label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {[...ERA_PRESETS, "Custom"].map((p) => {
          const label =
            p === "Kindergarten 2026" ? i18nTOf("br_era_kinder", "Kindergarten 2026")
            : p === "Before May 2026" ? i18nTOf("br_era_before_may", "Before May 2026")
            : p === "Custom" ? i18nTOf("br_era_custom", "Custom")
            : p;
          return (
            <button
              key={p}
              type="button"
              onClick={() => setEraChoice(p)}
              className={`text-[11px] font-semibold px-3 py-1 rounded-full ${eraChoice === p ? "bg-amber-600 text-white" : "bg-white text-slate-600 border border-slate-200"}`}
            >
              {label}
            </button>
          );
        })}
      </div>
      {eraChoice === "Custom" && (
        <input
          value={eraCustom}
          onChange={(e) => setEraCustom(e.target.value)}
          placeholder={i18nTOf("br_era_custom_ph", "Custom era (e.g. \"Summer 2025\")")}
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm mb-2 bg-white"
        />
      )}
      <input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder={i18nTOf("br_notes_optional_ph", "Notes (optional)")}
        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm mb-3 bg-white"
      />
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 font-bold text-sm">{i18nTOf("br_cancel", "Cancel")}</button>
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
          {i18nTOf("br_add_to_backlog", "Add to backlog")}
        </button>
      </div>
    </Card>
  );
}

// ===================== PARENT: GRADE GOALS =====================
// Maps a kid's grade string (from OnboardingWizard) into the numeric
// grade key STANDARDS is keyed by. "Pre-K"/"K" → 1 (we don't have
// pre-1st standards yet, so first grade is the closest baseline).
const GRADE_STRING_TO_NUM = {
  "Pre-K": 1, "K": 1, "1st": 1, "2nd": 2, "3rd": 3, "4th": 4, "5th": 5,
  "6th": 6, "7th": 7, "8th": 8, "9th": 8, "10th": 8, "11th": 8, "12th": 8,
};
function GradeGoals({ users = [] }) {
  const kid = users.find((u) => u.role === "kid");
  const kidGradeNum = kid?.grade ? GRADE_STRING_TO_NUM[kid.grade] : null;
  const [g, setG] = useState(kidGradeNum || 2);
  const subjects = STANDARDS[g] || {};
  const SUBJ_COLOR = { Reading: "#2563eb", Writing: "#ea580c", Math: "#d97706", Language: "#e11d48", Science: "#059669" };
  return (
    <>
      <Card className="p-3 mb-3 bg-indigo-50 border-indigo-100">
        <div className="text-sm font-bold text-indigo-900">
          {kid?.grade
            ? `${kid.name}'s grade-level goals — currently ${kid.grade}.`
            : "Grade-level learning goals. Set your kid's grade in their profile to tailor this view."}
        </div>
        <div className="text-[12px] text-indigo-700 mt-1">Tap a grade below to see typical milestones. These are high-level summaries — verify against official CA / Common Core docs.</div>
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
      <div className="text-[11px] text-slate-400 px-1 mt-1">A curated starting framework to aim high — always cross-check specifics against your local standards.</div>
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

      {awards.length === 0 && <p className="text-xs text-slate-400 px-1">{i18nTOf("empty_awards", "Nothing yet — upload his first certificate or recital sheet.")}</p>}
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
      <div className="text-[11px] text-slate-400 px-1 mt-3">Tie each to an activity to build his profile.</div>
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
      toast.error("Upload failed: " + (err.message || err));
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
  const { completions, activities, streaks, books, gifted, albumPhotos = [], users = [] } = props;
  const recapKid = users.find((u) => u.role === "kid");
  const recapKidName = recapKid?.name || "Recap";
  const [period, setPeriod] = useState("week");
  // Year picker — defaults to current year, but the parent can flip
  // back to prior years once data accumulates. Mike: "I plan to keep
  // using this system until he is in 6th grade at least" — so we have
  // to be honest about multi-year history.
  const [yearPick, setYearPick] = useState(String(today.getFullYear()));
  const [copied, setCopied] = useState(false);
  // Compute the date window for the current period. Inclusive ISO
  // YYYY-MM-DD on both ends.
  const window = (() => {
    const todayIso = TODAY_ISO;
    if (period === "week") {
      const start = new Date(today); start.setDate(today.getDate() - 6);
      return { start: isoLocal(start), end: todayIso, label: "this week" };
    }
    if (period === "month") {
      const start = new Date(today); start.setDate(today.getDate() - 29);
      return { start: isoLocal(start), end: todayIso, label: "this month" };
    }
    if (period === "year") {
      return { start: `${yearPick}-01-01`, end: `${yearPick}-12-31`, label: `in ${yearPick}` };
    }
    return { start: "0000-01-01", end: "9999-12-31", label: "all-time" };
  })();
  const inWindow = (iso) => iso && iso >= window.start && iso <= window.end;
  // Collect every year we have data in so the year picker only offers
  // real options (not a hard-coded range).
  const knownYears = (() => {
    const set = new Set();
    for (const c of (completions || [])) {
      if (c.status === "approved" && c.completionDate) set.add(c.completionDate.slice(0, 4));
    }
    for (const g of (gifted || [])) if (g.date) set.add(g.date.slice(0, 4));
    for (const p of (albumPhotos || [])) {
      const d = p.takenAt || (p.createdAt || "").slice(0, 10);
      if (d) set.add(d.slice(0, 4));
    }
    set.add(String(today.getFullYear())); // always include current year
    return [...set].sort((a, b) => b.localeCompare(a)); // newest first
  })();
  const approved = (completions || []).filter((c) => c.status === "approved" && inWindow(c.completionDate));
  const giftedInWindow = (gifted || []).filter((g) => inWindow(g.date));
  const starsEarned = approved.reduce((s, c) => s + (c.awardedStars || 0), 0) + giftedInWindow.reduce((s, g) => s + (g.stars || 0), 0);
  // Recap photos = both proof photos attached to completions AND memory
  // photos parents uploaded via "Add a memory" in the gallery. The memory
  // ones live in album_photos with a path + takenAt; same StoredPhoto
  // renderer works for both. Sorted newest-first + filtered to the
  // selected window so a year recap doesn't drown the current week.
  const proofPhotos = (completions || []).flatMap((c) =>
    (c.proof || [])
      .filter((p) => p.type === "photo" && (p.path || p.url))
      .map((p) => ({ ...p, taskId: c.taskId, _sortKey: c.completionDate || "" }))
  ).filter((p) => inWindow(p._sortKey));
  const memoryPhotos = (albumPhotos || [])
    .filter((p) => p.path)
    .map((p) => ({ path: p.path, caption: p.caption, taskId: null, _sortKey: p.takenAt || (p.createdAt || "").slice(0, 10) }))
    .filter((p) => inWindow(p._sortKey));
  const photos = [...proofPhotos, ...memoryPhotos].sort(
    (a, b) => (b._sortKey || "").localeCompare(a._sortKey || "")
  );
  // Books finished in this window. preTracking archive books only count
  // for all-time (they have no real dates).
  const booksDone = period === "all"
    ? (books || []).filter(isBookFinished)
    : (books || []).filter((b) => b.status === "finished" && inWindow(b.finished));
  const topStreaks = Object.entries(streaks || {}).map(([id, s]) => ({ a: activities.find((x) => x.id === id), s })).filter((x) => x.a).sort((a, b) => b.s.current - a.s.current);

  const ds = streaks?.a_drums;
  let mem = null;
  if (ds?.since) {
    const start = new Date(ds.since + "T12:00");
    // Days-since reads from the canonical streak count, not a
    // Math.round of (today - since). The Math.round version was a
    // day behind every other surface (Today / Insights / Stars all
    // read streaks.current = 317; Recap was computing 316 because
    // Math.round on the exact-noon delta lost a day to floating-
    // point rounding). The canonical streak is the source of truth.
    const daysSince = ds.current ?? Math.round((today - start) / 86400000);
    const anniv = new Date(start); anniv.setFullYear(start.getFullYear() + 1);
    const toAnniv = Math.ceil((anniv - today) / 86400000);
    mem = { daysSince, anniv, toAnniv, start };
  }

  const periodLabel = period === "week" ? "This Week"
    : period === "month" ? "This Month"
    : period === "year" ? yearPick
    : "All-time";
  const buildText = () => [
    `${recapKidName} — ${periodLabel} Recap`, ``,
    `⭐ Stars earned: ${starsEarned}`,
    `✅ Activities completed: ${approved.length}`,
    `📚 Books finished: ${booksDone.length}`,
    `📸 Photos captured: ${photos.length}`, ``, `Streaks:`,
    ...topStreaks.slice(0, 6).map((x) => `• ${x.a.name}: ${x.s.current} days (best ${x.s.longest})`),
  ].join("\n");
  const share = async () => { try { await navigator.clipboard.writeText(buildText()); } catch (e) { /* clipboard blocked in sandbox */ } setCopied(true); setTimeout(() => setCopied(false), 2200); };

  return (
    <>
      <div className="flex gap-1.5 mb-2">
        {[["week", "Week"], ["month", "Month"], ["year", "Year"], ["all", "All-time"]].map(([k, l]) => (
          <button key={k} onClick={() => setPeriod(k)} className={`flex-1 py-2 rounded-xl text-sm font-bold ${period === k ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>{l}</button>
        ))}
      </div>
      {period === "year" && (
        <div className="flex items-center gap-2 mb-3 px-1">
          <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500">Year:</span>
          <div className="flex gap-1 flex-wrap">
            {knownYears.map((y) => (
              <button
                key={y}
                onClick={() => setYearPick(y)}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${yearPick === y ? "bg-violet-600 text-white" : "bg-white text-slate-500 border border-slate-200"}`}
              >
                {y}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Card className="p-3 text-center"><div className="text-2xl font-extrabold text-amber-500">{starsEarned}</div><div className="text-[11px] text-slate-400">stars earned</div></Card>
        <Card className="p-3 text-center"><div className="text-2xl font-extrabold text-emerald-500">{approved.length}</div><div className="text-[11px] text-slate-400">completed</div></Card>
        <Card className="p-3 text-center"><div className="text-2xl font-extrabold text-sky-500">{booksDone.length}</div><div className="text-[11px] text-slate-400">{i18nTOf("ril_books_finished_lower", "books finished")}</div></Card>
        <Card className="p-3 text-center"><div className="text-2xl font-extrabold text-violet-500">{photos.length}</div><div className="text-[11px] text-slate-400">photos</div></Card>
      </div>

      {mem && (
        // Use a plain styled div instead of Card — the Card component
        // doesn't forward an inline `style` prop, so the gradient was
        // silently dropped and the white text rendered against a
        // white background. Mike screenshotted a "broken" card showing
        // only floating emojis. This is the fix.
        <div
          className="rounded-3xl border border-violet-200 shadow-sm p-4 mt-3 text-white"
          style={{ background: "linear-gradient(135deg,#7c3aed,#db2777)" }}
        >
          <div className="flex items-center gap-2 font-extrabold"><span className="text-xl">🎂</span> On this journey</div>
          <div className="text-sm opacity-95 mt-1">🥁 {mem.daysSince} days of drums since {fmtDateObj(mem.start)}.</div>
          <div className="text-sm opacity-95">{mem.toAnniv > 0 ? `1-year drum-iversary in ${mem.toAnniv} days (${fmtDateObj(mem.anniv)}) 🎉` : `Passed his 1-year drum-iversary! 🐐`}</div>
        </div>
      )}

      <SectionTitle icon={<ImageIcon size={16} className="text-violet-500" />}>{i18nTOf("sec_photos", "Photos")} {window.label}</SectionTitle>
      {photos.length === 0 && <p className="text-xs text-slate-400 px-1">{i18nTOf("empty_photos", "No photos captured yet — helpers can snap them from the checklist.")}</p>}
      <div className="grid grid-cols-3 gap-1.5">
        {photos.map((p, i) => <StoredPhoto key={i} path={p.path} url={p.url} alt="" className="w-full h-24 object-cover rounded-xl" fallback={<div className="w-full h-24 bg-slate-100 animate-pulse rounded-xl" />} />)}
      </div>

      <SectionTitle icon={<Flame size={16} className="text-orange-500" />}>{i18nTOf("sec_streak_highlights", "Streak highlights")}</SectionTitle>
      {topStreaks.slice(0, 5).map((x) => (
        <Card key={x.a.id} className="p-3 mb-2 flex items-center gap-3">
          <div className="w-2 h-8 rounded-full" style={{ background: x.a.color }} />
          <div className="flex-1 text-sm font-semibold">{i18nNameOf(x.a)}</div>
          <span className="text-sm font-extrabold text-orange-500">🔥 {x.s.current}</span>
        </Card>
      ))}

      <button onClick={share} className="w-full mt-3 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm flex items-center justify-center gap-2"><Share2 size={16} /> {copied ? "Recap copied! ✓" : "Copy / share recap"}</button>
      <div className="text-[11px] text-slate-400 px-1 mt-2">Copies a clean text summary to share with family. Stats above are scoped to the selected window — week, month, year, or all-time.</div>
    </>
  );
}

// ===================== DAILY ADVENTURE BOARD · PLAN =====================
// Parent-curated Top 8 editor. Three tabs:
//   "today"  — edit the per-date override for a specific date
//   "weekly" — edit the standing weekday default
//   "log"    — quick à la carte completion for tasks Reznor did off-board
//
// All writes are additive — completions go through the existing
// submitTask flow (star economy, approval triggers, RLS all unchanged).
// Top 8 reads/writes operate entirely on the new familySettings.topPriorities
// jsonb key.
function DailyAdventureBoardPlan(props) {
  const {
    tasks = [],
    topPriorities = { weekly: {}, daily: {} },
    setDailyTopEight,
    resetDailyTopEight,
    setWeeklyTopEight,
    submitTask,
    activities = [],
  } = props;
  const [tab, setTab] = useState("today");
  const [editingDate, setEditingDate] = useState(TODAY_ISO);
  const [editingWeekday, setEditingWeekday] = useState(WEEKDAY);

  const weekdayOf = (iso) => {
    const d = new Date(iso + "T12:00");
    return d.toLocaleDateString("en-US", { weekday: "long" });
  };
  const shiftDate = (iso, delta) => {
    const d = new Date(iso + "T12:00");
    d.setDate(d.getDate() + delta);
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
  };
  const fmtDate = (iso) => {
    const d = new Date(iso + "T12:00");
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  const bootstrap = useMemo(() => bootstrapWeeklyTopEight(tasks), [tasks]);

  // Resolve current ids list for whichever tab is active.
  const currentIds = useMemo(() => {
    if (tab === "today") {
      const dailyOv = topPriorities?.daily?.[editingDate];
      if (Array.isArray(dailyOv)) return dailyOv;
      const wk = weekdayOf(editingDate);
      return topPriorities?.weekly?.[wk] || bootstrap[wk] || [];
    }
    if (tab === "weekly") {
      return topPriorities?.weekly?.[editingWeekday] || bootstrap[editingWeekday] || [];
    }
    return [];
  }, [tab, editingDate, editingWeekday, topPriorities, bootstrap]);

  const pickedTasks = currentIds
    .map((id) => tasks.find((t) => t.id === id))
    .filter(Boolean);
  const availableTasks = tasks
    .filter((t) => t.active !== false && !currentIds.includes(t.id))
    .sort((a, b) => (a.required === b.required ? 0 : a.required ? -1 : 1));

  const writeIds = (ids) => {
    if (tab === "today") setDailyTopEight?.(editingDate, ids);
    else if (tab === "weekly") setWeeklyTopEight?.(editingWeekday, ids);
  };
  const move = (idx, delta) => {
    const next = [...currentIds];
    const target = idx + delta;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    writeIds(next);
  };
  const removeAt = (idx) => writeIds(currentIds.filter((_, i) => i !== idx));
  const add = (taskId) => writeIds([...currentIds, taskId]);
  const resetTab = () => {
    if (tab === "today") resetDailyTopEight?.(editingDate);
    else if (tab === "weekly") setWeeklyTopEight?.(editingWeekday, bootstrap[editingWeekday] || []);
  };

  const isCustomizedToday = Array.isArray(topPriorities?.daily?.[editingDate]);
  const isCustomizedWeekly = Array.isArray(topPriorities?.weekly?.[editingWeekday]);

  const actEmoji = (t) => {
    const a = (activities || []).find((x) => x.id === (t.activityId || (TYPE_TO_ACT_MAP[t.activityType] || "")));
    return a?.emoji || "•";
  };

  return (
    <div className="px-4 pt-3 pb-24">
      <div className="flex gap-1 bg-slate-100 rounded-2xl p-1 mb-3">
        {[
          ["today",  "Today's Plan"],
          ["weekly", "Weekly Plan"],
          ["log",    "Log a Completion"],
        ].map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`flex-1 text-[12px] font-bold py-2 rounded-xl ${
              tab === k ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "today" && (
        <>
          <div className="flex items-center justify-between gap-2 mb-3 bg-white border border-slate-200 rounded-2xl p-2">
            <button onClick={() => setEditingDate(shiftDate(editingDate, -1))} className="p-2 rounded-lg bg-slate-100 text-slate-600 font-bold">◀</button>
            <div className="text-center">
              <div className="text-sm font-extrabold text-slate-800">{fmtDate(editingDate)}</div>
              <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                {editingDate === TODAY_ISO ? "Today" : (isCustomizedToday ? "custom plan" : `defaults from ${weekdayOf(editingDate)} weekly`)}
              </div>
            </div>
            <button onClick={() => setEditingDate(shiftDate(editingDate, 1))} className="p-2 rounded-lg bg-slate-100 text-slate-600 font-bold">▶</button>
          </div>
        </>
      )}

      {tab === "weekly" && (
        <div className="flex gap-1 mb-3">
          {WEEKDAYS.map((d) => (
            <button
              key={d}
              onClick={() => setEditingWeekday(d)}
              className={`flex-1 text-[11px] font-bold py-2 rounded-lg ${
                editingWeekday === d ? "bg-indigo-600 text-white" : "bg-white text-slate-500 border border-slate-200"
              }`}
            >
              {d.slice(0, 3)}
            </button>
          ))}
        </div>
      )}

      {tab === "log" ? (
        <LogACompletion
          tasks={tasks}
          currentTopEightIds={topPriorities?.daily?.[TODAY_ISO] || topPriorities?.weekly?.[WEEKDAY] || bootstrap[WEEKDAY] || []}
          submitTask={submitTask}
          setDailyTopEight={setDailyTopEight}
          actEmoji={actEmoji}
        />
      ) : (
        <>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
            Picked ({pickedTasks.length})
          </div>
          {pickedTasks.length === 0 && (
            <div className="text-[12px] text-slate-400 italic mb-3 px-1">
              Nothing on this plan yet — tap from "Available" below to add.
            </div>
          )}
          <div className="space-y-1.5 mb-4">
            {pickedTasks.map((t, i) => (
              <div key={t.id} className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-2">
                <span className="w-6 text-right text-[11px] font-bold text-slate-400 shrink-0">{i + 1}.</span>
                <span className="text-base shrink-0">{actEmoji(t)}</span>
                <span className="flex-1 text-sm font-bold text-slate-800 truncate">{i18nTitleOf(t)}</span>
                <button
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className={`w-7 h-7 rounded-md text-xs font-bold ${i === 0 ? "bg-slate-50 text-slate-300" : "bg-slate-100 text-slate-600 active:scale-95"}`}
                  aria-label="Move up"
                >▲</button>
                <button
                  onClick={() => move(i, 1)}
                  disabled={i === pickedTasks.length - 1}
                  className={`w-7 h-7 rounded-md text-xs font-bold ${i === pickedTasks.length - 1 ? "bg-slate-50 text-slate-300" : "bg-slate-100 text-slate-600 active:scale-95"}`}
                  aria-label="Move down"
                >▼</button>
                <button
                  onClick={() => removeAt(i)}
                  className="w-7 h-7 rounded-md bg-rose-50 text-rose-500 text-xs font-bold active:scale-95"
                  aria-label="Remove"
                >×</button>
              </div>
            ))}
          </div>

          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
            Available — tap to add
          </div>
          <div className="space-y-1 mb-4">
            {availableTasks.map((t) => (
              <button
                key={t.id}
                onClick={() => add(t.id)}
                className="w-full flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-2 active:scale-[0.99] text-left"
              >
                <span className="text-base shrink-0">{actEmoji(t)}</span>
                <span className="flex-1 text-sm text-slate-700 truncate">{i18nTitleOf(t)}</span>
                {t.required && <span className="text-[9px] font-bold uppercase tracking-wider text-rose-500">required</span>}
                <span className="text-indigo-600 font-bold">+</span>
              </button>
            ))}
            {availableTasks.length === 0 && (
              <div className="text-[12px] text-slate-400 italic px-1">Every active task is already on this plan.</div>
            )}
          </div>

          {((tab === "today" && isCustomizedToday) || (tab === "weekly" && isCustomizedWeekly)) && (
            <button
              onClick={resetTab}
              className="w-full py-2.5 rounded-2xl bg-slate-100 text-slate-600 font-bold text-sm"
            >
              {tab === "today" ? "↺ Reset to weekly default" : "↺ Reset to bootstrap default"}
            </button>
          )}
        </>
      )}
    </div>
  );
}

// Look-up that mirrors TYPE_TO_ACT inside Insights — task.activityType
// → activity id when the task doesn't carry activityId directly. Used
// to fish a friendly emoji out of the activities catalog for editor rows.
const TYPE_TO_ACT_MAP = {
  Drums: "a_drums",
  "English reading": "a_eng_read",
  "Spanish reading": "a_spa_read",
  "Spanish practice": "a_spanish",
  Duolingo: "a_duo",
  Writing: "a_write",
  Math: "a_math",
  Art: "a_art",
  Movement: "a_move",
  Swim: "a_swim",
  Taekwondo: "a_tkd",
  "Hip Hop Dance": "a_dance",
  Chores: "a_chores",
  "Field trips": "a_field",
  Church: "a_church",
  Basketball: "a_bball",
};

// "Log a Completion" — fast à la carte. Submits a completion through
// the existing submitTask flow (so the star/approval machinery still
// runs); then offers "Add to today's board" as an explicit follow-up
// per Mike's brief — off-board by default.
function LogACompletion({ tasks, currentTopEightIds, submitTask, setDailyTopEight, actEmoji }) {
  const [justLogged, setJustLogged] = useState(null);
  const offBoard = tasks
    .filter((t) => t.active !== false && !currentTopEightIds.includes(t.id))
    .sort((a, b) => (a.required === b.required ? 0 : a.required ? -1 : 1));

  const log = (t) => {
    if (!submitTask) return;
    submitTask(t.id, {});
    setJustLogged(t);
  };
  const promoteToBoard = (mode, replaceId) => {
    if (!justLogged || !setDailyTopEight) return;
    if (mode === "append") {
      setDailyTopEight(TODAY_ISO, [...currentTopEightIds, justLogged.id]);
    } else if (mode === "replace" && replaceId) {
      const next = currentTopEightIds.map((id) => (id === replaceId ? justLogged.id : id));
      setDailyTopEight(TODAY_ISO, next);
    }
    setJustLogged(null);
  };

  return (
    <>
      <div className="text-[11px] text-slate-500 mb-2 px-1 leading-snug">
        Logs a completion for the kid you're acting as. Stars + approval flow run
        as usual. The completion is <span className="font-bold">not</span> added
        to today's board unless you explicitly promote it.
      </div>
      {justLogged && (
        <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-3 mb-3">
          <div className="text-sm font-bold text-emerald-800 mb-2">
            ✓ Logged "{justLogged.title}". Add to today's board?
          </div>
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => promoteToBoard("append")}
              className="flex-1 text-[12px] font-bold px-2 py-2 rounded-xl bg-emerald-500 text-white active:scale-95"
            >
              + Append
            </button>
            <button
              onClick={() => setJustLogged(null)}
              className="flex-1 text-[12px] font-bold px-2 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 active:scale-95"
            >
              No, just keep the credit
            </button>
          </div>
          <div className="text-[10px] uppercase tracking-wider font-bold text-emerald-700 mb-1">
            Or replace a current item:
          </div>
          <div className="space-y-1">
            {currentTopEightIds.map((id) => {
              const t = tasks.find((x) => x.id === id);
              if (!t) return null;
              return (
                <button
                  key={id}
                  onClick={() => promoteToBoard("replace", id)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white border border-emerald-200 text-left active:scale-[0.99]"
                >
                  <span className="text-[11px] text-slate-500 shrink-0">drop →</span>
                  <span className="text-sm shrink-0">{actEmoji(t)}</span>
                  <span className="flex-1 text-[12px] font-semibold text-slate-700 truncate">{i18nTitleOf(t)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
        Tasks not on today's board
      </div>
      <div className="space-y-1">
        {offBoard.map((t) => (
          <button
            key={t.id}
            onClick={() => log(t)}
            className="w-full flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-2 active:scale-[0.99] text-left"
          >
            <span className="text-base shrink-0">{actEmoji(t)}</span>
            <span className="flex-1 text-sm text-slate-700 truncate">{i18nTitleOf(t)}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Log done</span>
          </button>
        ))}
        {offBoard.length === 0 && (
          <div className="text-[12px] text-slate-400 italic px-1">Everything's already on today's board.</div>
        )}
      </div>
    </>
  );
}

// DataAudit — runs runDataAudit() over the current family dataset and
// renders the findings. Read-only: just shows what's true. The audit
// is the safety rail for the "other parents asking to use it" pivot
// — bank arithmetic, ISO date integrity, orphan references all surface
// here before drift leaks into a real parent's view.
function DataAudit(props) {
  const findings = useMemo(() => runDataAudit({
    completions: props.completions || [],
    tasks: props.tasks || [],
    gifted: props.gifted || [],
    redemptions: props.redemptions || [],
    songs: props.songs || [],
    songPlays: props.songPlays || [],
    books: props.books || [],
    albumPhotos: props.albumPhotos || [],
    users: props.users || [],
    starBank: props.starBank || 0,
    base: 0,
  }), [props.completions, props.tasks, props.gifted, props.redemptions, props.songs, props.songPlays, props.books, props.albumPhotos, props.users, props.starBank]);
  const summary = auditSummary(findings);
  const headerTone =
    summary.error > 0 ? "from-rose-500 to-rose-600"
    : summary.warn > 0 ? "from-amber-500 to-amber-600"
    : "from-emerald-500 to-emerald-600";
  const headerEmoji = summary.error > 0 ? "⚠️" : summary.warn > 0 ? "⚠️" : "✅";
  const headerLabel =
    summary.error > 0 ? i18nTOf("audit_drift", "Drift detected")
    : summary.warn > 0 ? i18nTOf("audit_minor", "Minor warnings")
    : i18nTOf("audit_clean", "All clean");
  const summaryTpl = summary.error === 1
    ? i18nTOf("audit_summary", "{ok} passing · {warn} warning · {err} error")
    : i18nTOf("audit_summary_plural_err", "{ok} passing · {warn} warning · {err} errors");
  return (
    <div className="px-4 pt-4">
      <div className={`rounded-3xl p-4 mb-3 text-white bg-gradient-to-br ${headerTone}`}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur grid place-items-center text-2xl">{headerEmoji}</div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-white/70 font-bold">{i18nTOf("audit_label", "Audit result")}</div>
            <div className="text-xl font-extrabold leading-tight">{headerLabel}</div>
            <div className="text-[11px] text-white/80 mt-0.5">
              {summaryTpl.replaceAll("{ok}", summary.ok).replaceAll("{warn}", summary.warn).replaceAll("{err}", summary.error)}
            </div>
          </div>
        </div>
      </div>
      <p className="text-[11px] text-slate-400 px-1 mb-2 leading-snug">
        {i18nTOf("audit_intro", "Read-only check across the whole family dataset. Any drift here points at a deeper problem — a botched import, a delete that left dangling references, or a date written in the wrong format.")}
      </p>
      <div className="space-y-2">
        {findings.map((f) => {
          const cls =
            f.level === "error" ? "border-rose-200 bg-rose-50"
            : f.level === "warn" ? "border-amber-200 bg-amber-50"
            : "border-emerald-200 bg-emerald-50";
          const icon = f.level === "error" ? "✖" : f.level === "warn" ? "⚠️" : "✓";
          const iconCls =
            f.level === "error" ? "text-rose-700"
            : f.level === "warn" ? "text-amber-700"
            : "text-emerald-700";
          return (
            <Card key={f.check} className={`p-3 ${cls}`}>
              <div className="flex items-start gap-2">
                <div className={`text-sm font-extrabold shrink-0 ${iconCls}`}>{icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-bold text-slate-800">{f.message}</div>
                  {f.details && f.details.length > 0 && (
                    <ul className="mt-1.5 text-[11px] text-slate-600 space-y-0.5 list-disc pl-4">
                      {f.details.map((d, i) => (
                        <li key={i} className="break-all">{d}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// PrivacySafety — surface the trust contract to a parent in one
// scrollable page. Goals: (1) make data isolation visible — your
// family ID, who has access, who has parent powers; (2) disclose
// what's actually stored (photos may carry GPS); (3) make
// own-your-data ops one tap away (export, sign out). Especially
// important now that other parents are asking to use Command Center.
// LanguagesPage — parent toggle for which languages render across the
// app. Phase 1 ships en + es. Mike's rule: keep some English around
// when Spanish is on so Reznor (still learning) doesn't get lost.
// "Both" is the default-friendly recommendation; "Spanish only" is
// available for full immersion days.
function LanguagesPage({ displayLangs = ["en"], setDisplayLangs }) {
  const current = Array.isArray(displayLangs) && displayLangs.length > 0 ? displayLangs : ["en"];
  const isEnglishOnly = current.length === 1 && current[0] === "en";
  const isSpanishOnly = current.length === 1 && current[0] === "es";
  const isBoth = current.length === 2 || (current.includes("en") && current.includes("es"));
  const apply = (next) => setDisplayLangs?.(next);
  const OptionCard = ({ active, onClick, primary, secondary, hint }) => (
    <button
      type="button"
      onClick={onClick}
      className={`w-full mb-2 text-left rounded-2xl border-2 p-4 transition ${active ? "border-indigo-500 bg-indigo-50" : "border-slate-100 bg-white"}`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-sm font-extrabold text-slate-800">{primary}</div>
        {active && <Check size={16} className="text-indigo-600 shrink-0" />}
      </div>
      <div className="text-[12px] font-semibold text-slate-500 mt-0.5">{secondary}</div>
      <div className="text-[11px] text-slate-400 mt-1 leading-snug">{hint}</div>
    </button>
  );
  return (
    <div className="px-4 pt-4">
      <div className="rounded-3xl p-4 mb-3 text-white bg-gradient-to-br from-indigo-500 to-violet-600">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur grid place-items-center text-2xl">🌐</div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-white/70 font-bold">{i18nTOf("lang_header", "Languages")}</div>
            <div className="text-xl font-extrabold leading-tight">{i18nTOf("lang_subtitle", "For the whole family")}</div>
            <div className="text-[11px] text-white/80 mt-0.5">
              {i18nTOf("lang_subhint", "Bilingual task names and labels everywhere they fit.")}
            </div>
          </div>
        </div>
      </div>
      <OptionCard
        active={isEnglishOnly}
        onClick={() => apply(["en"])}
        primary={i18nTOf("lang_en_only", "🇺🇸 English only")}
        secondary={i18nTOf("lang_en_only_sub", "The original.")}
        hint={i18nTOf("lang_en_only_hint", "Every label and task name in English. Pick this if Spanish makes the screens feel busy.")}
      />
      <OptionCard
        active={isBoth}
        onClick={() => apply(["en", "es"])}
        primary={i18nTOf("lang_both", "🇺🇸 / 🇪🇸 Both — recommended")}
        secondary={i18nTOf("lang_both_sub", "English first, Spanish alongside.")}
        hint={i18nTOf("lang_both_hint", "Task names and labels render together — \"Make Bed / Hacer la cama\". Lets a learner read in Spanish without getting lost.")}
      />
      <OptionCard
        active={isSpanishOnly}
        onClick={() => apply(["es"])}
        primary={i18nTOf("lang_es_only", "🇪🇸 Spanish only")}
        secondary={i18nTOf("lang_es_only_sub", "Sólo en español.")}
        hint={i18nTOf("lang_es_only_hint", "Full immersion. A few brand names (Duolingo, Drumeo) stay as they are.")}
      />
      <div className="text-[11px] text-slate-400 px-1 mt-3 leading-snug">
        {i18nTOf("lang_custom_hint", "Custom tasks you've added show up in whatever language you typed them in — open the task editor to add a Spanish name.")}
      </div>
    </div>
  );
}

// Account card on Privacy & Safety — lets a signed-in user SET or
// CHANGE their password without going through forgot-password email.
// Critical for anyone who landed via magic link and now wants real
// password protection (Mike's rule: families upload photos + private
// info, password is non-negotiable for adults and older kids).
function SetPasswordCard({ sessionEmail }) {
  const [open, setOpen] = useState(false);
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [state, setState] = useState("idle"); // idle | saving | saved | error
  const [error, setError] = useState("");

  const ready = pwd.length >= 8 && pwd === confirm;
  const submit = async () => {
    if (!ready || state === "saving") return;
    setState("saving");
    setError("");
    try {
      const { error } = await supabase.auth.updateUser({ password: pwd });
      if (error) {
        setState("error");
        setError(error.message);
      } else {
        setState("saved");
        setPwd("");
        setConfirm("");
        setTimeout(() => { setState("idle"); setOpen(false); }, 2500);
      }
    } catch (e) {
      setState("error");
      setError(String(e?.message || e));
    }
  };

  return (
    <Card className="p-3 mb-3 bg-amber-50 border-amber-200">
      <div className="flex items-start gap-2">
        <span className="text-xl shrink-0">🔐</span>
        <div className="flex-1 min-w-0">
          <div className="font-extrabold text-sm">Account password</div>
          <div className="text-[11px] text-amber-800 leading-snug">
            Set or change the password for <strong>{sessionEmail || "your account"}</strong>. Required for accounts that uploaded photos or private data. Magic-link users: set a password here so you're not relying on email-only sign-in.
          </div>
          {!open ? (
            <button onClick={() => { setOpen(true); setState("idle"); setError(""); }} className="mt-2 text-[11px] font-bold px-3 py-1.5 rounded-full bg-amber-600 text-white active:scale-95">
              Set / change password
            </button>
          ) : (
            <div className="mt-2 space-y-1.5">
              <input
                type="password"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                placeholder="New password (8+ characters)"
                autoComplete="new-password"
                minLength={8}
                className="w-full border border-amber-200 rounded-lg px-2 py-1.5 text-sm bg-white"
              />
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Type it again"
                autoComplete="new-password"
                minLength={8}
                className="w-full border border-amber-200 rounded-lg px-2 py-1.5 text-sm bg-white"
              />
              {pwd && confirm && pwd !== confirm && (
                <div className="text-[10px] text-rose-600">The two don't match yet.</div>
              )}
              <div className="flex gap-1.5">
                <button
                  onClick={submit}
                  disabled={!ready || state === "saving"}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold text-white ${ready ? "bg-amber-600" : "bg-slate-300"}`}
                >
                  {state === "saving" ? "Saving…" : state === "saved" ? "✓ Saved" : "Save password"}
                </button>
                <button onClick={() => { setOpen(false); setPwd(""); setConfirm(""); }} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-500 border border-slate-200">
                  Cancel
                </button>
              </div>
              {state === "error" && (
                <div className="text-[10px] text-rose-600">{error}</div>
              )}
              {state === "saved" && (
                <div className="text-[10px] text-emerald-700">Password updated. You'll use it for your next sign-in.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function PrivacySafety(props) {
  const { familyId = "", users = [], sessionEmail = "", signOut, completions = [], albumPhotos = [], gifted = [], songPlays = [], setTab, setSub } = props;
  const fid = String(familyId || "");
  const familyShort = fid ? fid.slice(0, 8) + "…" + fid.slice(-4) : "—";
  const parents = users.filter((u) => u.role === "parent");
  const helpers = users.filter((u) => u.role === "helper");
  const kids = users.filter((u) => u.role === "kid");
  const counts = {
    completions: (completions || []).length,
    photos: (albumPhotos || []).length,
    gifts: (gifted || []).length,
    songPlays: (songPlays || []).length,
  };
  // Privacy & Safety rows can be clickable when the data has a
  // natural drill-down (People / Photo Gallery / etc.). Mike's ask:
  // "You should be able to click anything in here and get the
  // deeper info. For example you need to be able to click a helper
  // in our case Sara and see what she is able to do."
  const Row = ({ label, value, hint, onClick }) => {
    const body = (
      <div className="flex items-baseline justify-between gap-3 py-2 border-b border-slate-100 last:border-0 w-full text-left">
        <div className="text-[12px] font-bold text-slate-600">{label}</div>
        <div className="text-right flex items-baseline gap-1">
          <div>
            <div className="text-[12px] font-extrabold text-slate-800 tabular-nums break-all">{value}</div>
            {hint && <div className="text-[10px] text-slate-400">{hint}</div>}
          </div>
          {onClick && <span className="text-slate-300 text-[12px] ml-1">›</span>}
        </div>
      </div>
    );
    if (!onClick) return body;
    return (
      <button type="button" onClick={onClick} className="w-full active:scale-[0.99] transition hover:bg-slate-50 -mx-3 px-3 rounded">
        {body}
      </button>
    );
  };
  const openPeople = setSub ? () => setSub("people") : null;
  const openGallery = setSub ? () => setSub("gallery") : null;
  return (
    <div className="px-4 pt-4">
      <SetPasswordCard sessionEmail={sessionEmail} />
      <div className="rounded-3xl p-4 mb-3 text-white bg-gradient-to-br from-indigo-500 to-violet-600">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur grid place-items-center text-2xl">🔒</div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-white/70 font-bold">{i18nTOf("priv_header", "Privacy & Safety")}</div>
            <div className="text-xl font-extrabold leading-tight">{i18nTOf("priv_subtitle", "Your family, your data")}</div>
            <div className="text-[11px] text-white/80 mt-0.5">
              {i18nTOf("priv_subhint", "Isolated from every other family using Command Center.")}
            </div>
          </div>
        </div>
      </div>

      <SectionTitle icon={<Lock size={16} className="text-violet-500" />}>{i18nTOf("priv_sec_family", "Your family")}</SectionTitle>
      <Card className="p-3 mb-3">
        <Row label={i18nTOf("priv_row_family_id", "Family ID")} value={familyShort} hint={i18nTOf("priv_row_family_id_hint", "Unique to your family — used to isolate every row.")} />
        <Row label={i18nTOf("priv_row_signed_in", "Signed in as")} value={sessionEmail || "—"} />
        <Row label={i18nTOf("priv_row_parents", "Parents")} value={`${parents.length}`} hint={parents.map((u) => u.name).join(", ") || "—"} onClick={openPeople} />
        <Row label={i18nTOf("priv_row_helpers", "Helpers")} value={`${helpers.length}`} hint={helpers.map((u) => u.name).join(", ") || i18nTOf("priv_row_none", "(none)")} onClick={openPeople} />
        <Row label={i18nTOf("priv_row_kids", "Kids")} value={`${kids.length}`} hint={kids.map((u) => u.name).join(", ") || "—"} onClick={openPeople} />
      </Card>

      <SectionTitle icon={<Camera size={16} className="text-cyan-500" />}>{i18nTOf("priv_sec_stored", "What's stored")}</SectionTitle>
      <Card className="p-3 mb-3">
        <Row label={i18nTOf("priv_row_completions", "Completions")} value={counts.completions} />
        <Row label={i18nTOf("priv_row_photos", "Photos")} value={counts.photos} hint={i18nTOf("priv_row_photos_hint", "Stored in your family's bucket — never shared.")} onClick={openGallery} />
        <Row label={i18nTOf("priv_row_gifts", "Gifts")} value={counts.gifts} />
        <Row label={i18nTOf("priv_row_song_plays", "Song plays")} value={counts.songPlays} />
      </Card>

      <SectionTitle icon={<AlertCircle size={16} className="text-amber-500" />}>{i18nTOf("priv_sec_photo_loc", "Photo location data")}</SectionTitle>
      <Card className="p-3 mb-3">
        <div className="text-[12px] text-slate-700 leading-snug">
          {i18nTOf("priv_photo_loc_body", "When a photo is taken as proof and your device offers location, Command Center records a coarse GPS tag with the photo so a parent reviewing later knows where the chore happened. Tags stay inside your family.")}
        </div>
        <div className="text-[11px] text-slate-500 mt-2 leading-snug">
          {i18nTOf("priv_photo_loc_revoke", "You can revoke location for the app at the OS level (iOS: Settings → Safari → Location; Android: Site settings) and the tag won't be saved.")}
        </div>
      </Card>

      <SectionTitle icon={<Download size={16} className="text-emerald-500" />}>{i18nTOf("priv_sec_own_data", "Own your data")}</SectionTitle>
      {/* These CTAs used to bounce the parent back to the More menu
          root and require a second tap to find Export / Audit. Now
          they navigate directly to the sub-page via setSub, the
          same mechanism the More menu uses internally. */}
      <button
        type="button"
        onClick={() => setSub ? setSub("export") : setTab?.("more")}
        className="w-full mb-2 active:scale-[0.98] transition"
      >
        <Card className="p-3 flex items-center gap-3 text-left">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 grid place-items-center text-emerald-600 shrink-0">
            <Download size={16} />
          </div>
          <div className="flex-1">
            <div className="text-[12px] font-bold text-slate-800">{i18nTOf("priv_export_title", "Export every row as CSV")}</div>
            <div className="text-[10px] text-slate-400">{i18nTOf("priv_export_hint", "More → Export Data — completions, photos, books, songs, the whole set.")}</div>
          </div>
        </Card>
      </button>
      <button
        type="button"
        onClick={() => setSub ? setSub("audit") : setTab?.("more")}
        className="w-full mb-3 active:scale-[0.98] transition"
      >
        <Card className="p-3 flex items-center gap-3 text-left">
          <div className="w-9 h-9 rounded-xl bg-amber-50 grid place-items-center text-amber-600 shrink-0">
            <AlertCircle size={16} />
          </div>
          <div className="flex-1">
            <div className="text-[12px] font-bold text-slate-800">{i18nTOf("priv_audit_title", "Run a data audit")}</div>
            <div className="text-[10px] text-slate-400">{i18nTOf("priv_audit_hint", "More → Data audit — checks bank math, orphan refs, date integrity.")}</div>
          </div>
        </Card>
      </button>

      <SectionTitle icon={<LogOut size={16} className="text-rose-500" />}>{i18nTOf("priv_sec_session", "Session")}</SectionTitle>
      {signOut && (
        <button
          type="button"
          onClick={signOut}
          className="w-full py-3 rounded-2xl bg-rose-50 text-rose-700 font-extrabold text-sm active:scale-95 mb-2"
        >
          {i18nTOf("priv_sign_out", "Sign out")}{sessionEmail ? ` (${sessionEmail})` : ""}
        </button>
      )}
      <div className="text-[10px] text-slate-400 leading-snug px-1 mb-6">
        {i18nTOf("priv_sign_out_hint", "Signing out clears the session on this device. Your family's data stays in the cloud and reappears the next time anyone signs in.")}
      </div>
    </div>
  );
}

function MoreParent(props) {
  const [sub, setSub] = useState(props.pendingMoreSub || "menu");
  // Consume the deep-link target once on mount so re-entering More
  // shows the menu by default (not the same sub forever). Calling
  // setPendingMoreSub(null) clears the app-level state.
  useEffect(() => {
    if (props.pendingMoreSub) {
      props.setPendingMoreSub?.(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (sub === "privacy") return <BackWrap title={i18nTOf("more_privacy", "Privacy & Safety")} onBack={() => setSub("menu")}><PrivacySafety {...props} setSub={setSub} /></BackWrap>;
  if (sub === "audit") return <BackWrap title={i18nTOf("more_audit", "Data audit")} onBack={() => setSub("menu")}><DataAudit {...props} /></BackWrap>;
  if (sub === "languages") return <BackWrap title={i18nTOf("more_languages", "Languages")} onBack={() => setSub("menu")}><LanguagesPage {...props} /></BackWrap>;
  if (sub === "siri") return <BackWrap title="Siri Shortcuts" onBack={() => setSub("menu")}><SiriShortcuts tasks={props.tasks} users={props.users} /></BackWrap>;
  if (sub === "practice") return <BackWrap title="Practice Timer" onBack={() => setSub("menu")}><PracticeTimer activities={props.activities} practiceSessions={props.practiceSessions} addPracticeSession={props.addPracticeSession} removePracticeSession={props.removePracticeSession} familyId={props.familyId} currentProfileId={props.currentProfileId} users={props.users} /></BackWrap>;
  if (sub === "shopping") return <BackWrap title="Shopping List" onBack={() => setSub("menu")}><ShoppingList shoppingItems={props.shoppingItems} addShoppingItem={props.addShoppingItem} toggleShoppingItem={props.toggleShoppingItem} removeShoppingItem={props.removeShoppingItem} clearCheckedShoppingItems={props.clearCheckedShoppingItems} renameShoppingItem={props.renameShoppingItem} updateShoppingItem={props.updateShoppingItem} decideShoppingRequest={props.decideShoppingRequest} users={props.users} user={props.user} familySettings={props.familySettings} setFamilySettings={props.setFamilySettings} relabelShoppingItemsByListKey={props.relabelShoppingItemsByListKey} addReceipt={props.addReceipt} familyId={props.familyId} fuzzyMatch={fuzzyMatch} /></BackWrap>;
  if (sub === "receipts") return <BackWrap title="Receipts" onBack={() => setSub("menu")}><Receipts receipts={props.receipts} softDeleteReceipt={props.softDeleteReceipt} updateReceipt={props.updateReceipt} users={props.users} user={props.user} shoppingItems={props.shoppingItems} /></BackWrap>;
  if (sub === "email") return <BackWrap title="Email Setup" onBack={() => setSub("menu")}><EmailSetup {...props} /></BackWrap>;
  if (sub === "portfolio") return <BackWrap title={i18nTOf("more_portfolio", "Progress Portfolio")} onBack={() => setSub("menu")}><Portfolio {...props} /></BackWrap>;
  if (sub === "weekly") return <BackWrap title={i18nTOf("more_weekly", "Weekly Summary")} onBack={() => setSub("menu")}><Weekly {...props} /></BackWrap>;
  if (sub === "handoff") return <BackWrap title={i18nTOf("more_handoff", "Handoff Notes")} onBack={() => setSub("menu")}><HandoffFull {...props} /></BackWrap>;
  if (sub === "skills") return <BackWrap title={i18nTOf("more_skills", "Learning Goals")} onBack={() => setSub("menu")}><Skills learningGoals={props.learningGoals} setLearningGoals={props.setLearningGoals} kids={(props.users || []).filter((u) => u.role === "kid")} updateUser={props.updateUser} /></BackWrap>;
  if (sub === "people") return <BackWrap title={i18nTOf("more_people", "Family & Helpers")} onBack={() => setSub("menu")}><People {...props} /></BackWrap>;
  if (sub === "activities") return <BackWrap title={i18nTOf("more_activities", "Activities & Status")} onBack={() => setSub("menu")}><ManageActivities {...props} /></BackWrap>;
  if (sub === "tasks") return <BackWrap title={i18nTOf("more_tasks", "Tasks & Chores")} onBack={() => setSub("menu")}><ManageTasks {...props} /></BackWrap>;
  if (sub === "library") return <BackWrap title={i18nTOf("more_library", "Reading Library")} onBack={() => setSub("menu")}><ReadingLibrary {...props} /></BackWrap>;
  if (sub === "grades") return <BackWrap title={i18nTOf("more_grades", "Grade Goals")} onBack={() => setSub("menu")}><GradeGoals users={props.users} /></BackWrap>;
  if (sub === "recap") return <BackWrap title={i18nTOf("more_recap", "Recap & Memories")} onBack={() => setSub("menu")}><ParentRecap {...props} /></BackWrap>;
  if (sub === "awards") return <BackWrap title={i18nTOf("more_awards", "Accomplishments")} onBack={() => setSub("menu")}><Accomplishments {...props} /></BackWrap>;
  if (sub === "board_theme") return <BackWrap title={i18nTOf("more_board_theme", "Adventure Board")} onBack={() => setSub("menu")}><AdventureBoardSettings {...props} /></BackWrap>;
  if (sub === "board_plan") return <BackWrap title={i18nTOf("more_board_plan", "Daily Adventure Board · Plan")} onBack={() => setSub("menu")}><DailyAdventureBoardPlan {...props} /></BackWrap>;
  if (sub === "gallery") return <BackWrap title={i18nTOf("more_gallery", "Photo Gallery")} onBack={() => setSub("menu")}><PhotoGallery {...props} /></BackWrap>;
  if (sub === "insights") return <BackWrap title={i18nTOf("more_insights", "Insights")} onBack={() => setSub("menu")}><Insights {...props} /></BackWrap>;
  if (sub === "music_library") return <BackWrap title={i18nTOf("more_music_library", "Music Library")} onBack={() => setSub("menu")}><MusicLibrary {...props} /></BackWrap>;
  if (sub === "export") return <BackWrap title={i18nTOf("more_export", "Export Data")} onBack={() => setSub("menu")}><DataExport {...props} /></BackWrap>;
  if (sub === "slideshow") return <BackWrap title={i18nTOf("more_slideshow", "Milestone Slideshows")} onBack={() => setSub("menu")}><MilestoneSlideshow {...props} /></BackWrap>;
  // Each item carries a `group`: null = top-of-page (no header),
  // "memories" | "setup" | "account" = a named section header. Mike's
  // 2026-06-15 directive: "I'm struggling here. Help me figure this
  // out." Top-level items are the daily-use ones; the three named
  // groups bundle the rarely-touched stuff so the page doesn't read
  // as a wall of options. Customization (move / regroup / reorder) is
  // a separate follow-up — for now this is the new fixed layout.
  const items = [
    // Daily-use, no group
    { k: "library",      group: null,       icon: <BookOpen size={18} />,       label: i18nTOf("more_library", "Reading Library"),              sub: i18nTOf("more_library_sub", "Books · level · reading pace") },
    { k: "music_library",group: null,       icon: <Music size={18} />,          label: i18nTOf("more_music_library", "Music Library"),          sub: i18nTOf("more_music_library_sub", "Every song · sort · edit titles / artists / albums / covers") },
    { k: "gallery",      group: null,       icon: <Camera size={18} />,         label: i18nTOf("more_gallery", "Photo Gallery"),                sub: i18nTOf("more_gallery_sub", "Every photo · sort by date · filter by activity") },
    { k: "practice",     group: null,       icon: <Play size={18} />,           label: "Practice Timer",                                        sub: "Time a session · record a 30s clip · listen back later" },
    { k: "shopping",     group: null,       icon: <ClipboardList size={18} />,  label: "Shopping List",                                         sub: "Shared family list · add at the store · check off at home" },
    { k: "receipts",     group: null,       icon: <ReceiptIcon size={18} />,    label: "Receipts",                                              sub: "Every scanned receipt · tap to view items · delete" },
    { k: "insights",     group: null,       icon: <TrendingUp size={18} />,     label: i18nTOf("more_insights", "Insights"),                    sub: i18nTOf("more_insights_sub", "Practice time · songs · books · counts") },

    // Memories & growth
    { k: "recap",        group: "memories", icon: <Share2 size={18} />,         label: i18nTOf("more_recap", "Recap & Memories"),               sub: i18nTOf("more_recap_sub", "Weekly/monthly export · anniversaries") },
    { k: "slideshow",    group: "memories", icon: <Play size={18} />,           label: i18nTOf("more_slideshow", "Milestone Slideshows"),       sub: i18nTOf("more_slideshow_sub", "Monthly · 6-month · 1-year recaps") },
    { k: "awards",       group: "memories", icon: <Medal size={18} />,          label: i18nTOf("more_awards", "Accomplishments"),               sub: i18nTOf("more_awards_sub", "Report cards · belts · certificates") },
    { k: "skills",       group: "memories", icon: <GraduationCap size={18} />,  label: i18nTOf("more_skills", "Learning Goals"),                sub: i18nTOf("more_skills_sub", "Grade-level skill tracker (early)") },
    { k: "grades",       group: "memories", icon: <Trophy size={18} />,         label: i18nTOf("more_grades", "Grade Goals"),                   sub: i18nTOf("more_grades_sub", "Grades 1–6 · world's best standards") },
    { k: "portfolio",    group: "memories", icon: <ImageIcon size={18} />,      label: i18nTOf("more_portfolio", "Progress Portfolio"),         sub: i18nTOf("more_portfolio_sub", "Photos, art & writing over time") },
    { k: "weekly",       group: "memories", icon: <ClipboardList size={18} />,  label: i18nTOf("more_weekly", "Weekly Summary"),                sub: i18nTOf("more_weekly_sub", "Minutes, wins, needs attention") },

    // Set up & manage
    { k: "board_plan",   group: "setup",    icon: <ClipboardList size={18} />,  label: i18nTOf("more_board_plan", "Daily Adventure Board · Plan"), sub: i18nTOf("more_board_plan_sub", "Today's Top 8 · weekly default · à la carte") },
    { k: "board_theme",  group: "setup",    icon: <MapIcon size={18} />,        label: i18nTOf("more_board_theme", "Adventure Board"),          sub: i18nTOf("more_board_theme_sub", "Daily target · theme · controls") },
    { k: "tasks",        group: "setup",    icon: <ClipboardList size={18} />,  label: i18nTOf("more_tasks", "Tasks & Chores"),                 sub: i18nTOf("more_tasks_sub", "Add · edit · pause · remove") },
    { k: "activities",   group: "setup",    icon: <Palette size={18} />,        label: i18nTOf("more_activities", "Activities & Status"),       sub: i18nTOf("more_activities_sub", "Add activities · breaks/seasons · colors") },
    { k: "people",       group: "setup",    icon: <Users size={18} />,          label: i18nTOf("more_people", "Family & Helpers"),              sub: i18nTOf("more_people_sub", "Add people · view-only share links · access") },
    { k: "handoff",      group: "setup",    icon: <Users size={18} />,          label: i18nTOf("more_handoff", "Handoff Notes"),                sub: i18nTOf("more_handoff_sub", "What the next adult needs to know") },

    // Account
    { k: "email",        group: "account",  icon: <Share2 size={18} />,         label: "Email Setup",                                           sub: "Friday digest · pick who gets it · test send" },
    { k: "siri",         group: "account",  icon: <Music size={18} />,          label: "Siri Shortcuts",                                        sub: "Hey Siri — one tap per task" },
    { k: "languages",    group: "account",  icon: <GraduationCap size={18} />,  label: i18nTOf("more_languages", "Languages"),                  sub: i18nTOf("more_languages_sub", "English / Spanish / Both — for the whole family") },
    { k: "privacy",      group: "account",  icon: <Lock size={18} />,           label: i18nTOf("more_privacy", "Privacy & Safety"),             sub: i18nTOf("more_privacy_sub", "Family isolation · what's stored · own your data") },
    { k: "export",       group: "account",  icon: <Download size={18} />,       label: i18nTOf("more_export", "Export Data"),                   sub: i18nTOf("more_export_sub", "CSV downloads — own your data") },
    { k: "audit",        group: "account",  icon: <AlertCircle size={18} />,    label: i18nTOf("more_audit", "Data audit"),                     sub: i18nTOf("more_audit_sub", "Check the math · find drift · spot orphans") },
  ];
  return (
    <div className="px-4 pt-4">
      <MoreMenu
        items={items}
        onPick={(k) => setSub(k)}
        savedOrder={props.currentPrefs?.moreOrder}
        onSaveOrder={(orderByGroup) => props.setPref?.("moreOrder", orderByGroup)}
        savedColors={props.currentPrefs?.moreColors}
        onSaveColor={(groupId, token) => {
          const next = { ...(props.currentPrefs?.moreColors || {}) };
          next[groupId] = token;
          props.setPref?.("moreColors", next);
        }}
        onResetOrder={() => { props.setPref?.("moreOrder", null); props.setPref?.("moreColors", null); }}
      />
    </div>
  );
}

// Section headers for the grouped More menu. Each label is short
// + clear so a parent skimming the page can see what's inside
// without thinking. Order: top (no header) → memories → setup →
// account.
const MORE_GROUPS = [
  { id: "memories", emoji: "🏆", label: "Memories & growth", hint: "Photos, recap, awards, goals" },
  { id: "setup",    emoji: "🧰", label: "Set up & manage",   hint: "Board, tasks, activities, helpers" },
  { id: "account",  emoji: "⚙️", label: "Account",            hint: "Email, privacy, export, settings" },
];

// Per-section color tokens. Mike 2026-06-15: "I love color coding, I
// think each catagory should have a color. I don't like seeing white.
// We should allow users to change these colors if they want to."
// Defaults below; per-parent override lives at currentPrefs.moreColors
// keyed by section id ("top" | "memories" | "setup" | "account").
const MORE_DEFAULT_COLORS = {
  top:      "sky",
  memories: "violet",
  setup:    "indigo",
  account:  "slate",
};

// Available color choices for the section picker. Tailwind requires
// static class strings (the purger doesn't follow template strings),
// so each token maps to a pre-baked classes bundle. Adding a new
// token = one entry in MORE_COLOR_CLASSES.
//
// Amber is intentionally omitted per Mike's preference 2026-06-15:
// "I don't like the yellow for reading, music etc... I'd like that
// to be a cool blue. Let's not use that yellow color at all." If a
// parent had previously saved "amber" as a section color, the lookup
// falls back to that section's curated default instead of breaking.
const MORE_COLOR_TOKENS = ["sky", "indigo", "violet", "rose", "emerald", "teal", "slate"];
const MORE_COLOR_LABELS = {
  sky:     "Sky",
  indigo:  "Indigo",
  violet:  "Violet",
  rose:    "Rose",
  emerald: "Emerald",
  teal:    "Teal",
  slate:   "Slate",
};
const MORE_COLOR_DOT = {
  sky:     "#0ea5e9",
  indigo:  "#6366f1",
  violet:  "#8b5cf6",
  rose:    "#f43f5e",
  emerald: "#10b981",
  teal:    "#14b8a6",
  slate:   "#64748b",
};
const MORE_COLOR_CLASSES = {
  sky:     { card: "bg-sky-50 border-sky-100",         iconBg: "bg-sky-100",      iconText: "text-sky-600",      headerText: "text-sky-700" },
  indigo:  { card: "bg-indigo-50 border-indigo-100",   iconBg: "bg-indigo-100",   iconText: "text-indigo-600",   headerText: "text-indigo-700" },
  violet:  { card: "bg-violet-50 border-violet-100",   iconBg: "bg-violet-100",   iconText: "text-violet-600",   headerText: "text-violet-700" },
  rose:    { card: "bg-rose-50 border-rose-100",       iconBg: "bg-rose-100",     iconText: "text-rose-600",     headerText: "text-rose-700" },
  emerald: { card: "bg-emerald-50 border-emerald-100", iconBg: "bg-emerald-100",  iconText: "text-emerald-600",  headerText: "text-emerald-700" },
  teal:    { card: "bg-teal-50 border-teal-100",       iconBg: "bg-teal-100",     iconText: "text-teal-600",     headerText: "text-teal-700" },
  slate:   { card: "bg-slate-50 border-slate-100",     iconBg: "bg-slate-100",    iconText: "text-slate-600",    headerText: "text-slate-700" },
};
const colorForGroup = (colors, group) => {
  const saved = colors && colors[group];
  const fallback = MORE_DEFAULT_COLORS[group] || "slate";
  const token = saved && MORE_COLOR_CLASSES[saved] ? saved : fallback;
  return MORE_COLOR_CLASSES[token] || MORE_COLOR_CLASSES.slate;
};
const colorTokenForGroup = (colors, group) => {
  const saved = colors && colors[group];
  if (saved && MORE_COLOR_CLASSES[saved]) return saved;
  return MORE_DEFAULT_COLORS[group] || "slate";
};

// MoreMenu — grouped layout with per-section reorder. Each parent
// can drag items up/down within a section (or use ↑/↓ buttons in
// edit mode), and Reset snaps back to the curated default. Moving
// items between sections is the next layer and isn't enabled yet.
//
// Saved shape on currentPrefs.moreOrder:
//   { top: [k,k,k], memories: [k,k], setup: [k,k], account: [k,k] }
// A null / missing value means "use the default order". A null entry
// in any one section also falls back to default for that section.
function MoreMenu({ items, onPick, savedOrder, onSaveOrder, savedColors, onSaveColor, onResetOrder }) {
  const [editMode, setEditMode] = useState(false);
  const [dragKey, setDragKey] = useState(null);

  // Default-by-group, in the order MoreParent's items[] declares them.
  const defaultByGroup = useMemo(() => {
    const out = { top: [], memories: [], setup: [], account: [] };
    for (const it of items) {
      const g = it.group || "top";
      if (!out[g]) out[g] = [];
      out[g].push(it);
    }
    return out;
  }, [items]);

  // Apply the saved per-section order. Items in savedOrder come first
  // (in saved order); items not in savedOrder slot in at the end of
  // their section in default order. New entries added in a future
  // ship auto-appear at the bottom without a parent having to re-edit.
  const orderedByGroup = useMemo(() => {
    const out = {};
    for (const g of Object.keys(defaultByGroup)) {
      const def = defaultByGroup[g];
      const saved = (savedOrder && Array.isArray(savedOrder[g])) ? savedOrder[g] : null;
      if (!saved) { out[g] = def; continue; }
      const byKey = Object.fromEntries(def.map((i) => [i.k, i]));
      const seen = new Set();
      const arr = [];
      for (const k of saved) {
        if (byKey[k] && !seen.has(k)) { arr.push(byKey[k]); seen.add(k); }
      }
      for (const i of def) {
        if (!seen.has(i.k)) { arr.push(i); seen.add(i.k); }
      }
      out[g] = arr;
    }
    return out;
  }, [defaultByGroup, savedOrder]);

  // Find the group key for a given item key — used to constrain drag
  // operations to within a section.
  const groupOf = (k) => {
    for (const g of Object.keys(orderedByGroup)) {
      if (orderedByGroup[g].some((i) => i.k === k)) return g;
    }
    return null;
  };

  // Persist a new order for ONE group. Other groups keep their saved
  // order (or stay at default if they had no saved order).
  const commitGroup = (groupId, nextRows) => {
    const next = { ...(savedOrder || {}) };
    next[groupId] = nextRows.map((i) => i.k);
    onSaveOrder?.(next);
  };

  const move = (groupId, from, to) => {
    const rows = orderedByGroup[groupId] || [];
    if (from === to || to < 0 || to >= rows.length) return;
    const next = rows.slice();
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    commitGroup(groupId, next);
  };

  const renderRow = (i, idx, rows, groupId) => {
    const c = colorForGroup(savedColors, groupId);
    if (!editMode) {
      return (
        <button key={i.k} onClick={() => onPick(i.k)} className="w-full mb-2 active:scale-[0.98] transition">
          <div className={`rounded-2xl border p-4 flex items-center gap-3 text-left ${c.card}`}>
            <div className={`w-10 h-10 rounded-2xl grid place-items-center ${c.iconBg} ${c.iconText}`}>{i.icon}</div>
            <div className="flex-1"><div className="font-bold text-sm">{i.label}</div><div className="text-[11px] text-slate-500">{i.sub}</div></div>
            <ChevronLeft size={16} className="rotate-180 text-slate-300" />
          </div>
        </button>
      );
    }
    return (
      <div
        key={i.k}
        draggable
        onDragStart={(e) => {
          setDragKey(i.k);
          e.dataTransfer.effectAllowed = "move";
          try { e.dataTransfer.setData("text/plain", i.k); } catch {}
        }}
        onDragOver={(e) => {
          if (!dragKey || dragKey === i.k) return;
          if (groupOf(dragKey) !== groupId) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (!dragKey || dragKey === i.k) return;
          if (groupOf(dragKey) !== groupId) return;
          const from = rows.findIndex((x) => x.k === dragKey);
          const to = rows.findIndex((x) => x.k === i.k);
          move(groupId, from, to);
          setDragKey(null);
        }}
        onDragEnd={() => setDragKey(null)}
        className={dragKey === i.k ? "opacity-50" : ""}
      >
        <div className={`rounded-2xl border p-3 mb-2 flex items-center gap-2 ${c.card}`}>
          <div className="text-slate-400 cursor-grab active:cursor-grabbing select-none px-1" title="Drag to reorder within this section">☰</div>
          <div className={`w-9 h-9 rounded-2xl grid place-items-center shrink-0 ${c.iconBg} ${c.iconText}`}>{i.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm truncate">{i.label}</div>
            <div className="text-[11px] text-slate-500 truncate">{i.sub}</div>
          </div>
          <button
            type="button"
            onClick={() => move(groupId, idx, idx - 1)}
            disabled={idx === 0}
            className={`w-8 h-8 rounded-lg grid place-items-center ${idx === 0 ? "text-slate-200" : "text-slate-500 hover:bg-white"}`}
            title="Move up"
          >▲</button>
          <button
            type="button"
            onClick={() => move(groupId, idx, idx + 1)}
            disabled={idx === rows.length - 1}
            className={`w-8 h-8 rounded-lg grid place-items-center ${idx === rows.length - 1 ? "text-slate-200" : "text-slate-500 hover:bg-white"}`}
            title="Move down"
          >▼</button>
        </div>
      </div>
    );
  };

  // Inline color-picker row, shown in edit mode under each section
  // header (and the top-of-page header) so a parent can tint the
  // section to anything they like. Click a dot to save instantly;
  // the active token gets a thicker ring.
  const renderColorPicker = (groupId) => {
    const activeToken = colorTokenForGroup(savedColors, groupId);
    return (
      <div className="flex flex-wrap items-center gap-1.5 px-1 mb-2">
        <span className="text-[10px] text-slate-500 mr-1">Color:</span>
        {MORE_COLOR_TOKENS.map((tok) => (
          <button
            key={tok}
            type="button"
            onClick={() => onSaveColor?.(groupId, tok)}
            className={`w-6 h-6 rounded-full transition active:scale-90 ${activeToken === tok ? "ring-2 ring-slate-700 ring-offset-2 ring-offset-white" : ""}`}
            style={{ background: MORE_COLOR_DOT[tok] }}
            aria-label={MORE_COLOR_LABELS[tok]}
            title={MORE_COLOR_LABELS[tok]}
          />
        ))}
      </div>
    );
  };

  const renderSection = (g) => {
    const rows = orderedByGroup[g.id] || [];
    if (rows.length === 0) return null;
    const c = colorForGroup(savedColors, g.id);
    return (
      <div key={g.id} className="mt-4">
        <div className="flex items-baseline gap-2 px-1 mb-1.5">
          <span className="text-base">{g.emoji}</span>
          <div className="flex-1">
            <div className={`text-[12px] font-extrabold uppercase tracking-wider ${c.headerText}`}>{g.label}</div>
            <div className="text-[10px] text-slate-400 leading-snug">{g.hint}</div>
          </div>
        </div>
        {editMode && renderColorPicker(g.id)}
        {rows.map((i, idx) => renderRow(i, idx, rows, g.id))}
      </div>
    );
  };

  const topRows = orderedByGroup.top || [];
  const topColor = colorForGroup(savedColors, "top");
  return (
    <>
      <div className="flex items-center justify-between mb-2 px-1">
        <h2 className="font-extrabold text-lg">{i18nTOf("more_header", "More")}</h2>
        <div className="flex items-center gap-2">
          {editMode && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(i18nTOf("more_reset_confirm", "Reset the More menu to the default order?"))) {
                  onResetOrder?.();
                }
              }}
              className="text-[11px] font-bold text-slate-500"
            >
              {i18nTOf("more_reset", "Reset")}
            </button>
          )}
          <button
            type="button"
            onClick={() => setEditMode((v) => !v)}
            className={`text-[12px] font-bold px-3 py-1.5 rounded-full ${editMode ? "bg-indigo-600 text-white" : "bg-indigo-50 text-indigo-700"}`}
          >
            {editMode ? i18nTOf("act_done", "Done") : i18nTOf("more_edit_order", "Edit order")}
          </button>
        </div>
      </div>
      {editMode && (
        <div className="text-[11px] text-slate-500 px-1 mb-2 leading-snug">
          {i18nTOf("more_reorder_hint_grouped", "Drag the ☰ handle (or tap ↑ / ↓) to reorder within a section. Tap a color dot to retint that section. Moving items between sections is coming next. Reset snaps everything back.")}
        </div>
      )}
      {editMode && topRows.length > 0 && (
        <div className="flex items-baseline gap-2 px-1 mb-1.5">
          <span className="text-base">⭐</span>
          <div className="flex-1">
            <div className={`text-[12px] font-extrabold uppercase tracking-wider ${topColor.headerText}`}>Top of page</div>
            <div className="text-[10px] text-slate-400 leading-snug">Your daily-use shortcuts</div>
          </div>
        </div>
      )}
      {editMode && topRows.length > 0 && renderColorPicker("top")}
      {topRows.map((i, idx) => renderRow(i, idx, topRows, "top"))}
      {MORE_GROUPS.map(renderSection)}
    </>
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
          <MapIcon size={11} /> Today's Quest Cap
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
      toast.error("Couldn't find the kid's profile.");
      return;
    }
    const ok = window.confirm(`Go to ${kid.name || "the kid"}'s game board?`);
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
                    {isActive ? `Tap again → ${kid?.name || "the kid"}'s board` : "Tap to switch"}
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
          🎮 Go to {kid?.name ? `${kid.name}'s` : "your kid's"} game board
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

function Portfolio({ completions, tasks, users, gifted, activities, books = [], songs = [], songPlays = [] }) {
  // Merge completions + gifts into one timeline so the most-recent
  // thing is on top regardless of which kind it is. Each item carries
  // its own `_date` (ISO YYYY-MM-DD) used for the sort. Honest display
  // dates too — the old layout was stamping every completion with
  // today's date via fmtDate(today). Now: each row shows its real
  // completion_date / given_on.
  const fmtRowDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso + "T12:00");
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  };
  const items = [];
  for (const c of (completions || [])) {
    if (c.status !== "approved") continue;
    items.push({ kind: "completion", _date: c.completionDate || "", c });
  }
  for (const g of (gifted || [])) {
    items.push({ kind: "gift", _date: g.date || "", g });
  }
  // Newest first. Ties broken by id so the order is stable across
  // re-renders.
  items.sort((a, b) => {
    if (a._date !== b._date) return b._date.localeCompare(a._date);
    const aid = a.kind === "completion" ? a.c.id : a.g.id;
    const bid = b.kind === "completion" ? b.c.id : b.g.id;
    return bid.localeCompare(aid);
  });
  if (items.length === 0) {
    return <p className="text-sm text-slate-400 px-1">Approved work with photos will appear here as a timeline.</p>;
  }
  return (
    <>
      {items.map((row) => {
        if (row.kind === "gift") {
          const g = row.g;
          // Same task/activity resolution as the Earned-today and
          // Star Ledger surfaces so the gift's photo or book/song
          // cover lands here too. ProofThumb handles the label-fuzzy
          // fallback for legacy gifts that didn't use the picker.
          const gTask = g.extra?.taskId ? tasks.find((t) => t.id === g.extra.taskId) : null;
          const gAct = g.extra?.activityId
            ? activities.find((a) => a.id === g.extra.activityId)
            : (gTask
                ? activities.find((a) => a.id === (gTask.activityId
                    || gTask.activityType?.toLowerCase().replace(/\s/g, "_")))
                : null);
          return (
            <button
              key={`g-${g.id}`}
              type="button"
              onClick={() => giftEditor.open(g)}
              className="w-full text-left active:scale-[0.99] transition"
              title="Tap to edit this bonus"
            >
              <Card className="p-3 mb-2 flex gap-3">
                <ProofThumb gift={g} activity={gAct} task={gTask} books={books} songs={songs} songPlays={songPlays} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm">{g.label} <span className="text-amber-600 font-normal">· bonus</span></div>
                  <div className="text-[11px] text-slate-400">{fmtRowDate(g.date)} · {g.stars}⭐ · gifted by {users.find((u) => u.id === g.by)?.name || "—"} · tap to edit</div>
                </div>
              </Card>
            </button>
          );
        }
        const c = row.c;
        const t = tasks.find((x) => x.id === c.taskId);
        const by = users.find((u) => u.id === c.approvedBy)?.name;
        const a = actFor(t || { activityType: "" }, activities);
        const ph = c.proof?.find((p) => p.path || p.url);
        return (
          <Card key={`c-${c.id}`} className="p-3 mb-2 flex gap-3">
            <ProofThumb completion={c} activity={a} task={t} books={books} songs={songs} songPlays={songPlays} size={48} />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm">{i18nTitleOf(t)} {c.extra?.bookTitle && <span className="text-slate-400 font-normal">· {c.extra.bookTitle}</span>}</div>
              <div className="text-[11px] text-slate-400">{fmtRowDate(c.completionDate)} · {c.awardedStars}⭐ · approved by {by || "—"}</div>
              {ph?.geo && <div className="text-[11px] text-slate-400">📍 {ph.geo.label}{ph.time ? ` · ${ph.time}` : ""}{ph.by ? ` · by ${users.find((u) => u.id === ph.by)?.name || "helper"}` : ""}</div>}
            </div>
          </Card>
        );
      })}
    </>
  );
}

function Weekly({ completions = [], gifted = [], tasks = [], activities = [], books = [] }) {
  // Mike's review: "For Weekly Summary get rid of the Demo. We have
  // enough info you can use what we actually have." Every figure
  // below is now derived from canonical state — completions, gifts,
  // tasks, activities, books — instead of a hardcoded placeholder
  // bag. Week window = last 7 days (inclusive).
  const start = new Date(today); start.setDate(today.getDate() - 6);
  const startIso = isoLocal(start);
  const inWeek = (iso) => iso && iso >= startIso && iso <= TODAY_ISO;

  const approvedThisWeek = completions.filter((c) => c.status === "approved" && inWeek(c.completionDate));
  const giftsThisWeek = (gifted || []).filter((g) => inWeek(g.date));
  const totalStars =
    approvedThisWeek.reduce((s, c) => s + (c.awardedStars || 0), 0) +
    giftsThisWeek.reduce((s, g) => s + (Number(g.stars) || 0), 0);

  // Per-activity day counts — group approved completions by activity,
  // then count distinct dates so two drum logs on the same day = 1.
  const taskById = Object.fromEntries(tasks.map((t) => [t.id, t]));
  const actLookup = (act) => activities.find((a) => a.id === act);
  const byActivity = new Map(); // activityId → Set<dateISO>
  for (const c of approvedThisWeek) {
    const t = taskById[c.taskId];
    if (!t) continue;
    const aid = t.activityId || TYPE_TO_ACT[t.activityType];
    if (!aid) continue;
    if (!byActivity.has(aid)) byActivity.set(aid, new Set());
    byActivity.get(aid).add(c.completionDate);
  }
  const rows = [...byActivity.entries()]
    .map(([aid, dates]) => {
      const a = actLookup(aid);
      return { name: a?.short || a?.name || "Untitled activity", days: dates.size, aid };
    })
    .sort((a, b) => b.days - a.days);

  // Books finished this week — real, not a "Yes ✓" placeholder.
  const booksFinishedThisWeek = (books || []).filter((b) => b.status === "finished" && inWeek(b.finished));

  // 🏆 Wins — anything done all 7 days this week + books finished.
  // Honest data instead of a "she read solo" hardcoded sentence.
  const dailyWins = rows.filter((r) => r.days >= 7);
  const winLines = [];
  for (const w of dailyWins) winLines.push(`Daily streak on ${w.name} (7/7).`);
  if (booksFinishedThisWeek.length > 0) {
    winLines.push(`Finished ${booksFinishedThisWeek.length} book${booksFinishedThisWeek.length === 1 ? "" : "s"}: ${booksFinishedThisWeek.map((b) => b.canonicalTitle || b.title).join(", ")}.`);
  }
  if (giftsThisWeek.length > 0) {
    const bonusStars = giftsThisWeek.reduce((s, g) => s + (Number(g.stars) || 0), 0);
    winLines.push(`${giftsThisWeek.length} bonus gift${giftsThisWeek.length === 1 ? "" : "s"} for going above and beyond (+${bonusStars}⭐).`);
  }

  // ⚠️ Needs attention — required/active activities done < 3 days.
  // Skips one-offs (field trips, anything seasonal/paused).
  const activeRequired = new Set();
  for (const t of tasks) {
    if (!t.required || t.active === false) continue;
    const aid = t.activityId || TYPE_TO_ACT[t.activityType];
    if (!aid) continue;
    const a = actLookup(aid);
    if (!a || a.status !== "active") continue;
    activeRequired.add(aid);
  }
  const slipping = [...activeRequired]
    .map((aid) => ({ aid, days: byActivity.get(aid)?.size || 0, name: actLookup(aid)?.short || actLookup(aid)?.name || "Untitled activity" }))
    .filter((r) => r.days < 3)
    .sort((a, b) => a.days - b.days);

  return (
    <>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <Card className="p-3 text-center"><div className="text-2xl font-extrabold text-amber-500">{totalStars}</div><div className="text-[11px] text-slate-400">stars this week</div></Card>
        <Card className="p-3 text-center"><div className="text-2xl font-extrabold text-emerald-500">{approvedThisWeek.length}</div><div className="text-[11px] text-slate-400">activities completed</div></Card>
      </div>
      {rows.length === 0 ? (
        <Card className="p-4 text-center text-sm text-slate-400">Nothing approved yet this week.</Card>
      ) : (
        rows.map((r) => (
          <Card key={r.aid} className="p-3 mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold">{r.name}</span>
            <span className="text-sm text-slate-500 tabular-nums">{r.days} day{r.days === 1 ? "" : "s"}</span>
          </Card>
        ))
      )}
      {winLines.length > 0 && (
        <Card className="p-3 mt-2 bg-emerald-50 border-emerald-100">
          <div className="text-xs font-bold text-emerald-700 mb-1">🏆 Wins of the week</div>
          <ul className="text-sm text-emerald-800 list-disc pl-4 space-y-0.5">
            {winLines.map((l, i) => <li key={i}>{l}</li>)}
          </ul>
        </Card>
      )}
      {slipping.length > 0 && (
        <Card className="p-3 mt-2 bg-amber-50 border-amber-100">
          <div className="text-xs font-bold text-amber-700 mb-1">⚠️ Needs attention</div>
          <ul className="text-sm text-amber-800 list-disc pl-4 space-y-0.5">
            {slipping.map((r) => (
              <li key={r.aid}>{r.name} only {r.days} day{r.days === 1 ? "" : "s"} this week.</li>
            ))}
          </ul>
        </Card>
      )}
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

// Generic starter areas any family can opt into. Subject names only —
// the note is left blank so each family fills in what's true for THEIR
// kid (no Lynch-specific text leaks). Parent taps "Add suggested
// starters" on the empty state to pre-fill these, then edits each.
const SKILL_STARTER_AREAS = [
  "Reading",
  "Writing",
  "Math",
  "Science",
  "Music",
  "Spanish",
  "Art",
  "PE",
];

// Email Setup — parent opt-in for the Friday digest + a Send Test
// button that exercises the entire pipeline (build digest → fetch
// /api/send-email → Resend → inbox). Status banner up top reflects
// whether RESEND_API_KEY is set on Netlify (probed via a zero-recipient
// request; the function returns "email_not_configured" gracefully).
function EmailSetup(props) {
  const {
    users = [], familyId, sessionEmail,
    familySetting,
    // digest data sources:
    completions = [], tasks = [], activities = [], streaks = {},
    books = [], songPlays = [], gifted = [], practiceSessions = [], events = [],
  } = props;

  const parents = users.filter((u) => (u.role === "parent" || u.role === "helper" || u.role === "grandparent") && u.email);
  const kid = users.find((u) => u.role === "kid");

  // Recipients live in familySettings.digestRecipients — array of
  // profile ids opted in. Default empty so nothing fires until a
  // parent explicitly opts in.
  const [digestRecipients, setDigestRecipients] = familySetting
    ? familySetting("digestRecipients", [])
    : [[], () => {}];
  const isOpted = (pid) => (digestRecipients || []).includes(pid);
  const toggleOpted = (pid) => setDigestRecipients((prev = []) =>
    prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid]
  );

  const [serviceStatus, setServiceStatus] = useState("unknown"); // unknown | configured | not_configured | checking
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const probe = async () => {
    setServiceStatus("checking");
    try {
      // Intentional bad payload — the function rejects on missing
      // fields BEFORE checking the key, EXCEPT we want the key check.
      // So instead we send a well-formed test with a clearly-internal
      // recipient + subject = "ping". The function reports back
      // status="email_not_configured" if key is missing, "send_failed"
      // or "ok" otherwise. We treat anything other than
      // "email_not_configured" as "configured" for this probe.
      const r = await fetch("/api/send-email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ to: ["probe@invalid.example"], subject: "probe", text: "probe" }),
      });
      const j = await r.json();
      setServiceStatus(j.status === "email_not_configured" ? "not_configured" : "configured");
    } catch {
      setServiceStatus("unknown");
    }
  };

  useEffect(() => { probe(); /* eslint-disable-next-line */ }, []);

  const sendTest = async () => {
    if (!sessionEmail) {
      setLastResult({ ok: false, msg: "Sign in first so we know where to send the test." });
      return;
    }
    setSending(true);
    setLastResult(null);
    try {
      const { buildDigestData, renderDigestHtml, renderDigestText } = await import("./lib/digestBuilder.js");
      const data = buildDigestData({
        kid, completions, tasks, activities, streaks, books, songPlays, gifted, practiceSessions, events,
      });
      const html = renderDigestHtml(data, { appUrl: window.location.origin });
      const text = renderDigestText(data);
      const subject = `Friday recap · ${data.kidName}`;
      const r = await fetch("/api/send-email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ to: [sessionEmail], subject, html, text }),
      });
      const j = await r.json();
      if (j.status === "ok") {
        setLastResult({ ok: true, msg: `Sent to ${sessionEmail}. Check your inbox (and spam folder the first time).` });
      } else if (j.status === "email_not_configured") {
        setLastResult({ ok: false, msg: "Email service isn't set up yet — paste RESEND_API_KEY into Netlify env vars first." });
      } else {
        setLastResult({ ok: false, msg: `Resend rejected the send: ${JSON.stringify(j.detail || j).slice(0, 200)}` });
      }
    } catch (e) {
      setLastResult({ ok: false, msg: String(e?.message || e) });
    } finally {
      setSending(false);
    }
  };

  const sendNow = async () => {
    const opted = parents.filter((p) => isOpted(p.id) && p.email);
    if (opted.length === 0) {
      setLastResult({ ok: false, msg: "Nobody opted in yet — check at least one parent below." });
      return;
    }
    setSending(true);
    setLastResult(null);
    try {
      const { buildDigestData, renderDigestHtml, renderDigestText } = await import("./lib/digestBuilder.js");
      const data = buildDigestData({
        kid, completions, tasks, activities, streaks, books, songPlays, gifted, practiceSessions, events,
      });
      const html = renderDigestHtml(data, { appUrl: window.location.origin });
      const text = renderDigestText(data);
      const subject = `Friday recap · ${data.kidName}`;
      const r = await fetch("/api/send-email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ to: opted.map((p) => p.email), subject, html, text }),
      });
      const j = await r.json();
      if (j.status === "ok") {
        setLastResult({ ok: true, msg: `Sent to ${opted.length} recipient${opted.length === 1 ? "" : "s"}.` });
      } else if (j.status === "email_not_configured") {
        setLastResult({ ok: false, msg: "Email service isn't set up yet — paste RESEND_API_KEY into Netlify env vars first." });
      } else {
        setLastResult({ ok: false, msg: `Resend rejected: ${JSON.stringify(j.detail || j).slice(0, 200)}` });
      }
    } catch (e) {
      setLastResult({ ok: false, msg: String(e?.message || e) });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Status banner */}
      {serviceStatus === "not_configured" && (
        <Card className="p-3 mb-3 bg-amber-50 border border-amber-200">
          <div className="text-[11px] uppercase tracking-wider font-bold text-amber-700 mb-1">Email service isn't set up yet</div>
          <div className="text-[12px] text-amber-800 leading-snug">
            Tomorrow at the computer: paste <strong>RESEND_API_KEY</strong> into Netlify → Site settings → Environment variables, then trigger a redeploy. Until then, the digest can be previewed but not sent.
          </div>
        </Card>
      )}
      {serviceStatus === "configured" && (
        <Card className="p-3 mb-3 bg-emerald-50 border border-emerald-200">
          <div className="text-[11px] uppercase tracking-wider font-bold text-emerald-700">Email service is ready</div>
          <div className="text-[12px] text-emerald-800">Send a test below to confirm domain verification.</div>
        </Card>
      )}
      {serviceStatus === "checking" && (
        <Card className="p-3 mb-3 bg-slate-50">
          <div className="text-[12px] text-slate-500">Checking…</div>
        </Card>
      )}

      <h3 className="text-[11px] uppercase tracking-wider font-bold text-slate-500 mb-2 px-1">Who gets the Friday digest</h3>
      {parents.length === 0 && (
        <Card className="p-3 mb-2 text-[12px] text-slate-500">No parents/helpers with emails yet. Add one under More → Family &amp; Helpers.</Card>
      )}
      {parents.map((p) => (
        <Card key={p.id} className="p-3 mb-2 flex items-center gap-3">
          <button
            onClick={() => toggleOpted(p.id)}
            className={`w-7 h-7 rounded-full grid place-items-center shrink-0 transition active:scale-90 ${isOpted(p.id) ? "bg-emerald-500 text-white" : "border-2 border-slate-200"}`}
          >
            {isOpted(p.id) && <Check size={15} />}
          </button>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm truncate">{p.name}</div>
            <div className="text-[11px] text-slate-400 truncate">{p.email}</div>
          </div>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 capitalize shrink-0">{p.role}</span>
        </Card>
      ))}

      <div className="flex gap-2 mt-4">
        <button
          onClick={sendTest}
          disabled={sending}
          className="flex-1 py-3 rounded-2xl bg-slate-200 text-slate-700 font-bold text-sm"
        >
          {sending ? "Sending…" : `📬 Send test to ${sessionEmail || "me"}`}
        </button>
        <button
          onClick={sendNow}
          disabled={sending || parents.filter((p) => isOpted(p.id)).length === 0}
          className={`flex-1 py-3 rounded-2xl font-bold text-sm text-white ${(sending || parents.filter((p) => isOpted(p.id)).length === 0) ? "bg-slate-300" : "bg-indigo-600 active:scale-95"}`}
        >
          📤 Send digest now
        </button>
      </div>

      {lastResult && (
        <Card className={`p-3 mt-3 ${lastResult.ok ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"}`}>
          <div className={`text-[12px] ${lastResult.ok ? "text-emerald-700" : "text-rose-700"}`}>{lastResult.msg}</div>
        </Card>
      )}

      <Card className="p-3 mt-4 bg-slate-50">
        <div className="text-[11px] uppercase tracking-wider font-bold text-slate-500 mb-2">Heads up</div>
        <ul className="text-[12px] text-slate-600 leading-snug space-y-1.5 list-disc pl-4">
          <li>Until Resend's domain verification is done, sends only work to addresses on your own Resend account (sandbox mode). Test send to your own email works because that's where you signed up.</li>
          <li>The digest covers the last 7 days. Run it any day; the data wraps automatically.</li>
          <li>Weekly automation (every Friday morning) lands as a follow-up — for now you tap "Send digest now" when you want it out.</li>
          <li>Recipients can reply STOP to be removed (manual for now — paste their address into Resend's suppression list).</li>
        </ul>
      </Card>
    </>
  );
}

// Shared family shopping list. Krissie-first design: opens fast, the
// input is autofocused, Enter adds the item, tap a row to check off,
// long-press / pencil to rename, X to remove. Strikethrough on
// checked items sinks them to the bottom. One-tap "Clear bought"
// when the trip's over. The whole point is being faster than texting.
function ShoppingList({ shoppingItems = [], addShoppingItem, toggleShoppingItem, removeShoppingItem, clearCheckedShoppingItems, renameShoppingItem, updateShoppingItem, decideShoppingRequest, users = [], user = null, familySettings = {}, setFamilySettings = null, relabelShoppingItemsByListKey = null, addReceipt = null, familyId = null, fuzzyMatch = null }) {
  const isKid = user?.role === "kid";
  const isParent = user?.role === "parent" || user?.role === "helper" || user?.role === "grandparent";
  const [draft, setDraft] = useState("");
  const [draftBrand, setDraftBrand] = useState("");
  const [showSmartSuggestions, setShowSmartSuggestions] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState("");
  const [editBrandDraft, setEditBrandDraft] = useState("");
  const [editSectionDraft, setEditSectionDraft] = useState("");
  // RS-1 Commit B — kind-chooser sheet replaces the prior 2-button
  // grid. chooserOpen drives the bottom sheet; receiptScannerOpen
  // drives the (still-stubbed) ReceiptScanner overlay mount. The
  // mount is the wiring — full receipt UX comes in a follow-up PR
  // where ReceiptScanner.jsx grows past its current `return null`.
  const [chooserOpen, setChooserOpen] = useState(false);
  const [receiptScannerOpen, setReceiptScannerOpen] = useState(false);

  // Lists + sections (chapter 1a/1b — see docs/SHOPPING-LISTS-CHAPTER-1-PLAN.md).
  // activeList holds the DISPLAY label of the tab Krissie is on.
  // activeListKey is the normalized storage key used for filtering and
  // for item writes — that's the contract Green's RS-1 chooser inherits
  // (any add must pass listName: shoppingNormalizeListKey(activeList)).
  // availableLists is the SORTED registry (lastUsedAt desc → createdAt
  // desc → name asc) read from family_settings.shoppingLists; empty
  // lists survive because the registry is independent of items.
  //
  // 1b — last-active memory across sessions: the initial value is
  // resolved from family_settings.lastActiveListKey via
  // getActiveListEntry, with a Grocery fallback for missing/invalid/
  // stale keys. setActiveAndPersist writes the new key back to
  // family_settings so the next open lands on the same tab.
  const [activeList, setActiveList] = useState(
    () => shoppingGetActiveListEntry(familySettings).name
  );
  const [newListEditing, setNewListEditing] = useState(false);
  const [newListName, setNewListName] = useState("");
  // 1c — structured collision state instead of a string error. Holds
  // the EXISTING registry entry when a create attempt hit a duplicate
  // key (case-insensitive). The render row uses this to surface a
  // one-tap "Switch to <Name>" button so Krissie doesn't have to
  // scroll back to find the existing pill — closes the create-loop
  // in place. null = no collision, normal state.
  const [commitListCollision, setCommitListCollision] = useState(null);
  const activeListKey = shoppingNormalizeListKey(activeList) || SHOPPING_DEFAULT_LIST_KEY;

  // Tab-switch handler — updates local state AND persists the new key
  // to family_settings.lastActiveListKey so a hard refresh / app
  // reopen lands on the same tab. Safe-no-op if setFamilySettings
  // isn't wired (defensive for test renders).
  const setActiveAndPersist = (displayName) => {
    setActiveList(displayName);
    if (setFamilySettings) {
      setFamilySettings((prev) =>
        shoppingSettingsAfterSetActive(prev, displayName)
      );
    }
  };

  const availableLists = useMemo(
    () => shoppingGetOrderedLists(familySettings),
    [familySettings]
  );

  // Per-list item tallies for the pill badges. {total, unchecked} per
  // normalized key. Per the no-hidden-info rule, the badge shows the
  // unchecked count (the "still to buy" number).
  const listCounts = useMemo(
    () => shoppingCountItemsByList(shoppingItems),
    [shoppingItems]
  );

  // Items filtered to the active list, case-insensitively so pre-
  // chapter-1 "Grocery" capital-G items still match the "grocery" key
  // without a backfill. Everything downstream (history, favorites,
  // partitions) reads from this slice so each list stays its own
  // little world.
  //
  // 2026-06-17 soft-delete: also strip items with deletedAt set. They
  // remain in shoppingItems (and in the DB) until the undo window
  // expires; we just don't render them. Mounts also kick off a load-
  // time purge for expired soft-deletes from prior sessions.
  const listItems = useMemo(
    () => shoppingFilterItemsForList(shoppingItems, activeListKey)
      .filter((it) => !it.deletedAt),
    [shoppingItems, activeListKey]
  );

  // 2026-06-17 persistent bin. The "opposite filter" of listItems:
  // same per-list scope but only soft-deleted items. Sorted most-
  // recently-deleted first so the just-tapped item is at the top.
  // No new memo slot in the existing chain — sibling of listItems,
  // doesn't depend on anything downstream; placed adjacent to keep
  // the chain readable.
  const removedItems = useMemo(() => {
    const target = activeListKey;
    return (shoppingItems || [])
      .filter((it) => {
        if (!it?.deletedAt) return false;
        const key = shoppingNormalizeListKey(it.listName) || SHOPPING_DEFAULT_LIST_KEY;
        return key === target;
      })
      .sort((a, b) => (b.deletedAt || "").localeCompare(a.deletedAt || ""));
  }, [shoppingItems, activeListKey]);

  // Smart-add: history map keyed by lowercased title. Surfaces
  // favorites + fuzzy type-ahead with brand carry-over so Krissie
  // doesn't retype "Honey Nut Cheerios" every week. Scoped to the
  // active list so Costco favorites don't pollute the Grocery view.
  const history = useMemo(() => {
    const m = new Map();
    for (const it of listItems) {
      const k = (it.title || "").trim().toLowerCase();
      if (!k) continue;
      const prev = m.get(k) || { title: it.title, count: 0, lastUsed: "", brand: "" };
      prev.count += 1;
      const when = it.createdAt || "";
      if (when > prev.lastUsed) {
        prev.lastUsed = when;
        prev.title = it.title; // canonical casing = most recent
      }
      if (it.brand) prev.brand = it.brand;
      m.set(k, prev);
    }
    return m;
  }, [listItems]);

  // Favorites = items added 2+ times historically, sorted by recency.
  // Top 8 surface as one-tap chips above the input.
  const favorites = useMemo(() => {
    const arr = [...history.values()].filter((h) => h.count >= 2);
    arr.sort((a, b) => (b.lastUsed || "").localeCompare(a.lastUsed || ""));
    return arr.slice(0, 8);
  }, [history]);

  // Currently-on-the-list set so favorites / restock chips already in
  // play hide. Scoped to the active list. Declared BEFORE
  // restockSuggestions so its const reference doesn't hit the TDZ
  // (Mike caught a "Cannot access 'F' before initialization" crash
  // when the two were declared in the wrong order).
  const activeTitles = useMemo(() => {
    const s = new Set();
    for (const it of listItems) {
      if (it.checked) continue;
      if (it.requestStatus === "declined") continue;
      s.add((it.title || "").trim().toLowerCase());
    }
    return s;
  }, [listItems]);

  // Running-low / restock suggestions (v3 from the doc). For each
  // repeat-bought title in the active list, compute the median gap
  // between consecutive ADDs. If the time since the last add exceeds
  // 0.9× the median AND the item isn't currently on the list, surface
  // it as a "Maybe getting low" chip. Pure client-side smarts — no
  // schema, no API call, gets smarter as the family uses the app.
  const restockSuggestions = useMemo(() => {
    const byTitle = new Map(); // lowercased title → sorted ISO timestamps
    for (const it of listItems) {
      const k = (it.title || "").trim().toLowerCase();
      if (!k || !it.createdAt) continue;
      if (!byTitle.has(k)) byTitle.set(k, []);
      byTitle.get(k).push(it.createdAt);
    }
    const now = Date.now();
    const out = [];
    for (const [k, isos] of byTitle.entries()) {
      if (isos.length < 2) continue;
      if (activeTitles.has(k)) continue; // already on the list, no nudge
      isos.sort();
      const gaps = [];
      for (let i = 1; i < isos.length; i++) {
        const a = new Date(isos[i - 1]).getTime();
        const b = new Date(isos[i]).getTime();
        if (b > a) gaps.push(b - a);
      }
      if (gaps.length === 0) continue;
      const sorted = gaps.slice().sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      // Throw out 1-hour-ish accidents — these aren't real cadence.
      if (median < 24 * 3600_000) continue;
      const last = new Date(isos[isos.length - 1]).getTime();
      const sinceLast = now - last;
      if (sinceLast < median * 0.9) continue;
      const hist = history.get(k);
      out.push({
        title: hist?.title || k,
        brand: hist?.brand || "",
        cadenceDays: Math.round(median / 86400_000),
        sinceLastDays: Math.round(sinceLast / 86400_000),
      });
    }
    out.sort((a, b) => b.sinceLastDays - a.sinceLastDays);
    return out.slice(0, 6);
  }, [listItems, activeTitles, history]);

  // Fuzzy suggestions for the typed draft. Skip exact matches (no
  // point suggesting what they already typed) and titles currently
  // on the active list.
  const suggestions = useMemo(() => {
    const q = draft.trim();
    if (!q || !showSmartSuggestions) return [];
    return [...history.values()]
      .filter((h) => !activeTitles.has((h.title || "").toLowerCase()))
      .map((h) => ({ h, m: fuzzyMatch(q, h.title) }))
      .filter((x) => x.m.hit && (x.h.title || "").toLowerCase() !== q.toLowerCase())
      .sort((a, b) => b.m.score - a.m.score || (b.h.count - a.h.count))
      .slice(0, 5)
      .map((x) => x.h);
  }, [draft, history, activeTitles, showSmartSuggestions]);
  // Scan-a-list / scan-a-product state. scanKind controls which vision
  // prompt fires; results land in the same preview Card.
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const [scanResults, setScanResults] = useState(null); // { items: [{ title, brand?, picked: true }] } or null
  const [scanKind, setScanKind] = useState("shopping_list");
  const onScanFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow same-file re-pick
    if (!file) return;
    setScanError("");
    setScanResults(null);
    setScanning(true);
    try {
      // PR1 barcode hybrid: for product scans only, try the free
      // cross-platform decoder + Open Food Facts BEFORE the paid
      // vision call. On a hit, populate the preview directly and
      // return. On no-decode / OFF miss / timeout / error, fall
      // through SILENTLY to the existing vision-parse path below —
      // no error toast, no banner, no UX hiccup. The written-list
      // kind always goes straight to vision.
      if (scanKind === "shopping_product") {
        let upc = null;
        try {
          const { decodeBarcode } = await import("./lib/barcodeScan.js");
          upc = await decodeBarcode(file);
        } catch { upc = null; }
        if (upc) {
          let offStatus = "error";
          let offBody = null;
          try {
            const r = await fetch("/api/lookup-upc", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ upc }),
            });
            offBody = await r.json().catch(() => null);
            offStatus = offBody?.status || "error";
          } catch { offStatus = "error"; }
          if (offStatus === "ok" && offBody?.title) {
            // eslint-disable-next-line no-console
            console.log(`[barcode] upc=${upc} decoded=yes off=hit source=off`);
            setScanResults({ items: [{ title: offBody.title, brand: offBody.brand || "", picked: true }] });
            return;
          }
          // eslint-disable-next-line no-console
          console.log(`[barcode] upc=${upc} decoded=yes off=${offStatus === "ok" ? "miss" : offStatus} source=vision`);
        } else {
          // eslint-disable-next-line no-console
          console.log(`[barcode] upc=null decoded=no off=skip source=vision`);
        }
      }
      const { scanImage } = await import("./lib/visionScan.js");
      const j = await scanImage({ file, kind: scanKind });
      if (j.status === "vision_not_configured") {
        setScanError("Vision isn't set up yet — paste ANTHROPIC_API_KEY into Netlify env vars first.");
      } else if (j.status !== "ok") {
        setScanError("Couldn't read that one — try a sharper photo or better light.");
      } else if (!j.data?.items?.length) {
        setScanError(scanKind === "shopping_product"
          ? "Couldn't read the product. Try better light or a closer crop on the label."
          : "Didn't find any items. If the list is in the photo, try snapping it again with the writing clearer.");
      } else {
        setScanResults({ items: j.data.items.map((it) => ({ title: it.title, brand: it.brand || "", picked: true })) });
      }
    } catch (e) {
      setScanError(String(e?.message || e));
    } finally {
      setScanning(false);
    }
  };
  const togglePicked = (i) => setScanResults((s) => ({ ...s, items: s.items.map((it, idx) => idx === i ? { ...it, picked: !it.picked } : it) }));
  const renameScan = (i, v) => setScanResults((s) => ({ ...s, items: s.items.map((it, idx) => idx === i ? { ...it, title: v } : it) }));
  const commitScan = () => {
    const picked = (scanResults?.items || []).filter((it) => it.picked);
    for (const it of picked) addShoppingItem(it.title, "", { brand: it.brand || "", listName: activeListKey });
    setScanResults(null);
  };
  // Partition the ACTIVE-LIST items into pending / on-the-list /
  // declined. "On the list" includes parent-added items and approved
  // kid requests. Pending / declined ARE list-scoped because the kid
  // requested an item with a specific list_name when they added it.
  const all = listItems.slice();
  const pendingRequests = all
    .filter((it) => it.requestStatus === "pending")
    .sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
  const onList = all
    .filter((it) => it.requestStatus !== "pending" && it.requestStatus !== "declined")
    .sort((a, b) => {
      if (a.checked !== b.checked) return a.checked ? 1 : -1;
      return (a.createdAt || "").localeCompare(b.createdAt || "");
    });
  const declined = all
    .filter((it) => it.requestStatus === "declined")
    .sort((a, b) => (b.decidedAt || "").localeCompare(a.decidedAt || ""));

  // Group on-list items by section (Produce → Dairy → … → Other).
  // Items lacking a section fall into "Other". Within a section,
  // unchecked first, then checked at the bottom (still per-section).
  const onListBySection = useMemo(() => {
    const m = new Map();
    for (const it of onList) {
      const sec = it.section && SHOPPING_SECTION_EMOJI[it.section] ? it.section : "Other";
      if (!m.has(sec)) m.set(sec, []);
      m.get(sec).push(it);
    }
    return m;
  }, [onList]);
  const remaining = onList.filter((it) => !it.checked).length;
  const done = onList.filter((it) => it.checked).length;
  const [showDeclined, setShowDeclined] = useState(false);
  const [decliningId, setDecliningId] = useState(null);
  const [declineReasonDraft, setDeclineReasonDraft] = useState("");
  const submit = (e) => {
    e?.preventDefault?.();
    addShoppingItem(draft, "", { brand: draftBrand, listName: activeListKey });
    setDraft("");
    setDraftBrand("");
    setShowSmartSuggestions(true);
  };
  // One-tap quick-add from favorites / suggestions: pulls the saved
  // brand pref along so Krissie gets "Jif" not generic peanut butter.
  const quickAdd = (entry) => {
    addShoppingItem(entry.title, "", { brand: entry.brand || "", listName: activeListKey });
    setDraft("");
    setDraftBrand("");
    setShowSmartSuggestions(true);
  };
  const commitNewList = () => {
    // Chapter 1a — write into family_settings.shoppingLists registry
    // via the pure helper. Collision is ALWAYS surfaced (never silent
    // merge) per Mike's directive. Empty input is rejected silently.
    const raw = (newListName || "").trim();
    if (!raw) return;
    if (!setFamilySettings) {
      // Defensive: if the prop isn't wired (e.g. unit test render),
      // fall back to the legacy in-memory tab switch so we don't crash.
      setActiveList(raw.slice(0, 24));
      setNewListEditing(false);
      setNewListName("");
      setCommitListCollision(null);
      return;
    }
    const result = shoppingSettingsAfterCreateList(familySettings, raw);
    if (result.error === "collision") {
      // 1c — store the EXISTING entry (not just a string) so the inline
      // error row can render a one-tap "Switch to <Name>" button.
      // case-insensitive normalize means "costco" / "COSTCO" / "Costco"
      // all land here pointing at the same existing entry.
      setCommitListCollision(result.existing);
      return;
    }
    if (result.error === "empty") {
      setCommitListCollision(null);
      return;
    }
    // 1b — single-shot family_settings write: the new registry entry
    // AND lastActiveListKey both land in one update so a hard refresh
    // immediately after creating Costco lands back on Costco.
    const settingsWithActive = shoppingSettingsAfterSetActive(
      result.settings,
      result.key
    );
    setFamilySettings(() => settingsWithActive);
    // The display name preserves the family's chosen casing; key is
    // what storage uses. activeList stays a string for backward compat
    // with the rest of the component; activeListKey re-derives.
    const created = result.settings.shoppingLists.find((e) => e.key === result.key);
    setActiveList(created?.name || raw.slice(0, 24));
    setNewListEditing(false);
    setNewListName("");
    setCommitListCollision(null);
  };

  // 1c — close the collision loop in place. Switches active list to
  // the existing entry (via the 1b persistence path) and clears the
  // create-input state so Krissie's done in one tap.
  const switchToExisting = (entry) => {
    if (!entry || !entry.name) return;
    setActiveAndPersist(entry.name);
    setCommitListCollision(null);
    setNewListEditing(false);
    setNewListName("");
  };

  // 1d — rename + delete + manual reorder UI state. The sheet is a
  // single modal that handles all three; each row has its own
  // edit-mode toggle for inline rename, plus up/down move buttons,
  // plus a delete confirm. Merge-on-collision is also handled
  // inside the sheet via the renameMergePrompt state.
  const [manageOpen, setManageOpen] = useState(false);
  const [renamingKey, setRenamingKey] = useState(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [renameMergePrompt, setRenameMergePrompt] = useState(null);
  const [deleteConfirmKey, setDeleteConfirmKey] = useState(null);

  // 2026-06-17 persistent multi-delete with undo
  // (see docs/SHOPPING-PERSISTENT-MULTI-DELETE-PLAN.md).
  //
  // Tapping the X on an item soft-deletes it: deletedAt is set in
  // the DB via updateShoppingItem (synced through the existing
  // shopping_items roundtrip). The item disappears from the active
  // list and appears in a "Recently removed · N" collapsible
  // section at the bottom, per-list scoped, persistent across
  // navigation AND across full reloads. There is no transient
  // toast, no timer, no auto-purge — items stay in the bin
  // indefinitely until the user explicitly picks Undo (resurrect)
  // or Remove all (hard-purge, behind a confirm modal). That's
  // the only "I mean it" moment in the flow.
  //
  // Reload survives by design: DataProvider already loads all rows
  // regardless of deletedAt. The transform pair carries deletedAt
  // through. On next mount, removedItems memo derives the bin from
  // the same source array listItems filters from — opposite filters,
  // same data. No in-memory state to lose.
  const [removedExpanded, setRemovedExpanded] = useState(false);
  const [removeAllConfirmOpen, setRemoveAllConfirmOpen] = useState(false);

  const softDeleteShoppingItem = (it) => {
    if (!it || !it.id) return;
    if (!updateShoppingItem) {
      // Defensive — no updater wired (unit-test render). Fall back
      // to the legacy hard-delete so the X still does something
      // visible. The recovery semantics don't apply in this path,
      // but recovery isn't reachable without setFamilySettings /
      // updateShoppingItem anyway.
      removeShoppingItem(it.id);
      return;
    }
    updateShoppingItem(it.id, {
      deletedAt: new Date().toISOString(),
      deletedBy: user?.id || null,
    });
  };

  const closeManage = () => {
    setManageOpen(false);
    setRenamingKey(null);
    setRenameDraft("");
    setRenameMergePrompt(null);
    setDeleteConfirmKey(null);
  };

  const startRename = (entry) => {
    setRenamingKey(entry.key);
    setRenameDraft(entry.name);
    setRenameMergePrompt(null);
  };

  const commitRename = (entry) => {
    if (!setFamilySettings) return;
    const result = shoppingSettingsAfterRename(familySettings, entry.key, renameDraft);
    if (result.error === "empty") {
      // No-op silently; keep editor open
      return;
    }
    if (result.error === "not_found") {
      // Entry vanished; bail out
      setRenamingKey(null);
      setRenameDraft("");
      return;
    }
    if (result.error === "collision") {
      // ALWAYS prompt the merge per Mike's directive — never silent.
      setRenameMergePrompt({
        fromEntry: result.oldEntry,
        toEntry: result.existing,
      });
      return;
    }
    setFamilySettings(() => result.settings);
    // Real rename → batch-relabel items from old key to new key so
    // shopping_items.list_name follows the entry. Casing-only rename
    // → items keep their existing list_name (storage key didn't move).
    if (!result.casingOnly && relabelShoppingItemsByListKey) {
      relabelShoppingItemsByListKey(entry.key, result.newKey);
    }
    // If the renamed entry was the active tab, update local activeList
    // display name so the visible label stays in sync without a refresh.
    if (activeListKey === entry.key) {
      setActiveList(renameDraft.trim().slice(0, 24));
    }
    setRenamingKey(null);
    setRenameDraft("");
  };

  const confirmMerge = () => {
    if (!renameMergePrompt || !setFamilySettings) return;
    const { fromEntry, toEntry } = renameMergePrompt;
    const result = shoppingSettingsAfterMerge(familySettings, fromEntry.key, toEntry.key);
    if (result.error) {
      setRenameMergePrompt(null);
      return;
    }
    setFamilySettings(() => result.settings);
    if (relabelShoppingItemsByListKey) {
      relabelShoppingItemsByListKey(fromEntry.key, toEntry.key);
    }
    // If the active tab was the from-list, follow the merge.
    if (activeListKey === fromEntry.key) {
      setActiveList(toEntry.name);
    }
    setRenameMergePrompt(null);
    setRenamingKey(null);
    setRenameDraft("");
  };

  const cancelMerge = () => {
    setRenameMergePrompt(null);
    // Leave rename editor open so Krissie can pick a different name.
  };

  const commitDelete = (entry) => {
    if (!setFamilySettings) return;
    const result = shoppingSettingsAfterDelete(familySettings, entry.key);
    if (result.error) {
      // last_remaining shouldn't reach here because the UI hides
      // delete in that case, but guard anyway.
      setDeleteConfirmKey(null);
      return;
    }
    setFamilySettings(() => result.settings);
    if (relabelShoppingItemsByListKey) {
      relabelShoppingItemsByListKey(entry.key, result.fallbackKey);
    }
    if (activeListKey === entry.key) {
      // Follow to the fallback list's display name.
      const fallbackEntry = result.settings.shoppingLists.find((e) => e.key === result.fallbackKey);
      if (fallbackEntry) setActiveList(fallbackEntry.name);
    }
    setDeleteConfirmKey(null);
  };

  const moveListBy = (currentOrderedKeys, key, delta) => {
    const idx = currentOrderedKeys.indexOf(key);
    if (idx < 0) return;
    const newIdx = idx + delta;
    if (newIdx < 0 || newIdx >= currentOrderedKeys.length) return;
    const next = currentOrderedKeys.slice();
    next.splice(idx, 1);
    next.splice(newIdx, 0, key);
    if (!setFamilySettings) return;
    const result = shoppingSettingsAfterReorder(familySettings, next);
    setFamilySettings(() => result.settings);
  };
  const finishEdit = () => {
    if (editingId) {
      const patch = {};
      if (editDraft.trim()) patch.title = editDraft.trim();
      patch.brand = (editBrandDraft || "").trim();
      if (editSectionDraft) patch.section = editSectionDraft;
      if (updateShoppingItem) updateShoppingItem(editingId, patch);
      else if (patch.title) renameShoppingItem(editingId, patch.title);
    }
    setEditingId(null);
    setEditDraft("");
    setEditBrandDraft("");
    setEditSectionDraft("");
  };
  const findName = (pid) => users.find((u) => u.id === pid)?.name;
  return (
    <>
      {/* Chapter 1a list-selector tabs. Reads from the family_settings
          registry (lastUsedAt desc → createdAt desc → name asc) so every
          named list shows even with zero items — empty-list survival.
          Pill badge is the unchecked count, or a small dot when empty.
          Rename / delete are 1d (not in this commit). */}
      <div className="flex items-center gap-1.5 mb-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {availableLists.map((entry) => {
          const isActive = activeListKey === entry.key;
          const tally = listCounts.get(entry.key);
          const unchecked = tally?.unchecked ?? 0;
          return (
            <button
              key={entry.key}
              type="button"
              onClick={() => { setActiveAndPersist(entry.name); setCommitListCollision(null); }}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${isActive ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"}`}
            >
              <span>{entry.name}</span>
              {unchecked > 0 ? (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? "bg-white/25 text-white" : "bg-slate-200 text-slate-500"}`}>
                  {unchecked}
                </span>
              ) : (
                <span className={`text-[10px] ${isActive ? "text-white/60" : "text-slate-400"}`} aria-label="empty list">·</span>
              )}
            </button>
          );
        })}
        {!newListEditing ? (
          <button
            type="button"
            onClick={() => { setNewListEditing(true); setNewListName(""); setCommitListCollision(null); }}
            className="shrink-0 px-3 py-1.5 rounded-full text-xs font-bold bg-slate-50 text-slate-500 border border-dashed border-slate-300"
          >
            + New list
          </button>
        ) : (
          <span className="shrink-0 flex items-center gap-1">
            <input
              value={newListName}
              onChange={(e) => { setNewListName(e.target.value); setCommitListCollision(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") commitNewList(); if (e.key === "Escape") { setNewListEditing(false); setNewListName(""); setCommitListCollision(null); } }}
              placeholder="Costco, Target…"
              autoFocus
              className="border border-indigo-200 rounded-full px-2.5 py-1 text-xs font-bold w-32"
            />
            <button onClick={commitNewList} disabled={!newListName.trim()} className={`px-2 py-1 rounded-full text-[10px] font-bold ${newListName.trim() ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-400"}`}>Go</button>
            <button onClick={() => { setNewListEditing(false); setNewListName(""); setCommitListCollision(null); }} className="px-1 text-[10px] font-bold text-slate-400">Cancel</button>
          </span>
        )}
        {/* 1d — Manage button opens the rename / delete / reorder sheet.
            Only shown when the family has any registered list (which is
            always true after readRegistry's grocery seed). */}
        {availableLists.length > 0 ? (
          <button
            type="button"
            onClick={() => setManageOpen(true)}
            aria-label="Manage lists"
            className="shrink-0 px-2.5 py-1.5 rounded-full text-xs font-bold bg-slate-50 text-slate-500 border border-dashed border-slate-300"
          >
            ⋯
          </button>
        ) : null}
      </div>
      {commitListCollision ? (
        <div className="mb-2 px-1 text-[11px] font-semibold text-rose-600 flex items-center gap-2 flex-wrap">
          <span>"{commitListCollision.name}" already exists.</span>
          <button
            type="button"
            onClick={() => switchToExisting(commitListCollision)}
            className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold"
          >
            Switch to {commitListCollision.name}
          </button>
        </div>
      ) : null}

      {/* 1d — Manage lists sheet. Modal overlay with one row per list:
          up/down move buttons (manual reorder overrides recency default),
          inline rename, delete (hidden when only one list remains). */}
      {manageOpen ? (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-3"
          onClick={(e) => { if (e.target === e.currentTarget) closeManage(); }}
        >
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="text-base font-extrabold text-slate-800">Manage lists</div>
              <button
                type="button"
                onClick={closeManage}
                className="px-3 py-1 rounded-full bg-indigo-600 text-white text-xs font-bold"
              >
                Done
              </button>
            </div>
            <div className="text-[11px] text-slate-400 mb-3">
              Drag-free for now: ↑ / ↓ move a list. Manual order sticks until you reset it.
            </div>
            <div className="flex flex-col gap-2">
              {availableLists.map((entry, idx) => {
                const tally = listCounts.get(entry.key);
                const total = tally?.total ?? 0;
                const isRenaming = renamingKey === entry.key;
                const canDelete = availableLists.length > 1;
                const isFirst = idx === 0;
                const isLast = idx === availableLists.length - 1;
                const orderedKeys = availableLists.map((e) => e.key);
                return (
                  <div key={entry.key} className="rounded-xl bg-slate-50 border border-slate-200 p-2 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={() => moveListBy(orderedKeys, entry.key, -1)}
                          disabled={isFirst}
                          aria-label="Move up"
                          className={`w-7 h-5 rounded text-[10px] font-bold ${isFirst ? "bg-slate-100 text-slate-300" : "bg-slate-200 text-slate-600"}`}
                        >▲</button>
                        <button
                          type="button"
                          onClick={() => moveListBy(orderedKeys, entry.key, 1)}
                          disabled={isLast}
                          aria-label="Move down"
                          className={`w-7 h-5 rounded text-[10px] font-bold ${isLast ? "bg-slate-100 text-slate-300" : "bg-slate-200 text-slate-600"}`}
                        >▼</button>
                      </div>
                      {isRenaming ? (
                        <input
                          autoFocus
                          value={renameDraft}
                          onChange={(e) => setRenameDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitRename(entry);
                            if (e.key === "Escape") { setRenamingKey(null); setRenameDraft(""); setRenameMergePrompt(null); }
                          }}
                          maxLength={24}
                          className="flex-1 border border-indigo-300 rounded-lg px-2 py-1 text-sm font-bold"
                        />
                      ) : (
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-slate-800 truncate">{entry.name}</div>
                          <div className="text-[10px] text-slate-400">{total} item{total === 1 ? "" : "s"}</div>
                        </div>
                      )}
                      {isRenaming ? (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button onClick={() => commitRename(entry)} disabled={!renameDraft.trim()} className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${renameDraft.trim() ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-400"}`}>Save</button>
                          <button onClick={() => { setRenamingKey(null); setRenameDraft(""); setRenameMergePrompt(null); }} className="px-1.5 text-[10px] font-bold text-slate-400">Cancel</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button onClick={() => startRename(entry)} className="px-2.5 py-1 rounded-full bg-white border border-slate-300 text-slate-600 text-[10px] font-bold">Rename</button>
                          {canDelete ? (
                            <button onClick={() => setDeleteConfirmKey(entry.key)} className="px-2.5 py-1 rounded-full bg-white border border-rose-300 text-rose-600 text-[10px] font-bold">Delete</button>
                          ) : null}
                        </div>
                      )}
                    </div>
                    {isRenaming && renameMergePrompt && renameMergePrompt.fromEntry.key === entry.key ? (
                      <div className="rounded-lg bg-amber-50 border border-amber-200 p-2 text-[11px] text-amber-900">
                        <div className="font-bold mb-1">"{renameMergePrompt.toEntry.name}" already exists.</div>
                        <div className="mb-2">
                          Move everything from "{renameMergePrompt.fromEntry.name}" into "{renameMergePrompt.toEntry.name}"?
                          Items keep their check state.
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={confirmMerge} className="px-3 py-1 rounded-full bg-amber-600 text-white text-[10px] font-bold">
                            Merge into {renameMergePrompt.toEntry.name}
                          </button>
                          <button onClick={cancelMerge} className="px-3 py-1 rounded-full bg-white border border-amber-300 text-amber-700 text-[10px] font-bold">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : null}
                    {deleteConfirmKey === entry.key ? (
                      <div className="rounded-lg bg-rose-50 border border-rose-200 p-2 text-[11px] text-rose-900">
                        <div className="font-bold mb-1">Delete "{entry.name}"?</div>
                        <div className="mb-2">
                          {total > 0
                            ? `Its ${total} item${total === 1 ? "" : "s"} will move to ${(availableLists.find((e) => e.key === SHOPPING_DEFAULT_LIST_KEY) || availableLists.find((e) => e.key !== entry.key))?.name || "Grocery"}.`
                            : "It's empty — nothing to move."}
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => commitDelete(entry)} className="px-3 py-1 rounded-full bg-rose-600 text-white text-[10px] font-bold">
                            Delete
                          </button>
                          <button onClick={() => setDeleteConfirmKey(null)} className="px-3 py-1 rounded-full bg-white border border-rose-300 text-rose-700 text-[10px] font-bold">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {/* 🔁 Maybe running low — items past their usual restock cadence
          based on this family's own history. Pure client-side smarts;
          gets sharper each week as the data grows. Tap a chip → adds
          to the list with the saved brand pref carried through. */}
      {restockSuggestions.length > 0 && (
        <div className="mb-2">
          <div className="text-[10px] uppercase tracking-wider font-bold text-rose-500 mb-1.5 px-1">🔁 Maybe running low</div>
          <div className="flex flex-wrap gap-1.5">
            {restockSuggestions.map((s) => (
              <button
                key={s.title}
                type="button"
                onClick={() => quickAdd(s)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-800 font-bold text-xs active:scale-95"
                title={`Usually added every ~${s.cadenceDays} days · last added ${s.sinceLastDays}d ago`}
              >
                + {s.title}
                {s.brand && <span className="text-[10px] font-medium text-rose-600">· {s.brand}</span>}
                <span className="text-[10px] font-medium text-rose-500/70">{s.sinceLastDays}d</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ⭐ Quick add — favorites from your own history (added 2+ times).
          Brand pref carries over, so tapping "Cheerios" adds with
          "Honey Nut Cheerios" as the brand if that's what you bought
          last time. */}
      {favorites.length > 0 && (
        <div className="mb-2">
          <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1.5 px-1">⭐ Quick add</div>
          <div className="flex flex-wrap gap-1.5">
            {favorites.map((f) => (
              <button
                key={f.title}
                type="button"
                onClick={() => quickAdd(f)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-bold text-xs active:scale-95"
              >
                + {f.title}
                {f.brand && <span className="text-[10px] font-medium text-amber-600">· {f.brand}</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={submit} className="mb-2">
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => { setDraft(e.target.value); setShowSmartSuggestions(true); }}
            onFocus={() => setShowSmartSuggestions(true)}
            placeholder="Add something to buy…"
            autoFocus
            className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-base font-semibold"
          />
          <button type="submit" disabled={!draft.trim()} className={`px-4 rounded-xl font-bold text-sm text-white ${draft.trim() ? "bg-indigo-600 active:scale-95" : "bg-slate-300"}`}>
            Add
          </button>
        </div>
        {/* Brand subfield slides in once you've typed something. */}
        {draft.trim() && (
          <input
            value={draftBrand}
            onChange={(e) => setDraftBrand(e.target.value)}
            placeholder="Brand (optional) — e.g. Jif, Honey Nut Cheerios"
            className="w-full mt-1.5 border border-slate-200 rounded-xl px-3 py-2 text-sm"
          />
        )}
        {/* Fuzzy suggestions from history matching the draft. */}
        {suggestions.length > 0 && (
          <div className="mt-1.5 rounded-xl border border-slate-100 bg-slate-50 p-1.5">
            <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500 px-1.5 mb-1">From your history</div>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <button
                  key={s.title}
                  type="button"
                  onClick={() => quickAdd(s)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-700 active:scale-95"
                >
                  + {s.title}
                  {s.brand && <span className="text-[10px] font-medium text-slate-500">· {s.brand}</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </form>

      {/* RS-1 Commit B: kind-chooser sheet entry point. Replaces the
          prior 2-button grid (list/product). Receipt is the third
          kind; its tile mounts ReceiptScanner.jsx (currently a stub).
          Scales as more kinds arrive without crowding the scan area. */}
      <button
        type="button"
        onClick={() => setChooserOpen(true)}
        className="w-full py-2 mb-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[12px] inline-flex items-center justify-center gap-1.5 active:scale-[0.99]"
      >
        📷 Scan
      </button>

      {chooserOpen && (
        <div
          className="fixed inset-0 z-40 flex items-end"
          onClick={() => setChooserOpen(false)}
        >
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="relative w-full bg-white rounded-t-2xl p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center font-bold text-sm mb-3 text-slate-700">Scan to add</div>
            <div className="space-y-2">
              <label className="block">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => { setChooserOpen(false); setScanKind("shopping_list"); onScanFile(e); }}
                  className="hidden"
                />
                <div className="cursor-pointer active:scale-[0.99] p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-3">
                  <div className="text-2xl">📝</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-amber-800">A written list</div>
                    <div className="text-[11px] text-amber-700">Handwritten or typed shopping list</div>
                  </div>
                </div>
              </label>
              <label className="block">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => { setChooserOpen(false); setScanKind("shopping_product"); onScanFile(e); }}
                  className="hidden"
                />
                <div className="cursor-pointer active:scale-[0.99] p-3 rounded-xl bg-violet-50 border border-violet-200 flex items-center gap-3">
                  <div className="text-2xl">📦</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-violet-800">A product</div>
                    <div className="text-[11px] text-violet-700">Scan the barcode, or photograph the front of the product</div>
                  </div>
                </div>
              </label>
              <button
                type="button"
                onClick={() => { setChooserOpen(false); setReceiptScannerOpen(true); }}
                className="w-full cursor-pointer active:scale-[0.99] p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-left"
              >
                <div className="text-2xl">🧾</div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-emerald-800">A receipt</div>
                  <div className="text-[11px] text-emerald-700">Capture what was bought, where, and how much</div>
                </div>
              </button>
            </div>
            <button
              type="button"
              onClick={() => setChooserOpen(false)}
              className="w-full mt-3 py-2 rounded-xl bg-slate-100 text-slate-500 font-bold text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Receipt scanner — the real review UI (RS-1 next brick).
          Capture → upload → parse via /api/vision-parse kind=receipt
          → review (editable header + line items + fuzzy auto-match
          chips against active shopping_items + "Review these" sticky
          for unmatched) → commit one receipts row carrying the full
          ocr_raw promotion contract for RS-2. */}
      {receiptScannerOpen && (
        <ReceiptScanner
          onClose={() => setReceiptScannerOpen(false)}
          activeListKey={activeListKey}
          addReceipt={addReceipt}
          familyId={familyId}
          shoppingItems={shoppingItems}
          fuzzyMatch={fuzzyMatch}
        />
      )}

      {scanning && (
        <Card className="p-3 mb-3 bg-slate-50 text-center">
          <div className="text-[12px] text-slate-500">Reading the list…</div>
        </Card>
      )}
      {scanError && !scanResults && (
        <Card className="p-3 mb-3 bg-rose-50 border-rose-200">
          <div className="text-[12px] text-rose-700">{scanError}</div>
        </Card>
      )}
      {scanResults && (
        <Card className="p-3 mb-3 bg-amber-50 border-amber-200">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] uppercase tracking-wider font-bold text-amber-700">Found {scanResults.items.length} item{scanResults.items.length === 1 ? "" : "s"}</div>
            <button onClick={() => setScanResults(null)} className="text-[11px] font-bold text-slate-500">Cancel</button>
          </div>
          <div className="text-[11px] text-amber-700 mb-2">Tap to uncheck anything you don't want, or edit a name inline.</div>
          {scanResults.items.map((it, i) => (
            <div key={i} className="flex items-center gap-2 mb-1.5 last:mb-0">
              <button
                onClick={() => togglePicked(i)}
                className={`w-6 h-6 rounded-full grid place-items-center shrink-0 transition active:scale-90 ${it.picked ? "bg-emerald-500 text-white" : "border-2 border-slate-200 bg-white"}`}
              >
                {it.picked && <Check size={13} />}
              </button>
              <div className="flex-1 min-w-0">
                <input
                  value={it.title}
                  onChange={(e) => renameScan(i, e.target.value)}
                  className={`w-full border border-slate-200 rounded-lg px-2 py-1 text-sm bg-white ${it.picked ? "text-slate-800" : "text-slate-400 line-through"}`}
                />
                {it.brand && <div className="text-[10px] text-amber-700 font-bold mt-0.5 px-1">brand: {it.brand}</div>}
              </div>
            </div>
          ))}
          <button
            onClick={commitScan}
            disabled={scanResults.items.filter((it) => it.picked).length === 0}
            className={`w-full mt-2 py-2.5 rounded-xl font-bold text-sm text-white ${scanResults.items.filter((it) => it.picked).length === 0 ? "bg-slate-300" : "bg-indigo-600 active:scale-95"}`}
          >
            Add {scanResults.items.filter((it) => it.picked).length} to list
          </button>
        </Card>
      )}

      {/* Parent-side: pending kid requests */}
      {isParent && pendingRequests.length > 0 && (
        <Card className="p-3 mb-3 bg-amber-50 border border-amber-200">
          <div className="text-[11px] uppercase tracking-wider font-bold text-amber-700 mb-2">⭐ Pending requests · {pendingRequests.length}</div>
          {pendingRequests.map((it) => (
            <div key={it.id} className="bg-white border border-amber-100 rounded-xl p-2.5 mb-2 last:mb-0">
              <div className="font-bold text-sm">{it.title}</div>
              {it.brand && <div className="text-[10px] text-slate-500">brand: {it.brand}</div>}
              {it.addedBy && findName(it.addedBy) && (
                <div className="text-[10px] text-slate-400">from {findName(it.addedBy)}</div>
              )}
              {decliningId === it.id ? (
                <div className="mt-2">
                  <input
                    value={declineReasonDraft}
                    onChange={(e) => setDeclineReasonDraft(e.target.value)}
                    placeholder="Optional: short reason (e.g. 'not this week')"
                    className="w-full border border-slate-200 rounded-lg px-2 py-1 text-sm mb-2"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => { setDecliningId(null); setDeclineReasonDraft(""); }} className="flex-1 py-1.5 rounded-lg bg-slate-100 text-slate-500 font-bold text-xs">Cancel</button>
                    <button onClick={() => { decideShoppingRequest(it.id, "declined", declineReasonDraft); setDecliningId(null); setDeclineReasonDraft(""); }} className="flex-1 py-1.5 rounded-lg bg-rose-600 text-white font-bold text-xs">Decline</button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 mt-2">
                  <button onClick={() => { setDecliningId(it.id); setDeclineReasonDraft(""); }} className="flex-1 py-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 font-bold text-xs">Decline</button>
                  <button onClick={() => decideShoppingRequest(it.id, "approved")} className="flex-1 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs">Approve</button>
                </div>
              )}
            </div>
          ))}
        </Card>
      )}

      {/* Kid-side: their own pending requests */}
      {isKid && pendingRequests.filter((it) => it.addedBy === user?.id).length > 0 && (
        <Card className="p-3 mb-3 bg-amber-50 border border-amber-200">
          <div className="text-[11px] uppercase tracking-wider font-bold text-amber-700 mb-2">⭐ Waiting for mom or dad</div>
          {pendingRequests.filter((it) => it.addedBy === user?.id).map((it) => (
            <div key={it.id} className="bg-white border border-amber-100 rounded-xl p-2.5 mb-2 last:mb-0">
              <div className="font-bold text-sm">{it.title}</div>
              {it.brand && <div className="text-[10px] text-slate-500">brand: {it.brand}</div>}
              <button onClick={() => removeShoppingItem(it.id)} className="text-[10px] font-bold text-slate-400 mt-1">Cancel</button>
            </div>
          ))}
        </Card>
      )}

      {onList.length > 0 && (
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="text-[11px] uppercase tracking-wider font-bold text-slate-500">
            {remaining} to buy {done > 0 && <span className="text-slate-300 font-medium normal-case"> · {done} done</span>}
          </div>
          {done > 0 && isParent && (
            <button onClick={() => { if (confirm(`Clear ${done} bought item${done === 1 ? "" : "s"}?`)) clearCheckedShoppingItems(); }} className="text-[11px] font-bold text-rose-600 active:scale-95">
              Clear bought
            </button>
          )}
        </div>
      )}

      {onList.length === 0 && pendingRequests.length === 0 ? (
        <Card className="p-6 text-center text-sm text-slate-400">
          List is empty. Add the first thing above.
        </Card>
      ) : (
        SHOPPING_SECTION_ORDER.filter((sec) => onListBySection.has(sec)).map((sec) => (
          <div key={sec} className="mb-3">
            <div className="flex items-center gap-1.5 mb-1.5 px-1">
              <span className="text-base leading-none">{SHOPPING_SECTION_EMOJI[sec]}</span>
              <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500">{sec}</span>
              <span className="text-[10px] text-slate-300 font-medium">· {onListBySection.get(sec).length}</span>
            </div>
            {onListBySection.get(sec).map((it) => (
              <div
                key={it.id}
                className={`flex items-center gap-2 p-3 mb-1.5 rounded-xl border ${it.checked ? "bg-slate-50 border-slate-100" : "bg-white border-slate-100"}`}
              >
                <button
                  onClick={() => toggleShoppingItem(it.id)}
                  aria-label={it.checked ? "Uncheck" : "Check"}
                  className={`w-7 h-7 rounded-full grid place-items-center shrink-0 transition active:scale-90 ${it.checked ? "bg-emerald-500 text-white" : "border-2 border-slate-200"}`}
                >
                  {it.checked && <Check size={15} />}
                </button>
                <div className="flex-1 min-w-0">
                  {editingId === it.id ? (
                    <div>
                      <input
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") finishEdit(); if (e.key === "Escape") { setEditingId(null); setEditDraft(""); setEditBrandDraft(""); setEditSectionDraft(""); } }}
                        autoFocus
                        className="w-full border border-indigo-200 rounded-lg px-2 py-1 text-sm font-semibold mb-1"
                      />
                      <input
                        value={editBrandDraft}
                        onChange={(e) => setEditBrandDraft(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") finishEdit(); if (e.key === "Escape") { setEditingId(null); setEditDraft(""); setEditBrandDraft(""); setEditSectionDraft(""); } }}
                        placeholder="Brand (optional)"
                        className="w-full border border-indigo-100 rounded-lg px-2 py-1 text-xs mb-1"
                      />
                      <select
                        value={editSectionDraft}
                        onChange={(e) => setEditSectionDraft(e.target.value)}
                        className="w-full border border-indigo-100 rounded-lg px-2 py-1 text-xs bg-white"
                      >
                        {SHOPPING_SECTION_ORDER.map((sname) => (
                          <option key={sname} value={sname}>{SHOPPING_SECTION_EMOJI[sname]} {sname}</option>
                        ))}
                      </select>
                      <div className="flex gap-1.5 mt-1">
                        <button type="button" onClick={() => { setEditingId(null); setEditDraft(""); setEditBrandDraft(""); setEditSectionDraft(""); }} className="text-[10px] font-bold text-slate-400 px-1.5 py-0.5">Cancel</button>
                        <div className="flex-1" />
                        <button type="button" onClick={finishEdit} className="text-[10px] font-bold text-indigo-600 px-1.5 py-0.5">Save</button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditingId(it.id); setEditDraft(it.title || ""); setEditBrandDraft(it.brand || ""); setEditSectionDraft(it.section || classifyShoppingItem(it.title)); }}
                      className={`text-left w-full font-semibold text-sm leading-snug ${it.checked ? "line-through text-slate-400" : "text-slate-800"}`}
                    >
                      {it.title}
                    </button>
                  )}
                  {editingId !== it.id && it.brand && (
                    <div className="text-[10px] text-amber-700 font-bold">{it.brand}</div>
                  )}
                  {editingId !== it.id && it.checked && it.checkedBy && findName(it.checkedBy) && (
                    <div className="text-[10px] text-slate-400">✓ by {findName(it.checkedBy)}</div>
                  )}
                  {editingId !== it.id && !it.checked && it.addedBy && findName(it.addedBy) && (
                    <div className="text-[10px] text-slate-400">added by {findName(it.addedBy)}</div>
                  )}
                </div>
                {/* feedback_kids_never_delete.md: destructive buttons
                    must be hidden for role==="kid". The bin is
                    recoverable but the action is still "remove this
                    from the list" intent — kid sees no X. v2 may
                    route this through a request-removal approval
                    flow; v1 hides. */}
                {!isKid && (
                  <button
                    onClick={() => softDeleteShoppingItem(it)}
                    className="text-slate-300 active:scale-90 p-1 shrink-0"
                    aria-label="Remove"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        ))
      )}

      {/* Declined kid requests — collapsed by default to keep the list clean. */}
      {declined.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowDeclined((s) => !s)}
            className="w-full flex items-center justify-between text-[11px] uppercase tracking-wider font-bold text-slate-400 mb-2 px-1"
          >
            <span>{showDeclined ? "▾" : "▸"} Not this week · {declined.length}</span>
          </button>
          {showDeclined && declined.map((it) => (
            <div key={it.id} className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 mb-1.5">
              <div className="font-semibold text-sm text-slate-500 line-through">{it.title}</div>
              {it.declineReason && <div className="text-[11px] text-slate-500 italic mt-0.5">{it.declineReason}</div>}
              <div className="flex items-center justify-between mt-1">
                <div className="text-[10px] text-slate-400">
                  {it.addedBy && findName(it.addedBy) ? `from ${findName(it.addedBy)}` : ""}
                  {it.decidedBy && findName(it.decidedBy) ? ` · declined by ${findName(it.decidedBy)}` : ""}
                </div>
                <button onClick={() => removeShoppingItem(it.id)} className="text-[10px] font-bold text-slate-400">Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 2026-06-17 persistent multi-delete bin. Per-list scoped,
          collapsible at the bottom of the active list. Tap-X moves
          here. Survives navigation and reload (it's just data: rows
          where deletedAt is set). Per-item Undo restores; Undo all
          empties the bin back into the list; Remove all hard-purges
          behind a confirm modal — the only "I mean it" action.
          Lives BELOW "Not this week" per Mike: least-urgent at the
          bottom. Rose token (existing destructive accent). */}
      {removedItems.length > 0 && (
        <div className="mt-4 rounded-xl bg-rose-50/30 border-l-4 border-rose-500 border-y border-r border-rose-100 overflow-hidden">
          <div className="w-full flex items-center justify-between px-3 py-2 gap-2">
            <button
              type="button"
              onClick={() => setRemovedExpanded((v) => !v)}
              className="flex-1 flex items-center gap-2 text-left"
              aria-expanded={removedExpanded}
            >
              <span className="text-sm font-bold text-rose-700">
                🗑️ Recently removed · {removedItems.length}
              </span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (!updateShoppingItem) return;
                for (const it of removedItems) {
                  updateShoppingItem(it.id, { deletedAt: null, deletedBy: null });
                }
              }}
              className="shrink-0 text-[11px] font-bold text-rose-600 bg-white border border-rose-200 rounded-full px-2.5 py-1 active:scale-95"
            >
              Undo all
            </button>
            <button
              type="button"
              onClick={() => setRemovedExpanded((v) => !v)}
              className="shrink-0 text-rose-400 text-xs px-1"
              aria-label={removedExpanded ? "Collapse" : "Expand"}
            >
              {removedExpanded ? "▴" : "▾"}
            </button>
          </div>
          {removedExpanded && (
            <div className="px-3 pb-3 flex flex-col gap-1.5">
              {removedItems.map((it) => (
                <div
                  key={it.id}
                  className="flex items-center justify-between bg-white rounded-lg border border-rose-100 px-2.5 py-1.5"
                >
                  <div className="min-w-0 flex-1 mr-2">
                    <div className="text-sm text-slate-700 truncate">{it.title}</div>
                    {it.section ? (
                      <div className="text-[10px] text-slate-400">{it.section}</div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!updateShoppingItem) return;
                      updateShoppingItem(it.id, { deletedAt: null, deletedBy: null });
                    }}
                    className="shrink-0 text-[11px] font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full active:scale-95"
                  >
                    Undo
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setRemoveAllConfirmOpen(true)}
                className="mt-1 mx-auto px-3 py-1.5 rounded-full bg-rose-600 text-white text-[11px] font-bold active:scale-95"
              >
                Remove all {removedItems.length}
              </button>
            </div>
          )}
        </div>
      )}

      {/* 2026-06-17 remove-all confirm modal. The only path that
          hard-purges items from the bin. Copy is Mike's tightened
          version: "Permanently remove N items? This can't be
          undone." */}
      {removeAllConfirmOpen ? (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-3"
          onClick={(e) => { if (e.target === e.currentTarget) setRemoveAllConfirmOpen(false); }}
        >
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-4">
            <div className="text-base font-extrabold text-slate-800 mb-2">
              Permanently remove {removedItems.length} item{removedItems.length === 1 ? "" : "s"}?
            </div>
            <div className="text-sm text-slate-600 mb-4">
              This can't be undone.
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRemoveAllConfirmOpen(false)}
                className="px-3 py-1.5 rounded-full border border-slate-300 text-slate-600 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  for (const it of removedItems) removeShoppingItem(it.id);
                  setRemoveAllConfirmOpen(false);
                  setRemovedExpanded(false);
                }}
                className="px-3 py-1.5 rounded-full bg-rose-600 text-white text-xs font-bold active:scale-95"
              >
                Remove all
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

// Practice Timer — Modacity-style. Pick an activity, tap Start, the
// timer counts up. Optionally tap "Record 30s" to capture a clip
// (browser MediaRecorder + Supabase upload). Tap Stop to save the
// session. Past sessions list below; tap a clip to listen back.
function PracticeSessionRow({ s, activities, removePracticeSession }) {
  const a = (activities || []).find((x) => x.id === s.activityId);
  const audio = useSignedUrl(s.audioPath);
  const date = new Date(s.startedAt || s.createdAt);
  const dateLabel = date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " · " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const mins = Math.floor((s.durationSeconds || 0) / 60);
  const secs = (s.durationSeconds || 0) % 60;
  return (
    <Card className="p-3 mb-2">
      <div className="flex items-start gap-2">
        <div className="w-1.5 self-stretch rounded-full shrink-0" style={{ background: a?.color || "#6366f1", minHeight: "2rem" }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <div className="font-bold text-sm flex-1 truncate">{a?.name || "Practice"}</div>
            <div className="text-[11px] font-bold text-slate-600 shrink-0 tabular-nums">{mins}m {String(secs).padStart(2, "0")}s</div>
          </div>
          <div className="text-[11px] text-slate-400">{dateLabel}</div>
          {s.notes && <div className="text-[11px] text-slate-500 mt-1 leading-snug">{s.notes}</div>}
          {s.audioPath && audio.url && (
            <audio controls preload="none" src={audio.url} className="w-full mt-2" />
          )}
          {s.audioPath && !audio.url && (
            <div className="text-[10px] text-slate-300 mt-1">loading clip…</div>
          )}
        </div>
        <button onClick={() => { if (confirm("Remove this session?")) removePracticeSession(s.id); }} className="text-slate-300 active:scale-95 shrink-0 p-1">
          <X size={14} />
        </button>
      </div>
    </Card>
  );
}

function PracticeTimer({ activities = [], practiceSessions = [], addPracticeSession, removePracticeSession, familyId, currentProfileId, users = [] }) {
  // Pre-select drums when Lynch lands here; fall back to first active.
  const drums = activities.find((a) => /drum/i.test(a.name) && a.status === "active");
  const firstActive = activities.find((a) => a.status === "active");
  const initialSession = practiceTimerStore.get();
  const [activityId, setActivityId] = useState(initialSession?.activityId || (drums || firstActive)?.id || "");
  // The store holds the source of truth for "running" + startedAt so
  // the timer keeps ticking when this component unmounts (Mike's app
  // tabs / sub-pages). A floating banner above the content reads the
  // same store so the user always sees the timer is alive.
  const [session, setSession] = useState(initialSession);
  const [now, setNow] = useState(() => Date.now());
  const [notes, setNotes] = useState("");
  const [recState, setRecState] = useState("idle"); // idle | recording | uploading | done | error
  const [recError, setRecError] = useState("");
  const [recBlob, setRecBlob] = useState(null);
  const [recAudioUrl, setRecAudioUrl] = useState(null);
  const [recElapsed, setRecElapsed] = useState(0);
  const recorderRef = useRef(null);
  const recStopperRef = useRef(null);

  const running = !!session;
  const startedAt = session?.startedAt || null;
  const elapsed = running ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0;

  useEffect(() => practiceTimerStore.subscribe((s) => {
    setSession(s);
    if (s?.activityId) setActivityId(s.activityId);
  }), []);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);

  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const start = () => {
    practiceTimerStore.start({
      activityId,
      profileId: (users.find((u) => u.role === "kid")?.id) || currentProfileId || null,
    });
  };

  const stop = async () => {
    const live = practiceTimerStore.get();
    if (!live) return;
    const dur = Math.max(0, Math.floor((Date.now() - live.startedAt) / 1000));
    const startedAtIso = new Date(live.startedAt).toISOString();
    const profileId = live.profileId || (users.find((u) => u.role === "kid")?.id) || currentProfileId || null;
    practiceTimerStore.stop();
    let audioPath = "";
    if (recBlob && familyId) {
      try {
        setRecState("uploading");
        const { path } = await uploadFamilyAudio({ blob: recBlob, familyId, kind: "practice" });
        audioPath = path;
        setRecState("done");
      } catch (e) {
        setRecState("error");
        setRecError(e?.message || String(e));
      }
    }
    addPracticeSession({
      activityId: live.activityId || activityId,
      profileId,
      startedAt: startedAtIso,
      endedAt: new Date().toISOString(),
      durationSeconds: dur,
      audioPath,
      notes: notes.trim(),
    });
    // Reset for the next session
    setNotes("");
    setRecBlob(null);
    if (recAudioUrl) { URL.revokeObjectURL(recAudioUrl); setRecAudioUrl(null); }
    setRecElapsed(0);
    setRecState("idle");
  };

  const cancel = () => {
    if (!confirm("Cancel this practice session? Nothing will be saved.")) return;
    practiceTimerStore.stop();
    setNotes("");
    setRecBlob(null);
    if (recAudioUrl) { URL.revokeObjectURL(recAudioUrl); setRecAudioUrl(null); }
    setRecElapsed(0);
    setRecState("idle");
    try { recorderRef.current?.state === "recording" && recorderRef.current.stop(); } catch (_) {}
    if (recStopperRef.current) { clearInterval(recStopperRef.current); recStopperRef.current = null; }
  };

  const startRecording = async () => {
    if (recState === "recording") return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setRecState("error");
      setRecError("Audio recording isn't supported in this browser.");
      return;
    }
    setRecError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Try a sensible default; some browsers (Safari) reject webm/opus.
      // Letting MediaRecorder pick when no mimeType is supported is
      // the safest fallback.
      let mr;
      const preferred = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
      const supported = preferred.find((m) => MediaRecorder.isTypeSupported?.(m));
      try {
        mr = supported ? new MediaRecorder(stream, { mimeType: supported }) : new MediaRecorder(stream);
      } catch {
        mr = new MediaRecorder(stream);
      }
      const chunks = [];
      mr.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: chunks[0]?.type || "audio/webm" });
        setRecBlob(blob);
        if (recAudioUrl) URL.revokeObjectURL(recAudioUrl);
        setRecAudioUrl(URL.createObjectURL(blob));
        setRecState("done");
      };
      recorderRef.current = mr;
      mr.start();
      setRecState("recording");
      setRecElapsed(0);
      const startMs = Date.now();
      const tick = setInterval(() => {
        const e = Math.floor((Date.now() - startMs) / 1000);
        setRecElapsed(e);
        if (e >= 30) {
          clearInterval(tick);
          try { mr.state === "recording" && mr.stop(); } catch (_) {}
        }
      }, 250);
      recStopperRef.current = tick;
    } catch (e) {
      setRecState("error");
      setRecError(e?.message || "Couldn't access the microphone.");
    }
  };

  const stopRecording = () => {
    if (recState !== "recording") return;
    try { recorderRef.current?.stop(); } catch (_) {}
    if (recStopperRef.current) { clearInterval(recStopperRef.current); recStopperRef.current = null; }
  };

  const discardRecording = () => {
    setRecBlob(null);
    if (recAudioUrl) { URL.revokeObjectURL(recAudioUrl); setRecAudioUrl(null); }
    setRecState("idle");
    setRecError("");
    setRecElapsed(0);
  };

  // Cleanup on unmount.
  useEffect(() => () => {
    if (recStopperRef.current) clearInterval(recStopperRef.current);
    try { recorderRef.current?.state === "recording" && recorderRef.current.stop(); } catch (_) {}
    if (recAudioUrl) URL.revokeObjectURL(recAudioUrl);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeActivities = activities.filter((a) => a.status === "active");
  const myActivity = activities.find((a) => a.id === activityId);
  const history = (practiceSessions || []).slice().sort((a, b) => (b.startedAt || b.createdAt || "").localeCompare(a.startedAt || a.createdAt || ""));

  return (
    <>
      <Card className="p-4 mb-3 bg-gradient-to-br from-violet-50 to-fuchsia-50 border-violet-100">
        <div className="text-[11px] uppercase tracking-wider font-bold text-violet-700 mb-2">Activity</div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {activeActivities.length === 0 ? (
            <div className="text-[12px] text-slate-500">No active activities yet — add some under More → Activities first.</div>
          ) : activeActivities.map((a) => (
            <button
              key={a.id}
              type="button"
              disabled={running}
              onClick={() => setActivityId(a.id)}
              className={`px-2.5 py-1.5 rounded-full text-[12px] font-bold transition ${a.id === activityId ? "text-white" : "bg-white border border-slate-200 text-slate-700"} ${running ? "opacity-60" : "active:scale-95"}`}
              style={a.id === activityId ? { background: a.color || "#7c3aed" } : undefined}
            >
              {a.name}
            </button>
          ))}
        </div>

        <div className="text-center my-4">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">{running ? "Running" : "Ready"}</div>
          <div className="text-6xl font-extrabold tabular-nums tracking-tight text-slate-800">{fmt(elapsed)}</div>
          {myActivity && <div className="text-[11px] text-slate-500 mt-1">{myActivity.name} session</div>}
        </div>

        <div className="flex gap-2">
          {!running ? (
            <button disabled={!activityId} onClick={start} className={`flex-1 py-3 rounded-2xl font-extrabold text-sm text-white ${activityId ? "bg-violet-600 active:scale-[0.98]" : "bg-slate-300"}`}>
              ▶ Start practice
            </button>
          ) : (
            <>
              <button onClick={cancel} className="px-4 py-3 rounded-2xl font-extrabold text-sm text-slate-600 bg-white border border-slate-200 active:scale-[0.98]">
                Cancel
              </button>
              <button onClick={stop} className="flex-1 py-3 rounded-2xl font-extrabold text-sm text-white bg-rose-600 active:scale-[0.98]">
                ■ Stop &amp; save
              </button>
            </>
          )}
        </div>
        {running && (
          <div className="text-[10px] text-slate-500 text-center mt-2 leading-snug">
            Timer keeps running if you leave this page. Tap the live banner at the top to come back.
          </div>
        )}
      </Card>

      {running && (
        <Card className="p-3 mb-3">
          <div className="text-[11px] uppercase tracking-wider font-bold text-slate-500 mb-2">Optional 30s clip</div>
          {recState === "idle" && (
            <button onClick={startRecording} className="w-full py-2.5 rounded-xl bg-amber-500 text-white font-bold text-sm">🎙️ Record 30s</button>
          )}
          {recState === "recording" && (
            <div className="flex items-center gap-2">
              <button onClick={stopRecording} className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white font-bold text-sm">■ Stop recording ({30 - recElapsed}s)</button>
            </div>
          )}
          {recState === "done" && recAudioUrl && (
            <div>
              <audio controls src={recAudioUrl} className="w-full mb-2" />
              <div className="flex gap-2">
                <button onClick={discardRecording} className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-500 font-bold text-xs">Discard</button>
                <button onClick={startRecording} className="flex-1 py-2 rounded-xl bg-amber-100 text-amber-700 font-bold text-xs">Re-record</button>
              </div>
              <div className="text-[10px] text-slate-400 mt-2">Saved when you tap Stop & save above.</div>
            </div>
          )}
          {recState === "uploading" && <div className="text-[12px] text-slate-500">Uploading clip…</div>}
          {recState === "error" && <div className="text-[12px] text-rose-600">{recError}</div>}
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (what you worked on, what was hard, etc.)"
            rows={2}
            className="w-full mt-2 border border-slate-200 rounded-lg px-2 py-1.5 text-xs resize-none"
          />
        </Card>
      )}

      <div className="text-[11px] uppercase tracking-wider font-bold text-slate-500 mb-2 px-1">Past sessions</div>
      {history.length === 0 ? (
        <Card className="p-4 text-sm text-slate-400 text-center">No sessions yet. Start one above.</Card>
      ) : (
        history.map((s) => <PracticeSessionRow key={s.id} s={s} activities={activities} removePracticeSession={removePracticeSession} />)
      )}
    </>
  );
}

// Siri Shortcuts page — one row per active task with a copyable URL
// that hits ?qc=<slug>. Parents make an iOS Shortcut → "Open URL" →
// paste → name it ("Reznor did drums") → enable Hey Siri.
function CopyChip({ value, label = "Copy URL" }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = value;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus(); ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } catch { /* give up */ }
    }
  };
  return (
    <button onClick={onCopy} className={`text-[11px] font-bold px-2.5 py-1.5 rounded-full ${copied ? "bg-emerald-100 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
      {copied ? "✓ Copied" : label}
    </button>
  );
}

function SiriShortcuts({ tasks = [], users = [] }) {
  const kid = users.find((u) => u.role === "kid");
  const origin = (typeof window !== "undefined" && window.location?.origin) || "https://little-legend-treasures.netlify.app";
  const active = (tasks || []).filter((t) => t.active !== false);
  const slug = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  // Pull the example task name from this family's actual first active
  // task so the spoken example is real for them, not Lynch-specific.
  const exampleTaskName = (active[0]?.title || "their task").toLowerCase();
  const exampleKidName = kid?.name || "your kid";
  return (
    <>
      <Card className="p-4 mb-3 bg-gradient-to-br from-indigo-50 to-violet-50 border-indigo-100">
        <div className="text-sm font-extrabold mb-1">Say "Hey Siri" instead of opening the app</div>
        <p className="text-[12px] text-slate-600 leading-snug">
          One iPhone trick that takes 90 seconds. Once set up, you say <em>"Hey Siri, {exampleKidName} did {exampleTaskName}"</em> and the app marks today's task done.
        </p>
      </Card>

      <Card className="p-3 mb-3">
        <div className="text-[11px] uppercase tracking-wider font-bold text-slate-500 mb-2">How to set one up (iPhone)</div>
        <ol className="text-[12px] text-slate-600 space-y-1.5 list-decimal pl-4">
          <li>Open the <strong>Shortcuts</strong> app (already on every iPhone).</li>
          <li>Tap <strong>+</strong> top right → <strong>Add Action</strong> → search "Open URL" → tap it.</li>
          <li>Tap the URL field → paste the URL for the task you want from the list below.</li>
          <li>Tap the shortcut name at the top → rename it to what you'd say out loud (e.g. <em>"{exampleKidName} did {exampleTaskName}"</em>).</li>
          <li>Tap the share icon → <strong>Add to Siri</strong> if it asks. Done.</li>
          <li>Now say <em>"Hey Siri, {exampleKidName} did {exampleTaskName}"</em> any time today and the app logs it.</li>
        </ol>
      </Card>

      <div className="text-[11px] uppercase tracking-wider font-bold text-slate-500 mb-2 px-1">Copy a URL per task</div>
      {active.length === 0 && (
        <Card className="p-4 text-sm text-slate-400 text-center">No active tasks yet. Add some under More → Tasks first.</Card>
      )}
      {active.map((t) => {
        const url = `${origin}/?qc=${slug(t.activityType || t.title || t.id)}`;
        return (
          <Card key={t.id} className="p-3 mb-2">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="font-bold text-sm flex-1 truncate">{t.title}</div>
              <CopyChip value={url} />
            </div>
            <div className="text-[10px] text-slate-400 font-mono break-all leading-snug">{url}</div>
            <div className="text-[10px] text-slate-400 mt-1">Suggested phrase: <em>"{kid?.name || "Kid"} did {t.activityType || t.title}"</em></div>
          </Card>
        );
      })}

      <Card className="p-3 mt-3 bg-slate-50">
        <div className="text-[11px] text-slate-500 leading-snug">
          The URL only works while you're signed in on the device. If Siri opens it in a fresh browser window, just sign in once — the next "Hey Siri" works.
        </div>
      </Card>
    </>
  );
}

function Skills({ learningGoals = [], setLearningGoals, kids = [], updateUser }) {
  const [editingIdx, setEditingIdx] = useState(null);
  const [draft, setDraft] = useState({ area: "", note: "" });
  const [adding, setAdding] = useState(false);

  const startAdd = () => { setDraft({ area: "", note: "" }); setAdding(true); setEditingIdx(null); };
  const startEdit = (i) => {
    setDraft({ area: learningGoals[i].area || "", note: learningGoals[i].note || "" });
    setEditingIdx(i);
    setAdding(false);
  };
  const cancel = () => { setEditingIdx(null); setAdding(false); setDraft({ area: "", note: "" }); };
  const saveAdd = () => {
    const area = draft.area.trim();
    if (!area) return;
    setLearningGoals((prev) => [...(prev || []), { area, note: draft.note.trim() }]);
    cancel();
  };
  const saveEdit = () => {
    if (editingIdx == null) return;
    const area = draft.area.trim();
    if (!area) return;
    setLearningGoals((prev) =>
      (prev || []).map((g, i) => (i === editingIdx ? { area, note: draft.note.trim() } : g))
    );
    cancel();
  };
  const remove = (i) => {
    if (!confirm("Remove this learning goal?")) return;
    setLearningGoals((prev) => (prev || []).filter((_, idx) => idx !== i));
    cancel();
  };
  const seedStarters = () => {
    setLearningGoals(SKILL_STARTER_AREAS.map((area) => ({ area, note: "" })));
  };

  const setGrade = (kidId, grade) => {
    if (!updateUser) return;
    updateUser(kidId, { grade: grade.trim() || null });
  };

  return (
    <>
      <p className="text-sm text-slate-400 px-1 mb-3">
        Track what your kid is working on across each subject. Tap any goal to edit; add or remove freely as things change.
      </p>

      {/* Grade editors per kid */}
      {kids.length > 0 && (
        <Card className="p-3 mb-3 bg-slate-50">
          <div className="text-[11px] uppercase tracking-wider font-bold text-slate-500 mb-2">Grade level</div>
          {kids.map((k) => (
            <div key={k.id} className="flex items-center gap-2 mb-1.5 last:mb-0">
              <span className="text-sm font-semibold flex-1 truncate">{k.name}</span>
              <input
                type="text"
                defaultValue={k.grade || ""}
                onBlur={(e) => setGrade(k.id, e.target.value)}
                placeholder="e.g. 2nd"
                className="w-24 border border-slate-200 rounded-lg px-2 py-1 text-sm"
              />
            </div>
          ))}
        </Card>
      )}

      {learningGoals.length === 0 && !adding ? (
        <Card className="p-4 mb-2 text-center bg-slate-50">
          <div className="text-sm font-semibold text-slate-600 mb-1">No goals yet</div>
          <div className="text-[11px] text-slate-400 mb-3">Add a learning goal — or start with common subjects you can then edit.</div>
          <div className="flex gap-2">
            <button onClick={startAdd} className="flex-1 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs">+ Add goal</button>
            <button onClick={seedStarters} className="flex-1 py-2 rounded-xl bg-slate-200 text-slate-700 font-bold text-xs">Add starter subjects</button>
          </div>
        </Card>
      ) : (
        <>
          {learningGoals.map((g, i) => editingIdx === i ? (
            <Card key={i} className="p-3 mb-2 border-indigo-200 border-2">
              <input
                value={draft.area}
                onChange={(e) => setDraft((d) => ({ ...d, area: e.target.value }))}
                placeholder="Subject (e.g. Reading)"
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-bold mb-2"
              />
              <textarea
                value={draft.note}
                onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
                placeholder="What they're working on, where they are, where you want them to get…"
                rows={3}
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs mb-2 resize-none"
              />
              <div className="flex gap-2">
                <button onClick={() => remove(i)} className="text-xs font-bold px-2.5 py-1.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-200">Remove</button>
                <div className="flex-1" />
                <button onClick={cancel} className="text-xs font-bold px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-500">Cancel</button>
                <button onClick={saveEdit} className="text-xs font-bold px-3 py-1.5 rounded-xl bg-indigo-600 text-white">Save</button>
              </div>
            </Card>
          ) : (
            <Card key={i} className="p-3 mb-2">
              <button onClick={() => startEdit(i)} className="w-full text-left">
                <div className="font-bold text-sm">{g.area}</div>
                {g.note && <div className="text-[11px] text-slate-400 mt-0.5">{g.note}</div>}
                {!g.note && <div className="text-[10px] text-slate-300 italic mt-0.5">Tap to add details</div>}
              </button>
            </Card>
          ))}
          {adding && (
            <Card className="p-3 mb-2 border-indigo-200 border-2">
              <input
                value={draft.area}
                onChange={(e) => setDraft((d) => ({ ...d, area: e.target.value }))}
                placeholder="Subject (e.g. Reading)"
                autoFocus
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-bold mb-2"
              />
              <textarea
                value={draft.note}
                onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
                placeholder="What they're working on…"
                rows={3}
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs mb-2 resize-none"
              />
              <div className="flex gap-2">
                <div className="flex-1" />
                <button onClick={cancel} className="text-xs font-bold px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-500">Cancel</button>
                <button onClick={saveAdd} className="text-xs font-bold px-3 py-1.5 rounded-xl bg-indigo-600 text-white">Add</button>
              </div>
            </Card>
          )}
          {!adding && (
            <button onClick={startAdd} className="w-full mt-2 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm flex items-center justify-center gap-1">
              <Plus size={16} /> Add a goal
            </button>
          )}
        </>
      )}
    </>
  );
}

// ===================== PARENT: PEOPLE / ACCESS =====================
function People({ user, users, addUser, updateUser, removeUser, familyId, pendingRegistrations, approveRegistration, denyRegistration, currentProfileId }) {
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
            {i18nTOf("people_pending_requests", "Pending requests")} <span className="text-[11px] font-semibold text-amber-700">({pending.length})</span>
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
                    toast.error("Avatar upload failed: " + (err.message || err));
                  }
                }} />
              </label>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm flex items-center gap-2">{u.name}<span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 capitalize">{u.role}</span></div>
                <div className="text-[11px] text-slate-400">
                  {u.relationship}
                  {u.accessType === "temporary" && (expired
                    ? <span className="text-rose-500 font-semibold"> · {i18nTOf("people_access_ended", "access ended")} {fmtShort(u.accessExpires)}</span>
                    : <span className="text-amber-600 font-semibold"> · {i18nTOf("people_guest_until", "guest until")} {fmtShort(u.accessExpires)}</span>)}
                  {u.accessType === "permanent" && !locked(u) && ` · ${i18nTOf("people_ongoing_access", "ongoing access")}`}
                </div>
              </div>
              {u.photo && <button onClick={() => updateUser(u.id, { photo: "" })} className="text-[10px] font-semibold text-slate-400 shrink-0">{i18nTOf("people_remove_photo", "Remove photo")}</button>}
              {!locked(u) && <button onClick={() => removeUser(u.id)} className="text-slate-300 hover:text-rose-500 p-1"><X size={16} /></button>}
            </div>
            {!locked(u) && (
              <div className="flex flex-wrap gap-2 mt-2">
                <Toggle on={u.active !== false && !expired} label={expired ? i18nTOf("people_expired", "Expired") : (u.active === false ? i18nTOf("people_disabled", "Disabled") : i18nTOf("people_active", "Active"))} disabled={expired} onClick={() => updateUser(u.id, { active: u.active === false })} />
                <Toggle on={!!u.permissions?.approveSimple} label={i18nTOf("people_can_approve_simple", "Can approve simple tasks")} onClick={() => updateUser(u.id, { permissions: { ...u.permissions, approveSimple: !u.permissions?.approveSimple } })} />
                {["grandparent", "helper", "guest"].includes(u.role) && <Toggle on={!!u.easyLocked} label={i18nTOf("people_lock_easy", "💛 Lock to Easy mode")} onClick={() => updateUser(u.id, { easyLocked: !u.easyLocked })} />}
              </div>
            )}
            {/* Email is editable for every role — including kids. The
                old guard blocked kid editing entirely, which forced
                Mike to write SQL to set Reznor's reztronx@gmail.com.
                Editing email is NOT deletion; deletion is what the
                "kids never delete" rule protects against. Letting
                Monica add Maddox's email here is the difference
                between "easy onboarding" and "needs Mike's help." */}
            <EmailEditor user={u} onSave={(email) => updateUser(u.id, { email })} />
            <InviteTextButton user={u} familyName={user?.familyName} />
            {u.role === "kid" && <ViewOnlyShareLink kidId={u.id} kidName={u.name} />}
            <BirthdayEditor user={u} onSave={(birthday) => updateUser(u.id, { birthday })} />
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

      {!adding && <button onClick={() => setAdding(true)} className="w-full mt-2 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm flex items-center justify-center gap-2"><Plus size={16} /> {i18nTOf("people_add_person", "Add a person")}</button>}
      {adding && <AddPersonForm onCancel={() => setAdding(false)} onAdd={(u) => { addUser(u); setAdding(false); }} />}

      <div className="text-[11px] text-slate-400 px-1 mt-3">{i18nTOf("people_temp_hint", "Temporary access auto-expires on its end date — a one-week sitter won't keep getting in.")}</div>
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
        <button onClick={onDeny} className="text-xs font-bold px-2.5 py-1.5 rounded-xl bg-white border border-rose-200 text-rose-600">{i18nTOf("act_deny", "Deny")}</button>
        <button onClick={() => setExpanded(true)} className="text-xs font-bold px-2.5 py-1.5 rounded-xl bg-emerald-600 text-white">{i18nTOf("act_approve", "Approve")}…</button>
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
        {[["kid", "Kid"], ["helper", "Helper / Sitter"], ["grandparent", "Grandparent"], ["guest", "Guest (temporary)"], ["parent", "Parent admin"]].map(([k, l]) => (
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
// Per-kid view-only share link. Was named GrandparentShareLink first
// but Mike caught the bias 2026-06-15: "Some people might not have
// grandparents and only have a friend like our Aunt Sara or a
// babysitter... Some dads might use it. Some people don't have dads."
// Renamed to be honest about what it is — a read-only link for any
// loved one or helper who doesn't want or need a login. Parent taps
// to mint or rotate a UUID token via the SECURITY DEFINER RPC, copy
// it as a /share/<token> URL, or revoke. The shared page
// (SharedKidView) shows kid name, streaks, this-week stars, and
// recent wins — no rewards economy, no other family members, no
// addresses.
// Inline birthday editor + a tiny "🎂 in N days" badge for People rows.
// Showing the badge ONLY when ≤ 7 days out so it doesn't compete with
// the streak data parents care about most. Per Mike's rule: streak
// importance > birthday distance > everything else on this row.
// One-tap invite for everyone Monica pre-stages. Opens the device's
// SMS/Mail app with a friendly prefilled message containing the
// signup URL + the email she set, so Tom / grandma / Maddox don't
// have to be told the multi-step "register and use this email"
// instructions verbatim. Only renders when an email is set AND the
// person hasn't actually signed up yet (auth_user_id null).
function InviteTextButton({ user, familyName }) {
  const [magicState, setMagicState] = useState("idle"); // idle | sending | sent | error
  const [magicError, setMagicError] = useState("");

  if (!user?.email) return null;
  if (user.auth_user_id) return null; // already linked = already signed up

  const origin = (typeof window !== "undefined" && window.location?.origin) || "https://little-legend-treasures.netlify.app";
  const fam = familyName || "our family";
  const intro = user.role === "kid"
    ? `Hey ${user.name}! Your parents added you to ${fam}'s Command Center app.`
    : `Hey ${user.name}! I added you to ${fam}'s Command Center app.`;
  const steps = `Go here: ${origin}\nTap "Join" (or "Sign in" if you've used it before)\nUse this email: ${user.email}\nPick any password.\nYou'll be linked automatically when you sign in.`;
  const body = `${intro}\n\n${steps}`;
  const sms = `sms:&body=${encodeURIComponent(body)}`;
  const mailto = `mailto:${encodeURIComponent(user.email)}?subject=${encodeURIComponent("Join " + fam + " on Family Command Center")}&body=${encodeURIComponent(body)}`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(body); }
    catch { /* skip */ }
  };

  // Magic link — zero-friction path. Supabase emails the person a
  // one-tap sign-in link; on click, they auth + the existing
  // claim_profile_by_email RPC auto-links them to this pre-staged
  // profile. No password, no Join tab, no manual instructions.
  // shouldCreateUser default = true so brand-new auth accounts are
  // created on the fly.
  const sendMagicLink = async () => {
    if (magicState === "sending") return;
    setMagicState("sending");
    setMagicError("");
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: user.email,
        options: { emailRedirectTo: origin },
      });
      if (error) {
        setMagicState("error");
        setMagicError(error.message);
      } else {
        setMagicState("sent");
        setTimeout(() => setMagicState("idle"), 4000);
      }
    } catch (e) {
      setMagicState("error");
      setMagicError(String(e?.message || e));
    }
  };

  return (
    <div className="mt-2 rounded-xl bg-slate-50 border border-slate-100 p-2.5">
      <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-2">How {user.name} signs in</div>

      {/* OPTION 1 — Password (recommended for adults + kids with private data) */}
      <div className="rounded-lg bg-white border border-slate-100 p-2 mb-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-base">🔒</span>
          <div className="font-bold text-[12px] flex-1">Password sign-up <span className="text-[10px] font-medium text-emerald-700">· recommended</span></div>
        </div>
        <div className="text-[10px] text-slate-500 leading-snug mb-2">
          They register with their own password. Best for spouses, older kids, and anyone who'll upload photos or personal data — both "something you know" (password) and "something you have" (email).
        </div>
        <div className="flex flex-wrap gap-1.5">
          <a href={sms} className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 active:scale-95">
            💬 Text invite
          </a>
          <a href={mailto} className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 active:scale-95">
            📧 Email invite
          </a>
          <button onClick={copy} className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
            📋 Copy
          </button>
        </div>
      </div>

      {/* OPTION 2 — Magic link (low friction, weaker for sensitive data) */}
      <div className="rounded-lg bg-white border border-slate-100 p-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-base">✨</span>
          <div className="font-bold text-[12px] flex-1">Magic link · zero typing</div>
        </div>
        <div className="text-[10px] text-slate-500 leading-snug mb-2">
          They tap one link in their inbox and they're in. Faster, but anyone with access to that inbox can sign in too. Better for grandparents who'd never set up a password.
        </div>
        <button
          onClick={sendMagicLink}
          disabled={magicState === "sending"}
          className={`text-[11px] font-extrabold px-3 py-1 rounded-full text-white active:scale-95 ${
            magicState === "sent"     ? "bg-emerald-500" :
            magicState === "error"    ? "bg-rose-500"    :
            magicState === "sending"  ? "bg-slate-400"   :
            "bg-indigo-600"
          }`}
        >
          {magicState === "sent"    ? "✓ Magic link sent" :
           magicState === "error"   ? "Try again" :
           magicState === "sending" ? "Sending…" :
           "Send magic link"}
        </button>
        {magicState === "sent" && (
          <div className="text-[10px] text-emerald-700 mt-1.5 leading-snug">
            Sent to {user.email}. They can set a password after signing in from More → Privacy & Safety → Account.
          </div>
        )}
        {magicState === "error" && (
          <div className="text-[10px] text-rose-600 mt-1.5 leading-snug">{magicError}</div>
        )}
      </div>
    </div>
  );
}

function BirthdayEditor({ user, onSave }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(user.birthday || "");
  const info = user.birthday ? nextBirthdayInfo(user.birthday) : null;
  const within7 = info && info.daysUntil <= 7;
  const display = info
    ? (info.isToday ? "🎉 Today!" : `🎂 in ${info.daysUntil} day${info.daysUntil === 1 ? "" : "s"}`)
    : null;
  if (!editing) {
    return (
      <div className="mt-2 flex items-center gap-2">
        {within7 ? (
          <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-800">{display}</span>
        ) : (
          <span className="text-[10px] text-slate-400">
            {info ? `Birthday: ${new Date(user.birthday + "T12:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : "Birthday: —"}
          </span>
        )}
        <button onClick={() => { setVal(user.birthday || ""); setEditing(true); }} className="text-[10px] font-bold text-indigo-600">
          {user.birthday ? "Change" : "Add"}
        </button>
      </div>
    );
  }
  return (
    <div className="mt-2 flex items-center gap-2">
      <input
        type="date"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        className="border border-slate-200 rounded-lg px-2 py-1 text-xs"
      />
      <button
        onClick={() => { onSave(val || null); setEditing(false); }}
        className="text-[10px] font-bold px-2 py-1 rounded-full bg-indigo-600 text-white"
      >
        Save
      </button>
      <button
        onClick={() => setEditing(false)}
        className="text-[10px] font-bold text-slate-400"
      >
        Cancel
      </button>
      {user.birthday && (
        <button
          onClick={() => { onSave(null); setEditing(false); }}
          className="text-[10px] font-bold text-rose-500"
        >
          Clear
        </button>
      )}
    </div>
  );
}

function ViewOnlyShareLink({ kidId, kidName }) {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // On mount, peek at the kid's profile row to see if a token already
  // exists. Reads are RLS-gated (current family) so it's safe.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("view_token")
          .eq("id", kidId)
          .maybeSingle();
        if (cancelled) return;
        if (error) setError(error.message);
        else setToken(data?.view_token || null);
      } catch (e) {
        if (cancelled) return;
        setError(String(e?.message || e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [kidId]);

  const url = token ? `${window.location.origin}/share/${token}` : "";

  const generate = async () => {
    setBusy(true); setError("");
    try {
      const { data, error } = await supabase.rpc("generate_kid_view_token", { p_kid_id: kidId });
      if (error) setError(error.message);
      else setToken(data);
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };
  const revoke = async () => {
    if (!confirm(`Revoke ${kidName}'s share link? Anyone who has it will lose access.`)) return;
    setBusy(true); setError("");
    try {
      const { error } = await supabase.rpc("revoke_kid_view_token", { p_kid_id: kidId });
      if (error) setError(error.message);
      else setToken(null);
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };
  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = url; ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.focus(); ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setCopied(true); setTimeout(() => setCopied(false), 1500);
      } catch { /* skip */ }
    }
  };

  if (loading) return null;
  return (
    <div className="mt-2 rounded-xl bg-slate-50 border border-slate-100 p-2.5">
      <div className="text-[11px] uppercase tracking-wider font-bold text-slate-500 mb-1">🔗 Share a view-only link</div>
      <div className="text-[10px] text-slate-500 leading-snug mb-2">
        Send to grandparents, aunts, babysitters — anyone who just needs to peek at {kidName || "this kid"}'s progress (streaks, recent wins, this week's stars). No sign-up, no editing. Revocable any time.
      </div>
      {!token ? (
        <button onClick={generate} disabled={busy} className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-indigo-600 text-white active:scale-95">
          {busy ? "Working…" : "Create a share link"}
        </button>
      ) : (
        <>
          <div className="text-[10px] font-mono break-all bg-white border border-slate-100 rounded-lg p-2 mb-2 text-slate-600">{url}</div>
          <div className="flex flex-wrap gap-1.5">
            <button onClick={copy} className={`text-[11px] font-bold px-2.5 py-1.5 rounded-full ${copied ? "bg-emerald-100 text-emerald-700" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
              {copied ? "✓ Copied" : "📋 Copy link"}
            </button>
            <button onClick={generate} disabled={busy} className="text-[11px] font-bold px-2.5 py-1.5 rounded-full bg-slate-100 text-slate-600">
              {busy ? "…" : "🔁 Rotate"}
            </button>
            <button onClick={revoke} disabled={busy} className="text-[11px] font-bold px-2.5 py-1.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200">
              Revoke
            </button>
          </div>
        </>
      )}
      {error && <div className="text-[10px] text-rose-600 mt-1.5">{error}</div>}
    </div>
  );
}

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
  const colors = { parent: "#2563eb", grandparent: "#7c3aed", helper: "#0d9488", guest: "#64748b", kid: "#f59e0b" };
  const emailOk = !email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const ready = name.trim().length > 0 && emailOk;
  const submit = () => onAdd({
    name: name.trim(),
    relationship: relationship.trim() || (role === "guest" ? "Guest sitter" : role === "grandparent" ? "Grandparent" : role === "kid" ? "Kid" : "Helper"),
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
        {[["kid", "Kid"], ["helper", "Helper / Sitter"], ["grandparent", "Grandparent"], ["guest", "Guest (temporary)"], ["parent", "Parent admin"]].map(([k, l]) => (
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

// Generic preset packs — opt-in only. Each parent picks what's true
// for THEIR kid; no Lynch-specific addresses, no Reznor schedules.
// "id" is a slug-ish prefix; addActivity stamps a unique id with a
// timestamp suffix at insert time so multiple families adding the same
// pack don't collide.
const ACTIVITY_PRESET_PACKS = [
  {
    pack: "Sports",
    items: [
      { name: "Soccer",     short: "Soccer",  color: "#22c55e", pillar: "body" },
      { name: "Basketball", short: "Ball",    color: "#65a30d", pillar: "body" },
      { name: "Baseball",   short: "BB",      color: "#dc2626", pillar: "body" },
      { name: "Football",   short: "FB",      color: "#92400e", pillar: "body" },
      { name: "Hockey",     short: "Hockey",  color: "#0284c7", pillar: "body" },
      { name: "Tennis",     short: "Tennis",  color: "#84cc16", pillar: "body" },
      { name: "Swim",       short: "Swim",    color: "#0891b2", pillar: "body" },
      { name: "Volleyball", short: "Volley",  color: "#f59e0b", pillar: "body" },
      { name: "Gymnastics", short: "Gym",     color: "#ec4899", pillar: "body" },
    ],
  },
  {
    pack: "Martial Arts",
    items: [
      { name: "Taekwondo",  short: "TKD",     color: "#dc2626", pillar: "body" },
      { name: "Karate",     short: "Karate",  color: "#b91c1c", pillar: "body" },
      { name: "Jujitsu",    short: "Jujitsu", color: "#7c2d12", pillar: "body" },
      { name: "Judo",       short: "Judo",    color: "#991b1b", pillar: "body" },
      { name: "Boxing",     short: "Boxing",  color: "#991b1b", pillar: "body" },
    ],
  },
  {
    pack: "Music",
    items: [
      { name: "Piano",      short: "Piano",   color: "#3b82f6", pillar: "soul" },
      { name: "Guitar",     short: "Guitar",  color: "#a855f7", pillar: "soul" },
      { name: "Drums",      short: "Drums",   color: "#7c3aed", pillar: "soul" },
      { name: "Singing",    short: "Sing",    color: "#ec4899", pillar: "soul" },
      { name: "Violin",     short: "Violin",  color: "#0ea5e9", pillar: "soul" },
      { name: "Cello",      short: "Cello",   color: "#8b5cf6", pillar: "soul" },
      { name: "Ukulele",    short: "Uke",     color: "#fb923c", pillar: "soul" },
    ],
  },
  {
    pack: "Dance & Movement",
    items: [
      { name: "Dance",       short: "Dance",   color: "#db2777", pillar: "body" },
      { name: "Ballet",      short: "Ballet",  color: "#f472b6", pillar: "body" },
      { name: "Yoga",        short: "Yoga",    color: "#10b981", pillar: "body" },
      { name: "Cheer",       short: "Cheer",   color: "#a21caf", pillar: "body" },
    ],
  },
  {
    pack: "Academics",
    items: [
      { name: "Reading",     short: "Read",    color: "#3b82f6", pillar: "brain" },
      { name: "Writing",     short: "Write",   color: "#8b5cf6", pillar: "brain" },
      { name: "Math",        short: "Math",    color: "#10b981", pillar: "brain" },
      { name: "Science",     short: "Sci",     color: "#0d9488", pillar: "brain" },
      { name: "Spanish",     short: "Spa",     color: "#ec4899", pillar: "brain" },
      { name: "French",      short: "Fr",      color: "#f43f5e", pillar: "brain" },
      { name: "Coding",      short: "Code",    color: "#6366f1", pillar: "brain" },
    ],
  },
  {
    pack: "Home & Life",
    items: [
      { name: "Chores",      short: "Chores",  color: "#64748b", pillar: "body" },
      { name: "Art",         short: "Art",     color: "#f59e0b", pillar: "soul" },
      { name: "Movement",    short: "Move",    color: "#16a34a", pillar: "body" },
      { name: "Church",      short: "Church",  color: "#9333ea", pillar: "soul" },
      { name: "Field Trips", short: "Trip",    color: "#0ea5e9", pillar: "brain" },
    ],
  },
];

// PresetPicker now answers Mike's onboarding ask: "When adding them
// for onboarding it should ask, add this to daily to-do? or pick a
// day that it repeats, or is this a bonus? help them get started so
// there are less steps." One shared choice for the whole batch —
// "Daily must-do" by default, with "Specific days" / "Bonus" /
// "Just the activity" as alternates. Submit creates activities AND
// matching tasks in one round-trip.
const SCHEDULE_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SCHEDULE_DAY_SHORT = { Sunday: "Sun", Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu", Friday: "Fri", Saturday: "Sat" };

function PresetPicker({ existingIds, onAdd, onClose, dailyRequiredCount = 8 }) {
  const [picked, setPicked] = useState(() => new Set());
  // Schedule mode for the whole batch. Default "daily" because that's
  // the highest-fit answer for a brand-new family adding their first
  // activities — "Add drums and put it on my kid's plan today" is the
  // 90% case.
  const [scheduleMode, setScheduleMode] = useState("daily"); // 'daily' | 'weekly' | 'bonus' | 'none'
  const [days, setDays] = useState([]);
  const isExisting = (name) => existingIds.has(name.toLowerCase());
  const togglePick = (key) => setPicked((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });
  const toggleDay = (d) => setDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);

  // Build a stable id seed once per submit so the activity + its
  // matching task share a millisecond and don't collide.
  const submit = () => {
    const stamp = Date.now().toString(36);
    const acts = [];
    const tasks = [];
    let i = 0;
    for (const pack of ACTIVITY_PRESET_PACKS) {
      for (const item of pack.items) {
        const key = pack.pack + ":" + item.name;
        if (!picked.has(key)) continue;
        const slug = item.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 20);
        const actId = "a_" + slug + "_" + stamp + "_" + i;
        acts.push({
          id: actId,
          name: item.name,
          short: item.short,
          color: item.color,
          pillar: item.pillar,
          status: "active",
          note: "",
          address: "",
          schedule: [],
          weeklySchedule: false,
          weeklyTarget: null,
        });
        if (scheduleMode !== "none") {
          const task = {
            id: "t_" + slug + "_" + stamp + "_" + i,
            title: item.name,
            category: pack.pack,
            activityType: item.name,
            activityId: actId,
            required: scheduleMode === "daily" || scheduleMode === "weekly",
            starValue: scheduleMode === "bonus" ? 3 : 5,
            proofRequired: false,
            proofType: null,
            approvalRequired: true,
            mode: "both",
            minutes: 15,
          };
          if (scheduleMode === "weekly" && days.length > 0) task.days = [...days];
          tasks.push(task);
        }
        i += 1;
      }
    }
    if (acts.length > 0) onAdd(acts, tasks);
    onClose();
  };

  return (
    <Card className="p-4 mb-2">
      <div className="flex items-center justify-between mb-2">
        <div className="font-bold text-sm">Add from presets</div>
        <button onClick={onClose} className="text-slate-400 text-xs font-bold">Close</button>
      </div>
      <div className="text-[11px] text-slate-400 mb-3">Tap any you want. You'll choose how they show up on the daily plan in one shot below.</div>
      {ACTIVITY_PRESET_PACKS.map((pack) => (
        <div key={pack.pack} className="mb-3">
          <div className="text-[11px] uppercase tracking-wider font-bold text-slate-500 mb-1.5">{pack.pack}</div>
          <div className="flex flex-wrap gap-1.5">
            {pack.items.map((item) => {
              const key = pack.pack + ":" + item.name;
              const taken = isExisting(item.name);
              const sel = picked.has(key);
              return (
                <button
                  key={key}
                  type="button"
                  disabled={taken}
                  onClick={() => togglePick(key)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition ${
                    taken ? "bg-slate-100 text-slate-300 line-through cursor-not-allowed" :
                    sel ? "text-white" : "bg-slate-100 text-slate-600"
                  }`}
                  style={sel ? { background: item.color } : undefined}
                >
                  {item.name}
                  {taken && <span className="ml-1 text-[9px]">already added</span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {picked.size > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 mb-3">
          <div className="text-[11px] uppercase tracking-wider font-bold text-amber-700 mb-2">
            How should {picked.size === 1 ? "it" : "they"} show up?
          </div>
          <div className="space-y-1.5">
            {[
              { id: "daily",  emoji: "📅", label: "Daily must-do",         hint: `On the Top ${dailyRequiredCount} every day` },
              { id: "weekly", emoji: "🗓️", label: "Specific days only",     hint: "Pick which weekdays" },
              { id: "bonus",  emoji: "✨", label: "Bonus",                  hint: `Optional — not on the Top ${dailyRequiredCount}` },
              { id: "none",   emoji: "🌱", label: "Just the activity",      hint: "Skip the task for now" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setScheduleMode(opt.id)}
                className={`w-full flex items-start gap-2 rounded-xl px-2.5 py-2 text-left border-2 transition ${scheduleMode === opt.id ? "bg-white border-amber-500" : "bg-white/60 border-transparent"}`}
              >
                <span className="text-base shrink-0">{opt.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-extrabold text-slate-800">{opt.label}</div>
                  <div className="text-[10px] text-slate-500 leading-snug">{opt.hint}</div>
                </div>
                <span className={`w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 ${scheduleMode === opt.id ? "bg-amber-500 border-amber-500" : "border-slate-300"}`} />
              </button>
            ))}
          </div>
          {scheduleMode === "weekly" && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {SCHEDULE_DAYS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${days.includes(d) ? "bg-amber-500 text-white" : "bg-white border border-amber-200 text-amber-700"}`}
                >
                  {SCHEDULE_DAY_SHORT[d]}
                </button>
              ))}
            </div>
          )}
          {scheduleMode === "weekly" && days.length === 0 && (
            <div className="text-[10px] text-rose-600 mt-1.5">Pick at least one day, or switch to another option.</div>
          )}
        </div>
      )}
      <div className="flex gap-2 mt-3">
        <button onClick={onClose} className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-500 font-bold text-xs">Cancel</button>
        <button
          disabled={picked.size === 0 || (scheduleMode === "weekly" && days.length === 0)}
          onClick={submit}
          className={`flex-1 py-2 rounded-xl font-bold text-xs text-white ${(picked.size === 0 || (scheduleMode === "weekly" && days.length === 0)) ? "bg-slate-300" : "bg-indigo-600"}`}
        >
          Add {picked.size} {picked.size === 1 ? "activity" : "activities"}
        </button>
      </div>
    </Card>
  );
}

function ManageActivities({ activities, addActivity, updateActivity, addTask, streaks, setStreak, stopStreak, bumpStreak, setProgressActId, dailyRequiredCount = 8 }) {
  const [adding, setAdding] = useState(false);
  const [presetting, setPresetting] = useState(false);
  const existingNames = useMemo(
    () => new Set((activities || []).map((a) => (a.name || "").toLowerCase())),
    [activities]
  );
  // The preset picker now returns BOTH activities and matching tasks
  // (per Mike's "less steps" onboarding directive). We fan them into
  // the corresponding setters here so the activity row + the task row
  // land in the same sync batch.
  const addManyPresets = (acts, tasks = []) => {
    for (const a of acts) addActivity(a);
    for (const t of tasks) addTask(t);
  };
  const archived = activities.filter((a) => a.status === "archived");
  return (
    <>
      {/* Top pillar tiles — tap to scroll the matching section into
          view. Mike: "If you click Body it should take you to the
          Body section." Used id-based scrollIntoView so we don't need
          a ref-per-pillar. */}
      <div className="flex gap-2 mb-1">
        {Object.entries(PILLARS).map(([k, p]) => (
          <button
            key={k}
            type="button"
            onClick={() => {
              const el = document.getElementById(`pillar-${k}`);
              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="flex-1 rounded-2xl p-2 text-center active:scale-[0.97] transition"
            style={{ background: p.color + "18" }}
            title={`Jump to ${p.label}`}
          >
            <div className="text-lg">{p.emoji}</div>
            <div className="text-[11px] font-bold" style={{ color: p.color }}>{p.label}</div>
          </button>
        ))}
      </div>
      {Object.entries(PILLARS).map(([pk, p]) => {
        const list = activities.filter((a) => a.pillar === pk && a.status !== "archived");
        return (
          <div key={pk} id={`pillar-${pk}`} style={{ scrollMarginTop: 12 }}>
            <SectionTitle icon={<span className="text-base">{p.emoji}</span>}>{p.label}</SectionTitle>
            {list.length === 0 ? <p className="text-xs text-slate-400 px-1">{i18nTOf("empty_activities", "None yet.")}</p> : list.map((a) => <ActivityRow key={a.id} a={a} onUpdate={updateActivity} streaks={streaks} setStreak={setStreak} stopStreak={stopStreak} bumpStreak={bumpStreak} onProgress={setProgressActId} />)}
          </div>
        );
      })}

      {archived.length > 0 && (
        <>
          <SectionTitle icon={<Archive size={16} className="text-slate-400" />}>{i18nTOf("sec_archive", "Archive")}</SectionTitle>
          {archived.map((a) => (
            <Card key={a.id} className="p-0 overflow-hidden flex items-stretch mb-2 opacity-75">
              <div style={{ background: a.color }} className="w-2.5 shrink-0" />
              <div className="p-3 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="font-bold text-sm flex-1 min-w-0">{i18nNameOf(a)}</div>
                  <button onClick={() => updateActivity(a.id, { status: "active" })} className="text-[11px] font-bold text-indigo-600 shrink-0">{i18nTOf("manage_act_restore", "Restore")}</button>
                </div>
                {a.note && <div className="text-[11px] text-slate-400 mt-0.5">{a.note}</div>}
              </div>
            </Card>
          ))}
        </>
      )}

      {!adding && !presetting && (
        <div className="flex gap-2 mt-3">
          <button onClick={() => setPresetting(true)} className="flex-1 py-3 rounded-2xl bg-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center gap-1">
            <Plus size={14} /> From presets
          </button>
          <button onClick={() => setAdding(true)} className="flex-1 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm flex items-center justify-center gap-2"><Plus size={16} /> {i18nTOf("manage_act_add", "Custom")}</button>
        </div>
      )}
      {presetting && <PresetPicker existingIds={existingNames} onAdd={addManyPresets} onClose={() => setPresetting(false)} dailyRequiredCount={dailyRequiredCount} />}
      {adding && (
        <AddActivityForm
          dailyRequiredCount={dailyRequiredCount}
          onCancel={() => setAdding(false)}
          onAdd={(a, taskSpec) => {
            addActivity(a);
            // taskSpec.mode: 'daily' | 'weekly' | 'bonus' | 'none'.
            // 'none' skips task creation; the rest build a task that
            // lands on the daily plan with the right required / days /
            // star value. Same shape the PresetPicker emits, so the
            // sync layer treats them identically.
            if (taskSpec && taskSpec.mode !== "none") {
              const task = {
                id: "t_" + Date.now(),
                title: a.name,
                category: a.pillar,
                activityType: a.name,
                activityId: a.id,
                required: taskSpec.mode === "daily" || taskSpec.mode === "weekly",
                starValue: taskSpec.stars || (taskSpec.mode === "bonus" ? 3 : 5),
                proofRequired: false,
                proofType: null,
                approvalRequired: true,
                mode: "both",
                minutes: 15,
              };
              if (taskSpec.mode === "weekly" && Array.isArray(taskSpec.days) && taskSpec.days.length > 0) task.days = [...taskSpec.days];
              addTask(task);
            }
            setAdding(false);
          }}
        />
      )}
      <div className="text-[11px] text-slate-400 px-1 mt-3">{i18nTOf("manage_act_hint", "Edit, pause, archive, or add anything — hockey, rugby, whatever's next. Each activity carries its own color strip and can track a daily streak.")}</div>
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
          {/* Weekly schedule toggle — when on, the Calendar surfaces
              a per-week day picker for this activity (basketball
              / swim / etc.). Days carry into todaysTasks via the
              pinnedToday bypass so a Tuesday basketball pick lands
              in today's to-do automatically. */}
          <button
            onClick={() => onUpdate(a.id, { weeklySchedule: !a.weeklySchedule })}
            className={`text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 ${a.weeklySchedule ? "bg-violet-600 text-white" : "bg-violet-50 text-violet-700"}`}
            title="When on, parent picks specific days each week on the Calendar"
          >
            🗓️ {a.weeklySchedule ? "Weekly schedule on" : "Weekly schedule"}
          </button>
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

function AddActivityForm({ onCancel, onAdd, dailyRequiredCount = 8 }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#7c3aed");
  const [pillar, setPillar] = useState("brain");
  // Replaces the old asTask on/off toggle with the same 4-option
  // schedule picker the PresetPicker uses — Mike's onboarding ask.
  const [scheduleMode, setScheduleMode] = useState("daily"); // 'daily' | 'weekly' | 'bonus' | 'none'
  const [days, setDays] = useState([]);
  const [stars, setStars] = useState(5);
  const [address, setAddress] = useState("");
  const toggleDay = (d) => setDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);
  const ready = name.trim().length > 0 && (scheduleMode !== "weekly" || days.length > 0);
  return (
    <Card className="p-4 mt-2">
      <div className="font-bold text-sm mb-2">Add an activity</div>
      <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Chess Club, Painting Minis" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" /></Field>
      <div className="mt-3"><Field label="Address (optional)"><input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Where it happens — for whoever drives him" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" /></Field></div>
      <div className="mt-3 text-xs font-semibold text-slate-500 mb-1">Pillar</div>
      <div className="grid grid-cols-3 gap-2">{Object.entries(PILLARS).map(([k, p]) => <button key={k} onClick={() => setPillar(k)} className={`py-2 rounded-xl text-xs font-semibold ${pillar === k ? "text-white" : "bg-slate-100 text-slate-500"}`} style={pillar === k ? { background: p.color } : {}}>{p.emoji} {p.label}</button>)}</div>
      <div className="mt-3 text-xs font-semibold text-slate-500 mb-1">Color strip</div>
      <div className="flex flex-wrap gap-1.5">{ACT_PALETTE.map((c) => <button key={c} onClick={() => setColor(c)} className="w-8 h-8 rounded-lg" style={{ background: c, outline: color === c ? "2px solid #1e293b" : "none", outlineOffset: "1px" }} />)}</div>
      <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3">
        <div className="text-[11px] uppercase tracking-wider font-bold text-amber-700 mb-2">
          How should it show up?
        </div>
        <div className="space-y-1.5">
          {[
            { id: "daily",  emoji: "📅", label: "Daily must-do",       hint: `On the Top ${dailyRequiredCount} every day` },
            { id: "weekly", emoji: "🗓️", label: "Specific days only",   hint: "Pick which weekdays" },
            { id: "bonus",  emoji: "✨", label: "Bonus",                hint: `Optional — not on the Top ${dailyRequiredCount}` },
            { id: "none",   emoji: "🌱", label: "Just the activity",    hint: "Skip the task for now" },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setScheduleMode(opt.id)}
              className={`w-full flex items-start gap-2 rounded-xl px-2.5 py-2 text-left border-2 transition ${scheduleMode === opt.id ? "bg-white border-amber-500" : "bg-white/60 border-transparent"}`}
            >
              <span className="text-base shrink-0">{opt.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-extrabold text-slate-800">{opt.label}</div>
                <div className="text-[10px] text-slate-500 leading-snug">{opt.hint}</div>
              </div>
              <span className={`w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 ${scheduleMode === opt.id ? "bg-amber-500 border-amber-500" : "border-slate-300"}`} />
            </button>
          ))}
        </div>
        {scheduleMode === "weekly" && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {SCHEDULE_DAYS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => toggleDay(d)}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${days.includes(d) ? "bg-amber-500 text-white" : "bg-white border border-amber-200 text-amber-700"}`}
              >
                {SCHEDULE_DAY_SHORT[d]}
              </button>
            ))}
          </div>
        )}
        {scheduleMode === "weekly" && days.length === 0 && (
          <div className="text-[10px] text-rose-600 mt-1.5">Pick at least one day, or switch to another option.</div>
        )}
        {scheduleMode !== "none" && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-slate-500">Stars:</span>
            {[3, 5, 10].map((n) => (
              <button
                key={n}
                onClick={() => setStars(n)}
                className={`px-3 py-1 rounded-lg text-sm font-bold ${stars === n ? "bg-amber-400 text-white" : "bg-white border border-amber-200 text-amber-700"}`}
              >
                {n}⭐
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-2 mt-4">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-500 font-bold text-sm">Cancel</button>
        <button
          disabled={!ready}
          onClick={() => onAdd(
            { id: "a_" + Date.now(), name: name.trim(), short: name.trim().split(" ")[0], color, pillar, status: "active", note: "", address: address.trim(), schedule: [], starValue: stars },
            { mode: scheduleMode, days, stars }
          )}
          className={`flex-1 py-2.5 rounded-xl font-bold text-sm text-white ${ready ? "bg-indigo-600" : "bg-slate-200 text-slate-400"}`}
        >
          Add
        </button>
      </div>
    </Card>
  );
}

// ===================== PARENT: TASKS & CHORES =====================
// Generic chore presets — common across most families with kids. Parent
// picks what's true for their household. Each adds as a normal task
// in the Chores activity category with sensible default star value.
const CHORE_PRESETS = [
  "Make your bed",
  "Brush teeth (morning)",
  "Brush teeth (night)",
  "Take a shower",
  "Get dressed",
  "Tidy your room",
  "Put away laundry",
  "Set the table",
  "Clear the table",
  "Wash the dishes",
  "Load the dishwasher",
  "Unload the dishwasher",
  "Take out the trash",
  "Feed the dog",
  "Walk the dog",
  "Feed the cat",
  "Water the plants",
  "Pack school bag",
  "Pack lunch",
  "Practice instrument",
  "Read for 20 minutes",
  "Help cook dinner",
  "Vacuum",
  "Sweep the floor",
];

function ChorePresetPicker({ existingTitles, onAdd, onClose }) {
  const [picked, setPicked] = useState(() => new Set());
  const isExisting = (title) => existingTitles.has(title.toLowerCase());
  const togglePick = (title) => setPicked((prev) => {
    const next = new Set(prev);
    if (next.has(title)) next.delete(title); else next.add(title);
    return next;
  });
  const submit = () => {
    const adds = [];
    for (const title of CHORE_PRESETS) {
      if (!picked.has(title)) continue;
      adds.push({
        id: "t_" + title.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 20) + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 5),
        title,
        category: "Chores",
        activityType: "Chores",
        activityId: "a_chores",
        required: false,
        starValue: 3,
        proofRequired: false,
        proofType: null,
        approvalRequired: true,
        mode: "both",
        minutes: 5,
      });
    }
    if (adds.length > 0) onAdd(adds);
    onClose();
  };
  return (
    <Card className="p-4 mb-2">
      <div className="flex items-center justify-between mb-2">
        <div className="font-bold text-sm">Chore presets</div>
        <button onClick={onClose} className="text-slate-400 text-xs font-bold">Close</button>
      </div>
      <div className="text-[11px] text-slate-400 mb-3">Tap the chores that apply to your kid. They'll be added at 3⭐ each — you can adjust per row afterward.</div>
      <div className="flex flex-wrap gap-1.5">
        {CHORE_PRESETS.map((title) => {
          const taken = isExisting(title);
          const sel = picked.has(title);
          return (
            <button
              key={title}
              type="button"
              disabled={taken}
              onClick={() => togglePick(title)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition ${
                taken ? "bg-slate-100 text-slate-300 line-through cursor-not-allowed" :
                sel ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              {title}
              {taken && <span className="ml-1 text-[9px]">already added</span>}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={onClose} className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-500 font-bold text-xs">Cancel</button>
        <button
          disabled={picked.size === 0}
          onClick={submit}
          className={`flex-1 py-2 rounded-xl font-bold text-xs text-white ${picked.size === 0 ? "bg-slate-300" : "bg-indigo-600"}`}
        >
          Add {picked.size} {picked.size === 1 ? "chore" : "chores"}
        </button>
      </div>
    </Card>
  );
}

function ManageTasks({ tasks, updateTask, removeTask, addTask, activities }) {
  const [panel, setPanel] = useState(null); // null | 'chore' | 'task' | 'chorepresets'
  const existingTaskTitles = useMemo(
    () => new Set((tasks || []).map((t) => (t.title || "").toLowerCase())),
    [tasks]
  );
  const addManyChores = (items) => {
    for (const t of items) addTask(t);
  };
  return (
    <>
      <div className="flex gap-2 mb-2">
        <button onClick={() => setPanel(panel === "chorepresets" ? null : "chorepresets")} className="flex-1 py-2.5 rounded-2xl bg-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center gap-1"><Plus size={15} /> Chore presets</button>
        <button onClick={() => setPanel(panel === "chore" ? null : "chore")} className="flex-1 py-2.5 rounded-2xl bg-slate-700 text-white font-bold text-sm flex items-center justify-center gap-1"><Plus size={15} /> {i18nTOf("manage_tasks_chore_btn", "Chore")}</button>
        <button onClick={() => setPanel(panel === "task" ? null : "task")} className="flex-1 py-2.5 rounded-2xl bg-indigo-600 text-white font-bold text-sm flex items-center justify-center gap-1"><Plus size={15} /> {i18nTOf("manage_tasks_task_btn", "Task")}</button>
      </div>
      {panel === "chorepresets" && <ChorePresetPicker existingTitles={existingTaskTitles} onAdd={addManyChores} onClose={() => setPanel(null)} />}
      {panel === "chore" && <AddChoreForm onAdd={(t) => { addTask(t); setPanel(null); }} onCancel={() => setPanel(null)} />}
      {panel === "task" && <AddTaskForm activities={activities} onAdd={(t) => { addTask(t); setPanel(null); }} onCancel={() => setPanel(null)} />}
      {tasks.map((t) => <TaskEditRow key={t.id} t={t} activities={activities} updateTask={updateTask} removeTask={removeTask} />)}
      <div className="text-[11px] text-slate-400 px-1 mt-3">{i18nTOf("manage_tasks_hint", "Add a chore (feed the dog), a one-off task (recital sheet music), pause anything, or remove it. Paused tasks drop off the board but keep their history.")}</div>
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
            : <div className="font-bold text-sm flex-1 min-w-0">{i18nTitleOf(t)}</div>}
          <div className="flex items-center gap-1 shrink-0"><input type="number" value={t.starValue} onChange={(e) => updateTask(t.id, { starValue: Number(e.target.value) })} className="w-12 border border-slate-200 rounded px-1.5 py-0.5 text-sm" /><span className="text-xs">⭐</span></div>
          <button
            onClick={() => setEdit((v) => !v)}
            className="p-1 text-slate-400 hover:text-slate-600 active:scale-90 shrink-0"
            aria-label={edit ? i18nTOf("act_close", "Close") : i18nTOf("act_edit", "Edit")}
          >
            {edit ? <X size={16} /> : <Pencil size={15} />}
          </button>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: d.color + "22", color: d.color }}>{d.label}</span>
          <button onClick={() => updateTask(t.id, { required: !t.required })} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${t.required ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-400"}`}>{t.required ? i18nTOf("manage_tasks_required", "Required") : i18nTOf("manage_tasks_optional", "Optional")}</button>
          <button onClick={() => updateTask(t.id, { proofRequired: !t.proofRequired, proofType: !t.proofRequired ? (t.proofType || "photo") : t.proofType })} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${t.proofRequired ? "bg-sky-100 text-sky-600" : "bg-slate-100 text-slate-400"}`}>{t.proofRequired ? i18nTOf("manage_tasks_needs_photo", "Needs photo") : i18nTOf("manage_tasks_no_proof", "No proof")}</button>
          <button
            onClick={() => updateTask(t.id, { anyDay: !t.anyDay })}
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${t.anyDay ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-400"}`}
            title={t.anyDay
              ? "Available every day — ignores the mode/days schedule"
              : "Tap to make this available every day"
            }
          >
            {t.anyDay ? "🗓️ Any day" : "Fixed days"}
          </button>
          <span className="text-[10px] text-slate-400">{t.anyDay ? "any day" : (t.mode === "both" ? i18nTOf("manage_tasks_every_day", "every day") : `${t.mode} ${i18nTOf("manage_tasks_only", "only")}`)}{t.active === false ? ` · ${i18nTOf("manage_tasks_paused", "paused")}` : ""}</span>
        </div>
        {edit && (
          <>
            {/* Per-task Spanish title override — Phase 2 multilingual.
                Lets a parent translate custom tasks ("Tidy desk" →
                "Ordenar el escritorio") so they read correctly in
                Spanish-only / Both modes. Seeded tasks already
                translate via the Phase 1 static map; this input wins
                when a value is present. */}
            <div className="mt-2 bg-slate-50 rounded-xl p-2.5">
              <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1.5">
                Spanish name <span className="font-normal text-slate-400 normal-case">(optional)</span>
              </div>
              <input
                value={(t.nameI18n && t.nameI18n.es) || ""}
                onChange={(e) => {
                  const next = { ...(t.nameI18n || {}) };
                  const v = e.target.value;
                  if (v && v.trim()) next.es = v;
                  else delete next.es;
                  updateTask(t.id, { nameI18n: next });
                }}
                placeholder="e.g. Ordenar el escritorio"
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-white"
              />
              <div className="text-[10px] text-slate-400 mt-1">
                Shows in Spanish / Both mode. Leave blank to keep English everywhere.
              </div>
            </div>

            <StatTemplatePicker t={t} updateTask={updateTask} />

            <div className="flex gap-2 mt-2">
              <button onClick={() => updateTask(t.id, { active: t.active === false })} className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold">{t.active === false ? i18nTOf("manage_act_un_pause", "Un-pause") : i18nTOf("manage_act_pause", "Pause")}</button>
              <button onClick={() => removeTask(t.id)} className="px-3 py-2 rounded-xl bg-rose-100 text-rose-600 text-xs font-bold flex items-center gap-1"><X size={14} /> {i18nTOf("act_remove", "Remove")}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// StatTemplatePicker — surfaces in TaskEditRow's expanded panel.
// Lets a parent assign a pre-built stat schema (drums, piano,
// basketball, soccer, hockey, etc.) to a task. When set, iteration
// 2 of the activity-stats system will render submit-sheet inputs +
// the Stats hero card directly from this schema instead of branching
// on hard-coded proofType strings.
//
// v1 design choices:
//   - Templates only, no custom field editor yet (Plan B iter 3).
//   - Drums / Reading / Photo tasks (proofType set) keep the
//     existing special-case branches; a template assignment is
//     additive metadata until iteration 2 wires it in.
//   - Picking a template overwrites statSchema in place. We don't
//     merge — keeping the operation predictable for the parent.
//   - "None" clears the schema. Useful when a parent picks the
//     wrong template by accident.
function StatTemplatePicker({ t, updateTask }) {
  const [open, setOpen] = useState(false);
  const currentId = t.statSchema?.templateId || null;
  const currentLabel = currentId ? templateLabel(currentId) : null;
  return (
    <div className="mt-2 bg-slate-50 rounded-xl p-2.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between text-left"
      >
        <div>
          <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
            Stats template <span className="font-normal text-slate-400 normal-case">(optional)</span>
          </div>
          <div className="text-[12px] font-bold text-slate-700 mt-0.5">
            {currentLabel || "None — basic notes + photo only"}
          </div>
        </div>
        <ChevronLeft
          size={14}
          className={`text-slate-400 transition-transform ${open ? "-rotate-90" : "rotate-180"}`}
        />
      </button>
      {open && (
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => { updateTask(t.id, { statSchema: {} }); setOpen(false); }}
            className={`text-[11px] font-bold px-2 py-1.5 rounded-lg border ${
              !currentId ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200"
            }`}
          >
            None
          </button>
          {STAT_TEMPLATE_LIST.map((tmpl) => {
            const active = currentId === tmpl.id;
            return (
              <button
                key={tmpl.id}
                type="button"
                onClick={() => { updateTask(t.id, { statSchema: schemaFromTemplate(tmpl.id) }); setOpen(false); }}
                className={`text-[11px] font-bold px-2 py-1.5 rounded-lg border flex items-center gap-1.5 ${
                  active ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200"
                }`}
                title={`${tmpl.label} — ${tmpl.practice.length} practice field${tmpl.practice.length === 1 ? "" : "s"}${tmpl.game ? ` + game stats` : ""}`}
              >
                <span>{tmpl.icon}</span>
                <span className="truncate">{tmpl.label}</span>
              </button>
            );
          })}
        </div>
      )}
      {currentId && !open && (
        <div className="text-[10px] text-slate-400 mt-1.5 leading-snug">
          Adds the template's practice (and game-day) fields to the submit sheet, and renders them on the stats hero card.
        </div>
      )}
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
        <button onClick={() => setRequired((v) => !v)} className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${required ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-400"}`}>{required ? i18nTOf("manage_tasks_required", "Required") : i18nTOf("manage_tasks_optional", "Optional")}</button>
        <button onClick={() => setProof((v) => !v)} className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${proof ? "bg-sky-100 text-sky-600" : "bg-slate-100 text-slate-400"}`}>{proof ? i18nTOf("manage_tasks_needs_photo", "Needs photo") : i18nTOf("manage_tasks_no_proof", "No proof")}</button>
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
function EasyChecklist({ todaysTasks, todaysTopEight = [], compByTask, submitTask, undoTask, user, users = [], mode, priorities, activities, onFull, familyId }) {
  const onPhoto = async (t, file) => {
    if (!file) return;
    try {
      const { path, name } = await uploadFamilyPhoto({ file, familyId, kind: "proof" });
      const geo = await captureLocation();
      submitTask(t.id, { proof: [{ type: "photo", name, path, geo, by: user.id, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }] });
    } catch (err) {
      toast.error("Photo upload failed: " + (err.message || err));
    }
  };
  // Easy Mode source list — Mike's rule: "for Easy Mode, it should
  // include all Board Game required items. If it's 8 it should show
  // all 8." Top 8 is the canonical "what matters today" list, so
  // Easy Mode mirrors it. Falls back to must/today priorities when
  // there's no Top 8 set (early-onboarding family), then to required
  // tasks (older grandparent flow). This way a babysitter sees the
  // SAME plan the parent curated on the board, not a separately-
  // derived priority slice that might miss items.
  const top8Ids = new Set((todaysTopEight || []).map((t) => t.id));
  const fromTop8 = todaysTasks.filter((t) => top8Ids.has(t.id));
  const essentials = todaysTasks.filter((t) => { const lvl = levelOf(t, mode, priorities); return lvl === "must" || lvl === "today"; });
  const sourceList = fromTop8.length > 0
    ? fromTop8
    : (essentials.length ? essentials : todaysTasks.filter((t) => t.required));
  const ordered = sortByLevel(sourceList, mode, priorities);
  const remaining = ordered.filter((t) => { const c = compByTask[t.id]; return !(c?.status === "approved" || c?.status === "pending"); });
  const allDone = remaining.length === 0;
  return (
    <div className="px-4 pt-4 pb-10">
      <div className="rounded-3xl p-5 text-white text-center" style={{ background: "linear-gradient(135deg,#f59e0b,#ec4899)" }}>
        <div className="text-2xl font-extrabold">Hi {user.name}! 💛</div>
        <div className="text-base opacity-95 mt-1">{allDone ? "Everything's done — go relax! 🎉" : `Just ${remaining.length} important thing${remaining.length > 1 ? "s" : ""} today.`}</div>
      </div>

      {allDone ? (
        <div className="text-center py-12"><div className="text-6xl mb-3">🎉</div><div className="text-xl font-extrabold text-slate-700">All done!</div><div className="text-slate-400 mt-1 px-6">{(() => { const kid = users.find((u) => u.role === "kid"); return kid?.name ? `${kid.name}'s must-dos are finished.` : "The must-dos are finished."; })()} Put your feet up — you've got this.</div></div>
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
                  <div className="flex-1 min-w-0"><div className={`text-xl font-extrabold leading-tight ${done ? "text-slate-400 line-through" : ""}`}>{i18nTitleOf(t)}</div><div className="text-sm text-slate-400 mt-0.5">{done ? "Done ✓" : `${t.minutes} min`}</div></div>
                  {done && <button onClick={() => undoTask(t.id)} className="shrink-0 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-500 text-sm font-bold flex items-center gap-1"><RotateCcw size={16} /> Undo</button>}
                </div>
                {!done && (
                  <div className="flex gap-2 mt-4">
                    <button disabled={!canMark} onClick={() => submitTask(t.id, {})} className={`flex-1 py-4 rounded-2xl text-white text-lg font-extrabold flex items-center justify-center gap-2 ${canMark ? "bg-emerald-500 active:scale-95" : "bg-slate-200 text-slate-400"}`}><Check size={24} /> {canMark ? "Done!" : "Parent only"}</button>
                    <label className="w-16 rounded-2xl bg-slate-100 grid place-items-center cursor-pointer active:scale-95"><Camera size={24} className="text-slate-500" /><input type="file" accept="image/*" className="hidden" onChange={(e) => onPhoto(t, e.target.files?.[0])} /></label>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {(() => {
        const parents = users.filter((u) => u.role === "parent" && u.active !== false).slice(0, 2);
        if (parents.length === 0) return null;
        return (
          <div className="mt-7">
            <div className="text-xs font-bold text-slate-400 text-center mb-2">Need a grown-up?</div>
            <div className={`grid gap-2 ${parents.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
              {parents.map((p) => {
                const href = p.email ? `mailto:${encodeURIComponent(p.email)}` : "#";
                return (
                  <a key={p.id} href={href} className="py-4 rounded-2xl bg-rose-500 text-white text-center font-extrabold flex items-center justify-center gap-2 active:scale-95">
                    <Phone size={20} /> {p.relationship || p.name}
                  </a>
                );
              })}
            </div>
          </div>
        );
      })()}
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
      toast.error("Photo upload failed: " + (err.message || err));
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
      <SectionTitle icon={<ClipboardList size={16} className="text-teal-500" />}>{i18nTOf("sec_todays_checklist", "Today's checklist")} <span className="text-[11px] font-normal text-slate-400">· {i18nTOf("hint_most_important_first", "most important first")}</span></SectionTitle>
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
                <div className="font-semibold text-sm">{i18nTitleOf(t)}</div>
                <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                  <PriorityBadge level={lvl} scope={ov?.scope} />
                  <span className="text-[11px] text-slate-400">{c ? STATUS_LABEL(c.status) : `${t.minutes} min`}</span>
                </div>
              </div>
              {!done && (
                <label className="shrink-0 w-9 h-9 rounded-xl bg-white border border-slate-200 grid place-items-center cursor-pointer active:scale-95">
                  <Camera size={16} className="text-slate-500" />
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => onPhoto(t, e.target.files?.[0])} />
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

function CareInfo({ users = [] }) {
  // Build contacts from this family's actual parents — no hardcoded
  // names. Email is the contact channel (we don't collect phones yet).
  // Emergency + Pediatrician are generic and the same for every family.
  const parents = (users || []).filter((u) => u.role === "parent" && u.active !== false);
  const contacts = [
    ...parents.map((p) => ({
      label: p.relationship ? `${p.relationship} (${p.name})` : p.name,
      value: p.email || "—",
    })),
    { label: "Emergency", value: "911" },
    { label: "Pediatrician", value: "—" },
  ];
  return (
    <div className="px-4 pt-4">
      <h2 className="font-extrabold text-lg px-1 mb-2">Care & Contacts</h2>
      <SectionTitle icon={<Phone size={16} className="text-rose-500" />}>{i18nTOf("sec_contacts", "Contacts")}</SectionTitle>
      {contacts.map((c) => (
        <Card key={c.label} className="p-3 mb-2 flex items-center justify-between gap-3">
          <span className="text-sm font-semibold shrink-0">{c.label}</span>
          <span className="text-sm text-slate-500 truncate">{c.value}</span>
        </Card>
      ))}
      <SectionTitle icon={<Heart size={16} className="text-rose-500" />}>{i18nTOf("sec_care_notes", "Care notes")}</SectionTitle>
      <Card className="p-3 mb-2 text-sm text-slate-400 italic">
        No care notes yet. Parents can add allergies, routines, and other helper
        notes from the Profile screen later.
      </Card>
    </div>
  );
}

// ===================== BOTTOM NAV =====================
// Beta feedback chip — pinned bottom-right above the nav so any
// confused parent on any screen can fire off a note. Mailto link so it
// works on every device with no install, prefills subject + a body
// stub. We don't auto-attach screenshots — the parent can if they
// want to. Email destination is a familySetting so Mike can change
// it later without a redeploy.
// Global fuzzy search across every entity Mike + Krissie commonly hunt
// for: tasks, books, songs, activities, rewards, events, shopping
// items, recent completions. Tap a result → close modal + navigate
// to the right place via the parent-supplied onPick handlers.
// Pages searchable from the global TopBar search. Krissie's quote
// 2026-06-15: "the global search should include all our more options.
// We have so many options now it can get lost easy. Take too long to
// scroll." Each entry routes through the existing pendingMoreSub +
// setTab flow so we don't need a new navigator — onPickPage in App
// fans out by kind.
const SEARCH_PAGES = [
  { key: "library",        kind: "more", label: "Reading Library",        keywords: "books read reading" },
  { key: "music_library",  kind: "more", label: "Music Library",          keywords: "songs music tracks album" },
  { key: "gallery",        kind: "more", label: "Photo Gallery",          keywords: "photos pictures images memories" },
  { key: "practice",       kind: "more", label: "Practice Timer",         keywords: "timer stopwatch session minutes" },
  { key: "shopping",       kind: "more", label: "Shopping List",          keywords: "grocery store list" },
  { key: "insights",       kind: "more", label: "Insights",               keywords: "stats analytics charts trends" },
  { key: "recap",          kind: "more", label: "Recap & Memories",       keywords: "memories summary anniversary recap" },
  { key: "awards",         kind: "more", label: "Accomplishments",        keywords: "awards trophies belts certificates report card" },
  { key: "skills",         kind: "more", label: "Learning Goals",         keywords: "skills learning goals progress" },
  { key: "grades",         kind: "more", label: "Grade Goals",            keywords: "standards school common core grades" },
  { key: "board_plan",     kind: "more", label: "Daily Adventure Board · Plan", keywords: "plan top eight today's plan" },
  { key: "board_theme",    kind: "more", label: "Adventure Board",        keywords: "board game theme volcano dino" },
  { key: "tasks",          kind: "more", label: "Tasks & Chores",         keywords: "chores tasks todo" },
  { key: "activities",     kind: "more", label: "Activities & Status",    keywords: "activities drums swim soccer" },
  { key: "people",         kind: "more", label: "Family & Helpers",       keywords: "family people helpers invite share view-only grandparents grandma babysitter aunt uncle dad mom" },
  { key: "slideshow",      kind: "more", label: "Milestone Slideshows",   keywords: "slideshow milestones anniversary" },
  { key: "email",          kind: "more", label: "Email Setup",            keywords: "email digest newsletter friday" },
  { key: "siri",           kind: "more", label: "Siri Shortcuts",         keywords: "siri voice shortcut hey siri" },
  { key: "privacy",        kind: "more", label: "Privacy & Safety",       keywords: "privacy password lock safety" },
  { key: "audit",          kind: "more", label: "Data Audit",             keywords: "audit check drift orphans" },
  { key: "languages",      kind: "more", label: "Languages",              keywords: "language spanish english bilingual" },
  { key: "export",         kind: "more", label: "Data Export",            keywords: "export csv download backup" },
  { key: "portfolio",      kind: "more", label: "Progress Portfolio",     keywords: "portfolio photos writing art" },
  { key: "weekly",         kind: "more", label: "Weekly Summary",         keywords: "weekly summary recap" },
  { key: "handoff",        kind: "more", label: "Handoff Notes",          keywords: "handoff notes next adult babysitter" },
];

function SearchSheet({ onClose, tasks = [], activities = [], books = [], songs = [], rewards = [], events = [], shoppingItems = [], completions = [], users = [], onPickTask, onPickCompletion, onPickEvent, onPickShopping, onPickReward, onPickActivity, onPickBook, onPickSong, onPickPage }) {
  const [q, setQ] = useState("");
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const taskById = Object.fromEntries((tasks || []).map((t) => [t.id, t]));
  const activityById = Object.fromEntries((activities || []).map((a) => [a.id, a]));

  const norm = (s) => (s || "").toLowerCase().trim();
  const match = (text) => {
    const txt = norm(text);
    const nq = norm(q);
    if (!nq) return null;
    const m = fuzzyMatch(nq, txt);
    return m.hit ? m.score : null;
  };

  const results = useMemo(() => {
    if (!q.trim()) return null;
    const buckets = {
      Pages:     [],
      Tasks:     [],
      Books:     [],
      Songs:     [],
      Activities:[],
      Rewards:   [],
      Events:    [],
      "Shopping list": [],
      "Recent completions": [],
    };

    // Pages first — Krissie's frustration was that she'd lose time
    // scrolling More to find a page she knew the name of. Searching
    // "reading library" or "shopping" now jumps her straight there.
    for (const p of SEARCH_PAGES) {
      const s = match(p.label) ?? match(p.keywords);
      if (s != null) buckets.Pages.push({
        score: s,
        label: p.label,
        sub: i18nTOf("search_open_page", "Open page"),
        color: "#6366f1",
        onPick: () => onPickPage && onPickPage(p),
      });
    }

    for (const t of tasks) {
      const s = match(t.title);
      if (s != null) buckets.Tasks.push({ score: s, label: t.title, sub: t.activityType, color: activityById[t.activityId]?.color, onPick: () => onPickTask && onPickTask(t) });
    }
    for (const b of books) {
      const s = match(b.canonicalTitle || b.title) ?? match(b.canonicalAuthor || b.author);
      if (s != null) buckets.Books.push({ score: s, label: b.canonicalTitle || b.title, sub: b.canonicalAuthor || b.author || "", color: "#3b82f6", onPick: () => onPickBook && onPickBook(b) });
    }
    for (const sg of songs) {
      const s = match(sg.canonicalTitle || sg.title) ?? match(sg.canonicalArtist || sg.artist);
      if (s != null) buckets.Songs.push({ score: s, label: sg.canonicalTitle || sg.title, sub: sg.canonicalArtist || sg.artist || "", color: "#7c3aed", onPick: () => onPickSong && onPickSong(sg) });
    }
    for (const a of activities) {
      if (a.status === "archived") continue;
      const s = match(a.name) ?? match(a.short);
      if (s != null) buckets.Activities.push({ score: s, label: a.name, sub: a.pillar, color: a.color, onPick: () => onPickActivity && onPickActivity(a) });
    }
    for (const r of rewards) {
      const s = match(r.title);
      if (s != null) buckets.Rewards.push({ score: s, label: r.title, sub: `${r.starCost || 0} ⭐`, color: "#f59e0b", onPick: () => onPickReward && onPickReward(r) });
    }
    for (const e of events) {
      const s = match(e.title) ?? match(e.notes) ?? match(e.address);
      if (s != null) buckets.Events.push({ score: s, label: e.title, sub: e.date || (Number.isInteger(e.recurWeekday) ? `every ${WEEKDAY_NAMES_FULL[e.recurWeekday]}` : ""), color: "#10b981", onPick: () => onPickEvent && onPickEvent(e) });
    }
    for (const it of shoppingItems) {
      if (it.checked) continue;
      const s = match(it.title) ?? match(it.brand);
      if (s != null) buckets["Shopping list"].push({ score: s, label: it.title, sub: it.listName + (it.brand ? ` · ${it.brand}` : ""), color: "#ec4899", onPick: () => onPickShopping && onPickShopping(it) });
    }
    for (const c of (completions || []).slice(-200)) {
      const t = taskById[c.taskId];
      if (!t) continue;
      const s = match(t.title) ?? match(c.notes);
      if (s != null) buckets["Recent completions"].push({ score: s, label: t.title, sub: c.completionDate + (c.status === "approved" ? " ✓" : c.status === "pending" ? " · pending" : ""), color: activityById[t.activityId]?.color || "#64748b", onPick: () => onPickCompletion && onPickCompletion(c) });
    }

    for (const k of Object.keys(buckets)) {
      buckets[k].sort((a, b) => b.score - a.score);
      buckets[k] = buckets[k].slice(0, 8);
    }
    return buckets;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, tasks, books, songs, activities, rewards, events, shoppingItems, completions]);

  const totalHits = results ? Object.values(results).reduce((acc, arr) => acc + arr.length, 0) : 0;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/50 flex items-start justify-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md mx-auto mt-12 mb-12 bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col"
        style={{ maxHeight: "calc(100vh - 6rem)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 p-3 border-b border-slate-100 shrink-0">
          <Search size={16} className="text-slate-400 shrink-0" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Find a task, book, song, event, anything…"
            autoFocus
            className="flex-1 px-1 py-1 text-base font-semibold outline-none bg-transparent"
          />
          <button onClick={onClose} className="text-xs font-bold text-slate-400 px-2 py-1">Close</button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {!q.trim() && (
            <div className="text-[12px] text-slate-400 p-4 leading-snug">
              Start typing. Search covers tasks, books, songs, activities, rewards, calendar events, shopping items, and recent completions.
            </div>
          )}
          {q.trim() && totalHits === 0 && (
            <div className="text-[12px] text-slate-400 p-4 text-center">
              Nothing matching <em>"{q}"</em> across the app.
            </div>
          )}
          {q.trim() && totalHits > 0 && Object.entries(results).map(([group, arr]) => (
            arr.length === 0 ? null : (
              <div key={group} className="mb-3">
                <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1.5 px-1">{group} · {arr.length}</div>
                {arr.map((r, i) => (
                  <button
                    key={i}
                    onClick={r.onPick}
                    className="w-full flex items-start gap-2 p-2.5 mb-1 rounded-xl border border-slate-100 bg-white active:scale-[0.99] text-left"
                  >
                    <div className="w-1.5 self-stretch rounded-full shrink-0" style={{ background: r.color || "#94a3b8", minHeight: "2rem" }} />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm truncate">{r.label}</div>
                      {r.sub && <div className="text-[11px] text-slate-500 truncate">{r.sub}</div>}
                    </div>
                    <ChevronRight size={14} className="text-slate-300 shrink-0 mt-1" />
                  </button>
                ))}
              </div>
            )
          ))}
        </div>
      </div>
    </div>
  );
}

function BetaFeedbackChip({ kidName }) {
  const subject = encodeURIComponent("Family Command Center — beta feedback");
  const body = encodeURIComponent(
    `\n\n—\nKid: ${kidName || "(unknown)"}\nPage: (paste a screenshot here if helpful)\nWhat went wrong / what could be better:\n`
  );
  const href = `mailto:lyncho14@gmail.com?subject=${subject}&body=${body}`;
  return (
    <a
      href={href}
      className="fixed right-3 flex items-center gap-1 bg-amber-500 text-white text-[10px] font-extrabold px-2 py-1 rounded-full shadow-lg active:scale-95"
      style={{ zIndex: 55, bottom: "calc(env(safe-area-inset-bottom) + 4.5rem)" }}
      title="Send Mike a note about this app"
    >
      <span aria-hidden>💬</span>
      <span>Beta · feedback</span>
    </a>
  );
}

function BottomNav({ user, tab, setTab, langs = ["en"] }) {
  // Bilingual labels — when the parent enables "Both" or "Spanish",
  // tab labels render as "Today / Hoy" etc. Brand-ish labels (Coach,
  // Quest, Duolingo) stay short so the bar doesn't blow out.
  const T = (k) => i18nTt(k, langs);
  const sets = {
    kid: [
      { k: "today", icon: Trophy, label: T("nav_missions") },
      { k: "board", icon: MapIcon, label: T("nav_board") },
      { k: "streaks", icon: Flame, label: T("nav_streaks") },
      { k: "dream", icon: Target, label: T("nav_dream") },
      { k: "rewards", icon: Gift, label: T("nav_rewards") },
      { k: "stars", icon: Star, label: T("nav_stars") },
      { k: "school", icon: GraduationCap, label: T("nav_quest") },
    ],
    parent: [
      { k: "today", icon: Home, label: T("nav_today") },
      { k: "approvals", icon: Check, label: T("nav_approve") },
      { k: "rewards", icon: Gift, label: T("nav_rewards") },
      { k: "calendar", icon: CalIcon, label: T("nav_calendar") },
      { k: "more", icon: ClipboardList, label: T("nav_more") },
      // "Coach" → Coach Mode (parent companion). The kid still calls it
      // Quest in his nav; the parent's nav surfaces the coaching seam.
      { k: "school", icon: GraduationCap, label: T("nav_coach") },
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
      className="relative flex-shrink-0 bg-white border-t border-slate-100 flex justify-around px-2 py-2"
      // App-shell rebuild 2026-06-16: BottomNav is now the last flex-child
      // of the 100dvh shell instead of position:fixed. Flex flow guarantees
      // it sits at the viewport bottom on EVERY page length — short pages
      // no longer drift it mid-screen, long pages no longer let iOS Safari's
      // visual-viewport quirk slide it off-screen during URL-bar transitions.
      // Kept z-50 so any scroll-container children (BoardGame chips, etc.)
      // paint UNDER the nav, not over it. Honor the iPhone home-indicator
      // safe area so the nav floats above the gesture bar.
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
