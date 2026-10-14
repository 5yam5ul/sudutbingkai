import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { uploadBufferToR2, isR2Configured, deleteFromR2 } from '@/lib/r2';
import { getServerSession } from '@/lib/auth';

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
    const oldUrl = (formData.get('oldUrl') as string | null)?.trim() || '';
    const type = ['frame', 'cover', 'logo', 'proof', 'addon', 'general'].includes(rawType) ? rawType : 'general';

    if (!file) {
      return NextResponse.json({ success: false, error: 'File tidak ditemukan' }, { status: 400 });
    }

    // 1. Strict MIME Type Whitelist
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

    // 2. Safe Extension derived from verified MIME (prevent double extension & executable tricks)
    const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
    const buffer = Buffer.from(await file.arrayBuffer());
    const subFolder =
      type === 'frame'
        ? 'frames'
        : type === 'cover'
          ? 'covers'
          : type === 'logo'
            ? 'logos'
            : type === 'proof'
              ? 'proofs'
              : type === 'addon'
                ? 'addons'
                : 'general';
    const filename = `${type}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;
    const storagePath = `${subFolder}/${filename}`;

    // 1. Primary Upload: Cloudflare R2 (Zero-egress object storage)
    if (isR2Configured) {
      try {
        const r2Url = await uploadBufferToR2(buffer, storagePath, mime || 'image/png');
        if (r2Url) {
          if (oldUrl && oldUrl !== r2Url) {
            await deleteFromR2(oldUrl).catch(() => {});
          }
          return NextResponse.json({
            success: true,
            url: r2Url,
            filename,
            size: file.size
          });
        }
      } catch (r2Err) {
        console.warn('Cloudflare R2 upload error in /api/upload, falling back:', r2Err);
      }
    }

    // 2. Secondary Fallback: Supabase Storage
    if (isSupabaseConfigured && supabase) {
      try {
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

    // 3. Local disk fallback
    try {
      const targetDir = path.join(process.cwd(), 'public', 'uploads', subFolder);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const targetPath = path.join(targetDir, filename);
      fs.writeFileSync(targetPath, buffer);

      const publicUrl = `/uploads/${subFolder}/${filename}`;

      if (oldUrl && oldUrl !== publicUrl && oldUrl.startsWith('/uploads/')) {
        try {
          const oldLocalPath = path.join(process.cwd(), 'public', oldUrl.replace(/^\//, ''));
          if (fs.existsSync(oldLocalPath)) {
            fs.unlinkSync(oldLocalPath);
          }
        } catch {}
      }

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
        error: 'Penyimpanan file gagal. Pastikan Cloudflare R2 atau Supabase Storage telah aktif.'
      }, { status: 500 });
    }
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
