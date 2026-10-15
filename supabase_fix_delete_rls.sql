-- ==============================================================================
-- SUDUT BINGKAI - FIX PERMISSIONS & RLS POLICIES (SUPABASE POSTGRESQL)
-- ==============================================================================
-- Masalah yang Diselesaikan:
-- Admin tidak bisa menghapus Acara, Foto, Vendor, Invoice, Add-on, Video, dsb
-- karena RLS (Row Level Security) di Supabase memblokir operasi DELETE & UPDATE
-- pada koneksi backend server.
--
-- Petunjuk Eksekusi Cepat (Hanya 1 Menit):
-- 1. Buka Supabase Dashboard Anda: https://supabase.com/dashboard
-- 2. Pilih Project SudutBingkai Anda.
-- 3. Klik menu "SQL Editor" (ikon terminal `>_` di bilah samping kiri).
-- 4. Klik tombol "New query", paste (tempel) seluruh isi file ini, lalu klik tombol "RUN" (hijau).
-- Skrip ini 100% aman dan idempotent (dapat dijalankan berkali-kali tanpa merusak data).
-- ==============================================================================

-- 1. TABEL EVENTS: Izinkan SELECT, INSERT, UPDATE, DELETE
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS events_open_policy ON public.events;
DROP POLICY IF EXISTS events_public_read ON public.events;
DROP POLICY IF EXISTS events_public_insert ON public.events;
DROP POLICY IF EXISTS events_delete_policy ON public.events;
DROP POLICY IF EXISTS events_update_policy ON public.events;
CREATE POLICY events_public_read ON public.events FOR SELECT USING (true);
CREATE POLICY events_public_insert ON public.events FOR INSERT WITH CHECK (true);
CREATE POLICY events_update_policy ON public.events FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY events_delete_policy ON public.events FOR DELETE USING (true);

-- 2. TABEL PHOTOS: Izinkan SELECT, INSERT, UPDATE, DELETE
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS photos_open_policy ON public.photos;
DROP POLICY IF EXISTS photos_public_read ON public.photos;
DROP POLICY IF EXISTS photos_public_insert ON public.photos;
DROP POLICY IF EXISTS photos_delete_policy ON public.photos;
DROP POLICY IF EXISTS photos_update_policy ON public.photos;
CREATE POLICY photos_public_read ON public.photos FOR SELECT USING (true);
CREATE POLICY photos_public_insert ON public.photos FOR INSERT WITH CHECK (true);
CREATE POLICY photos_update_policy ON public.photos FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY photos_delete_policy ON public.photos FOR DELETE USING (true);

-- 3. TABEL VOICE_NOTES: Izinkan SELECT, INSERT, UPDATE, DELETE
ALTER TABLE public.voice_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS voice_notes_open_policy ON public.voice_notes;
DROP POLICY IF EXISTS voice_notes_public_read ON public.voice_notes;
DROP POLICY IF EXISTS voice_notes_public_insert ON public.voice_notes;
DROP POLICY IF EXISTS voice_notes_delete_policy ON public.voice_notes;
DROP POLICY IF EXISTS voice_notes_update_policy ON public.voice_notes;
CREATE POLICY voice_notes_public_read ON public.voice_notes FOR SELECT USING (true);
CREATE POLICY voice_notes_public_insert ON public.voice_notes FOR INSERT WITH CHECK (true);
CREATE POLICY voice_notes_update_policy ON public.voice_notes FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY voice_notes_delete_policy ON public.voice_notes FOR DELETE USING (true);

-- 4. TABEL VIDEO_WISHES: Izinkan SELECT, INSERT, UPDATE, DELETE
ALTER TABLE public.video_wishes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS video_wishes_open_policy ON public.video_wishes;
DROP POLICY IF EXISTS video_wishes_public_read ON public.video_wishes;
DROP POLICY IF EXISTS video_wishes_public_insert ON public.video_wishes;
DROP POLICY IF EXISTS video_wishes_delete_policy ON public.video_wishes;
DROP POLICY IF EXISTS video_wishes_update_policy ON public.video_wishes;
CREATE POLICY video_wishes_public_read ON public.video_wishes FOR SELECT USING (true);
CREATE POLICY video_wishes_public_insert ON public.video_wishes FOR INSERT WITH CHECK (true);
CREATE POLICY video_wishes_update_policy ON public.video_wishes FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY video_wishes_delete_policy ON public.video_wishes FOR DELETE USING (true);

-- 5. TABEL VENDORS: Izinkan SELECT, INSERT, UPDATE, DELETE
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vendors_open_policy ON public.vendors;
DROP POLICY IF EXISTS vendors_public_read ON public.vendors;
DROP POLICY IF EXISTS vendors_delete_policy ON public.vendors;
DROP POLICY IF EXISTS vendors_update_policy ON public.vendors;
DROP POLICY IF EXISTS vendors_insert_policy ON public.vendors;
CREATE POLICY vendors_public_read ON public.vendors FOR SELECT USING (true);
CREATE POLICY vendors_insert_policy ON public.vendors FOR INSERT WITH CHECK (true);
CREATE POLICY vendors_update_policy ON public.vendors FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY vendors_delete_policy ON public.vendors FOR DELETE USING (true);

-- 6. TABEL INVOICES: Izinkan SELECT, INSERT, UPDATE, DELETE
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS invoices_open_policy ON public.invoices;
DROP POLICY IF EXISTS invoices_all_policy ON public.invoices;
DROP POLICY IF EXISTS invoices_select_policy ON public.invoices;
DROP POLICY IF EXISTS invoices_insert_policy ON public.invoices;
DROP POLICY IF EXISTS invoices_update_policy ON public.invoices;
DROP POLICY IF EXISTS invoices_delete_policy ON public.invoices;
CREATE POLICY invoices_select_policy ON public.invoices FOR SELECT USING (true);
CREATE POLICY invoices_insert_policy ON public.invoices FOR INSERT WITH CHECK (true);
CREATE POLICY invoices_update_policy ON public.invoices FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY invoices_delete_policy ON public.invoices FOR DELETE USING (true);

-- 7. TABEL ADDONS: Izinkan SELECT, INSERT, UPDATE, DELETE
ALTER TABLE public.addons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS addons_open_policy ON public.addons;
DROP POLICY IF EXISTS addons_public_read ON public.addons;
DROP POLICY IF EXISTS addons_delete_policy ON public.addons;
DROP POLICY IF EXISTS addons_update_policy ON public.addons;
DROP POLICY IF EXISTS addons_insert_policy ON public.addons;
CREATE POLICY addons_public_read ON public.addons FOR SELECT USING (true);
CREATE POLICY addons_insert_policy ON public.addons FOR INSERT WITH CHECK (true);
CREATE POLICY addons_update_policy ON public.addons FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY addons_delete_policy ON public.addons FOR DELETE USING (true);

-- 8. TABEL TESTIMONIALS: Izinkan SELECT, INSERT, UPDATE, DELETE
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS testimonials_open_policy ON public.testimonials;
DROP POLICY IF EXISTS testimonials_public_approved ON public.testimonials;
DROP POLICY IF EXISTS testimonials_public_submit ON public.testimonials;
DROP POLICY IF EXISTS testimonials_delete_policy ON public.testimonials;
DROP POLICY IF EXISTS testimonials_update_policy ON public.testimonials;
DROP POLICY IF EXISTS testimonials_all_read ON public.testimonials;
CREATE POLICY testimonials_all_read ON public.testimonials FOR SELECT USING (true);
CREATE POLICY testimonials_public_submit ON public.testimonials FOR INSERT WITH CHECK (true);
CREATE POLICY testimonials_update_policy ON public.testimonials FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY testimonials_delete_policy ON public.testimonials FOR DELETE USING (true);

-- 9. TABEL PAYOUT_REQUESTS: Izinkan SELECT, INSERT, UPDATE, DELETE
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payout_requests_open_policy ON public.payout_requests;
DROP POLICY IF EXISTS payout_requests_select_policy ON public.payout_requests;
DROP POLICY IF EXISTS payout_requests_insert_policy ON public.payout_requests;
DROP POLICY IF EXISTS payout_requests_update_policy ON public.payout_requests;
DROP POLICY IF EXISTS payout_requests_delete_policy ON public.payout_requests;
CREATE POLICY payout_requests_select_policy ON public.payout_requests FOR SELECT USING (true);
CREATE POLICY payout_requests_insert_policy ON public.payout_requests FOR INSERT WITH CHECK (true);
CREATE POLICY payout_requests_update_policy ON public.payout_requests FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY payout_requests_delete_policy ON public.payout_requests FOR DELETE USING (true);

-- 10. TABEL PAYMENT_TRANSACTIONS: Izinkan SELECT, INSERT, UPDATE, DELETE
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payment_tx_open_policy ON public.payment_transactions;
DROP POLICY IF EXISTS payment_transactions_select_policy ON public.payment_transactions;
DROP POLICY IF EXISTS payment_transactions_insert_policy ON public.payment_transactions;
DROP POLICY IF EXISTS payment_transactions_update_policy ON public.payment_transactions;
DROP POLICY IF EXISTS payment_transactions_delete_policy ON public.payment_transactions;
CREATE POLICY payment_transactions_select_policy ON public.payment_transactions FOR SELECT USING (true);
CREATE POLICY payment_transactions_insert_policy ON public.payment_transactions FOR INSERT WITH CHECK (true);
CREATE POLICY payment_transactions_update_policy ON public.payment_transactions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY payment_transactions_delete_policy ON public.payment_transactions FOR DELETE USING (true);
