-- Server-side guard: stale-bundle approves can never zero an approved
-- completion's awarded_stars again.
--
-- Backstory: the v1 decide(taskId, …) action filtered by task id only,
-- so approving today's Drums silently zeroed every prior approved Drums
-- row (their pendingStars was already 0, so awarded := 0 + bonus = 0).
-- Frontend fix shipped (App.jsx now filters on c.id), but iOS Safari's
-- aggressive cache means any device still running the stale bundle
-- keeps replaying the bug on the server. Bank can't depend on every
-- device clearing its cache for Reznor's real stars.
--
-- Defensive logic: an approved-→-approved UPDATE can only INCREASE
-- awarded_stars, never decrease it. Any attempt to lower stars while
-- status stays 'approved' silently preserves the old value. Status
-- transitions (approve→needs_fix, approve→skipped via reject, etc.)
-- still freely change stars — that's intentional parent action.

create or replace function public.protect_completion_stars()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'approved'
     and old.status = 'approved'
     and new.awarded_stars < old.awarded_stars then
    -- Silently preserve the prior award. We don't raise — surfacing an
    -- error to a stale client just confuses the user; the next page
    -- refresh resyncs local state with the (correct) server row.
    new.awarded_stars := old.awarded_stars;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_completion_stars_trg on public.completions;
create trigger protect_completion_stars_trg
before update on public.completions
for each row
execute function public.protect_completion_stars();

comment on function public.protect_completion_stars() is
  'Bank guard: an approved completion''s awarded_stars cannot be lowered '
  'without a status transition. Defeats the v1 decide(taskId) regression '
  'when a stale client bundle replays it.';
