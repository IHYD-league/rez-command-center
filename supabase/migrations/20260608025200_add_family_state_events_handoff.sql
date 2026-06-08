-- Persist remaining Phase-1 in-memory state.
--
-- family_settings: one row per family. jsonb holds simple key-value
-- prefs that don't deserve their own table:
--   - settings.mode         → "summer" | "school" (was resetting on
--                              every reload)
--   - settings.priorities   → { [taskId]: { level, scope, by } }
--                              (parent must-do/today/extra overrides
--                              were vanishing on reload)
-- Future cousin keys (taskNotes, tkdDays, tkdTimes) slot in here too
-- without a new migration.
--
-- events: calendar entries. Proper table because each row has identity.
-- handoff_notes: parent / helper handoff comms. Proper table for the
-- same reason — each note has identity and should be edit/deletable.
--
-- ARCHITECTURE §4: each is a new system in its own home. None re-stores
-- task / star / streak truth.

create table if not exists public.family_settings (
  family_id uuid primary key references public.families(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id text primary key,
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null,
  event_date date,
  category text,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists events_family_idx on public.events(family_id);

create table if not exists public.handoff_notes (
  id text primary key,
  family_id uuid not null references public.families(id) on delete cascade,
  author_id text references public.profiles(id) on delete set null,
  note text not null,
  pinned boolean not null default false,
  posted_at timestamptz not null default now()
);
create index if not exists handoff_notes_family_idx on public.handoff_notes(family_id);

-- RLS + family-scoped CRUD policy, all in one DO loop.
do $$
declare t text;
begin
  foreach t in array array['family_settings','events','handoff_notes']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force  row level security', t);
    execute format('drop policy if exists "%1$s_rw_my_family" on public.%1$I', t);
    execute format($f$
      create policy "%1$s_rw_my_family"
        on public.%1$I for all
        to authenticated
        using      (family_id = public.my_family_id())
        with check (family_id = public.my_family_id())
    $f$, t);
  end loop;
end$$;
