-- D1 of Food Hub — The Loop. Adds last_bought / last_bought_by so
-- check-off on the Shopping List can record buy history.
--
-- The unified loop: mark Out → in_stock=false routes the item to its
-- preferred store's Shopping List. Check off ("bought") → in_stock=
-- true + last_bought stamped. The Shopping List becomes a derived
-- view over in_stock (out) + requestStatus (approved). Existing
-- `checked` column stays in schema as legacy (Model C from the recon)
-- — no UPDATE runs on any existing row.
--
-- WHY ADDITIVE-ONLY: Mike's 99 live items must survive byte-identical.
-- Both columns are nullable, so this migration never touches an
-- existing row. All 99 gain last_bought=NULL + last_bought_by=NULL
-- via column-creation default-fill; no UPDATE statement runs.
--
-- last_bought timestamptz:
--   When the item was last marked bought (check-off in Shopping
--   List). Drives buy-history / repeat-buy / D4 receipt-loop. NULL =
--   never recorded as bought.
--
-- last_bought_by text REFERENCES profiles(id) ON DELETE SET NULL:
--   Actor who marked the last buy. Parallels checked_by — same FK
--   shape, same on-delete behavior so a profile rotation doesn't
--   cascade history loss. NULL = no recorded last-buy yet.
--
-- Combined into one ALTER TABLE statement so the change is atomic —
-- if either column fails to create, neither lands.
--
-- ROLLBACK: supabase/rollbacks/20260623180000_shopping_items_last_bought_rollback.sql

alter table public.shopping_items
  add column if not exists last_bought timestamptz,
  add column if not exists last_bought_by text references public.profiles(id) on delete set null;

comment on column public.shopping_items.last_bought is
  'When the item was last marked bought (check-off in Shopping List). Drives buy-history / repeat-buy / D4 receipt-loop. NULL = never recorded as bought.';
comment on column public.shopping_items.last_bought_by is
  'Actor who marked the last buy. Parallels checked_by. NULL = no recorded last-buy yet.';
