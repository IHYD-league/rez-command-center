-- Practice sessions: a Modacity-style "I sat down and practiced for
-- 27 minutes, here's a 30s clip" record. Independent from completions
-- and song_plays — it's about elapsed time at the instrument, not
-- whether today's task is done.
--
-- Why a new table: completions are task-scoped (one per task per day).
-- song_plays are per-song. Neither fits a free-form session with a
-- start, stop, and an optional audio clip. Parents will want to scrub
-- through old sessions to literally hear progress over months.
--
-- audio_path is nullable — a kid can practice without recording, or
-- the browser may not support MediaRecorder (older iOS Safari). The
-- session row stands on its own with duration_seconds.

create table if not exists public.practice_sessions (
  id text primary key,
  family_id uuid not null references public.families(id) on delete cascade,
  activity_id text,
  profile_id text references public.profiles(id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer not null default 0,
  audio_path text,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists practice_sessions_family_idx on public.practice_sessions(family_id);
create index if not exists practice_sessions_activity_idx on public.practice_sessions(family_id, activity_id);
create index if not exists practice_sessions_profile_idx on public.practice_sessions(family_id, profile_id);

alter table public.practice_sessions enable row level security;
alter table public.practice_sessions force row level security;

drop policy if exists practice_sessions_read on public.practice_sessions;
create policy practice_sessions_read on public.practice_sessions
  for select using (family_id = public.my_family_id());

drop policy if exists practice_sessions_write on public.practice_sessions;
create policy practice_sessions_write on public.practice_sessions
  for all using (family_id = public.my_family_id())
        with check (family_id = public.my_family_id());

comment on table public.practice_sessions is
  'Free-form practice sessions with optional 30s audio clip. Independent of task completions.';
