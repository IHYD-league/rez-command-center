-- HOTFIX round 2: the previous fix (20260610032806) handled UPDATE no-op
-- replays but missed the upsert path. PostgREST upsert is INSERT ON
-- CONFLICT DO UPDATE, which fires BEFORE INSERT first. For a row whose
-- id already exists (the sync layer's whole-array batch upsert touches
-- every existing row in the family), the BEFORE INSERT trigger fired
-- AGAINST the existing row's submitted_by / approved_by — values that
-- belong to the OTHER parent, or to legacy auto-approved kid rows —
-- and raised. Symptom in Mike's session: "approved_by u_reznor is
-- not the auth user (u_mike)".
--
-- Two fixes layered here:
--
-- 1. Upsert-replay detection inside enforce_actor_identity. When a
--    BEFORE INSERT fires for a row whose id already exists, skip the
--    identity check entirely — this is the sync layer replaying an
--    existing row; the BEFORE UPDATE pass (post-conflict) will run the
--    no-op-replay check from migration 032806. A genuinely-new INSERT
--    (no row with this id exists yet) still gets the full identity
--    enforcement, preserving the anti-forgery intent.
--
-- 2. is_admin() now honors EITHER role='admin' OR the is_admin BOOLEAN
--    column. The earlier rollback migration reverted Mike's role from
--    'admin' back to 'parent' to restore the live frontend's parent
--    gates, but it left his profile.is_admin = true on the assumption
--    that future trigger code would honor the column. The actor guard
--    didn't — it only checked role — so Mike never got admin override
--    and his upserts got rejected by the identity checks against the
--    legacy 4 kid-auto-approved rows where approved_by = u_reznor.
--    Honoring the column gives Mike the admin override the frontend's
--    LoginScreen filter already assumes he has.
--
-- A separate DML cleanup (not in this migration; run separately as a
-- one-off) corrected the 4 legacy rows whose approved_by was the kid
-- to be u_mike. That cleanup is in the migration history as a comment
-- only; data fixes that overlap with another agent's territory shouldn't
-- land in a migration that another deploy might re-run.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE auth_user_id = auth.uid()
      AND (role = 'admin' OR is_admin = true)
  )
$$;

CREATE OR REPLACE FUNCTION public.enforce_actor_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  my_pid    text;
  am_admin  boolean;
  is_kid    boolean;
  is_replay boolean;
BEGIN
  my_pid   := public.my_profile_id();
  am_admin := public.is_admin();
  IF am_admin THEN
    RETURN new;
  END IF;

  -- Upsert-replay detection: INSERT ON CONFLICT DO UPDATE fires
  -- BEFORE INSERT first. If a row with this id already exists, skip
  -- the identity check here and let BEFORE UPDATE handle it (and its
  -- own no-op-replay relaxation will pass through values that didn't
  -- change). Otherwise the sync layer's whole-array upsert silently
  -- fails on the first row whose historical identity belongs to
  -- someone other than the current auth user.
  IF tg_op = 'INSERT' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.completions WHERE id = new.id
    ) INTO is_replay;
    IF is_replay THEN
      RETURN new;
    END IF;
  END IF;

  -- submitted_by check. Enforce on genuine INSERT or on UPDATE when
  -- the column changed; no-op replays pass.
  IF new.submitted_by IS NOT NULL
     AND new.submitted_by IS DISTINCT FROM my_pid
     AND (tg_op = 'INSERT'
          OR new.submitted_by IS DISTINCT FROM old.submitted_by) THEN
    SELECT coalesce(is_child, false) INTO is_kid
      FROM public.profiles
     WHERE id = new.submitted_by
       AND family_id = public.my_family_id()
     LIMIT 1;
    IF NOT coalesce(is_kid, false) THEN
      RAISE EXCEPTION
        'actor guard: submitted_by % is not the auth user (%), not a kid in this family, and the auth user is not admin',
        new.submitted_by, my_pid
        USING errcode = '42501';
    END IF;
  END IF;

  -- approved_by check (kids do not approve).
  IF new.approved_by IS NOT NULL
     AND new.approved_by IS DISTINCT FROM my_pid
     AND (tg_op = 'INSERT'
          OR new.approved_by IS DISTINCT FROM old.approved_by) THEN
    RAISE EXCEPTION
      'actor guard: approved_by % is not the auth user (%) and the auth user is not admin',
      new.approved_by, my_pid
      USING errcode = '42501';
  END IF;

  RETURN new;
END;
$$;
