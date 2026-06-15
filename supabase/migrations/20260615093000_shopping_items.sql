-- Shared family shopping list — the most-used feature of family apps
-- per 2026 reviews. Dumb-simple by design: title + checked flag +
-- who added / who checked. No quantities, categories, stores, or
-- aisles in v1 — speed beats structure. The whole point is faster
-- than texting Krissie.
--
-- Lives alongside completions/events/tasks as its own per-family
-- table; RLS gates read+write to family_id = my_family_id().

create table if not exists public.shopping_items (
  id text primary key,
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null,
  notes text,
  checked boolean not null default false,
  checked_at timestamptz,
  checked_by text references public.profiles(id) on delete set null,
  added_by text references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists shopping_items_family_idx on public.shopping_items(family_id);
-- Partial index for the active list (almost everyone's read).
create index if not exists shopping_items_active_idx
  on public.shopping_items(family_id, created_at)
  where checked = false;

alter table public.shopping_items enable row level security;
alter table public.shopping_items force row level security;

drop policy if exists shopping_items_read on public.shopping_items;
create policy shopping_items_read on public.shopping_items
  for select using (family_id = public.my_family_id());

drop policy if exists shopping_items_write on public.shopping_items;
create policy shopping_items_write on public.shopping_items
  for all using (family_id = public.my_family_id())
        with check (family_id = public.my_family_id());

comment on table public.shopping_items is
  'Shared family shopping list. checked=true means bought / handled.';
