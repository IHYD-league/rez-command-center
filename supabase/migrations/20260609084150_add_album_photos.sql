-- Memory Album (Phase 2 of the photo gallery arc).
--
-- Holds PARENT-ADDED photos that aren't task proof — recitals, Lego
-- builds, "a good day." Lives in its own narrow table rather than
-- being shoehorned into completions.proof[] because album photos
-- aren't completions of anything; they have no taskId. Same per-family
-- pattern as board_state / user_prefs / summer_quest_progress.
--
-- Photos themselves still live in the family-photos storage bucket
-- under <familyId>/album/... — the existing storage RLS policy
-- (folder[1] = my_family_id()) already permits reads + writes there,
-- so no new bucket policy is needed.

create table if not exists public.album_photos (
  id          text         primary key,
  family_id   uuid         not null references public.families(id) on delete cascade,
  uploaded_by text         references public.profiles(id) on delete set null,
  path        text         not null,
  caption     text,
  taken_at    date         not null default current_date,
  -- activity_id is the client-side activity registry id ("a_drums",
  -- "a_dance", etc.). Activities live in App.jsx seed data, not as
  -- a Supabase table, so there's no FK to enforce — plain text.
  activity_id text,
  created_at  timestamptz  not null default now()
);

create index if not exists album_photos_family_idx
  on public.album_photos(family_id);
create index if not exists album_photos_taken_idx
  on public.album_photos(family_id, taken_at desc);

alter table public.album_photos enable row level security;
alter table public.album_photos force  row level security;

-- READ: any family member (kid + parents + helpers) can see album
-- photos. Kid sees their memories too — that's the whole point.
drop policy if exists "album_photos_read_my_family" on public.album_photos;
create policy "album_photos_read_my_family"
  on public.album_photos for select
  to authenticated
  using (family_id = public.my_family_id());

-- WRITE: HARD parent-only enforcement via is_parent(). Per Mike: UI
-- gates aren't real protection — we learned that with the stale-
-- bundle star bug. Parent role lives in the policy so a non-parent
-- write is impossible at the server, regardless of what the client
-- bundle thinks. Helpers (Krissie / Sara) cannot upload Memories;
-- only Mike + Krissie's parent profiles can.
drop policy if exists "album_photos_insert_parent" on public.album_photos;
create policy "album_photos_insert_parent"
  on public.album_photos for insert
  to authenticated
  with check (family_id = public.my_family_id() and public.is_parent());

drop policy if exists "album_photos_update_parent" on public.album_photos;
create policy "album_photos_update_parent"
  on public.album_photos for update
  to authenticated
  using      (family_id = public.my_family_id() and public.is_parent())
  with check (family_id = public.my_family_id() and public.is_parent());

drop policy if exists "album_photos_delete_parent" on public.album_photos;
create policy "album_photos_delete_parent"
  on public.album_photos for delete
  to authenticated
  using (family_id = public.my_family_id() and public.is_parent());

comment on table public.album_photos is
  'Parent-added "Memories" photos (recitals, Lego builds, good days). '
  'Distinct from task-proof photos in completions.proof[]. '
  'Read open to family, writes restricted to is_parent().';
