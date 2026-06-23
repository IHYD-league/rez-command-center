-- Paired rollback for 20260623180000_shopping_items_last_bought.sql.
--
-- THIS FILE IS NOT AUTO-APPLIED.
-- Lives in supabase/rollbacks/ (outside the CLI's supabase/migrations/
-- scan). To run: paste into the Supabase SQL Editor or feed via the
-- management API against the linked project. Do NOT move into
-- supabase/migrations/ or `supabase db push` will treat it as a fresh
-- forward migration.
--
-- DATA IMPACT on day zero (just-applied state): zero. Both columns
-- carry NULL on every row; dropping them removes only the columns.
--
-- DATA IMPACT after any UI use: any last_bought timestamp + last_
-- bought_by audit Mike (or Krissie / Reznor) recorded by checking
-- items off the Shopping List is LOST on rollback. Acceptable for
-- an intentional rollback ("we're undoing the feature"); not a
-- silent recovery path. If D1 has been live for a while and you
-- want to preserve the buy-history before rolling back, snapshot
-- the two columns first via:
--   select id, title, last_bought, last_bought_by
--     from public.shopping_items
--    where family_id = (select id from public.families where name ilike '%lynch%' limit 1)
--      and (last_bought is not null or last_bought_by is not null);
--
-- Drops in reverse-dependency order: last_bought_by first (its FK
-- to public.profiles must come down before the column itself can be
-- dropped cleanly), then last_bought.

alter table public.shopping_items
  drop column if exists last_bought_by;

alter table public.shopping_items
  drop column if exists last_bought;

-- Integrity probe — pre/post-rollback Lynch shopping_items count
-- must match.
--   select count(*) from public.shopping_items
--    where family_id = (select id from public.families where name ilike '%lynch%' limit 1);
