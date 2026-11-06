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
    const session = getServerSession(req);

    if (!slug && !vendorId && !session?.id && !session?.email) {
      return NextResponse.json({ success: false, error: 'Slug atau vendorId diperlukan' }, { status: 400 });
    }

    let vendor: any = null;

    if (slug) {
      vendor = await getVendorBySlug(slug);
    } else {
      const allVendors = await getAllVendors();
      const lookupId = vendorId || session?.id;
      vendor = allVendors.find(v => 
        (lookupId && isSameVendorId(v.id, lookupId)) || 
        (session?.email && v.email?.toLowerCase() === session.email.toLowerCase())
      );
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
      coverUrl: vendor.coverUrl || vendor.cover_url || '',
      logoUrl: vendor.logoUrl || vendor.logo_url || '',
      city: vendor.city || '',
      instagram: vendor.instagram || '',
      whatsapp: vendor.whatsapp || vendor.phone || '',
      website: vendor.website || '',
      tier: vendor.tier || 'pro',
      partnerTier: vendor.partnerTier || 'regular',
      albums: Array.isArray(vendor.portfolioAlbums) 
        ? vendor.portfolioAlbums 
        : (Array.isArray(vendor.portfolio_albums) ? vendor.portfolio_albums : []),
      theme: vendor.portfolioTheme || vendor.portfolio_theme || {},
      views: Number(vendor.portfolioViews || vendor.portfolio_views || 0),
      whatsappClicks: Number(vendor.portfolioWhatsappClicks || vendor.portfolio_whatsapp_clicks || 0)
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
    const allVendors = await getAllVendors();

    const currentVendor = allVendors.find(v => 
      isSameVendorId(v.id, session.role === 'admin' && body.vendorId ? body.vendorId : session.id) ||
      (session.email && v.email?.toLowerCase() === session.email.toLowerCase())
    );

    const targetVendorId = currentVendor?.id || (session.role === 'admin' && body.vendorId ? body.vendorId : session.id);

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

      // Check uniqueness across other vendors (exclude current vendor)
      const duplicate = allVendors.find(v => 
        (v.slug || '').toLowerCase() === sanitizedSlug && 
        !isSameVendorId(v.id, targetVendorId) &&
        (!session.email || v.email?.toLowerCase() !== session.email.toLowerCase())
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
    if (body.theme !== undefined && typeof body.theme === 'object') updates.portfolioTheme = body.theme;

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
        albums: updated.portfolioAlbums || updated.portfolio_albums || [],
        theme: updated.portfolioTheme || updated.portfolio_theme || {},
        views: Number(updated.portfolioViews ?? updated.portfolio_views ?? 0),
        whatsappClicks: Number(updated.portfolioWhatsappClicks ?? updated.portfolio_whatsapp_clicks ?? 0)
      }
    });
  } catch (error: any) {
    console.error('API /vendors/portfolio PUT error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Gagal menyimpan portofolio' }, { status: 500 });
  }
}
