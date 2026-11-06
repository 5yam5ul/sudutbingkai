-- ==============================================================================
-- SUDUTBINGKAI - MIGRATION: VENDOR EXCLUSIVE PORTFOLIO & LANDING PAGE
-- Jalankan skrip ini di SQL Editor Supabase Dashboard Anda
-- ==============================================================================

-- 1. Tambah kolom portofolio pada tabel public.vendors
ALTER TABLE public.vendors 
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS cover_url TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS portfolio_albums JSONB DEFAULT '[]'::jsonb;

-- 2. Buat index agar pemuatan sudutbingkai.id/[vendorSlug] sangat cepat
CREATE INDEX IF NOT EXISTS idx_vendors_slug ON public.vendors (slug);

-- 3. Isi default slug untuk vendor yang sudah ada (dari nama agensi mereka)
UPDATE public.vendors 
SET slug = LOWER(TRIM(BOTH '-' FROM REGEXP_REPLACE(company_name, '[^a-zA-Z0-9]+', '-', 'g')))
WHERE slug IS NULL OR slug = '';

-- Konfirmasi penambahan kolom
SELECT id, company_name, slug, portfolio_albums FROM public.vendors LIMIT 5;
