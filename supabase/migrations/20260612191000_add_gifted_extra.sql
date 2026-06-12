-- gifted_stars.extra — jsonb metadata blob so a gift can record what
-- the bonus was actually for: which task / activity / book / song /
-- proof photo. Today the label field is the only context, which makes
-- gift rows look generic in every list. Storing the context in extra
-- (same pattern as completions.extra) means displays can pick the
-- right thumbnail and tally surfaces can attribute correctly.
--
-- Defaults to '{}' so existing rows continue to satisfy NOT-NULL on
-- the column. The toDb mapper always sends an object so PostgREST's
-- batch column normalization (memory: NULL-padding new vs existing
-- mixed batches) lands a value on every upsert.

alter table public.gifted_stars
  add column if not exists extra jsonb not null default '{}'::jsonb;
