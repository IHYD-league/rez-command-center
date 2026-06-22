-- Paired rollback for 20260622200000_shopping_items_store_tags.sql.
--
-- THIS FILE IS NOT AUTO-APPLIED.
-- Lives in supabase/rollbacks/ (outside the CLI's supabase/migrations/
-- scan). To run: paste into the Supabase SQL Editor or feed via the
-- management API against the linked project. Do NOT move into
-- supabase/migrations/ or `supabase db push` will treat it as a fresh
-- forward migration.
--
-- DATA IMPACT on day zero (just-applied state): zero. Both columns
-- carry NULL / default false on every row; dropping them removes
-- only the columns.
--
-- DATA IMPACT after any UI use: any default_store tag Mike set + any
-- buy_often star Mike toggled is LOST on rollback (columns drop). This
-- is the deliberate trade — rollback exists for "we're undoing the
-- feature," not as a silent recovery path. If Brick B has been live
-- for a while, snapshot defaultStore + buyOften per item before
-- rolling back.

alter table public.shopping_items
  drop column if exists buy_often;

alter table public.shopping_items
  drop column if exists default_store;

-- Integrity probe — pre/post-rollback Lynch shopping_items count
-- must match.
--   select count(*) from public.shopping_items
--    where family_id = (select id from public.families where name ilike '%lynch%' limit 1);
