import { NextResponse } from 'next/server';
import { verifyMayarWebhookToken } from '@/lib/mayar';
import { getEventById, updateEvent, getAllVendors, updateVendor, isWebhookProcessed, markWebhookProcessed, getInvoice, createInvoice, updateInvoiceStatus } from '@/lib/db';
import { PACKAGE_TIERS, EventPackageTier } from '@/lib/types';
import { isSameVendorId } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const tokenHeader = request.headers.get('x-mayar-token');
    const isValid = verifyMayarWebhookToken(tokenHeader);

    if (!isValid) {
      console.warn('Unauthorized Mayar webhook token:', tokenHeader);
      return NextResponse.json({ error: 'Unauthorized webhook' }, { status: 401 });
    }

    const payload = await request.json();
    console.log('Received Mayar Webhook Event:', payload?.event || payload?.type);

    const eventStatus = payload?.status || payload?.data?.status;
    const isSuccess = eventStatus === 'PAID' || eventStatus === 'SUCCESS' || eventStatus === 'SETTLED';

    if (!isSuccess) {
      return NextResponse.json({ received: true, status: 'ignored' });
    }

    const description: string = payload?.data?.description || payload?.description || '';
    const invoiceId = payload?.data?.id || payload?.id;
    const txId = payload?.data?.transactionId || payload?.data?.paymentId || invoiceId;

    // Idempotency check: prevent duplicate credit of vendor commissions or pax
    if (txId) {
      const alreadyProcessed = await isWebhookProcessed(String(txId));
      if (alreadyProcessed) {
        console.log(`Mayar Webhook transaction ${txId} already processed (idempotent skipped)`);
        return NextResponse.json({ received: true, message: 'Already processed (idempotent)' });
      }
    }

    // Extract eventId from the LAST parenthesized token in description (e.g. "Paket Wedding (300 Tamu) - SudutBingkai (sb-123456)")
    const parenMatches = Array.from(description.matchAll(/\(([^()]+)\)/g));
    const lastParenValue = parenMatches.length > 0 ? parenMatches[parenMatches.length - 1][1].trim() : undefined;
    const eventId = payload?.data?.extraData?.eventId || payload?.extraData?.eventId || lastParenValue;

    if (eventId) {
      const event = await getEventById(eventId);
      if (event) {
        // If it was an add-on pax payment: increment additionalPax ONLY
        if (description.includes('Top Up Kuota Tamu')) {
          const paxMatch = description.match(/\+(\d+)\s*Pax/i);
          const addedPax = paxMatch ? Number(paxMatch[1]) : 25;
          const currentAdditional = event.additionalPax || 0;
          await updateEvent(event.id, {
            additionalPax: currentAdditional + addedPax
          });
          console.log(`Event ${event.id} credited with +${addedPax} pax (total additional: ${currentAdditional + addedPax})`);
        } else {
          // It was a package purchase: activate event and disburse partner commission if applicable
          await updateEvent(event.id, {
            paymentStatus: 'paid'
          });

          // Ensure official InvoiceRecord is created or marked paid for Super Admin & Host receipt
          try {
            const existingInv = await getInvoice(event.id);
            if (existingInv) {
              await updateInvoiceStatus(existingInv.id, 'paid', new Date().toISOString());
            } else {
              const tierKey = (event.packageTier || 'wedding') as EventPackageTier;
              const tierInfo = PACKAGE_TIERS[tierKey] || PACKAGE_TIERS.wedding;
              const rawPrice = parseInt(tierInfo.price.replace(/[^0-9]/g, ''), 10) || Number(payload?.data?.amount) || 0;
              const discount = event.referralCodeUsed ? Math.round(rawPrice * 0.1) : 0;
              const finalAmount = Number(payload?.data?.amount) || Math.max(0, rawPrice - discount);

              await createInvoice({
                id: `inv_${event.id}`,
                eventId: event.id,
                orderId: String(txId || `ord_${event.id.substring(0, 10)}`),
                buyerType: event.vendorId ? 'vendor' : 'client',
                buyerName: event.coupleOrHost || event.title,
                buyerEmail: event.hostEmail || payload?.data?.email || 'pengantin@sudutbingkai.id',
                companyName: event.vendorName,
                tierId: tierKey,
                tierName: `${tierInfo.name} (${tierInfo.guestsLabel})`,
                originalPrice: rawPrice,
                discountAmount: discount,
                discountCode: event.referralCodeUsed,
                finalAmount,
                paymentMethod: 'qris',
                status: 'paid',
                paidAt: new Date().toISOString(),
                createdAt: new Date().toISOString()
              });
            }
          } catch (invErr) {
            console.warn('Error creating/updating invoice in webhook:', invErr);
          }

          // Disburse vendor partner commission if referral was used
          if (event.vendorId && event.commissionAmount && event.commissionAmount > 0 && event.commissionStatus !== 'available') {
            try {
              const vendors = await getAllVendors();
              const matchedVendor = vendors.find(v => isSameVendorId(v.id, event.vendorId));
              if (matchedVendor) {
                await updateVendor(matchedVendor.id, {
                  walletBalance: (matchedVendor.walletBalance || 0) + event.commissionAmount,
                  totalEarnings: (matchedVendor.totalEarnings || 0) + event.commissionAmount
                });
                await updateEvent(event.id, { commissionStatus: 'available' });
                console.log(`Disbursed commission Rp ${event.commissionAmount} to vendor ${matchedVendor.id} for event ${event.id}`);
              }
            } catch (vErr) {
              console.warn('Error disbursing vendor commission:', vErr);
            }
          }
        }
      }
    }

    // Record transaction idempotency and save payment log (Supabase + local JSON)
    if (txId) {
      await markWebhookProcessed(String(txId), {
        provider: 'mayar',
        amount: payload?.data?.amount || 0,
        customer_name: payload?.data?.name || payload?.data?.customerName,
        customer_email: payload?.data?.email,
        description,
        event_id: eventId || null
      });
    }

    return NextResponse.json({ received: true, success: true });
  } catch (error: unknown) {
    console.error('Mayar webhook processing error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
