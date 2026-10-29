-- ==============================================================================
-- SudutBingkai - Table Schema: vendor_proofings
-- Untuk modul Portal Proofing Klien (Google Drive Proxy)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.vendor_proofings (
    id TEXT PRIMARY KEY,
    vendor_id TEXT NOT NULL,
    client_name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    gdrive_folder_id TEXT NOT NULL,
    quota_limit INTEGER NOT NULL DEFAULT 50,
    deadline_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'selecting', -- 'selecting' | 'submitted' | 'completed'
    selected_photos JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexing untuk query cepat berdasarkan vendor_id dan slug
CREATE INDEX IF NOT EXISTS idx_vendor_proofings_vendor_id ON public.vendor_proofings(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_proofings_slug ON public.vendor_proofings(slug);

-- Enable Row Level Security (RLS)
ALTER TABLE public.vendor_proofings ENABLE ROW LEVEL SECURITY;

-- Policy: Publik (Klien) & Server dapat membaca sesi proofing berdasarkan slug/id
CREATE POLICY "Public can view proofing session by slug"
    ON public.vendor_proofings
    FOR SELECT
    USING (true);

-- Policy: Publik (Klien) dapat mengupdate selected_photos dan status saat submit
CREATE POLICY "Public can submit selected photos"
    ON public.vendor_proofings
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Policy: Vendor / Server dapat insert & delete sesi proofing
CREATE POLICY "Vendor and server can insert proofings"
    ON public.vendor_proofings
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Vendor and server can delete proofings"
    ON public.vendor_proofings
    FOR DELETE
    USING (true);
