-- Grandparent / read-only share link for a single kid.
--
-- OurFamilyWizard's #1 selling point per the AAA research: invite
-- grandparents (or therapists, coaches, anyone you trust to cheer)
-- without making them sign up. They tap a link, they see the kid's
-- progress in a friendly read-only view, they don't see anything
-- else about the family.
--
-- Token = UUID stored on the kid's profile. Auto-regenerable, fully
-- revocable. Three RPCs (all SECURITY DEFINER):
--
--   generate_kid_view_token(p_kid_id) → uuid
--     Parent-only. Rotates the token (or sets one if NULL).
--   revoke_kid_view_token(p_kid_id)   → void
--     Parent-only. Sets the token back to NULL so the link dies.
--   get_shared_kid_view(p_token)      → json
--     Callable by ANYONE (anon role gets EXECUTE). Validates the
--     token, returns a privacy-curated bundle for the public view.
--     Other family members are NOT exposed; only this one kid.

alter table public.profiles
  add column if not exists view_token uuid;

create unique index if not exists profiles_view_token_idx
  on public.profiles(view_token)
  where view_token is not null;

create or replace function public.generate_kid_view_token(p_kid_id text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fid uuid := public.my_family_id();
  v_kid_family uuid;
  v_kid_role text;
  v_token uuid;
begin
  if not public.is_parent() then raise exception 'only parents can mint view tokens'; end if;
  if v_fid is null then raise exception 'no family'; end if;
  select family_id, role into v_kid_family, v_kid_role
    from public.profiles where id = p_kid_id;
  if v_kid_family is null then raise exception 'kid not found'; end if;
  if v_kid_family <> v_fid then raise exception 'kid not in your family'; end if;
  if v_kid_role <> 'kid' then raise exception 'share links are for kid profiles'; end if;
  v_token := gen_random_uuid();
  update public.profiles set view_token = v_token where id = p_kid_id;
  return v_token;
end;
$$;
revoke all on function public.generate_kid_view_token(text) from public;
grant execute on function public.generate_kid_view_token(text) to authenticated;

create or replace function public.revoke_kid_view_token(p_kid_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fid uuid := public.my_family_id();
  v_kid_family uuid;
begin
  if not public.is_parent() then raise exception 'only parents can revoke view tokens'; end if;
  if v_fid is null then raise exception 'no family'; end if;
  select family_id into v_kid_family from public.profiles where id = p_kid_id;
  if v_kid_family is null then raise exception 'kid not found'; end if;
  if v_kid_family <> v_fid then raise exception 'kid not in your family'; end if;
  update public.profiles set view_token = null where id = p_kid_id;
end;
$$;
revoke all on function public.revoke_kid_view_token(text) from public;
grant execute on function public.revoke_kid_view_token(text) to authenticated;

-- The shared read RPC — callable by anon so grandma doesn't need an
-- account. Returns a privacy-curated bundle: kid name + avatar,
-- current streaks (activity name + day count), this week's earned
-- stars, last 10 approved completions (task title + date). No other
-- family members, no rewards economy, no addresses, no pending /
-- declined items, no email.
create or replace function public.get_shared_kid_view(p_token uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kid record;
  v_streaks json;
  v_wins   json;
  v_week_stars int;
begin
  if p_token is null then return null; end if;
  select id, family_id, name, emoji, color, grade
    into v_kid
    from public.profiles
   where view_token = p_token
     and role = 'kid'
   limit 1;
  if v_kid.id is null then return null; end if;

  select coalesce(json_agg(json_build_object(
    'activityId', s.activity_id,
    'activityName', a.name,
    'activityColor', a.color,
    'current', s.current,
    'best', s.best
  ) order by s.current desc), '[]'::json)
    into v_streaks
    from public.streaks s
    left join public.activities a on a.id = s.activity_id and a.family_id = v_kid.family_id
   where s.family_id = v_kid.family_id
     and s.profile_id = v_kid.id
     and s.current > 0;

  select coalesce(sum(c.awarded_stars), 0)::int into v_week_stars
    from public.completions c
   where c.family_id = v_kid.family_id
     and c.completed_by = v_kid.id
     and c.status = 'approved'
     and c.completion_date >= (current_date - 7);

  select coalesce(json_agg(json_build_object(
    'title', t.title,
    'date', c.completion_date,
    'stars', c.awarded_stars
  ) order by c.completion_date desc), '[]'::json)
    into v_wins
    from (
      select c.task_id, c.completion_date, c.awarded_stars
        from public.completions c
       where c.family_id = v_kid.family_id
         and c.completed_by = v_kid.id
         and c.status = 'approved'
       order by c.completion_date desc
       limit 10
    ) c
    join public.tasks t on t.id = c.task_id and t.family_id = v_kid.family_id;

  return json_build_object(
    'kid', json_build_object('name', v_kid.name, 'emoji', v_kid.emoji, 'color', v_kid.color, 'grade', v_kid.grade),
    'streaks', v_streaks,
    'weekStars', v_week_stars,
    'recentWins', v_wins
  );
end;
$$;
revoke all on function public.get_shared_kid_view(uuid) from public;
grant execute on function public.get_shared_kid_view(uuid) to authenticated;
grant execute on function public.get_shared_kid_view(uuid) to anon;
