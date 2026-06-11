-- Books: re-read counter.
--
-- One column, NOT NULL with default 1 — every existing row immediately
-- gets read_count=1 (the read we already know about). Each subsequent
-- "Round 2" from the Reading Library picker increments by one.
--
-- preTracking semantics: read_count counts ALL reads, including the
-- pre-tracking historical one. A book Reznor read in kindergarten and
-- then again now has read_count=2 with preTracking=true; the
-- preTracking flag stays as historical marker for "the FIRST read was
-- in the pre-tracking era — only the dates for the CURRENT read are
-- tracked."

alter table public.books
  add column if not exists read_count integer not null default 1;

comment on column public.books.read_count is
  'Total number of times this book has been read by the family. Incremented when an existing book is picked for re-read via the Reading Library add picker.';
