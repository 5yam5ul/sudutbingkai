-- ==========================================================
-- SKEMA DATABASE SUDUTBINGKAI (SUPABASE POSTGRESQL)
-- Jalankan skrip ini di menu SQL Editor pada Dashboard Supabase Anda
-- ==========================================================

-- 1. Buat Tabel Acara (events)
CREATE TABLE IF NOT EXISTS public.events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  couple_or_host TEXT NOT NULL,
  event_date TIMESTAMPTZ NOT NULL,
  location TEXT,
  preset TEXT NOT NULL DEFAULT 'portra',
  allowed_presets JSONB DEFAULT '["portra","funsaver","quicksnap","ektar","cinestill","ilford","agfa","trix"]'::jsonb,
  allow_guest_preset_switch BOOLEAN DEFAULT TRUE,
  package_tier TEXT DEFAULT 'wedding',
  max_guests INT DEFAULT 300,
  shots_per_guest INT DEFAULT 25,
  reveal_mode TEXT DEFAULT 'instant',
  reveal_time TIMESTAMPTZ,
  frame_id TEXT DEFAULT 'minimal-gold',
  custom_frame_url TEXT,
  frame_text TEXT,
  allow_voice_note BOOLEAN DEFAULT TRUE,
  allow_guest_frame_toggle BOOLEAN DEFAULT TRUE,
  cover_url TEXT,
  host_email TEXT,
  vendor_id TEXT,
  vendor_name TEXT,
  vendor_logo TEXT,
  vendor_instagram TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Buat Tabel Foto Tamu (photos)
CREATE TABLE IF NOT EXISTS public.photos (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  guest_name TEXT NOT NULL,
  session_id TEXT,
  shot_number INT DEFAULT 1,
  image_url TEXT NOT NULL,
  caption TEXT,
  is_hidden BOOLEAN DEFAULT FALSE,
  aspect_ratio TEXT DEFAULT '3:4',
  frame_id TEXT DEFAULT 'minimal-gold',
  voice_note_url TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk mempercepat query galeri per acara
CREATE INDEX IF NOT EXISTS idx_photos_event_id ON public.photos(event_id);
CREATE INDEX IF NOT EXISTS idx_photos_timestamp ON public.photos(timestamp DESC);

-- 3. Buat Tabel Pesan Suara Tamu (voice_notes)
CREATE TABLE IF NOT EXISTS public.voice_notes (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  guest_name TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  duration INT DEFAULT 15,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voice_notes_event_id ON public.voice_notes(event_id);

-- 4. Buat Tabel Vendor WO (vendors)
CREATE TABLE IF NOT EXISTS public.vendors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  company_name TEXT,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  instagram TEXT,
  logo_url TEXT,
  tier TEXT DEFAULT 'pro',
  client_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tambahkan Data Acara Demo Awal
INSERT INTO public.events (
  id, title, couple_or_host, event_date, location, preset, max_guests, shots_per_guest, reveal_mode, package_tier
) VALUES (
  'demo-nikahan', 
  'Pernikahan Sarah & Dimas', 
  'Sarah & Dimas', 
  NOW() + INTERVAL '14 days', 
  'Plataran Dharmawangsa, Jakarta', 
  'portra', 
  300, 
  25, 
  'instant',
  'wedding'
) ON CONFLICT (id) DO NOTHING;

-- 6. Aktifkan Izin Akses Terbuka (Public Read/Write untuk Kamera Tamu)
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read events" ON public.events FOR SELECT USING (true);
CREATE POLICY "Allow public insert events" ON public.events FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update events" ON public.events FOR UPDATE USING (true);

CREATE POLICY "Allow public read photos" ON public.photos FOR SELECT USING (true);
CREATE POLICY "Allow public insert photos" ON public.photos FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update photos" ON public.photos FOR UPDATE USING (true);
CREATE POLICY "Allow public delete photos" ON public.photos FOR DELETE USING (true);

CREATE POLICY "Allow public read voice_notes" ON public.voice_notes FOR SELECT USING (true);
CREATE POLICY "Allow public insert voice_notes" ON public.voice_notes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete voice_notes" ON public.voice_notes FOR DELETE USING (true);

CREATE POLICY "Allow public read vendors" ON public.vendors FOR SELECT USING (true);
CREATE POLICY "Allow public insert vendors" ON public.vendors FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update vendors" ON public.vendors FOR UPDATE USING (true);

-- 7. Buat Bucket Storage 'photos' (Jika belum ada)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('photos', 'photos', true) 
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Allow public read storage" ON storage.objects FOR SELECT USING (bucket_id = 'photos');
CREATE POLICY "Allow public insert storage" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'photos');
CREATE POLICY "Allow public delete storage" ON storage.objects FOR DELETE USING (bucket_id = 'photos');
