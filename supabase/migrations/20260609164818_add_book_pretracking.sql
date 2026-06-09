-- Pre-tracking backlog entries for books.
--
-- Reznor read a stack of books before granular tracking started in
-- June 2026 — Tipos Malos Vols 1-6, kids' picture books, etc. Those
-- books should COUNT toward count-based stats (total books, books
-- per author, "Tipos Malos 6/6") but should NOT appear in any view
-- that needs a real date, because we don't have one and we won't
-- fake one.
--
-- Honest design: keep `status` as a state-machine (reading / finished
-- / wishlist / dropped) and add an ORTHOGONAL boolean for provenance.
-- A backlog book is usually status='finished' AND pre_tracking=true
-- with started/finished left NULL — the era_label carries the rough
-- when ("Kindergarten 2026" / "Before May 2026" / custom).
--
-- Star economy untouched: books table is independent of completions,
-- awarded_stars, the protect_completion_stars_trg + enforce_actor_
-- identity_trg guards. No RLS change needed (per-family policy
-- still applies).

alter table public.books
  add column if not exists pre_tracking boolean not null default false;

alter table public.books
  add column if not exists era_label text;

comment on column public.books.pre_tracking is
  'True iff this book is a pre-tracking backlog entry (no real dates).';
comment on column public.books.era_label is
  'Human-readable era for backlog books ("Kindergarten 2026", "Before May 2026", etc.). NULL for tracked books.';
