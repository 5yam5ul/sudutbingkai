import { NextResponse } from 'next/server';
import { getAllEvents, getEventById, saveEvent, updateEvent, deleteEvent } from '@/lib/db';
import { EventData, PACKAGE_TIERS, EventPackageTier } from '@/lib/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const hostEmail = searchParams.get('hostEmail');
    const vendorId = searchParams.get('vendorId');

    if (id) {
      const event = await getEventById(id);
      if (!event) {
        return NextResponse.json({ success: false, error: 'Acara tidak ditemukan' }, { status: 404 });
      }
      return NextResponse.json({ success: true, event });
    }

    let events = await getAllEvents();

    if (hostEmail) {
      const cleanHost = hostEmail.trim().toLowerCase();
      events = events.filter(e => e.hostEmail && e.hostEmail.toLowerCase() === cleanHost);
    } else if (vendorId) {
      events = events.filter(e => e.vendorId === vendorId);
    }

    return NextResponse.json({ success: true, events });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.title || !body.coupleOrHost) {
      return NextResponse.json({ success: false, error: 'Nama acara dan penyelenggara wajib diisi' }, { status: 400 });
    }

    const id = body.id || 'sb-' + Math.random().toString(36).substring(2, 8);
    const rawSlug = body.slug || body.title;
    const cleanSlug = rawSlug
      ? rawSlug.toString().trim().toLowerCase().replace(/[^a-z0-9\-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
      : undefined;

    const tierKey = (body.packageTier || 'wedding') as EventPackageTier;
    const tierConfig = PACKAGE_TIERS[tierKey] || PACKAGE_TIERS.starter;
    const isAdmin = body.adminAuthorized === true;

    const defaultShots = tierConfig.shotsPerGuest;
    const requestedShots = body.shotsPerGuest !== undefined ? Number(body.shotsPerGuest) : defaultShots;
    const safeShots = isAdmin ? requestedShots : Math.min(requestedShots, tierConfig.shotsPerGuest);

    const defaultGuests = tierConfig.maxGuests;
    const requestedGuests = body.maxGuests !== undefined ? Number(body.maxGuests) : defaultGuests;
    const safeGuests = isAdmin ? requestedGuests : Math.min(requestedGuests, tierConfig.maxGuests + (Number(body.additionalPax) || 0));

    const chosenPreset = body.preset || 'portra';
    const maxP = tierConfig.maxPresets || 1;
    const safeAllowGuestSwitch = (isAdmin || maxP > 1) ? (body.allowGuestPresetSwitch !== false) : false;
    const rawAllowed = (Array.isArray(body.allowedPresets) && body.allowedPresets.length > 0)
      ? body.allowedPresets
      : [chosenPreset];
    const safeAllowed = (isAdmin || maxP > 1)
      ? rawAllowed.slice(0, maxP)
      : [chosenPreset];

    const newEvent: EventData = {
      id,
      slug: cleanSlug,
      title: body.title.trim(),
      coupleOrHost: body.coupleOrHost.trim(),
      eventDate: body.eventDate || new Date().toISOString(),
      location: (body.location || '').trim(),
      preset: chosenPreset,
      allowedPresets: safeAllowed,
      allowGuestPresetSwitch: safeAllowGuestSwitch,
      packageTier: tierKey,
      maxGuests: safeGuests,
      additionalPax: Number(body.additionalPax) || 0,
      shotsPerGuest: safeShots,
      revealMode: body.revealMode || 'instant',
      revealTime: body.revealTime,
      coverUrl: body.coverUrl,
      frameId: body.frameId || 'minimal-gold',
      customFrameUrl: body.customFrameUrl,
      frameText: body.frameText,
      allowVoiceNote: body.allowVoiceNote !== false,
      allowGuestFrameToggle: body.allowGuestFrameToggle !== false,
      closingWishType: body.closingWishType || (tierKey === 'wedding' || tierKey === 'unlimited' ? 'video' : 'voice'),
      createdAt: new Date().toISOString(),
      hostEmail: body.hostEmail,
      paymentStatus: body.paymentStatus || 'paid',
      referralCodeUsed: body.referralCodeUsed,
      commissionAmount: body.commissionAmount,
      commissionStatus: body.commissionStatus || (body.commissionAmount ? 'pending' : undefined),
      vendorId: body.vendorId,
      vendorName: body.vendorName,
      vendorLogo: body.vendorLogo,
      vendorInstagram: body.vendorInstagram
    };

    const saved = await saveEvent(newEvent);
    return NextResponse.json({ success: true, event: saved });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ success: false, error: 'ID acara diperlukan' }, { status: 400 });
    }

    const existingEvent = await getEventById(body.id);
    if (!existingEvent) {
      return NextResponse.json({ success: false, error: 'Acara tidak ditemukan' }, { status: 404 });
    }

    const isCallerAdmin = body.adminAuthorized === true;
    const currentTier = (existingEvent.packageTier || 'starter') as EventPackageTier;
    const tierConfig = PACKAGE_TIERS[currentTier] || PACKAGE_TIERS.starter;

    const updates: Partial<EventData> = {};

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

    // 2. Strict packageTier escalation prevention (cannot self-upgrade without payment or admin)
    if (body.packageTier !== undefined && body.packageTier !== existingEvent.packageTier) {
      if (!isCallerAdmin) {
        return NextResponse.json({
          success: false,
          error: 'Peningkatan paket hanya dapat diproses melalui pembayaran resmi atau verifikasi admin.'
        }, { status: 403 });
      }
      updates.packageTier = body.packageTier;
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
      updates.slug = body.slug
        ? body.slug.toString().trim().toLowerCase().replace(/[^a-z0-9\-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
        : undefined;
    }
    if (body.title) updates.title = body.title.trim();
    if (body.coupleOrHost) updates.coupleOrHost = body.coupleOrHost.trim();
    if (body.eventDate) updates.eventDate = body.eventDate;
    if (body.location !== undefined) updates.location = body.location.trim();
    if (body.preset) updates.preset = body.preset;
    if (body.additionalPax !== undefined) updates.additionalPax = Number(body.additionalPax);
    if (body.revealMode) updates.revealMode = body.revealMode;
    if (body.revealTime !== undefined) updates.revealTime = body.revealTime;
    if (body.frameId) updates.frameId = body.frameId;
    if (body.customFrameUrl !== undefined) updates.customFrameUrl = body.customFrameUrl;
    if (body.frameText !== undefined) updates.frameText = body.frameText;
    if (body.allowVoiceNote !== undefined) updates.allowVoiceNote = body.allowVoiceNote;
    if (body.allowGuestFrameToggle !== undefined) updates.allowGuestFrameToggle = body.allowGuestFrameToggle;
    if (body.closingWishType !== undefined) updates.closingWishType = body.closingWishType;
    if (body.coverUrl !== undefined) updates.coverUrl = body.coverUrl;
    if (body.paymentStatus !== undefined) updates.paymentStatus = body.paymentStatus;
    if (body.referralCodeUsed !== undefined) updates.referralCodeUsed = body.referralCodeUsed;
    if (body.commissionAmount !== undefined) updates.commissionAmount = body.commissionAmount;
    if (body.commissionStatus !== undefined) updates.commissionStatus = body.commissionStatus;

    const updated = await updateEvent(body.id, updates);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Acara tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ success: true, event: updated });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Parameter id diperlukan' }, { status: 400 });
    }

    const success = await deleteEvent(id);
    if (!success) {
      return NextResponse.json({ success: false, error: 'Gagal menghapus acara' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Acara berhasil dihapus' });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

