-- profiles.grade column + Lynch's learning-goals one-off migration.
--
-- Mike flagged 2026-06-14 that the Skills page was rendering hardcoded
-- Reznor-specific text ("Above grade level — keep stretching with
-- chapter books"). Two fixes:
--
-- 1. Add a `grade` column to profiles so the OnboardingWizard can
--    capture each kid's grade level (K, 1st-12th, free text) and the
--    People page can let parents edit it later. Default NULL keeps
--    existing kid profiles unaffected.
--
-- 2. Move the hardcoded Skills `areas` array into per-family
--    familySettings.learningGoals jsonb. Lynch family gets a one-off
--    backfill of the exact 5 areas Mike has been seeing so he never
--    loses that content (per the never-lose-data memory rule).
--    Other families get empty by default — they fill it in via the
--    Skills page UI, or seed it with a "Suggested starter goals"
--    picker. The deep audit's "Reznor-specific things in code" gap
--    finally gets closed for this surface.
--
-- Idempotent: column add uses `if not exists`. jsonb merge only sets
-- `learningGoals` when the key is currently absent.

alter table public.profiles
  add column if not exists grade text;

comment on column public.profiles.grade is
  'Kid grade level — free text (K, 1st, 2nd, ..., 12th, or other). NULL for non-kids and un-set kids.';

-- One-off Lynch backfill. Targets the family with the oldest
-- created_at (the only family on prod as of 2026-06-14). Wrapped in a
-- DO block so we can no-op cleanly if no families exist yet OR the
-- `learningGoals` key was already set (an admin already edited).
do $$
declare
  v_fid uuid;
  v_settings jsonb;
begin
  select id into v_fid from public.families order by created_at asc limit 1;
  if v_fid is null then return; end if;

  -- Ensure a family_settings row exists.
  insert into public.family_settings (family_id, settings)
       values (v_fid, '{}'::jsonb)
  on conflict (family_id) do nothing;

  select settings into v_settings from public.family_settings where family_id = v_fid;
  if v_settings ? 'learningGoals' then
    -- Admin already set them; do not clobber.
    return;
  end if;

  update public.family_settings
     set settings = settings || jsonb_build_object(
       'learningGoals',
       jsonb_build_array(
         jsonb_build_object('area', 'English reading',
                            'note', 'Above grade level — keep stretching with chapter books.'),
         jsonb_build_object('area', 'Spanish reading/speaking',
                            'note', 'Reading solo; build to 5 full spoken sentences/day.'),
         jsonb_build_object('area', 'Writing',
                            'note', 'Daily handwriting + 1 creative piece/week.'),
         jsonb_build_object('area', 'Math',
                            'note', 'On grade — keep consistent.'),
         jsonb_build_object('area', 'Music / drums',
                            'note', '1hr daily, Drumeo + Melodics fundamentals.')
       )
     ),
     updated_at = now()
   where family_id = v_fid;
end $$;
