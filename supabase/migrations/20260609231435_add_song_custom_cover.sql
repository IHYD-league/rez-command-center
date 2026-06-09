-- Phase 6b polish: custom album cover override for songs.
--
-- Mirrors the books custom-cover proposal in docs/IMAGE-PIPELINE.md:
-- a parent can upload their own album-cover photo when the
-- MusicBrainz/CAA match is wrong, missing, or just not what they want.
--
-- Storage shape mirrors uploadFamilyPhoto convention:
--   <familyId>/cover/<timestamp>-<rand>.jpg
-- We store the path (not a URL) here, then the client resolves it to
-- a signed URL via useSignedUrl, same as proof / album / avatar photos.
--
-- Resolution order in the display layer:
--   1. custom_cover_path (signed URL)  ← parent's upload, source of truth
--   2. cover_url                       ← MB / Cover Art Archive cache
--   3. placeholder                     ← unmatched + no upload yet
--
-- match_status semantics are unchanged: a custom cover doesn't change
-- whether the row is matched. Canonical title/artist from MB stays
-- useful even when the user overrides the cover.

alter table public.songs
  add column if not exists custom_cover_path text;

comment on column public.songs.custom_cover_path is
  'Parent-uploaded album cover storage path (<familyId>/cover/...). Takes precedence over cover_url. NULL when no manual override.';
