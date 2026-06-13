-- tasks.stat_schema — per-task generic stat field definitions.
--
-- Phase 1 of the generic activity-stats system (was hard-coded:
-- drums [drumeo, melodics, songList], reading [bookTitle, lang,
-- minutes], photo [title]).  This column lets a family pick a
-- template for any task — piano, guitar, basketball, soccer,
-- hockey, custom — and the submit sheet + Stats hero render the
-- right fields from that schema instead of branching on hard-coded
-- proofType strings.
--
-- Shape (loose jsonb; no enforcement, mirrors the pattern used by
-- name_i18n / extra):
--   {
--     "templateId": "music_drums",            // optional: id of the template the parent picked
--     "practice": [                           // fields shown when NOT in game mode
--       { "key": "drumeo",   "label": "Drumeo min",   "type": "minutes" },
--       { "key": "melodics", "label": "Melodics min", "type": "minutes" },
--       { "key": "songList", "label": "Songs",        "type": "text"    }
--     ],
--     "game": [                               // optional: appears when "Game day?" toggle is on
--       { "key": "minutes", "label": "Game time", "type": "minutes" },
--       { "key": "points",  "label": "Points",    "type": "count"   }
--     ]
--   }
--
-- field types (v1):
--   "minutes" — non-negative integer; renders as min input
--   "count"   — non-negative integer; renders as small number input
--   "text"    — free text; renders as input
--   "select"  — pick one of options[]; renders as pill row
--
-- Empty {} (default) means no schema — TaskSheet falls back to the
-- existing proofType branches.  Once iteration 2 ships, a task with
-- a populated stat_schema overrides the proofType-based inputs.

alter table public.tasks
  add column if not exists stat_schema jsonb not null default '{}'::jsonb;

comment on column public.tasks.stat_schema is
  'Per-task stat field schema (Phase 1 of generic activity-stats). Keys: templateId (optional), practice (array of {key,label,type[,options]}), game (optional array). Empty {} = no schema; TaskSheet falls back to proofType branches.';
