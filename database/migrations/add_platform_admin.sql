-- ============================================================
-- RUN THIS AGAINST public.admin_users, same table add_trial_expiry.sql
-- targets — one row per organization's own admin, not per employee.
-- ============================================================

-- Every org's own admin already carries role = 'super_admin' (see
-- register() in src/controllers/auth.controller.js) — but scoped to their
-- own tenant. That alone can't be used to gate the cross-tenant Super Admin
-- screens (tenant list, trial extension, subscription toggling) in the
-- Flutter admin app, or any org that signs up through the public signup
-- form would see every other tenant's data. is_platform_admin is the real
-- gate — checked by requireSuperAdmin in src/middleware/auth.js — and
-- defaults FALSE so no existing or newly-registered tenant gets it for free.
ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN DEFAULT FALSE;

-- ============================================================
-- Day-to-day operations after this is live:
-- ============================================================

-- Grant platform Super Admin access to a real account (also mark them
-- is_subscribed so their OWN trial_ends_at can never lock them out of the
-- portal they use to manage everyone else's trials):
--   UPDATE public.admin_users
--   SET is_platform_admin = true, is_subscribed = true
--   WHERE email = 'the-real-admin-email@impacgo.com';

-- Revoke it:
--   UPDATE public.admin_users SET is_platform_admin = false WHERE email = '...';

-- Check who currently has it:
--   SELECT email, tenant_schema, is_platform_admin FROM public.admin_users
--   WHERE is_platform_admin = true;
