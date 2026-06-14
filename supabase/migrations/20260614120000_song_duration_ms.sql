-- Song duration captured from iTunes.
--
-- We were already enriching songs via the iTunes Search API (cover,
-- canonical title/artist/album) but throwing away trackTimeMillis.
-- Capturing it lets drum practice "minutes played" come from the
-- canonical song length × play count instead of a parent's guess.
--
-- NULL on existing rows until the auto-enrich pass (or the one-shot
-- backfill in App.jsx) writes them. Display code falls back to 0 for
-- songs without a duration, so an un-backfilled library doesn't
-- under-count drumeo/melodics minutes.
alter table public.songs
  add column if not exists duration_ms integer;

comment on column public.songs.duration_ms
  is 'iTunes trackTimeMillis — used to derive honest drum playtime from song_plays.';
