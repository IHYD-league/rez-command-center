-- Books: per-read history.
--
-- read_count (added in 20260611011845_add_book_read_count) is a flat
-- integer — useful for "Read 3×" pills but not for charts like "books
-- finished by month" that need each read's own dates + language.
--
-- This migration adds a jsonb array next to it. Each entry is the
-- snapshot of a previous read: { started, finished, lang }. The
-- CURRENT in-progress read still lives in the top-level started /
-- finished / lang columns; when a Round N starts, the picker pushes
-- the prior values into reads_history before resetting them.
--
-- Schema is intentionally loose (no jsonb_schema enforcement) because
-- the app owns the shape; tightening here would just slow iteration.

alter table public.books
  add column if not exists reads_history jsonb not null default '[]'::jsonb;

comment on column public.books.reads_history is
  'Snapshot of completed prior reads. Each entry { started, finished, lang } captures one finished read; the in-progress read still lives in books.started / .finished / .lang. Future Insights chart "finishes by month" honestly across re-reads.';
