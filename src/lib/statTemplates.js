// Stat schema templates for the generic activity-stats system.
//
// Each template has a `practice` array (always rendered) and an
// optional `game` array (rendered when the parent flips "Game day?"
// — surfaced only when game[] is present).
//
// Field types (v1):
//   minutes  → non-negative integer; min input
//   count    → non-negative integer; small number input
//   text     → free text input
//   select   → one of options[] pills (future v2)
//
// Keys MUST be JS-identifier-safe (lowercase, no spaces) — they
// become keys in completion.extra. Renaming a key later would
// orphan historical data, so pick wisely.
//
// To add a new template: pick an id (snake_case), give it a label,
// fill in practice[] and optionally game[]. The picker in
// ManageTasks reads from the exported registry below.

export const STAT_TEMPLATES = {
  music_drums: {
    id: "music_drums",
    label: "Music — Drums",
    icon: "🥁",
    practice: [
      { key: "drumeo",   label: "Drumeo min",   type: "minutes" },
      { key: "melodics", label: "Melodics min", type: "minutes" },
      { key: "songList", label: "Songs played", type: "text"    },
    ],
  },
  music_piano: {
    id: "music_piano",
    label: "Music — Piano",
    icon: "🎹",
    practice: [
      { key: "minutes", label: "Practice time", type: "minutes" },
      { key: "pieces",  label: "Pieces worked on", type: "text" },
    ],
  },
  music_guitar: {
    id: "music_guitar",
    label: "Music — Guitar",
    icon: "🎸",
    practice: [
      { key: "minutes", label: "Practice time", type: "minutes" },
      { key: "songs",   label: "Songs / riffs", type: "text"    },
    ],
  },
  music_singing: {
    id: "music_singing",
    label: "Music — Singing",
    icon: "🎤",
    practice: [
      { key: "minutes", label: "Practice time", type: "minutes" },
      { key: "songs",   label: "Songs",         type: "text"    },
    ],
  },
  sport_basketball: {
    id: "sport_basketball",
    label: "Sport — Basketball",
    icon: "🏀",
    practice: [
      { key: "minutes",   label: "Practice time", type: "minutes" },
      { key: "shotsMade", label: "Shots made",    type: "count"   },
      { key: "shotsTaken",label: "Shots taken",   type: "count"   },
      { key: "drills",    label: "Drills",        type: "text"    },
    ],
    game: [
      { key: "minutes",  label: "Minutes played", type: "minutes" },
      { key: "points",   label: "Points",         type: "count"   },
      { key: "rebounds", label: "Rebounds",       type: "count"   },
      { key: "assists",  label: "Assists",        type: "count"   },
      { key: "steals",   label: "Steals",         type: "count"   },
      { key: "notes",    label: "Notes",          type: "text"    },
    ],
  },
  sport_soccer: {
    id: "sport_soccer",
    label: "Sport — Soccer",
    icon: "⚽",
    practice: [
      { key: "minutes", label: "Practice time", type: "minutes" },
      { key: "drills",  label: "Drills",        type: "text"    },
    ],
    game: [
      { key: "minutes", label: "Minutes played", type: "minutes" },
      { key: "goals",   label: "Goals",          type: "count"   },
      { key: "assists", label: "Assists",        type: "count"   },
      { key: "saves",   label: "Saves (keeper)", type: "count"   },
      { key: "notes",   label: "Notes",          type: "text"    },
    ],
  },
  sport_hockey: {
    id: "sport_hockey",
    label: "Sport — Hockey",
    icon: "🏒",
    practice: [
      { key: "minutes", label: "Practice time", type: "minutes" },
      { key: "drills",  label: "Drills",        type: "text"    },
    ],
    game: [
      { key: "minutes",   label: "Minutes played", type: "minutes" },
      { key: "goals",     label: "Goals",          type: "count"   },
      { key: "assists",   label: "Assists",        type: "count"   },
      { key: "plusMinus", label: "+/−",            type: "count"   },
      { key: "saves",     label: "Saves (goalie)", type: "count"   },
      { key: "notes",     label: "Notes",          type: "text"    },
    ],
  },
};

// Stable, display-ordered list for the picker UI.
export const STAT_TEMPLATE_LIST = [
  STAT_TEMPLATES.music_drums,
  STAT_TEMPLATES.music_piano,
  STAT_TEMPLATES.music_guitar,
  STAT_TEMPLATES.music_singing,
  STAT_TEMPLATES.sport_basketball,
  STAT_TEMPLATES.sport_soccer,
  STAT_TEMPLATES.sport_hockey,
];

// Build a fresh stat_schema object from a template id. Returns null
// when the id is unknown so callers can branch on it.
export function schemaFromTemplate(templateId) {
  const t = STAT_TEMPLATES[templateId];
  if (!t) return null;
  return {
    templateId: t.id,
    practice: t.practice.map((f) => ({ ...f })),
    ...(t.game ? { game: t.game.map((f) => ({ ...f })) } : {}),
  };
}

// True when the task carries a usable schema. Empty objects, missing
// practice[], and zero-length practice[] all read as "no schema".
export function hasStatSchema(task) {
  const s = task?.statSchema;
  return !!(s && Array.isArray(s.practice) && s.practice.length > 0);
}

// Look up the human label for a templateId — used by the picker
// summary line ("Stats: Sport — Basketball") so a parent can see at
// a glance what template a task is using.
export function templateLabel(templateId) {
  return STAT_TEMPLATES[templateId]?.label || null;
}
