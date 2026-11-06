import { NextResponse } from 'next/server';
import { getAllVendors, getVendorBySlug, updateVendorPortfolio } from '@/lib/db';
import { getServerSession, isSameVendorId } from '@/lib/auth';

const RESERVED_SLUGS = new Set([
  'admin', 'vendor', 'login', 'create', 'api', 'proof', 
  'dashboard', 'panduan', 'cam', 'event', 'invoice', 
  'feed.xml', 'sitemap.xml', 'robots.txt', 'manifest.webmanifest'
]);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');
    const vendorId = searchParams.get('vendorId');

    if (!slug && !vendorId) {
      return NextResponse.json({ success: false, error: 'Slug atau vendorId diperlukan' }, { status: 400 });
    }

    let vendor: any = null;

    if (slug) {
      vendor = await getVendorBySlug(slug);
    } else if (vendorId) {
      const allVendors = await getAllVendors();
      vendor = allVendors.find(v => isSameVendorId(v.id, vendorId));
    }

    if (!vendor) {
      return NextResponse.json({ success: false, error: 'Portofolio vendor tidak ditemukan' }, { status: 404 });
    }

    // Return public portfolio representation
    const publicProfile = {
      id: vendor.id,
      name: vendor.name,
      companyName: vendor.companyName || vendor.name,
      slug: vendor.slug || (vendor.companyName || vendor.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
      bio: vendor.bio || '',
      coverUrl: vendor.coverUrl || '',
      logoUrl: vendor.logoUrl || '',
      city: vendor.city || '',
      instagram: vendor.instagram || '',
      whatsapp: vendor.whatsapp || vendor.phone || '',
      website: vendor.website || '',
      tier: vendor.tier || 'pro',
      partnerTier: vendor.partnerTier || 'regular',
      albums: Array.isArray(vendor.portfolioAlbums) ? vendor.portfolioAlbums : []
    };

    return NextResponse.json({ success: true, portfolio: publicProfile });
  } catch (error: any) {
    console.error('API /vendors/portfolio GET error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Gagal memuat portofolio' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = getServerSession(req);
    if (!session || (session.role !== 'vendor' && session.role !== 'admin')) {
      return NextResponse.json({ success: false, error: 'Sesi tidak valid atau tidak memiliki izin' }, { status: 401 });
    }

    const body = await req.json();
    const targetVendorId = session.role === 'admin' && body.vendorId ? body.vendorId : session.id;

    if (!targetVendorId) {
      return NextResponse.json({ success: false, error: 'ID vendor tidak valid' }, { status: 400 });
    }

    // Validate and sanitize slug
    let sanitizedSlug: string | undefined = undefined;
    if (body.slug !== undefined) {
      const rawSlug = String(body.slug).trim().toLowerCase();
      sanitizedSlug = rawSlug.replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');

      if (!sanitizedSlug || sanitizedSlug.length < 2) {
        return NextResponse.json({ 
          success: false, 
          error: 'Slug URL minimal 2 karakter dan hanya boleh berisi huruf kecil, angka, atau tanda strip (-)' 
        }, { status: 400 });
      }

      if (RESERVED_SLUGS.has(sanitizedSlug)) {
        return NextResponse.json({ 
          success: false, 
          error: `Slug "${sanitizedSlug}" tidak dapat digunakan karena merupakan rute sistem.` 
        }, { status: 400 });
      }

      // Check uniqueness across other vendors
      const allVendors = await getAllVendors();
      const duplicate = allVendors.find(v => 
        (v.slug || '').toLowerCase() === sanitizedSlug && !isSameVendorId(v.id, targetVendorId)
      );

      if (duplicate) {
        return NextResponse.json({ 
          success: false, 
          error: `Slug "${sanitizedSlug}" sudah digunakan oleh vendor lain. Silakan pilih slug lain.` 
        }, { status: 409 });
      }
    }

    // Build updates payload
    const updates: Record<string, any> = {};
    if (sanitizedSlug !== undefined) updates.slug = sanitizedSlug;
    if (body.bio !== undefined) updates.bio = String(body.bio).trim();
    if (body.coverUrl !== undefined) updates.coverUrl = body.coverUrl;
    if (body.whatsapp !== undefined) updates.whatsapp = String(body.whatsapp).trim();
    if (body.website !== undefined) updates.website = String(body.website).trim();
    if (body.instagram !== undefined) updates.instagram = String(body.instagram).trim();

    if (Array.isArray(body.albums)) {
      // Validate each album
      const sanitizedAlbums = body.albums.map((album: any, idx: number) => ({
        id: album.id || `alb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        title: String(album.title || 'Album Tanpa Judul').trim(),
        description: album.description ? String(album.description).trim() : '',
        driveFolderUrl: String(album.driveFolderUrl || '').trim(),
        coverImageUrl: album.coverImageUrl ? String(album.coverImageUrl).trim() : '',
        photoCount: typeof album.photoCount === 'number' ? album.photoCount : undefined,
        order: typeof album.order === 'number' ? album.order : idx,
        createdAt: album.createdAt || new Date().toISOString()
      }));
      updates.portfolioAlbums = sanitizedAlbums;
    }

    const updated = await updateVendorPortfolio(targetVendorId, updates);

    if (!updated) {
      return NextResponse.json({ success: false, error: 'Vendor tidak ditemukan untuk diperbarui' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      portfolio: {
        id: updated.id,
        name: updated.name,
        companyName: updated.companyName || updated.name,
        slug: updated.slug,
        bio: updated.bio,
        coverUrl: updated.coverUrl,
        logoUrl: updated.logoUrl,
        city: updated.city,
        instagram: updated.instagram,
        whatsapp: updated.whatsapp,
        website: updated.website,
        albums: updated.portfolioAlbums || []
      }
    });
  } catch (error: any) {
    console.error('API /vendors/portfolio PUT error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Gagal menyimpan portofolio' }, { status: 500 });
  }
}
