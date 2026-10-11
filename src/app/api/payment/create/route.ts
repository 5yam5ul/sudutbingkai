import { NextResponse } from 'next/server';
import { createMayarInvoice, isMayarConfigured } from '@/lib/mayar';
import { EventPackageTier, PACKAGE_TIERS } from '@/lib/types';

// Price map in IDR
const TIER_PRICES: Record<EventPackageTier, number> = {
  starter: 0,
  mini: 54000,
  small: 89000,
  party: 179000,
  event: 269000,
  wedding: 349000,
  unlimited: 599000,
};

const ADDON_PAX_PRICES: Record<number, number> = {
  25: 49000,
  50: 89000,
  100: 159000,
  250: 349000,
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      packageTier = 'wedding', 
      name = 'Tuan Rumah', 
      email = 'customer@sudutbingkai.id', 
      mobile, 
      eventId, 
      isAddonPax = false, 
      paxAmount = 25, 
      isWholesale = false,
      wholesaleTitle = 'Paket Grosir',
      eventsCount = 5,
      redirectUrl 
    } = body;

    let amount = 0;
    let description = '';

    if (isWholesale) {
      amount = Number(body.amount) || 1120000;
      description = `Paket Grosir WO ${wholesaleTitle} (${eventsCount} Acara) - SudutBingkai`;
    } else if (isAddonPax) {
      amount = ADDON_PAX_PRICES[paxAmount] || (paxAmount * 2000);
      description = `Top Up Kuota Tamu +${paxAmount} Pax - SudutBingkai (${eventId || 'Acara'})`;
    } else {
      const tierKey = packageTier as EventPackageTier;
      amount = TIER_PRICES[tierKey] ?? 349000;
      const tierInfo = PACKAGE_TIERS[tierKey];
      description = `Paket ${tierInfo?.name || 'Wedding'} (${tierInfo?.guestsLabel || '300 Tamu'}) - SudutBingkai`;
    }

    // Free starter tier doesn't need payment
    if (amount <= 0) {
      return NextResponse.json({
        success: true,
        isFree: true,
        amount: 0,
        message: 'Paket Starter gratis aktif tanpa pembayaran.'
      });
    }

    const hostUrl = request.headers.get('origin') || 'http://localhost:3000';
    const finalRedirectUrl = redirectUrl || (
      isWholesale ? `${hostUrl}/vendor?paid=true` :
      eventId ? `${hostUrl}/event/${eventId}?paid=true` : 
      `${hostUrl}/create?tier=${packageTier}&paid=true`
    );

    const invoiceResult = await createMayarInvoice({
      name,
      email,
      mobile,
      amount,
      description,
      redirectUrl: finalRedirectUrl,
      packageTier: isWholesale ? 'wedding' : packageTier,
      eventId,
      isAddonPax,
      paxAmount
    });

    return NextResponse.json({
      ...invoiceResult,
      isConfigured: isMayarConfigured
    });
  } catch (error: unknown) {
    console.error('Payment create error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
