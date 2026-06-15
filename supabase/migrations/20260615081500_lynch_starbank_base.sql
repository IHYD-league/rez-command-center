-- Lynch one-off: preserve the 60-star carry-over that used to live as
-- CHILD.starBankBase = 60 in code. When CHILD was removed (per the
-- kid-name-everywhere sweep on 2026-06-15) the starBank computation
-- switched to `earnedAllTime + giftedTotal - redeemedTotal`, dropping
-- Lynch's visible total by 60. Per the never-lose-data memory rule,
-- this migration stashes 60 into Lynch's familySettings.starBankBase
-- so the new derived value matches what Mike has been seeing.
--
-- Other families start at starBankBase = 0 (default), which is
-- correct — they didn't have an in-memory pre-existence.
--
-- Idempotent: only writes the key if it isn't already set.

do $$
declare
  v_fid uuid;
  v_settings jsonb;
begin
  select id into v_fid from public.families order by created_at asc limit 1;
  if v_fid is null then return; end if;

  insert into public.family_settings (family_id, settings)
       values (v_fid, '{}'::jsonb)
  on conflict (family_id) do nothing;

  select settings into v_settings from public.family_settings where family_id = v_fid;
  if v_settings ? 'starBankBase' then return; end if;

  update public.family_settings
     set settings = settings || jsonb_build_object('starBankBase', 60),
         updated_at = now()
   where family_id = v_fid;
end $$;
