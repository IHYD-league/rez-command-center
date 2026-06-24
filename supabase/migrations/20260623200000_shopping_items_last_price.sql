-- D4 of Food Hub — Receipt → Inventory loop. Adds last_price so a
-- confirmed receipt-line match can stamp the per-unit price back to
-- the inventory item.
--
-- The closure: D1 (The Loop) made mark-Out auto-build the buy-list
-- and check-off mark items "bought" with last_bought. D4 closes the
-- other half — receipt scan + confirm writes last_bought + last_price
-- + in_stock=true back to matched items. After D4 the loop runs end-
-- to-end (mark Out → list → buy → scan receipt → stamps + back in
-- stock).
--
-- STRICT confirmation for v1: no auto-confirm at any confidence tier.
-- A wrong silent stamp would corrupt the price/stock history that's
-- the whole point of the column. The receipt-review picker is the
-- only path that sets confirmed_shopping_item_id; D4 only writes for
-- lines where the user has explicitly confirmed.
--
-- WHY ADDITIVE-ONLY: Mike's 102+ live items must survive byte-
-- identical. The column is nullable, so this migration never touches
-- an existing row. All rows gain last_price=NULL via column-creation
-- default-fill; no UPDATE statement runs.
--
-- last_price numeric(10,2):
--   Last per-unit price recorded for this item, in family currency.
--   Set on receipt commit (and edit-mode "Commit matches") when a
--   line carries confirmed_shopping_item_id = this item's id; value
--   = the line's unit_price (already per-unit in receipts.ocr_raw).
--   numeric(10,2) covers prices up to $99,999,999.99 — plenty for
--   any grocery line; cleaner than untyped numeric for trend math.
--
-- ROLLBACK: supabase/rollbacks/20260623200000_shopping_items_last_price_rollback.sql

alter table public.shopping_items
  add column if not exists last_price numeric(10,2);

comment on column public.shopping_items.last_price is
  'Last per-unit price recorded for this item, in family currency. Set on receipt commit (D4) when a line carries a confirmed_shopping_item_id pointing here — value comes from the line unit_price. NULL = no price recorded yet.';
