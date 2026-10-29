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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const id = searchParams.get('id');
    const vendorId = searchParams.get('vendorId');

    if (slug || id) {
      const session = await getProofingBySlugOrId((slug || id) as string);
      if (!session) {
        return NextResponse.json({ success: false, error: 'Sesi proofing tidak ditemukan' }, { status: 404 });
      }

      // Attach latest vendor branding if available
      const vendor = await getVendorById(session.vendorId);
      const enriched: VendorProofingSession = {
        ...session,
        vendorName: vendor?.brandName || vendor?.name || session.vendorName || 'Studio Fotografi',
        vendorLogo: vendor?.logoUrl || session.vendorLogo,
        vendorWhatsapp: vendor?.whatsapp || session.vendorWhatsapp
      };

      return NextResponse.json({ success: true, session: enriched });
    }

    if (vendorId) {
      const list = await getVendorProofings(vendorId);
      return NextResponse.json({ success: true, proofings: list });
    }

    const all = await getVendorProofings();
    return NextResponse.json({ success: true, proofings: all });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Gagal memuat sesi proofing' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { vendorId, clientName, gdriveFolderId, quotaLimit, deadlineAt } = body;

    if (!vendorId || !clientName || !gdriveFolderId) {
      return NextResponse.json({
        success: false,
        error: 'vendorId, clientName, dan gdriveFolderId wajib diisi'
      }, { status: 400 });
    }

    // Extract clean folder ID if raw link is pasted
    let cleanFolderId = gdriveFolderId.trim();
    const folderMatch = cleanFolderId.match(/folders\/([a-zA-Z0-9-_]+)/);
    if (folderMatch && folderMatch[1]) {
      cleanFolderId = folderMatch[1];
    }

    // Generate readable clean slug
    const baseSlug = clientName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const finalSlug = `${baseSlug || 'klien'}-${randomSuffix}`;

    const vendor = await getVendorById(vendorId);

    const newSession: VendorProofingSession = {
      id: `prf_${Date.now()}_${randomSuffix}`,
      vendorId,
      vendorName: vendor?.brandName || vendor?.name || 'Studio Fotografi',
      vendorLogo: vendor?.logoUrl,
      vendorWhatsapp: vendor?.whatsapp,
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
    if (quotaLimit !== undefined) updates.quotaLimit = Number(quotaLimit);
    if (deadlineAt !== undefined) updates.deadlineAt = deadlineAt;
    if (clientName) updates.clientName = clientName.trim();

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
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'id sesi diperlukan' }, { status: 400 });
    }

    const deleted = await deleteVendorProofing(id);
    return NextResponse.json({ success: deleted });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Gagal menghapus sesi proofing' }, { status: 500 });
  }
}
