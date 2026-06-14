-- One-off data fix: attach reztronx@gmail.com to the existing u_reznor
-- profile so the auto-link RPC (added in 20260614191500) can connect
-- his Supabase auth account to his 317-day-streak / drum-completion /
-- star-bank history.
--
-- Why one-off: u_reznor is Lynch-family seed data. Other families
-- won't have a u_reznor row, so this is a no-op for them. This file
-- exists only because the People UI gates kid profiles from email
-- editing (locked() at App.jsx:11007, intentional — prevents kid
-- mutation) and Reznor needs the email today.
--
-- Safety:
--   * WHERE id = 'u_reznor' targets exactly one row (PK match).
--   * AND (email IS NULL OR email = 'reztronx@gmail.com') means
--     re-running is idempotent and never overwrites an email already
--     set to something else.
--   * Only the email column changes. Stars, streaks, completions,
--     photos — every byte of Reznor's data — untouched.
--   * Rollback: update public.profiles set email = null where id = 'u_reznor' and email = 'reztronx@gmail.com';

update public.profiles
   set email = 'reztronx@gmail.com'
 where id = 'u_reznor'
   and (email is null or email = 'reztronx@gmail.com');
