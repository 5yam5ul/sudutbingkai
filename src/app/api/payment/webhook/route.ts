import { NextResponse } from 'next/server';
import { verifyMayarWebhookToken } from '@/lib/mayar';
import { getEventById, updateEvent, getAllVendors, updateVendor } from '@/lib/db';
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

    // 1. Check if webhook relates to Wholesale WO Packages
    if (description.includes('Paket Grosir WO')) {
      const countMatch = description.match(/\((\d+)\s*Acara\)/i);
      const addedTokens = countMatch ? Number(countMatch[1]) : 5;
      const vendorMatch = description.match(/\((vendor_[a-zA-Z0-9_\-]+)\)/);
      const vendorId = vendorMatch ? vendorMatch[1] : undefined;
      const customerEmail = (payload?.data?.email || payload?.email || '').trim().toLowerCase();

      try {
        const vendors = await getAllVendors();
        const matchedVendor = vendors.find(v => 
          (vendorId && v.id === vendorId) || 
          (customerEmail && v.email && v.email.toLowerCase() === customerEmail)
        );

        if (matchedVendor) {
          const currentTokens = Number(matchedVendor.wholesaleTokens || 0);
          const currentClients = Number(matchedVendor.clientCount || 0);
          await updateVendor(matchedVendor.id, {
            wholesaleTokens: currentTokens + addedTokens,
            clientCount: currentClients + addedTokens
          });
          console.log(`Mitra ${matchedVendor.name} (${matchedVendor.id}) credited with +${addedTokens} wholesale vouchers from Mayar`);
        }
      } catch (err) {
        console.warn('Error crediting wholesale tokens in webhook:', err);
      }
    }

    // 2. Check if webhook relates to an eventId (Top Up Pax or Package Activation)
    const eventMatch = description.match(/\((sb-[a-zA-Z0-9\-]+|wedding-[a-zA-Z0-9\-]+|event-[a-zA-Z0-9\-]+|[a-zA-Z0-9\-]+)\)/);
    const eventId = eventMatch ? eventMatch[1] : undefined;

    if (eventId && !description.includes('Paket Grosir WO')) {
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

    // Save payment log in Supabase if table exists
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('payment_transactions').insert({
          id: `tx_${invoiceId || Date.now()}`,
          provider: 'mayar',
          amount: payload?.data?.amount || 0,
          customer_name: payload?.data?.name || payload?.data?.customerName,
          customer_email: payload?.data?.email,
          status: 'PAID',
          description,
          event_id: eventId || null,
          created_at: new Date().toISOString()
        });
      } catch {
        // Ignore table missing error
      }
    }

    return NextResponse.json({ received: true, success: true });
  } catch (error: unknown) {
    console.error('Mayar webhook processing error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
