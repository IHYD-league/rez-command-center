-- redemptions.approved_by / approved_at — actor + timestamp for
-- the parent who approved (or denied) a star redemption.
--
-- Trust audit finding #1 (🔴 critical): decideReward flipped a
-- redemption's status to "approved" / "denied" without recording
-- WHO made the call or WHEN. A 100⭐ redemption could land in the
-- bank with no answer to "which parent okayed this?" — and once
-- another family is using Command Center, that's exactly the kind
-- of dispute the trust contract needs to win.
--
-- Mirrors the audit shape already on completions (approved_by +
-- approval timestamp implicit in extra.history). Two columns
-- instead of jsonb because redemptions are simple state machines
-- (one approval per row) — no edit history to track.
--
-- Backwards-compat: NULL on legacy rows. The app reads the columns
-- when present; rows that never went through the new code path
-- continue to behave identically.

alter table public.redemptions
  add column if not exists approved_by text null references public.profiles(id) on delete set null,
  add column if not exists approved_at timestamptz null;

comment on column public.redemptions.approved_by is
  'Profile id of the parent who approved or denied this redemption. NULL until decideReward fires.';
comment on column public.redemptions.approved_at is
  'Timestamp of the approval / denial decision. NULL until decideReward fires.';
