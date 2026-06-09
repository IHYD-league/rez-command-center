import React, { useMemo } from "react";
import { Drum, Music, BookOpen, Image as ImageIcon, Heart, TrendingUp, Sparkles } from "lucide-react";

/* =====================================================================
   Insights — Phase 3.

   Pure read-only display layer. Every number is a useMemo over already-
   loaded shared props (completions, tasks, activities, books, songs,
   songPlays, albumPhotos). No queries, no writes, no schema.

   Honest framing: granular logging started ~June 2026. Every time-based
   card surfaces "Tracking since {date}" so charts can't imply data we
   don't have. Per-card date is the minimum of the underlying source so
   each section is honest on its own terms.

   Out of scope per the v3 brief: data export, slideshows, album-art
   enrichment, fancier chart libraries. Inline SVG for the only chart.
   ===================================================================== */

const TYPE_TO_ACT = {
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

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T12:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtShort(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T12:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function todayIso() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}
function daysBack(n) {
  // Returns array of YYYY-MM-DD strings, oldest → newest, of the last n days.
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    out.push([d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-"));
  }
  return out;
}

// Small section heading with optional "tracking since" note.
function SectionHead({ icon: Icon, title, since, color = "#6366f1" }) {
  return (
    <div className="flex items-baseline justify-between gap-2 mb-2 mt-5 px-1 first:mt-0">
      <div className="flex items-center gap-2 font-extrabold text-slate-800 text-base">
        {Icon && (
          <span
            className="inline-flex w-6 h-6 rounded-lg items-center justify-center"
            style={{ background: color + "22", color }}
          >
            <Icon size={14} />
          </span>
        )}
        {title}
      </div>
      {since && (
        <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
          since {fmtShort(since)}
        </div>
      )}
    </div>
  );
}

function Card({ children, className = "" }) {
  return (
    <div className={`rounded-2xl bg-white border border-slate-100 shadow-sm p-4 ${className}`}>
      {children}
    </div>
  );
}

// Inline 14-day mini bar graph. height in px; values: array of {date, value}.
function DayBars({ data, color = "#7c3aed", suffix = "" }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const H = 56;
  return (
    <div className="mt-3">
      <div className="flex items-end gap-1 h-14">
        {data.map((d) => {
          const h = (d.value / max) * H;
          const today = d.date === todayIso();
          return (
            <div key={d.date} className="flex-1 flex flex-col items-center justify-end" title={`${fmtShort(d.date)} · ${d.value}${suffix}`}>
              <div
                className="w-full rounded-t"
                style={{
                  height: Math.max(d.value > 0 ? 4 : 0, h),
                  background: d.value > 0 ? color : "#f1f5f9",
                  border: today ? `1px solid ${color}` : "none",
                  borderBottom: "none",
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1 mt-1">
        {data.map((d, i) => (
          <div key={d.date} className="flex-1 text-center text-[9px] text-slate-400 font-bold">
            {i === 0 || i === data.length - 1 || i === Math.floor(data.length / 2) ? fmtShort(d.date) : ""}
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyLine({ children }) {
  return <div className="text-[12px] text-slate-400 italic">{children}</div>;
}

export default function Insights({
  completions = [],
  tasks = [],
  activities = [],
  songs = [],
  songPlays = [],
  books = [],
  albumPhotos = [],
}) {
  /* ----- PRACTICE TIME ---------------------------------------------- */
  const practiceStats = useMemo(() => {
    let totalMin = 0;
    let drumeoMin = 0;
    let melodicsMin = 0;
    let earliest = null;
    const byDate = new Map(); // YYYY-MM-DD → minutes
    for (const c of completions || []) {
      const drumeo = Number(c?.extra?.drumeo || 0);
      const mel = Number(c?.extra?.melodics || 0);
      const sum = drumeo + mel;
      if (sum > 0) {
        totalMin += sum;
        drumeoMin += drumeo;
        melodicsMin += mel;
        const d = c.completionDate || c.completion_date;
        if (d) {
          byDate.set(d, (byDate.get(d) || 0) + sum);
          if (!earliest || d < earliest) earliest = d;
        }
      }
    }
    const last14 = daysBack(14).map((d) => ({ date: d, value: byDate.get(d) || 0 }));
    const last14Sum = last14.reduce((s, r) => s + r.value, 0);
    return { totalMin, drumeoMin, melodicsMin, earliest, last14, last14Sum };
  }, [completions]);

  /* ----- MOST-PLAYED SONGS ------------------------------------------ */
  const topSongs = useMemo(() => {
    const counts = new Map(); // songId → { count, lastPlayedOn }
    let earliest = null;
    for (const sp of songPlays || []) {
      const sid = sp.songId || sp.song_id;
      if (!sid) continue;
      const date = sp.playedOn || sp.played_on || sp.date;
      const c = counts.get(sid) || { count: 0, last: null };
      c.count += 1;
      if (date && (!c.last || date > c.last)) c.last = date;
      counts.set(sid, c);
      if (date && (!earliest || date < earliest)) earliest = date;
    }
    const out = [...counts.entries()]
      .map(([sid, v]) => {
        const song = (songs || []).find((s) => s.id === sid);
        return {
          id: sid,
          title: song?.title || "(unknown)",
          artist: song?.artist || "",
          count: v.count,
          last: v.last,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    return { earliest, list: out, total: songPlays?.length || 0, songsTouched: counts.size };
  }, [songPlays, songs]);

  /* ----- BOOKS ------------------------------------------------------ */
  const booksStats = useMemo(() => {
    // Count-based stats INCLUDE pre-tracking backlog (those are real books).
    // Date-based fields (earliest, recent-by-date) EXCLUDE backlog because
    // backlog has no real date — we don't fake one.
    const buckets = { reading: 0, finished: 0, wishlist: 0, dropped: 0 };
    let earliest = null;
    const byLang = new Map();
    const byLevel = new Map();
    const eraCounts = new Map();
    let backlogCount = 0;
    for (const b of books || []) {
      const status = b.status || "reading";
      buckets[status] = (buckets[status] || 0) + 1;
      if (b.lang) byLang.set(b.lang, (byLang.get(b.lang) || 0) + 1);
      if (b.level) byLevel.set(b.level, (byLevel.get(b.level) || 0) + 1);
      if (b.preTracking) {
        backlogCount += 1;
        const era = b.eraLabel || "Era unset";
        eraCounts.set(era, (eraCounts.get(era) || 0) + 1);
        continue; // skip date logic
      }
      if (b.started && (!earliest || b.started < earliest)) earliest = b.started;
    }
    // Recent list: only tracked books (real dates).
    const tracked = (books || []).filter((b) => !b.preTracking);
    return {
      total: books?.length || 0,
      buckets,
      earliest,
      byLang: [...byLang.entries()].sort((a, b) => b[1] - a[1]),
      byLevel: [...byLevel.entries()].sort((a, b) => b[1] - a[1]),
      recent: [...tracked].sort((a, b) =>
        (b.started || b.created_at || "").localeCompare(a.started || a.created_at || "")
      ).slice(0, 6),
      backlogCount,
      eras: [...eraCounts.entries()].sort((a, b) => b[1] - a[1]),
    };
  }, [books]);

  /* ----- COMPLETIONS BY CATEGORY ------------------------------------ */
  const completionsByCat = useMemo(() => {
    const approved = (completions || []).filter((c) => c.status === "approved");
    let earliest = null;
    const catCounts = new Map(); // task.category → count
    const pillarCounts = new Map(); // activity.pillar → count
    for (const c of approved) {
      const d = c.completionDate || c.completion_date;
      if (d && (!earliest || d < earliest)) earliest = d;
      const t = (tasks || []).find((x) => x.id === c.taskId);
      if (t?.category) catCounts.set(t.category, (catCounts.get(t.category) || 0) + 1);
      const aid = t?.activityId || TYPE_TO_ACT[t?.activityType];
      const act = (activities || []).find((a) => a.id === aid);
      if (act?.pillar) pillarCounts.set(act.pillar, (pillarCounts.get(act.pillar) || 0) + 1);
    }
    return {
      total: approved.length,
      earliest,
      categories: [...catCounts.entries()].sort((a, b) => b[1] - a[1]),
      pillars: [...pillarCounts.entries()].sort((a, b) => b[1] - a[1]),
    };
  }, [completions, tasks, activities]);

  /* ----- PHOTOS COUNTS ---------------------------------------------- */
  const photoStats = useMemo(() => {
    let proofCount = 0;
    const byActivity = new Map();
    for (const c of completions || []) {
      const proof = Array.isArray(c.proof) ? c.proof : [];
      for (const p of proof) {
        if (!p || p.type !== "photo" || !p.path) continue;
        proofCount += 1;
        const t = (tasks || []).find((x) => x.id === c.taskId);
        const aid = t?.activityId || TYPE_TO_ACT[t?.activityType];
        const act = (activities || []).find((a) => a.id === aid);
        const name = act?.name || "Other";
        byActivity.set(name, (byActivity.get(name) || 0) + 1);
      }
    }
    const memCount = (albumPhotos || []).length;
    for (const a of albumPhotos || []) {
      if (a.activityId) {
        const act = (activities || []).find((x) => x.id === a.activityId);
        if (act?.name) byActivity.set(act.name, (byActivity.get(act.name) || 0) + 1);
      }
    }
    return {
      proofCount,
      memCount,
      total: proofCount + memCount,
      byActivity: [...byActivity.entries()].sort((a, b) => b[1] - a[1]),
    };
  }, [completions, tasks, activities, albumPhotos]);

  // Maximum counts for the bar widths in the category list.
  const maxCatCount = Math.max(1, ...completionsByCat.categories.map(([, n]) => n));
  const maxPhotoActCount = Math.max(1, ...photoStats.byActivity.map(([, n]) => n));
  const maxSongPlays = topSongs.list[0]?.count || 1;

  return (
    <div className="px-4 pt-4 pb-12">
      {/* Honest "tracking since" banner (the earliest of any source). */}
      <div className="rounded-2xl p-4 text-white mb-4 relative overflow-hidden"
           style={{ background: "linear-gradient(135deg, #4338ca 0%, #7c3aed 55%, #ec4899 100%)" }}>
        <Sparkles size={64} className="absolute -right-4 -top-4 text-white/15" />
        <div className="text-xs uppercase tracking-wider font-bold opacity-85">Family Insights</div>
        <div className="text-xl font-extrabold mt-0.5">Numbers behind the work</div>
        <div className="text-[11px] opacity-85 mt-2 leading-snug">
          Tracking granular logs since {fmtDate("2026-06-06")}. The streaks
          go further back than the minutes do — that's honest, not a bug.
        </div>
      </div>

      {/* -------- PRACTICE TIME -------- */}
      <SectionHead icon={Drum} title="Practice time" since={practiceStats.earliest} color="#7c3aed" />
      <Card>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-extrabold text-slate-800 leading-none">{practiceStats.totalMin}</span>
          <span className="text-sm font-bold text-slate-400 leading-none">minutes total</span>
        </div>
        <div className="text-[11px] text-slate-500 mt-1">
          Drumeo {practiceStats.drumeoMin}m · Melodics {practiceStats.melodicsMin}m
        </div>
        <DayBars data={practiceStats.last14} color="#7c3aed" suffix=" min" />
        <div className="text-[11px] text-slate-400 mt-1.5 flex items-center justify-between">
          <span>Last 14 days · {practiceStats.last14Sum} min</span>
          {practiceStats.totalMin === 0 && <EmptyLine>No minutes logged yet.</EmptyLine>}
        </div>
      </Card>

      {/* -------- MOST-PLAYED SONGS -------- */}
      <SectionHead icon={Music} title="Most-played songs" since={topSongs.earliest} color="#0891b2" />
      <Card>
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-3xl font-extrabold text-slate-800 leading-none">{topSongs.total}</span>
          <span className="text-sm font-bold text-slate-400 leading-none">plays · {topSongs.songsTouched} songs</span>
        </div>
        {topSongs.list.length === 0 ? (
          <EmptyLine>No song plays logged yet.</EmptyLine>
        ) : (
          <ol className="space-y-1.5">
            {topSongs.list.map((s, i) => (
              <li key={s.id} className="flex items-center gap-2 text-sm">
                <span className="w-5 text-right text-[11px] font-bold text-slate-400">#{i + 1}</span>
                <span className="flex-1 min-w-0">
                  <span className="font-bold text-slate-800 truncate">{s.title}</span>
                  {s.artist && <span className="text-[11px] text-slate-500"> · {s.artist}</span>}
                  {s.last && <span className="text-[10px] text-slate-400"> · last {fmtShort(s.last)}</span>}
                </span>
                {/* mini count bar */}
                <span className="relative w-16 h-2 bg-slate-100 rounded-full overflow-hidden shrink-0">
                  <span
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{ width: `${(s.count / maxSongPlays) * 100}%`, background: "#0891b2" }}
                  />
                </span>
                <span className="text-sm font-bold text-cyan-700 w-6 text-right tabular-nums">{s.count}</span>
              </li>
            ))}
          </ol>
        )}
      </Card>

      {/* -------- BOOKS -------- */}
      <SectionHead icon={BookOpen} title="Books" since={booksStats.earliest} color="#b45309" />
      <Card>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            ["Reading", booksStats.buckets.reading || 0, "#b45309"],
            ["Finished", booksStats.buckets.finished || 0, "#15803d"],
            ["Wishlist", booksStats.buckets.wishlist || 0, "#7c3aed"],
          ].map(([label, n, color]) => (
            <div key={label} className="rounded-xl bg-slate-50 p-3 text-center">
              <div className="text-2xl font-extrabold leading-none" style={{ color }}>{n}</div>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">{label}</div>
            </div>
          ))}
        </div>
        {booksStats.total === 0 ? (
          <EmptyLine>No books on the shelf yet.</EmptyLine>
        ) : (
          <>
            {(booksStats.byLang.length > 0 || booksStats.byLevel.length > 0) && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {booksStats.byLang.map(([lang, n]) => (
                  <span key={"l-" + lang} className="text-[11px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                    {lang} · {n}
                  </span>
                ))}
                {booksStats.byLevel.map(([level, n]) => (
                  <span key={"lv-" + level} className="text-[11px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                    {level} · {n}
                  </span>
                ))}
              </div>
            )}
            {booksStats.recent.length > 0 && (
              <>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Recent (tracked)</div>
                <ul className="space-y-1 mb-3">
                  {booksStats.recent.map((b) => (
                    <li key={b.id} className="flex items-center gap-2 text-sm">
                      <span className="flex-1 truncate">
                        <span className="font-bold text-slate-800">{b.title || "(untitled)"}</span>
                        {b.lang && <span className="text-[11px] text-slate-500"> · {b.lang}</span>}
                        {b.level && <span className="text-[11px] text-slate-500"> · {b.level}</span>}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        b.status === "finished" ? "bg-emerald-100 text-emerald-700"
                          : b.status === "wishlist" ? "bg-violet-100 text-violet-700"
                          : b.status === "dropped" ? "bg-slate-200 text-slate-500"
                          : "bg-amber-100 text-amber-700"
                      }`}>
                        {b.status || "reading"}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {/* Pre-tracking archive — grouped by era, no dates. Counts toward
                totals but kept visually distinct so the "tracked" view stays honest. */}
            {booksStats.backlogCount > 0 && (
              <>
                <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700 mb-1.5">
                  Archive · pre-tracking ({booksStats.backlogCount})
                </div>
                <div className="flex flex-wrap gap-1.5 mb-1">
                  {booksStats.eras.map(([era, n]) => (
                    <span key={era} className="text-[11px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                      {era} · {n}
                    </span>
                  ))}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  No real dates — counted in totals + per-author stats, excluded from date-based views.
                </div>
              </>
            )}
          </>
        )}
      </Card>

      {/* -------- COUNTS BY CATEGORY -------- */}
      <SectionHead icon={TrendingUp} title="Approved by category" since={completionsByCat.earliest} color="#15803d" />
      <Card>
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-3xl font-extrabold text-slate-800 leading-none">{completionsByCat.total}</span>
          <span className="text-sm font-bold text-slate-400 leading-none">approved completions</span>
        </div>
        {completionsByCat.categories.length === 0 ? (
          <EmptyLine>Nothing approved yet.</EmptyLine>
        ) : (
          <ul className="space-y-1.5">
            {completionsByCat.categories.map(([cat, n]) => (
              <li key={cat} className="flex items-center gap-2 text-sm">
                <span className="flex-1 font-bold text-slate-700">{cat}</span>
                <span className="relative w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <span
                    className="absolute inset-y-0 left-0 rounded-full bg-emerald-500"
                    style={{ width: `${(n / maxCatCount) * 100}%` }}
                  />
                </span>
                <span className="w-6 text-right text-sm font-bold text-emerald-700 tabular-nums">{n}</span>
              </li>
            ))}
          </ul>
        )}
        {completionsByCat.pillars.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {completionsByCat.pillars.map(([pillar, n]) => (
              <span key={pillar} className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                pillar === "brain" ? "bg-indigo-100 text-indigo-700"
                  : pillar === "body" ? "bg-rose-100 text-rose-700"
                  : pillar === "soul" ? "bg-violet-100 text-violet-700"
                  : "bg-slate-100 text-slate-600"
              }`}>
                {pillar} · {n}
              </span>
            ))}
          </div>
        )}
      </Card>

      {/* -------- PHOTOS -------- */}
      <SectionHead icon={ImageIcon} title="Photos in the gallery" color="#0ea5e9" />
      <Card>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="rounded-xl bg-sky-50 p-3 text-center">
            <div className="text-2xl font-extrabold text-sky-700 leading-none">{photoStats.proofCount}</div>
            <div className="text-[10px] text-sky-700/80 font-bold uppercase tracking-wider mt-1">Schoolwork</div>
          </div>
          <div className="rounded-xl bg-pink-50 p-3 text-center">
            <div className="text-2xl font-extrabold text-pink-700 leading-none flex items-center justify-center gap-1">
              <Heart size={16} fill="currentColor" /> {photoStats.memCount}
            </div>
            <div className="text-[10px] text-pink-700/80 font-bold uppercase tracking-wider mt-1">Memories</div>
          </div>
        </div>
        {photoStats.byActivity.length === 0 ? (
          <EmptyLine>No photos in the gallery yet.</EmptyLine>
        ) : (
          <ul className="space-y-1.5">
            {photoStats.byActivity.map(([name, n]) => (
              <li key={name} className="flex items-center gap-2 text-sm">
                <span className="flex-1 font-bold text-slate-700">{name}</span>
                <span className="relative w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <span
                    className="absolute inset-y-0 left-0 rounded-full bg-sky-500"
                    style={{ width: `${(n / maxPhotoActCount) * 100}%` }}
                  />
                </span>
                <span className="w-6 text-right text-sm font-bold text-sky-700 tabular-nums">{n}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="text-[11px] text-slate-400 mt-6 text-center px-2 leading-snug">
        Every number above comes from the data the family is already logging — nothing new is stored to draw these views.
      </div>
    </div>
  );
}
