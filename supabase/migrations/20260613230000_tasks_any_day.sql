-- tasks.any_day — flexible-schedule flag.
--
-- For activities that can happen on ANY day (Taekwondo can be
-- practiced outside the scheduled days, casual extras, makeup
-- lessons). When true, the today filter ignores the task's
-- mode + days entirely and the task appears every day until the
-- parent toggles it off.
--
-- Backward-compat:
--   - default false means existing rows behave exactly as before
--     (mode + days filter still applies).
--   - the calendar TKD-day picker (familySetting `tkdDays`) and
--     the board-game per-date pin (topPriorities.daily) still
--     work — any_day is just a third, broader source for the
--     today list.
--
-- When the parent flips any_day on for an activity, they can also
-- mark it N/A for a single day via the existing taskNaDays
-- mechanism, so "always available, except today" still works.

alter table public.tasks
  add column if not exists any_day boolean not null default false;

comment on column public.tasks.any_day is
  'When true the task bypasses the mode + days schedule filter and is available every day. Used for flexible activities like makeup piano or any-day Taekwondo practice. Default false.';
