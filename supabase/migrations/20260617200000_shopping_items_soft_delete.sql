-- Soft-delete + undo for shopping list items.
--
-- The X button on a shopping_items row used to hard-delete instantly,
-- which is the exact destructive pattern that caused 2026-06-15's
-- "stale tab wiped Mike's book" incident. Krissie taps X in the
-- wrong row by accident → the row is gone, no recovery.
--
-- This migration introduces a deleted_at / deleted_by pair matching
-- the gifted_stars soft-delete convention. The client marks the row
-- removed (UI hides it, item is "deleted" from the user's perspective)
-- but the DB row persists for a short undo window. A "Removed X —
-- Undo" toast surfaces; tap Undo clears deleted_at and the item
-- comes back intact. After the window expires the client purges the
-- row via the existing remove path; if the user reloads before the
-- timer fires, the load-time purge in ShoppingList cleans up any
-- expired soft-deletes.
--
-- Schema shape (matches public.gifted_stars):
--   deleted_at  timestamptz nullable — null = visible, set = soft-removed
--   deleted_by  text references public.profiles(id) on delete set null
--               — audit who removed it (parent or kid)
--
-- ROLLBACK:
--   alter table public.shopping_items drop column if exists deleted_at;
--   alter table public.shopping_items drop column if exists deleted_by;
--   drop index if exists shopping_items_active_alive_idx;

alter table public.shopping_items
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by text references public.profiles(id) on delete set null;

-- Partial index for "active list, alive items" — the parent's
-- primary read path now needs to also skip soft-deleted rows.
-- Builds on the existing shopping_items_list_active_idx pattern.
create index if not exists shopping_items_active_alive_idx
  on public.shopping_items(family_id, list_name, created_at)
  where checked = false
    and deleted_at is null
    and (request_status is null or request_status = 'approved');

comment on column public.shopping_items.deleted_at is
  'Soft-delete marker. NULL = visible. Set = removed from the user UI but kept in DB for the undo window. Client purges via DELETE after the window or on next load.';
comment on column public.shopping_items.deleted_by is
  'Profile id of who tapped the X. Audit-only; the soft-delete itself is reversible until the purge fires.';
