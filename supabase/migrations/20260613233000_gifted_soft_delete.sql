-- gifted_stars soft-delete columns + filtering.
--
-- Trust audit finding #3 (🔴 critical): removeGift silently
-- deletes the row, even though the comment in the code calls out
-- the destructive nature ("Used to correct duplicates after the
-- fact"). Mike's framing — disputes over who removed a +10⭐
-- gift have no answer once the row is gone.
--
-- Soft-delete pattern: add deleted_at + deleted_by columns. The
-- app filters them out at toApp time so they don't appear in the
-- ledger UI, but they remain in the DB for forensics.
--
-- Backwards-compat: NULL = not deleted. Existing rows behave
-- unchanged. The new filter at the toApp layer drops any row
-- with a non-null deleted_at, so a parent who deleted-then-
-- restored a gift (future feature) would just NULL the column.

alter table public.gifted_stars
  add column if not exists deleted_at timestamptz null,
  add column if not exists deleted_by text null references public.profiles(id) on delete set null;

comment on column public.gifted_stars.deleted_at is
  'Soft-delete marker. When set, the app hides the row from the bonus ledger but the data stays for audit. NULL = not deleted.';
comment on column public.gifted_stars.deleted_by is
  'Profile id of whoever removed the gift. Stamped at the same instant deleted_at is set.';

-- Helpful index for the "exclude deleted" filter when the table
-- grows. Partial so it only contains active rows; deleted rows
-- still match family_id queries via the existing PK / family_id
-- index.
create index if not exists idx_gifted_stars_active
  on public.gifted_stars (family_id, date)
  where deleted_at is null;
