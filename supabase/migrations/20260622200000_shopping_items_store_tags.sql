-- Brick B of Food Hub Inventory — store tags + buy-often flag.
--
-- Adds two columns to shopping_items so the Inventory view (Brick A)
-- can carry per-item store routing and an explicit buy-often star.
--
-- WHY ADDITIVE-ONLY: Mike's 85 live items must survive byte-identical.
-- Both columns are either nullable (default_store) or defaulted
-- (buy_often DEFAULT false), so this migration never touches an
-- existing row. The 85 items gain default_store=NULL and
-- buy_often=false at column-creation time via Postgres's normal
-- default-fill behavior; no UPDATE statement runs.
--
-- default_store text:
--   Normalized key of the family's chosen home store for this item
--   (e.g. "costco", "trader joe's"), matching the same
--   normalizeListKey output that family_settings.shoppingLists keys
--   use. Nullable means "untagged" — Brick B's UI surfaces these
--   under the "Untagged" filter so Mike can sweep through them.
--
-- buy_often boolean NOT NULL DEFAULT false:
--   Explicit star toggle, separate from the existing "frequently
--   added" derived favorites (those are inferred from add-history;
--   this is a user-set preference).
--
-- Combined into one ALTER TABLE statement so the change is atomic —
-- if either column fails to create, neither lands.
--
-- ROLLBACK: supabase/rollbacks/20260622200000_shopping_items_store_tags_rollback.sql

alter table public.shopping_items
  add column if not exists default_store text,
  add column if not exists buy_often boolean not null default false;

comment on column public.shopping_items.default_store is
  'Normalized key of the family''s chosen home store for this item (matches family_settings.shoppingLists entries). NULL = untagged.';
comment on column public.shopping_items.buy_often is
  'Explicit buy-often star. Distinct from the derived "frequently added" favorites — user-set, not inferred from add-history.';
