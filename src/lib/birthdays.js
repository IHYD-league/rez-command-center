// Birthday helpers. Year-agnostic: when a profile.birthday is set, we
// project the next anniversary from today and compute days-until +
// the age they'll turn (when the original birthday includes the
// birth year). Returns null when the birthday is missing or invalid.

export function nextBirthdayInfo(birthdayIso, now = new Date()) {
  if (!birthdayIso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthdayIso);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  const day = Number(m[3]);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = new Date(today.getFullYear(), month, day);
  if (next < today) next = new Date(today.getFullYear() + 1, month, day);
  const daysUntil = Math.round((next - today) / 86400000);
  const turning = next.getFullYear() - year; // ignore if you don't care
  return {
    next,                          // Date
    daysUntil,                     // int (0 = today)
    turning,                       // int (full years; may be negative or 0 if no year)
    isToday: daysUntil === 0,
    isWithin: (n) => daysUntil <= n,
  };
}

export function upcomingBirthdays(profiles = [], windowDays = 30, now = new Date()) {
  const out = [];
  for (const p of profiles) {
    if (!p?.birthday) continue;
    const info = nextBirthdayInfo(p.birthday, now);
    if (!info) continue;
    if (info.daysUntil <= windowDays) out.push({ profile: p, info });
  }
  out.sort((a, b) => a.info.daysUntil - b.info.daysUntil);
  return out;
}
