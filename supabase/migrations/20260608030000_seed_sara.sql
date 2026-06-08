-- Seed Sara (sara.a.lanave@gmail.com) as the Aunt / helper on the
-- Lynch family. Mirrors the canonical seed block in schema.sql.
-- Idempotent: on-conflict updates so re-running is safe.

do $$
declare
  v_fid uuid;
  v_sara_auth uuid := (select id from auth.users where lower(email) = 'sara.a.lanave@gmail.com' limit 1);
begin
  select id into v_fid from public.families where name = 'Lynch' limit 1;
  if v_fid is null then
    return;
  end if;

  insert into public.profiles (id, family_id, auth_user_id, email, name, role, relationship, color, emoji, permissions)
  values ('u_sara', v_fid, v_sara_auth, 'sara.a.lanave@gmail.com', 'Sara', 'helper', 'Aunt', '#0d9488', '🧡',
          jsonb_build_object('approveSimple', false, 'approveAll', false, 'viewReports', false))
  on conflict (id) do update set
    family_id = excluded.family_id,
    auth_user_id = coalesce(excluded.auth_user_id, public.profiles.auth_user_id),
    email = excluded.email,
    name = excluded.name,
    role = excluded.role,
    relationship = excluded.relationship,
    permissions = excluded.permissions;
end$$;
