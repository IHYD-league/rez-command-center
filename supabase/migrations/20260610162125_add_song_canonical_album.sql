-- Songs polish: persist canonical album name on each song row.
--
-- The Phase 6b enrichment captured canonical_title + canonical_artist
-- but threw away the release title (album). Users see albums in the
-- picker search results but the row only displays title + artist; the
-- album info is lost the moment they hit Save. For drumming context
-- "Master of Puppets (from Master of Puppets)" reads differently from
-- "Master of Puppets (from S&M2)" — same canonical recording, very
-- different practice context.
--
-- One nullable column, default NULL. Existing rows stay NULL until
-- their next re-enrich or manual edit. The Insights row display and
-- picker form are updated alongside this migration to read/write it.

alter table public.songs
  add column if not exists canonical_album text;

comment on column public.songs.canonical_album is
  'Canonical album/release name from MusicBrainz (release.title after pickCanonicalRelease filtering). Editable via the picker. NULL when not enriched yet.';
