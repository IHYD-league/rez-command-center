-- Paired rollback for 20260622220000_shopping_items_stock_status.sql.
--
-- THIS FILE IS NOT AUTO-APPLIED.
-- Lives in supabase/rollbacks/ (outside the CLI's supabase/migrations/
-- scan). To run: paste into the Supabase SQL Editor or feed via the
-- management API against the linked project. Do NOT move into
-- supabase/migrations/ or `supabase db push` will treat it as a fresh
-- forward migration.
--
-- DATA IMPACT on day zero (just-applied state): zero. The column is
-- true on every row via column-creation default-fill; dropping it
-- removes only the column itself.
--
-- DATA IMPACT after any UI use: any "out of stock" flag Mike (or
-- Krissie) set is LOST on rollback — out-of-stock items snap back
-- to "in stock" the moment the column drops. Acceptable for an
-- intentional rollback ("we're undoing the feature"); not a silent
-- recovery path. If Brick C1 has been live for a while, snapshot
-- in_stock per item before rolling back.

alter table public.shopping_items
  drop column if exists in_stock;

-- Integrity probe — pre/post-rollback Lynch shopping_items count
-- must match.
--   select count(*) from public.shopping_items
--    where family_id = (select id from public.families where name ilike '%lynch%' limit 1);
