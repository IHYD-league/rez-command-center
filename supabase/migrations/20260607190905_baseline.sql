-- ====================================================================
-- Reznor Command Center — Phase 2 schema
--
-- Idempotent — safe to re-run. Builds on Phase 1 (families table +
-- my_family_id helper).
--
-- What this script does:
--   1. Keeps Phase 1's `families` table.
--   2. Adds `profiles` as the canonical roster (Mike, Krissie, Reznor,
--      helpers, etc.) and re-points `my_family_id()` at it. The Phase 1
--      `family_members` table is left in place but no longer load-bearing
--      — drop it later if you want.
--   3. Adds real tables for tasks, rewards, completions, streaks, books,
--      awards, reward_requests, redemptions, gifted_stars.
--   4. Enables AND forces RLS on every new table, with full CRUD policies
--      scoped by `family_id = my_family_id()`.
--   5. Creates a private Storage bucket `family-photos` with object-level
--      RLS so only family members can read/write files under their
--      family_id folder.
--   6. Seeds the Lynch family + Mike + Krissie + Reznor profile + drums
--      streak (current=310, longest=310, since 2025-08-01,
--      last_date=2026-06-06) + today's drum completion so the star bank
--      math lands at 70.
-- ====================================================================

-- =============================================================
-- 0. Phase 1 carry-over (no-op if already there)
-- =============================================================
create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);
alter table public.families enable row level security;
alter table public.families force  row level security;

-- =============================================================
-- 1. Profiles (replaces family_members as the canonical roster)
-- =============================================================
create table if not exists public.profiles (
  id text primary key,                                   -- stable slug like 'u_mike'
  family_id uuid not null references public.families(id) on delete cascade,
  auth_user_id uuid unique references auth.users(id) on delete set null,
  email text,
  name text not null,
  role text not null check (role in ('parent','grandparent','helper','guest','kid')),
  relationship text,
  color text,
  emoji text,
  active boolean not null default true,
  access_type text not null default 'permanent' check (access_type in ('permanent','temporary')),
  access_expires date,
  permissions jsonb not null default '{}'::jsonb,
  is_child boolean not null default false,
  kid_meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Avatar uploads land in the family-photos bucket; we store just the
-- storage path here and resolve to a signed URL at display time.
alter table public.profiles add column if not exists photo_path text;

create unique index if not exists profiles_email_lower_idx
  on public.profiles ((lower(email))) where email is not null;
create index if not exists profiles_family_idx on public.profiles(family_id);

alter table public.profiles enable row level security;
alter table public.profiles force  row level security;

-- Re-point my_family_id() at profiles (authoritative now).
-- SECURITY DEFINER + postgres ownership (BYPASSRLS) means the SELECT
-- inside this function skips RLS on profiles, so a profiles policy
-- that calls my_family_id() won't recurse back into itself.
create or replace function public.my_family_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select family_id from public.profiles where auth_user_id = auth.uid()
$$;
revoke all on function public.my_family_id() from public;
grant execute on function public.my_family_id() to authenticated;

-- is_parent(): same trick — a SECURITY DEFINER wrapper around the
-- "am I a parent in my family" check, so the profiles policy that
-- needs this answer doesn't have to inline an EXISTS subquery
-- against profiles (which would recurse via RLS).
create or replace function public.is_parent()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where auth_user_id = auth.uid()
      and role = 'parent'
  )
$$;
revoke all on function public.is_parent() from public;
grant execute on function public.is_parent() to authenticated;

-- =============================================================
-- 2. Data tables (one per entity the user listed)
-- =============================================================

create table if not exists public.tasks (
  id text primary key,
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null,
  category text,
  activity_type text,
  activity_id text,
  required boolean default false,
  star_value int default 0,
  bonus_star_value int,
  proof_required boolean default false,
  proof_type text,
  approval_required boolean default false,
  mode text default 'both',
  minutes int,
  days text[],
  subtasks jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists tasks_family_idx on public.tasks(family_id);

create table if not exists public.rewards (
  id text primary key,
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null,
  star_cost int not null,
  category text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists rewards_family_idx on public.rewards(family_id);

create table if not exists public.completions (
  id text primary key,
  family_id uuid not null references public.families(id) on delete cascade,
  task_id text not null,
  status text not null check (status in ('pending','approved','needs_fix','skipped')),
  awarded_stars int not null default 0,
  pending_stars int not null default 0,
  completed_by text references public.profiles(id) on delete set null,
  submitted_by text references public.profiles(id) on delete set null,
  approved_by text references public.profiles(id) on delete set null,
  notes text,
  proof jsonb not null default '[]'::jsonb,
  extra jsonb not null default '{}'::jsonb,
  completion_date date not null default current_date,
  created_at timestamptz not null default now()
);
create index if not exists completions_family_idx on public.completions(family_id);
create index if not exists completions_date_idx on public.completions(family_id, completion_date);

-- Backfill column on existing databases (no-op on fresh installs).
-- completed_by is the kid the stars/streak belong to (always Reznor today).
-- submitted_by is whoever actually tapped Submit (parent, helper, kid).
-- approved_by  is whoever flipped status to approved.
alter table public.completions
  add column if not exists submitted_by text references public.profiles(id) on delete set null;

create table if not exists public.streaks (
  family_id uuid not null references public.families(id) on delete cascade,
  activity_id text not null,
  current int not null default 0,
  longest int not null default 0,
  since date,
  last_date date,
  updated_at timestamptz not null default now(),
  primary key (family_id, activity_id)
);

create table if not exists public.books (
  id text primary key,
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null,
  lang text,
  status text default 'reading' check (status in ('reading','finished','wishlist','dropped')),
  started date,
  finished date,
  level text,
  rating int,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists books_family_idx on public.books(family_id);

create table if not exists public.awards (
  id text primary key,
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null,
  type text,
  activity_id text,
  award_date date,
  file_name text,
  file_path text,   -- storage object path (private bucket)
  url text,         -- optional external link
  note text,
  created_at timestamptz not null default now()
);
create index if not exists awards_family_idx on public.awards(family_id);

create table if not exists public.reward_requests (
  id text primary key,
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null,
  note text,
  status text not null default 'requested' check (status in ('requested','approved','declined')),
  star_cost int,
  requested_by text references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists reward_requests_family_idx on public.reward_requests(family_id);

create table if not exists public.redemptions (
  id text primary key,
  family_id uuid not null references public.families(id) on delete cascade,
  reward_id text,
  title text,
  cost int not null,
  status text not null default 'requested' check (status in ('requested','approved','denied')),
  requested_by text references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists redemptions_family_idx on public.redemptions(family_id);

create table if not exists public.gifted_stars (
  id text primary key,
  family_id uuid not null references public.families(id) on delete cascade,
  label text,
  stars int not null,
  given_by text references public.profiles(id) on delete set null,
  given_on date not null default current_date,
  created_at timestamptz not null default now()
);
create index if not exists gifted_stars_family_idx on public.gifted_stars(family_id);

-- Drum song catalog + per-play log. New systems with their own tables
-- (ARCHITECTURE §4). Songs reference the drums activity by id ('a_drums')
-- via convention; we don't FK to activities because activities are still
-- in-memory app config. Star/streak truth is unaffected — this is
-- separate signal living alongside drum completions.
create table if not exists public.songs (
  id text primary key,
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null,
  artist text,
  difficulty text,
  created_at timestamptz not null default now()
);
create index if not exists songs_family_idx on public.songs(family_id);
create unique index if not exists songs_family_title_lower_idx
  on public.songs (family_id, lower(title), coalesce(lower(artist), ''));

-- Note: song_id is a plain text reference, not a FK, because the
-- "replace whole array per entity" sync pattern doesn't guarantee the
-- songs table is updated before song_plays. The app keeps the two
-- consistent (removeSong also wipes that song's plays).
create table if not exists public.song_plays (
  id text primary key,
  family_id uuid not null references public.families(id) on delete cascade,
  song_id text not null,
  played_on date not null default current_date,
  played_by text references public.profiles(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists song_plays_family_idx on public.song_plays(family_id);
create index if not exists song_plays_song_idx on public.song_plays(family_id, song_id);
create index if not exists song_plays_date_idx on public.song_plays(family_id, played_on);

-- =============================================================
-- 3. RLS — enable + force on every table
-- =============================================================
do $$
declare t text;
begin
  foreach t in array array[
    'tasks','rewards','completions','streaks','books','awards',
    'reward_requests','redemptions','gifted_stars','songs','song_plays'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force  row level security', t);
  end loop;
end$$;

-- =============================================================
-- 4. Policies — full CRUD scoped to caller's family
-- =============================================================

-- profiles: three policies, none of which inline a subquery against
-- public.profiles (every profiles-touching subquery is hidden behind
-- a SECURITY DEFINER function so RLS evaluation can't recurse).
--   * profiles_select_self    — a user can always see their own row
--                               (no function call, can't recurse)
--   * profiles_select_family  — a user can see other rows in their
--                               family via my_family_id()
--   * profiles_modify_parents — only parents can insert/update/delete
--                               profiles, via is_parent()
drop policy if exists "profiles_select_family"  on public.profiles;
drop policy if exists "profiles_select_self"    on public.profiles;
drop policy if exists "profiles_modify_parents" on public.profiles;

create policy "profiles_select_self"
  on public.profiles for select
  to authenticated
  using (auth_user_id = auth.uid());

create policy "profiles_select_family"
  on public.profiles for select
  to authenticated
  using (family_id = public.my_family_id());

create policy "profiles_modify_parents"
  on public.profiles for all
  to authenticated
  using      (public.is_parent() and family_id = public.my_family_id())
  with check (family_id = public.my_family_id());

-- families: members read their family.
drop policy if exists "families_select_my" on public.families;
create policy "families_select_my"
  on public.families for select
  to authenticated
  using (id = public.my_family_id());

-- Generic CRUD policies for every data table.
do $$
declare t text;
begin
  foreach t in array array[
    'tasks','rewards','completions','streaks','books','awards',
    'reward_requests','redemptions','gifted_stars','songs','song_plays'
  ] loop
    execute format('drop policy if exists "%1$s_rw_my_family" on public.%1$I', t);
    execute format($f$
      create policy "%1$s_rw_my_family"
        on public.%1$I
        for all
        to authenticated
        using      (family_id = public.my_family_id())
        with check (family_id = public.my_family_id())
    $f$, t);
  end loop;
end$$;

-- =============================================================
-- 5. Storage bucket + per-object RLS
-- =============================================================
--   * Bucket name: family-photos (private)
--   * File path convention: <family_id>/<rest...>
--   * Policies use storage.foldername(name)[1] = my_family_id()::text
--     so a member of family X can read/write only their own folder.
--
-- Buckets can be created via SQL, but if your Supabase project blocks
-- direct inserts into storage.buckets, create it in the dashboard
-- (Storage → New bucket → name=family-photos, public=off) and skip the
-- INSERT below. The policy block beneath is what enforces access.

insert into storage.buckets (id, name, public)
values ('family-photos', 'family-photos', false)
on conflict (id) do update set public = excluded.public;

drop policy if exists "family_photos_select" on storage.objects;
drop policy if exists "family_photos_insert" on storage.objects;
drop policy if exists "family_photos_update" on storage.objects;
drop policy if exists "family_photos_delete" on storage.objects;

create policy "family_photos_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'family-photos'
    and (storage.foldername(name))[1] = public.my_family_id()::text
  );

create policy "family_photos_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'family-photos'
    and (storage.foldername(name))[1] = public.my_family_id()::text
  );

create policy "family_photos_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'family-photos'
    and (storage.foldername(name))[1] = public.my_family_id()::text
  );

create policy "family_photos_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'family-photos'
    and (storage.foldername(name))[1] = public.my_family_id()::text
  );

-- =============================================================
-- 6. Seed data — Lynch family
-- =============================================================
-- Requirements baked in here:
--   - Mike (lyncho14@gmail.com) → parent, full admin
--   - Krissie (krissielynch@gmail.com) → parent, full admin
--   - Reznor → kid profile (no auth login)
--   - Drums streak: current=310, longest=310, since=2025-08-01, last_date=2026-06-06
--   - One drum completion today (all 3 sub-parts), status=approved, 10 stars
--   - kid_meta.star_bank_base=60 → bank = 60 + 10 (today's drums) = 70 ✓
--   - Everything else (other streaks, books, awards) intentionally empty
-- Mike/Krissie auth users MUST exist first (created via Dashboard →
-- Authentication → Users). The DO block links profiles to them by email.

do $$
declare
  v_fid uuid;
  v_mike_auth uuid := (select id from auth.users where lower(email) = 'lyncho14@gmail.com'    limit 1);
  v_kris_auth uuid := (select id from auth.users where lower(email) = 'krissielynch@gmail.com' limit 1);
begin
  -- 6a. Family row
  select id into v_fid from public.families where name = 'Lynch' limit 1;
  if v_fid is null then
    insert into public.families (name) values ('Lynch') returning id into v_fid;
  end if;

  -- 6b. Parents
  insert into public.profiles (id, family_id, auth_user_id, email, name, role, relationship, color, emoji, permissions)
  values ('u_mike', v_fid, v_mike_auth, 'lyncho14@gmail.com', 'Mike Lynch', 'parent', 'Dad', '#2563eb', '👨',
          jsonb_build_object('approveSimple', true, 'approveAll', true, 'viewReports', true))
  on conflict (id) do update set
    auth_user_id = coalesce(excluded.auth_user_id, public.profiles.auth_user_id),
    email = excluded.email,
    name = excluded.name,
    role = excluded.role,
    permissions = excluded.permissions;

  insert into public.profiles (id, family_id, auth_user_id, email, name, role, relationship, color, emoji, permissions)
  values ('u_krissie', v_fid, v_kris_auth, 'krissielynch@gmail.com', 'Krissie Lynch', 'parent', 'Mom', '#db2777', '👩',
          jsonb_build_object('approveSimple', true, 'approveAll', true, 'viewReports', true))
  on conflict (id) do update set
    auth_user_id = coalesce(excluded.auth_user_id, public.profiles.auth_user_id),
    email = excluded.email,
    name = excluded.name,
    role = excluded.role,
    permissions = excluded.permissions;

  -- 6c. Reznor (kid profile, no auth account)
  insert into public.profiles (id, family_id, name, role, relationship, color, emoji, is_child, kid_meta)
  values ('u_reznor', v_fid, 'Reznor', 'kid', 'Reznor', '#f59e0b', '🚀', true,
          jsonb_build_object(
            'grade', '1st (reading ahead)',
            'school', '—',
            'star_bank_base', 60,
            'next_reward', 'Movie Night',
            'next_reward_cost', 200,
            'big_reward', 'Universal Studios',
            'big_reward_cost', 500
          ))
  on conflict (id) do update set
    family_id = excluded.family_id,
    kid_meta = excluded.kid_meta,
    name = excluded.name;

  -- 6d. Drums streak — the only active streak today
  insert into public.streaks (family_id, activity_id, current, longest, since, last_date)
  values (v_fid, 'a_drums', 310, 310, date '2025-08-01', date '2026-06-06')
  on conflict (family_id, activity_id) do update set
    current = excluded.current,
    longest = excluded.longest,
    since = excluded.since,
    last_date = excluded.last_date;

  -- 6e. Today's drum completion — 3 parts done (melodics, drumeo, drumscribe), approved
  insert into public.completions
    (id, family_id, task_id, status, awarded_stars, pending_stars, completed_by, approved_by, notes, proof, extra, completion_date)
  values
    ('cmp_drums_20260606', v_fid, 't_drums', 'approved', 10, 0,
     'u_reznor', 'u_mike', '1hr+ practice — all 3 parts done',
     '[]'::jsonb,
     jsonb_build_object('subsDone', jsonb_build_array('melodics','drumeo','drumscribe')),
     date '2026-06-06')
  on conflict (id) do nothing;
end$$;

-- =============================================================
-- 7. Verify (run this and read the output)
-- =============================================================
-- Expect: rls_on = true, rls_forced = true on every row.
-- Note: pg_tables doesn't expose forcerowsecurity — it lives on
-- pg_class.relforcerowsecurity. Join + use that instead.
select c.relname              as tablename,
       c.relrowsecurity       as rls_on,
       c.relforcerowsecurity  as rls_forced
from   pg_class c
join   pg_namespace n on n.oid = c.relnamespace
where  n.nspname = 'public'
  and  c.relkind = 'r'
  and  c.relname in (
    'families','profiles','tasks','rewards','completions','streaks',
    'books','awards','reward_requests','redemptions','gifted_stars'
  )
order by c.relname;
