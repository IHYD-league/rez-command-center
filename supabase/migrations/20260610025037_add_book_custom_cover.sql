-- Books Phase 6a polish: custom book cover override.
--
-- Mirrors 20260609231435_add_song_custom_cover.sql byte-for-byte at
-- the schema level — same column, same purpose, different table.
-- Parent uploads their own book-cover photo when Open Library is wrong,
-- missing, or just lower quality than a phone-snap of the actual book.
--
-- Storage shape mirrors uploadFamilyPhoto convention:
--   <familyId>/cover/<timestamp>-<rand>.jpg
-- Path is stored (not a URL); client resolves to a signed URL via
-- useSignedUrl at display time, same as proof / album / avatar / song-cover.
--
-- Resolution order in the display layer:
--   1. custom_cover_path (signed URL)  ← parent's upload, source of truth
--   2. cover_url                       ← Open Library cache
--   3. placeholder                     ← unmatched + no upload yet
--
-- match_status semantics are unchanged: a custom cover doesn't change
-- whether the row is matched. Canonical title/author from OL stays
-- useful even when the user overrides the cover.

alter table public.books
  add column if not exists custom_cover_path text;

comment on column public.books.custom_cover_path is
  'Parent-uploaded book cover storage path (<familyId>/cover/...). Takes precedence over cover_url. NULL when no manual override.';
