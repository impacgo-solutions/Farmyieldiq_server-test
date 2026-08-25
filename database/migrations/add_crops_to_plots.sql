-- Migration: Add crops column to plots table
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)

ALTER TABLE plots ADD COLUMN IF NOT EXISTS crops JSONB;

-- Verify the column was added:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'plots' AND column_name = 'crops';
