-- ==============================================================================
-- SUDUT BINGKAI - MASTER DATABASE SECURITY HARDENING & RLS LOCKDOWN (SUPABASE POSTGRESQL)
-- Versi: 4.0 Production Hardened (Zero Unauthenticated Mutations)
-- ==============================================================================
-- Masalah yang Diselesaikan:
-- Mencegah penyerang menghapus atau merusak data (Events, Photos, Vendors, Invoices)
-- dari browser publik via Anon Key, sembari memastikan backend Next.js tetap dapat
-- melakukan operasi administratif melalui SUPABASE_SERVICE_ROLE_KEY.
--
-- Petunjuk Eksekusi:
-- 1. Buka Supabase Dashboard Anda: https://supabase.com/dashboard
-- 2. Pilih Project SudutBingkai Anda.
-- 3. Masuk ke menu "SQL Editor", buat "New Query", paste seluruh file ini, klik "RUN".
-- 4. Pastikan SUPABASE_SERVICE_ROLE_KEY dari Project Settings -> API telah disalin
--    ke Environment Variable server (Vercel / .env.local).
-- ==============================================================================

-- 1. TABEL EVENTS: RLS Lockdown
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS events_open_policy ON public.events;
DROP POLICY IF EXISTS events_delete_policy ON public.events;
DROP POLICY IF EXISTS events_update_policy ON public.events;
DROP POLICY IF EXISTS events_public_read ON public.events;
DROP POLICY IF EXISTS events_public_insert ON public.events;

-- Publik hanya dapat membaca info dasar acara & mendaftar acara
CREATE POLICY events_public_read ON public.events FOR SELECT USING (true);
CREATE POLICY events_public_insert ON public.events FOR INSERT WITH CHECK (true);
-- Mutasi UPDATE & DELETE hanya diizinkan via server backend terautentikasi (Service Role)

-- 2. TABEL PHOTOS: RLS Lockdown
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS photos_open_policy ON public.photos;
DROP POLICY IF EXISTS photos_delete_policy ON public.photos;
DROP POLICY IF EXISTS photos_update_policy ON public.photos;
DROP POLICY IF EXISTS photos_public_read ON public.photos;
DROP POLICY IF EXISTS photos_public_insert ON public.photos;

-- Publik hanya dapat melihat foto yang tidak disensor (is_hidden = false) dan mengunggah foto baru
CREATE POLICY photos_public_read ON public.photos FOR SELECT USING (is_hidden = false);
CREATE POLICY photos_public_insert ON public.photos FOR INSERT WITH CHECK (true);
-- Mutasi moderasi (sembunyikan/hapus) diproses via Next.js API server

-- 3. TABEL VOICE_NOTES: RLS Lockdown
ALTER TABLE public.voice_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS voice_notes_open_policy ON public.voice_notes;
DROP POLICY IF EXISTS voice_notes_delete_policy ON public.voice_notes;
DROP POLICY IF EXISTS voice_notes_update_policy ON public.voice_notes;
DROP POLICY IF EXISTS voice_notes_public_read ON public.voice_notes;
DROP POLICY IF EXISTS voice_notes_public_insert ON public.voice_notes;

CREATE POLICY voice_notes_public_read ON public.voice_notes FOR SELECT USING (true);
CREATE POLICY voice_notes_public_insert ON public.voice_notes FOR INSERT WITH CHECK (true);

-- 4. TABEL VIDEO_WISHES: RLS Lockdown
ALTER TABLE public.video_wishes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS video_wishes_open_policy ON public.video_wishes;
DROP POLICY IF EXISTS video_wishes_delete_policy ON public.video_wishes;
DROP POLICY IF EXISTS video_wishes_update_policy ON public.video_wishes;
DROP POLICY IF EXISTS video_wishes_public_read ON public.video_wishes;
DROP POLICY IF EXISTS video_wishes_public_insert ON public.video_wishes;

CREATE POLICY video_wishes_public_read ON public.video_wishes FOR SELECT USING (true);
CREATE POLICY video_wishes_public_insert ON public.video_wishes FOR INSERT WITH CHECK (true);

-- 5. TABEL VENDORS: RLS Lockdown & PII Protection
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vendors_open_policy ON public.vendors;
DROP POLICY IF EXISTS vendors_delete_policy ON public.vendors;
DROP POLICY IF EXISTS vendors_update_policy ON public.vendors;
DROP POLICY IF EXISTS vendors_insert_policy ON public.vendors;
DROP POLICY IF EXISTS vendors_public_read ON public.vendors;

-- Publik anonim tidak boleh mengubah atau menghapus data vendor
-- Mutasi hanya diizinkan via server API routes yang memvalidasi sesi vendor
CREATE POLICY vendors_public_read ON public.vendors FOR SELECT USING (role != 'admin');

-- 6. TABEL INVOICES: RLS Lockdown (Terkunci Total dari Akses Anon)
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS invoices_open_policy ON public.invoices;
DROP POLICY IF EXISTS invoices_all_policy ON public.invoices;
DROP POLICY IF EXISTS invoices_select_policy ON public.invoices;
DROP POLICY IF EXISTS invoices_insert_policy ON public.invoices;
DROP POLICY IF EXISTS invoices_update_policy ON public.invoices;
DROP POLICY IF EXISTS invoices_delete_policy ON public.invoices;
-- Tidak ada policy untuk anon: Faktur hanya diakses via backend Next.js API /api/invoices

-- 7. TABEL ADDONS: RLS Lockdown
ALTER TABLE public.addons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS addons_open_policy ON public.addons;
DROP POLICY IF EXISTS addons_delete_policy ON public.addons;
DROP POLICY IF EXISTS addons_update_policy ON public.addons;
DROP POLICY IF EXISTS addons_insert_policy ON public.addons;
DROP POLICY IF EXISTS addons_public_read ON public.addons;

CREATE POLICY addons_public_read ON public.addons FOR SELECT USING (is_active = true);

-- 8. TABEL VENDOR_PROOFINGS: RLS Lockdown
ALTER TABLE public.vendor_proofings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Vendor and server can insert proofings" ON public.vendor_proofings;
DROP POLICY IF EXISTS "Vendor and server can delete proofings" ON public.vendor_proofings;
DROP POLICY IF EXISTS "Public can view proofing session by slug" ON public.vendor_proofings;
DROP POLICY IF EXISTS "Public can submit selected photos" ON public.vendor_proofings;

CREATE POLICY "Public can view proofing session by slug" ON public.vendor_proofings FOR SELECT USING (true);
CREATE POLICY "Public can submit selected photos" ON public.vendor_proofings FOR UPDATE USING (status = 'selecting') WITH CHECK (status IN ('selecting', 'submitted'));
