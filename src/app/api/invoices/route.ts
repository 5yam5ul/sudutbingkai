import { NextResponse } from 'next/server';
import { getInvoice, createInvoice, getEventById, getAllInvoices, updateInvoice, deleteInvoice, updateEvent, getAllVendors, updateVendor } from '@/lib/db';
import { PACKAGE_TIERS, EventPackageTier } from '@/lib/types';
import { getServerSession, isSameVendorId } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const eventId = searchParams.get('eventId');
    const query = id || eventId;
    const session = getServerSession(request);

    // If no specific query is provided, return all invoices strictly for Super Admin Dashboard
    if (!query) {
      if (!session || session.role !== 'admin') {
        return NextResponse.json({
          success: false,
          error: 'Akses ditolak: Parameter query faktur (id, eventId) atau sesi Admin diperlukan.'
        }, { status: 403 });
      }

      const invoices = await getAllInvoices();
      return NextResponse.json({ success: true, invoices });
    }

    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Akses ditolak: Sesi login diperlukan untuk melihat faktur.'
      }, { status: 401 });
    }

    let invoice = await getInvoice(query);

    // If not found in invoice database, check if it corresponds to an existing event and auto-generate invoice
    if (!invoice && (eventId || query)) {
      const targetEventId = eventId || query;
      const event = await getEventById(targetEventId);

      if (event) {
        const isOwnerHost = session.role === 'host' && (
          session.email?.toLowerCase() === event.hostEmail?.toLowerCase() ||
          session.id === event.hostEmail
        );
        const isOwnerVendor = session.role === 'vendor' && isSameVendorId(session.id, event.vendorId);
        const isAdmin = session.role === 'admin';
        if (!isOwnerHost && !isOwnerVendor && !isAdmin) {
          return NextResponse.json({ success: false, error: 'Akses ditolak: Anda tidak memiliki akses ke faktur acara ini.' }, { status: 403 });
        }

        const tierKey = (event.packageTier || 'wedding') as EventPackageTier;
        const tierInfo = PACKAGE_TIERS[tierKey] || PACKAGE_TIERS.wedding;
        const rawPrice = tierInfo.isFree || tierKey === 'starter' 
          ? 0 
          : (parseInt(tierInfo.price.replace(/[^0-9]/g, ''), 10) || 0);
        const discount = event.referralCodeUsed ? Math.round(rawPrice * 0.1) : 0;
        const finalAmount = rawPrice - discount;
        const isEventPaid = tierInfo.isFree || tierKey === 'starter' || event.paymentStatus === 'paid';

        invoice = await createInvoice({
          id: `inv_${event.id}`,
          eventId: event.id,
          orderId: `ord_${event.id.substring(0, 10)}`,
          buyerType: event.vendorId ? 'vendor' : 'client',
          buyerName: event.coupleOrHost || event.title,
          buyerEmail: event.hostEmail || 'pengantin@sudutbingkai.id',
          companyName: event.vendorName,
          tierId: tierKey,
          tierName: `${tierInfo.name} (${tierInfo.guestsLabel})`,
          originalPrice: rawPrice,
          discountAmount: discount,
          discountCode: event.referralCodeUsed,
          finalAmount: finalAmount,
          paymentMethod: 'qris',
          status: isEventPaid ? 'paid' : 'pending',
          paidAt: isEventPaid ? event.createdAt : undefined,
          createdAt: event.createdAt
        });
      }
    }

    if (!invoice) {
      return NextResponse.json({ success: false, error: 'Invoice tidak ditemukan' }, { status: 404 });
    }

    // Verify ownership of the resolved invoice before returning PII
    let linkedEvent = invoice.eventId ? await getEventById(invoice.eventId) : null;
    const isAdmin = session.role === 'admin';
    const isOwnerByEmail = Boolean(
      session.email && invoice.buyerEmail && session.email.toLowerCase() === invoice.buyerEmail.toLowerCase()
    );
    const isOwnerByEventHost = Boolean(
      linkedEvent && session.role === 'host' && (
        session.email?.toLowerCase() === linkedEvent.hostEmail?.toLowerCase() ||
        session.id === linkedEvent.hostEmail
      )
    );
    const isOwnerByEventVendor = Boolean(
      linkedEvent && session.role === 'vendor' && isSameVendorId(session.id, linkedEvent.vendorId)
    );

    if (!isAdmin && !isOwnerByEmail && !isOwnerByEventHost && !isOwnerByEventVendor) {
      return NextResponse.json({
        success: false,
        error: 'Akses ditolak: Anda tidak memiliki wewenang untuk mengakses faktur ini.'
      }, { status: 403 });
    }

    if (linkedEvent?.slug) {
      (invoice as any).eventSlug = linkedEvent.slug;
    }

    return NextResponse.json({ success: true, invoice });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = getServerSession(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Akses ditolak: Hanya Admin yang dapat menerbitkan invoice secara manual' }, { status: 403 });
    }

    const body = await request.json();
    if (!body.buyerName || !body.tierId || body.finalAmount === undefined) {
      return NextResponse.json({ success: false, error: 'Data invoice tidak lengkap' }, { status: 400 });
    }

    const tierKey = (body.tierId || 'wedding') as EventPackageTier;
    const tierInfo = PACKAGE_TIERS[tierKey] || PACKAGE_TIERS.wedding;

    const payload = {
      ...body,
      buyerName: body.buyerName.trim(),
      buyerEmail: (body.buyerEmail || 'pengantin@sudutbingkai.id').trim(),
      buyerPhone: body.buyerPhone ? body.buyerPhone.trim() : undefined,
      buyerType: body.buyerType || 'client',
      tierId: tierKey,
      tierName: body.tierName || `${tierInfo.name} (${tierInfo.guestsLabel})`,
      originalPrice: Number(body.originalPrice ?? body.finalAmount ?? 0),
      discountAmount: Number(body.discountAmount || 0),
      finalAmount: Number(body.finalAmount ?? body.originalPrice ?? 0),
      paymentMethod: body.paymentMethod || 'qris',
      status: body.status || 'paid',
      orderId: body.orderId || `ord_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`
    };

    const invoice = await createInvoice(payload);
    return NextResponse.json({ success: true, invoice });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = getServerSession(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Akses ditolak: Hanya Admin yang dapat memperbarui invoice' }, { status: 403 });
    }

    const body = await request.json();
    const id = body.id || body.invoiceNumber;
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID invoice diperlukan' }, { status: 400 });
    }

    const updates: any = {};
    if (body.status !== undefined) updates.status = body.status;
    if (body.finalAmount !== undefined) updates.finalAmount = Number(body.finalAmount);
    if (body.originalPrice !== undefined) updates.originalPrice = Number(body.originalPrice);
    if (body.discountAmount !== undefined) updates.discountAmount = Number(body.discountAmount);
    if (body.discountCode !== undefined) updates.discountCode = body.discountCode;
    if (body.buyerName !== undefined) updates.buyerName = body.buyerName.trim();
    if (body.buyerEmail !== undefined) updates.buyerEmail = body.buyerEmail.trim();
    if (body.buyerPhone !== undefined) updates.buyerPhone = body.buyerPhone.trim();
    if (body.paymentMethod !== undefined) updates.paymentMethod = body.paymentMethod;
    if (body.paidAt !== undefined) updates.paidAt = body.paidAt;

    if (updates.status === 'paid' && !updates.paidAt) {
      updates.paidAt = new Date().toISOString();
    }

    const updated = await updateInvoice(id, updates);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Invoice tidak ditemukan' }, { status: 404 });
    }

    // Synchronize linked event paymentStatus and vendor commission when invoice status is updated
    if (updated.eventId && updates.status) {
      try {
        const linkedEvent = await getEventById(updated.eventId);
        if (linkedEvent) {
          if (updates.status === 'paid' && linkedEvent.paymentStatus !== 'paid') {
            const eventUpdates: any = { paymentStatus: 'paid' };
            if (linkedEvent.vendorId && linkedEvent.commissionAmount && linkedEvent.commissionAmount > 0 && linkedEvent.commissionStatus !== 'available') {
              const vendors = await getAllVendors();
              const matchedVendor = vendors.find(v => isSameVendorId(v.id, linkedEvent.vendorId));
              if (matchedVendor && matchedVendor.status !== 'suspended') {
                await updateVendor(matchedVendor.id, {
                  walletBalance: (matchedVendor.walletBalance || 0) + linkedEvent.commissionAmount,
                  totalEarnings: (matchedVendor.totalEarnings || 0) + linkedEvent.commissionAmount
                });
                eventUpdates.commissionStatus = 'available';
              }
            }
            await updateEvent(linkedEvent.id, eventUpdates);
          } else if ((updates.status === 'pending' || updates.status === 'cancelled') && linkedEvent.paymentStatus === 'paid') {
            const revertUpdates: any = { paymentStatus: 'pending' };
            if (linkedEvent.vendorId && linkedEvent.commissionAmount && linkedEvent.commissionAmount > 0 && linkedEvent.commissionStatus === 'available') {
              const vendors = await getAllVendors();
              const matchedVendor = vendors.find(v => isSameVendorId(v.id, linkedEvent.vendorId));
              if (matchedVendor) {
                await updateVendor(matchedVendor.id, {
                  walletBalance: Math.max(0, (matchedVendor.walletBalance || 0) - linkedEvent.commissionAmount),
                  totalEarnings: Math.max(0, (matchedVendor.totalEarnings || 0) - linkedEvent.commissionAmount)
                });
              }
              revertUpdates.commissionStatus = 'pending';
            }
            await updateEvent(linkedEvent.id, revertUpdates);
          }
        }
      } catch (e) {
        console.warn('Sinkronisasi status acara dari invoice gagal:', e);
      }
    }

    return NextResponse.json({ success: true, invoice: updated });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = getServerSession(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Akses ditolak: Hanya Admin yang dapat menghapus invoice' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Parameter id diperlukan' }, { status: 400 });
    }

    const success = await deleteInvoice(id);
    if (!success) {
      return NextResponse.json({ success: false, error: 'Gagal menghapus invoice' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Invoice berhasil dihapus' });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

