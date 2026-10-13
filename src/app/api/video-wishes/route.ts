import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getVideoWishes, saveVideoWish, deleteVideoWish, getEventById } from '@/lib/db';
import { uploadBufferToR2, isR2Configured } from '@/lib/r2';
import { getServerSession } from '@/lib/auth';

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
    if (eventId) {
      const ev = await getEventById(eventId);
      if (ev) canonicalEventId = ev.id;
    }

    let wishes = await getVideoWishes(canonicalEventId);
    if (guestNameParam && guestNameParam.trim() !== 'Tamu' && guestNameParam.trim() !== 'Tamu Undangan') {
      wishes = wishes.filter(w => w.guestName && w.guestName.toLowerCase() === guestNameParam.trim().toLowerCase());
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
    const guestName = (formData.get('guestName') as string) || 'Tamu Undangan';
    const tableNumber = (formData.get('tableNumber') as string) || '';
    const thumbnailUrl = (formData.get('thumbnail') as string) || '';
    const duration = Number(formData.get('duration')) || 15;

    if (!videoFile || !eventIdParam) {
      return NextResponse.json({ success: false, error: 'File video dan eventId wajib disertakan' }, { status: 400 });
    }

    const event = await getEventById(eventIdParam);
    if (!event) {
      return NextResponse.json({ success: false, error: 'Acara tidak ditemukan' }, { status: 404 });
    }

    // Rate Limit / Spam Guard: 1 Video Wish per Named Guest per Event
    const isNamed = guestName && 
      guestName.trim().toLowerCase() !== 'tamu' && 
      guestName.trim().toLowerCase() !== 'tamu undangan';

    if (isNamed) {
      const existingWishes = await getVideoWishes(event.id);
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

    let videoUrl = `/uploads/videos/${fileName}`;

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

    // Always keep a local copy as well
    try {
      ensureVideosDir();
      const localFilePath = path.join(VIDEOS_DIR, fileName);
      fs.writeFileSync(localFilePath, buffer);
    } catch (e) {
      console.warn('Local video write skipped:', e);
    }

    const newWish = await saveVideoWish({
      id: wishId,
      eventId: event.id,
      guestName: guestName.trim(),
      tableNumber: tableNumber ? tableNumber.trim() : undefined,
      videoUrl: videoUrl,
      thumbnailUrl: thumbnailUrl || undefined,
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
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID video ucapan diperlukan' }, { status: 400 });
    }

    const success = await deleteVideoWish(id);
    return NextResponse.json({ success: true, message: 'Video ucapan berhasil dihapus' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
