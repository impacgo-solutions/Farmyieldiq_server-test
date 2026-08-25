-- ============================================================
-- RUN THIS IN SUPABASE SQL EDITOR (after schema.sql)
-- Adds: employee accounts with per-role module access, and the
-- full Sales CRM (team / leads / activity notes / bookings).
-- ============================================================

-- ── 1. Employee accounts ─────────────────────────────────────
-- Employees log in through the exact same admin_users table and
-- /api/auth/login endpoint as the super admin — they're just rows
-- with is_employee = true and a restricted allowed_modules list.
-- allowed_modules = NULL means full access (the super admin, and
-- any future admin-level account).
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS is_employee BOOLEAN DEFAULT FALSE;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS allowed_modules JSONB;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_admin_users_is_employee ON admin_users(is_employee);

-- ── 2. Sales team members ────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  role_title TEXT NOT NULL,
  branch TEXT,
  email TEXT,
  phone TEXT,
  commission_rate NUMERIC DEFAULT 1.0,
  target NUMERIC DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. Sales leads ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  project TEXT,
  budget NUMERIC DEFAULT 0,
  temperature TEXT DEFAULT 'new',       -- hot / warm / cold / new
  source TEXT,                          -- Walk-in / Referral / Website / ...
  status TEXT DEFAULT 'new',            -- new / contacted / site_visit / negotiation / booked / lost
  assigned_to_id UUID REFERENCES sales_team_members(id) ON DELETE SET NULL,
  next_follow_up TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. Sales lead activity notes ─────────────────────────────
CREATE TABLE IF NOT EXISTS sales_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES sales_leads(id) ON DELETE CASCADE,
  type TEXT NOT NULL,                   -- call / whatsapp / note / site_visit / status_change
  text TEXT NOT NULL,
  author TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. Sales bookings ─────────────────────────────────────────
-- lead_name / phone / project / agent_name are captured at booking
-- time (not just joined live) so the deal record stays accurate
-- even if the source lead is later edited or removed.
CREATE TABLE IF NOT EXISTS sales_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES sales_leads(id) ON DELETE SET NULL,
  lead_name TEXT,
  phone TEXT,
  project TEXT,
  agent_id UUID REFERENCES sales_team_members(id) ON DELETE SET NULL,
  agent_name TEXT,
  unit_no TEXT,
  amount NUMERIC NOT NULL,
  payment_plan TEXT,
  booked_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sales_leads_assigned  ON sales_leads(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_sales_leads_status    ON sales_leads(status);
CREATE INDEX IF NOT EXISTS idx_sales_notes_lead      ON sales_notes(lead_id);
CREATE INDEX IF NOT EXISTS idx_sales_bookings_lead   ON sales_bookings(lead_id);
CREATE INDEX IF NOT EXISTS idx_sales_bookings_agent  ON sales_bookings(agent_id);
