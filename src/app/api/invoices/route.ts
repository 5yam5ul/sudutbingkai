import { NextResponse } from 'next/server';
import { getInvoice, createInvoice, getEventById, getAllInvoices, updateInvoice, deleteInvoice } from '@/lib/db';
import { PACKAGE_TIERS, EventPackageTier } from '@/lib/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const eventId = searchParams.get('eventId');
    const query = id || eventId;

    // If no specific query is provided, return all invoices (for Admin Dashboard)
    if (!query) {
      const invoices = await getAllInvoices();
      return NextResponse.json({ success: true, invoices });
    }

    let invoice = await getInvoice(query);

    // If not found in invoice database, check if it corresponds to an existing event and auto-generate invoice
    if (!invoice && (eventId || query)) {
      const targetEventId = eventId || query;
      const event = await getEventById(targetEventId);

      if (event) {
        const tierKey = (event.packageTier || 'wedding') as EventPackageTier;
        const tierInfo = PACKAGE_TIERS[tierKey] || PACKAGE_TIERS.wedding;
        const rawPrice = tierInfo.isFree || tierKey === 'starter' 
          ? 0 
          : (parseInt(tierInfo.price.replace(/[^0-9]/g, ''), 10) || 0);
        const discount = event.referralCodeUsed ? Math.round(rawPrice * 0.1) : 0;
        const finalAmount = rawPrice - discount;

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
          status: 'paid',
          paidAt: event.createdAt,
          createdAt: event.createdAt
        });
      }
    }

    if (!invoice) {
      return NextResponse.json({ success: false, error: 'Invoice tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ success: true, invoice });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.buyerName || !body.tierId || !body.finalAmount) {
      return NextResponse.json({ success: false, error: 'Data invoice tidak lengkap' }, { status: 400 });
    }

    const invoice = await createInvoice(body);
    return NextResponse.json({ success: true, invoice });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
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

    return NextResponse.json({ success: true, invoice: updated });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
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
