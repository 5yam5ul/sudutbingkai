import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { getEventById, getAllPhotos, getVideoWishes } from '@/lib/db';
import { getServerSession, isSameVendorId } from '@/lib/auth';

const DATA_DIR = path.join(process.cwd(), 'data');
const GUESTS_FILE = path.join(DATA_DIR, 'guests.json');

function ensureGuestsStorage() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(GUESTS_FILE)) {
      fs.writeFileSync(GUESTS_FILE, JSON.stringify([], null, 2), 'utf8');
    }
  } catch {}
}

export interface GuestRecord {
  id: string;
  eventId: string;
  guestName: string;
  sessionId: string;
  checkedInAt: string;
  lastActiveAt?: string;
  shotsCount: number;
  hasVoiceNote: boolean;
  hasVideoWish: boolean;
  latestPhotoUrl?: string;
  notes?: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventIdParam = searchParams.get('eventId');

    if (!eventIdParam) {
      return NextResponse.json({ success: false, error: 'Parameter eventId wajib disertakan' }, { status: 400 });
    }

    const session = getServerSession(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak: Sesi login diperlukan untuk melihat buku tamu.' },
        { status: 401 }
      );
    }

    const event = await getEventById(eventIdParam);
    if (!event) {
      return NextResponse.json({ success: false, error: 'Acara tidak ditemukan' }, { status: 404 });
    }

    const isAuthorizedHost =
      (session.role === 'host' || session.role === 'vendor') &&
      Boolean(
        (session.email && event.hostEmail && session.email.toLowerCase() === event.hostEmail.toLowerCase()) ||
        (session.id && session.id === event.hostEmail)
      );
    const isAuthorizedVendor = session.role === 'vendor' && isSameVendorId(session.id, event.vendorId);
    const isAdmin = session.role === 'admin';

    if (!isAuthorizedHost && !isAuthorizedVendor && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak: Buku tamu acara ini hanya dapat diakses oleh pemilik acara.' },
        { status: 403 }
      );
    }

    const canonicalEventId = event.id;

    // 1. Gather all activity from Photos, Voice Notes, and Video Wishes for this event
    const [allPhotos, videoWishes] = await Promise.all([
      getAllPhotos(canonicalEventId, true).catch(() => []),
      getVideoWishes(canonicalEventId).catch(() => []),
    ]);

    // Query voice notes from Supabase or fallback
    let voiceNotes: any[] = [];
    if (isSupabaseConfigured && supabase) {
      try {
        const { data } = await supabase.from('voice_notes').select('session_id, guest_name, created_at').eq('event_id', canonicalEventId);
        if (data) voiceNotes = data;
      } catch {}
    }

    // 2. Read explicitly recorded check-ins from local JSON
    ensureGuestsStorage();
    let localGuests: any[] = [];
    try {
      if (fs.existsSync(GUESTS_FILE)) {
        const raw = fs.readFileSync(GUESTS_FILE, 'utf8');
        localGuests = JSON.parse(raw).filter((g: any) => g.eventId === canonicalEventId);
      }
    } catch {}

    // 3. Try reading from Supabase guests table if it exists
    let supaGuests: any[] = [];
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('guests').select('*').eq('event_id', canonicalEventId);
        if (!error && data) {
          supaGuests = data;
        }
      } catch {}
    }

    // 4. Merge all sources into a cohesive Guestbook map (keyed by sessionId or lowercase guestName)
    const guestMap = new Map<string, GuestRecord>();

    // Helper to get or create guest record
    const getGuestKey = (sessionId?: string, name?: string) => {
      if (sessionId && sessionId.trim()) return `sess_${sessionId.trim()}`;
      if (name && name.trim()) return `name_${name.trim().toLowerCase()}`;
      return `unknown_${Math.random()}`;
    };

    // Populate from recorded check-ins first
    for (const g of [...localGuests, ...supaGuests]) {
      const sId = g.sessionId || g.session_id || '';
      const name = g.guestName || g.guest_name || 'Tamu Undangan';
      const key = getGuestKey(sId, name);
      guestMap.set(key, {
        id: g.id || `guest_${sId || Math.random().toString(36).slice(2, 8)}`,
        eventId: canonicalEventId,
        guestName: name,
        sessionId: sId,
        checkedInAt: g.checkedInAt || g.checked_in_at || g.createdAt || g.created_at || new Date().toISOString(),
        lastActiveAt: g.lastActiveAt || g.last_active_at || g.checkedInAt || g.checked_in_at || new Date().toISOString(),
        shotsCount: 0,
        hasVoiceNote: false,
        hasVideoWish: false,
        notes: g.notes || undefined,
      });
    }

    // Incorporate photos (find existing guest or create one)
    for (const p of allPhotos) {
      const sId = p.sessionId || '';
      const name = p.guestName || 'Tamu Undangan';
      const key = getGuestKey(sId, name);

      let record = guestMap.get(key);
      if (!record) {
        record = {
          id: `guest_${sId || Math.random().toString(36).slice(2, 8)}`,
          eventId: canonicalEventId,
          guestName: name,
          sessionId: sId,
          checkedInAt: p.timestamp || new Date().toISOString(),
          lastActiveAt: p.timestamp || new Date().toISOString(),
          shotsCount: 0,
          hasVoiceNote: false,
          hasVideoWish: false,
          latestPhotoUrl: p.imageData,
        };
        guestMap.set(key, record);
      }

      record.shotsCount += 1;
      if (!record.latestPhotoUrl && p.imageData) {
        record.latestPhotoUrl = p.imageData;
      }
      if (p.timestamp) {
        if (!record.checkedInAt || new Date(p.timestamp) < new Date(record.checkedInAt)) {
          record.checkedInAt = p.timestamp;
        }
        if (!record.lastActiveAt || new Date(p.timestamp) > new Date(record.lastActiveAt)) {
          record.lastActiveAt = p.timestamp;
          if (p.imageData) record.latestPhotoUrl = p.imageData;
        }
      }
      if (p.voiceNoteUrl) {
        record.hasVoiceNote = true;
      }
    }

    // Incorporate voice notes
    for (const v of voiceNotes) {
      const sId = v.session_id || '';
      const name = v.guest_name || 'Tamu Undangan';
      const key = getGuestKey(sId, name);
      const record = guestMap.get(key);
      if (record) {
        record.hasVoiceNote = true;
      }
    }

    // Incorporate video wishes
    for (const w of videoWishes) {
      const sId = w.sessionId || '';
      const name = w.guestName || 'Tamu Undangan';
      const key = getGuestKey(sId, name);
      const record = guestMap.get(key);
      if (record) {
        record.hasVideoWish = true;
      }
    }

    const guestsList = Array.from(guestMap.values()).sort(
      (a, b) => new Date(b.checkedInAt).getTime() - new Date(a.checkedInAt).getTime()
    );

    const totalShots = guestsList.reduce((acc, curr) => acc + curr.shotsCount, 0);

    return NextResponse.json({
      success: true,
      count: guestsList.length,
      totalShots,
      guests: guestsList,
    });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { eventId, guestName, sessionId, notes } = body;

    if (!eventId || !guestName) {
      return NextResponse.json({ success: false, error: 'eventId dan guestName wajib diisi' }, { status: 400 });
    }

    const event = await getEventById(eventId);
    const canonicalEventId = event ? event.id : eventId;
    const cleanName = guestName.trim().slice(0, 80);
    const cleanSession = (sessionId || '').trim().slice(0, 100);
    const nowIso = new Date().toISOString();
    const guestId = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const newGuestRecord: GuestRecord = {
      id: guestId,
      eventId: canonicalEventId,
      guestName: cleanName,
      sessionId: cleanSession,
      checkedInAt: nowIso,
      lastActiveAt: nowIso,
      shotsCount: 0,
      hasVoiceNote: false,
      hasVideoWish: false,
      notes: notes || undefined,
    };

    // 1. Save to local data
    ensureGuestsStorage();
    try {
      let list: any[] = [];
      if (fs.existsSync(GUESTS_FILE)) {
        list = JSON.parse(fs.readFileSync(GUESTS_FILE, 'utf8'));
      }
      // Check if session already checked in
      const existingIdx = list.findIndex(
        (g: any) => g.eventId === canonicalEventId && ((cleanSession && g.sessionId === cleanSession) || (g.guestName?.toLowerCase() === cleanName.toLowerCase()))
      );

      if (existingIdx >= 0) {
        list[existingIdx].lastActiveAt = nowIso;
        list[existingIdx].guestName = cleanName;
        newGuestRecord.id = list[existingIdx].id;
        newGuestRecord.checkedInAt = list[existingIdx].checkedInAt || nowIso;
      } else {
        list.unshift(newGuestRecord);
      }
      fs.writeFileSync(GUESTS_FILE, JSON.stringify(list, null, 2), 'utf8');
    } catch (e) {
      console.warn('Local guests.json write error:', e);
    }

    // 2. Try saving to Supabase if guests table exists
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('guests').upsert({
          id: newGuestRecord.id,
          event_id: canonicalEventId,
          guest_name: cleanName,
          session_id: cleanSession,
          checked_in_at: newGuestRecord.checkedInAt,
          last_active_at: nowIso,
          notes: notes || null,
        });
      } catch {
        // Table might not exist yet, local fallback succeeded
      }
    }

    return NextResponse.json({ success: true, guest: newGuestRecord });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
