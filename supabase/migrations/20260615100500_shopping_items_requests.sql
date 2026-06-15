-- Shopping list — kid request / parent approval flow.
--
-- Per docs/SHOPPING-LIST.md: the soul-feature is "Reznor adds a
-- request → parent approves it onto the real list, or declines."
-- This reuses the existing completion-approval pattern: kid items
-- land in pending status; parents see them in a pending-requests
-- card with Approve / Decline; approved items merge into the main
-- list; declined items show "Not this week" to the kid.
--
-- Schema additions (all nullable for backward-compat with rows added
-- before this migration — those are treated as parent-added):
--   request_status text — null | 'pending' | 'approved' | 'declined'
--   decided_by text     — profile id of parent who approved/declined
--   decided_at timestamptz
--   decline_reason text — short note the kid sees ("not this week")
--   brand text          — saved brand preference for v1.5 smart-add
--                          ("Jif", "Honey Nut Cheerios"); lives now so
--                          v1.5 doesn't need another migration.

alter table public.shopping_items
  add column if not exists request_status text,
  add column if not exists decided_by text references public.profiles(id) on delete set null,
  add column if not exists decided_at timestamptz,
  add column if not exists decline_reason text,
  add column if not exists brand text;

-- Allowlist for request_status. NULL = parent-added (no request flow).
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'shopping_items_request_status_check'
       and conrelid = 'public.shopping_items'::regclass
  ) then
    alter table public.shopping_items
      add constraint shopping_items_request_status_check
      check (request_status is null or request_status in ('pending','approved','declined'));
  end if;
end $$;

-- Partial index for the "pending requests" parent view. Most reads
-- skip this; when a parent opens Shopping, they want it fast.
create index if not exists shopping_items_pending_idx
  on public.shopping_items(family_id, created_at)
  where request_status = 'pending';

comment on column public.shopping_items.request_status is
  'NULL = parent-added (on list). pending = kid request awaiting approval. approved = on list (visible like a normal item). declined = kid sees a "Not this week" note.';
comment on column public.shopping_items.brand is
  'Optional brand preference ("Jif", "Honey Nut Cheerios"). v1.5 smart-add reads this to render brand under the item.';
