-- One-off Lynch seed: Reznor's Tuesday 2:30 PM drum class as a recurring
-- weekly event. Mike caught on 2026-06-15 that it never lived in the
-- calendar — the daily drums activity has empty schedule. Add it as
-- an event with recur_weekday=2 (Tuesday) and event_time="14:30" so
-- it shows up every Tuesday going forward and can be edited via the
-- new tap-day-to-edit UX.
--
-- Idempotent: targeted INSERT with ON CONFLICT DO NOTHING on the
-- deterministic id. No-op for other families (id keyed to oldest
-- family's family_id).

do $$
declare
  v_fid uuid;
begin
  select id into v_fid from public.families order by created_at asc limit 1;
  if v_fid is null then return; end if;

  insert into public.events (id, family_id, title, event_date, event_time, recur_weekday, category, notes)
       values ('ev_drum_class_lynch', v_fid, 'Drum class', null, '14:30', 2, 'Activity', null)
  on conflict (id) do nothing;
end $$;
