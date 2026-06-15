// Build the weekly digest data + HTML for a single family.
//
// Why client-side: every read goes through the user's authenticated
// Supabase session, so RLS gives us exactly the family the user
// belongs to. No service-role keys, no cross-family leak risk. The
// Netlify function (send-email.js) just relays the rendered HTML to
// Resend.
//
// All numbers are derived from the same state the in-app surfaces
// read — so a parent who opens the digest and then opens Insights
// sees the same totals.

const DAY_MS = 86400000;

function startOfWeekIso(now = new Date()) {
  // Sunday-start; covers last 7 days INCLUSIVE of today. The Friday
  // digest fires on Friday so this naturally wraps "this week so far"
  // (Sun→Fri) which is what parents want.
  const sevenAgo = new Date(now.getTime() - 7 * DAY_MS);
  return sevenAgo.toISOString().slice(0, 10);
}

function todayIso(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

export function buildDigestData({
  kid,
  completions = [],
  tasks = [],
  activities = [],
  streaks = {},
  books = [],
  songPlays = [],
  gifted = [],
  practiceSessions = [],
  events = [],
  now = new Date(),
}) {
  const start = startOfWeekIso(now);
  const today = todayIso(now);

  const inWindow = (iso) => !!iso && iso >= start && iso <= today;
  const approvedThisWeek = (completions || []).filter((c) => c.status === "approved" && inWindow(c.completionDate));
  const starsEarned = approvedThisWeek.reduce((s, c) => s + (Number(c.awardedStars) || 0), 0);
  const giftedThisWeek = (gifted || []).filter((g) => inWindow(g.date) && !g.deletedAt);
  const giftedStars = giftedThisWeek.reduce((s, g) => s + (Number(g.stars) || 0), 0);

  // Per-activity day counts this week.
  const taskById = Object.fromEntries((tasks || []).map((t) => [t.id, t]));
  const activityById = Object.fromEntries((activities || []).map((a) => [a.id, a]));
  const byActivity = new Map(); // activityId → Set<date>
  for (const c of approvedThisWeek) {
    const t = taskById[c.taskId];
    if (!t) continue;
    const aid = t.activityId;
    if (!aid) continue;
    if (!byActivity.has(aid)) byActivity.set(aid, new Set());
    byActivity.get(aid).add(c.completionDate);
  }
  const activityRows = [...byActivity.entries()]
    .map(([aid, dates]) => {
      const a = activityById[aid];
      return { name: a?.short || a?.name || "Activity", color: a?.color || "#6366f1", days: dates.size };
    })
    .sort((a, b) => b.days - a.days);

  // Books finished this week.
  const booksFinished = (books || []).filter((b) => b.finished && inWindow(b.finished));

  // Songs played this week.
  const songPlaysThisWeek = (songPlays || []).filter((p) => inWindow(p.playedOn || p.played_on));

  // Practice sessions this week + minutes.
  const sessionsThisWeek = (practiceSessions || []).filter((s) => {
    const d = (s.startedAt || s.createdAt || "").slice(0, 10);
    return d && d >= start;
  });
  const practiceMinutes = Math.round(sessionsThisWeek.reduce((s, x) => s + (Number(x.durationSeconds) || 0), 0) / 60);

  // Longest streak among all activities.
  let longestStreakName = null;
  let longestStreakDays = 0;
  for (const [aid, st] of Object.entries(streaks || {})) {
    const cur = Number(st?.current) || 0;
    if (cur > longestStreakDays) {
      longestStreakDays = cur;
      longestStreakName = activityById[aid]?.name || aid;
    }
  }

  // Upcoming events in the next 7 days (one-off + recurring weekday hits)
  const upcoming = [];
  for (const ev of events || []) {
    if (Number.isInteger(ev.recurWeekday)) {
      upcoming.push(ev); // simplified — render as "every <weekday>"
    } else if (ev.date && ev.date > today && ev.date <= new Date(now.getTime() + 7 * DAY_MS).toISOString().slice(0, 10)) {
      upcoming.push(ev);
    }
  }
  const nextThree = upcoming.slice(0, 3);

  return {
    weekStart: start,
    today,
    kidName: kid?.name || "your kid",
    starsEarned,
    giftedStars,
    starsTotal: starsEarned + giftedStars,
    activityRows,
    booksFinished,
    songPlaysThisWeek,
    sessionsThisWeek,
    practiceMinutes,
    longestStreakName,
    longestStreakDays,
    upcoming: nextThree,
  };
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Inline-style HTML — mail clients ignore <style> tags reliably; only
// inline styles render. Tested mental-model: Gmail web, iOS Mail,
// Outlook desktop. Mono-color palette + system font for max compat.
export function renderDigestHtml(data, { appUrl = "" } = {}) {
  const {
    kidName, starsEarned, giftedStars, starsTotal, activityRows,
    booksFinished, songPlaysThisWeek, sessionsThisWeek, practiceMinutes,
    longestStreakName, longestStreakDays, upcoming, weekStart, today,
  } = data;

  const formatDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso + "T12:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const safeKid = escapeHtml(kidName);
  const safeUrl = escapeHtml(appUrl || "https://little-legend-treasures.netlify.app");

  const activityList = activityRows.length === 0
    ? `<p style="color:#94a3b8;font-size:13px;margin:8px 0;">No approved activities this week yet.</p>`
    : `<table role="presentation" style="width:100%;border-collapse:collapse;margin:8px 0;">
        ${activityRows.map((r) => `
          <tr>
            <td style="padding:6px 0;font-size:14px;color:#1e293b;">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${escapeHtml(r.color)};margin-right:8px;vertical-align:middle;"></span>
              ${escapeHtml(r.name)}
            </td>
            <td style="padding:6px 0;font-size:14px;color:#64748b;text-align:right;font-variant-numeric:tabular-nums;">
              ${r.days} day${r.days === 1 ? "" : "s"}
            </td>
          </tr>
        `).join("")}
      </table>`;

  const booksHtml = booksFinished.length === 0 ? "" : `
    <p style="font-size:13px;color:#475569;margin:8px 0 0;">
      📚 Finished ${booksFinished.length} book${booksFinished.length === 1 ? "" : "s"}:
      ${booksFinished.map((b) => `<em>${escapeHtml(b.canonicalTitle || b.title || "")}</em>`).join(", ")}
    </p>`;

  const upcomingHtml = upcoming.length === 0 ? "" : `
    <h3 style="font-size:13px;color:#334155;margin:24px 0 8px;text-transform:uppercase;letter-spacing:0.06em;">Coming up</h3>
    <ul style="margin:0;padding:0 0 0 18px;font-size:14px;color:#1e293b;line-height:1.6;">
      ${upcoming.map((e) => `<li>${escapeHtml(e.title)}${e.date ? ` <span style="color:#94a3b8;">· ${escapeHtml(formatDate(e.date))}</span>` : ""}${Number.isInteger(e.recurWeekday) ? ` <span style="color:#94a3b8;">· weekly</span>` : ""}</li>`).join("")}
    </ul>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Friday recap · ${safeKid}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#1e293b;">
  <table role="presentation" style="width:100%;background:#f1f5f9;padding:24px 12px;">
    <tr>
      <td>
        <table role="presentation" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
          <tr>
            <td style="padding:24px 24px 8px;">
              <div style="font-size:11px;color:#94a3b8;letter-spacing:0.08em;text-transform:uppercase;font-weight:700;">Family Command Center · Friday recap</div>
              <h1 style="margin:8px 0 0;font-size:22px;color:#0f172a;">${safeKid}'s week</h1>
              <p style="margin:4px 0 0;color:#64748b;font-size:13px;">${escapeHtml(formatDate(weekStart))} – ${escapeHtml(formatDate(today))}</p>
            </td>
          </tr>

          <tr>
            <td style="padding:16px 24px;">
              <table role="presentation" style="width:100%;border-collapse:collapse;">
                <tr>
                  <td style="background:#fef3c7;border-radius:12px;padding:14px;width:33%;vertical-align:top;">
                    <div style="font-size:11px;color:#92400e;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Stars earned</div>
                    <div style="font-size:28px;font-weight:800;color:#b45309;margin-top:4px;">${starsTotal}</div>
                    ${giftedStars > 0 ? `<div style="font-size:11px;color:#a16207;margin-top:2px;">incl. ${giftedStars}⭐ bonus</div>` : ""}
                  </td>
                  <td style="width:8px;"></td>
                  <td style="background:#d1fae5;border-radius:12px;padding:14px;width:33%;vertical-align:top;">
                    <div style="font-size:11px;color:#065f46;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Practice</div>
                    <div style="font-size:28px;font-weight:800;color:#047857;margin-top:4px;">${practiceMinutes}m</div>
                    <div style="font-size:11px;color:#059669;margin-top:2px;">${sessionsThisWeek.length} session${sessionsThisWeek.length === 1 ? "" : "s"}</div>
                  </td>
                  <td style="width:8px;"></td>
                  <td style="background:#ede9fe;border-radius:12px;padding:14px;width:33%;vertical-align:top;">
                    <div style="font-size:11px;color:#5b21b6;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Longest streak</div>
                    <div style="font-size:28px;font-weight:800;color:#6d28d9;margin-top:4px;">${longestStreakDays}</div>
                    <div style="font-size:11px;color:#7c3aed;margin-top:2px;">${escapeHtml(longestStreakName || "—")}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:8px 24px 16px;">
              <h3 style="font-size:13px;color:#334155;margin:8px 0;text-transform:uppercase;letter-spacing:0.06em;">Activity days</h3>
              ${activityList}
              ${booksHtml}
              ${songPlaysThisWeek.length > 0 ? `<p style="font-size:13px;color:#475569;margin:8px 0 0;">🥁 ${songPlaysThisWeek.length} song play${songPlaysThisWeek.length === 1 ? "" : "s"} logged.</p>` : ""}
              ${upcomingHtml}
            </td>
          </tr>

          <tr>
            <td style="padding:16px 24px 24px;border-top:1px solid #e2e8f0;">
              <a href="${safeUrl}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:10px;font-size:14px;font-weight:700;">
                Open the app →
              </a>
              <p style="margin:14px 0 0;font-size:11px;color:#94a3b8;">
                Family Command Center sent this digest because someone opted you in under More → Email Setup. Reply STOP to be removed.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Plain-text fallback for mail clients that block HTML or for the
// preview line every inbox shows.
export function renderDigestText(data) {
  const {
    kidName, starsTotal, activityRows, practiceMinutes, sessionsThisWeek,
    longestStreakName, longestStreakDays, booksFinished, upcoming, weekStart, today,
  } = data;
  const lines = [];
  lines.push(`Family Command Center — Friday recap`);
  lines.push(`${kidName}'s week (${weekStart} → ${today})`);
  lines.push("");
  lines.push(`Stars earned this week: ${starsTotal}`);
  lines.push(`Practice: ${practiceMinutes} min across ${sessionsThisWeek.length} session${sessionsThisWeek.length === 1 ? "" : "s"}`);
  if (longestStreakDays > 0) lines.push(`Longest streak: ${longestStreakDays} days · ${longestStreakName}`);
  lines.push("");
  if (activityRows.length > 0) {
    lines.push("Activity days:");
    for (const r of activityRows) lines.push(`  • ${r.name}: ${r.days} day${r.days === 1 ? "" : "s"}`);
    lines.push("");
  }
  if (booksFinished.length > 0) {
    lines.push(`Books finished: ${booksFinished.map((b) => b.canonicalTitle || b.title).join(", ")}`);
    lines.push("");
  }
  if (upcoming.length > 0) {
    lines.push("Coming up:");
    for (const e of upcoming) lines.push(`  • ${e.title}${e.date ? ` (${e.date})` : ""}`);
  }
  return lines.join("\n");
}
