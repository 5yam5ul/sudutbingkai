import { NextResponse } from 'next/server';
import { createMayarInvoice, isMayarConfigured } from '@/lib/mayar';
import { EventPackageTier, PACKAGE_TIERS } from '@/lib/types';
import { getEventById, getAllVendors, getAllAddons } from '@/lib/db';
import { getServerSession, isSameVendorId } from '@/lib/auth';

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
  100: 149000,
  250: 249000,
};

export async function POST(request: Request) {
  try {
    const session = getServerSession(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak: Silakan login terlebih dahulu untuk membuat transaksi pembayaran' },
        { status: 401 }
      );
    }

    let isVendorDirectPurchase = session.role === 'vendor';
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
        if (existingEvent) {
          isVendorDirectPurchase = Boolean(existingEvent.vendorId && !existingEvent.referralCodeUsed);
        }
      } catch {}

      if (existingEvent) {
        const isAuthorizedHost = session.role === 'host' && (
          session.email?.toLowerCase() === existingEvent.hostEmail?.toLowerCase() ||
          session.id === existingEvent.hostEmail ||
          session.id === existingEvent.id ||
          (email && String(email).trim().toLowerCase() === existingEvent.hostEmail?.toLowerCase())
        );
        const isAuthorizedVendor = session.role === 'vendor' && isSameVendorId(session.id, existingEvent.vendorId);
        const isAdmin = session.role === 'admin';

        if (!isAuthorizedHost && !isAuthorizedVendor && !isAdmin) {
          return NextResponse.json(
            { success: false, error: 'Akses ditolak: Anda bukan pemilik sah acara ini' },
            { status: 403 }
          );
        }
      } else if (isAddonPax) {
        return NextResponse.json(
          { success: false, error: 'Acara tidak ditemukan untuk penambahan kuota tamu' },
          { status: 404 }
        );
      }
    } else if (isAddonPax) {
      return NextResponse.json(
        { success: false, error: 'ID Acara diperlukan untuk penambahan kuota tamu' },
        { status: 400 }
      );
    }

    if (isAddonPax) {
      const safePax = Number(paxAmount);
      if (!safePax || !ADDON_PAX_PRICES[safePax]) {
        return NextResponse.json(
          { success: false, error: 'Pilihan kuota Top Up tidak valid (pilih 25, 50, 100, atau 250 Pax)' },
          { status: 400 }
        );
      }
      amount = ADDON_PAX_PRICES[safePax];
      description = `Top Up Kuota Tamu +${safePax} Pax - SudutBingkai (${existingEvent?.id || eventId})`;
    } else {
      const tierKey = (existingEvent?.packageTier || packageTier) as EventPackageTier;
      const tierInfo = PACKAGE_TIERS[tierKey];
      const basePrice = TIER_PRICES[tierKey] ?? 499000;

      // Sum any selected catalog add-ons attached to the event or request
      let addonsPrice = 0;
      const selectedAddonIds: string[] = Array.isArray(existingEvent?.addons)
        ? existingEvent.addons
        : Array.isArray(body.addons)
          ? body.addons
          : [];
      if (selectedAddonIds.length > 0) {
        try {
          const allAddons = await getAllAddons();
          for (const addonId of selectedAddonIds) {
            const matchedAddon = allAddons.find(a => a.id === addonId && a.isActive !== false);
            if (matchedAddon && matchedAddon.price > 0) {
              addonsPrice += Number(matchedAddon.price);
            }
          }
        } catch {}
      }

      // Validate referral code server-side for legitimate 10% host partner discount (not applied to direct Vendor Mode purchases)
      let hasValidReferral = false;
      const codeToCheck = !isVendorDirectPurchase
        ? (referralCode || existingEvent?.referralCodeUsed || '').trim().toUpperCase()
        : '';

      if (!isVendorDirectPurchase && codeToCheck && basePrice > 0) {
        try {
          const allVendors = await getAllVendors();
          const matchedVendor = allVendors.find((v) => {
            const vRef = (v.referralCode || '').toUpperCase();
            return vRef === codeToCheck || (codeToCheck === 'VOWSANDCO10' && vRef === 'VOWSANDCO');
          });
          if (matchedVendor) {
            hasValidReferral = matchedVendor.status !== 'suspended';
          } else if (codeToCheck === 'VOWSANDCO' || codeToCheck === 'VOWSANDCO10' || codeToCheck === 'KREATIV10') {
            hasValidReferral = true;
          }
        } catch {
          if (codeToCheck === 'VOWSANDCO' || codeToCheck === 'VOWSANDCO10' || codeToCheck === 'KREATIV10') {
            hasValidReferral = true;
          }
        }
      }

      const discountedBasePrice = hasValidReferral ? Math.round(basePrice * 0.9) : basePrice;
      amount = discountedBasePrice + addonsPrice;
      const orderCode = Math.random().toString(36).substring(2, 6).toUpperCase();
      description = `Paket ${tierInfo?.name || 'Wedding'} (${tierInfo?.guestsLabel || '300 Tamu'}) - SudutBingkai (${existingEvent?.id || eventId || 'event'}) #${orderCode}`;
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
      error: invoiceResult.success ? undefined : (invoiceResult.error || invoiceResult.message || 'Gagal membuat transaksi pembayaran Mayar'),
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

