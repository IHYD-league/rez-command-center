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
    // Admin = "can act as any profile" capability. Set on the
    // canonical owner of the family (Mike). Trigger enforce_actor_
    // identity_trg uses the same flag server-side; this client copy
    // drives the LoginScreen visibility filter.
    isAdmin: r.is_admin ?? false,
  }),

  task: (r) => ({
    id: r.id,
    title: r.title,
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
  }),

  gifted: (r) => ({
    id: r.id,
    label: r.label,
    stars: r.stars,
    by: r.given_by,
    date: r.given_on,
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
    externalSource:  r.external_source || "",
    externalId:      r.external_id || "",
    enrichedAt:      r.enriched_at || null,
    matchStatus:     r.match_status || "unmatched",
    // Phase 6b polish: parent-uploaded album cover. Storage path, not
    // URL — resolved to a signed URL at display time. Takes precedence
    // over cover_url (MB/CAA cache) when present.
    customCoverPath: r.custom_cover_path || "",
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
  }),

  task: (familyId) => (o) => ({
    id: o.id,
    family_id: familyId,
    title: o.title,
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
    status: o.status ?? "requested",
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
  }),

  gifted: (familyId) => (o) => ({
    id: o.id,
    family_id: familyId,
    label: o.label,
    stars: o.stars,
    given_by: o.by ?? null,
    given_on: o.date ?? new Date().toISOString().slice(0, 10),
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
    external_source:  o.externalSource || null,
    external_id:      o.externalId || null,
    enriched_at:      o.enrichedAt || null,
    match_status:     o.matchStatus || "unmatched",
    custom_cover_path: o.customCoverPath || null,
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
