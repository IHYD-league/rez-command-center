-- Allow kid role in approve_registration + auto-link pre-staged profiles
-- by email on sign-up.
--
-- Phase 1 of multi-user-in-one-family work. Two changes to two RPCs:
--
-- 1. approve_registration: today the role allowlist rejects 'kid'.
--    Mike needs to add Reznor's friend as a kid via the People page;
--    that flow hits this RPC after the friend signs up. Adding 'kid'
--    to the allowlist + a sensible color for the new profile.
--
-- 2. request_to_join: today, if a parent pre-stages a profile with an
--    email and no auth_user_id (the standard Sara / friend-kid setup),
--    a sign-up with that email silently returns from this RPC without
--    creating a pending request OR linking the auth user to the
--    profile. The friend ends up with an orphan auth account — they
--    can sign in but the app has no profile to show them.
--
--    Fix: when an unlinked profile exists with the signing-up user's
--    email, set auth_user_id on it and return. The friend lands
--    logged in to their pre-staged profile, no admin approval round
--    trip. Parents who add an email to a profile are implicitly
--    pre-approving that person.
--
-- Both functions are SECURITY DEFINER and use `create or replace`, so
-- this migration is fully reversible by re-deploying the prior body.

create or replace function public.request_to_join(p_display_name text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_fid uuid;
  v_pre_pid text;
begin
  if v_uid is null then return; end if;
  -- Already has a profile? Nothing to do.
  if exists (select 1 from public.profiles where auth_user_id = v_uid) then return; end if;
  select lower(email) into v_email from auth.users where id = v_uid;
  if v_email is null then return; end if;

  -- Auto-link: a parent pre-staged a profile with this email but no
  -- auth_user_id. Treat the parent's pre-stage as the approval and
  -- link this sign-up to that profile. No pending row needed.
  select id into v_pre_pid
    from public.profiles
   where lower(email) = v_email and auth_user_id is null
   limit 1;
  if v_pre_pid is not null then
    update public.profiles
       set auth_user_id = v_uid
     where id = v_pre_pid;
    return;
  end if;

  -- Else fall through to the normal pending-registration flow:
  -- attach the auth user to the oldest family and queue for approval.
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
  v_fid uuid; v_email text; v_pid text; v_color text;
begin
  if not public.is_parent() then raise exception 'only parents can approve registrations'; end if;
  v_fid := public.my_family_id();
  if v_fid is null then raise exception 'caller has no family'; end if;
  -- 'kid' now permitted — Phase 1 of letting parents add a kid friend
  -- alongside their own kid.
  if p_role not in ('parent','grandparent','helper','guest','kid') then
    raise exception 'invalid role: %', p_role;
  end if;
  if p_access_type not in ('permanent','temporary') then
    raise exception 'invalid access_type: %', p_access_type;
  end if;
  select email into v_email from public.pending_registrations
   where auth_user_id = p_auth_user_id and family_id = v_fid;
  if v_email is null then raise exception 'no pending registration for that user in your family'; end if;
  v_color := case p_role
    when 'parent'      then '#2563eb'
    when 'grandparent' then '#7c3aed'
    when 'helper'      then '#0d9488'
    when 'guest'       then '#64748b'
    when 'kid'         then '#f59e0b'
    else '#64748b' end;
  v_pid := 'u_' || replace(p_auth_user_id::text, '-', '');
  insert into public.profiles (
    id, family_id, auth_user_id, email, name, role, relationship,
    color, emoji, permissions, access_type, access_expires
  )
  values (
    v_pid, v_fid, p_auth_user_id, v_email, p_name, p_role,
    coalesce(p_relationship, initcap(p_role)),
    v_color, case when p_role = 'kid' then '🧒' else '🙂' end,
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
