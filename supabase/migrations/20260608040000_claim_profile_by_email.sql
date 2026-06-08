-- claim_profile_by_email(): the bridge that makes "parent attaches an
-- email in the app" actually let that person sign in.
--
-- Flow:
--   1. Parent enters Sara's email on her profile row → profile.email is
--      set, auth_user_id still NULL.
--   2. Sara signs up / signs in via Supabase Auth with that email → a
--      row lands in auth.users but the profile is still unlinked.
--   3. The frontend calls this RPC on first load. It runs as definer,
--      finds the matching profile by lowered email, and stamps
--      auth_user_id = auth.uid(). After that the existing my_family_id()
--      / RLS path resolves and DataProvider loads the family normally.
--
-- Safe properties:
--   - Only updates rows where auth_user_id IS NULL — never re-points an
--     existing link, so a parent typo can't hijack an already-claimed
--     profile.
--   - Matches by lowered email against auth.users (the canonical source
--     of the caller's email), not by a client-supplied value.

create or replace function public.claim_profile_by_email()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_pid text;
begin
  if v_uid is null then
    return null;
  end if;

  select lower(email) into v_email from auth.users where id = v_uid;
  if v_email is null then
    return null;
  end if;

  update public.profiles
     set auth_user_id = v_uid
   where lower(email) = v_email
     and auth_user_id is null
   returning id into v_pid;

  return v_pid;
end;
$$;

revoke all on function public.claim_profile_by_email() from public;
grant execute on function public.claim_profile_by_email() to authenticated;
