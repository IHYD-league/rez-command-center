-- Paired rollback for 20260623200000_shopping_items_last_price.sql.
--
-- THIS FILE IS NOT AUTO-APPLIED.
-- Lives in supabase/rollbacks/ (outside the CLI's supabase/migrations/
-- scan). To run: paste into the Supabase SQL Editor or feed via the
-- management API against the linked project. Do NOT move into
-- supabase/migrations/ or `supabase db push` will treat it as a fresh
-- forward migration.
--
-- DATA IMPACT on day zero (just-applied state): zero. The column is
-- NULL on every row; dropping it removes only the column itself.
--
-- DATA IMPACT after any UI use: any last_price value Mike (or
-- Krissie) stamped by confirming receipt-line matches is LOST on
-- rollback — the column drops. Acceptable for an intentional
-- rollback ("we're undoing the feature"); not a silent recovery
-- path. If D4 has been live for a while and you want to preserve
-- the price history before rolling back, snapshot it first:
--   select id, title, last_price, last_bought
--     from public.shopping_items
--    where family_id = (select id from public.families where name ilike '%lynch%' limit 1)
--      and last_price is not null;
--
-- Note: receipts.ocr_raw.items_reviewed retains every confirmed_
-- shopping_item_id + unit_price the user accepted, so rolling
-- back D4 doesn't lose the source data — only the convenience
-- denormalization on shopping_items. A future D4 redo can reapply
-- by walking receipts in chronological order.

alter table public.shopping_items
  drop column if exists last_price;

-- Integrity probe — pre/post-rollback Lynch shopping_items count
-- must match.
--   select count(*) from public.shopping_items
--    where family_id = (select id from public.families where name ilike '%lynch%' limit 1);
