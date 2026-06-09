-- Phase 6a — Book enrichment from Open Library.
--
-- Adds canonical metadata + cover URL cache columns to the books
-- table. Per-family columns (Option A) over a shared external_works
-- table (Option B): same RLS already applies; refactor to shared
-- cache if scale ever demands. Open Library is generous, our fan-out
-- is tiny.
--
-- match_status states:
--   unmatched  → no enrichment attempt yet (default for existing rows)
--   auto       → auto-matched on first render; needs parent Confirm
--   confirmed  → parent confirmed the match (locked)
--   rejected   → parent skipped enrichment for this row; never re-fetch
--
-- Stats unlocked once columns populate:
--   - Books per author (GROUP BY canonical_author)
--   - "Tipos Malos 6/6" series progress (GROUP BY external_id /
--     canonical_title prefix once series detection lands)
--   - Cover thumbnails in Insights + Reading Library
--
-- Star economy untouched: books table is independent of completions,
-- awarded_stars, protect_completion_stars_trg, enforce_actor_identity
-- _trg. No RLS change needed — existing family-scoped policy applies.

alter table public.books
  add column if not exists cover_url        text,
  add column if not exists canonical_title  text,
  add column if not exists canonical_author text,
  add column if not exists external_source  text,
  add column if not exists external_id      text,
  add column if not exists enriched_at      timestamptz,
  add column if not exists match_status     text not null default 'unmatched';

comment on column public.books.cover_url is
  'Deterministic Open Library cover URL (https://covers.openlibrary.org/b/id/<id>-M.jpg). Cached so we never re-hit the API on render.';
comment on column public.books.canonical_title is
  'Title as known to Open Library (preferred over free-typed title for stats / display).';
comment on column public.books.canonical_author is
  'First author from Open Library. Authoritative for "books per author" stats.';
comment on column public.books.external_source is
  'Provider that produced the match. v1: open_library only. v2: google_books fallback.';
comment on column public.books.external_id is
  'Provider-specific id. v1: OL work key (e.g. /works/OL45804W) or cover_i.';
comment on column public.books.match_status is
  'unmatched (default) | auto (needs Confirm) | confirmed (locked) | rejected (skip permanently).';
