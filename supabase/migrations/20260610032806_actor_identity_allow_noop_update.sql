-- HOTFIX: enforce_actor_identity_trg was rejecting batch upserts.
--
-- Symptom: parent A (signed in as themself, role=parent) submits any
-- completion through the app. The sync layer does
-- DELETE-then-UPSERT(all-rows). Because UPSERT touches every prior row
-- in the family — including parent B's previously-submitted rows — the
-- BEFORE INSERT/UPDATE trigger fires on each of those existing rows.
--
-- The old trigger logic:
--
--   if new.submitted_by is distinct from my_pid then
--     ensure submitted_by is a kid; else raise exception
--
-- That logic is correct on INSERT (you can't claim "submitted by parent
-- B" while signed in as parent A) but wrong on no-op UPDATEs — every
-- replay of parent B's old row fails because submitted_by IS parent B,
-- which is distinct from parent A, and parent B is not a kid.
--
-- Net effect on prod: every parent's sync silently rolled back on
-- every submit. New completions never persisted. Older rows stayed,
-- so reads still showed the pre-bug state. Refresh wiped local optimistic
-- writes. Books / songs sync paths share the same delete-then-upsert
-- batch pattern, so the same class of issue would affect them if their
-- tables had similar triggers — they don't, but the user-facing
-- experience of "writes vanish" was the same root cause for
-- completions, with the others being collateral confusion.
--
-- Fix: only run the identity checks on INSERT, or on UPDATE when the
-- identity field actually changed. A no-op UPDATE that leaves
-- submitted_by / approved_by unchanged from old.* passes through.
-- This preserves the original anti-forgery intent (you can't claim a
-- new identity on a row that you don't own) while letting the
-- legitimate sync replay path work.
--
-- No data change. No column change. Just replacing the function body.

create or replace function public.enforce_actor_identity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  my_pid   text;
  am_admin boolean;
  is_kid   boolean;
begin
  my_pid   := public.my_profile_id();
  am_admin := public.is_admin();
  -- Admin override: short-circuit. Mike (or any future admin) can
  -- write any actor identity for testing and troubleshooting.
  if am_admin then
    return new;
  end if;

  -- submitted_by check. Only enforce on INSERT, or on UPDATE when the
  -- column actually changed — a no-op replay (whose new.submitted_by =
  -- old.submitted_by) is by definition not a forgery attempt.
  if new.submitted_by is not null
     and new.submitted_by is distinct from my_pid
     and (tg_op = 'INSERT'
          or new.submitted_by is distinct from old.submitted_by) then
    select coalesce(is_child, false) into is_kid
      from public.profiles
     where id = new.submitted_by
       and family_id = public.my_family_id()
     limit 1;
    if not coalesce(is_kid, false) then
      raise exception
        'actor guard: submitted_by % is not the auth user (%), not a kid in this family, and the auth user is not admin',
        new.submitted_by, my_pid
        using errcode = '42501';
    end if;
  end if;

  -- approved_by check (kids do not approve). Same no-op-replay relaxation.
  if new.approved_by is not null
     and new.approved_by is distinct from my_pid
     and (tg_op = 'INSERT'
          or new.approved_by is distinct from old.approved_by) then
    raise exception
      'actor guard: approved_by % is not the auth user (%) and the auth user is not admin',
      new.approved_by, my_pid
      using errcode = '42501';
  end if;

  return new;
end;
$$;
