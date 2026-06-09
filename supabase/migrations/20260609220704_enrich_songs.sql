-- Phase 6b: song enrichment cache.
--
-- Mirrors the books enrich pattern (20260609182038_enrich_books.sql).
-- One write to MusicBrainz + Cover Art Archive per song, cached forever
-- on the row so re-renders never re-hit the network.
--
-- match_status state machine:
--   unmatched  → row has never been auto-enriched; client effect picks it up
--   auto       → auto-enrichment populated the columns; awaits parent confirm
--   confirmed  → parent locked it (✓ Looks right)
--   rejected   → parent dismissed it (Skip); cover_url is cleared
--
-- No RLS change. No index change. No data migration — existing 12 songs
-- default to 'unmatched' and get enriched on first Insights render.

alter table public.songs
  add column if not exists cover_url        text,
  add column if not exists canonical_title  text,
  add column if not exists canonical_artist text,
  add column if not exists external_source  text,
  add column if not exists external_id      text,
  add column if not exists enriched_at      timestamptz,
  add column if not exists match_status     text default 'unmatched';

comment on column public.songs.cover_url        is 'Deterministic Cover Art Archive URL; never re-fetched after first match.';
comment on column public.songs.canonical_title  is 'Canonical title from MusicBrainz; user-typed title in public.songs.title stays as the fallback for unmatched rows.';
comment on column public.songs.canonical_artist is 'Canonical artist from MusicBrainz; unblocks per-artist stats (e.g. songs-per-artist).';
comment on column public.songs.external_source  is 'Provider tag; currently always ''musicbrainz''.';
comment on column public.songs.external_id      is 'MusicBrainz release MBID (the cover-bearing entity), not the recording MBID.';
comment on column public.songs.enriched_at      is 'When the auto-match wrote this row. NULL when match_status=unmatched.';
comment on column public.songs.match_status     is 'unmatched | auto | confirmed | rejected — drives the EnrichedSongRow CTAs.';
