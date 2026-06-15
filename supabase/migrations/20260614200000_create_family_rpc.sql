-- create_family(p_parent_name, p_family_name) — Phase 2 multi-family entry.
--
-- The signup flow today queues every new auth user into the OLDEST family
-- (Lynch) via request_to_join. That blocks any second family from existing.
-- This RPC is the alternate path: a brand-new auth user picks
-- "Start a new family" in Login.jsx and we call this instead. It creates
-- a families row, makes the caller the founding parent, and clears any
-- stale pending_registrations row pointing them at Lynch.
--
-- Safety:
--   * SECURITY DEFINER so the new families/profiles rows can be inserted
--     without the RLS gauntlet; we still check auth.uid() ourselves.
--   * Idempotent on accidental double-tap: if the caller already has a
--     profile (any family), we return that profile's family_id and skip
--     the inserts. No duplicate families.
--   * Never touches existing families' data. Pure additive.
--   * Rollback: drop function public.create_family(text, text);

create or replace function public.create_family(
  p_parent_name text,
  p_family_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_existing_fid uuid;
  v_fid uuid;
  v_pid text;
  v_family_name text;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if p_parent_name is null or trim(p_parent_name) = '' then
    raise exception 'parent name required';
  end if;

  -- Idempotency: if this auth user already has a profile, return that
  -- family id and skip. Protects against a double-tap or a retry on the
  -- client. We never create a second family for the same auth user.
  select family_id into v_existing_fid
    from public.profiles
   where auth_user_id = v_uid
   limit 1;
  if v_existing_fid is not null then
    return v_existing_fid;
  end if;

  select lower(email) into v_email from auth.users where id = v_uid;
  v_family_name := coalesce(nullif(trim(p_family_name), ''), trim(p_parent_name) || '''s family');

  insert into public.families (name)
       values (v_family_name)
    returning id into v_fid;

  v_pid := 'u_' || replace(v_uid::text, '-', '');
  insert into public.profiles (
    id, family_id, auth_user_id, email, name, role, relationship,
    color, emoji, permissions, access_type, access_expires
  )
  values (
    v_pid, v_fid, v_uid, v_email, trim(p_parent_name), 'parent', 'Parent',
    '#2563eb', '🙂',
    jsonb_build_object(
      'approveSimple', true,
      'approveAll',    true,
      'viewReports',   true
    ),
    'permanent', null
  );

  -- Clear any pending_registrations the user picked up by signing up
  -- before this RPC fired. They are no longer waiting for approval —
  -- they ARE the parent of their new family.
  delete from public.pending_registrations where auth_user_id = v_uid;

  return v_fid;
end;
$$;
revoke all on function public.create_family(text, text) from public;
grant execute on function public.create_family(text, text) to authenticated;
