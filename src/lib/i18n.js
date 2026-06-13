// i18n.js — bilingual labels for Reznor's bilingual household.
//
// Phase 1: English + Spanish only. Mike's rule (memory:
// project_multilingual_roadmap): per-user toggle, brand names
// untranslated (Duolingo, Drumeo, Melodics, Drumscribe), some
// English kept around when langs include "es" so a learner doesn't
// get lost. Future phases add Italian / French / German etc.
//
// API:
//   activeLangs(prefs)           → ["en"] | ["es"] | ["en","es"]
//   joinLangs(map, langs)        → "English / Spanish" or just one
//   tt(map, langs, fallback)     → safer t() — never throws on missing
//
// Convention: every translatable string is a small map keyed by lang
// code. e.g. { en: "Make Bed", es: "Hacer la cama" }. Missing langs
// fall back to English, then to the supplied fallback, then to "".

export const LANG_LABELS = {
  en: "English",
  es: "Español",
};

// Top-level UI strings — keep this lean; we expand as we hit screens.
// Order of langs in activeLangs drives the "/" join order so the
// parent's chosen primary always reads first.
const STRINGS = {
  // Bottom nav — parent
  nav_today:     { en: "Today",    es: "Hoy" },
  nav_approve:   { en: "Approve",  es: "Aprobar" },
  nav_rewards:   { en: "Rewards",  es: "Premios" },
  nav_calendar:  { en: "Calendar", es: "Calendario" },
  nav_more:      { en: "More",     es: "Más" },
  nav_coach:     { en: "Coach",    es: "Coach" }, // brand-ish, leave
  // Bottom nav — kid
  nav_missions:  { en: "Missions", es: "Misiones" },
  nav_board:     { en: "Board",    es: "Tablero" },
  nav_streaks:   { en: "Streaks",  es: "Rachas" },
  nav_dream:     { en: "Dream",    es: "Sueño" },
  nav_stars:     { en: "Stars",    es: "Estrellas" },
  nav_quest:     { en: "Quest",    es: "Aventura" },

  // Common section headers
  sec_today_missions:   { en: "Today's missions", es: "Misiones de hoy" },
  sec_stars_earned:     { en: "Stars I've earned", es: "Estrellas ganadas" },
  sec_bonus_stars:      { en: "Bonus stars",       es: "Estrellas bonus" },
  sec_done:             { en: "Done",              es: "Hechas" },
  sec_still_to_do:      { en: "Still to do",       es: "Por hacer" },
  sec_extra_credit:     { en: "Extra credit",      es: "Crédito extra" },
  sec_needs_approval:   { en: "Needs approval",    es: "Falta aprobar" },

  // KidGameHome quest tile labels
  quest_label:    { en: "Quest",    es: "Misión" },
  quest_complete: { en: "Complete", es: "Completa" },

  // Common pillar labels
  pillar_brain: { en: "Brain", es: "Mente" },
  pillar_body:  { en: "Body",  es: "Cuerpo" },
  pillar_soul:  { en: "Soul",  es: "Alma" },

  // Common action labels
  act_submit:   { en: "Submit",   es: "Enviar" },
  act_save:     { en: "Save",     es: "Guardar" },
  act_cancel:   { en: "Cancel",   es: "Cancelar" },
  act_done:     { en: "Done",     es: "Hecho" },
  act_edit:     { en: "Edit",     es: "Editar" },
  act_delete:   { en: "Delete",   es: "Borrar" },
  act_remove:   { en: "Remove",   es: "Quitar" },
};

// Seeded task titles. Keyed by task.id from SEED_TASKS so the lookup
// is robust to title edits. Tasks added by the parent later don't
// have a translation by default — they show whatever was typed.
const TASK_TITLES = {
  t_eng:       { en: "English Reading",     es: "Lectura en inglés" },
  t_spa_read:  { en: "Spanish Reading",     es: "Lectura en español" },
  t_duo:       { en: "Duolingo",            es: "Duolingo" }, // brand
  t_spa_hour:  { en: "Spanish Power Hour",  es: "Hora de español" },
  t_write:     { en: "Writing Practice",    es: "Práctica de escritura" },
  t_math:      { en: "Math Practice",       es: "Práctica de matemáticas" },
  t_drums:     { en: "Drums",               es: "Batería" },
  t_art:       { en: "Art / Drawing",       es: "Arte / Dibujo" },
  t_move:      { en: "Movement",            es: "Movimiento" },
  t_swim:      { en: "Swim Class",          es: "Clase de natación" },
  t_tkd:       { en: "Taekwondo",           es: "Taekwondo" }, // brand
  t_hip:       { en: "Hip Hop Dance",       es: "Baile Hip Hop" },
  t_bed:       { en: "Make Bed",            es: "Hacer la cama" },
  t_toys:      { en: "Pick Up Toys",        es: "Recoger juguetes" },
  t_dishes:    { en: "Help With Dishes",    es: "Ayudar con los platos" },
  t_field:     { en: "Field Trip Journal",  es: "Diario de excursión" },
  t_church:    { en: "Church",              es: "Iglesia" },
};

// Seeded activity names. Keyed by activity.id.
const ACTIVITY_NAMES = {
  a_books:    { en: "Reading",      es: "Lectura" },
  a_eng_read: { en: "English reading", es: "Lectura en inglés" },
  a_spa:      { en: "Spanish",      es: "Español" },
  a_writing:  { en: "Writing",      es: "Escritura" },
  a_math:     { en: "Math",         es: "Matemáticas" },
  a_drums:    { en: "Drums",        es: "Batería" },
  a_art:      { en: "Art",          es: "Arte" },
  a_movement: { en: "Movement",     es: "Movimiento" },
  a_swim:     { en: "Swim",         es: "Natación" },
  a_tkd:      { en: "Taekwondo",    es: "Taekwondo" },
  a_dance:    { en: "Hip Hop Dance", es: "Baile Hip Hop" },
  a_chores:   { en: "Chores",       es: "Tareas" },
  a_field:    { en: "Field trips",  es: "Excursiones" },
  a_church:   { en: "Church",       es: "Iglesia" },
};

// Module-level current-langs holder so any component can call the
// translate helpers without prop-drilling `langs` through every
// signature. The App seeds this from a useEffect whenever the
// family setting changes. Components read from it via the
// no-arg shorthand functions below (titleOf / nameOf / tOf).
let _currentLangs = ["en"];
export function setCurrentLangs(next) {
  _currentLangs = Array.isArray(next) && next.length > 0 ? next : ["en"];
}
export function getCurrentLangs() { return _currentLangs; }

// Convenience: same as taskTitle/activityName/tt but read the
// module-level current langs. Use these in JSX so a screen doesn't
// need to thread langs from App down through 6 components.
export function titleOf(task) { return taskTitle(task, _currentLangs); }
export function nameOf(activity) { return activityName(activity, _currentLangs); }
export function tOf(key, fallback) { return tt(key, _currentLangs, fallback); }

export function activeLangs(prefs) {
  const raw = (prefs && prefs.displayLangs) || ["en"];
  // Always include en as a hard backstop so an Es-only family that
  // adds a new untranslated task still sees the underlying string.
  // The renderer can drop English in display when ["es"] is selected
  // but the data fallback is always available.
  if (!Array.isArray(raw) || raw.length === 0) return ["en"];
  return raw.filter((l) => l === "en" || l === "es");
}

// Render a string map according to active langs. If a lang isn't in
// the map, it's silently skipped — never blank entries in the join.
// Falls back to the supplied default text if no langs match at all.
export function joinLangs(map, langs, fallback = "") {
  if (!map) return fallback;
  const parts = [];
  for (const l of langs) {
    if (map[l]) parts.push(map[l]);
  }
  if (parts.length === 0) return map.en || fallback;
  // Dedup adjacent identical entries (brand names like "Duolingo" same
  // in both langs — don't repeat).
  const deduped = parts.filter((p, i) => p !== parts[i - 1]);
  return deduped.join(" / ");
}

// Look up a top-level string key. Used for nav labels / section
// headers / action buttons. Falls back to the key itself so a missing
// translation is at least debuggable in the UI rather than empty.
export function tt(key, langs, fallback) {
  return joinLangs(STRINGS[key], langs, fallback ?? key);
}

// Look up a seeded task's title.
export function taskTitle(task, langs) {
  if (!task) return "";
  const map = TASK_TITLES[task.id];
  if (map) return joinLangs(map, langs, task.title || "");
  // Untranslated custom task — show whatever the parent typed.
  return task.title || "";
}

// Look up a seeded activity's name.
export function activityName(activity, langs) {
  if (!activity) return "";
  const map = ACTIVITY_NAMES[activity.id];
  if (map) return joinLangs(map, langs, activity.name || activity.label || "");
  return activity.name || activity.label || "";
}
