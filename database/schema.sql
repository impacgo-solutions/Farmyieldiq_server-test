-- ============================================================
-- ETOR ADMIN - COMPLETE DATABASE SCHEMA
-- Run this entire file in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. ADMIN USERS TABLE (for login)
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'super_admin',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default admin user (password: 'password' — CHANGE IN PRODUCTION)
-- Hash generated with bcrypt for "password"
INSERT INTO admin_users (email, password_hash, name, role)
VALUES (
  'admin@etor.com',
  '$2a$10$YourHashWillBeReplacedBySeeder',
  'Admin User',
  'super_admin'
) ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- 2. PARTNERS / CUSTOMERS TABLE (your "Users" in Flutter)
-- ============================================================
CREATE TABLE IF NOT EXISTS partners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  address TEXT,
  joined_date TIMESTAMPTZ DEFAULT NOW(),
  portfolio_value NUMERIC DEFAULT 0,
  profile_image_url TEXT,
  password TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. LAYOUTS TABLE (already exists - kept here for completeness)
-- ============================================================
CREATE TABLE IF NOT EXISTS layouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  village_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. BLOCKS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  layout_id UUID REFERENCES layouts(id) ON DELETE CASCADE,
  total_plots INT DEFAULT 0,
  description TEXT,
  layout_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. PLOTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS plots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  layout_id UUID REFERENCES layouts(id) ON DELETE CASCADE,
  block_id UUID REFERENCES blocks(id) ON DELETE CASCADE,
  plot_number TEXT NOT NULL,
  survey_number TEXT NOT NULL,
  length NUMERIC NOT NULL,
  width NUMERIC NOT NULL,
  area NUMERIC NOT NULL,
  area_extended NUMERIC,
  facing TEXT NOT NULL,
  status TEXT NOT NULL,
  price_per_sqft NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  layout_name TEXT,
  block_name TEXT,
  address TEXT,
  owner_name TEXT,
  notes TEXT,
  assigned_user_id TEXT,
  paid_amount NUMERIC DEFAULT 0,
  balance_amount NUMERIC DEFAULT 0,
  payment_status TEXT DEFAULT 'Not Paid',
  registration_status TEXT DEFAULT 'Not Started',
  crops JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. DOCUMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  type TEXT NOT NULL,                  -- Certificate / Agreement
  upload_date TIMESTAMPTZ DEFAULT NOW(),
  related_user_id UUID REFERENCES partners(id) ON DELETE SET NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. PAYMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES partners(id) ON DELETE CASCADE,
  plot_id UUID REFERENCES plots(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  date TIMESTAMPTZ DEFAULT NOW(),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 8. COWS TABLE (local cows + assignments)
-- ============================================================
CREATE TABLE IF NOT EXISTS cows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tag_number TEXT,
  breed TEXT NOT NULL,
  age INT DEFAULT 0,
  milk_production NUMERIC DEFAULT 0,
  health_status TEXT DEFAULT 'Healthy',
  status TEXT DEFAULT 'active',
  block_id TEXT,
  live_feed_url TEXT,
  assigned_user_id UUID REFERENCES partners(id) ON DELETE SET NULL,
  external_farm_id TEXT,                -- if synced from dfms.impacgo.com
  external_cow_id TEXT,                 -- original ID from external API
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 9. COW ASSIGNMENTS TABLE (many-to-many)
-- ============================================================
CREATE TABLE IF NOT EXISTS cow_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES partners(id) ON DELETE CASCADE,
  cow_id TEXT NOT NULL,                 -- external cow ID (string)
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id, cow_id)
);

-- ============================================================
-- INDEXES for faster queries
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_blocks_layout_id ON blocks(layout_id);
CREATE INDEX IF NOT EXISTS idx_plots_layout_id ON plots(layout_id);
CREATE INDEX IF NOT EXISTS idx_plots_block_id ON plots(block_id);
CREATE INDEX IF NOT EXISTS idx_plots_assigned_user ON plots(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(related_user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_cow_assignments_customer ON cow_assignments(customer_id);

-- ============================================================
-- STORAGE BUCKET for documents (run separately if needed)
-- Go to Supabase Storage → Create bucket named "documents" → Public
-- ============================================================
