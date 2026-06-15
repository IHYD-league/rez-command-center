-- Defensive data fix: any activity row missing a name (or with an
-- empty string) becomes "Untitled activity" so it shows up properly
-- in Manage Activities, where the parent can rename or delete it.
-- Mike caught a row "a_1781058586762" rendering its bare id on the
-- weekly streak summary because the row had no name — likely an
-- aborted Custom-add or a stale row from before the activities table
-- went into Supabase.
--
-- Safe: only touches rows where name IS NULL or empty. Idempotent —
-- re-running is a no-op once names are set.

update public.activities
   set name = 'Untitled activity'
 where name is null or trim(name) = '';

-- And same for short_name so the streaks panel has something readable
-- (its display preference is short_name first, then name).
update public.activities
   set short_name = 'Untitled'
 where (short_name is null or trim(short_name) = '')
   and name = 'Untitled activity';
