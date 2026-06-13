-- completions.status: add 'draft' to the allowed set.
--
-- Mike wants to log Drums sub-fields (Drumeo, Melodics, Drumscribe,
-- songs) across a 45min-2hr practice window without having to undo
-- and re-submit each time. New status: "draft" = saved work-in-
-- progress, not yet submitted to the parent for approval. Doesn't
-- count toward stars, doesn't appear in the Approvals queue, but
-- the TaskSheet pre-fills from it when re-opened so the parent
-- picks up where they left off.
--
-- Done as drop + recreate because Postgres CHECK constraints don't
-- support IF NOT EXISTS. The conditional name lookup makes it
-- idempotent.

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'completions_status_check'
      and conrelid = 'public.completions'::regclass
  ) then
    alter table public.completions drop constraint completions_status_check;
  end if;
end$$;

alter table public.completions
  add constraint completions_status_check
  check (status in ('draft','pending','approved','needs_fix','skipped'));

comment on column public.completions.status is
  'draft = parent saved partial work in progress (not yet submitted). pending = submitted, awaiting parent approval. approved/needs_fix/skipped = terminal states.';
