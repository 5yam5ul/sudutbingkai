import { NextResponse } from 'next/server';
import { getAllPhotos, savePhoto, updatePhoto, deletePhoto, getEventById } from '@/lib/db';
import { PhotoRecord } from '@/lib/types';
import { getServerSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventIdParam = searchParams.get('eventId') || undefined;
    const requestedIncludeHidden = searchParams.get('includeHidden') === 'true';
    const session = getServerSession(request);

    // If no eventId is provided, strictly require Super Admin session
    if (!eventIdParam) {
      if (!session || session.role !== 'admin') {
        return NextResponse.json({
          success: false,
          error: 'Akses ditolak: Parameter eventId atau sesi Admin diperlukan.'
        }, { status: 403 });
      }

      const allPhotos = await getAllPhotos(undefined, true);
      return NextResponse.json({ success: true, photos: allPhotos, count: allPhotos.length });
    }

    let resolvedEventId = eventIdParam;
    let targetEvent = await getEventById(eventIdParam);
    if (targetEvent) {
      resolvedEventId = targetEvent.id;
    }

    // Only host of this event, vendor of this event, or admin can view hidden photos
    let safeIncludeHidden = false;
    if (requestedIncludeHidden) {
      if (session) {
        const isAuthorizedHost = session.role === 'host' && (
          session.email?.toLowerCase() === targetEvent?.hostEmail?.toLowerCase() ||
          session.id === targetEvent?.hostEmail
        );
        const isAuthorizedVendor = session.role === 'vendor' && session.id === targetEvent?.vendorId;
        const isAdmin = session.role === 'admin';

        if (isAdmin || isAuthorizedHost || isAuthorizedVendor) {
          safeIncludeHidden = true;
        }
      }
    }

    const sessionId = searchParams.get('sessionId');
    const guestName = searchParams.get('guestName');

    let photos = await getAllPhotos(resolvedEventId, safeIncludeHidden);

    if (sessionId || (guestName && guestName.trim() !== 'Tamu')) {
      photos = photos.filter(p => 
        (sessionId && p.sessionId === sessionId) ||
        (guestName && guestName.trim() !== 'Tamu' && p.guestName && p.guestName.toLowerCase() === guestName.trim().toLowerCase())
      );
    }

    // Chronological ascending order so the personal roll displays photos correctly in sequence
    photos.sort((a, b) => (a.shotNumber || 0) - (b.shotNumber || 0) || new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return NextResponse.json({ success: true, photos, count: photos.length });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}


export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.eventId || !body.imageData) {
      return NextResponse.json({ success: false, error: 'Data foto tidak lengkap (eventId dan imageData wajib)' }, { status: 400 });
    }

    // Validate that event exists and resolve canonical ID
    const event = await getEventById(body.eventId);
    if (!event) {
      return NextResponse.json({ success: false, error: 'Acara tidak ditemukan' }, { status: 404 });
    }

    // Safety check on base64 payload size (max 20MB)
    if (typeof body.imageData === 'string' && body.imageData.length > 20 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: 'Ukuran foto melebihi batas maksimal' }, { status: 413 });
    }

    // 1. Enforce individual guest quota (shotsPerGuest)
    const allowedShotsPerGuest = event.shotsPerGuest || 10;
    const requestedShotNumber = Number(body.shotNumber) || 1;
    if (requestedShotNumber > allowedShotsPerGuest) {
      return NextResponse.json({
        success: false,
        error: `Jatah foto Anda untuk acara ini sudah habis (Maksimal ${allowedShotsPerGuest} foto).`
      }, { status: 403 });
    }

    // 2. Query existing photos in database for this event
    const existingPhotos = await getAllPhotos(event.id, true);

    // Count shots previously taken by this session or guest name
    const guestExistingShots = existingPhotos.filter(p => {
      const matchSession = body.sessionId && p.sessionId === body.sessionId;
      const matchName = body.guestName && 
        body.guestName.trim().toLowerCase() !== 'tamu' && 
        body.guestName.trim().toLowerCase() !== 'tamu undangan' &&
        p.guestName && 
        p.guestName.trim().toLowerCase() === body.guestName.trim().toLowerCase();
      return matchSession || matchName;
    });

    if (guestExistingShots.length >= allowedShotsPerGuest) {
      return NextResponse.json({
        success: false,
        error: `Jatah foto Anda untuk acara ini sudah habis (Maksimal ${allowedShotsPerGuest} foto).`
      }, { status: 403 });
    }

    // 3. Strict total event capacity check (maxGuests + additionalPax)
    const maxCapacity = (event.maxGuests || 5) + (event.additionalPax || 0);
    const maxTotalPhotos = maxCapacity * allowedShotsPerGuest;
    if (existingPhotos.length >= maxTotalPhotos) {
      return NextResponse.json({
        success: false,
        error: `Total kuota foto untuk acara ini telah penuh (${maxTotalPhotos} foto). Silakan hubungi penyelenggara acara.`
      }, { status: 403 });
    }

    // Deduplicate guest identities properly
    const uniqueGuestKeys = new Set<string>();
    let legacyAnonymousCount = 0;

    for (const p of existingPhotos) {
      const pName = (p.guestName || '').trim().toLowerCase();
      const isNamed = pName && pName !== 'tamu' && pName !== 'tamu undangan';
      if (isNamed) {
        uniqueGuestKeys.add(`name:${pName}`);
      } else if (p.sessionId && !p.sessionId.startsWith('session-')) {
        // Modern persistent guest session
        uniqueGuestKeys.add(`sess:${p.sessionId}`);
      } else {
        // Legacy timestamp random session
        legacyAnonymousCount++;
      }
    }

    // Group any legacy random sessions together as at most 1 test session
    const effectiveGuestCount = uniqueGuestKeys.size + (legacyAnonymousCount > 0 ? 1 : 0);

    const reqName = (body.guestName || '').trim().toLowerCase();
    const isReqNamed = reqName && reqName !== 'tamu' && reqName !== 'tamu undangan';
    const isKnownGuest = Boolean(
      (isReqNamed && uniqueGuestKeys.has(`name:${reqName}`)) ||
      (body.sessionId && uniqueGuestKeys.has(`sess:${body.sessionId}`)) ||
      (legacyAnonymousCount > 0 && effectiveGuestCount <= 1)
    );

    if (!isKnownGuest && effectiveGuestCount >= maxCapacity) {
      return NextResponse.json({
        success: false,
        error: `Kapasitas tamu untuk acara ini telah penuh (${maxCapacity} tamu). Silakan hubungi penyelenggara acara.`
      }, { status: 403 });
    }

    const newPhoto: PhotoRecord = {
      id: 'photo-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      eventId: event.id,
      guestName: (body.guestName || 'Tamu').trim(),
      sessionId: body.sessionId || 'session-' + Date.now(),
      shotNumber: guestExistingShots.length + 1,
      imageData: body.imageData,
      timestamp: new Date().toISOString(),
      caption: (body.caption || '').trim(),
      isHidden: false,
      aspectRatio: body.aspectRatio || '3:4',
      frameId: body.frameId || 'none'
    };

    const saved = await savePhoto(newPhoto);
    return NextResponse.json({ success: true, photo: saved });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ success: false, error: 'ID foto diperlukan' }, { status: 400 });
    }

    const updates: Partial<PhotoRecord> = {};
    if (typeof body.isHidden === 'boolean') {
      updates.isHidden = body.isHidden;
    }
    if (typeof body.caption === 'string') {
      updates.caption = body.caption;
    }

    const updated = await updatePhoto(body.id, updates);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Foto tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ success: true, photo: updated });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID foto diperlukan' }, { status: 400 });
    }

    const deleted = await deletePhoto(id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Foto tidak ditemukan atau gagal dihapus' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Foto berhasil dihapus' });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}
