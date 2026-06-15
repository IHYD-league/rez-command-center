-- Activities live in Supabase per-family.
--
-- Until now `activities` was hardcoded `useState(SEED_ACTIVITIES)` in
-- App.jsx — the Burbank Music Academy + Rose Bowl Aquatics catalog
-- showed up for every family, no matter who they were. Per the
-- total-control memory rule: each family owns their own list, editable
-- via Manage Activities. Brand-new families start empty + opt into a
-- preset pack ("Sports", "Music", "Martial Arts") via the picker.
--
-- Lynch's existing 13 activities migrate via the one-off backfill at
-- the bottom of this file so Mike opens the app and sees his exact
-- list ready to edit. Per the never-lose-data memory rule.

create table if not exists public.activities (
  id text primary key,
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null,
  short_name text,
  color text,
  pillar text,                                   -- body | brain | soul
  status text not null default 'active',         -- active | break | archived | seasonal
  note text,
  address text,
  schedule jsonb not null default '[]'::jsonb,   -- [{ day, time }]
  weekly_schedule boolean not null default false,
  weekly_target integer,
  created_at timestamptz not null default now()
);
create index if not exists activities_family_idx on public.activities(family_id);

alter table public.activities enable row level security;
alter table public.activities force row level security;

drop policy if exists activities_read on public.activities;
create policy activities_read on public.activities
  for select using (family_id = public.my_family_id());

drop policy if exists activities_write on public.activities;
create policy activities_write on public.activities
  for all using (family_id = public.my_family_id())
        with check (family_id = public.my_family_id());

-- Lynch one-off backfill. Targets the oldest family (the only one on
-- prod 2026-06-14). Idempotent: each row is inserted with `on conflict
-- (id) do nothing` so re-running is safe.
do $$
declare
  v_fid uuid;
begin
  select id into v_fid from public.families order by created_at asc limit 1;
  if v_fid is null then return; end if;

  insert into public.activities (id, family_id, name, short_name, color, pillar, status, note, address, schedule, weekly_schedule, weekly_target) values
    ('a_drums',   v_fid, 'Drums',                        'Drums',  '#7c3aed', 'soul', 'active',   '1hr+ daily — Drumeo + Melodics + free play', null, '[]'::jsonb, false, null),
    ('a_eng',     v_fid, 'English reading',              'Eng',    '#3b82f6', 'brain','active',   '20+ min daily, chapter books', null, '[]'::jsonb, false, null),
    ('a_spa',     v_fid, 'Spanish',                      'Spa',    '#ec4899', 'brain','active',   'Reading + Duolingo + spoken sentences', null, '[]'::jsonb, false, null),
    ('a_write',   v_fid, 'Writing',                      'Write',  '#8b5cf6', 'brain','active',   'Handwriting + a creative piece weekly', null, '[]'::jsonb, false, null),
    ('a_math',    v_fid, 'Math',                         'Math',   '#10b981', 'brain','active',   'Workbook + practice', null, '[]'::jsonb, false, null),
    ('a_art',     v_fid, 'Art',                          'Art',    '#f59e0b', 'soul', 'active',   'Drawing, painting, building', null, '[]'::jsonb, false, null),
    ('a_field',   v_fid, 'Field Trips',                  'Trip',   '#0ea5e9', 'brain','seasonal', 'Activate when there''s actually a trip on the calendar', null, '[]'::jsonb, false, null),
    ('a_chores',  v_fid, 'Chores',                       'Chores', '#64748b', 'body', 'active',   '', null, '[]'::jsonb, false, null),
    ('a_swim',    v_fid, 'Swim (Rose Bowl Aquatics)',    'Swim',   '#0891b2', 'body', 'active',   'Off in August — use Jim Herrick lessons instead', 'Rose Bowl Aquatics, 360 N Arroyo Blvd, Pasadena, CA 91103',
        jsonb_build_array(
          jsonb_build_object('day','Tuesday','time','5:00–6:00 PM'),
          jsonb_build_object('day','Thursday','time','5:00–6:00 PM')
        ), false, null),
    ('a_tkd',     v_fid, 'Taekwondo',                    'TKD',    '#dc2626', 'body', 'active',   'Pick ~2 days/week (any day but Sunday)', '', '[]'::jsonb, true, 2),
    ('a_dance',   v_fid, 'Hip Hop Dance',                'Dance',  '#db2777', 'body', 'active',   '', '',
        jsonb_build_array(jsonb_build_object('day','Monday','time','5:30–6:30 PM')), false, null),
    ('a_bball',   v_fid, 'Basketball',                   'Ball',   '#65a30d', 'body', 'break',    'On hiatus', null, '[]'::jsonb, false, null),
    ('a_move',    v_fid, 'Movement',                     'Move',   '#16a34a', 'body', 'active',   '', null, '[]'::jsonb, false, null),
    ('a_church',  v_fid, 'Church',                       'Church', '#9333ea', 'soul', 'active',   'Sundays · bonus stars for drumming at church', null,
        jsonb_build_array(jsonb_build_object('day','Sunday','time','morning')), false, null),
    ('a_soccer',  v_fid, 'Soccer',                       'Soccer', '#22c55e', 'body', 'archived', 'Played age 15 months–5 yrs · stopped to focus on drums & dance', null, '[]'::jsonb, false, null),
    ('a_tennis',  v_fid, 'Tennis',                       'Tennis', '#84cc16', 'body', 'archived', 'Played age 15 months–5 yrs · stopped to focus on drums & dance', null, '[]'::jsonb, false, null)
  on conflict (id) do nothing;
end $$;
