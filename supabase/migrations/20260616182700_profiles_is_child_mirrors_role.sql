-- Production incident 2026-06-16 (Xander's mom + Maddox's mom):
-- Newly-onboarded families could not submit their kid's completions.
-- Actor guard (enforce_actor_identity) requires submitted_by to be
-- either (a) the auth user themselves, or (b) a profile with
-- is_child = true. For Lynch, Reznor was hand-seeded with
-- is_child = true and that's why Krissie's parent-submits-for-kid
-- flow works without is_admin.
--
-- But OnboardingWizard (src/App.jsx onCreateKid) only set role = 'kid'
-- and never set is_child. toDb.profile defaults missing fields to
-- false. So every kid created by a new family lands with is_child =
-- false, and the actor guard blocks their parents on every completion.
-- Observed: Magnetta (Maddox) and Nault (Xander) both stuck.
--
-- ROOT-CAUSE FIX: a trigger that pins is_child to (role = 'kid') on
-- every insert/update of profiles. The two columns can no longer
-- desync regardless of what the client sends — future onboarding
-- flows that forget the flag still produce correct rows, and any
-- attempt to flip is_child away from the role gets snapped back.
--
-- BACKFILL: heal every existing role='kid' profile in one statement.
-- Idempotent. After this runs, Maddox and Xander pass the guard and
-- their parents can submit completions normally.
--
-- ROLLBACK:
--   drop trigger profiles_is_child_sync on public.profiles;
--   drop function public.sync_profile_is_child();
--   (no data rollback — flipping is_child back to false would re-
--    break the affected families.)

create or replace function public.sync_profile_is_child()
returns trigger
language plpgsql
as $$
begin
  new.is_child := (new.role = 'kid');
  return new;
end;
$$;

drop trigger if exists profiles_is_child_sync on public.profiles;
create trigger profiles_is_child_sync
  before insert or update of role, is_child on public.profiles
  for each row
  execute function public.sync_profile_is_child();

-- Heal existing rows. Trigger fires on the UPDATE and pins is_child.
update public.profiles
   set is_child = (role = 'kid')
 where is_child is distinct from (role = 'kid');
