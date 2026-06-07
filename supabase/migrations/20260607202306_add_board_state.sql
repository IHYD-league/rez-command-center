-- BOARD-GAME.md Phase 2: board_state
-- ---------------------------------------------------------------
-- Records per-profile last-viewed token position so we know which
-- newly-completed spaces to animate the token through on render.
-- ARCHITECTURE §4: new system, own table, never re-stores task /
-- star / streak truth. If you DELETE FROM board_state the rest of
-- the app keeps working — Reznor's missions, completions, stars,
-- streaks, songs are all untouched. The board just loses where it
-- last animated to, and snaps to "current" on next render.
--
-- last_position    — index into the spaces array (0 = START marker,
--                    spaces.length - 1 = TREASURE). The board
--                    computes "where the token SHOULD be" from
--                    canonical compByTask; this column remembers
--                    where it WAS so we can animate the diff.
-- treasure_claimed_on — set to TODAY_ISO when the treasure
--                    celebration fires, so a hard-reload after
--                    the celebration doesn't re-play it.
-- ---------------------------------------------------------------

create table if not exists public.board_state (
  family_id uuid not null references public.families(id) on delete cascade,
  profile_id text not null references public.profiles(id) on delete cascade,
  last_position int not null default 0,
  treasure_claimed_on date,
  updated_at timestamptz not null default now(),
  primary key (family_id, profile_id)
);

create index if not exists board_state_family_idx on public.board_state(family_id);

alter table public.board_state enable row level security;
alter table public.board_state force  row level security;

drop policy if exists "board_state_rw_my_family" on public.board_state;
create policy "board_state_rw_my_family"
  on public.board_state for all
  to authenticated
  using      (family_id = public.my_family_id())
  with check (family_id = public.my_family_id());
