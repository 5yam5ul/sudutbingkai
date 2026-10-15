import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { uploadBufferToR2, isR2Configured, deleteFromR2 } from '@/lib/r2';
import { getServerSession } from '@/lib/auth';
import { getAllEvents, getAllVendors, getPayoutRequests, getAllAddons, getAllTestimonials } from '@/lib/db';

const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/quicktime'
]);

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
    const type = ['frame', 'cover', 'logo', 'proof', 'addon', 'testimonial', 'general'].includes(rawType) ? rawType : 'general';

    if (!file) {
      return NextResponse.json({ success: false, error: 'File tidak ditemukan' }, { status: 400 });
    }

    // 1. Strict MIME Type Whitelist
    const mime = (file.type || '').toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(mime)) {
      return NextResponse.json({
        success: false,
        error: 'Format berkas tidak diizinkan. Hanya gambar (PNG, JPG, WebP) dan video (MP4, WebM, MOV) yang diperbolehkan.'
      }, { status: 400 });
    }

    if (type === 'frame' && !mime.includes('png')) {
      return NextResponse.json({ success: false, error: 'Bingkai khusus harus berformat PNG dengan background transparan' }, { status: 400 });
    }

    // 2. Safe Extension derived from verified MIME (prevent double extension & executable tricks)
    const ext =
      mime === 'image/png' ? 'png'
      : mime === 'image/webp' ? 'webp'
      : mime === 'video/mp4' ? 'mp4'
      : mime === 'video/webm' ? 'webm'
      : mime === 'video/quicktime' ? 'mov'
      : 'jpg';
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
                : type === 'testimonial'
                  ? 'testimonials'
                  : 'general';
    const filename = `${type}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;
    const storagePath = `${subFolder}/${filename}`;

    // 1. Primary Upload: Cloudflare R2 (Zero-egress object storage)
    if (isR2Configured) {
      try {
        const r2Url = await uploadBufferToR2(buffer, storagePath, mime || 'image/png');
        if (r2Url) {
          if (oldUrl && oldUrl !== r2Url) {
            await deleteOrphanUploadUrl(oldUrl).catch(() => {});
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

          if (oldUrl && oldUrl !== publicUrlData.publicUrl) {
            await deleteOrphanUploadUrl(oldUrl).catch(() => {});
          }

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

      if (oldUrl && oldUrl !== publicUrl) {
        await deleteOrphanUploadUrl(oldUrl).catch(() => {});
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

const UPLOAD_ASSET_FOLDER_REGEX = /(?:^|\/)(frames|covers|logos|proofs|addons|testimonials|general)\/[a-zA-Z0-9._-]+$/;

async function canSafelyDeleteUploadUrl(targetUrl: string): Promise<{ allowed: boolean; reason?: string }> {
  const clean = targetUrl.trim().split('?')[0];
  if (!clean || !UPLOAD_ASSET_FOLDER_REGEX.test(clean)) {
    return { allowed: false, reason: 'Hanya aset unggahan sementara (frame, cover, logo, proof, addon, testimonial) yang dapat dibersihkan melalui endpoint ini.' };
  }

  const [events, vendors, payouts, addons, testimonials] = await Promise.all([
    getAllEvents().catch(() => []),
    getAllVendors().catch(() => []),
    getPayoutRequests().catch(() => []),
    getAllAddons().catch(() => []),
    getAllTestimonials().catch(() => [])
  ]);

  const isActivelyReferenced =
    events.some(e => e.coverUrl === targetUrl || e.customFrameUrl === targetUrl || e.vendorLogo === targetUrl) ||
    vendors.some(v => v.logoUrl === targetUrl) ||
    payouts.some(p => p.proofUrl === targetUrl) ||
    addons.some(a => a.imagePreviewUrl === targetUrl) ||
    testimonials.some(t => t.videoUrl === targetUrl);

  if (isActivelyReferenced) {
    return { allowed: false, reason: 'Aset sedang digunakan secara aktif oleh data yang telah disimpan.' };
  }

  return { allowed: true };
}

async function deleteOrphanUploadUrl(targetUrl: string): Promise<boolean> {
  const check = await canSafelyDeleteUploadUrl(targetUrl);
  if (!check.allowed) return false;

  // 1. Delete from Cloudflare R2
  await deleteFromR2(targetUrl).catch(() => {});

  // 2. Delete from Supabase Storage if applicable
  if (isSupabaseConfigured && supabase && targetUrl.includes('/photos/')) {
    try {
      const pathPart = targetUrl.split('/photos/')[1];
      if (pathPart) {
        await supabase.storage.from('photos').remove([pathPart]);
      }
    } catch {}
  }

  // 3. Delete from local /public/uploads if applicable
  if (targetUrl.startsWith('/uploads/')) {
    try {
      const uploadsRoot = path.resolve(process.cwd(), 'public', 'uploads');
      const resolvedLocal = path.resolve(process.cwd(), 'public', targetUrl.replace(/^\//, ''));
      if (resolvedLocal.startsWith(uploadsRoot) && fs.existsSync(resolvedLocal)) {
        fs.unlinkSync(resolvedLocal);
      }
    } catch {}
  }

  return true;
}

export async function DELETE(request: Request) {
  try {
    const session = getServerSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Akses ditolak: Sesi login diperlukan.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const targetUrl = (searchParams.get('url') || '').trim();
    if (!targetUrl) {
      return NextResponse.json({ success: false, error: 'Parameter url diperlukan.' }, { status: 400 });
    }

    const check = await canSafelyDeleteUploadUrl(targetUrl);
    if (!check.allowed) {
      return NextResponse.json({
        success: true,
        skipped: true,
        message: check.reason
      });
    }

    await deleteOrphanUploadUrl(targetUrl);
    return NextResponse.json({ success: true, deleted: targetUrl });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
