-- ==============================================================================
-- SUDUTBINGKAI - MIGRATION: VENDOR PORTFOLIO THEME & ULTRA CUSTOMIZATION
-- Jalankan skrip ini di SQL Editor Supabase Dashboard Anda
-- ==============================================================================

-- 1. Tambah kolom portfolio_theme, portfolio_views, dan portfolio_whatsapp_clicks
ALTER TABLE public.vendors 
  ADD COLUMN IF NOT EXISTS portfolio_theme JSONB DEFAULT '{
    "cardStyle": "photobook",
    "backgroundMode": "preset",
    "bgPreset": "alabaster",
    "heroStyle": "social",
    "gridLayout": "grid",
    "fontStyle": "sans",
    "accentColor": "#C27803",
    "enableStickyMobileBar": true,
    "showTestimonials": false,
    "showFaq": false,
    "showBadges": false,
    "showBehindTheLens": false,
    "showVideoHighlight": false
  }'::jsonb,
  ADD COLUMN IF NOT EXISTS portfolio_views INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS portfolio_whatsapp_clicks INTEGER DEFAULT 0;

-- 2. Index untuk analytics performa
CREATE INDEX IF NOT EXISTS idx_vendors_portfolio_views ON public.vendors (portfolio_views);

-- 3. Verifikasi kolom berhasil ditambahkan
SELECT id, company_name, slug, portfolio_theme, portfolio_views FROM public.vendors LIMIT 5;
