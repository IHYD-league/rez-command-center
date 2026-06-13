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

  // More menu — items (labels + subtitles, parent navigates this list)
  more_portfolio:           { en: "Progress Portfolio",          es: "Portafolio de progreso" },
  more_portfolio_sub:       { en: "Photos, art & writing over time", es: "Fotos, arte y escritura a lo largo del tiempo" },
  more_weekly:              { en: "Weekly Summary",              es: "Resumen semanal" },
  more_weekly_sub:          { en: "Minutes, wins, needs attention", es: "Minutos, logros, atención" },
  more_handoff:             { en: "Handoff Notes",               es: "Notas para el siguiente adulto" },
  more_handoff_sub:         { en: "What the next adult needs to know", es: "Lo que el siguiente adulto necesita saber" },
  more_skills:              { en: "Learning Goals",              es: "Metas de aprendizaje" },
  more_skills_sub:          { en: "Grade-level skill tracker (early)", es: "Habilidades por grado (inicio)" },
  more_people:              { en: "Family & Helpers",            es: "Familia y ayudantes" },
  more_people_sub:          { en: "Add people · set access & limits", es: "Añade personas · permisos y límites" },
  more_activities:          { en: "Activities & Status",         es: "Actividades y estado" },
  more_activities_sub:      { en: "Add activities · breaks/seasons · colors", es: "Añade actividades · pausas/temporadas · colores" },
  more_tasks:               { en: "Tasks & Chores",              es: "Tareas y trabajos" },
  more_tasks_sub:           { en: "Add · edit · pause · remove", es: "Añadir · editar · pausar · quitar" },
  more_library:             { en: "Reading Library",             es: "Biblioteca de lectura" },
  more_library_sub:         { en: "Books · level · reading pace", es: "Libros · nivel · ritmo de lectura" },
  more_grades:              { en: "Grade Goals",                 es: "Metas de grado" },
  more_grades_sub:          { en: "Grades 1–6 · world's best standards", es: "Grados 1–6 · los mejores estándares del mundo" },
  more_recap:               { en: "Recap & Memories",            es: "Resumen y recuerdos" },
  more_recap_sub:           { en: "Weekly/monthly export · anniversaries", es: "Exportar semana/mes · aniversarios" },
  more_awards:              { en: "Accomplishments",             es: "Logros" },
  more_awards_sub:          { en: "Report cards · belts · certificates", es: "Boletas · cinturones · certificados" },
  more_board_plan:          { en: "Daily Adventure Board · Plan", es: "Tablero diario de aventura · Plan" },
  more_board_plan_sub:      { en: "Today's Top 8 · weekly default · à la carte", es: "Top 8 de hoy · predeterminado semanal · a la carta" },
  more_board_theme:         { en: "Adventure Board",             es: "Tablero de aventura" },
  more_board_theme_sub:     { en: "Daily target · theme · controls", es: "Meta diaria · tema · controles" },
  more_gallery:             { en: "Photo Gallery",               es: "Galería de fotos" },
  more_gallery_sub:         { en: "Every photo · sort by date · filter by activity", es: "Cada foto · ordenar por fecha · filtrar por actividad" },
  more_insights:            { en: "Insights",                    es: "Estadísticas" },
  more_insights_sub:        { en: "Practice time · songs · books · counts", es: "Tiempo de práctica · canciones · libros · cuentas" },
  more_music_library:       { en: "Music Library",               es: "Biblioteca de música" },
  more_music_library_sub:   { en: "Every song · sort · edit titles / artists / albums / covers", es: "Cada canción · ordenar · editar títulos / artistas / álbumes / portadas" },
  more_export:              { en: "Export Data",                 es: "Exportar datos" },
  more_export_sub:          { en: "CSV downloads — own your data", es: "Descargas CSV — son tus datos" },
  more_slideshow:           { en: "Milestone Slideshows",        es: "Presentaciones de hitos" },
  more_slideshow_sub:       { en: "Monthly · 6-month · 1-year recaps", es: "Resúmenes de mes · 6 meses · 1 año" },
  more_audit:               { en: "Data audit",                  es: "Auditoría de datos" },
  more_audit_sub:           { en: "Check the math · find drift · spot orphans", es: "Verifica la cuenta · encuentra errores · datos huérfanos" },
  more_privacy:             { en: "Privacy & Safety",            es: "Privacidad y seguridad" },
  more_privacy_sub:         { en: "Family isolation · what's stored · own your data", es: "Aislamiento familiar · lo que guardamos · son tus datos" },
  more_languages:           { en: "Languages",                   es: "Idiomas" },
  more_languages_sub:       { en: "English / Spanish / Both — for the whole family", es: "Inglés / Español / Ambos — para toda la familia" },

  // People page (Family & Helpers)
  people_pending_requests:  { en: "Pending requests",                       es: "Solicitudes pendientes" },
  people_deny_email:        { en: "Deny",                                   es: "Rechazar" },
  people_remove_photo:      { en: "Remove photo",                           es: "Quitar foto" },
  people_expired:           { en: "Expired",                                es: "Vencido" },
  people_disabled:          { en: "Disabled",                               es: "Desactivado" },
  people_active:            { en: "Active",                                 es: "Activo" },
  people_can_approve_simple:{ en: "Can approve simple tasks",               es: "Puede aprobar tareas sencillas" },
  people_lock_easy:         { en: "💛 Lock to Easy mode",                   es: "💛 Fijar en modo fácil" },
  people_add_person:        { en: "Add a person",                           es: "Añadir una persona" },
  people_access_ended:      { en: "access ended",                           es: "acceso terminado" },
  people_guest_until:       { en: "guest until",                            es: "invitado hasta" },
  people_ongoing_access:    { en: "ongoing access",                         es: "acceso permanente" },
  people_temp_hint:         { en: "Temporary access auto-expires on its end date — a one-week sitter won't keep getting in.", es: "El acceso temporal vence en su fecha — la niñera de una semana no entra después." },

  // Manage Activities + Manage Tasks
  manage_activities_archive: { en: "Archive",                               es: "Archivo" },
  manage_act_pause:          { en: "Pause",                                 es: "Pausar" },
  manage_act_un_pause:       { en: "Un-pause",                              es: "Reanudar" },
  manage_act_restore:        { en: "Restore",                               es: "Restaurar" },
  manage_act_add:            { en: "Add an activity",                       es: "Añadir una actividad" },
  manage_act_hint:           { en: "Edit, pause, archive, or add anything — hockey, rugby, whatever's next. Each activity carries its own color strip and can track a daily streak.", es: "Edita, pausa, archiva o añade cualquier cosa — hockey, rugby, lo que siga. Cada actividad lleva su tira de color y puede llevar una racha diaria." },
  manage_tasks_required:     { en: "Required",                              es: "Obligatoria" },
  manage_tasks_optional:     { en: "Optional",                              es: "Opcional" },
  manage_tasks_needs_photo:  { en: "Needs photo",                           es: "Necesita foto" },
  manage_tasks_no_proof:     { en: "No proof",                              es: "Sin prueba" },
  manage_tasks_every_day:    { en: "every day",                             es: "todos los días" },
  manage_tasks_only:         { en: "only",                                  es: "solo" },
  manage_tasks_paused:       { en: "paused",                                es: "en pausa" },
  manage_tasks_add:          { en: "Add a task",                            es: "Añadir una tarea" },
  manage_tasks_chore_btn:    { en: "Chore",                                 es: "Trabajo" },
  manage_tasks_task_btn:     { en: "Task",                                  es: "Tarea" },
  manage_tasks_hint:         { en: "Add a chore (feed the dog), a one-off task (recital sheet music), pause anything, or remove it. Paused tasks drop off the board but keep their history.", es: "Añade un trabajo (darle de comer al perro), una tarea única (partitura del recital), pausa o quita lo que quieras. Las tareas en pausa salen del tablero pero conservan su historial." },

  // Calendar
  cal_upcoming_empty:        { en: "Nothing on the calendar yet.",          es: "Nada en el calendario todavía." },
  cal_add_event_hint:        { en: "Add upcoming events — practices, classes, field trips, anything that affects today's plan.", es: "Añade eventos próximos — prácticas, clases, excursiones, cualquier cosa que afecte el plan de hoy." },
  cal_heading:               { en: "Calendar",                              es: "Calendario" },
  cal_summer_banner:         { en: "Summer Mode: June 11 – Sept 1, 2026. School starts back ~Sept 1.", es: "Modo verano: 11 de junio – 1 de septiembre, 2026. La escuela vuelve aprox. el 1 de septiembre." },
  cal_tkd_section:           { en: "Taekwondo this week",                   es: "Taekwondo esta semana" },
  cal_tkd_picked:            { en: "{n} of {target} picked",                 es: "{n} de {target} elegidos" },
  cal_tkd_hint:              { en: "Available any day except Sunday. Tap the days he'll go this week and set the time.", es: "Disponible cualquier día menos domingo. Toca los días que irá esta semana y pon la hora." },
  cal_tkd_set_time:          { en: "set time",                              es: "pon hora" },
  cal_tkd_time_flexible:     { en: "time flexible",                          es: "hora flexible" },
  cal_tkd_pick_more:         { en: "Pick {n} more to hit the 2×/week goal.", es: "Elige {n} más para llegar a la meta de 2×/semana." },
  cal_tkd_on_track:          { en: "Nice — on track for the week. 🥋",       es: "¡Bien! En camino esta semana. 🥋" },
  cal_kids_week:             { en: "{kid}'s week",                          es: "La semana de {kid}" },
  cal_this_week_tag:         { en: "this week",                              es: "esta semana" },
  cal_free_rest:             { en: "— free / rest",                          es: "— libre / descanso" },
  cal_school_hours:          { en: "School: 8:00 AM–2:10 PM, Mon–Fri.",      es: "Escuela: 8:00 AM–2:10 PM, lun–vie." },
  cal_summer_hours:          { en: "Summer homeschool block: 8 AM–2 PM, Mon–Fri.", es: "Bloque de verano en casa: 8 AM–2 PM, lun–vie." },
  cal_manage_hint:           { en: "Manage breaks & seasons under More → Activities.", es: "Gestiona descansos y temporadas en Más → Actividades." },
  cal_add_event:             { en: "Add event",                              es: "Añadir evento" },
  cal_event_title_ph:        { en: "Event title",                            es: "Título del evento" },
  cal_status_break:          { en: "on break",                               es: "en descanso" },
  cal_status_seasonal:       { en: "seasonal",                               es: "de temporada" },

  // Privacy & Safety
  priv_header:               { en: "Privacy & Safety",                      es: "Privacidad y seguridad" },
  priv_subtitle:             { en: "Your family, your data",                 es: "Tu familia, tus datos" },
  priv_subhint:              { en: "Isolated from every other family using Command Center.", es: "Aislado de cualquier otra familia que use Command Center." },
  priv_sec_family:           { en: "Your family",                            es: "Tu familia" },
  priv_sec_stored:           { en: "What's stored",                          es: "Qué se guarda" },
  priv_sec_photo_loc:        { en: "Photo location data",                    es: "Ubicación en las fotos" },
  priv_sec_own_data:         { en: "Own your data",                          es: "Tus datos son tuyos" },
  priv_sec_session:          { en: "Session",                                es: "Sesión" },
  priv_row_family_id:        { en: "Family ID",                              es: "ID de la familia" },
  priv_row_family_id_hint:   { en: "Unique to your family — used to isolate every row.", es: "Único para tu familia — aísla cada registro." },
  priv_row_signed_in:        { en: "Signed in as",                           es: "Sesión como" },
  priv_row_parents:          { en: "Parents",                                es: "Padres" },
  priv_row_helpers:          { en: "Helpers",                                es: "Ayudantes" },
  priv_row_kids:             { en: "Kids",                                   es: "Hijos" },
  priv_row_none:             { en: "(none)",                                 es: "(ninguno)" },
  priv_row_completions:      { en: "Completions",                            es: "Tareas hechas" },
  priv_row_photos:           { en: "Photos",                                 es: "Fotos" },
  priv_row_photos_hint:      { en: "Stored in your family's bucket — never shared.", es: "Guardadas en el espacio de tu familia — nunca se comparten." },
  priv_row_gifts:            { en: "Gifts",                                  es: "Regalos" },
  priv_row_song_plays:       { en: "Song plays",                             es: "Canciones tocadas" },
  priv_photo_loc_body:       { en: "When a photo is taken as proof and your device offers location, Command Center records a coarse GPS tag with the photo so a parent reviewing later knows where the chore happened. Tags stay inside your family.", es: "Cuando se toma una foto como prueba y el dispositivo ofrece ubicación, Command Center guarda una etiqueta GPS aproximada con la foto para que un adulto vea dónde se hizo. Las etiquetas se quedan dentro de tu familia." },
  priv_photo_loc_revoke:     { en: "You can revoke location for the app at the OS level (iOS: Settings → Safari → Location; Android: Site settings) and the tag won't be saved.", es: "Puedes desactivar la ubicación para la app desde el sistema (iOS: Ajustes → Safari → Ubicación; Android: Ajustes del sitio) y la etiqueta no se guardará." },
  priv_export_title:         { en: "Export every row as CSV",                 es: "Exporta cada fila como CSV" },
  priv_export_hint:          { en: "More → Export Data — completions, photos, books, songs, the whole set.", es: "Más → Exportar datos — tareas, fotos, libros, canciones, todo." },
  priv_audit_title:          { en: "Run a data audit",                      es: "Ejecutar una auditoría" },
  priv_audit_hint:           { en: "More → Data audit — checks bank math, orphan refs, date integrity.", es: "Más → Auditoría — revisa cuentas del banco, referencias huérfanas e integridad de fechas." },
  priv_sign_out:             { en: "Sign out",                              es: "Cerrar sesión" },
  priv_sign_out_hint:        { en: "Signing out clears the session on this device. Your family's data stays in the cloud and reappears the next time anyone signs in.", es: "Cerrar sesión borra esta sesión en el dispositivo. Los datos de tu familia se quedan en la nube y vuelven la próxima vez que alguien entre." },

  // Data Audit
  audit_label:               { en: "Audit result",                           es: "Resultado de auditoría" },
  audit_drift:               { en: "Drift detected",                         es: "Discrepancia detectada" },
  audit_minor:               { en: "Minor warnings",                         es: "Advertencias menores" },
  audit_clean:               { en: "All clean",                              es: "Todo en orden" },
  audit_summary:             { en: "{ok} passing · {warn} warning · {err} error", es: "{ok} en orden · {warn} advertencia · {err} error" },
  audit_summary_plural_err:  { en: "{ok} passing · {warn} warning · {err} errors", es: "{ok} en orden · {warn} advertencia · {err} errores" },
  audit_intro:               { en: "Read-only check across the whole family dataset. Any drift here points at a deeper problem — a botched import, a delete that left dangling references, or a date written in the wrong format.", es: "Revisión de solo lectura sobre todos los datos de la familia. Cualquier discrepancia indica un problema más profundo — una importación dañada, un borrado que dejó referencias sueltas o una fecha mal escrita." },

  // Languages page
  lang_header:               { en: "Languages",                              es: "Idiomas" },
  lang_subtitle:             { en: "For the whole family",                   es: "Para toda la familia" },
  lang_subhint:              { en: "Bilingual task names and labels everywhere they fit.", es: "Nombres de tareas y etiquetas en dos idiomas donde quepan." },
  lang_en_only:              { en: "🇺🇸 English only",                       es: "🇺🇸 Solo inglés" },
  lang_en_only_sub:          { en: "The original.",                          es: "El original." },
  lang_en_only_hint:         { en: "Every label and task name in English. Pick this if Spanish makes the screens feel busy.", es: "Todas las etiquetas y tareas en inglés. Elige esto si el español hace que las pantallas se vean cargadas." },
  lang_both:                 { en: "🇺🇸 / 🇪🇸 Both — recommended",          es: "🇺🇸 / 🇪🇸 Ambos — recomendado" },
  lang_both_sub:             { en: "English first, Spanish alongside.",      es: "Inglés primero, español al lado." },
  lang_both_hint:            { en: "Task names and labels render together — \"Make Bed / Hacer la cama\". Lets a learner read in Spanish without getting lost.", es: "Los nombres y etiquetas aparecen juntos — \"Make Bed / Hacer la cama\". Permite leer en español sin perderse." },
  lang_es_only:              { en: "🇪🇸 Spanish only",                       es: "🇪🇸 Solo español" },
  lang_es_only_sub:          { en: "Sólo en español.",                       es: "Sólo en español." },
  lang_es_only_hint:         { en: "Full immersion. A few brand names (Duolingo, Drumeo) stay as they are.", es: "Inmersión total. Algunas marcas (Duolingo, Drumeo) se quedan como están." },
  lang_custom_hint:          { en: "Custom tasks you've added show up in whatever language you typed them in — open the task editor to add a Spanish name.", es: "Las tareas que has añadido salen en el idioma en que las escribiste — abre el editor de tareas para añadir un nombre en español." },

  // MoreMenu reorder UI
  more_header:              { en: "More",                           es: "Más" },
  more_edit_order:          { en: "Edit order",                     es: "Editar orden" },
  more_reset:               { en: "Reset",                          es: "Restablecer" },
  more_reset_confirm:       { en: "Reset the More menu to the default order?", es: "¿Restablecer el menú a su orden predeterminado?" },
  more_reorder_hint:        { en: "Drag the ☰ handle to reorder, or tap ↑ / ↓. Changes save instantly.", es: "Arrastra ☰ para reordenar, o toca ↑ / ↓. Los cambios se guardan al instante." },

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
  app_submitted_by:           { en: "Submitted by {name}",                   es: "Enviado por {name}" },
  app_detail_book:            { en: "Book",                                  es: "Libro" },
  app_detail_title:           { en: "Title",                                 es: "Título" },
  app_detail_drums:           { en: "Drums",                                 es: "Batería" },
  app_detail_note:            { en: "Note",                                  es: "Nota" },
  app_detail_proof:           { en: "Proof",                                 es: "Prueba" },
  app_by_helper:              { en: "helper",                                es: "ayudante" },
  app_geo_map:                { en: "map",                                   es: "mapa" },
  app_song_section:           { en: "Song log changes",                      es: "Cambios al diario de canciones" },
  app_song_remove:            { en: "Remove play",                           es: "Quitar reproducción" },
  app_song_edit:              { en: "Edit play",                             es: "Editar reproducción" },
  app_song_deleted:           { en: "(deleted song)",                        es: "(canción borrada)" },
  app_song_asked_by:          { en: "asked by {name}",                       es: "pedido por {name}" },
  app_song_change_to:         { en: "Wants to change to:",                   es: "Quiere cambiar a:" },
  app_deny_aria:              { en: "Deny",                                  es: "Rechazar" },

  // Rewards Store (parent)
  rew_heading:                { en: "Rewards Store",                         es: "Tienda de premios" },
  rew_bank_hint:              { en: "Bank: {n} ⭐ · add, edit, or remove anything {kid}'s into.", es: "Banco: {n} ⭐ · añade, edita o quita lo que le gusta a {kid}." },
  rew_wishes_new:             { en: "{n} new",                               es: "{n} nuevas" },
  rew_no_wishes:              { en: "No new wishes. When one comes up, set the stars and approve it here.", es: "No hay deseos nuevos. Cuando llegue uno, pon las estrellas y apruébalo aquí." },
  rew_no_requests:            { en: "No pending requests.",                  es: "Sin solicitudes pendientes." },
  rew_sort_high_to_low:       { en: "★ high → low",                          es: "★ caro → barato" },
  rew_sort_low_to_high:       { en: "★ low → high",                          es: "★ barato → caro" },
  rew_sort_tooltip_low:       { en: "Switch to lowest first",                es: "Cambiar a más barato primero" },
  rew_sort_tooltip_high:      { en: "Switch to highest first",               es: "Cambiar a más caro primero" },
  rew_add:                    { en: "Add",                                   es: "Añadir" },
  rew_section_all:            { en: "All rewards",                           es: "Todos los premios" },
  rew_new_ph:                 { en: "e.g. New comic book",                   es: "ej.: cómic nuevo" },
  rew_cost_label:             { en: "Cost",                                  es: "Costo" },
  rew_costs_label:            { en: "Costs",                                 es: "Cuesta" },
  rew_add_reward:             { en: "Add reward",                            es: "Añadir premio" },
  rew_cat_everyday:           { en: "Everyday",                              es: "Diario" },
  rew_cat_treat:              { en: "Treat",                                 es: "Capricho" },
  rew_cat_creative:           { en: "Creative",                              es: "Creativo" },
  rew_cat_big:                { en: "Big",                                   es: "Grande" },
  rew_hidden:                 { en: "hidden",                                es: "oculto" },
  rew_show_in_store:          { en: "Show in store",                         es: "Mostrar en la tienda" },
  rew_hide_from_store:        { en: "Hide from store",                       es: "Ocultar de la tienda" },

  // Insights — section titles + empty lines + meta
  ins_header_kicker:          { en: "Family Insights",                       es: "Estadísticas de la familia" },
  ins_header_title:           { en: "Numbers behind the work",                es: "Números detrás del trabajo" },
  ins_header_intro:           { en: "Tracking granular logs since {date}. The streaks go further back than the minutes do — that's honest, not a bug.", es: "Registros detallados desde {date}. Las rachas van más atrás que los minutos — eso es honesto, no un error." },
  ins_since_prefix:           { en: "since",                                  es: "desde" },
  ins_practice_title:         { en: "Practice time",                          es: "Tiempo de práctica" },
  ins_minutes_total:          { en: "minutes total",                          es: "minutos en total" },
  ins_last14_label:           { en: "Last 14 days · {n} min",                 es: "Últimos 14 días · {n} min" },
  ins_no_minutes:             { en: "No minutes logged yet.",                 es: "Aún no hay minutos registrados." },
  ins_songs_title:            { en: "Most-played songs",                      es: "Canciones más tocadas" },
  ins_songs_summary:          { en: "plays · {n} songs",                      es: "reproducciones · {n} canciones" },
  ins_no_songplays:           { en: "No song plays logged yet.",              es: "Aún no hay canciones registradas." },
  ins_songs_auto_hint:        { en: "Auto-matched songs need a parent thumbs-up. Tap ✓ to lock, \"Pick another\" to fix it, or \"Skip\" to leave the row as free text.", es: "Las canciones emparejadas automáticamente necesitan el visto bueno de un adulto. Toca ✓ para confirmar, \"Elegir otra\" para corregirla, o \"Saltar\" para dejar la fila como texto libre." },
  ins_books_title:            { en: "Books",                                  es: "Libros" },
  ins_books_reading:          { en: "Reading",                                es: "Leyendo" },
  ins_books_finished:         { en: "Finished",                               es: "Terminados" },
  ins_books_wishlist:         { en: "Wishlist",                               es: "Lista de deseos" },
  ins_no_books:               { en: "No books on the shelf yet.",             es: "No hay libros en la estantería todavía." },
  ins_recent_tracked:         { en: "Recent (tracked)",                       es: "Recientes (registrados)" },
  ins_books_auto_hint:        { en: "Auto-matched titles need a parent thumbs-up. Tap ✓ to lock the match, \"Pick another\" to fix it, or \"Skip\" to leave the entry as free text.", es: "Los títulos emparejados automáticamente necesitan el visto bueno de un adulto. Toca ✓ para confirmar, \"Elegir otro\" para corregirlo, o \"Saltar\" para dejarlo como texto libre." },
  ins_archive_pretracking:    { en: "Archive · pre-tracking ({n})",           es: "Archivo · antes del registro ({n})" },
  ins_archive_note:           { en: "No real dates — counted in totals + per-author stats, excluded from date-based views.", es: "Sin fechas reales — cuentan en los totales y en las estadísticas por autor, pero no en vistas por fecha." },
  ins_era_unset:              { en: "Era unset",                              es: "Era sin definir" },
  ins_approved_title:         { en: "Approved by category",                   es: "Aprobado por categoría" },
  ins_approved_summary:       { en: "approved completions",                   es: "tareas aprobadas" },
  ins_no_approved:            { en: "Nothing approved yet.",                  es: "Nada aprobado todavía." },
  ins_other_bucket:           { en: "Other",                                  es: "Otro" },
  ins_photos_title:           { en: "Photos in the gallery",                  es: "Fotos en la galería" },
  ins_photos_schoolwork:      { en: "Schoolwork",                             es: "Tareas escolares" },
  ins_photos_memories:        { en: "Memories",                               es: "Recuerdos" },
  ins_no_photos:              { en: "No photos in the gallery yet.",          es: "Aún no hay fotos en la galería." },
  ins_footer:                 { en: "Every number above comes from the data the family is already logging — nothing new is stored to draw these views.", es: "Cada número de arriba viene de los datos que la familia ya registra — no se guarda nada nuevo para estas vistas." },
  ins_cover_upload_fail:      { en: "Cover upload failed: {msg}",             es: "Error al subir la portada: {msg}" },
  ins_looks_right:            { en: "Looks right",                            es: "Se ve bien" },
  ins_pick_another:           { en: "Pick another",                           es: "Elegir otro" },
  ins_skip:                   { en: "Skip",                                   es: "Saltar" },
  ins_skip_aria:              { en: "Skip enrichment",                        es: "Saltar enriquecimiento" },
  ins_use_my_cover:           { en: "Use my cover",                           es: "Usar mi portada" },
  ins_replace_cover:          { en: "Replace cover",                          es: "Reemplazar portada" },
  ins_use_ol_cover:           { en: "Use OL cover",                           es: "Usar portada OL" },
  ins_use_ol_aria:            { en: "Use the Open Library cover instead",     es: "Usar la portada de Open Library en su lugar" },
  ins_upload_book_cover:      { en: "Upload book cover",                      es: "Subir portada del libro" },
  ins_uploading:              { en: "Uploading…",                             es: "Subiendo…" },
  ins_pick_right_match:       { en: "Pick the right match",                   es: "Elige la coincidencia correcta" },
  ins_book_title:             { en: "Book title",                             es: "Título del libro" },
  ins_author_helps:           { en: "Author (helps disambiguate)",            es: "Autor (ayuda a aclarar)" },
  ins_author:                 { en: "Author",                                 es: "Autor" },
  ins_search_ol:              { en: "Search Open Library",                    es: "Buscar en Open Library" },
  ins_searching:              { en: "Searching…",                             es: "Buscando…" },
  ins_search_failed:          { en: "Search failed: {msg}",                   es: "Búsqueda fallida: {msg}" },
  ins_no_matches:             { en: "No matches — try the author above, or save the values as-is below.", es: "Sin coincidencias — prueba con el autor arriba, o guarda los valores tal cual abajo." },
  ins_save_as:                { en: "Save \"{title}\"",                       es: "Guardar \"{title}\"" },
  ins_save_by:                { en: " by {author}",                            es: " por {author}" },
  ins_untitled:               { en: "(untitled)",                              es: "(sin título)" },
  ins_status_reading:         { en: "reading",                                 es: "leyendo" },
  ins_status_finished:        { en: "finished",                                es: "terminado" },
  ins_status_wishlist:        { en: "wishlist",                                es: "lista de deseos" },
  ins_status_dropped:         { en: "dropped",                                 es: "abandonado" },

  // PhotoGallery
  pg_add_memory:              { en: "Add a memory",                            es: "Añadir un recuerdo" },
  pg_new_memory:              { en: "New Memory",                              es: "Nuevo recuerdo" },
  pg_caption_ph:              { en: "Caption — what's this from? (optional)", es: "Pie de foto — ¿de qué es esto? (opcional)" },
  pg_date_label:              { en: "Date",                                    es: "Fecha" },
  pg_activity_optional:       { en: "Activity (optional)",                     es: "Actividad (opcional)" },
  pg_activity_none:           { en: "— none —",                                es: "— ninguna —" },
  pg_pick_photo:              { en: "Pick a photo",                            es: "Elegir una foto" },
  pg_uploading:               { en: "Uploading…",                              es: "Subiendo…" },
  pg_upload_fail:             { en: "Upload failed: {msg}",                    es: "Subida fallida: {msg}" },
  pg_privacy_hint:            { en: "Photos are private to your family. The album lives in the same gallery as Schoolwork.", es: "Las fotos son privadas de tu familia. El álbum vive en la misma galería que las tareas escolares." },
  pg_filter_all:              { en: "All",                                     es: "Todas" },
  pg_filter_schoolwork:       { en: "Schoolwork",                              es: "Tareas escolares" },
  pg_filter_memories:         { en: "Memories",                                es: "Recuerdos" },
  pg_count_one:               { en: "photo",                                   es: "foto" },
  pg_count_many:              { en: "photos",                                  es: "fotos" },
  pg_clear_filter:            { en: "clear filter",                            es: "quitar filtro" },
  pg_sort_newest:             { en: "Newest",                                  es: "Más recientes" },
  pg_sort_oldest:             { en: "Oldest",                                  es: "Más antiguas" },
  pg_empty_none:              { en: "No photos yet.",                          es: "Aún no hay fotos." },
  pg_empty_filter:            { en: "No photos in this filter.",               es: "No hay fotos con este filtro." },
  pg_empty_hint_none:         { en: "Tap a chore that asks for a photo — proofs show up here.", es: "Toca un trabajo que pida una foto — las pruebas aparecen aquí." },
  pg_empty_hint_filter:       { en: "Pick another activity above, or clear the filter.", es: "Elige otra actividad arriba o quita el filtro." },
  pg_memory_aria:             { en: "Memory",                                  es: "Recuerdo" },
  pg_photo_aria:              { en: "Photo",                                   es: "Foto" },
  pg_lightbox_loading:        { en: "Loading…",                                es: "Cargando…" },
  pg_lightbox_close:          { en: "Close",                                   es: "Cerrar" },
  pg_lightbox_prev:           { en: "Previous",                                es: "Anterior" },
  pg_lightbox_next:           { en: "Next",                                    es: "Siguiente" },
  pg_lightbox_index:          { en: "{i} of {n}",                              es: "{i} de {n}" },
  pg_by_label:                { en: "by {name}",                               es: "por {name}" },
  pg_cancel_aria:             { en: "Cancel",                                  es: "Cancelar" },

  // MusicLibrary
  ml_unknown_song:            { en: "(unknown)",                               es: "(desconocida)" },
  ml_open_aria:               { en: "Open {title}",                            es: "Abrir {title}" },
  ml_stat_songs:              { en: "songs",                                   es: "canciones" },
  ml_stat_total_plays:        { en: "total plays",                             es: "reproducciones" },
  ml_stat_artists:            { en: "artists",                                 es: "artistas" },
  ml_search_ph:               { en: "Search title, artist, or album…",         es: "Busca por título, artista o álbum…" },
  ml_view_list:               { en: "List",                                    es: "Lista" },
  ml_view_grid:               { en: "Grid",                                    es: "Cuadrícula" },
  ml_view_shelf:              { en: "Shelf",                                   es: "Estante" },
  ml_sort_plays:              { en: "Most played",                             es: "Más tocadas" },
  ml_sort_recent:             { en: "Recently played",                         es: "Recientes" },
  ml_sort_artist_grouped:     { en: "By artist",                               es: "Por artista" },
  ml_sort_title_az:           { en: "Title A–Z",                               es: "Título A–Z" },
  ml_sort_title_za:           { en: "Title Z–A",                               es: "Título Z–A" },
  ml_sort_artist_az:          { en: "Artist A–Z",                              es: "Artista A–Z" },
  ml_sort_album_az:           { en: "Album A–Z",                               es: "Álbum A–Z" },
  ml_sort_added_newest:       { en: "Newest added",                            es: "Añadidas recientemente" },
  ml_sort_added_oldest:       { en: "Oldest added",                            es: "Añadidas hace más" },
  ml_match_count:             { en: "{n} of {total} matching",                 es: "{n} de {total} coinciden" },
  ml_total_count:             { en: "{n} songs",                               es: "{n} canciones" },
  ml_no_match:                { en: "No songs match that search.",             es: "Ninguna canción coincide con la búsqueda." },
  ml_no_songs:                { en: "No songs logged yet — add some via the Drums task sheet.", es: "Aún no hay canciones — añade alguna en la tarea de batería." },
  ml_unknown_artist:          { en: "Unknown artist",                          es: "Artista desconocido" },
  ml_song_one:                { en: "song",                                    es: "canción" },
  ml_song_many:               { en: "songs",                                   es: "canciones" },
  ml_play_one:                { en: "play",                                    es: "reproducción" },
  ml_play_many:               { en: "plays",                                   es: "reproducciones" },
  ml_done_arranging:          { en: "Done arranging",                          es: "Listo" },
  ml_rearrange:               { en: "Rearrange",                               es: "Reorganizar" },
  ml_reset_shelf:             { en: "Reset shelf order",                       es: "Restablecer el estante" },
  ml_custom_order:            { en: "custom order",                            es: "orden personalizado" },
  ml_sorted_by:               { en: "sorted by {label}",                       es: "ordenado por {label}" },
  ml_move_left:               { en: "Move left",                               es: "Mover a la izquierda" },
  ml_move_right:              { en: "Move right",                              es: "Mover a la derecha" },
  ml_editing:                 { en: "Editing",                                 es: "Editando" },
  ml_close_aria:              { en: "Close",                                   es: "Cerrar" },

  // KidStars page
  ks_trophy_footer:           { en: "Win badges every single day — even before the big rewards. 🎉", es: "Gana insignias cada día — incluso antes de los grandes premios. 🎉" },
  ks_undated:                 { en: "Undated",                                  es: "Sin fecha" },
  ks_bonus_fallback:          { en: "Bonus",                                    es: "Bono" },
  ks_bonus_prefix:            { en: "bonus",                                    es: "bono" },

  // MostPlayedSongs (kid + parent view)
  mps_section:                { en: "Most played songs",                        es: "Canciones más tocadas" },
  mps_no_songs:               { en: "No songs logged yet. Tap drums → log one!", es: "Aún no hay canciones. ¡Toca batería → registra una!" },
  mps_top_n:                  { en: "top {n}",                                  es: "top {n}" },
  mps_plays_one:              { en: "play",                                     es: "reproducción" },
  mps_plays_many:             { en: "plays",                                    es: "reproducciones" },
  mps_last:                   { en: "last: {date}",                             es: "última: {date}" },
  mps_play_history:           { en: "Play history",                             es: "Historial" },
  mps_notes_ph:               { en: "Notes (optional)…",                        es: "Notas (opcional)…" },
  mps_ask_parent:             { en: "Ask parent",                               es: "Pedir a un adulto" },
  mps_save:                   { en: "Save",                                     es: "Guardar" },
  mps_cancel:                 { en: "Cancel",                                   es: "Cancelar" },
  mps_pending_remove:         { en: "⏳ remove pending",                         es: "⏳ quitar pendiente" },
  mps_pending_edit:           { en: "⏳ edit pending",                           es: "⏳ editar pendiente" },
  mps_edit_play:              { en: "Edit this play",                           es: "Editar esta reproducción" },
  mps_ask_remove:             { en: "Ask parent to remove this play",           es: "Pedir a un adulto que quite esta reproducción" },
  mps_remove_play:            { en: "Remove this play",                         es: "Quitar esta reproducción" },
  mps_confirm_ask:            { en: "Ask a parent to remove this play?\n\n\"{song}\" — {when}{notes}\n\nIt'll show up in the parent's Approval queue. The play count won't change until they approve.", es: "¿Pedir a un adulto que quite esta reproducción?\n\n\"{song}\" — {when}{notes}\n\nAparecerá en la cola de aprobaciones. El conteo no cambia hasta que aprueben." },
  mps_confirm_remove:         { en: "Remove this play?\n\n\"{song}\" — {when}{notes}\n\nThe play count drops by 1 and this can't be undone.", es: "¿Quitar esta reproducción?\n\n\"{song}\" — {when}{notes}\n\nEl conteo baja 1 y no se puede deshacer." },
  mps_this_song:              { en: "this song",                                es: "esta canción" },
  mps_unknown_date:           { en: "an unknown date",                          es: "una fecha desconocida" },
  mps_missing_song:           { en: "(missing)",                                es: "(no encontrada)" },

  // RewardsKid
  rk_bank_subtitle:           { en: "in your star bank",                        es: "en tu banco de estrellas" },
  rk_can_get:                 { en: "You can get this! 🎉",                     es: "¡Puedes conseguirlo! 🎉" },
  rk_more_to_go:              { en: "{n} more ⭐ to go",                        es: "{n} más ⭐ para conseguirlo" },
  rk_ask:                     { en: "Ask →",                                    es: "Pedir →" },
  rk_asked:                   { en: "Asked!",                                   es: "¡Pedido!" },
  rk_status_approved:         { en: "approved",                                  es: "aprobado" },
  rk_status_denied:           { en: "denied",                                    es: "rechazado" },
  rk_status_declined:         { en: "declined",                                  es: "rechazado" },
  rk_status_requested:        { en: "requested",                                 es: "pedido" },

  // TaskSheet — kid submit / edit flow
  ts_minutes_worth:           { en: "{m} min · worth {n} ⭐",                    es: "{m} min · vale {n} ⭐" },
  ts_bonus_possible:          { en: " (+{n} bonus possible)",                    es: " (+{n} extra posible)" },
  ts_approved_banked:         { en: "Approved — {n} ⭐ banked! 🎉",               es: "Aprobado — ¡{n} ⭐ guardadas! 🎉" },
  ts_edit_mode:               { en: "edit mode",                                  es: "modo edición" },
  ts_gate_uploading:          { en: "Photo still uploading…",                     es: "La foto sigue subiendo…" },
  ts_gate_book_title:         { en: "Enter the book title to submit.",            es: "Pon el título del libro para enviar." },
  ts_gate_photo:              { en: "Add a photo of your work to submit.",        es: "Añade una foto de tu trabajo para enviar." },
  ts_gate_drums:              { en: "Log at least one of Drumeo / Melodics / songs.", es: "Registra al menos Drumeo / Melodics / canciones." },
  ts_max_photos:              { en: "Max {n} photos per task.",                   es: "Máximo {n} fotos por tarea." },
  ts_photo_upload_fail:       { en: "Photo upload failed: {msg}",                 es: "Error al subir la foto: {msg}" },
  ts_photo_saved:             { en: "Photo saved 📸",                              es: "Foto guardada 📸" },
  ts_book_title_ph:           { en: "e.g. Dog Man",                               es: "ej.: Dog Man" },
  ts_lang_english:            { en: "English",                                    es: "Inglés" },
  ts_lang_spanish:            { en: "Spanish 🇪🇸",                                es: "Español 🇪🇸" },
  ts_minutes_read:            { en: "Minutes read",                               es: "Minutos leídos" },
  ts_finished_today:          { en: "✅ He finished this book today",             es: "✅ Terminó el libro hoy" },
  ts_round_suffix:            { en: " (Round {n})",                               es: " (Vuelta {n})" },
  ts_round_inline:            { en: "(this will be Round {n})",                   es: "(esta será la vuelta {n})" },
  ts_round_hint:              { en: "round {n}?",                                 es: "¿vuelta {n}?" },
  ts_read_count:              { en: "Read {n}×",                                  es: "Leído {n}×" },
  ts_picked_clear:            { en: "Clear picked book",                          es: "Quitar libro elegido" },
  ts_book_untitled:           { en: "(untitled)",                                 es: "(sin título)" },
  ts_book_archive:            { en: "Archive · {era}",                            es: "Archivo · {era}" },
  ts_book_era_unset:          { en: "era unset",                                  es: "era sin definir" },
  ts_book_status_finished:    { en: "Finished",                                   es: "Terminado" },
  ts_book_status_wishlist:    { en: "Wishlist",                                   es: "Lista de deseos" },
  ts_book_status_dropped:     { en: "Dropped",                                    es: "Abandonado" },
  ts_book_status_reading:     { en: "Reading",                                    es: "Leyendo" },
  ts_uploading_small:         { en: "Uploading…",                                 es: "Subiendo…" },
  ts_also_cover_label:        { en: "Also use this as the book's cover",          es: "Usar esto como portada del libro" },
  ts_also_cover_hint:         { en: "Only do this if the photo IS the book cover (not the kid reading). The Reading Library will show it.", es: "Solo si la foto ES la portada del libro (no del niño leyendo). Aparecerá en la biblioteca." },

  // OnboardingOverlay — first-tap welcome moment per profile
  ob_aria:                    { en: "Welcome",                                  es: "Bienvenida" },
  ob_kid_sub:                 { en: "This is your command center. Earn stars. Crush quests.", es: "Este es tu centro de mando. Gana estrellas. Aplasta misiones." },
  ob_kid_cue:                 { en: "Tap to begin your adventure",               es: "Toca para empezar tu aventura" },
  ob_parent_sub:              { en: "Approvals, rewards, and everyone's day in one place.", es: "Aprobaciones, premios y el día de todos en un solo lugar." },
  ob_parent_cue:              { en: "Tap to continue",                           es: "Toca para continuar" },
  ob_grandparent_sub:         { en: "Today's checklist + family notes, ready when you are.", es: "La lista de hoy + notas de la familia, listas cuando quieras." },
  ob_helper_sub:              { en: "Today's checklist + handoff notes for the family.", es: "La lista de hoy + notas para el siguiente adulto." },
  ob_guest_sub:               { en: "Quick checklist for today.",                es: "Lista rápida para hoy." },
  // Greeting renders the bilingual word ONCE, then the name once.
  // Avoids the duplicate-name display in "Both" mode (was: "Hi, Mike! /
  // ¡Hola, Mike!" — Mike's feedback: "Hi / hola works, name once").
  ob_hi:                      { en: "Hi",                                        es: "Hola" },
  ob_friend:                  { en: "friend",                                    es: "amig@" },

  // KidGameHome — kid landing
  kgh_today_quest_kicker:     { en: "Today's Quest",                             es: "La misión de hoy" },
  kgh_board_title:            { en: "Daily Adventure Board",                     es: "Tablero de aventuras del día" },
  kgh_board_tap_hint:         { en: "Tap to play through today's missions →",    es: "Toca para jugar las misiones de hoy →" },
  kgh_hero_kicker:            { en: "Hero",                                      es: "Héroe" },
  kgh_stars_label:            { en: "Stars",                                     es: "Estrellas" },
  kgh_earned_today:           { en: "+{n} earned today",                         es: "+{n} ganadas hoy" },
  kgh_gift_today:             { en: "+{n}⭐ gift today",                          es: "+{n}⭐ regalo hoy" },
  kgh_stars_title:            { en: "See where these stars came from",           es: "Ver de dónde vinieron estas estrellas" },
  kgh_drum_streak:            { en: "Drum streak",                               es: "Racha de batería" },
  kgh_hero_level:             { en: "Hero level",                                es: "Nivel de héroe" },
  kgh_lv_title:               { en: "Lv {n} · {title}",                          es: "Nv {n} · {title}" },
  kgh_replay_aria:            { en: "Replay level {n} celebration",               es: "Repetir celebración del nivel {n}" },
  kgh_tap_replay:             { en: "Tap to replay 🎉",                          es: "Toca para repetir 🎉" },
  kgh_treasure_streak:        { en: "Treasure streak",                           es: "Racha del tesoro" },
  kgh_treasure_days_one:      { en: "1 day",                                     es: "1 día" },
  kgh_treasure_days_many:     { en: "{n} days",                                  es: "{n} días" },
  kgh_treasure_one_day:       { en: "🗝️ 1 day in a row",                         es: "🗝️ 1 día seguido" },
  kgh_treasure_many_days:     { en: "🗝️ {n} days in a row opening the chest",    es: "🗝️ {n} días seguidos abriendo el cofre" },
  kgh_treasure_king:          { en: "👑 Treasure King!",                         es: "👑 ¡Rey del tesoro!" },
  kgh_treasure_fortnight:     { en: "💎 Treasure Fortnight unlocked!",           es: "💎 ¡Quincena del tesoro desbloqueada!" },
  kgh_treasure_week:          { en: "🏆 Week of Treasures!",                     es: "🏆 ¡Semana de tesoros!" },
  kgh_treasure_trio:          { en: "🗝️ Treasure Trio unlocked!",                es: "🗝️ ¡Trío del tesoro desbloqueado!" },
  kgh_next_reward:            { en: "Next reward",                               es: "Siguiente premio" },
  kgh_up_next:                { en: "Up next",                                   es: "Próxima" },
  kgh_up_next_extra:          { en: "· extra",                                   es: "· extra" },
  kgh_parts_label:            { en: "{done} / {total} parts",                    es: "{done} / {total} partes" },
  kgh_year_of_drums:          { en: "A Year of Drums",                           es: "Un año de batería" },
  kgh_you_did_it:             { en: "🏆 You did it!",                            es: "🏆 ¡Lo lograste!" },
  kgh_dont_break:             { en: "Don't break the chain · {n} days to go",    es: "No rompas la racha · {n} días por delante" },
  kgh_todays_quests:          { en: "Today's Quests",                            es: "Misiones de hoy" },
  kgh_no_quests:              { en: "No quests today. Free day! 🎉",             es: "Sin misiones hoy. ¡Día libre! 🎉" },
  kgh_side_quests:            { en: "Side Quests",                               es: "Misiones extra" },
  kgh_extra_xp:               { en: "(extra XP)",                                es: "(XP extra)" },
  kgh_world_map:              { en: "World Map",                                 es: "Mapa del mundo" },
  kgh_stats:                  { en: "Stats",                                     es: "Estadísticas" },
  kgh_start_quest:            { en: "▶ Start Quest: {title}",                    es: "▶ Empezar misión: {title}" },
  kgh_all_done:               { en: "All quests done! 🎉",                       es: "¡Todas las misiones hechas! 🎉" },
  kgh_menu_title:             { en: "Menu",                                      es: "Menú" },
  kgh_map_unlocked:           { en: "Unlocked",                                  es: "Desbloqueado" },

  // Reading Library
  rl_stat_finished:           { en: "finished",                                  es: "terminados" },
  rl_search_ph:               { en: "Search books — title, level, language…",    es: "Buscar libros — título, nivel, idioma…" },
  rl_no_match:                { en: "No books match \"{q}\".",                   es: "Ningún libro coincide con \"{q}\"." },
  rl_lang_label:              { en: "Language:",                                 es: "Idioma:" },
  rl_lang_all:                { en: "All",                                       es: "Todos" },
  rl_lang_en:                 { en: "🇺🇸 English",                                es: "🇺🇸 Inglés" },
  rl_lang_es:                 { en: "🇪🇸 Spanish",                                es: "🇪🇸 Español" },
  rl_view_list:               { en: "List",                                      es: "Lista" },
  rl_view_grid:               { en: "Grid",                                      es: "Cuadrícula" },
  rl_view_shelf:              { en: "Shelf",                                     es: "Estante" },
  rl_add_book:                { en: "Add a book",                                es: "Añadir un libro" },
  rl_add_backlog:             { en: "Add backlog",                               es: "Añadir histórico" },
  rl_nothing_in_progress:     { en: "Nothing in progress.",                      es: "Nada en progreso." },
  rl_archive_section:         { en: "Archive · pre-tracking ({n})",              es: "Archivo · antes del registro ({n})" },
  rl_archive_note:            { en: "Backlog books count toward totals + author stats but have no real dates, so they don't appear in date-based views (slideshows, \"this month,\" etc.).", es: "Los libros del histórico cuentan para los totales y estadísticas por autor pero no tienen fechas reales, así que no aparecen en vistas por fecha (presentaciones, \"este mes\", etc.)." },
  rl_search_hint:             { en: "Search is fuzzy — typos and partial titles still find the book. Logging start & finish dates shows pace; the level tag shows where they're reading.", es: "La búsqueda es flexible — los errores y títulos parciales encuentran el libro. Registrar fechas de inicio y fin muestra el ritmo; la etiqueta de nivel muestra el nivel de lectura." },
  rl_done_arranging:          { en: "Done arranging",                            es: "Listo" },
  rl_rearrange:               { en: "Rearrange",                                 es: "Reorganizar" },
  rl_reset_shelf:             { en: "Reset shelf order",                         es: "Restablecer el estante" },
  rl_custom_order:            { en: "custom order",                              es: "orden personalizado" },
  rl_sorted_by:               { en: "sorted by {label}",                         es: "ordenado por {label}" },
  rl_editing:                 { en: "Editing",                                   es: "Editando" },
  rl_close_aria:              { en: "Close",                                     es: "Cerrar" },
  rl_era_unset:               { en: "Era unset",                                 es: "Era sin definir" },

  // Book sort options
  bso_reading_order:          { en: "Reading order",                             es: "Orden de lectura" },
  bso_added_newest:           { en: "Newest added",                              es: "Añadidos recientemente" },
  bso_added_oldest:           { en: "Oldest added",                              es: "Añadidos hace más" },
  bso_title_az:               { en: "Title A–Z",                                 es: "Título A–Z" },
  bso_title_za:               { en: "Title Z–A",                                 es: "Título Z–A" },
  bso_author_az:              { en: "Author A–Z",                                es: "Autor A–Z" },
  bso_finished_newest:        { en: "Finished date",                             es: "Fecha terminado" },
  bso_rating_high:            { en: "Rating ★",                                  es: "Calificación ★" },

  // BookRow + BookEditPanel + AddBookForm + AddBacklogBookForm
  br_read_in_days:            { en: "read in {n}d",                              es: "leído en {n}d" },
  br_pre_tracking:            { en: "Pre-tracking",                              es: "Antes del registro" },
  br_read_count:              { en: "Read {n}×",                                 es: "Leído {n}×" },
  br_upload_cover_aria:       { en: "Upload book cover",                         es: "Subir portada del libro" },
  br_uploading:               { en: "Uploading…",                                es: "Subiendo…" },
  br_replace_cover:           { en: "Replace cover",                             es: "Reemplazar portada" },
  br_use_my_cover:            { en: "Use my cover",                              es: "Usar mi portada" },
  br_use_ol_cover:            { en: "Use OL cover",                              es: "Usar portada OL" },
  br_use_ol_aria:             { en: "Use the Open Library cover instead",        es: "Usar la portada de Open Library en su lugar" },
  br_cover_upload_fail:       { en: "Cover upload failed: {msg}",                es: "Error al subir la portada: {msg}" },
  br_edit_aria:               { en: "Edit",                                      es: "Editar" },
  br_editing_book:            { en: "Editing book",                              es: "Editando libro" },
  br_editing_backlog:         { en: "Editing backlog entry",                     es: "Editando entrada del histórico" },
  br_cover_label:             { en: "Cover",                                     es: "Portada" },
  br_cover_custom:            { en: "· custom",                                  es: "· personalizada" },
  br_cover_ol:                { en: "· Open Library",                            es: "· Open Library" },
  br_cover_none:              { en: "· none",                                    es: "· ninguna" },
  br_book_title_ph:           { en: "Book title",                                es: "Título del libro" },
  br_lang_english:            { en: "English",                                   es: "Inglés" },
  br_lang_spanish:            { en: "Spanish",                                   es: "Español" },
  br_reading_level_ph:        { en: "Reading level (e.g. ~2nd grade)",           es: "Nivel de lectura (ej. ~2º grado)" },
  br_reading_level_opt_ph:    { en: "Reading level (optional)",                  es: "Nivel de lectura (opcional)" },
  br_canonical_label:         { en: "Canonical title & author",                  es: "Título y autor canónicos" },
  br_canonical_aside:         { en: "(overrides Open Library)",                  es: "(reemplaza a Open Library)" },
  br_canonical_title_ph:      { en: "Canonical title",                           es: "Título canónico" },
  br_canonical_title_aria:    { en: "Canonical title",                           es: "Título canónico" },
  br_canonical_author_ph:     { en: "Author",                                    es: "Autor" },
  br_canonical_author_aria:   { en: "Canonical author",                          es: "Autor canónico" },
  br_status_label:            { en: "Status",                                    es: "Estado" },
  br_status_reading:          { en: "reading",                                   es: "leyendo" },
  br_status_finished:         { en: "finished",                                  es: "terminado" },
  br_status_wishlist:         { en: "wishlist",                                  es: "lista de deseos" },
  br_status_dropped:          { en: "dropped",                                   es: "abandonado" },
  br_started_label:           { en: "Started",                                   es: "Empezado" },
  br_finished_label:          { en: "Finished",                                  es: "Terminado" },
  br_era_label:               { en: "Era",                                       es: "Era" },
  br_era_custom:              { en: "Custom",                                    es: "Personalizada" },
  br_era_custom_ph:           { en: "Custom era (e.g. \"Summer 2025\")",         es: "Era personalizada (ej. \"Verano 2025\")" },
  br_era_kinder:              { en: "Kindergarten 2026",                         es: "Preescolar 2026" },
  br_era_before_may:          { en: "Before May 2026",                           es: "Antes de mayo 2026" },
  br_rating_label:            { en: "Rating",                                    es: "Calificación" },
  br_rate_n_stars:            { en: "Rate {n} stars",                            es: "Calificar {n} estrellas" },
  br_notes_optional_ph:       { en: "Notes (optional)",                          es: "Notas (opcional)" },
  br_cancel:                  { en: "Cancel",                                    es: "Cancelar" },
  br_save_changes:            { en: "Save changes",                              es: "Guardar cambios" },
  br_remove_book:             { en: "Remove this book",                          es: "Quitar este libro" },
  br_reclassify_hint:         { en: "To convert this book between tracked ↔ backlog, remove and re-add via the matching button on the Reading Library header.", es: "Para convertir entre registrado ↔ histórico, quítalo y vuelve a añadirlo con el botón correspondiente en la Biblioteca." },
  br_add_book:                { en: "Add book",                                  es: "Añadir libro" },
  br_backlog_kicker:          { en: "Backlog entry · no real date needed",       es: "Entrada del histórico · sin fecha real" },
  br_add_to_backlog:          { en: "Add to backlog",                            es: "Añadir al histórico" },

  // ParentToday (parent landing)
  pt_easy_mode:               { en: "😴 Easy mode",                              es: "😴 Modo fácil" },
  pt_next_reward:             { en: "Next reward",                               es: "Próximo premio" },
  pt_at_cost:                 { en: "{name} @ {n} ⭐",                            es: "{name} @ {n} ⭐" },
  pt_big_goal:                { en: "Big goal: {name} @ {n} ⭐",                  es: "Meta grande: {name} @ {n} ⭐" },
  pt_switch_mode:             { en: "Switch to {mode} mode",                     es: "Cambiar a modo {mode}" },
  pt_mode_school:             { en: "School",                                    es: "Escuela" },
  pt_mode_summer:             { en: "Summer",                                    es: "Verano" },
  pt_needs_fix_aria:          { en: "Needs fix",                                 es: "Necesita arreglo" },
  pt_reject_aria:             { en: "Reject",                                    es: "Rechazar" },
  pt_top8_complete:           { en: "✨ Top 8 complete — treasure ready to open!", es: "✨ Top 8 completo — ¡el tesoro está listo!" },
  pt_bonus_fallback:          { en: "Bonus",                                     es: "Bono" },
  pt_bonus_row_meta:          { en: "bonus stars · from {giver}{task} · tap to edit", es: "estrellas bonus · de {giver}{task} · toca para editar" },
  pt_bonus_row_task_suffix:   { en: " · {title}",                                es: " · {title}" },
  pt_bonus_edit_title:        { en: "Tap to edit this bonus",                    es: "Toca para editar este bono" },
  pt_restore_title:           { en: "Restore \"{title}\" to today's list",       es: "Restaurar \"{title}\" a la lista de hoy" },

  // MiniRow priority sheet
  mr_level_must:              { en: "Non-negotiable",                            es: "No negociable" },
  mr_level_today:             { en: "Do today",                                  es: "Hacer hoy" },
  mr_level_extra:             { en: "Extra credit",                              es: "Crédito extra" },
  mr_scope_today:             { en: "Today",                                     es: "Hoy" },
  mr_scope_week:              { en: "This week",                                 es: "Esta semana" },
  mr_scope_month:             { en: "This month",                                es: "Este mes" },
  mr_scope_always:            { en: "Always",                                    es: "Siempre" },

  // GiftStarsCard (bonus-star giving)
  gs_cta:                     { en: "Gift bonus stars",                          es: "Regalar estrellas bonus" },
  gs_today_pill:              { en: "{n}⭐ today",                                es: "{n}⭐ hoy" },
  gs_already_gifted_short:    { en: "Already gifted today",                      es: "Ya regalado hoy" },
  gs_already_gifted:          { en: "Already gifted today ({n}⭐)",               es: "Ya regalado hoy ({n}⭐)" },
  gs_intro:                   { en: "For great stuff that isn't on the list — extra reading, helping others, kindness.", es: "Por cosas geniales que no están en la lista — lectura extra, ayudar a los demás, amabilidad." },
  gs_no_double:               { en: "Don't double-gift — pick a different reason or amount.", es: "No regales doble — elige otra razón u otra cantidad." },
  gs_label_ph:                { en: "What did they do? e.g. Extra 30 min reading", es: "¿Qué hizo? ej. 30 min extra de lectura" },
  gs_for_task:                { en: "For which task?",                           es: "¿Para qué tarea?" },
  gs_optional_aside:          { en: "(optional)",                                es: "(opcional)" },
  gs_general_bonus:           { en: "— general bonus —",                          es: "— bono general —" },
  gs_which_book:              { en: "Which book?",                               es: "¿Qué libro?" },
  gs_pick_book:               { en: "— pick a book —",                            es: "— elige un libro —" },
  gs_add_new_book:            { en: "Add a new book",                            es: "Añadir un libro nuevo" },
  gs_already_finished:        { en: "✓ Already finished",                        es: "✓ Ya terminado" },
  gs_kid_finished:            { en: "{kid} finished this book today 📚",         es: "{kid} terminó el libro hoy 📚" },
  gs_book_title_ph:           { en: "Book title",                                es: "Título del libro" },
  gs_book_author_ph:          { en: "Author (optional)",                         es: "Autor (opcional)" },
  gs_cancel:                  { en: "Cancel",                                    es: "Cancelar" },
  gs_add_book:                { en: "Add book",                                  es: "Añadir libro" },
  gs_which_song:              { en: "Which song?",                               es: "¿Qué canción?" },
  gs_pick_song:               { en: "— pick a song —",                            es: "— elige una canción —" },
  gs_add_new_song:            { en: "Add a new song",                            es: "Añadir una canción nueva" },
  gs_song_title_ph:           { en: "Song title",                                es: "Título de la canción" },
  gs_song_artist_ph:          { en: "Artist (optional)",                         es: "Artista (opcional)" },
  gs_add_song:                { en: "Add song",                                  es: "Añadir canción" },
  gs_stars_label:             { en: "Stars",                                     es: "Estrellas" },
  gs_photo_proof:             { en: "Photo proof",                               es: "Foto de prueba" },
  gs_photo_attached:          { en: "Photo attached",                            es: "Foto adjuntada" },
  gs_photo_remove:            { en: "Remove",                                    es: "Quitar" },
  gs_photo_uploading:         { en: "Uploading…",                                es: "Subiendo…" },
  gs_photo_add:               { en: "Add a photo",                               es: "Añadir una foto" },
  gs_photo_upload_fail:       { en: "Photo upload failed: {msg}",                es: "Error al subir la foto: {msg}" },
  gs_give_n:                  { en: "Give {n}⭐",                                 es: "Dar {n}⭐" },

  // EditGiftSheet (parent taps a bonus row to edit)
  eg_kicker:                  { en: "Edit bonus stars",                          es: "Editar estrellas bonus" },
  eg_currently:               { en: "currently {n}⭐",                            es: "actualmente {n}⭐" },
  eg_save_same:               { en: "Save changes to \"{label}\"?\n\nStar amount stays at {n}.", es: "¿Guardar cambios en \"{label}\"?\n\nLa cantidad de estrellas se queda en {n}." },
  eg_save_up:                 { en: "Save changes to \"{label}\"?\n\nThe star bank will go up by {n} stars.", es: "¿Guardar cambios en \"{label}\"?\n\nEl banco subirá {n} estrellas." },
  eg_save_down:               { en: "Save changes to \"{label}\"?\n\nThe star bank will drop by {n} stars.", es: "¿Guardar cambios en \"{label}\"?\n\nEl banco bajará {n} estrellas." },
  eg_delete_confirm:          { en: "Delete this gift?\n\n\"{label}\" (+{n}⭐)\n\nThe star bank will drop by {n} stars and the row goes away.", es: "¿Borrar este regalo?\n\n\"{label}\" (+{n}⭐)\n\nEl banco bajará {n} estrellas y la fila desaparecerá." },
  eg_delete:                  { en: "Delete",                                    es: "Borrar" },
  eg_save:                    { en: "Save",                                      es: "Guardar" },

  // DetailSheet (parent taps a task row → drill-down sheet)
  ds_required:                { en: " · required",                               es: " · obligatorio" },
  ds_optional:                { en: " · optional",                               es: " · opcional" },
  ds_tab_stats:               { en: "Stats",                                     es: "Estadísticas" },
  ds_tab_photos:              { en: "Photos",                                    es: "Fotos" },
  ds_tab_notes:               { en: "Notes",                                     es: "Notas" },
  ds_tab_edit:                { en: "Edit",                                      es: "Editar" },
  ds_current_streak:          { en: "current streak",                            es: "racha actual" },
  ds_best_ever:               { en: "best ever",                                 es: "mejor récord" },
  ds_stats_hint:              { en: "Filled = did it, connected across the week. The {wk} column shows how many days that week. Tap ‹ › to scroll months.", es: "Lleno = lo hizo, conectado durante la semana. La columna {wk} muestra cuántos días esa semana. Toca ‹ › para cambiar de mes." },
  ds_no_media:                { en: "No photos or videos yet. A grown-up can snap one from the checklist — it'll show here with the date & place. 📷", es: "Aún no hay fotos ni videos. Un adulto puede tomar una desde la lista — aparecerá aquí con la fecha y el lugar. 📷" },
  ds_media_hint:              { en: "Every photo you attach here joins the year-long portfolio.", es: "Cada foto que añadas aquí entra en el portafolio anual." },
  ds_note_ph:                 { en: "Add a note about this — progress, what to work on, what the teacher said…", es: "Añade una nota — progreso, en qué trabajar, lo que dijo el maestro…" },
  ds_add_note:                { en: "Add note",                                  es: "Añadir nota" },
  ds_note_parent_fallback:    { en: "Parent",                                    es: "Adulto" },
  ds_star_value:              { en: "Star value",                                es: "Valor en estrellas" },
  ds_priority:                { en: "Priority",                                  es: "Prioridad" },
  ds_clear:                   { en: "Clear",                                     es: "Quitar" },
  ds_streak:                  { en: "Streak",                                    es: "Racha" },
  ds_streak_current:          { en: "Current",                                   es: "Actual" },
  ds_streak_best:             { en: "Best",                                      es: "Mejor" },
  ds_streak_since:            { en: "Since",                                     es: "Desde" },
  ds_streak_plus_one:         { en: "+1 day today",                              es: "+1 día hoy" },
  ds_streak_stop:             { en: "Stop",                                      es: "Detener" },
  ds_streak_start:            { en: "Start tracking a streak →",                 es: "Empezar a registrar una racha →" },
  ds_unpause_task:            { en: "Un-pause task",                             es: "Reanudar tarea" },
  ds_pause_task:              { en: "Pause task",                                es: "Pausar tarea" },
  ds_remove_task:             { en: "Remove",                                    es: "Quitar" },
  ds_legend_did_it:           { en: "did it",                                    es: "lo hizo" },
  ds_legend_wk:               { en: "Wk = days that week",                       es: "Sem = días esa semana" },
  ds_wk_short:                { en: "Wk",                                        es: "Sem" },
  ds_stat_this_week:          { en: "this week",                                 es: "esta semana" },
  ds_stat_streak:             { en: "streak",                                    es: "racha" },

  // ProgressSheet (activity-level drill-down)
  ps_subtitle:                { en: "progress & consistency",                    es: "progreso y constancia" },
  ps_hint:                    { en: "Filled = did it. The {wk} column shows how many days that week — spot which weeks ran hot. 🔥", es: "Lleno = lo hizo. La columna {wk} muestra cuántos días esa semana — ve qué semanas fueron de fuego. 🔥" },

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
