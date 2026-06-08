-- Pending registrations + parent-approval flow.
--
-- Phase A let a parent type a teammate's email into the People UI. This
-- migration covers the other direction: the teammate self-registers
-- (email + password at the login screen), and a parent approves them
-- from inside the app — no Supabase Dashboard round-trip needed.
--
-- Model:
--   1. New signup → client RPC request_to_join(display_name) drops a
--      row in pending_registrations. The user lands on a "Waiting for
--      parent approval" screen.
--   2. Parents see the queue in More → Family & Helpers → Pending
--      requests. Approve creates the profile (role + relationship +
--      access window) and removes the queue row. Deny just removes
--      the queue row; the auth.users row stays (we can't delete it from
--      the client without a service role key — the user will simply hit
--      the waiting screen again if they sign in, with no profile).
--
-- Single-family v1: pending requests go to the only family that
-- exists. When/if multi-family lands, request_to_join takes a family
-- code, and the queue table already has family_id.

create table if not exists public.pending_registrations (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  family_id    uuid not null references public.families(id) on delete cascade,
  email        text not null,
  display_name text,
  requested_at timestamptz not null default now()
);

create index if not exists pending_registrations_family_idx
  on public.pending_registrations(family_id);

alter table public.pending_registrations enable row level security;
alter table public.pending_registrations force  row level security;

-- The requester can see + delete their own row (so a re-signup retries
-- cleanly). Parents in the target family can see + delete any row.
drop policy if exists "pending_select_self"    on public.pending_registrations;
drop policy if exists "pending_select_parents" on public.pending_registrations;
drop policy if exists "pending_delete_self"    on public.pending_registrations;
drop policy if exists "pending_delete_parents" on public.pending_registrations;

create policy "pending_select_self"
  on public.pending_registrations for select to authenticated
  using (auth_user_id = auth.uid());

create policy "pending_select_parents"
  on public.pending_registrations for select to authenticated
  using (public.is_parent() and family_id = public.my_family_id());

create policy "pending_delete_self"
  on public.pending_registrations for delete to authenticated
  using (auth_user_id = auth.uid());

create policy "pending_delete_parents"
  on public.pending_registrations for delete to authenticated
  using (public.is_parent() and family_id = public.my_family_id());

-- Note: no INSERT policy. Inserts only happen via request_to_join()
-- (SECURITY DEFINER), so direct writes are not allowed.

-- request_to_join(): the new signup calls this once after signUp().
-- - No-ops if the user already has a profile (e.g. parent pre-attached
--   email and claim_profile_by_email() ran first).
-- - No-ops if a profile already has this email pending claim (next
--   load will auto-link via claim_profile_by_email).
-- - Otherwise enqueues onto the single family's pending queue.
create or replace function public.request_to_join(p_display_name text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_email text;
  v_fid   uuid;
begin
  if v_uid is null then return; end if;
  if exists (select 1 from public.profiles where auth_user_id = v_uid) then return; end if;

  select lower(email) into v_email from auth.users where id = v_uid;
  if v_email is null then return; end if;

  -- Parent pre-attached this email — auto-link will handle it.
  if exists (
    select 1 from public.profiles
     where lower(email) = v_email and auth_user_id is null
  ) then
    return;
  end if;

  select id into v_fid from public.families order by created_at asc limit 1;
  if v_fid is null then return; end if;

  insert into public.pending_registrations (auth_user_id, family_id, email, display_name)
  values (v_uid, v_fid, v_email, p_display_name)
  on conflict (auth_user_id) do update set
    display_name = coalesce(excluded.display_name, public.pending_registrations.display_name),
    requested_at = now();
end;
$$;
revoke all on function public.request_to_join(text) from public;
grant execute on function public.request_to_join(text) to authenticated;

-- approve_registration(): parent action. Creates the profile, links
-- auth_user_id, removes the pending row. Returns the new profile id.
create or replace function public.approve_registration(
  p_auth_user_id  uuid,
  p_name          text,
  p_role          text,
  p_relationship  text,
  p_access_type   text default 'permanent',
  p_access_expires date default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fid   uuid;
  v_email text;
  v_pid   text;
  v_color text;
begin
  if not public.is_parent() then
    raise exception 'only parents can approve registrations';
  end if;
  v_fid := public.my_family_id();
  if v_fid is null then
    raise exception 'caller has no family';
  end if;
  if p_role not in ('parent','grandparent','helper','guest') then
    raise exception 'invalid role: %', p_role;
  end if;
  if p_access_type not in ('permanent','temporary') then
    raise exception 'invalid access_type: %', p_access_type;
  end if;

  select email into v_email from public.pending_registrations
   where auth_user_id = p_auth_user_id and family_id = v_fid;
  if v_email is null then
    raise exception 'no pending registration for that user in your family';
  end if;

  v_color := case p_role
    when 'parent'      then '#2563eb'
    when 'grandparent' then '#7c3aed'
    when 'helper'      then '#0d9488'
    when 'guest'       then '#64748b'
    else '#64748b' end;

  -- Stable, deterministic profile id from the auth uuid.
  v_pid := 'u_' || replace(p_auth_user_id::text, '-', '');

  insert into public.profiles (
    id, family_id, auth_user_id, email, name, role, relationship,
    color, emoji, permissions, access_type, access_expires
  )
  values (
    v_pid, v_fid, p_auth_user_id, v_email, p_name, p_role,
    coalesce(p_relationship, initcap(p_role)),
    v_color, '🙂',
    jsonb_build_object(
      'approveSimple', false,
      'approveAll',    p_role = 'parent',
      'viewReports',   p_role <> 'guest'
    ),
    p_access_type, p_access_expires
  );

  delete from public.pending_registrations where auth_user_id = p_auth_user_id;
  return v_pid;
end;
$$;
revoke all on function public.approve_registration(uuid, text, text, text, text, date) from public;
grant execute on function public.approve_registration(uuid, text, text, text, text, date) to authenticated;

-- deny_registration(): parent removes the queue row. The auth.users
-- row remains (can't be deleted without service role); the would-be
-- joiner will land on the waiting screen again on next sign-in.
create or replace function public.deny_registration(p_auth_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_parent() then
    raise exception 'only parents can deny registrations';
  end if;
  delete from public.pending_registrations
   where auth_user_id = p_auth_user_id
     and family_id = public.my_family_id();
end;
$$;
revoke all on function public.deny_registration(uuid) from public;
grant execute on function public.deny_registration(uuid) to authenticated;
