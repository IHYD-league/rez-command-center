-- Mirror the Tuesday 2:30 PM drum class onto the a_drums activity's
-- schedule so it shows up in BOTH the new tap-day calendar AND the
-- legacy "Reznor's week" weekday list at the bottom of the Calendar
-- page. The class was already in the events table via the earlier
-- 20260615073500_seed_lynch_drum_class.sql migration, but that
-- legacy view reads only from activities.schedule.
--
-- Idempotent: only writes when the existing schedule doesn't already
-- include a Tuesday entry. Doesn't clobber a parent who's typed a
-- different time.

do $$
declare
  v_fid uuid;
  v_existing jsonb;
begin
  select id into v_fid from public.families order by created_at asc limit 1;
  if v_fid is null then return; end if;

  select schedule into v_existing from public.activities
   where family_id = v_fid and id = 'a_drums';
  if v_existing is null then return; end if;

  -- If schedule already mentions Tuesday in any slot, leave it alone.
  if jsonb_path_exists(v_existing, '$ ? (@.day == "Tuesday")') then
    return;
  end if;

  update public.activities
     set schedule = coalesce(v_existing, '[]'::jsonb) ||
                    jsonb_build_array(jsonb_build_object('day', 'Tuesday', 'time', '2:30 PM'))
   where family_id = v_fid and id = 'a_drums';
end $$;
