import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getVideoWishes, saveVideoWish, deleteVideoWish, getEventById } from '@/lib/db';
import { uploadBufferToR2, isR2Configured } from '@/lib/r2';
import { getServerSession, isSameVendorId } from '@/lib/auth';
import { getEventRetentionInfo } from '@/lib/types';
import { isMayarConfigured } from '@/lib/mayar';

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');
const VIDEOS_DIR = path.join(UPLOADS_DIR, 'videos');

function ensureVideosDir() {
  try {
    if (!fs.existsSync(VIDEOS_DIR)) {
      fs.mkdirSync(VIDEOS_DIR, { recursive: true });
    }
  } catch (err) {}
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId') || undefined;
    const guestNameParam = searchParams.get('guestName');
    const session = getServerSession(request);

    // If no eventId is provided, strictly require Super Admin session
    if (!eventId) {
      if (!session || session.role !== 'admin') {
        return NextResponse.json({
          success: false,
          error: 'Akses ditolak: Parameter eventId atau sesi Admin diperlukan.'
        }, { status: 403 });
      }
    }

    let canonicalEventId = eventId;
    let targetEvent = null;
    if (eventId) {
      targetEvent = await getEventById(eventId);
      if (targetEvent) canonicalEventId = targetEvent.id;
    }

    const isDelayedLocked = Boolean(
      targetEvent &&
        targetEvent.revealMode === 'delayed' &&
        targetEvent.revealTime &&
        Date.now() < new Date(targetEvent.revealTime).getTime()
    );
    const isAuthorizedManager = Boolean(
      session &&
        targetEvent &&
        (session.role === 'admin' ||
          (session.role === 'host' &&
            targetEvent.hostEmail &&
            session.email.toLowerCase() === targetEvent.hostEmail.toLowerCase()) ||
          (session.role === 'vendor' && isSameVendorId(session.id, targetEvent.vendorId)))
    );
    const shouldMaskVideo = isDelayedLocked && !isAuthorizedManager;

    let wishes = await getVideoWishes(canonicalEventId);
    if (guestNameParam && guestNameParam.trim() !== 'Tamu' && guestNameParam.trim() !== 'Tamu Undangan') {
      wishes = wishes.filter(w => w.guestName && w.guestName.toLowerCase() === guestNameParam.trim().toLowerCase());
      if (shouldMaskVideo) {
        wishes = wishes.map(w => ({ ...w, videoUrl: '', thumbnailUrl: undefined }));
      }
      return NextResponse.json({ success: true, wishes, videoWishes: wishes, isLocked: shouldMaskVideo || undefined });
    }

    if (shouldMaskVideo) {
      return NextResponse.json({
        success: true,
        wishes: [],
        videoWishes: [],
        count: wishes.length,
        isLocked: true,
      });
    }

    return NextResponse.json({ success: true, wishes, videoWishes: wishes });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}


export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const videoFile = formData.get('video') as Blob | null;
    const eventIdParam = formData.get('eventId') as string | null;
    const rawGuestName = ((formData.get('guestName') as string) || 'Tamu Undangan').trim().slice(0, 80);
    const guestName = rawGuestName || 'Tamu Undangan';
    const tableNumber = ((formData.get('tableNumber') as string) || '').trim().slice(0, 40);
    const thumbnailUrl = (formData.get('thumbnail') as string) || '';
    const rawDuration = Number(formData.get('duration')) || 15;
    const duration = Math.min(Math.max(1, rawDuration), 15);

    if (!videoFile || !eventIdParam) {
      return NextResponse.json({ success: false, error: 'File video dan eventId wajib disertakan' }, { status: 400 });
    }

    if (videoFile.type && !videoFile.type.startsWith('video/') && !videoFile.type.startsWith('audio/')) {
      return NextResponse.json({ success: false, error: 'Format file video tidak valid' }, { status: 400 });
    }

    const event = await getEventById(eventIdParam);
    if (!event) {
      return NextResponse.json({ success: false, error: 'Acara tidak ditemukan' }, { status: 404 });
    }

    if (event.packageTier !== 'starter' && event.paymentStatus === 'pending') {
      return NextResponse.json({
        success: false,
        error: 'Album acara ini sedang menunggu penyelesaian pembayaran penyelenggara.'
      }, { status: 403 });
    }

    const retention = getEventRetentionInfo(event.eventDate, event.packageTier);
    if (retention.status === 'expired') {
      return NextResponse.json({
        success: false,
        error: 'Masa aktif album acara ini telah berakhir.'
      }, { status: 403 });
    }

    const isVipVideoTier = event.packageTier === 'wedding' || event.packageTier === 'unlimited';
    const effectiveWishType = (event.allowVoiceNote === false || event.closingWishType === 'none')
      ? 'none'
      : (event.closingWishType
          ? (isVipVideoTier ? event.closingWishType : 'voice')
          : (isVipVideoTier ? 'video' : 'voice'));

    if (effectiveWishType !== 'video') {
      return NextResponse.json({
        success: false,
        error: 'Fitur video ucapan tidak aktif untuk paket acara ini.'
      }, { status: 403 });
    }

    const maxCapacity = (event.maxGuests || 5) + (event.additionalPax || 0);
    const existingWishes = await getVideoWishes(event.id);
    if (existingWishes.length >= maxCapacity) {
      return NextResponse.json({
        success: false,
        error: `Kapasitas video ucapan untuk acara ini telah penuh (${maxCapacity} tamu).`
      }, { status: 403 });
    }

    // Rate Limit / Spam Guard: 1 Video Wish per Named Guest per Event
    const isNamed = guestName && 
      guestName.trim().toLowerCase() !== 'tamu' && 
      guestName.trim().toLowerCase() !== 'tamu undangan';

    if (isNamed) {
      const already = existingWishes.some(w => w.guestName && w.guestName.toLowerCase() === guestName.trim().toLowerCase());
      if (already) {
        return NextResponse.json({
          success: false,
          alreadySent: true,
          error: 'Anda sudah mengirimkan video ucapan untuk acara ini. Terima kasih atas ucapan dan doa terbaik Anda!'
        }, { status: 400 });
      }
    }

    const arrayBuffer = await videoFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const wishId = `vw_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Determine extension based on mimeType
    const mime = videoFile.type || 'video/webm';
    const extension = mime.includes('mp4') ? 'mp4' : mime.includes('quicktime') ? 'mov' : 'webm';
    const fileName = `${wishId}.${extension}`;

    let videoUrl = '';

    // Upload to Cloudflare R2 if configured
    if (isR2Configured) {
      try {
        const r2Key = `events/${event.id}/videos/${fileName}`;
        const r2Url = await uploadBufferToR2(buffer, r2Key, mime);
        if (r2Url) {
          videoUrl = r2Url;
        }
      } catch (e) {
        console.warn('R2 video upload failed, fallback to local:', e);
      }
    }

    // Fallback to local copy only when R2 is not configured or upload failed
    if (!videoUrl) {
      videoUrl = `/uploads/videos/${fileName}`;
      try {
        ensureVideosDir();
        const localFilePath = path.join(VIDEOS_DIR, fileName);
        fs.writeFileSync(localFilePath, buffer);
      } catch (e) {
        console.warn('Local video write skipped:', e);
      }
    }

    let resolvedThumbnailUrl = thumbnailUrl || undefined;
    if (resolvedThumbnailUrl && resolvedThumbnailUrl.startsWith('data:image/') && isR2Configured) {
      try {
        const matches = resolvedThumbnailUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const thumbMime = matches[1];
          const thumbExt = thumbMime.includes('png') ? 'png' : thumbMime.includes('webp') ? 'webp' : 'jpg';
          const thumbBuffer = Buffer.from(matches[2], 'base64');
          const thumbKey = `events/${event.id}/videos/${wishId}-thumb.${thumbExt}`;
          const r2ThumbUrl = await uploadBufferToR2(thumbBuffer, thumbKey, thumbMime);
          if (r2ThumbUrl) {
            resolvedThumbnailUrl = r2ThumbUrl;
          }
        }
      } catch (e) {
        console.warn('R2 video thumbnail upload failed, keeping fallback:', e);
      }
    }

    const newWish = await saveVideoWish({
      id: wishId,
      eventId: event.id,
      guestName: guestName.trim(),
      tableNumber: tableNumber ? tableNumber.trim() : undefined,
      videoUrl: videoUrl,
      thumbnailUrl: resolvedThumbnailUrl,
      durationSeconds: duration,
      aspectRatio: '9:16',
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({ success: true, wish: newWish });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = getServerSession(request);
    if (!session || (session.role !== 'host' && session.role !== 'vendor' && session.role !== 'admin')) {
      return NextResponse.json({ success: false, error: 'Akses ditolak: Hanya Penyelenggara Acara atau Admin yang dapat menghapus video ucapan.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID video ucapan diperlukan' }, { status: 400 });
    }

    const allWishes = await getVideoWishes();
    const target = allWishes.find(w => w.id === id);
    if (!target) {
      return NextResponse.json({ success: false, error: 'Video ucapan tidak ditemukan' }, { status: 404 });
    }

    if (session.role !== 'admin') {
      const event = await getEventById(target.eventId);
      const isOwnerHost = session.role === 'host' && (
        session.email?.toLowerCase() === event?.hostEmail?.toLowerCase() ||
        session.id === event?.hostEmail
      );
      const isOwnerVendor = session.role === 'vendor' && isSameVendorId(session.id, event?.vendorId);
      if (!isOwnerHost && !isOwnerVendor) {
        return NextResponse.json({
          success: false,
          error: 'Akses ditolak: Anda tidak memiliki wewenang untuk menghapus video ucapan dari acara ini.'
        }, { status: 403 });
      }
    }

    const success = await deleteVideoWish(id);
    if (!success) {
      return NextResponse.json({ success: false, error: 'Gagal menghapus video ucapan' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Video ucapan berhasil dihapus' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

