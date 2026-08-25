-- ============================================================
-- RUN THIS ENTIRE FILE IN SUPABASE SQL EDITOR
-- Dashboard → SQL Editor → New Query → paste → Run
-- ============================================================

-- 1. crops column on plots (if not already done)
ALTER TABLE plots ADD COLUMN IF NOT EXISTS crops JSONB;

-- 2. admin_notifications (admin receives these when partner takes action)
CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
  partner_name TEXT,
  data JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_notif_read    ON admin_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_admin_notif_created ON admin_notifications(created_at DESC);

-- 3. visit_schedules
CREATE TABLE IF NOT EXISTS visit_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
  visit_type TEXT NOT NULL,
  visit_date TEXT NOT NULL,
  visit_time TEXT NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  admin_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_visit_partner ON visit_schedules(partner_id);
CREATE INDEX IF NOT EXISTS idx_visit_status  ON visit_schedules(status);

-- 4. support_messages
CREATE TABLE IF NOT EXISTS support_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_from_bot BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_support_partner ON support_messages(partner_id);

-- 5. ownership_transfers
CREATE TABLE IF NOT EXISTS ownership_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL,
  asset_id UUID,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  admin_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_transfer_partner ON ownership_transfers(from_partner_id);
CREATE INDEX IF NOT EXISTS idx_transfer_status  ON ownership_transfers(status);

-- 6. notifications (partner receives these when admin responds)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notif_partner ON notifications(partner_id);
CREATE INDEX IF NOT EXISTS idx_notif_read    ON notifications(is_read);

-- Add admin_note column if tables already existed without it
ALTER TABLE visit_schedules     ADD COLUMN IF NOT EXISTS admin_note TEXT;
ALTER TABLE ownership_transfers ADD COLUMN IF NOT EXISTS admin_note TEXT;

-- Add is_from_admin column for admin replies in support chat
ALTER TABLE support_messages ADD COLUMN IF NOT EXISTS is_from_admin BOOLEAN DEFAULT FALSE;
