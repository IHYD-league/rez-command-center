-- Brick C1 of Food Hub Inventory — in-stock status flag.
--
-- Adds in_stock to shopping_items so the Inventory view can split
-- "things we have" from "things we need to buy" — the buy-list. Each
-- item gains a Mark out of stock / Mark in stock toggle in the
-- Inventory detail panel; out-of-stock items grey + strikethrough +
-- sink to the bottom of the list (same visual treatment as a
-- checked/bought item) but STAY on the list. The Out of Stock tab
-- filters to a buy-list at a glance.
--
-- WHY ADDITIVE-ONLY: Mike's 85 live items must survive byte-identical.
-- DEFAULT true means every existing row is treated as "in stock" the
-- moment the column lands — no UPDATE statement runs, no row rewrite.
--
-- NOT NULL DEFAULT true: a tri-state (true/false/null) would force
-- every consumer to handle three cases; the meaningful states are
-- "have it" and "out of it." Default true matches the world Mike is
-- in today (everything on the list is something he has unless he
-- says otherwise).
--
-- ROLLBACK: supabase/rollbacks/20260622220000_shopping_items_stock_status_rollback.sql

alter table public.shopping_items
  add column if not exists in_stock boolean not null default true;

comment on column public.shopping_items.in_stock is
  'True = item is on hand; false = out of stock, surfaces in the Out of Stock tab as the buy-list. NOT NULL, defaults to true so every existing row is in-stock on column-creation.';
