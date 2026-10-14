import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { getServerSession } from '@/lib/auth';

const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10MB max
const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);

export async function POST(request: Request) {
  try {
    const session = getServerSession(request);
    // Ensure caller is authenticated (host, vendor, or admin)
    if (!session) {
      return NextResponse.json({ success: false, error: 'Akses ditolak: Autentikasi sesi diperlukan untuk mengunggah berkas.' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const rawType = (formData.get('type') as string) || 'frame';
    const type = ['frame', 'cover', 'logo', 'general'].includes(rawType) ? rawType : 'general';

    if (!file) {
      return NextResponse.json({ success: false, error: 'File tidak ditemukan' }, { status: 400 });
    }

    // 1. Strict Size Limit
    if (file.size > MAX_UPLOAD_SIZE) {
      return NextResponse.json({
        success: false,
        error: `Ukuran berkas melebihi batas maksimal 10MB (${(file.size / (1024 * 1024)).toFixed(1)}MB)`
      }, { status: 413 });
    }

    // 2. Strict MIME Type Whitelist
    const mime = (file.type || '').toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(mime)) {
      return NextResponse.json({
        success: false,
        error: 'Format berkas tidak diizinkan. Hanya gambar PNG, JPG, dan WebP yang diperbolehkan.'
      }, { status: 400 });
    }

    if (type === 'frame' && !mime.includes('png')) {
      return NextResponse.json({ success: false, error: 'Bingkai khusus harus berformat PNG dengan background transparan' }, { status: 400 });
    }

    // 3. Safe Extension derived from verified MIME (prevent double extension & executable tricks)
    const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
    const buffer = Buffer.from(await file.arrayBuffer());
    const subFolder = type === 'frame' ? 'frames' : type === 'cover' ? 'covers' : type === 'logo' ? 'logos' : 'general';
    const filename = `${type}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;


    // 1. Try upload to Supabase Storage if configured
    if (isSupabaseConfigured && supabase) {
      try {
        const storagePath = `${subFolder}/${filename}`;
        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(storagePath, buffer, {
            contentType: mime || 'image/png',
            upsert: true
          });

        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage
            .from('photos')
            .getPublicUrl(storagePath);

          return NextResponse.json({
            success: true,
            url: publicUrlData.publicUrl,
            filename,
            size: file.size
          });
        }
        console.warn('Supabase storage upload error:', uploadError.message);
      } catch (uploadEx) {
        console.warn('Supabase storage upload exception:', uploadEx);
      }
    }

    // 2. Local fallback
    try {
      const targetDir = path.join(process.cwd(), 'public', 'uploads', subFolder);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const targetPath = path.join(targetDir, filename);
      fs.writeFileSync(targetPath, buffer);

      const publicUrl = `/uploads/${subFolder}/${filename}`;

      return NextResponse.json({
        success: true,
        url: publicUrl,
        filename,
        size: file.size
      });
    } catch (fsErr) {
      console.error('Local fallback failed (likely read-only serverless environment):', fsErr);
      return NextResponse.json({
        success: false,
        error: 'Penyimpanan file gagal. Pastikan Supabase Storage telah aktif.'
      }, { status: 500 });
    }
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
