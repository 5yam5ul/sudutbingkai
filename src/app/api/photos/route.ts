import { NextResponse } from 'next/server';
import { getAllPhotos, savePhoto, updatePhoto, deletePhoto, getEventById } from '@/lib/db';
import { PhotoRecord } from '@/lib/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId') || undefined;
    const includeHidden = searchParams.get('includeHidden') === 'true';

    const photos = await getAllPhotos(eventId, includeHidden);
    return NextResponse.json({ success: true, photos });
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

    // Validate that event exists
    const event = await getEventById(body.eventId);
    if (!event) {
      return NextResponse.json({ success: false, error: 'Acara tidak ditemukan' }, { status: 404 });
    }

    // Safety check on base64 payload size (max 15MB)
    if (typeof body.imageData === 'string' && body.imageData.length > 20 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: 'Ukuran foto melebihi batas maksimal' }, { status: 413 });
    }

    const newPhoto: PhotoRecord = {
      id: 'photo-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      eventId: body.eventId,
      guestName: (body.guestName || 'Tamu').trim(),
      sessionId: body.sessionId || 'session-' + Date.now(),
      shotNumber: Number(body.shotNumber) || 1,
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
