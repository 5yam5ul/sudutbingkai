import { NextResponse } from 'next/server';
import { getAllEvents, getEventById, saveEvent, updateEvent } from '@/lib/db';
import { EventData } from '@/lib/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const event = await getEventById(id);
      if (!event) {
        return NextResponse.json({ success: false, error: 'Acara tidak ditemukan' }, { status: 404 });
      }
      return NextResponse.json({ success: true, event });
    }

    const events = await getAllEvents();
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

    const newEvent: EventData = {
      id,
      title: body.title.trim(),
      coupleOrHost: body.coupleOrHost.trim(),
      eventDate: body.eventDate || new Date().toISOString(),
      location: (body.location || '').trim(),
      preset: body.preset || 'portra',
      allowedPresets: body.allowedPresets || ['portra'],
      allowGuestPresetSwitch: body.allowGuestPresetSwitch !== false,
      packageTier: body.packageTier || 'classic',
      maxGuests: Number(body.maxGuests) || 150,
      shotsPerGuest: Number(body.shotsPerGuest) || 20,
      revealMode: body.revealMode || 'instant',
      revealTime: body.revealTime,
      coverUrl: body.coverUrl,
      frameId: body.frameId || 'minimal-gold',
      customFrameUrl: body.customFrameUrl,
      frameText: body.frameText,
      allowVoiceNote: body.allowVoiceNote !== false,
      allowGuestFrameToggle: body.allowGuestFrameToggle !== false,
      createdAt: new Date().toISOString(),
      hostEmail: body.hostEmail,
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

    const updates: Partial<EventData> = {};
    if (body.title) updates.title = body.title.trim();
    if (body.coupleOrHost) updates.coupleOrHost = body.coupleOrHost.trim();
    if (body.eventDate) updates.eventDate = body.eventDate;
    if (body.location !== undefined) updates.location = body.location.trim();
    if (body.preset) updates.preset = body.preset;
    if (body.allowedPresets) updates.allowedPresets = body.allowedPresets;
    if (body.allowGuestPresetSwitch !== undefined) updates.allowGuestPresetSwitch = body.allowGuestPresetSwitch;
    if (body.packageTier) updates.packageTier = body.packageTier;
    if (body.maxGuests) updates.maxGuests = Number(body.maxGuests);
    if (body.shotsPerGuest) updates.shotsPerGuest = Number(body.shotsPerGuest);
    if (body.revealMode) updates.revealMode = body.revealMode;
    if (body.revealTime !== undefined) updates.revealTime = body.revealTime;
    if (body.frameId) updates.frameId = body.frameId;
    if (body.customFrameUrl !== undefined) updates.customFrameUrl = body.customFrameUrl;
    if (body.frameText !== undefined) updates.frameText = body.frameText;
    if (body.allowVoiceNote !== undefined) updates.allowVoiceNote = body.allowVoiceNote;
    if (body.allowGuestFrameToggle !== undefined) updates.allowGuestFrameToggle = body.allowGuestFrameToggle;

    const updated = await updateEvent(body.id, updates);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Acara tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ success: true, event: updated });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}
