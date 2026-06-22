// Single source of truth for drum-session minute math.
//
// Practice time has three contributors on the drums surface:
//   • typed Drumeo minutes  (extra.drumeo)
//   • typed Melodics minutes (extra.melodics)
//   • sum of canonical iTunes durations from song_plays on the
//     session's date
//
// Every drums surface — TaskSheet draft form, DetailSheet "Today's
// drum session" card, CompletionDetailSheet "What he played", the
// Insights practice-time hero, the milestone slideshow — calls this
// helper. The headline number can never disagree with the contributor
// tiles, and a draft and its finished completion will read the same
// total because the math lives in one place.
//
// The persisted extra.totalMin is recomputed via this helper at write
// time so historical draft sessions saved before today carry the honest
// number forward.

export function computeDrumSessionMinutes(comp, songPlays = [], songs = []) {
  const drumeo = Number(comp?.extra?.drumeo) || 0;
  const melodics = Number(comp?.extra?.melodics) || 0;
  const date = comp?.completionDate || comp?.completion_date || null;

  let songMs = 0;
  const titles = [];
  if (date) {
    const byId = new Map((songs || []).map((s) => [s.id, s]));
    for (const sp of songPlays || []) {
      const playedOn = sp.playedOn || sp.played_on;
      if (playedOn !== date) continue;
      const song = byId.get(sp.songId || sp.song_id);
      const ms = Number(song?.durationMs) || 0;
      songMs += ms;
      titles.push(song?.canonicalTitle || song?.title || "(unknown)");
    }
  }
  const songMin = Math.round(songMs / 60000);

  return {
    drumeo,
    melodics,
    songMin,
    total: drumeo + melodics + songMin,
    songCount: titles.length,
    songTitles: titles,
  };
}
