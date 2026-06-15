// DB column shape ↔ App object shape converters, one per entity.
// Keep these dumb and explicit — easier to debug than a generic mapper.

export const toApp = {
  profile: (r) => ({
    id: r.id,
    auth_user_id: r.auth_user_id,
    email: r.email,
    name: r.name,
    role: r.role,
    relationship: r.relationship,
    color: r.color,
    emoji: r.emoji,
    photo: r.photo_path,
    active: r.active,
    accessType: r.access_type,
    accessExpires: r.access_expires,
    permissions: r.permissions ?? {},
    is_child: r.is_child,
    kid_meta: r.kid_meta ?? {},
    // Free-text grade level for kid profiles (K, 1st, 2nd, …, 12th, or
    // anything the parent types). NULL on non-kids and on un-set kids.
    grade: r.grade ?? null,
    // Admin = "can act as any profile" capability. Set on the
    // canonical owner of the family (Mike). Trigger enforce_actor_
    // identity_trg uses the same flag server-side; this client copy
    // drives the LoginScreen visibility filter.
    isAdmin: r.is_admin ?? false,
  }),

  task: (r) => ({
    id: r.id,
    title: r.title,
    // Per-task multilingual title overrides (Phase 2 of the
    // multilingual roadmap). Empty {} on rows that pre-date the
    // migration. i18n.taskTitle reads this first, then the static
    // seeded map, then the raw title.
    nameI18n: r.name_i18n ?? {},
    category: r.category,
    activityType: r.activity_type,
    activityId: r.activity_id,
    required: r.required,
    starValue: r.star_value,
    bonusStarValue: r.bonus_star_value,
    proofRequired: r.proof_required,
    proofType: r.proof_type,
    approvalRequired: r.approval_required,
    mode: r.mode,
    minutes: r.minutes,
    days: r.days,
    subtasks: r.subtasks,
    active: r.active,
    // Per-task generic stat field schema (Phase 1 of the activity-
    // stats system). Empty {} on rows that pre-date the migration.
    // TaskSheet's iteration-2 reader will use this when present and
    // fall back to the proofType branches otherwise.
    statSchema: r.stat_schema ?? {},
    // any_day: when true, the today filter ignores mode + days and
    // the task is available every day. Default false. Used by the
    // "Available any day" toggle in TaskEditRow.
    anyDay: r.any_day ?? false,
  }),

  reward: (r) => ({
    id: r.id,
    title: r.title,
    starCost: r.star_cost,
    category: r.category,
    active: r.active,
  }),

  completion: (r) => ({
    id: r.id,
    taskId: r.task_id,
    status: r.status,
    awardedStars: r.awarded_stars,
    pendingStars: r.pending_stars,
    completedBy: r.completed_by,
    submittedBy: r.submitted_by,
    approvedBy: r.approved_by,
    notes: r.notes ?? "",
    proof: r.proof ?? [],
    extra: r.extra ?? {},
    completionDate: r.completion_date,
  }),

  streakRow: (r) => [r.activity_id, {
    current: r.current,
    longest: r.longest,
    since: r.since,
    lastDate: r.last_date,
  }],

  book: (r) => ({
    id: r.id,
    title: r.title,
    lang: r.lang,
    status: r.status,
    started: r.started ?? "",
    finished: r.finished ?? "",
    level: r.level,
    rating: r.rating,
    notes: r.notes,
    // Pre-tracking backlog provenance (orthogonal to status).
    // When true, started/finished are NULL by convention — the era
    // label carries the rough when.
    preTracking: r.pre_tracking ?? false,
    eraLabel: r.era_label || "",
    // Re-read counter — defaults to 1 in the DB so every existing
    // book gets credit for the read we already know about. The
    // Reading Library picker increments this when an existing book
    // is selected for a Round 2+.
    readCount: r.read_count ?? 1,
    // Phase 6a: Open Library enrichment cache. NULL on existing rows
    // until the first auto-match writes them. matchStatus = "unmatched"
    // by DB default so the auto-enrich effect picks them up.
    coverUrl:        r.cover_url || "",
    canonicalTitle:  r.canonical_title || "",
    canonicalAuthor: r.canonical_author || "",
    externalSource:  r.external_source || "",
    externalId:      r.external_id || "",
    enrichedAt:      r.enriched_at || null,
    matchStatus:     r.match_status || "unmatched",
    // Books polish: parent-uploaded book cover. Storage path, not URL —
    // resolved to a signed URL at display time. Takes precedence over
    // cover_url (Open Library cache) when present. Mirrors the song
    // customCoverPath shape.
    customCoverPath: r.custom_cover_path || "",
  }),

  award: (r) => ({
    id: r.id,
    title: r.title,
    type: r.type,
    activityId: r.activity_id,
    date: r.award_date,
    fileName: r.file_name,
    filePath: r.file_path,
    url: r.url ?? "",
    note: r.note ?? "",
  }),

  rewardRequest: (r) => ({
    id: r.id,
    title: r.title,
    note: r.note ?? "",
    status: r.status,
    starCost: r.star_cost,
    by: r.requested_by,
  }),

  albumPhoto: (r) => ({
    id: r.id,
    uploadedBy: r.uploaded_by,
    path: r.path,
    caption: r.caption ?? "",
    takenAt: r.taken_at,
    activityId: r.activity_id,
    createdAt: r.created_at,
  }),

  redemption: (r) => ({
    id: r.id,
    rewardId: r.reward_id,
    title: r.title,
    cost: r.cost,
    status: r.status,
    requestedBy: r.requested_by,
    // Approver actor + timestamp (set by decideReward). NULL on
    // legacy rows that never went through the new audit path.
    approvedBy: r.approved_by ?? null,
    approvedAt: r.approved_at ?? null,
  }),

  gifted: (r) => ({
    id: r.id,
    label: r.label,
    stars: r.stars,
    by: r.given_by,
    date: r.given_on,
    // extra: jsonb metadata for the richer gift flow. May carry
    // taskId / activityId / bookId / songId / photoPath / photoName.
    // Coerced to {} so downstream display code can always destructure.
    extra: r.extra ?? {},
    // Soft-delete columns (audit trail for destructive removes).
    // The DataProvider filters out rows with deletedAt set before
    // they reach the app — these fields are surfaced here for an
    // eventual "Recently removed" admin view.
    deletedAt: r.deleted_at ?? null,
    deletedBy: r.deleted_by ?? null,
  }),

  activity: (r) => ({
    id: r.id,
    name: r.name,
    short: r.short_name || "",
    color: r.color || "#64748b",
    pillar: r.pillar || "body",
    status: r.status || "active",
    note: r.note || "",
    address: r.address || "",
    schedule: Array.isArray(r.schedule) ? r.schedule : [],
    weeklySchedule: !!r.weekly_schedule,
    weeklyTarget: r.weekly_target ?? null,
  }),

  song: (r) => ({
    id: r.id,
    title: r.title,
    artist: r.artist,
    difficulty: r.difficulty,
    createdAt: r.created_at,
    // Phase 6b: MusicBrainz + Cover Art Archive enrichment cache.
    // NULL on existing rows until the first auto-match writes them.
    // matchStatus = "unmatched" by DB default so the auto-enrich
    // effect picks them up.
    coverUrl:        r.cover_url || "",
    canonicalTitle:  r.canonical_title || "",
    canonicalArtist: r.canonical_artist || "",
    canonicalAlbum:  r.canonical_album || "",
    externalSource:  r.external_source || "",
    externalId:      r.external_id || "",
    enrichedAt:      r.enriched_at || null,
    matchStatus:     r.match_status || "unmatched",
    // Phase 6b polish: parent-uploaded album cover. Storage path, not
    // URL — resolved to a signed URL at display time. Takes precedence
    // over cover_url (MB/CAA cache) when present.
    customCoverPath: r.custom_cover_path || "",
    // iTunes trackTimeMillis. NULL on un-enriched or pre-backfill rows;
    // the drum minutes calc treats null as 0 so a missing duration
    // never silently negates a play.
    durationMs:      r.duration_ms ?? null,
  }),

  songPlay: (r) => ({
    id: r.id,
    songId: r.song_id,
    playedOn: r.played_on,
    playedBy: r.played_by,
    notes: r.notes ?? "",
  }),

  boardStateRow: (r) => [r.profile_id, {
    lastPosition: r.last_position ?? 0,
    treasureClaimedOn: r.treasure_claimed_on ?? null,
  }],

  userPrefsRow: (r) => [r.profile_id, {
    prefs: r.prefs ?? {},
    updatedAt: r.updated_at,
  }],

  // SummerQuest per-profile progress. Same composite-key shape as
  // boardStateRow / userPrefsRow. `done` is the brief §2 contract:
  // { "1": {build,math,code,read}, ..., "7": {...} }.
  summerQuestRow: (r) => [r.profile_id, {
    mode: r.mode || "home",
    done: r.done || {},
  }],

  event: (r) => ({
    id: r.id,
    title: r.title,
    date: r.event_date,
    time: r.event_time ?? null,            // "HH:MM" 24h, or null for all-day
    recurWeekday: r.recur_weekday ?? null, // 0..6 or null
    address: r.address ?? "",
    category: r.category ?? "",
    notes: r.notes ?? "",
  }),

  handoffNote: (r) => ({
    id: r.id,
    authorId: r.author_id,
    note: r.note,
    pinned: r.pinned ?? false,
    // Cheap "time" for display — UI was using a stringy "9:40 AM";
    // re-derive that from posted_at so reloads show consistent labels.
    time: r.posted_at
      ? new Date(r.posted_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
      : "",
    postedAt: r.posted_at,
  }),
};

export const toDb = {
  profile: (familyId) => (o) => ({
    id: o.id,
    family_id: familyId,
    auth_user_id: o.auth_user_id ?? null,
    email: o.email ?? null,
    name: o.name,
    role: o.role,
    relationship: o.relationship,
    color: o.color,
    emoji: o.emoji,
    photo_path: o.photo && !/^(https?|data|blob):/.test(o.photo) ? o.photo : null,
    active: o.active ?? true,
    access_type: o.accessType ?? "permanent",
    access_expires: o.accessExpires ?? null,
    permissions: o.permissions ?? {},
    is_child: o.is_child ?? false,
    kid_meta: o.kid_meta ?? {},
    grade: o.grade ?? null,
  }),

  task: (familyId) => (o) => ({
    id: o.id,
    family_id: familyId,
    title: o.title,
    name_i18n: o.nameI18n ?? {},
    category: o.category,
    activity_type: o.activityType,
    activity_id: o.activityId,
    required: o.required ?? false,
    star_value: o.starValue ?? 0,
    bonus_star_value: o.bonusStarValue ?? null,
    proof_required: o.proofRequired ?? false,
    proof_type: o.proofType ?? null,
    approval_required: o.approvalRequired ?? false,
    mode: o.mode ?? "both",
    minutes: o.minutes ?? null,
    days: o.days ?? null,
    subtasks: o.subtasks ?? null,
    active: o.active ?? true,
    // Schema is intentionally not pruned to keep the postgrest batch
    // upsert NULL-padding rule happy (per memory:
    // feedback_postgrest_batch_column_normalization). Always send it
    // even when empty so the column normalizer doesn't blank out
    // existing rows in the same batch.
    stat_schema: o.statSchema ?? {},
    any_day: o.anyDay ?? false,
  }),

  reward: (familyId) => (o) => ({
    id: o.id,
    family_id: familyId,
    title: o.title,
    star_cost: o.starCost,
    category: o.category,
    active: o.active ?? true,
  }),

  completion: (familyId) => (o) => ({
    id: o.id,
    family_id: familyId,
    task_id: o.taskId,
    status: o.status,
    awarded_stars: o.awardedStars ?? 0,
    pending_stars: o.pendingStars ?? 0,
    completed_by: o.completedBy ?? null,
    submitted_by: o.submittedBy ?? null,
    approved_by: o.approvedBy ?? null,
    notes: o.notes ?? "",
    proof: o.proof ?? [],
    extra: o.extra ?? {},
    completion_date: o.completionDate ?? new Date().toISOString().slice(0, 10),
  }),

  streakRow: (familyId) => (activityId, s) => ({
    family_id: familyId,
    activity_id: activityId,
    current: s.current ?? 0,
    longest: s.longest ?? 0,
    since: s.since ?? null,
    last_date: s.lastDate ?? null,
  }),

  book: (familyId) => (o) => ({
    id: o.id,
    family_id: familyId,
    title: o.title,
    lang: o.lang,
    status: o.status,
    started: o.started || null,
    finished: o.finished || null,
    level: o.level,
    rating: o.rating ?? null,
    notes: o.notes,
    pre_tracking: !!o.preTracking,
    era_label: o.eraLabel || null,
    read_count: Math.max(1, Number(o.readCount) || 1),
    cover_url:        o.coverUrl || null,
    canonical_title:  o.canonicalTitle || null,
    canonical_author: o.canonicalAuthor || null,
    external_source:  o.externalSource || null,
    external_id:      o.externalId || null,
    // enriched_at written via toIsoOrNow; let the JS layer pass a
    // string when stamping a fresh match, else leave null.
    enriched_at:      o.enrichedAt || null,
    match_status:     o.matchStatus || "unmatched",
    custom_cover_path: o.customCoverPath || null,
  }),

  award: (familyId) => (o) => ({
    id: o.id,
    family_id: familyId,
    title: o.title,
    type: o.type,
    activity_id: o.activityId,
    award_date: o.date || null,
    file_name: o.fileName ?? null,
    file_path: o.filePath ?? null,
    url: o.url || null,
    note: o.note ?? "",
  }),

  rewardRequest: (familyId) => (o) => ({
    id: o.id,
    family_id: familyId,
    title: o.title,
    note: o.note ?? "",
    // DB check constraint allows 'requested' | 'approved' | 'declined'.
    // An earlier Deny button bug saved 'denied' into local state for
    // some rows, which then broke every subsequent batch upsert with
    // a constraint violation. Normalize at the toDb boundary so any
    // legacy "denied" gets coerced to the legal "declined" before sync.
    status: (o.status === "denied" ? "declined" : (o.status ?? "requested")),
    star_cost: o.starCost ?? null,
    requested_by: o.by ?? null,
  }),

  albumPhoto: (familyId) => (o) => ({
    id: o.id,
    family_id: familyId,
    uploaded_by: o.uploadedBy ?? null,
    path: o.path,
    caption: o.caption ?? null,
    taken_at: o.takenAt || null,
    activity_id: o.activityId ?? null,
    // created_at must be in the payload for EVERY row in the batch.
    // PostgREST normalizes the column set across an upsert batch: if
    // any other row in the batch has created_at, missing rows are
    // padded with NULL, which trips the NOT NULL constraint even
    // though the DB has a default of now(). Always provide it —
    // echo the loaded value for existing rows, stamp now() for new ones.
    created_at: o.createdAt || new Date().toISOString(),
  }),

  redemption: (familyId) => (o) => ({
    id: o.id,
    family_id: familyId,
    reward_id: o.rewardId,
    title: o.title,
    cost: o.cost,
    status: o.status ?? "requested",
    requested_by: o.requestedBy ?? null,
    // Always emit so batch upserts don't NULL-pad an approved row
    // that's in the same batch as a new requested one.
    approved_by: o.approvedBy ?? null,
    approved_at: o.approvedAt ?? null,
  }),

  gifted: (familyId) => (o) => ({
    id: o.id,
    family_id: familyId,
    label: o.label,
    stars: o.stars,
    given_by: o.by ?? null,
    given_on: o.date ?? new Date().toISOString().slice(0, 10),
    // Always emit extra (even as {}) so the PostgREST batch column
    // normalization never NULL-pads an existing row's metadata.
    extra: o.extra ?? {},
    // Soft-delete columns. Always send so a batch upsert doesn't
    // accidentally clear the deleted_at on an existing row that
    // happens to be in the same batch as an active one.
    deleted_at: o.deletedAt ?? null,
    deleted_by: o.deletedBy ?? null,
  }),

  activity: (familyId) => (o) => ({
    id: o.id,
    family_id: familyId,
    name: o.name,
    short_name: o.short || null,
    color: o.color || null,
    pillar: o.pillar || null,
    status: o.status || "active",
    note: o.note || null,
    address: o.address || null,
    schedule: Array.isArray(o.schedule) ? o.schedule : [],
    weekly_schedule: !!o.weeklySchedule,
    weekly_target: o.weeklyTarget ?? null,
  }),

  song: (familyId) => (o) => ({
    id: o.id,
    family_id: familyId,
    title: o.title,
    artist: o.artist ?? null,
    difficulty: o.difficulty ?? null,
    cover_url:        o.coverUrl || null,
    canonical_title:  o.canonicalTitle || null,
    canonical_artist: o.canonicalArtist || null,
    canonical_album:  o.canonicalAlbum || null,
    external_source:  o.externalSource || null,
    external_id:      o.externalId || null,
    enriched_at:      o.enrichedAt || null,
    match_status:     o.matchStatus || "unmatched",
    custom_cover_path: o.customCoverPath || null,
    duration_ms:      Number.isFinite(o.durationMs) ? o.durationMs : null,
  }),

  songPlay: (familyId) => (o) => ({
    id: o.id,
    family_id: familyId,
    song_id: o.songId,
    played_on: o.playedOn ?? new Date().toISOString().slice(0, 10),
    played_by: o.playedBy ?? null,
    notes: o.notes ?? null,
  }),

  boardStateRow: (familyId) => (profileId, s) => ({
    family_id: familyId,
    profile_id: profileId,
    last_position: s.lastPosition ?? 0,
    treasure_claimed_on: s.treasureClaimedOn ?? null,
  }),

  userPrefsRow: (familyId) => (profileId, s) => ({
    family_id: familyId,
    profile_id: profileId,
    prefs: s.prefs ?? {},
  }),

  summerQuestRow: (familyId) => (profileId, s) => ({
    family_id: familyId,
    profile_id: profileId,
    mode: s.mode || "home",
    done: s.done || {},
  }),

  event: (familyId) => (o) => ({
    id: o.id,
    family_id: familyId,
    title: o.title,
    event_date: o.date || null,
    event_time: o.time || null,
    recur_weekday: Number.isInteger(o.recurWeekday) ? o.recurWeekday : null,
    address: o.address || null,
    category: o.category ?? null,
    notes: o.notes ?? null,
  }),

  handoffNote: (familyId) => (o) => ({
    id: o.id,
    family_id: familyId,
    author_id: o.authorId ?? null,
    note: o.note,
    pinned: o.pinned ?? false,
  }),
};
