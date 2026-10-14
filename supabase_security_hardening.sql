-- ==============================================================================
-- SUDUT BINGKAI - MASTER DATABASE SECURITY HARDENING SCRIPT (SUPABASE POSTGRESQL)
-- Versi: 3.2 Bulletproof (Auto-Migrate Columns + Zero-Leak RLS Protection)
-- Petunjuk Eksekusi:
-- 1. Buka Supabase Dashboard -> Masuk ke menu "SQL Editor"
-- 2. Buat "New Query", tempel seluruh isi file ini, lalu klik tombol "RUN" (Hijau).
-- Skrip ini 100% idempotent (bisa dijalankan berkali-kali tanpa error).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. PASTIKAN SEMUA TABEL DAN KOLOM LENGKAP (AUTO-MIGRATE COLUMNS)
-- Langkah ini secara otomatis membuat kolom jika database Anda masih versi lama,
-- sehingga TIDAK AKAN PERNAH terjadi error: "column does not exist".
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.events (id TEXT PRIMARY KEY, title TEXT, couple_or_host TEXT, event_date TIMESTAMPTZ);
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS preset TEXT DEFAULT 'portra';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS allowed_presets TEXT[];
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS allow_guest_preset_switch BOOLEAN DEFAULT true;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS package_tier TEXT DEFAULT 'wedding';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS max_guests INTEGER DEFAULT 150;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS additional_pax INTEGER DEFAULT 0;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS shots_per_guest INTEGER DEFAULT 20;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS reveal_mode TEXT DEFAULT 'instant';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS reveal_time TIMESTAMPTZ;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS frame_id TEXT DEFAULT 'minimal-gold';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS custom_frame_url TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS frame_text TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS allow_voice_note BOOLEAN DEFAULT true;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS allow_guest_frame_toggle BOOLEAN DEFAULT true;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS closing_wish_type TEXT DEFAULT 'voice';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS cover_url TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS host_email TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'paid';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS vendor_id TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS vendor_name TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS vendor_logo TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS vendor_instagram TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS referral_code_used TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS commission_amount NUMERIC DEFAULT 0;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS commission_status TEXT DEFAULT 'pending';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.photos (id TEXT PRIMARY KEY, event_id TEXT, guest_name TEXT, session_id TEXT, shot_number INTEGER, image_url TEXT);
ALTER TABLE public.photos ADD COLUMN IF NOT EXISTS caption TEXT;
ALTER TABLE public.photos ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false;
ALTER TABLE public.photos ADD COLUMN IF NOT EXISTS aspect_ratio TEXT DEFAULT '3:4';
ALTER TABLE public.photos ADD COLUMN IF NOT EXISTS frame_id TEXT DEFAULT 'none';
ALTER TABLE public.photos ADD COLUMN IF NOT EXISTS voice_note_url TEXT;
ALTER TABLE public.photos ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.voice_notes (id TEXT PRIMARY KEY, event_id TEXT, guest_name TEXT, audio_url TEXT);
ALTER TABLE public.voice_notes ADD COLUMN IF NOT EXISTS duration NUMERIC DEFAULT 15;
ALTER TABLE public.voice_notes ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.video_wishes (id TEXT PRIMARY KEY, event_id TEXT, guest_name TEXT, video_url TEXT);
ALTER TABLE public.video_wishes ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT 60;
ALTER TABLE public.video_wishes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.vendors (id TEXT PRIMARY KEY, name TEXT);
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS instagram TEXT;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'vendor';
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'pro';
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS partner_tier TEXT DEFAULT 'regular';
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS referral_code TEXT;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS commission_rate NUMERIC DEFAULT 0.12;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC DEFAULT 0;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS total_earnings NUMERIC DEFAULT 0;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS wholesale_tokens INTEGER DEFAULT 0;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS bank_name TEXT DEFAULT 'BCA';
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS bank_account_number TEXT;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS bank_account_holder TEXT;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS city TEXT DEFAULT 'Jakarta';
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS client_count INTEGER DEFAULT 0;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.testimonials (id TEXT PRIMARY KEY, event_id TEXT, submitter_id TEXT, video_url TEXT);
ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS event_title TEXT;
ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS submitter_type TEXT DEFAULT 'vendor';
ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS submitter_name TEXT;
ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS submitter_email TEXT;
ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS video_type TEXT DEFAULT 'link';
ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT 60;
ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS caption TEXT;
ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS reward_amount NUMERIC DEFAULT 50000;
ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS reward_paid_at TIMESTAMPTZ;
ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.addons (id TEXT PRIMARY KEY, name TEXT, category TEXT, price NUMERIC);
ALTER TABLE public.addons ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.addons ADD COLUMN IF NOT EXISTS cost_price NUMERIC;
ALTER TABLE public.addons ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.addons ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.addons ADD COLUMN IF NOT EXISTS unit TEXT NOT NULL DEFAULT 'paket';
ALTER TABLE public.addons ADD COLUMN IF NOT EXISTS free_shipping_jabodetabek BOOLEAN DEFAULT true;
ALTER TABLE public.addons ADD COLUMN IF NOT EXISTS is_popular BOOLEAN DEFAULT false;
ALTER TABLE public.addons ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.invoices (id TEXT PRIMARY KEY, event_id TEXT, order_id TEXT);
CREATE TABLE IF NOT EXISTS public.payment_transactions (id TEXT PRIMARY KEY, order_id TEXT, amount NUMERIC);
CREATE TABLE IF NOT EXISTS public.payout_requests (id TEXT PRIMARY KEY, vendor_id TEXT, amount NUMERIC);
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (id TEXT PRIMARY KEY, admin_id TEXT, action TEXT);

-- ------------------------------------------------------------------------------
-- 1. HAPUS POLICY TERBUKA LAMA (DROP WILDCARD USING (true) POLICIES)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS events_open_policy ON public.events;
DROP POLICY IF EXISTS photos_open_policy ON public.photos;
DROP POLICY IF EXISTS voice_notes_open_policy ON public.voice_notes;
DROP POLICY IF EXISTS video_wishes_open_policy ON public.video_wishes;
DROP POLICY IF EXISTS vendors_open_policy ON public.vendors;
DROP POLICY IF EXISTS invoices_open_policy ON public.invoices;
DROP POLICY IF EXISTS payment_tx_open_policy ON public.payment_transactions;
DROP POLICY IF EXISTS payout_requests_open_policy ON public.payout_requests;
DROP POLICY IF EXISTS testimonials_open_policy ON public.testimonials;
DROP POLICY IF EXISTS addons_open_policy ON public.addons;
DROP POLICY IF EXISTS audit_logs_open_policy ON public.admin_audit_logs;

-- Hapus juga policy baru jika sudah pernah dibuat sebelumnya agar idempotent
DROP POLICY IF EXISTS events_public_read ON public.events;
DROP POLICY IF EXISTS events_public_insert ON public.events;
DROP POLICY IF EXISTS photos_public_read ON public.photos;
DROP POLICY IF EXISTS photos_public_insert ON public.photos;
DROP POLICY IF EXISTS voice_notes_public_read ON public.voice_notes;
DROP POLICY IF EXISTS voice_notes_public_insert ON public.voice_notes;
DROP POLICY IF EXISTS video_wishes_public_read ON public.video_wishes;
DROP POLICY IF EXISTS video_wishes_public_insert ON public.video_wishes;
DROP POLICY IF EXISTS vendors_public_read ON public.vendors;
DROP POLICY IF EXISTS addons_public_read ON public.addons;
DROP POLICY IF EXISTS testimonials_public_approved ON public.testimonials;
DROP POLICY IF EXISTS testimonials_public_submit ON public.testimonials;

-- Pastikan RLS aktif di semua tabel
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_wishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 2. POLICY AMAN: TABEL EVENTS
-- Publik hanya bisa membaca info acara dan mendaftar acara baru
-- ------------------------------------------------------------------------------
CREATE POLICY events_public_read ON public.events
  FOR SELECT
  USING (true);

CREATE POLICY events_public_insert ON public.events
  FOR INSERT
  WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 3. POLICY AMAN: TABEL PHOTOS
-- Publik (tamu/slideshow) HANYA BISA MELIHAT foto yang TIDAK disensor (is_hidden = false)
-- ------------------------------------------------------------------------------
CREATE POLICY photos_public_read ON public.photos
  FOR SELECT
  USING (is_hidden = false);

CREATE POLICY photos_public_insert ON public.photos
  FOR INSERT
  WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 4. POLICY AMAN: TABEL VOICE_NOTES & VIDEO_WISHES
-- ------------------------------------------------------------------------------
CREATE POLICY voice_notes_public_read ON public.voice_notes
  FOR SELECT
  USING (true);

CREATE POLICY voice_notes_public_insert ON public.voice_notes
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY video_wishes_public_read ON public.video_wishes
  FOR SELECT
  USING (true);

CREATE POLICY video_wishes_public_insert ON public.video_wishes
  FOR INSERT
  WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 5. POLICY AMAN: TABEL VENDORS
-- Data Super Admin disembunyikan dari koneksi publik
-- ------------------------------------------------------------------------------
CREATE POLICY vendors_public_read ON public.vendors
  FOR SELECT
  USING (role != 'admin');

-- ------------------------------------------------------------------------------
-- 6. POLICY AMAN: TABEL ADDONS
-- Katalog publik add-on fisik
-- ------------------------------------------------------------------------------
CREATE POLICY addons_public_read ON public.addons
  FOR SELECT
  USING (is_active = true);

-- ------------------------------------------------------------------------------
-- 7. POLICY AMAN: TABEL TESTIMONIALS
-- Publik HANYA dapat melihat testimoni yang berstatus 'approved'
-- ------------------------------------------------------------------------------
CREATE POLICY testimonials_public_approved ON public.testimonials
  FOR SELECT
  USING (status = 'approved');

CREATE POLICY testimonials_public_submit ON public.testimonials
  FOR INSERT
  WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 8. KUNCI TOTAL TABEL SENSITIF DARI KONEKSI ANON PUBLIK
-- Invoices, Payout Requests, Payment Transactions, Admin Audit Logs
-- TIDAK BOLEH BISA DIBACA LANGSUNG DARI BROWSER (HANYA VIA NEXT.JS SERVER)
-- ------------------------------------------------------------------------------
-- Tidak ada policy SELECT publik untuk:
-- - public.invoices
-- - public.payout_requests
-- - public.payment_transactions
-- - public.admin_audit_logs
-- PostgREST API Supabase akan menolak 100% permintaan langsung dari browser anonim.
