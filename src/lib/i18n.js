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

  // Section titles — parent surfaces
  sec_needs_approval_full:  { en: "Needs approval",       es: "Falta aprobar" },
  sec_for_treasure:         { en: "Still to do",          es: "Por hacer" },
  sec_bonus:                { en: "Bonus",                es: "Extras" },
  sec_done_full:            { en: "Done",                 es: "Hechas" },
  sec_na_today:             { en: "N/A today",            es: "N/A hoy" },
  sec_handoff:              { en: "Handoff notes",        es: "Notas para el siguiente adulto" },
  sec_wishes_from:          { en: "Wishes from",          es: "Deseos de" },
  sec_redemption_requests:  { en: "Redemption requests",  es: "Solicitudes de premios" },
  sec_all_rewards:          { en: "All rewards",          es: "Todos los premios" },
  sec_song_log_changes:     { en: "Song log changes",     es: "Cambios al diario de canciones" },
  sec_streak_highlights:    { en: "Streak highlights",    es: "Mejores rachas" },
  sec_upcoming:             { en: "Upcoming",             es: "Próximos" },
  sec_photos:               { en: "Photos",               es: "Fotos" },

  // Section titles — kid surfaces
  sec_todays_wins:          { en: "Today's wins",         es: "Logros de hoy" },
  sec_trophy_case:          { en: "Trophy case",          es: "Trofeos" },
  sec_most_played:          { en: "Most played songs",    es: "Canciones más tocadas" },
  sec_rewards_to_work:      { en: "Rewards to work toward", es: "Premios por ganar" },
  sec_wish_new:             { en: "Wish for something new", es: "Pide un premio nuevo" },
  sec_choose_dreams:        { en: "Choose your dreams",   es: "Elige tus sueños" },
  sec_unlock_order:         { en: "Unlock order",         es: "Orden para desbloquear" },
  sec_reading_now:          { en: "Reading now",          es: "Leyendo ahora" },
  sec_finished:             { en: "Finished",             es: "Terminados" },
  sec_archive:              { en: "Archive",              es: "Archivo" },

  // Empty states (mostly kid + parent screens)
  empty_streaks:        { en: "No streaks yet — ask a parent to start tracking one!", es: "Sin rachas todavía — pídele a un adulto que empiece a llevar una." },
  empty_notes:          { en: "No notes yet.", es: "Sin notas todavía." },
  empty_approved_kid:   { en: "Nothing approved yet — go finish a mission! 🚀", es: "Nada aprobado todavía — ¡termina una misión! 🚀" },
  empty_awards:         { en: "Nothing yet — upload his first certificate or recital sheet.", es: "Nada todavía — sube el primer certificado o programa." },
  empty_photos:         { en: "No photos captured yet — helpers can snap them from the checklist.", es: "Sin fotos todavía — los adultos pueden tomarlas desde la lista." },
  empty_activities:     { en: "None yet.", es: "Ninguna todavía." },
  empty_pending_today:  { en: "Nothing waiting. 🎉", es: "Nada en espera. 🎉" },
  empty_all_caught_up:  { en: "All caught up! 🎉", es: "¡Al día! 🎉" },

  // Section titles — helper / care surfaces
  sec_todays_checklist:     { en: "Today's checklist",    es: "Lista de hoy" },
  sec_contacts:             { en: "Contacts",             es: "Contactos" },
  sec_care_notes:           { en: "Care notes",           es: "Notas de cuidado" },

  // Header hints
  hint_most_important_first: { en: "most important first", es: "lo más importante primero" },
  hint_for_treasure:         { en: "for the treasure 🏆",   es: "para el tesoro 🏆" },
  hint_extra_credit_not_required: { en: "extra credit, not required", es: "crédito extra, no obligatorio" },
  hint_tap_to_set_priority:  { en: "tap to set priority",   es: "tócalo para fijar prioridad" },
  hint_tap_to_restore:       { en: "tap to restore",        es: "tócalo para restaurar" },

  // KidGameHome quest tile labels
  quest_label:    { en: "Quest",    es: "Misión" },
  quest_complete: { en: "Complete", es: "Completa" },

  // Completion status — surfaced under task rows on the kid view and
  // in the per-day breakdown. Used to render flat English.
  status_not_started:  { en: "Not started",      es: "Sin empezar" },
  status_pending:      { en: "Pending approval", es: "Falta aprobar" },
  status_approved:     { en: "Approved",         es: "Aprobada" },
  status_needs_fix:    { en: "Needs fix",        es: "Necesita arreglo" },
  status_skipped:      { en: "Skipped",          es: "Omitida" },
  status_draft:        { en: "Draft",            es: "Borrador" },

  // Common pillar labels
  pillar_brain: { en: "Brain", es: "Mente" },
  pillar_body:  { en: "Body",  es: "Cuerpo" },
  pillar_soul:  { en: "Soul",  es: "Alma" },

  // Common action labels
  act_submit:           { en: "Submit",                 es: "Enviar" },
  act_save:             { en: "Save",                   es: "Guardar" },
  act_save_changes:     { en: "Save changes 💾",         es: "Guardar cambios 💾" },
  act_save_progress:    { en: "💾 Save progress — come back later", es: "💾 Guardar progreso — volveré después" },
  act_submit_for_stars: { en: "Submit for Stars ⭐",     es: "Enviar por estrellas ⭐" },
  act_mark_done:        { en: "Mark Done ✓",            es: "Marcar hecho ✓" },
  act_cancel:           { en: "Cancel",                 es: "Cancelar" },
  act_close:            { en: "Close",                  es: "Cerrar" },
  act_done:             { en: "Done",                   es: "Hecho" },
  act_edit:             { en: "Edit",                   es: "Editar" },
  act_delete:           { en: "Delete",                 es: "Borrar" },
  act_remove:           { en: "Remove",                 es: "Quitar" },
  act_approve:          { en: "Approve",                es: "Aprobar" },
  act_deny:             { en: "Deny",                   es: "Rechazar" },

  // TaskSheet field labels + hints
  field_note_optional:        { en: "Note (optional)",                    es: "Nota (opcional)" },
  field_note_placeholder:     { en: "Anything to tell a grown-up?",       es: "¿Algo que decirle a un adulto?" },
  field_photo_optional:       { en: "Photo (optional)",                   es: "Foto (opcional)" },
  field_photos_optional:      { en: "Photos (optional)",                  es: "Fotos (opcional)" },
  field_photo_of_your_work:   { en: "Photo of your work *",                es: "Foto de tu trabajo *" },
  field_photos_of_your_work:  { en: "Photos of your work *",               es: "Fotos de tu trabajo *" },
  field_screenshots:          { en: "Screenshots / photos",                es: "Capturas / fotos" },
  field_tap_to_add_photo:     { en: "Tap to add a photo",                  es: "Tócalo para añadir una foto" },
  field_uploading:            { en: "Uploading…",                          es: "Subiendo…" },
  // Drum sub-fields (brand names like Drumeo / Melodics / Drumscribe
  // stay untranslated; only the unit / label localizes)
  field_drumeo_min:           { en: "Drumeo min",                            es: "Drumeo min" },
  field_melodics_min:         { en: "Melodics min",                          es: "Melodics min" },
  field_drumscribe_songs:     { en: "Drumscribe / YouTube songs",            es: "Drumscribe / canciones de YouTube" },
  field_drumscribe_placeholder: { en: "Song 1, Song 2…",                    es: "Canción 1, Canción 2…" },
  field_drums_goal_hint:      { en: "🎯 Goal: 1 hour · Stretch: 2 hours. Parent can adjust stars for effort.", es: "🎯 Meta: 1 hora · Reto: 2 horas. Un adulto puede ajustar las estrellas según el esfuerzo." },
  // Photo / Spanish quick fields
  field_title_optional:       { en: "Title (optional)",                      es: "Título (opcional)" },
  field_name_your_work:       { en: "Name your work",                        es: "Pon nombre a tu trabajo" },
  // Reading sub-fields
  field_book_title:           { en: "Book title",                            es: "Título del libro" },
  field_book_search:          { en: "Find a book — typos OK (fuzzy match)…", es: "Busca un libro — los errores están bien (búsqueda flexible)…" },
  field_book_pick_or_type:    { en: "Pick from library, or type a new one below", es: "Elige de la biblioteca o escribe uno nuevo abajo" },
  field_book_search_placeholder: { en: "Search books he's read or is reading…", es: "Busca libros que ha leído o está leyendo…" },
  field_book_title_required:  { en: "Book title *",                        es: "Título del libro *" },
  field_book_title_synced:    { en: "Title (synced from pick)",            es: "Título (sincronizado con la elección)" },
  field_picked:               { en: "Picked",                              es: "Elegido" },
  field_book_language:        { en: "Language",                              es: "Idioma" },
  field_book_minutes:         { en: "Minutes",                               es: "Minutos" },
  field_finished_today_round: { en: "He finished this book today",           es: "Terminó el libro hoy" },
  // Reading Library headline stats
  ril_this_month:             { en: "this month",                            es: "este mes" },
  ril_avg_per_book:           { en: "avg / book",                            es: "promedio / libro" },
  ril_books_finished_lower:   { en: "books finished",                        es: "libros terminados" },
  // Approval queue header
  app_queue_title:            { en: "Approval Queue",                        es: "Cola de aprobaciones" },
  app_queue_hint:             { en: "Stars stay pending until you approve.", es: "Las estrellas quedan pendientes hasta que apruebes." },
  app_approved_today:         { en: "Approved Today",                        es: "Aprobado hoy" },
  app_banked:                 { en: "⭐ banked",                              es: "⭐ guardadas" },

  // Summary stat tile labels (parent Today + kid Stars)
  stat_stars_available:       { en: "Stars available today",                 es: "Estrellas disponibles hoy" },
  stat_earned_today:          { en: "Earned today",                          es: "Ganadas hoy" },
  stat_pending_approval:      { en: "Pending approval",                      es: "Falta aprobar" },
  stat_total_bank:            { en: "Total star bank",                       es: "Banco total" },
  stat_pending_short:         { en: "Pending",                               es: "Pendiente" },

  // Stat detail subtitles + per-row terms
  stat_subt_earned:           { en: "stars earned today across",             es: "estrellas ganadas hoy en" },
  stat_subt_thing:            { en: "thing",                                  es: "actividad" },
  stat_subt_things:           { en: "things",                                 es: "actividades" },
  stat_subt_task:             { en: "task",                                   es: "tarea" },
  stat_subt_tasks:            { en: "tasks",                                  es: "tareas" },
  stat_subt_pending:          { en: "stars sitting in today's pending —",    es: "estrellas pendientes hoy —" },
  stat_subt_waiting_on_you:   { en: "waiting on you",                         es: "esperándote" },
  stat_subt_in_bank:          { en: "stars in the bank right now",           es: "estrellas en el banco ahora mismo" },
  stat_subt_bonus_includes:   { en: "includes",                               es: "incluye" },
  stat_subt_in_bonus_gifts:   { en: "in bonus gifts",                         es: "en estrellas extra" },
  stat_subt_nothing_earned:   { en: "Nothing earned yet today. 💤",          es: "Nada ganado todavía hoy. 💤" },
  stat_subt_nothing_waiting:  { en: "Nothing waiting today. 🎉",             es: "Nada en espera hoy. 🎉" },
  stat_subt_older_pending:    { en: "Older un-approved submissions live in the Approvals tab.", es: "Las entregas pendientes más antiguas viven en la pestaña de aprobaciones." },

  // Detail meta in StatDetail (top-of-sheet titles for "Earned/Pending/Bank/Available")
  stat_meta_earned_title:     { en: "Earned today",                          es: "Ganadas hoy" },
  stat_meta_earned_sub:       { en: "Every star {kid} banked since midnight.", es: "Todas las estrellas que {kid} ha guardado desde medianoche." },
  stat_meta_pending_title:    { en: "Pending approval (today)",              es: "Falta aprobar (hoy)" },
  stat_meta_pending_sub:      { en: "Today's submissions waiting on a grown-up.", es: "Las entregas de hoy esperando a un adulto." },
  stat_meta_bank_title:       { en: "Total star bank",                       es: "Banco total" },
  stat_meta_bank_sub:         { en: "What's in the piggy right now, and where it came from.", es: "Lo que hay en la alcancía ahora y de dónde vino." },
  stat_meta_available_title:  { en: "Stars available today",                 es: "Estrellas disponibles hoy" },
  stat_meta_available_sub:    { en: "Every star {kid} could earn if everything on today's list got done.", es: "Cada estrella que {kid} podría ganar si terminara todo lo de hoy." },
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

// Look up a task's title.
// Resolution order:
//   1. task.nameI18n  — per-task overrides set by a parent in
//                       ManageTasks (Phase 2). Wins when present so
//                       a custom task ("Tidy desk" / "Ordenar
//                       escritorio") translates properly.
//   2. TASK_TITLES    — Phase 1 static map keyed by seeded task id.
//   3. task.title     — whatever the parent typed.
export function taskTitle(task, langs) {
  if (!task) return "";
  const override = task.nameI18n;
  if (override && typeof override === "object" && Object.keys(override).length > 0) {
    return joinLangs(override, langs, task.title || "");
  }
  const map = TASK_TITLES[task.id];
  if (map) return joinLangs(map, langs, task.title || "");
  return task.title || "";
}

// Look up a seeded activity's name.
export function activityName(activity, langs) {
  if (!activity) return "";
  const map = ACTIVITY_NAMES[activity.id];
  if (map) return joinLangs(map, langs, activity.name || activity.label || "");
  return activity.name || activity.label || "";
}
