-- Defensive: the photo_path column was authored idempotently into the
-- baseline migration (alter table … add column if not exists), but the
-- baseline was attached to remote via `supabase migration repair --status
-- applied` rather than actually executed — so the column only exists in
-- live if it was added by an earlier dashboard paste of supabase/schema.sql.
-- This migration NOTICEs which path it takes so the push log tells us
-- whether the column was already there.
do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'profiles'
      and column_name  = 'photo_path'
  ) then
    alter table public.profiles add column photo_path text;
    raise notice 'photo_path: ADDED — column was missing on remote.';
  else
    raise notice 'photo_path: ALREADY PRESENT on remote.';
  end if;
end$$;
