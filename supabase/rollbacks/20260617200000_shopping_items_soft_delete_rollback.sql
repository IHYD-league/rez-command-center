-- Paired rollback for 20260617200000_shopping_items_soft_delete.sql.
--
-- THIS FILE IS NOT AUTO-APPLIED.
-- It lives in supabase/rollbacks/ (outside the CLI's migration scan
-- of supabase/migrations/). To run it, paste this SQL into the
-- Supabase SQL Editor or feed it directly to psql against the linked
-- project; do NOT move it into supabase/migrations/ or
-- `supabase db push --include-all` will treat it as a fresh forward
-- migration and undo the soft-delete columns the moment a sync runs.
--
-- Filename convention: same timestamp as the forward migration plus
-- the _rollback suffix, matching the receipts rollback pattern from
-- Green's RS-1 work.
--
-- Drops in reverse-dependency order: index first (it's the only
-- thing that references the new columns), then the deleted_by
-- column (its FK to public.profiles must come down before the
-- column itself can be dropped cleanly), then deleted_at.
--
-- After applying this rollback, public.shopping_items is byte-
-- identical to its pre-2026-06-17 shape: no deleted_at, no
-- deleted_by, no soft-delete index. The existing
-- shopping_items_list_active_idx + shopping_items_pending_idx +
-- shopping_items_active_idx + shopping_items_family_idx remain
-- untouched — they didn't reference the new columns.
--
-- DATA IMPACT: zero. The forward migration didn't rewrite any
-- existing rows; rollback only drops empty columns. The 80 Lynch
-- items, the duplicate-Lynch family's 0 items, every other family —
-- all unchanged in count + content + their non-soft-delete fields.
--
-- If any row has a non-null deleted_at at rollback time (i.e. a
-- soft-delete is in flight from a live client), the row is silently
-- restored to "alive" by virtue of the column going away — the
-- client UI will show it again on next load. Acceptable for a
-- rollback scenario (rolling back means we're undoing the feature
-- intentionally; in-flight soft-deletes losing their pending-purge
-- status is correct).

drop index if exists public.shopping_items_active_alive_idx;

alter table public.shopping_items
  drop column if exists deleted_by;

alter table public.shopping_items
  drop column if exists deleted_at;

-- Integrity probe — same shape as the receipts rollback.
-- The pre-rollback Lynch shopping_items count must equal the
-- post-rollback count.
--   select count(*) from public.shopping_items
--    where family_id = 'bdf473f4-f049-475a-92e1-8b5a035a88bb';
