-- Fix get_shared_kid_view: my prior migration referenced
-- streaks.best (column is named "longest") and streaks.profile_id
-- (doesn't exist — streaks are family-scoped per activity, not
-- per-kid). Mike caught the runtime error
-- "column s.best does not exist" the moment the share link tried
-- to load. Replacing the function with the corrected query; no
-- column / RLS / grant changes.

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
    'best', s.longest
  ) order by s.current desc), '[]'::json)
    into v_streaks
    from public.streaks s
    left join public.activities a
      on a.id = s.activity_id and a.family_id = v_kid.family_id
   where s.family_id = v_kid.family_id
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
