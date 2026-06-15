-- Shopping List v2 — store-section grouping + multiple named lists.
-- Per docs/SHOPPING-LIST.md: "top apps group items by store section
-- (produce, dairy, frozen, household) so you don't backtrack, and
-- support separate lists per store (Costco vs. regular grocery vs.
-- Target)."
--
-- Both columns nullable for backward compat:
--   section text     — "Produce" / "Dairy" / "Pantry" / etc. Client
--                      classifyItem() heuristic populates it on add;
--                      parent can override. NULL falls into "Other"
--                      when rendered.
--   list_name text   — "Grocery" / "Costco" / "Target". Defaults to
--                      "Grocery" when omitted. Mike's Costco-vs-
--                      regular split per the doc lives here. Future
--                      v2.1 can promote this to its own table if
--                      anyone wants per-list metadata (icon, color).

alter table public.shopping_items
  add column if not exists section text,
  add column if not exists list_name text;

-- Defaulting existing Lynch rows to the "Grocery" list keeps every
-- shipped row visible after the v2 UI lands. (Brand-new families
-- don't have rows yet.)
update public.shopping_items
   set list_name = 'Grocery'
 where list_name is null;

-- Partial index for the per-list active scan (the parent's primary
-- read path). Skip checked items so the index stays small.
create index if not exists shopping_items_list_active_idx
  on public.shopping_items(family_id, list_name, created_at)
  where checked = false and (request_status is null or request_status = 'approved');

comment on column public.shopping_items.section is
  'Store section ("Produce" / "Dairy" / "Pantry" / etc.). Client classifyItem() auto-fills; parent can override. NULL renders as "Other".';
comment on column public.shopping_items.list_name is
  'Named list ("Grocery" / "Costco" / "Target"). Defaults to "Grocery". Lets a family keep separate per-store lists.';
