-- ============================================================
-- RUN THIS AGAINST public.admin_users (the one tenant registry
-- table — one row per organization, not per employee).
-- ============================================================

-- 1. Add the two subscription columns.
--    trial_ends_at defaults to 15 days from row creation, so every
--    NEW signup (register()) gets a trial automatically — no app
--    code needed for that part, the DB default handles it.
--    is_subscribed is a manual override: flip it to TRUE once an
--    org has paid, and they bypass trial_ends_at entirely from then on.
ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '15 days'),
  ADD COLUMN IF NOT EXISTS is_subscribed BOOLEAN DEFAULT FALSE;

-- 2. Backfill EXISTING tenants: give each one 15 days from when they
--    actually signed up (created_at), not from today — so accounts
--    that registered a while ago aren't all suddenly reset to a full
--    fresh 15-day window as of whenever you run this.
UPDATE public.admin_users
SET trial_ends_at = created_at + INTERVAL '15 days'
WHERE trial_ends_at IS NULL;

-- ============================================================
-- Day-to-day operations after this is live:
-- ============================================================

-- Resume service for a tenant that paid (permanent, ignores trial_ends_at):
--   UPDATE public.admin_users SET is_subscribed = true WHERE email = 'admin@example.com';

-- Extend a trial by another 15 days instead of marking it fully subscribed:
--   UPDATE public.admin_users SET trial_ends_at = trial_ends_at + INTERVAL '15 days' WHERE email = 'admin@example.com';

-- Check who's expired right now:
--   SELECT email, tenant_schema, trial_ends_at, is_subscribed FROM public.admin_users
--   WHERE is_subscribed = false AND trial_ends_at < NOW();

-- ============================================================
-- FOLLOW-UP FIX (run this too): the ADD COLUMN above stamped every
-- existing row with NOW()+15d instead of leaving it NULL, because a
-- non-constant DEFAULT forces Postgres to backfill all rows at ALTER
-- time. That made the "WHERE trial_ends_at IS NULL" backfill above a
-- no-op. Re-run unconditionally to correct it to each tenant's real
-- signup date:
-- ============================================================
UPDATE public.admin_users
SET trial_ends_at = created_at + INTERVAL '15 days';
