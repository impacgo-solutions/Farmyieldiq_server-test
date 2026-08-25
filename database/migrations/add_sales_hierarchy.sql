-- ============================================================
-- RUN THIS IN SUPABASE SQL EDITOR (after add_employees_and_sales.sql)
-- Adds org-hierarchy (reporting manager) to both the sales agent
-- master data (sales_team_members) and general employee accounts
-- (admin_users), so sales figures can be rolled up through the chain
-- of command (agent -> manager -> regional head -> ...).
-- ============================================================

-- ── Sales agent hierarchy (primary: drives the new Hierarchy tab) ──
ALTER TABLE sales_team_members
  ADD COLUMN IF NOT EXISTS reports_to_id UUID REFERENCES sales_team_members(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sales_team_reports_to ON sales_team_members(reports_to_id);

-- ── General employee reporting line (admin_users) ──────────────────
ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS reports_to_id UUID REFERENCES admin_users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_admin_users_reports_to ON admin_users(reports_to_id);
