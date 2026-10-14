import { NextResponse } from 'next/server';
import { createMayarInvoice, isMayarConfigured } from '@/lib/mayar';
import { EventPackageTier, PACKAGE_TIERS } from '@/lib/types';
import { getEventById, getAllVendors } from '@/lib/db';

// Price map in IDR (synced with PACKAGE_TIERS)
const TIER_PRICES: Record<EventPackageTier, number> = {
  starter: 0,
  intimate: 129000,
  wedding: 499000,
  unlimited: 999000,
  mini: 54000,
  small: 89000,
  party: 179000,
  event: 269000,
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
      referralCode,
      redirectUrl,
    } = body;

    let amount = 0;
    let description = '';
    let targetEventSlugOrId = eventId;
    let existingEvent = null;

    if (eventId) {
      try {
        existingEvent = await getEventById(eventId);
        if (existingEvent?.slug) targetEventSlugOrId = existingEvent.slug;
      } catch {}
    }

    if (isAddonPax) {
      const safePax = Number(paxAmount) || 25;
      amount = ADDON_PAX_PRICES[safePax] || Math.max(25, safePax) * 2000;
      description = `Top Up Kuota Tamu +${safePax} Pax - SudutBingkai (${eventId || 'Acara'})`;
    } else {
      const tierKey = (existingEvent?.packageTier || packageTier) as EventPackageTier;
      const tierInfo = PACKAGE_TIERS[tierKey];
      const basePrice = TIER_PRICES[tierKey] ?? 499000;

      // Validate referral code server-side for legitimate 10% partner discount
      let hasValidReferral = Boolean(existingEvent?.referralCodeUsed && existingEvent?.vendorId);
      const codeToCheck = (referralCode || existingEvent?.referralCodeUsed || '').trim().toUpperCase();

      if (!hasValidReferral && codeToCheck && basePrice > 0) {
        if (codeToCheck === 'VOWSANDCO' || codeToCheck === 'VOWSANDCO10' || codeToCheck === 'KREATIV10') {
          hasValidReferral = true;
        } else {
          try {
            const allVendors = await getAllVendors();
            hasValidReferral = allVendors.some(
              (v) => v.referralCode?.toUpperCase() === codeToCheck && v.status !== 'suspended'
            );
          } catch {}
        }
      }

      amount = hasValidReferral ? Math.round(basePrice * 0.9) : basePrice;
      description = `Paket ${tierInfo?.name || 'Wedding'} (${tierInfo?.guestsLabel || '300 Tamu'}) - SudutBingkai (${eventId || 'event'})`;
    }

    // Free starter tier doesn't need payment
    if (amount <= 0) {
      return NextResponse.json({
        success: true,
        isFree: true,
        amount: 0,
        message: 'Paket Starter gratis aktif tanpa pembayaran.',
      });
    }

    const hostUrl = request.headers.get('origin') || 'http://localhost:3000';
    const finalRedirectUrl =
      redirectUrl ||
      (targetEventSlugOrId
        ? `${hostUrl}/event/${targetEventSlugOrId}?paid=true`
        : `${hostUrl}/create?tier=${packageTier}&paid=true`);

    const invoiceResult = await createMayarInvoice({
      name,
      email,
      mobile,
      amount,
      description,
      redirectUrl: finalRedirectUrl,
      packageTier,
      eventId,
      isAddonPax,
      paxAmount,
    });

    return NextResponse.json({
      ...invoiceResult,
      amount,
      isConfigured: isMayarConfigured,
    });
  } catch (error: unknown) {
    console.error('Payment create error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

