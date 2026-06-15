-- Events: add weekly recurrence + time-of-day for the simple-calendar UX.
--
-- Today an event is a (title, date, category, notes) row. The new
-- calendar UX (per Mike's "tap a day, sheet pops up" design) adds:
--
-- 1. event_time text — "HH:MM" 24h or NULL for all-day. The wheel
--    picker outputs this; UI formats to 12h when rendering. NULL keeps
--    existing rows behaving as they did (no time shown).
--
-- 2. recur_weekday integer — 0..6 (0=Sun) for "every <weekday>"
--    recurrence. NULL on existing rows preserves the date-specific
--    behavior. When set, event_date is treated as the start date (or
--    null if the recurrence started in the past).
--
-- Temp-week overrides ("this week Reznor is visiting Xander, normal
-- schedule paused") live in familySettings.weekOverrides as an array
-- of { startDate, endDate, label } — no schema change needed for that.
--
-- Safe & additive: both columns default NULL, all existing rows
-- continue to render unchanged.

alter table public.events
  add column if not exists event_time text,
  add column if not exists recur_weekday integer;

-- Sanity: weekday 0-6 only.
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'events_recur_weekday_range'
       and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_recur_weekday_range
      check (recur_weekday is null or (recur_weekday between 0 and 6));
  end if;
end $$;

comment on column public.events.event_time is
  'HH:MM 24h time-of-day. NULL = all-day. Wheel picker writes this.';
comment on column public.events.recur_weekday is
  'Weekly recurrence weekday (0=Sun..6=Sat). NULL = one-off on event_date.';
