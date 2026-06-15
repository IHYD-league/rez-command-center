-- events.duration_minutes — enables time-overlap detection so parents
-- get a warning when "Tuesday 2:30 PM Drum class" collides with
-- "Tuesday 3:00 PM Soccer practice."
--
-- Nullable: rows without a duration are treated as a 60-min default
-- in the overlap math (configurable via familySettings later). Mike
-- can override per-event from the EventEditSheet's new duration
-- picker (15/30/45/60/90/120 min).
--
-- Also unlocks the weekly-load gauge ("Reznor has 14h scheduled this
-- week") and the per-day "busy" hint on the week strip.

alter table public.events
  add column if not exists duration_minutes integer;

comment on column public.events.duration_minutes is
  'Optional event length in minutes (15/30/45/60/90/120 typical). NULL = use familySettings.defaultEventDuration (default 60) for overlap + load math.';
