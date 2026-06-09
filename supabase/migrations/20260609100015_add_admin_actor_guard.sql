-- Admin actor guard: who can "act as" whom.
--
-- BEFORE this migration:
--   - Any signed-in family member could pick any profile from LoginScreen
--   - Acting as a parent profile granted the auto-approve shortcut
--     (activeIsParent === true triggers in submitTask)
--   - DB only gated by family_id; submitted_by / approved_by were
--     client-supplied audit fields with no server-side check
--
-- AFTER:
--   - profiles.is_admin column (Mike = true, everyone else = false)
--   - my_profile_id() + is_admin() SECURITY DEFINER helpers, same
--     pattern as my_family_id() and is_parent()
--   - Trigger on completions enforces the actor-identity rule for
--     submitted_by / approved_by:
--
--       submitted_by  must be one of:
--         NULL  ·  my_profile_id()  ·  a kid in my family
--         (or anyone, if the auth user is_admin)
--
--       approved_by   must be one of:
--         NULL  ·  my_profile_id()
--         (or anyone, if the auth user is_admin)
--
-- A stale client bundle that ignores the LoginScreen filter and tries
-- to write submitted_by = u_mike from Sara's auth session gets rejected
-- at the DB. Mike (admin) can still test every role.
--
-- Star economy untouched: protect_completion_stars_trg and the
-- decide(completionId) refactor on main are not affected. This trigger
-- runs BEFORE that one and only checks two text columns.

-- 1) profiles.is_admin column
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- 2) Promote Mike
update public.profiles set is_admin = true where id = 'u_mike';

-- 3) Helper: my_profile_id() — auth.uid() → profile id (text). NULL if
--    the auth user has no profile yet (e.g., self-registered, pending).
create or replace function public.my_profile_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select id
    from public.profiles
   where auth_user_id = auth.uid()
   limit 1
$$;

-- 4) Helper: is_admin() — auth.uid() → boolean. Defaults to false when
--    there's no profile match.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(is_admin, false)
    from public.profiles
   where auth_user_id = auth.uid()
   limit 1
$$;

-- 5) Trigger function: enforce actor identity on completions writes.
create or replace function public.enforce_actor_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  my_pid   text;
  am_admin boolean;
  is_kid   boolean;
begin
  my_pid   := public.my_profile_id();
  am_admin := public.is_admin();

  -- Admin override: short-circuit. Mike (or any future admin) can
  -- write any actor identity for testing and troubleshooting.
  if am_admin then
    return new;
  end if;

  -- submitted_by check
  if new.submitted_by is not null
     and new.submitted_by is distinct from my_pid then
    select coalesce(is_child, false) into is_kid
      from public.profiles
     where id = new.submitted_by
       and family_id = public.my_family_id()
     limit 1;
    if not coalesce(is_kid, false) then
      raise exception
        'actor guard: submitted_by % is not the auth user (%), not a kid in this family, and the auth user is not admin',
        new.submitted_by, my_pid
        using errcode = '42501';
    end if;
  end if;

  -- approved_by check (kids do not approve)
  if new.approved_by is not null
     and new.approved_by is distinct from my_pid then
    raise exception
      'actor guard: approved_by % is not the auth user (%) and the auth user is not admin',
      new.approved_by, my_pid
      using errcode = '42501';
  end if;

  return new;
end;
$$;

-- 6) Wire trigger BEFORE INSERT + BEFORE UPDATE on completions. Order
--    relative to protect_completion_stars_trg doesn't matter since
--    they touch disjoint columns (submitted_by/approved_by here,
--    awarded_stars there).
drop trigger if exists enforce_actor_identity_trg on public.completions;
create trigger enforce_actor_identity_trg
  before insert or update on public.completions
  for each row
  execute function public.enforce_actor_identity();

comment on function public.enforce_actor_identity() is
  'Rejects writes where the client tried to forge submitted_by / '
  'approved_by as a profile the auth user is not allowed to act as. '
  'Admins bypass the gate.';
comment on function public.is_admin() is
  'True iff the auth user has profiles.is_admin = true.';
comment on function public.my_profile_id() is
  'The auth user''s profile id (text). NULL when no profile yet.';
