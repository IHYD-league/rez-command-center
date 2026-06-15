-- profiles.birthday — date column for upcoming-birthday badges and
-- "Coming up" celebration cards. Nullable; existing rows unaffected.
-- Per-row, year-agnostic in display (the celebration card computes
-- the next anniversary from today).

alter table public.profiles
  add column if not exists birthday date;

comment on column public.profiles.birthday is
  'Family member birthday. Drives the upcoming-birthday badge on People rows + Today celebration card. NULL = not set.';
