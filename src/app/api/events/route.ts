import { NextResponse } from 'next/server';
import { getAllEvents, getEventById, saveEvent, updateEvent, deleteEvent, getAllVendors, updateVendor, getInvoice, createInvoice, updateInvoice, getAllAddons } from '@/lib/db';
import { EventData, PACKAGE_TIERS, EventPackageTier } from '@/lib/types';
import { getServerSession, signSessionPayload, isSameVendorId } from '@/lib/auth';
import { isMayarConfigured } from '@/lib/mayar';
import { deleteFromR2 } from '@/lib/r2';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const hostEmail = searchParams.get('hostEmail');
    const vendorId = searchParams.get('vendorId');

    // 1. Single event query (Used by guests / live slideshow / dashboard)
    if (id) {
      const event = await getEventById(id);
      if (!event) {
        return NextResponse.json({ success: false, error: 'Acara tidak ditemukan' }, { status: 404 });
      }

      // Check caller authorization
      const session = getServerSession(request);
      const isAuthorizedHost = (session?.role === 'host' || session?.role === 'vendor') && (
        session.email?.toLowerCase() === event.hostEmail?.toLowerCase() ||
        session.id === event.hostEmail
      );
      const isAuthorizedVendor = session?.role === 'vendor' && isSameVendorId(session.id, event.vendorId);
      const isAdmin = session?.role === 'admin';

      // If caller is a Guest / public visitor: strictly strip private host and financial data
      if (!isAuthorizedHost && !isAuthorizedVendor && !isAdmin) {
        const guestSafeEvent = {
          ...event,
          hostEmail: undefined,
          commissionAmount: undefined,
          commissionStatus: undefined,
          referralCodeUsed: undefined
        };
        return NextResponse.json({ success: true, event: guestSafeEvent });
      }

      return NextResponse.json({ success: true, event });
    }

    // 2. Querying by hostEmail: Strictly restricted to the authenticated Host or Admin
    if (hostEmail) {
      const session = getServerSession(request);
      if (!session) {
        return NextResponse.json({
          success: false,
          error: 'Akses ditolak: Sesi login diperlukan untuk mengakses daftar acara host.'
        }, { status: 401 });
      }

      const cleanHost = hostEmail.trim().toLowerCase();
      const isOwnerHost = (
        (session.role === 'host' || session.role === 'vendor') &&
        (session.email?.toLowerCase() === cleanHost || session.id?.toLowerCase() === cleanHost)
      );
      const isAdmin = session.role === 'admin';

      if (!isOwnerHost && !isAdmin) {
        return NextResponse.json({
          success: false,
          error: 'Akses ditolak: Anda hanya dapat mengakses acara milik akun Anda sendiri.'
        }, { status: 403 });
      }

      let events = await getAllEvents();
      events = events.filter(e => e.hostEmail && e.hostEmail.toLowerCase() === cleanHost);
      return NextResponse.json({ success: true, events });
    }

    // 3. Querying by vendorId: Strictly restricted to the authenticated Vendor or Admin
    if (vendorId) {
      const session = getServerSession(request);
      if (!session) {
        return NextResponse.json({
          success: false,
          error: 'Akses ditolak: Sesi login diperlukan untuk mengakses daftar acara vendor.'
        }, { status: 401 });
      }

      const isOwnerVendor = session.role === 'vendor' && (
        isSameVendorId(session.id, vendorId) ||
        session.email === vendorId
      );
      const isAdmin = session.role === 'admin';

      if (!isOwnerVendor && !isAdmin) {
        return NextResponse.json({
          success: false,
          error: 'Akses ditolak: Anda hanya dapat mengakses acara milik vendor Anda sendiri.'
        }, { status: 403 });
      }

      let events = await getAllEvents();
      events = events.filter(e => isSameVendorId(e.vendorId, vendorId));
      return NextResponse.json({ success: true, events });
    }

    // 4. Unparameterized query: Strictly restricted to Super Admin
    const session = getServerSession(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({
        success: false,
        error: 'Akses ditolak: Parameter identitas acara (id, hostEmail, vendorId) atau sesi Admin diperlukan.'
      }, { status: 403 });
    }

    const allEvents = await getAllEvents();
    return NextResponse.json({ success: true, events: allEvents });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}


export async function POST(request: Request) {
  try {
    const session = getServerSession(request);
    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Akses ditolak: Sesi login diperlukan untuk membuat acara baru.'
      }, { status: 401 });
    }

    const body = await request.json();

    if (!body.title || !body.coupleOrHost) {
      return NextResponse.json({ success: false, error: 'Nama acara dan penyelenggara wajib diisi' }, { status: 400 });
    }

    const id = body.id || 'sb-' + Math.random().toString(36).substring(2, 8);
    const rawSlug = body.slug || body.title;
    let cleanSlug = rawSlug
      ? rawSlug.toString().trim().toLowerCase().replace(/[^a-z0-9\-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
      : undefined;

    if (cleanSlug) {
      const allEvents = await getAllEvents();
      const slugCollision = allEvents.some(e => e.id !== id && e.slug && e.slug.toLowerCase() === cleanSlug!.toLowerCase());
      if (slugCollision) {
        cleanSlug = `${cleanSlug}-${Math.random().toString(36).substring(2, 6)}`;
      }
    }

    const tierKey = (body.packageTier || 'wedding') as EventPackageTier;
    const tierConfig = PACKAGE_TIERS[tierKey] || PACKAGE_TIERS.starter;
    const isAdmin = session.role === 'admin';

    if (session.role === 'vendor') {
      const vendors = await getAllVendors();
      const callerVendor = vendors.find(
        v => isSameVendorId(v.id, session.id) || (session.email && v.email?.toLowerCase() === session.email.toLowerCase())
      );
      if (callerVendor?.status === 'suspended') {
        return NextResponse.json({
          success: false,
          error: 'Akun mitra vendor Anda sedang ditangguhkan (suspended) dan tidak dapat membuat acara baru.'
        }, { status: 403 });
      }
    }

    const resolvedHostEmail = (body.hostEmail && String(body.hostEmail).includes('@'))
      ? String(body.hostEmail).trim().toLowerCase()
      : session.email.trim().toLowerCase();

    const defaultShots = tierConfig.shotsPerGuest;
    const requestedShots = body.shotsPerGuest !== undefined ? Number(body.shotsPerGuest) : defaultShots;
    const safeShots = isAdmin ? requestedShots : Math.min(requestedShots, tierConfig.shotsPerGuest);

    const safeAdditionalPax = isAdmin ? (Number(body.additionalPax) || 0) : 0;
    const defaultGuests = tierConfig.maxGuests;
    const requestedGuests = body.maxGuests !== undefined ? Number(body.maxGuests) : defaultGuests;
    const safeGuests = isAdmin ? requestedGuests : Math.min(requestedGuests, tierConfig.maxGuests + safeAdditionalPax);

    const chosenPreset = body.preset || 'portra';
    const maxP = tierConfig.maxPresets || 1;
    const safeAllowGuestSwitch = (isAdmin || maxP > 1) ? (body.allowGuestPresetSwitch !== false) : false;
    const rawAllowed = (Array.isArray(body.allowedPresets) && body.allowedPresets.length > 0)
      ? body.allowedPresets
      : [chosenPreset];
    const safeAllowed = (isAdmin || maxP > 1)
      ? rawAllowed.slice(0, maxP)
      : [chosenPreset];

    let verifiedVendorId: string | undefined;
    let verifiedVendorName: string | undefined;
    let verifiedVendorLogo: string | undefined;
    let verifiedVendorInstagram: string | undefined;
    let verifiedReferralCode: string | undefined;
    let serverCommissionAmount = 0;

    if (body.referralCodeUsed || body.vendorId) {
      const vendors = await getAllVendors();
      const cleanRef = (body.referralCodeUsed || '').toString().trim().toUpperCase();
      const matchedVendor = vendors.find(
        v => {
          const vRef = (v.referralCode || '').toUpperCase();
          return (
            (body.vendorId && isSameVendorId(v.id, body.vendorId)) ||
            (cleanRef && (vRef === cleanRef || (cleanRef === 'VOWSANDCO10' && vRef === 'VOWSANDCO')))
          );
        }
      );

      if (matchedVendor && matchedVendor.status !== 'suspended') {
        verifiedVendorId = matchedVendor.id;
        verifiedVendorName = matchedVendor.companyName;
        verifiedVendorLogo = matchedVendor.logoUrl;
        verifiedVendorInstagram = matchedVendor.instagram;
        if (cleanRef) {
          verifiedReferralCode = matchedVendor.referralCode || cleanRef;
        }
        if (tierKey !== 'starter' && !tierConfig.isFree) {
          const basePrice = parseInt(tierConfig.price.replace(/[^0-9]/g, ''), 10) || 0;
          const rawRate = Number(matchedVendor.commissionRate) || 0;
          const rateDecimal = rawRate > 0
            ? (rawRate <= 1 ? rawRate : rawRate / 100)
            : (matchedVendor.partnerTier === 'vip' ? 0.20 : matchedVendor.partnerTier === 'pro' ? 0.15 : 0.12);
          const netPrice = cleanRef && !body.vendorId ? Math.round(basePrice * 0.9) : basePrice;
          serverCommissionAmount = Math.round(netPrice * rateDecimal);
        }
      } else if (!matchedVendor && (cleanRef === 'VOWSANDCO' || cleanRef === 'VOWSANDCO10' || cleanRef === 'KREATIV10')) {
        verifiedReferralCode = cleanRef;
        verifiedVendorId = body.vendorId || (cleanRef === 'KREATIV10' ? 'vendor_kreativ' : 'vendor_vows_co');
        verifiedVendorName = body.vendorName || (cleanRef === 'KREATIV10' ? 'Kreativ Wedding Studio' : 'Vows & Co. Wedding Planner');
        verifiedVendorLogo = body.vendorLogo;
        verifiedVendorInstagram = body.vendorInstagram;
        if (tierKey !== 'starter' && !tierConfig.isFree) {
          const basePrice = parseInt(tierConfig.price.replace(/[^0-9]/g, ''), 10) || 0;
          const netPrice = !body.vendorId ? Math.round(basePrice * 0.9) : basePrice;
          serverCommissionAmount = Math.round(netPrice * 0.15);
        }
      }
    }

    const finalCommissionAmount = isAdmin && body.commissionAmount !== undefined
      ? Number(body.commissionAmount)
      : serverCommissionAmount;

    const resolvedPaymentStatus =
      tierKey === 'starter' || isAdmin
        ? (body.paymentStatus || 'paid')
        : isMayarConfigured
          ? 'pending'
          : (body.paymentStatus || 'pending');

    const resolvedFrameId = body.frameId || 'minimal-gold';
    const resolvedCustomFrameUrl = resolvedFrameId === 'custom' ? body.customFrameUrl : undefined;
    if (resolvedFrameId !== 'custom' && body.customFrameUrl) {
      await deleteFromR2(body.customFrameUrl);
    }
    const resolvedAllowVoiceNote = body.closingWishType === 'none' ? false : (body.allowVoiceNote !== false);
    const resolvedClosingWishType = !resolvedAllowVoiceNote
      ? 'none'
      : (body.closingWishType && body.closingWishType !== 'none'
          ? body.closingWishType
          : (tierKey === 'wedding' || tierKey === 'unlimited' ? 'video' : 'voice'));

    const newEvent: EventData = {
      id,
      slug: cleanSlug,
      eventType: ['wedding', 'birthday', 'corporate', 'other'].includes(body.eventType) ? body.eventType : undefined,
      title: body.title.trim(),
      coupleOrHost: body.coupleOrHost.trim(),
      eventDate: body.eventDate || new Date().toISOString(),
      location: (body.location || '').trim(),
      preset: chosenPreset,
      allowedPresets: safeAllowed,
      allowGuestPresetSwitch: safeAllowGuestSwitch,
      packageTier: tierKey,
      maxGuests: safeGuests,
      additionalPax: safeAdditionalPax,
      shotsPerGuest: safeShots,
      revealMode: body.revealMode || 'instant',
      revealTime: body.revealTime,
      coverUrl: body.coverUrl,
      frameId: resolvedFrameId,
      customFrameUrl: resolvedCustomFrameUrl,
      frameText: body.frameText,
      allowVoiceNote: resolvedAllowVoiceNote,
      allowGuestFrameToggle: body.allowGuestFrameToggle !== false,
      closingWishType: resolvedClosingWishType,
      createdAt: new Date().toISOString(),
      hostEmail: resolvedHostEmail,
      paymentStatus: resolvedPaymentStatus,
      referralCodeUsed: verifiedReferralCode,
      commissionAmount: finalCommissionAmount > 0 ? finalCommissionAmount : undefined,
      commissionStatus: finalCommissionAmount > 0
        ? (isAdmin && body.commissionStatus ? body.commissionStatus : (resolvedPaymentStatus === 'paid' ? 'available' : 'pending'))
        : undefined,
      vendorId: verifiedVendorId,
      vendorName: verifiedVendorName,
      vendorLogo: verifiedVendorLogo,
      vendorInstagram: verifiedVendorInstagram,
      vendorCoBranding: body.vendorCoBranding,
      addons: body.addons
    };

    const saved = await saveEvent(newEvent);
    let updatedVendorBalance: number | undefined;
    let updatedVendorEarnings: number | undefined;

    if (saved.paymentStatus === 'paid' && saved.vendorId && saved.commissionAmount && saved.commissionAmount > 0 && saved.commissionStatus === 'available') {
      try {
        const vendors = await getAllVendors();
        const matchedVendor = vendors.find(v => isSameVendorId(v.id, saved.vendorId));
        if (matchedVendor && matchedVendor.status !== 'suspended') {
          updatedVendorBalance = (matchedVendor.walletBalance || 0) + saved.commissionAmount;
          updatedVendorEarnings = (matchedVendor.totalEarnings || 0) + saved.commissionAmount;
          await updateVendor(matchedVendor.id, {
            walletBalance: updatedVendorBalance,
            totalEarnings: updatedVendorEarnings
          });
        }
      } catch {}
    }

    // Automatically generate official InvoiceRecord when event is created
    try {
      const existingInv = await getInvoice(saved.id);
      if (!existingInv) {
        const baseTierPrice = tierConfig.isFree || tierKey === 'starter'
          ? 0
          : (parseInt(tierConfig.price.replace(/[^0-9]/g, ''), 10) || 0);
        let addonsPrice = 0;
        if (Array.isArray(saved.addons) && saved.addons.length > 0) {
          try {
            const catalogAddons = await getAllAddons();
            for (const addonId of saved.addons) {
              const matchedAddon = catalogAddons.find(a => a.id === addonId && a.isActive !== false);
              if (matchedAddon && matchedAddon.price > 0) {
                addonsPrice += Number(matchedAddon.price);
              }
            }
          } catch {}
        }
        const rawPrice = baseTierPrice + addonsPrice;
        const isHostReferralDiscount = Boolean(saved.referralCodeUsed && session?.role !== 'vendor');
        const discount = isHostReferralDiscount ? Math.round(baseTierPrice * 0.1) : 0;
        const finalAmount = rawPrice - discount;
        const isEventPaid = tierConfig.isFree || tierKey === 'starter' || saved.paymentStatus === 'paid';

        await createInvoice({
          id: `inv_${saved.id}`,
          eventId: saved.id,
          orderId: `ord_${saved.id.substring(0, 10)}`,
          buyerType: session?.role === 'vendor' ? 'vendor' : 'client',
          buyerName: saved.coupleOrHost || saved.title,
          buyerEmail: saved.hostEmail || 'pengantin@sudutbingkai.id',
          companyName: saved.vendorName,
          tierId: tierKey,
          tierName: `${tierConfig.name} (${tierConfig.guestsLabel})`,
          originalPrice: rawPrice,
          discountAmount: discount,
          discountCode: isHostReferralDiscount ? saved.referralCodeUsed : undefined,
          finalAmount,
          paymentMethod: 'qris',
          status: isEventPaid ? 'paid' : 'pending',
          paidAt: isEventPaid ? saved.createdAt : undefined,
          createdAt: saved.createdAt
        });
      }
    } catch {}

    let sessionToken: string | undefined;
    if (session?.role === 'vendor') {
      const vendorSessionUser = {
        ...session,
        walletBalance: updatedVendorBalance ?? session.walletBalance,
        totalEarnings: updatedVendorEarnings ?? session.totalEarnings,
      };
      sessionToken = signSessionPayload(JSON.stringify(vendorSessionUser));
    } else if (saved.hostEmail && !isAdmin) {
      const cleanHostEmail = saved.hostEmail.trim().toLowerCase();
      const hostUser = {
        id: session?.role === 'host' && session.id ? session.id : 'usr_' + cleanHostEmail.replace(/[^a-z0-9]/g, '').slice(0, 10),
        name: saved.coupleOrHost || saved.title || cleanHostEmail.split('@')[0],
        email: cleanHostEmail,
        role: 'host' as const,
      };
      sessionToken = signSessionPayload(JSON.stringify(hostUser));
    }
    return NextResponse.json({ success: true, event: saved, sessionToken });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = getServerSession(request);
    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Akses ditolak: Sesi login diperlukan untuk mengubah pengaturan acara.'
      }, { status: 401 });
    }

    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ success: false, error: 'ID acara diperlukan' }, { status: 400 });
    }

    const existingEvent = await getEventById(body.id);
    if (!existingEvent) {
      return NextResponse.json({ success: false, error: 'Acara tidak ditemukan' }, { status: 404 });
    }

    const isAuthorizedHost = session.role === 'host' && (
      session.email?.toLowerCase() === existingEvent.hostEmail?.toLowerCase() ||
      session.id === existingEvent.hostEmail
    );
    const isAuthorizedVendor = session.role === 'vendor' && isSameVendorId(session.id, existingEvent.vendorId);
    const isCallerAdmin = session.role === 'admin';

    if (!isAuthorizedHost && !isAuthorizedVendor && !isCallerAdmin) {
      return NextResponse.json({
        success: false,
        error: 'Akses ditolak: Anda tidak memiliki wewenang untuk mengubah pengaturan acara ini.'
      }, { status: 403 });
    }

    const isPendingDraft = existingEvent.paymentStatus === 'pending';
    const requestedTier = (body.packageTier && PACKAGE_TIERS[body.packageTier as EventPackageTier])
      ? (body.packageTier as EventPackageTier)
      : undefined;

    const updates: Partial<EventData> = {};

    // 2. Strict packageTier escalation prevention (cannot self-upgrade a paid event without payment or admin, but unpaid pending drafts can switch tiers)
    if (requestedTier !== undefined && requestedTier !== existingEvent.packageTier) {
      if (!isCallerAdmin && !isPendingDraft && requestedTier !== 'starter') {
        return NextResponse.json({
          success: false,
          error: 'Peningkatan paket hanya dapat diproses melalui pembayaran resmi atau verifikasi admin.'
        }, { status: 403 });
      }
      updates.packageTier = requestedTier;
      if (requestedTier === 'starter') {
        updates.paymentStatus = 'paid';
        updates.commissionAmount = 0;
      }
    }

    const currentTier = (updates.packageTier || existingEvent.packageTier || 'starter') as EventPackageTier;
    const tierConfig = PACKAGE_TIERS[currentTier] || PACKAGE_TIERS.starter;

    // 1. Strict shotsPerGuest check against tier limits
    if (body.shotsPerGuest !== undefined) {
      const requestedShots = Number(body.shotsPerGuest);
      if (!isCallerAdmin && requestedShots > tierConfig.shotsPerGuest) {
        return NextResponse.json({
          success: false,
          error: `Paket ${tierConfig.name} dibatasi maksimal ${tierConfig.shotsPerGuest} foto per tamu. Anda tidak dapat mengatur ${requestedShots} foto tanpa upgrade paket.`
        }, { status: 400 });
      }
      updates.shotsPerGuest = Math.max(1, requestedShots);
    }

    // 3. Strict maxGuests check against tier + additionalPax
    if (body.maxGuests !== undefined) {
      const requestedGuests = Number(body.maxGuests);
      const maxAllowedGuests = tierConfig.maxGuests + (existingEvent.additionalPax || 0);
      if (!isCallerAdmin && requestedGuests > maxAllowedGuests) {
        return NextResponse.json({
          success: false,
          error: `Batas kapasitas Paket ${tierConfig.name} adalah ${tierConfig.maxGuests} tamu (+ ${existingEvent.additionalPax || 0} pax tambahan).`
        }, { status: 400 });
      }
      updates.maxGuests = Math.max(1, requestedGuests);
    }

    // 4. Strict allowedPresets and guest preset switch check
    const maxPresetsAllowed = tierConfig.maxPresets || 1;
    if (body.allowGuestPresetSwitch !== undefined) {
      if (!isCallerAdmin && body.allowGuestPresetSwitch === true && maxPresetsAllowed <= 1) {
        return NextResponse.json({
          success: false,
          error: `Paket ${tierConfig.name} hanya mendukung 1 filter utama dan tidak mengizinkan pergantian filter oleh tamu.`
        }, { status: 400 });
      }
      updates.allowGuestPresetSwitch = isCallerAdmin ? body.allowGuestPresetSwitch : (maxPresetsAllowed > 1 ? body.allowGuestPresetSwitch : false);
    }

    if (body.allowedPresets !== undefined && Array.isArray(body.allowedPresets)) {
      if (!isCallerAdmin && body.allowedPresets.length > maxPresetsAllowed) {
        return NextResponse.json({
          success: false,
          error: `Paket ${tierConfig.name} dibatasi maksimal ${maxPresetsAllowed} filter film.`
        }, { status: 400 });
      }
      updates.allowedPresets = isCallerAdmin ? body.allowedPresets : (maxPresetsAllowed <= 1 ? [body.preset || existingEvent.preset || 'portra'] : body.allowedPresets.slice(0, maxPresetsAllowed));
    } else if (maxPresetsAllowed <= 1) {
      updates.allowedPresets = [body.preset || existingEvent.preset || 'portra'];
      updates.allowGuestPresetSwitch = false;
    }

    if (body.slug !== undefined) {
      let candidateSlug = body.slug
        ? body.slug.toString().trim().toLowerCase().replace(/[^a-z0-9\-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
        : undefined;
      if (candidateSlug) {
        const allEvents = await getAllEvents();
        const slugCollision = allEvents.some(e => e.id !== existingEvent.id && e.slug && e.slug.toLowerCase() === candidateSlug!.toLowerCase());
        if (slugCollision) {
          candidateSlug = `${candidateSlug}-${Math.random().toString(36).substring(2, 6)}`;
        }
      }
      updates.slug = candidateSlug;
    }
    if (body.eventType && ['wedding', 'birthday', 'corporate', 'other'].includes(body.eventType)) {
      updates.eventType = body.eventType;
    }
    if (body.title) updates.title = body.title.trim();
    if (body.coupleOrHost) updates.coupleOrHost = body.coupleOrHost.trim();
    if (body.eventDate) updates.eventDate = body.eventDate;
    if (body.location !== undefined) updates.location = body.location.trim();
    if (body.preset) updates.preset = body.preset;
    if (body.additionalPax !== undefined) {
      if (isCallerAdmin) {
        updates.additionalPax = Math.max(0, Number(body.additionalPax) || 0);
      } else if (!isMayarConfigured) {
        const prevPax = existingEvent.additionalPax || 0;
        const nextPax = Number(body.additionalPax);
        const deltaPax = nextPax - prevPax;
        const TOPUP_PRICES: Record<number, number> = {
          25: 49000,
          50: 89000,
          100: 149000,
          250: 249000,
        };
        if (!TOPUP_PRICES[deltaPax]) {
          return NextResponse.json(
            { success: false, error: 'Paket Top-Up Pax tidak valid. Pilih paket 25, 50, 100, atau 250 Pax.' },
            { status: 400 }
          );
        }
        updates.additionalPax = nextPax;
        try {
          const topupPrice = TOPUP_PRICES[deltaPax];
          const nowIso = new Date().toISOString();
          await createInvoice({
            id: `inv_topup_${existingEvent.id}_${Date.now()}`,
            eventId: existingEvent.id,
            orderId: `topup_pax_${deltaPax}_${existingEvent.id}`,
            buyerType: existingEvent.vendorId ? 'vendor' : 'client',
            buyerName: existingEvent.coupleOrHost || existingEvent.title || 'Tuan Rumah',
            buyerEmail: existingEvent.hostEmail || 'host@sudutbingkai.id',
            companyName: existingEvent.vendorName,
            tierId: (existingEvent.packageTier || 'wedding') as EventPackageTier,
            tierName: `Top Up Kuota Tamu +${deltaPax} Pax (${existingEvent.title})`,
            originalPrice: topupPrice,
            discountAmount: 0,
            finalAmount: topupPrice,
            paymentMethod: 'qris',
            status: 'paid',
            paidAt: nowIso,
            createdAt: nowIso,
          });
        } catch (invErr) {
          console.warn('Simulator Top-Up invoice creation warning:', invErr);
        }
      }
    }
    if (body.revealMode) updates.revealMode = body.revealMode;
    if (body.revealTime !== undefined) updates.revealTime = body.revealTime;
    if (body.frameId) updates.frameId = body.frameId;
    const effectiveFrameId = updates.frameId || existingEvent.frameId || 'minimal-gold';
    if (effectiveFrameId !== 'custom') {
      if (existingEvent.customFrameUrl) {
        await deleteFromR2(existingEvent.customFrameUrl);
      }
      if (body.customFrameUrl && body.customFrameUrl !== existingEvent.customFrameUrl) {
        await deleteFromR2(body.customFrameUrl);
      }
      if (existingEvent.customFrameUrl || body.customFrameUrl !== undefined) {
        updates.customFrameUrl = '';
      }
    } else if (body.customFrameUrl !== undefined) {
      if (existingEvent.customFrameUrl && existingEvent.customFrameUrl !== body.customFrameUrl) {
        await deleteFromR2(existingEvent.customFrameUrl);
      }
      updates.customFrameUrl = body.customFrameUrl;
    }
    if (body.frameText !== undefined) updates.frameText = body.frameText;
    if (body.allowGuestFrameToggle !== undefined) updates.allowGuestFrameToggle = body.allowGuestFrameToggle;
    const effectiveTier = updates.packageTier || currentTier;
    if (body.closingWishType !== undefined) {
      updates.closingWishType = body.closingWishType;
      if (body.allowVoiceNote === undefined) {
        updates.allowVoiceNote = body.closingWishType !== 'none';
      }
    }
    if (body.allowVoiceNote !== undefined) {
      updates.allowVoiceNote = body.allowVoiceNote;
      if (body.closingWishType === undefined) {
        if (!body.allowVoiceNote) {
          updates.closingWishType = 'none';
        } else if (!existingEvent.closingWishType || existingEvent.closingWishType === 'none') {
          updates.closingWishType = (effectiveTier === 'wedding' || effectiveTier === 'unlimited') ? 'video' : 'voice';
        }
      }
    }
    if (body.coverUrl !== undefined) {
      if (existingEvent.coverUrl && existingEvent.coverUrl !== body.coverUrl) {
        await deleteFromR2(existingEvent.coverUrl);
      }
      updates.coverUrl = body.coverUrl;
    }
    if (body.vendorCoBranding !== undefined) {
      updates.vendorCoBranding = body.vendorCoBranding;
    }
    if (body.addons !== undefined) {
      updates.addons = body.addons;
    }

    // Administrative & financial fields: restricted to Admin (or sandbox simulation when !isMayarConfigured, or pending draft updates)
    if (isCallerAdmin) {
      if (body.paymentStatus !== undefined) updates.paymentStatus = body.paymentStatus;
      if (body.referralCodeUsed !== undefined) updates.referralCodeUsed = body.referralCodeUsed;
      if (body.commissionAmount !== undefined) updates.commissionAmount = body.commissionAmount;
      if (body.commissionStatus !== undefined) updates.commissionStatus = body.commissionStatus;
      if (body.vendorId !== undefined) updates.vendorId = body.vendorId;
      if (body.hostEmail !== undefined) updates.hostEmail = body.hostEmail;
    } else {
      if ((isPendingDraft || isAuthorizedVendor) && body.hostEmail && String(body.hostEmail).includes('@')) {
        updates.hostEmail = String(body.hostEmail).trim().toLowerCase();
      }
      if (!isMayarConfigured && body.paymentStatus === 'paid' && existingEvent.paymentStatus === 'pending') {
        updates.paymentStatus = 'paid';
      }
      // If a pending draft changed packageTier or referralCodeUsed, recalculate server commission & sync pending invoice
      if (isPendingDraft && (updates.packageTier !== undefined || body.referralCodeUsed !== undefined)) {
        const targetVendorId = existingEvent.vendorId || body.vendorId;
        const cleanRef = (body.referralCodeUsed !== undefined ? body.referralCodeUsed : existingEvent.referralCodeUsed || '').toString().trim().toUpperCase();
        if (cleanRef) updates.referralCodeUsed = cleanRef;
        if (currentTier !== 'starter' && !tierConfig.isFree && (targetVendorId || cleanRef)) {
          try {
            const vendors = await getAllVendors();
            const matchedVendor = vendors.find(v =>
              (targetVendorId && isSameVendorId(v.id, targetVendorId)) ||
              (cleanRef && (v.referralCode || '').toUpperCase() === cleanRef)
            );
            const basePrice = parseInt(tierConfig.price.replace(/[^0-9]/g, ''), 10) || 0;
            const rawRate = Number(matchedVendor?.commissionRate) || 0;
            const rateDecimal = rawRate > 0
              ? (rawRate <= 1 ? rawRate : rawRate / 100)
              : (matchedVendor?.partnerTier === 'vip' ? 0.20 : matchedVendor?.partnerTier === 'pro' ? 0.15 : 0.12);
            const netPrice = cleanRef && !existingEvent.vendorId ? Math.round(basePrice * 0.9) : basePrice;
            updates.commissionAmount = Math.round(netPrice * rateDecimal);
          } catch {}
        }
        try {
          const existingInv = await getInvoice(existingEvent.id);
          if (existingInv && existingInv.status === 'pending') {
            const baseTierPrice = tierConfig.isFree || currentTier === 'starter'
              ? 0
              : (parseInt(tierConfig.price.replace(/[^0-9]/g, ''), 10) || 0);
            const isHostReferralDiscount = Boolean((updates.referralCodeUsed || existingEvent.referralCodeUsed) && session.role !== 'vendor');
            const discount = isHostReferralDiscount ? Math.round(baseTierPrice * 0.1) : 0;
            await updateInvoice(existingInv.id, {
              buyerName: updates.coupleOrHost || existingEvent.coupleOrHost || updates.title || existingEvent.title,
              buyerEmail: updates.hostEmail || existingEvent.hostEmail || existingInv.buyerEmail,
              tierId: currentTier,
              tierName: `${tierConfig.name} (${tierConfig.guestsLabel})`,
              originalPrice: baseTierPrice,
              discountAmount: discount,
              finalAmount: baseTierPrice - discount,
              status: currentTier === 'starter' ? 'paid' : 'pending',
              paidAt: currentTier === 'starter' ? new Date().toISOString() : undefined,
            });
          }
        } catch {}
      }
    }

    // If transitioning to 'paid', disburse pending vendor commission and mark linked invoice 'paid'
    let updatedVendorBalance: number | undefined;
    let updatedVendorEarnings: number | undefined;

    if (updates.paymentStatus === 'paid' && existingEvent.paymentStatus !== 'paid') {
      const targetVendorId = updates.vendorId || existingEvent.vendorId;
      const targetCommission = updates.commissionAmount !== undefined ? updates.commissionAmount : existingEvent.commissionAmount;
      if (
        targetVendorId &&
        targetCommission &&
        targetCommission > 0 &&
        existingEvent.commissionStatus !== 'available' &&
        existingEvent.commissionStatus !== 'withdrawn'
      ) {
        try {
          const vendors = await getAllVendors();
          const matchedVendor = vendors.find(v => isSameVendorId(v.id, targetVendorId));
          if (matchedVendor && matchedVendor.status !== 'suspended') {
            updatedVendorBalance = (matchedVendor.walletBalance || 0) + targetCommission;
            updatedVendorEarnings = (matchedVendor.totalEarnings || 0) + targetCommission;
            await updateVendor(matchedVendor.id, {
              walletBalance: updatedVendorBalance,
              totalEarnings: updatedVendorEarnings
            });
            updates.commissionStatus = 'available';
          }
        } catch {}
      }
      try {
        const existingInv = await getInvoice(existingEvent.id);
        if (existingInv) {
          if (existingInv.status !== 'paid') {
            await updateInvoice(existingInv.id, {
              status: 'paid',
              paidAt: new Date().toISOString()
            });
          }
        } else {
          const baseTierPrice = tierConfig.isFree || currentTier === 'starter'
            ? 0
            : (parseInt(tierConfig.price.replace(/[^0-9]/g, ''), 10) || 0);
          let addonsPrice = 0;
          const activeAddons = Array.isArray(updates.addons) ? updates.addons : existingEvent.addons;
          if (Array.isArray(activeAddons) && activeAddons.length > 0) {
            try {
              const catalogAddons = await getAllAddons();
              for (const addonId of activeAddons) {
                const matchedAddon = catalogAddons.find(a => a.id === addonId && a.isActive !== false);
                if (matchedAddon && matchedAddon.price > 0) {
                  addonsPrice += Number(matchedAddon.price);
                }
              }
            } catch {}
          }
          const rawPrice = baseTierPrice + addonsPrice;
          const discount = existingEvent.referralCodeUsed ? Math.round(baseTierPrice * 0.1) : 0;
          await createInvoice({
            id: `inv_${existingEvent.id}`,
            eventId: existingEvent.id,
            orderId: `ord_${existingEvent.id.substring(0, 10)}`,
            buyerType: existingEvent.vendorId && !existingEvent.referralCodeUsed ? 'vendor' : 'client',
            buyerName: existingEvent.coupleOrHost || existingEvent.title,
            buyerEmail: existingEvent.hostEmail || 'pengantin@sudutbingkai.id',
            companyName: existingEvent.vendorName,
            tierId: currentTier,
            tierName: `${tierConfig.name} (${tierConfig.guestsLabel})`,
            originalPrice: rawPrice,
            discountAmount: discount,
            discountCode: existingEvent.referralCodeUsed,
            finalAmount: rawPrice - discount,
            paymentMethod: 'qris',
            status: 'paid',
            paidAt: new Date().toISOString(),
            createdAt: existingEvent.createdAt
          });
        }
      } catch {}
    } else if (updates.paymentStatus === 'pending' && existingEvent.paymentStatus === 'paid') {
      if (existingEvent.vendorId && existingEvent.commissionAmount && existingEvent.commissionAmount > 0 && existingEvent.commissionStatus === 'available') {
        try {
          const vendors = await getAllVendors();
          const matchedVendor = vendors.find(v => isSameVendorId(v.id, existingEvent.vendorId));
          if (matchedVendor) {
            updatedVendorBalance = Math.max(0, (matchedVendor.walletBalance || 0) - existingEvent.commissionAmount);
            updatedVendorEarnings = Math.max(0, (matchedVendor.totalEarnings || 0) - existingEvent.commissionAmount);
            await updateVendor(matchedVendor.id, {
              walletBalance: updatedVendorBalance,
              totalEarnings: updatedVendorEarnings
            });
          }
          updates.commissionStatus = 'pending';
        } catch {}
      }
      try {
        const existingInv = await getInvoice(existingEvent.id);
        if (existingInv && existingInv.status === 'paid') {
          await updateInvoice(existingInv.id, { status: 'pending' });
        }
      } catch {}
    }

    const updated = await updateEvent(existingEvent.id, updates);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Acara tidak ditemukan' }, { status: 404 });
    }

    let sessionToken: string | undefined;
    if (session.role === 'vendor') {
      const vendorSessionUser = {
        ...session,
        walletBalance: updatedVendorBalance ?? session.walletBalance,
        totalEarnings: updatedVendorEarnings ?? session.totalEarnings,
      };
      sessionToken = signSessionPayload(JSON.stringify(vendorSessionUser));
    }

    return NextResponse.json({
      success: true,
      event: updated,
      sessionToken,
      walletBalance: updatedVendorBalance,
      totalEarnings: updatedVendorEarnings,
    });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = getServerSession(request);
    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Akses ditolak: Sesi login diperlukan untuk menghapus acara.'
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Parameter id diperlukan' }, { status: 400 });
    }

    const existing = await getEventById(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Acara tidak ditemukan' }, { status: 404 });
    }

    const isOwner = session.role === 'admin' ||
      (session.role === 'host' && (session.email?.toLowerCase() === existing.hostEmail?.toLowerCase() || session.id === existing.hostEmail)) ||
      (session.role === 'vendor' && isSameVendorId(session.id, existing.vendorId));
    if (!isOwner) {
      return NextResponse.json({ success: false, error: 'Akses ditolak: Anda tidak memiliki wewenang untuk menghapus acara ini' }, { status: 403 });
    }

    const success = await deleteEvent(id);
    if (!success) {
      return NextResponse.json({ success: false, error: 'Gagal menghapus acara' }, { status: 400 });
    }

    let sessionToken: string | undefined;
    let updatedWalletBalance: number | undefined;
    let updatedTotalEarnings: number | undefined;
    if (session.role === 'vendor') {
      try {
        const vendors = await getAllVendors();
        const matchedVendor = vendors.find(v => isSameVendorId(v.id, session.id));
        if (matchedVendor) {
          updatedWalletBalance = matchedVendor.walletBalance ?? session.walletBalance;
          updatedTotalEarnings = matchedVendor.totalEarnings ?? session.totalEarnings;
          const vendorSessionUser = {
            ...session,
            walletBalance: updatedWalletBalance,
            totalEarnings: updatedTotalEarnings,
          };
          sessionToken = signSessionPayload(JSON.stringify(vendorSessionUser));
        }
      } catch {}
    }

    return NextResponse.json({
      success: true,
      message: 'Acara berhasil dihapus',
      sessionToken,
      walletBalance: updatedWalletBalance,
      totalEarnings: updatedTotalEarnings,
    });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}


