-- Summer Quest v1 — per-profile progress for the 7-week summer arm
-- ----------------------------------------------------------------
-- Matches the docs/School-plans/summer-quest-integration-brief.md
-- contract. One row per profile.
--
-- Shape mirrors board_state (same composite-key + RLS pattern):
--   - family_id + profile_id PK so a single upsert per (family, profile)
--     replaces the row, never accumulates duplicates
--   - mode text ("home" | "car") — global toggle, swaps every quest
--     text without touching the curriculum
--   - done jsonb — { "1": {build,math,code,read}, ..., "7": {...} }
--     booleans only. Treasure / week-conquered / Legend status all
--     derive from this (no separate columns to keep in sync)
--
-- ARCHITECTURE §1 (one source of truth): summer quest progress lives
-- HERE. The starBank does NOT read from this in v1 (stars crossover
-- is a v2 scope item per the integration brief §4.5).
-- ARCHITECTURE §4 (new system, own table): does not store or duplicate
-- task / completion / streak truth. DELETE FROM summer_quest_progress
-- and the rest of the app keeps working — Reznor's missions, board,
-- streaks, song plays untouched. Summer Quest just resets to empty.
--
-- RLS: family scope only (family_id = public.my_family_id()), exactly
-- like board_state and user_prefs. Parents + the kid in the same
-- family share read/write through this single rule. is_parent() is
-- intentionally NOT used here — parents acting on Reznor's behalf
-- need the same row access Reznor has.

create table if not exists public.summer_quest_progress (
  family_id  uuid        not null references public.families(id) on delete cascade,
  profile_id text        not null references public.profiles(id) on delete cascade,
  mode       text        not null default 'home',
  done       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (family_id, profile_id)
);

create index if not exists summer_quest_progress_family_idx
  on public.summer_quest_progress(family_id);

alter table public.summer_quest_progress enable row level security;
alter table public.summer_quest_progress force  row level security;

drop policy if exists "summer_quest_progress_rw_my_family" on public.summer_quest_progress;
create policy "summer_quest_progress_rw_my_family"
  on public.summer_quest_progress for all
  to authenticated
  using      (family_id = public.my_family_id())
  with check (family_id = public.my_family_id());
