-- Gate "New family" signup behind an invite code so the URL can be
-- shared in texts/links without anyone-who-finds-it instantly creating
-- a family on your Supabase tier.
--
-- The code lives in a singleton public.app_settings row. SECURITY DEFINER
-- create_family reads it; clients never query the table directly (RLS
-- forbids it). Mike rotates the code via the Supabase SQL editor.
--
-- Operational rollout (matters — see CLAUDE.md "schema + code lockstep"):
--   1. Apply this migration
--   2. update public.app_settings set new_family_invite_code = '<YOUR CODE>';
--      (until you do, signups are paused — null/empty = blocked)
--   3. Deploy the new client (Login.jsx ships the invite code field)
--   4. Text invitees the code along with the URL
--
-- Rollback:
--   drop function public.create_family(text, text, text);
--   create or replace function public.create_family(p_parent_name text, p_family_name text default null) ... -- restore the 2-arg form from migrations/20260614200000_create_family_rpc.sql
--   drop table public.app_settings;

create table if not exists public.app_settings (
  id smallint primary key default 1,
  new_family_invite_code text,
  constraint app_settings_singleton check (id = 1)
);

-- Seed the singleton row. Code starts NULL — signups are paused until
-- Mike runs an UPDATE to set one. Safe-by-default: no one can sign up
-- without an explicit action from the owner.
insert into public.app_settings (id, new_family_invite_code)
  values (1, null)
  on conflict (id) do nothing;

-- The only reader of this table is the SECURITY DEFINER RPC below, which
-- bypasses RLS. Clients have no path to it.
alter table public.app_settings enable row level security;

-- Drop the old 2-arg create_family so any stale cached client gets an
-- explicit "function does not exist" error instead of bypassing the gate.
drop function if exists public.create_family(text, text);

create or replace function public.create_family(
  p_parent_name text,
  p_family_name text default null,
  p_invite_code text default null
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
  v_required_code text;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if p_parent_name is null or trim(p_parent_name) = '' then
    raise exception 'parent name required';
  end if;

  -- Idempotency: a caller who already has a profile gets that family id
  -- back, no second family. Keeps double-tap + retry safe.
  select family_id into v_existing_fid
    from public.profiles
   where auth_user_id = v_uid
   limit 1;
  if v_existing_fid is not null then
    return v_existing_fid;
  end if;

  -- Invite-code gate. Null/empty code in app_settings = signups paused.
  select new_family_invite_code into v_required_code
    from public.app_settings
   where id = 1;
  if v_required_code is null or trim(v_required_code) = '' then
    raise exception 'new family signups are paused — please contact the app owner';
  end if;
  if p_invite_code is null
     or upper(trim(p_invite_code)) <> upper(trim(v_required_code)) then
    raise exception 'invalid invite code';
  end if;

  select lower(email) into v_email from auth.users where id = v_uid;
  v_family_name := coalesce(nullif(trim(p_family_name), ''),
                            trim(p_parent_name) || '''s family');

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

  -- They are no longer waiting for approval — they ARE the founding parent.
  delete from public.pending_registrations where auth_user_id = v_uid;

  return v_fid;
end;
$$;

revoke all on function public.create_family(text, text, text) from public;
grant execute on function public.create_family(text, text, text) to authenticated;
