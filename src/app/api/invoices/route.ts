import { NextResponse } from 'next/server';
import { getInvoice, createInvoice, getEventById } from '@/lib/db';
import { PACKAGE_TIERS, EventPackageTier } from '@/lib/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const eventId = searchParams.get('eventId');
    const query = id || eventId;

    if (!query) {
      return NextResponse.json({ success: false, error: 'Parameter id atau eventId diperlukan' }, { status: 400 });
    }

    let invoice = await getInvoice(query);

    // If not found in invoice database, check if it corresponds to an existing event and auto-generate invoice
    if (!invoice && (eventId || query)) {
      const targetEventId = eventId || query;
      const event = await getEventById(targetEventId);

      if (event) {
        const tierKey = (event.packageTier || 'wedding') as EventPackageTier;
        const tierInfo = PACKAGE_TIERS[tierKey] || PACKAGE_TIERS.wedding;
        const rawPrice = parseInt(tierInfo.price.replace(/[^0-9]/g, ''), 10) || 499000;
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
