-- ============================================================
-- STORAGE BUCKETS SETUP
-- Run this in Supabase SQL Editor:
-- Dashboard → SQL Editor → New Query → paste all → Run
-- Safe to re-run — uses IF NOT EXISTS / ON CONFLICT
-- ============================================================

-- ── 1. Create "documents" bucket (public, 25 MB) ───────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  true,
  26214400,
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public              = EXCLUDED.public,
  file_size_limit     = EXCLUDED.file_size_limit,
  allowed_mime_types  = EXCLUDED.allowed_mime_types;

-- ── 2. Create "avatars" bucket (public, 5 MB) ──────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,
  ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public              = EXCLUDED.public,
  file_size_limit     = EXCLUDED.file_size_limit,
  allowed_mime_types  = EXCLUDED.allowed_mime_types;

-- ── 3. Policies for "documents" bucket ─────────────────────────
-- Drop first so re-running is safe
DROP POLICY IF EXISTS "Public read documents"          ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update documents" ON storage.objects;

CREATE POLICY "Public read documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'documents');

CREATE POLICY "Authenticated upload documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Authenticated delete documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'documents');

CREATE POLICY "Authenticated update documents"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'documents');

-- ── 4. Policies for "avatars" bucket ───────────────────────────
DROP POLICY IF EXISTS "Public read avatars"          ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update avatars" ON storage.objects;

CREATE POLICY "Public read avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated upload avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Authenticated delete avatars"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated update avatars"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars');
