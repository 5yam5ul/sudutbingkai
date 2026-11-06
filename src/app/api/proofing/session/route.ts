import { NextResponse } from 'next/server';
import { 
  getVendorProofings, 
  getProofingBySlugOrId, 
  saveVendorProofing, 
  updateVendorProofing, 
  deleteVendorProofing,
  getVendorById 
} from '@/lib/db';
import { VendorProofingSession } from '@/lib/types';
import { getServerSession, isSameVendorId } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const id = searchParams.get('id');
    const vendorId = searchParams.get('vendorId');
    const vendorSlug = searchParams.get('vendorSlug');
    const clientSlug = searchParams.get('clientSlug');

    // 1. Single proofing session lookup (Accessible by client or vendor via slug or id)
    const lookupSlug = clientSlug || slug || id;
    if (lookupSlug) {
      const session = await getProofingBySlugOrId(lookupSlug, vendorSlug || undefined);
      if (!session) {
        return NextResponse.json({ success: false, error: 'Sesi proofing tidak ditemukan' }, { status: 404 });
      }

      // Attach latest vendor branding if available
      const vendor = await getVendorById(session.vendorId);
      const computedVendorSlug = vendorSlug || session.vendorSlug || (vendor?.companyName || vendor?.name || 'studio')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      const computedClientSlug = clientSlug || session.clientSlug || (session.slug.includes('/') ? session.slug.split('/')[1] : session.slug);

      const enriched: VendorProofingSession = {
        ...session,
        vendorSlug: computedVendorSlug,
        clientSlug: computedClientSlug,
        vendorName: vendor?.brandName || vendor?.companyName || vendor?.name || session.vendorName || 'Studio Fotografi',
        vendorLogo: vendor?.logoUrl || session.vendorLogo,
        vendorWhatsapp: vendor?.whatsapp || vendor?.phone || session.vendorWhatsapp,
        vendorInstagram: vendor?.instagram || session.vendorInstagram,
        referralCode: vendor?.referralCode || session.referralCode
      };

      return NextResponse.json({ success: true, session: enriched });
    }

    // 2. Querying by vendorId: Strictly requires authenticated matching Vendor or Super Admin
    if (vendorId) {
      const authSession = getServerSession(request);
      if (!authSession) {
        return NextResponse.json({
          success: false,
          error: 'Akses ditolak: Sesi login diperlukan untuk melihat daftar proofing vendor.'
        }, { status: 401 });
      }

      const isAdmin = authSession.role === 'admin';
      const isSelf = authSession.role === 'vendor' && (
        isSameVendorId(authSession.id, vendorId) ||
        (authSession.email && authSession.email.toLowerCase() === vendorId.toLowerCase())
      );

      if (!isAdmin && !isSelf) {
        return NextResponse.json({
          success: false,
          error: 'Akses ditolak: Anda tidak memiliki akses ke sesi proofing vendor lain.'
        }, { status: 403 });
      }

      const list = await getVendorProofings(vendorId);
      return NextResponse.json({ success: true, proofings: list });
    }

    // 3. Unparameterized query: Strictly restricted to Super Admin
    const authSession = getServerSession(request);
    if (!authSession || authSession.role !== 'admin') {
      return NextResponse.json({
        success: false,
        error: 'Akses ditolak: Parameter identitas sesi (slug, id, vendorId) atau sesi Admin diperlukan.'
      }, { status: 403 });
    }

    const all = await getVendorProofings();
    return NextResponse.json({ success: true, proofings: all });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Gagal memuat sesi proofing' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authSession = getServerSession(request);
    if (!authSession) {
      return NextResponse.json({
        success: false,
        error: 'Akses ditolak: Sesi login vendor diperlukan untuk membuat sesi proofing baru.'
      }, { status: 401 });
    }

    const body = await request.json();
    const effectiveVendorId = (body.vendorId || (authSession.role === 'vendor' ? authSession.id : '')).trim();
    const { clientName, gdriveFolderId, quotaLimit, deadlineAt } = body;

    if (!effectiveVendorId || !clientName || !gdriveFolderId) {
      return NextResponse.json({
        success: false,
        error: 'vendorId, clientName, dan gdriveFolderId wajib diisi'
      }, { status: 400 });
    }

    const isAdmin = authSession.role === 'admin';
    const isSelf = authSession.role === 'vendor' && (
      isSameVendorId(authSession.id, effectiveVendorId) ||
      (authSession.email && authSession.email.toLowerCase() === effectiveVendorId.toLowerCase())
    );

    if (!isAdmin && !isSelf) {
      return NextResponse.json({
        success: false,
        error: 'Akses ditolak: Anda hanya dapat membuat sesi proofing untuk akun vendor Anda sendiri.'
      }, { status: 403 });
    }

    // Extract clean folder ID if raw link is pasted
    let cleanFolderId = gdriveFolderId.trim();
    const folderMatch = cleanFolderId.match(/folders\/([a-zA-Z0-9-_]+)/);
    if (folderMatch && folderMatch[1]) {
      cleanFolderId = folderMatch[1];
    } else {
      const idMatch = cleanFolderId.match(/id=([a-zA-Z0-9-_]+)/);
      if (idMatch && idMatch[1]) {
        cleanFolderId = idMatch[1];
      }
    }

    if (!/^[a-zA-Z0-9_-]{5,100}$/.test(cleanFolderId)) {
      return NextResponse.json({
        success: false,
        error: 'Format folder Google Drive tidak valid.'
      }, { status: 400 });
    }

    const vendor = await getVendorById(effectiveVendorId);

    // Generate readable clean vendorSlug and clientSlug
    const rawVendorName = vendor?.brandName || vendor?.companyName || vendor?.name || 'studio';
    const vendorSlug = rawVendorName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'studio';

    const baseClientSlug = clientName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'klien';

    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const clientSlug = baseClientSlug;
    // Final slug format: vendorSlug/clientSlug
    const finalSlug = `${vendorSlug}/${clientSlug}`;

    const newSession: VendorProofingSession = {
      id: `prf_${Date.now()}_${randomSuffix}`,
      vendorId: effectiveVendorId,
      vendorSlug,
      clientSlug,
      vendorName: vendor?.brandName || vendor?.companyName || vendor?.name || 'Studio Fotografi',
      vendorLogo: vendor?.logoUrl,
      vendorWhatsapp: vendor?.whatsapp || vendor?.phone,
      vendorInstagram: vendor?.instagram,
      referralCode: vendor?.referralCode,
      clientName: clientName.trim(),
      slug: finalSlug,
      gdriveFolderId: cleanFolderId,
      quotaLimit: Number(quotaLimit) || 50,
      deadlineAt: deadlineAt || undefined,
      status: 'selecting',
      selectedPhotos: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const saved = await saveVendorProofing(newSession);
    return NextResponse.json({ success: true, session: saved });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Gagal membuat sesi proofing' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, selectedPhotos, status, quotaLimit, deadlineAt, clientName } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'id sesi diperlukan' }, { status: 400 });
    }

    const existingSession = await getProofingBySlugOrId(id);
    if (!existingSession) {
      return NextResponse.json({ success: false, error: 'Sesi proofing tidak ditemukan' }, { status: 404 });
    }

    const authSession = getServerSession(request);
    const isAdmin = authSession?.role === 'admin';
    const isVendorOwner = Boolean(
      authSession?.role === 'vendor' && isSameVendorId(authSession.id, existingSession.vendorId)
    );

    // If client submits photos from the public proofing page:
    // Only allow updating selectedPhotos and status: 'submitted'
    const isClientSubmission = Boolean(
      Array.isArray(selectedPhotos) &&
      (status === 'submitted' || status === 'selecting' || status === undefined) &&
      quotaLimit === undefined &&
      deadlineAt === undefined &&
      clientName === undefined
    );

    if (!isAdmin && !isVendorOwner && !isClientSubmission) {
      return NextResponse.json({
        success: false,
        error: 'Akses ditolak: Anda tidak memiliki wewenang untuk mengubah pengaturan sesi proofing ini.'
      }, { status: 403 });
    }

    const updates: Partial<VendorProofingSession> = {};
    if (Array.isArray(selectedPhotos)) {
      updates.selectedPhotos = selectedPhotos;
    }
    if (status) {
      updates.status = status;
      if (status === 'submitted') {
        updates.submittedAt = new Date().toISOString();
      }
    }

    // Administrative updates strictly gated to Vendor owner or Admin
    if (isAdmin || isVendorOwner) {
      if (quotaLimit !== undefined) updates.quotaLimit = Number(quotaLimit);
      if (deadlineAt !== undefined) updates.deadlineAt = deadlineAt;
      if (clientName) updates.clientName = clientName.trim();
    }

    const updated = await updateVendorProofing(id, updates);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Sesi proofing tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ success: true, session: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Gagal memperbarui sesi proofing' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const authSession = getServerSession(request);
    if (!authSession) {
      return NextResponse.json({
        success: false,
        error: 'Akses ditolak: Sesi login diperlukan untuk menghapus sesi proofing.'
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'id sesi diperlukan' }, { status: 400 });
    }

    const existingSession = await getProofingBySlugOrId(id);
    if (!existingSession) {
      return NextResponse.json({ success: false, error: 'Sesi proofing tidak ditemukan' }, { status: 404 });
    }

    const isAdmin = authSession.role === 'admin';
    const isVendorOwner = authSession.role === 'vendor' && isSameVendorId(authSession.id, existingSession.vendorId);

    if (!isAdmin && !isVendorOwner) {
      return NextResponse.json({
        success: false,
        error: 'Akses ditolak: Anda hanya dapat menghapus sesi proofing milik vendor Anda sendiri.'
      }, { status: 403 });
    }

    const deleted = await deleteVendorProofing(id);
    return NextResponse.json({ success: deleted });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Gagal menghapus sesi proofing' }, { status: 500 });
  }
}
