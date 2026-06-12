/* =====================================================================
   Data audit — pure functions over the family dataset.

   Architecture §3 says "derive everything at display time" — there
   are no cached totals. That makes drift unlikely, but doesn't make
   it impossible: bad imports, orphaned references after a delete,
   and ISO/local date mixups are all real ways the dataset can lie.

   This module enumerates lightweight invariants and returns a flat
   array of findings. Each finding is one of:
     { level: "ok"     | "warn" | "error",
       check: "unique-name",        // stable id for UI grouping
       message: "human summary",
       details?: [...] }            // optional list of specifics
   The UI renders the list; this file makes no UI choices.
   ===================================================================== */

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

const isIso = (s) => typeof s === "string" && ISO_RE.test(s);

export function runDataAudit({
  completions = [],
  tasks = [],
  gifted = [],
  redemptions = [],
  songs = [],
  songPlays = [],
  books = [],
  albumPhotos = [],
  users = [],
  starBank = 0,
  base = 0,
} = {}) {
  const out = [];
  const taskIds = new Set(tasks.map((t) => t.id));
  const songIds = new Set(songs.map((s) => s.id));
  const userIds = new Set(users.map((u) => u.id));

  // 1) Bank arithmetic: starBank should == base + sum(earned) + sum(gifted) - sum(redeemed).
  const earnedTotal = completions
    .filter((c) => c.status === "approved")
    .reduce((s, c) => s + (Number(c.awardedStars) || 0), 0);
  const giftedTotal = gifted.reduce((s, g) => s + (Number(g.stars) || 0), 0);
  const redeemedTotal = redemptions
    .filter((r) => r.status === "approved")
    .reduce((s, r) => s + (Number(r.cost) || 0), 0);
  const expected = (Number(base) || 0) + earnedTotal + giftedTotal - redeemedTotal;
  if (Number(starBank) === expected) {
    out.push({
      level: "ok",
      check: "bank-math",
      message: `Bank math checks out (${starBank}⭐ = ${base} base + ${earnedTotal} earned + ${giftedTotal} gifted − ${redeemedTotal} redeemed).`,
    });
  } else {
    out.push({
      level: "error",
      check: "bank-math",
      message: `Bank shows ${starBank}⭐ but the math says ${expected}⭐. Drift: ${Number(starBank) - expected}⭐.`,
      details: [
        `base: ${base}`,
        `earned (approved): ${earnedTotal}`,
        `gifted: ${giftedTotal}`,
        `redeemed (approved): ${redeemedTotal}`,
      ],
    });
  }

  // 2) Orphan completions — taskId no longer exists in tasks.
  const orphanCompletions = completions.filter((c) => c.taskId && !taskIds.has(c.taskId));
  if (orphanCompletions.length === 0) {
    out.push({ level: "ok", check: "orphan-completions", message: "Every completion points at a real task." });
  } else {
    out.push({
      level: "warn",
      check: "orphan-completions",
      message: `${orphanCompletions.length} completion${orphanCompletions.length === 1 ? "" : "s"} reference deleted task${orphanCompletions.length === 1 ? "" : "s"}.`,
      details: orphanCompletions.slice(0, 5).map((c) => `${c.completionDate || "(no date)"} · task ${c.taskId} · ${c.awardedStars || 0}⭐`),
    });
  }

  // 3) Orphan song plays — songId no longer in songs.
  const orphanPlays = songPlays.filter((p) => p.songId && !songIds.has(p.songId));
  if (orphanPlays.length === 0) {
    out.push({ level: "ok", check: "orphan-song-plays", message: "Every song play points at a real song." });
  } else {
    out.push({
      level: "warn",
      check: "orphan-song-plays",
      message: `${orphanPlays.length} song play${orphanPlays.length === 1 ? "" : "s"} reference deleted song${orphanPlays.length === 1 ? "" : "s"}.`,
      details: orphanPlays.slice(0, 5).map((p) => `${p.playedOn || "(no date)"} · song ${p.songId}`),
    });
  }

  // 4) Date integrity — completion_date, gifted.date, redemption.completionDate.
  const badDates = [];
  for (const c of completions) {
    if (c.completionDate && !isIso(c.completionDate)) {
      badDates.push(`completion ${c.id}: completionDate "${c.completionDate}"`);
    }
  }
  for (const g of gifted) {
    if (g.date && !isIso(g.date)) badDates.push(`gift ${g.id}: date "${g.date}"`);
  }
  for (const r of redemptions) {
    if (r.completionDate && !isIso(r.completionDate)) {
      badDates.push(`redemption ${r.id}: completionDate "${r.completionDate}"`);
    }
  }
  for (const p of songPlays) {
    if (p.playedOn && !isIso(p.playedOn)) badDates.push(`song play ${p.id}: playedOn "${p.playedOn}"`);
  }
  if (badDates.length === 0) {
    out.push({ level: "ok", check: "iso-dates", message: "Every date field is ISO YYYY-MM-DD." });
  } else {
    out.push({
      level: "error",
      check: "iso-dates",
      message: `${badDates.length} row${badDates.length === 1 ? "" : "s"} use a non-ISO date string. Postgres date columns will reject these on next sync.`,
      details: badDates.slice(0, 8),
    });
  }

  // 5) Unknown gifters — gifted.by should resolve to a user.
  const unknownGifters = gifted.filter((g) => g.by && !userIds.has(g.by));
  if (unknownGifters.length === 0) {
    out.push({ level: "ok", check: "unknown-gifters", message: "Every gift has a known giver." });
  } else {
    out.push({
      level: "warn",
      check: "unknown-gifters",
      message: `${unknownGifters.length} gift${unknownGifters.length === 1 ? "" : "s"} reference a user not in the roster.`,
      details: unknownGifters.slice(0, 5).map((g) => `${g.date || "(no date)"} · ${g.stars}⭐ · by ${g.by}`),
    });
  }

  // 6) Approval identity — approved completions should have approvedBy.
  const approvedNoBy = completions.filter((c) => c.status === "approved" && !c.approvedBy);
  if (approvedNoBy.length === 0) {
    out.push({ level: "ok", check: "approval-identity", message: "Every approved completion records who approved it." });
  } else {
    out.push({
      level: "warn",
      check: "approval-identity",
      message: `${approvedNoBy.length} approved completion${approvedNoBy.length === 1 ? "" : "s"} have no approvedBy.`,
      details: approvedNoBy.slice(0, 5).map((c) => `${c.completionDate || "(no date)"} · task ${c.taskId} · ${c.awardedStars || 0}⭐`),
    });
  }

  // 7) Book status sanity — finished date should mean status finished/archive.
  const finishedDateNoStatus = books.filter((b) => b.finished && !["finished", "archive"].includes(b.status));
  if (finishedDateNoStatus.length === 0) {
    out.push({ level: "ok", check: "book-finished-status", message: "Books with finished dates are marked finished/archived." });
  } else {
    out.push({
      level: "warn",
      check: "book-finished-status",
      message: `${finishedDateNoStatus.length} book${finishedDateNoStatus.length === 1 ? "" : "s"} have a finished date but a non-finished status.`,
      details: finishedDateNoStatus.slice(0, 5).map((b) => `"${b.title}" · status: ${b.status} · finished: ${b.finished}`),
    });
  }

  // 8) Photo dates — album_photos with neither takenAt nor createdAt.
  const photosNoDate = albumPhotos.filter((p) => !p.takenAt && !p.createdAt);
  if (photosNoDate.length === 0) {
    out.push({ level: "ok", check: "photo-dates", message: "Every photo has at least one date stamp." });
  } else {
    out.push({
      level: "warn",
      check: "photo-dates",
      message: `${photosNoDate.length} photo${photosNoDate.length === 1 ? "" : "s"} have no date — they'll sort to the bottom of the portfolio.`,
    });
  }

  return out;
}

export function auditSummary(findings) {
  let ok = 0, warn = 0, error = 0;
  for (const f of findings) {
    if (f.level === "ok") ok++;
    else if (f.level === "warn") warn++;
    else if (f.level === "error") error++;
  }
  return { ok, warn, error, total: findings.length };
}
