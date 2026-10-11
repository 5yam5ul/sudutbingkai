import { NextResponse } from 'next/server';
import { verifyMayarWebhookToken } from '@/lib/mayar';
import { getEventById, updateEvent } from '@/lib/db';
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

    // Check if webhook relates to an eventId
    const eventMatch = description.match(/\((wedding-[a-zA-Z0-9\-]+|event-[a-zA-Z0-9\-]+|[a-zA-Z0-9\-]+)\)/);
    const eventId = eventMatch ? eventMatch[1] : undefined;

    if (eventId) {
      const event = await getEventById(eventId);
      if (event) {
        // If it was an add-on pax payment
        if (description.includes('Top Up Kuota Tamu')) {
          const paxMatch = description.match(/\+(\d+)\s*Pax/i);
          const addedPax = paxMatch ? Number(paxMatch[1]) : 25;
          const currentAdditional = event.additionalPax || 0;
          await updateEvent(event.id, {
            additionalPax: currentAdditional + addedPax,
            maxGuests: (event.maxGuests || 150) + addedPax
          });
          console.log(`Event ${event.id} credited with +${addedPax} pax from Mayar invoice ${invoiceId}`);
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
