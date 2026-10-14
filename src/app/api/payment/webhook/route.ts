import { NextResponse } from 'next/server';
import { verifyMayarWebhookToken } from '@/lib/mayar';
import { getEventById, updateEvent, getAllVendors, updateVendor, isWebhookProcessed, markWebhookProcessed } from '@/lib/db';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

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

    const description = payload?.data?.description || payload?.description || '';
    const invoiceId = payload?.data?.id || payload?.id;
    const txId = payload?.data?.transactionId || payload?.data?.paymentId || invoiceId;

    // Idempotency check: prevent duplicate credit of wholesale tokens or vendor commissions
    if (txId) {
      const alreadyProcessed = await isWebhookProcessed(String(txId));
      if (alreadyProcessed) {
        console.log(`Mayar Webhook transaction ${txId} already processed (idempotent skipped)`);
        return NextResponse.json({ received: true, message: 'Already processed (idempotent)' });
      }
    }

    // Check if webhook relates to an eventId (Top Up Pax or Package Activation)
    const eventMatch = description.match(/\((sb-[a-zA-Z0-9\-]+|wedding-[a-zA-Z0-9\-]+|event-[a-zA-Z0-9\-]+|[a-zA-Z0-9\-]+)\)/);
    const eventId = eventMatch ? eventMatch[1] : undefined;

    if (eventId) {
      const event = await getEventById(eventId);
      if (event) {
        // If it was an add-on pax payment: FIX double capacity bug by incrementing additionalPax ONLY
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

          // Disburse vendor partner commission if referral was used
          if (event.vendorId && event.commissionAmount && event.commissionAmount > 0 && event.commissionStatus !== 'available') {
            try {
              const vendors = await getAllVendors();
              const matchedVendor = vendors.find(v => v.id === event.vendorId);
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
