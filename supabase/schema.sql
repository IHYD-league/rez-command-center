-- ====================================================================
-- Reznor Command Center — foundational auth/multi-tenancy schema + RLS
-- Run once in Supabase Dashboard → SQL Editor. Idempotent.
-- ====================================================================
--
-- Scope today: the app data is still all in-memory React state, so the
-- only tables that exist are the multi-tenancy primitives below.
-- When you migrate state to real tables, follow the pattern at the
-- bottom of this file for each new table.
-- ====================================================================

-- 1. Tables -----------------------------------------------------------

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.family_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  family_id uuid not null references public.families(id) on delete cascade,
  role text not null check (role in ('parent','grandparent','helper','guest')),
  display_name text,
  created_at timestamptz not null default now()
);

create index if not exists family_members_family_idx
  on public.family_members(family_id);

-- 2. RLS: enable AND force --------------------------------------------
--    `enable` turns RLS on for non-owner roles (anon, authenticated).
--    `force`  also subjects the table OWNER, so even the postgres role
--             must satisfy a policy. Belt + suspenders.

alter table public.families       enable row level security;
alter table public.families       force  row level security;
alter table public.family_members enable row level security;
alter table public.family_members force  row level security;

-- 3. Helper: which family is the caller in? ---------------------------
--    SECURITY DEFINER + fixed search_path so the function bypasses RLS
--    on family_members (otherwise policies would recurse).

create or replace function public.my_family_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select family_id from public.family_members where user_id = auth.uid()
$$;

revoke all on function public.my_family_id() from public;
grant execute on function public.my_family_id() to authenticated;

-- 4. Policies ---------------------------------------------------------
--    For now: SELECT only. No INSERT/UPDATE/DELETE policies means those
--    operations are blocked for all signed-in users at the DB layer.
--    Admin changes happen via the dashboard / service-role.
--    Add per-table mutate policies when you wire up real writes.

drop policy if exists "families_select_my"       on public.families;
drop policy if exists "family_members_select_my" on public.family_members;

create policy "families_select_my"
  on public.families
  for select
  to authenticated
  using (id = public.my_family_id());

create policy "family_members_select_my"
  on public.family_members
  for select
  to authenticated
  using (family_id = public.my_family_id());

-- 5. Verify RLS is actually on (run this after the rest) --------------
-- Expect: rowsecurity = true, forcerowsecurity = true for both rows.
--
-- select schemaname, tablename, rowsecurity, forcerowsecurity
-- from   pg_tables
-- where  schemaname = 'public'
--   and  tablename in ('families','family_members');


-- ====================================================================
-- TEMPLATE for future data tables (kept here so it's not forgotten):
-- ====================================================================
-- create table public.tasks (
--   id uuid primary key default gen_random_uuid(),
--   family_id uuid not null references public.families(id) on delete cascade,
--   ...
-- );
-- alter table public.tasks enable row level security;
-- alter table public.tasks force  row level security;
--
-- create policy "tasks_rw_my_family"
--   on public.tasks
--   for all
--   to authenticated
--   using       (family_id = public.my_family_id())
--   with check  (family_id = public.my_family_id());
-- ====================================================================
