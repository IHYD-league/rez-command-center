-- Customization Hub Phase 1: per-profile accessibility / display prefs.
--
-- ARCHITECTURE §4 — new system, own table, never re-stores task / star /
-- streak truth. If you DELETE FROM user_prefs the rest of the app keeps
-- working; each profile just falls back to the regular defaults.
--
-- Modular registry on the client adds new keys to the prefs jsonb without
-- schema changes. Phase 2 (themes) lives at prefs.theme; reduced motion
-- lives at prefs.reducedMotion; etc. One column, many modules — that's
-- the whole point of the hub.

create table if not exists public.user_prefs (
  family_id uuid not null references public.families(id) on delete cascade,
  profile_id text not null references public.profiles(id) on delete cascade,
  prefs jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (family_id, profile_id)
);

create index if not exists user_prefs_family_idx on public.user_prefs(family_id);

alter table public.user_prefs enable row level security;
alter table public.user_prefs force  row level security;

drop policy if exists "user_prefs_rw_my_family" on public.user_prefs;
create policy "user_prefs_rw_my_family"
  on public.user_prefs for all
  to authenticated
  using      (family_id = public.my_family_id())
  with check (family_id = public.my_family_id());
