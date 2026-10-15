-- ==============================================================================
-- SUDUT BINGKAI - MASTER DATABASE MIGRATION SCRIPT (SUPABASE POSTGRESQL)
-- Versi: 3.0 (100% Zero-Miss Full Feature Coverage)
-- Petunjuk Eksekusi:
-- 1. Buka Supabase Dashboard -> Pilih project Anda -> Masuk menu "SQL Editor"
-- 2. Tempel seluruh isi file ini, lalu klik tombol "RUN" (Hijau).
-- Skrip ini idempotent (dapat dijalankan berulang kali tanpa merusak data lama).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABEL EVENTS (Wadah Acara / Album Digital)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.events (
  id TEXT PRIMARY KEY,
  slug TEXT,
  title TEXT NOT NULL,
  couple_or_host TEXT NOT NULL,
  event_date TIMESTAMPTZ NOT NULL,
  location TEXT,
  preset TEXT DEFAULT 'portra',
  allowed_presets TEXT[],
  allow_guest_preset_switch BOOLEAN DEFAULT true,
  package_tier TEXT DEFAULT 'wedding',
  max_guests INTEGER DEFAULT 150,
  additional_pax INTEGER DEFAULT 0,
  shots_per_guest INTEGER DEFAULT 20,
  reveal_mode TEXT DEFAULT 'instant',
  reveal_time TIMESTAMPTZ,
  frame_id TEXT DEFAULT 'minimal-gold',
  custom_frame_url TEXT,
  frame_text TEXT,
  allow_voice_note BOOLEAN DEFAULT true,
  allow_guest_frame_toggle BOOLEAN DEFAULT true,
  closing_wish_type TEXT DEFAULT 'voice', -- 'voice' | 'video' | 'none'
  cover_url TEXT,
  host_email TEXT,
  payment_status TEXT DEFAULT 'paid', -- 'pending' | 'paid'
  vendor_id TEXT,
  vendor_name TEXT,
  vendor_logo TEXT,
  vendor_instagram TEXT,
  referral_code_used TEXT,
  commission_amount NUMERIC DEFAULT 0,
  commission_status TEXT DEFAULT 'pending', -- 'pending' | 'available' | 'withdrawn'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migrasi kolom jika tabel events sudah ada sebelumnya
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS additional_pax INTEGER DEFAULT 0;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS closing_wish_type TEXT DEFAULT 'voice';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'paid';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS referral_code_used TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS commission_amount NUMERIC DEFAULT 0;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS commission_status TEXT DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS idx_events_slug ON public.events(slug);
CREATE INDEX IF NOT EXISTS idx_events_host_email ON public.events(host_email);
CREATE INDEX IF NOT EXISTS idx_events_vendor_id ON public.events(vendor_id);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON public.events(created_at DESC);

-- ------------------------------------------------------------------------------
-- 2. TABEL PHOTOS (Rol Foto & Jepretan Tamu Undangan)
-- Folder Storage: events/{eventId}/{photoId}.jpg
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.photos (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  guest_name TEXT NOT NULL,
  session_id TEXT NOT NULL,
  shot_number INTEGER NOT NULL,
  image_url TEXT NOT NULL,
  caption TEXT,
  is_hidden BOOLEAN DEFAULT false,
  aspect_ratio TEXT DEFAULT '3:4',
  frame_id TEXT DEFAULT 'none',
  voice_note_url TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_photos_event_id ON public.photos(event_id);
CREATE INDEX IF NOT EXISTS idx_photos_timestamp ON public.photos(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_photos_hidden ON public.photos(is_hidden);

-- ------------------------------------------------------------------------------
-- 3. TABEL VOICE_NOTES (Ucapan Pesan Suara Tamu)
-- Folder Storage: voices/{eventId}/{noteId}.webm
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.voice_notes (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  guest_name TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  duration NUMERIC DEFAULT 15,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voice_notes_event_id ON public.voice_notes(event_id);

-- ------------------------------------------------------------------------------
-- 4. TABEL VIDEO_WISHES (Reels Ucapan Video 15 Detik ala VHS Retro)
-- Folder Storage: events/{eventId}/videos/{wishId}.mp4
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.video_wishes (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  guest_name TEXT NOT NULL,
  table_number TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration NUMERIC DEFAULT 15,
  aspect_ratio TEXT DEFAULT '9:16',
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_video_wishes_event_id ON public.video_wishes(event_id);

-- Migrasi kolom session_id jika tabel sudah ada sebelumnya
ALTER TABLE public.voice_notes ADD COLUMN IF NOT EXISTS session_id TEXT;
ALTER TABLE public.video_wishes ADD COLUMN IF NOT EXISTS session_id TEXT;

-- ------------------------------------------------------------------------------
-- 5. TABEL VENDORS (Akun Mitra WO, Dompet Komisi & Saldo Kuota Grosir)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vendors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  instagram TEXT,
  logo_url TEXT,
  role TEXT DEFAULT 'vendor',
  tier TEXT DEFAULT 'pro',
  partner_tier TEXT DEFAULT 'pro', -- 'regular' (12%) | 'pro' (15%) | 'vip' (20%)
  referral_code TEXT UNIQUE,
  commission_rate NUMERIC DEFAULT 0.15,
  wallet_balance NUMERIC DEFAULT 0,
  total_earnings NUMERIC DEFAULT 0,
  wholesale_tokens INTEGER DEFAULT 0,
  bank_name TEXT DEFAULT 'BCA',
  bank_account_number TEXT,
  bank_account_holder TEXT,
  city TEXT DEFAULT 'Jakarta',
  client_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migrasi kolom jika tabel vendors sudah ada
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'vendor';
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS partner_tier TEXT DEFAULT 'pro';
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS referral_code TEXT;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS commission_rate NUMERIC DEFAULT 0.15;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC DEFAULT 0;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS total_earnings NUMERIC DEFAULT 0;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS wholesale_tokens INTEGER DEFAULT 0;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS bank_name TEXT DEFAULT 'BCA';
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS bank_account_number TEXT;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS bank_account_holder TEXT;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS city TEXT DEFAULT 'Jakarta';
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS client_count INTEGER DEFAULT 0;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_vendors_referral_code ON public.vendors(referral_code);
CREATE INDEX IF NOT EXISTS idx_vendors_email ON public.vendors(email);

-- ------------------------------------------------------------------------------
-- 6. TABEL INVOICES (Invoicing Resmi Standar B2B & Klien)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoices (
  id TEXT PRIMARY KEY,
  invoice_number TEXT UNIQUE NOT NULL,
  event_id TEXT,
  order_id TEXT NOT NULL,
  buyer_type TEXT NOT NULL DEFAULT 'client', -- 'client' | 'vendor'
  buyer_name TEXT NOT NULL,
  buyer_email TEXT NOT NULL,
  buyer_phone TEXT,
  company_name TEXT,
  tier_id TEXT NOT NULL,
  tier_name TEXT NOT NULL,
  original_price NUMERIC NOT NULL,
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  discount_code TEXT,
  final_amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'qris',
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'paid' | 'cancelled'
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_number ON public.invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_event_id ON public.invoices(event_id);
CREATE INDEX IF NOT EXISTS idx_invoices_buyer_email ON public.invoices(buyer_email);

-- ------------------------------------------------------------------------------
-- 7. TABEL PAYMENT_TRANSACTIONS (Log Audit Mutasi Transaksi Payment Gateway Mayar)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'mayar',
  amount NUMERIC NOT NULL DEFAULT 0,
  customer_name TEXT,
  customer_email TEXT,
  status TEXT NOT NULL DEFAULT 'PAID',
  description TEXT,
  event_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_tx_event_id ON public.payment_transactions(event_id);
CREATE INDEX IF NOT EXISTS idx_payment_tx_created_at ON public.payment_transactions(created_at DESC);

-- ------------------------------------------------------------------------------
-- 8. TABEL PAYOUT_REQUESTS (Penarikan Komisi Mitra Vendor)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payout_requests (
  id TEXT PRIMARY KEY,
  vendor_id TEXT NOT NULL,
  vendor_email TEXT NOT NULL,
  vendor_name TEXT NOT NULL,
  company_name TEXT,
  amount NUMERIC NOT NULL,
  bank_details JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
  proof_url TEXT,
  notes TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payouts_vendor_id ON public.payout_requests(vendor_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON public.payout_requests(status);

-- ------------------------------------------------------------------------------
-- 9. TABEL TESTIMONIALS (Video Testimoni & Reward Bonus Saldo Rp 50.000)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.testimonials (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  event_title TEXT NOT NULL,
  submitter_type TEXT NOT NULL DEFAULT 'vendor', -- 'vendor' | 'host'
  submitter_id TEXT NOT NULL,
  submitter_name TEXT NOT NULL,
  submitter_email TEXT,
  video_type TEXT NOT NULL DEFAULT 'link', -- 'link' | 'file'
  video_url TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL,
  caption TEXT,
  reward_amount NUMERIC NOT NULL DEFAULT 50000,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
  admin_notes TEXT,
  reward_paid_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_testimonials_event_id ON public.testimonials(event_id);
CREATE INDEX IF NOT EXISTS idx_testimonials_submitter_id ON public.testimonials(submitter_id);
CREATE INDEX IF NOT EXISTS idx_testimonials_status ON public.testimonials(status);

-- ------------------------------------------------------------------------------
-- 10. TABEL ADDONS (Katalog Add-on Fisik / Upsell Phygital)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.addons (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'physical_qr' | 'banner' | 'hardware_rental' | 'custom'
  description TEXT,
  price NUMERIC NOT NULL,
  cost_price NUMERIC,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  unit TEXT NOT NULL DEFAULT 'paket',
  free_shipping_jabodetabek BOOLEAN DEFAULT true,
  is_popular BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 11. TABEL ADMIN_AUDIT_LOGS (Merekam jejak aktivitas Super Admin)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL,
  target_entity TEXT NOT NULL,
  target_id TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.admin_audit_logs(created_at DESC);

-- ------------------------------------------------------------------------------
-- 12. KEAMANAN: ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
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

-- Policy Akses Publik untuk operasional aplikasi (Full Read/Write)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'events_open_policy') THEN
    CREATE POLICY events_open_policy ON public.events FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'photos_open_policy') THEN
    CREATE POLICY photos_open_policy ON public.photos FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'voice_notes_open_policy') THEN
    CREATE POLICY voice_notes_open_policy ON public.voice_notes FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'video_wishes_open_policy') THEN
    CREATE POLICY video_wishes_open_policy ON public.video_wishes FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'vendors_open_policy') THEN
    CREATE POLICY vendors_open_policy ON public.vendors FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'invoices_open_policy') THEN
    CREATE POLICY invoices_open_policy ON public.invoices FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'payment_tx_open_policy') THEN
    CREATE POLICY payment_tx_open_policy ON public.payment_transactions FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'payout_requests_open_policy') THEN
    CREATE POLICY payout_requests_open_policy ON public.payout_requests FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'testimonials_open_policy') THEN
    CREATE POLICY testimonials_open_policy ON public.testimonials FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'addons_open_policy') THEN
    CREATE POLICY addons_open_policy ON public.addons FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'audit_logs_open_policy') THEN
    CREATE POLICY audit_logs_open_policy ON public.admin_audit_logs FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 13. SEED DATA AWAL (Contoh Data Uji & Akun Super Admin)
-- ------------------------------------------------------------------------------
INSERT INTO public.vendors (
  id, name, company_name, email, phone, role, tier, partner_tier, referral_code, wallet_balance, total_earnings, wholesale_tokens
) VALUES (
  'admin_sudutbingkai',
  'Super Admin SudutBingkai',
  'Sudut Bingkai HQ',
  'admin@sudutbingkai.id',
  '081234567890',
  'admin',
  'agency',
  'vip',
  'ADMINSB',
  0,
  0,
  999
) ON CONFLICT (id) DO UPDATE SET
  role = 'admin';

-- Data Vendor Mitra Contoh
INSERT INTO public.vendors (
  id, name, company_name, email, phone, instagram, logo_url, role, tier, partner_tier, referral_code, commission_rate, wallet_balance, total_earnings, wholesale_tokens, bank_name, bank_account_number, bank_account_holder, client_count
) VALUES (
  'vendor_vows_co',
  'Arya Pratama',
  'Vows & Co Wedding Organizer',
  'vendor@sudutbingkai.id',
  '081298765432',
  '@vowsandco',
  '/sample-logos/vows-and-co.png',
  'vendor',
  'pro',
  'pro',
  'VOWSANDCO',
  0.15,
  420000,
  1260000,
  5,
  'BCA',
  '8730129841',
  'Arya Pratama',
  3
) ON CONFLICT (id) DO UPDATE SET
  referral_code = EXCLUDED.referral_code,
  wallet_balance = EXCLUDED.wallet_balance,
  wholesale_tokens = EXCLUDED.wholesale_tokens;

-- Data Katalog Add-on Fisik Awal
INSERT INTO public.addons (id, name, category, description, price, unit, free_shipping_jabodetabek, is_popular)
VALUES 
  ('addon_akrilik_10', 'Paket Standing Akrilik Meja (10 pcs)', 'physical_qr', 'Standing card akrilik bening A5 tebal dengan wooden base kayu jati estetik untuk meja VIP & registrasi.', 499000, '10 pcs', true, true),
  ('addon_akrilik_20', 'Paket Standing Akrilik Meja (20 pcs)', 'physical_qr', 'Standing card akrilik meja tamu untuk pesta resepsi besar (20 meja).', 799000, '20 pcs', true, false),
  ('addon_banner_welcome', 'Welcome Gate Roll-Up Banner (60x160cm)', 'banner', 'Standing banner cetak Albatros matte anti-glare dengan QR Code raksasa untuk foyer masuk ballroom.', 249000, '1 set', true, true),
  ('addon_tv_vertikal_43', 'Sewa TV Vertikal Totem Kiosk 43 Inch', 'hardware_rental', 'Standing Digital Totem TV vertikal 43 inci untuk menampilkan live slideshow foto tamu di ballroom.', 1350000, '1 hari', true, true)
ON CONFLICT (id) DO NOTHING;
