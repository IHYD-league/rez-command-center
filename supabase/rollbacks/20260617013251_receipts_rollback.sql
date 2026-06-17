-- Paired rollback for 20260617013251_receipts.sql.
--
-- THIS FILE IS NOT AUTO-APPLIED.
-- It lives in supabase/rollbacks/ (outside the CLI's migration scan
-- of supabase/migrations/). To run it, paste this SQL into the
-- Supabase SQL Editor or feed it directly to psql against the linked
-- project; do NOT move it into supabase/migrations/ or
-- `supabase db push --include-all` will treat it as a fresh forward
-- migration and undo the receipts table the moment a sync runs.
--
-- Filename convention: same timestamp as the forward migration plus
-- the _rollback suffix, so the pairing is obvious in tooling and in
-- diffs.
--
-- Drops the receipts table + its 4 indexes + 2 policies in dependency
-- order. cascade is safe: nothing in RS-1 references receipts.
-- (RS-2 will add purchases.receipt_id → receipts.id FK; that's a
-- future migration, not in scope here, so this rollback is clean
-- today. When RS-2 ships, its own rollback chain will drop the FK
-- before this rollback can be run.)
--
-- After applying this rollback, the schema is byte-identical to
-- pre-RS-1: no receipts table, no new policies, no new indexes. The
-- delta-form canary (star total) must be unchanged.

drop policy if exists receipts_delete_parents on public.receipts;
drop policy if exists receipts_rw_my_family   on public.receipts;

drop index if exists public.receipts_active_idx;
drop index if exists public.receipts_pending_idx;
drop index if exists public.receipts_chain_idx;
drop index if exists public.receipts_family_idx;

drop table if exists public.receipts cascade;

-- Integrity probe — same shape as the forward migration. The
-- pre-rollback star total must equal the post-rollback star total.
--   select sum(awarded_stars) from public.completions
--    where status = 'approved'
--      and family_id = (select id from public.families where name = 'Lynch');
