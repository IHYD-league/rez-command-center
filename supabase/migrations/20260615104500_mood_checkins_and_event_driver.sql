-- Two quick wins from the family-app research:
--
-- 1. Daily kid mood check-in — Reznor taps a 3-emoji row on his
--    Today (happy / meh / off); parents see a 7-day mood strip on
--    theirs. Per r/Parenting + r/sahp threads, this is one of the
--    most-asked-for emotional-surface-area features alongside
--    chore tracking. New table; one row per profile per date.
--
-- 2. events.driver_profile_id — Jam's "Who's Driving" is the
--    specifically-beloved coordination feature parents call out.
--    Adds a profile reference per event so a calendar entry can
--    say "🚗 Mike taking" right next to address + maps.
--
-- Both nullable / additive, no impact on existing rows.

create table if not exists public.daily_checkins (
  id text primary key,
  family_id uuid not null references public.families(id) on delete cascade,
  profile_id text not null references public.profiles(id) on delete cascade,
  date date not null default current_date,
  mood text not null,   -- 'happy' | 'ok' | 'off' (free-text allowed for future)
  note text,
  created_at timestamptz not null default now()
);
create unique index if not exists daily_checkins_unique_per_day
  on public.daily_checkins(family_id, profile_id, date);
create index if not exists daily_checkins_family_idx on public.daily_checkins(family_id);

alter table public.daily_checkins enable row level security;
alter table public.daily_checkins force row level security;

drop policy if exists daily_checkins_read on public.daily_checkins;
create policy daily_checkins_read on public.daily_checkins
  for select using (family_id = public.my_family_id());

drop policy if exists daily_checkins_write on public.daily_checkins;
create policy daily_checkins_write on public.daily_checkins
  for all using (family_id = public.my_family_id())
        with check (family_id = public.my_family_id());

comment on table public.daily_checkins is
  'Per-kid daily mood check-in. One row per (profile, date). Kid taps an emoji; parents see a 7-day strip.';

-- Driver on calendar events. Nullable; rows without a driver render
-- as they always have.
alter table public.events
  add column if not exists driver_profile_id text references public.profiles(id) on delete set null;

comment on column public.events.driver_profile_id is
  'Optional family member doing the driving/handoff for this event. Renders as "🚗 {name} taking" next to address.';
