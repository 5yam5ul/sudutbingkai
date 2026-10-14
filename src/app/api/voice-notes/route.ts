import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { getEventById } from '@/lib/db';
import { uploadBufferToR2, deleteFromR2, isR2Configured } from '@/lib/r2';
import { getServerSession, isSameVendorId } from '@/lib/auth';
import { getEventRetentionInfo } from '@/lib/types';
import { isMayarConfigured } from '@/lib/mayar';

const VOICES_DIR = path.join(process.cwd(), 'public', 'uploads', 'voices');
const VOICES_JSON = path.join(process.cwd(), 'data', 'voice_notes.json');

function ensureVoiceStorage() {
  try {
    if (!fs.existsSync(VOICES_DIR)) {
      fs.mkdirSync(VOICES_DIR, { recursive: true });
    }
    if (!fs.existsSync(path.dirname(VOICES_JSON))) {
      fs.mkdirSync(path.dirname(VOICES_JSON), { recursive: true });
    }
    if (!fs.existsSync(VOICES_JSON)) {
      fs.writeFileSync(VOICES_JSON, JSON.stringify([], null, 2), 'utf8');
    }
  } catch {
    // Read-only filesystem
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventIdParam = searchParams.get('eventId');
  const guestNameParam = searchParams.get('guestName');
  const session = getServerSession(request);

  let resolvedEventId = eventIdParam;
  let targetEvent = null;
  if (eventIdParam) {
    targetEvent = await getEventById(eventIdParam);
    if (targetEvent) {
      resolvedEventId = targetEvent.id;
    }
  }

  // If no eventId is provided, strictly require Super Admin session
  if (!resolvedEventId) {
    if (!session || session.role !== 'admin') {
      return NextResponse.json({
        success: false,
        error: 'Akses ditolak: Parameter eventId atau sesi Admin diperlukan.'
      }, { status: 403 });
    }
  }

  const isSpecificNamedGuestQuery = Boolean(
    guestNameParam && guestNameParam.trim() !== 'Tamu' && guestNameParam.trim() !== 'Tamu Undangan'
  );

  if (!isSpecificNamedGuestQuery && targetEvent && targetEvent.revealMode === 'delayed' && targetEvent.revealTime) {
    const isDelayedLocked = Date.now() < new Date(targetEvent.revealTime).getTime();
    if (isDelayedLocked) {
      const isAuthorizedManager = Boolean(
        session &&
          (session.role === 'admin' ||
            (session.role === 'host' &&
              targetEvent.hostEmail &&
              session.email.toLowerCase() === targetEvent.hostEmail.toLowerCase()) ||
            (session.role === 'vendor' && isSameVendorId(session.id, targetEvent.vendorId)))
      );
      if (!isAuthorizedManager) {
        return NextResponse.json({
          success: true,
          voiceNotes: [],
          isLocked: true,
        });
      }
    }
  }

  // 1. Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      let query = supabase
        .from('voice_notes')
        .select('*')
        .order('timestamp', { ascending: false });

      if (resolvedEventId) {
        query = query.eq('event_id', resolvedEventId);
      }
      if (guestNameParam && guestNameParam.trim() !== 'Tamu' && guestNameParam.trim() !== 'Tamu Undangan') {
        query = query.ilike('guest_name', guestNameParam.trim());
      }

      const { data, error } = await query;
      if (!error && data) {
        const formatted = data.map(item => ({
          id: item.id,
          eventId: item.event_id,
          guestName: item.guest_name,
          audioUrl: item.audio_url,
          duration: item.duration,
          timestamp: item.timestamp
        }));
        return NextResponse.json({ success: true, voiceNotes: formatted });
      }
    } catch (e) {
      console.warn('Supabase voice_notes GET error:', e);
    }
  }

  // 2. Local fallback
  ensureVoiceStorage();
  try {
    if (fs.existsSync(VOICES_JSON)) {
      const raw = fs.readFileSync(VOICES_JSON, 'utf8');
      let notes = JSON.parse(raw);
      if (resolvedEventId) {
        notes = notes.filter((n: any) => n.eventId === resolvedEventId);
      }
      if (guestNameParam && guestNameParam.trim() !== 'Tamu' && guestNameParam.trim() !== 'Tamu Undangan') {
        notes = notes.filter((n: any) => n.guestName?.toLowerCase() === guestNameParam.trim().toLowerCase());
      }
      return NextResponse.json({ success: true, voiceNotes: notes });
    }
  } catch {}
  return NextResponse.json({ success: true, voiceNotes: [] });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const eventId = formData.get('eventId') as string;
    const guestName = (formData.get('guestName') as string) || 'Tamu';
    const audioFile = formData.get('audio') as File;
    const rawDuration = Number(formData.get('duration')) || 15;
    const duration = Math.min(Math.max(1, rawDuration), 15);

    const event = await getEventById(eventId);
    const targetEventId = event ? event.id : eventId;

    if (event) {
      if (event.packageTier !== 'starter' && event.paymentStatus === 'pending' && isMayarConfigured) {
        return NextResponse.json({
          success: false,
          error: 'Album acara ini sedang menunggu penyelesaian pembayaran.'
        }, { status: 403 });
      }
      const retention = getEventRetentionInfo(event.eventDate, event.packageTier);
      if (retention.status === 'expired') {
        return NextResponse.json({
          success: false,
          error: 'Masa aktif album acara ini telah berakhir.'
        }, { status: 403 });
      }
    }

    // Rate Limit / Spam Guard: 1 Voice Note per Named Guest per Event
    const isNamed = guestName && 
      guestName.trim().toLowerCase() !== 'tamu' && 
      guestName.trim().toLowerCase() !== 'tamu undangan';

    if (isNamed) {
      if (isSupabaseConfigured && supabase) {
        const { data: existingNotes } = await supabase
          .from('voice_notes')
          .select('id')
          .eq('event_id', targetEventId)
          .ilike('guest_name', guestName.trim())
          .limit(1);

        if (existingNotes && existingNotes.length > 0) {
          return NextResponse.json({
            success: false,
            alreadySent: true,
            error: 'Anda sudah mengirimkan pesan suara untuk acara ini. Terima kasih atas ucapan dan doa terbaik Anda!'
          }, { status: 400 });
        }
      } else {
        ensureVoiceStorage();
        if (fs.existsSync(VOICES_JSON)) {
          const raw = fs.readFileSync(VOICES_JSON, 'utf8');
          const notes = JSON.parse(raw);
          const already = notes.some((n: any) => n.eventId === targetEventId && n.guestName?.toLowerCase() === guestName.trim().toLowerCase());
          if (already) {
            return NextResponse.json({
              success: false,
              alreadySent: true,
              error: 'Anda sudah mengirimkan pesan suara untuk acara ini. Terima kasih atas ucapan dan doa terbaik Anda!'
            }, { status: 400 });
          }
        }
      }
    }

    const noteId = `voice-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const extension = audioFile.type.includes('mp4') ? 'm4a' : 'webm';
    const fileName = `${noteId}.${extension}`;
    const buffer = Buffer.from(await audioFile.arrayBuffer());

    let audioUrl = '';

    // 1. Cloudflare R2 Upload (Zero-egress audio storage)
    const storagePath = `voices/${targetEventId}/${fileName}`;
    if (isR2Configured) {
      try {
        const r2Url = await uploadBufferToR2(buffer, storagePath, audioFile.type || 'audio/webm');
        if (r2Url) {
          audioUrl = r2Url;
        }
      } catch (r2Err) {
        console.warn('R2 voice note upload failed, will fallback:', r2Err);
      }
    }

    // 2. Supabase Storage (Fallback) + Table
    if (isSupabaseConfigured && supabase) {
      try {
        if (!audioUrl) {
          const { error: uploadError } = await supabase.storage
            .from('photos')
            .upload(storagePath, buffer, {
              contentType: audioFile.type || 'audio/webm',
              upsert: true
            });

          if (!uploadError) {
            const { data: publicUrlData } = supabase.storage
              .from('photos')
              .getPublicUrl(storagePath);
            audioUrl = publicUrlData.publicUrl;
          } else {
            console.warn('Supabase voice storage upload error:', uploadError.message);
          }
        }

        const record = {
          id: noteId,
          event_id: targetEventId,
          guest_name: guestName,
          audio_url: audioUrl,
          duration,
          timestamp: new Date().toISOString()
        };

        const { error: dbError } = await supabase
          .from('voice_notes')
          .insert(record);

        if (!dbError) {
          return NextResponse.json({
            success: true,
            voiceNote: {
              id: noteId,
              eventId,
              guestName,
              audioUrl,
              duration,
              timestamp: record.timestamp
            }
          });
        }
        console.warn('Supabase voice_notes DB insert error:', dbError.message);
      } catch (sbEx) {
        console.warn('Supabase voice error:', sbEx);
      }
    }

    // 3. Local fallback (preserve R2 audioUrl if already uploaded)
    ensureVoiceStorage();
    try {
      if (!audioUrl) {
        const filePath = path.join(VOICES_DIR, fileName);
        fs.writeFileSync(filePath, buffer);
      }

      const newRecord = {
        id: noteId,
        eventId: targetEventId,
        guestName,
        audioUrl: audioUrl || `/uploads/voices/${fileName}`,
        duration,
        timestamp: new Date().toISOString()
      };

      const raw = fs.existsSync(VOICES_JSON) ? fs.readFileSync(VOICES_JSON, 'utf8') : '[]';
      const notes = JSON.parse(raw);
      notes.unshift(newRecord);
      fs.writeFileSync(VOICES_JSON, JSON.stringify(notes, null, 2), 'utf8');

      return NextResponse.json({ success: true, voiceNote: newRecord });
    } catch (fsErr) {
      console.error('Local voice fallback failed:', fsErr);
      return NextResponse.json({
        success: false,
        error: 'Penyimpanan rekaman suara gagal. Pastikan Supabase telah aktif.'
      }, { status: 500 });
    }
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const session = getServerSession(request);
  if (!session || (session.role !== 'host' && session.role !== 'vendor' && session.role !== 'admin')) {
    return NextResponse.json({ success: false, error: 'Akses ditolak: Hanya Penyelenggara Acara atau Admin yang dapat menghapus pesan suara.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ success: false, error: 'ID pesan suara diperlukan' }, { status: 400 });
  }

  // 1. Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: target } = await supabase
        .from('voice_notes')
        .select('audio_url, event_id')
        .eq('id', id)
        .maybeSingle();

      if (target) {
        if (session.role !== 'admin') {
          const event = await getEventById(target.event_id);
          const isOwnerHost = session.role === 'host' && (
            session.email?.toLowerCase() === event?.hostEmail?.toLowerCase() ||
            session.id === event?.hostEmail
          );
          const isOwnerVendor = session.role === 'vendor' && isSameVendorId(session.id, event?.vendorId);
          if (!isOwnerHost && !isOwnerVendor) {
            return NextResponse.json({
              success: false,
              error: 'Akses ditolak: Anda tidak memiliki wewenang untuk menghapus pesan suara dari acara ini.'
            }, { status: 403 });
          }
        }

        const { error } = await supabase
          .from('voice_notes')
          .delete()
          .eq('id', id);

        if (!error) {
          if (target.audio_url) {
            await deleteFromR2(target.audio_url);
            if (target.audio_url.includes('/photos/')) {
              const pathPart = target.audio_url.split('/photos/')[1];
              if (pathPart) {
                await supabase.storage.from('photos').remove([pathPart]);
              }
            }
          }
          try {
            if (fs.existsSync(VOICES_JSON)) {
              const raw = fs.readFileSync(VOICES_JSON, 'utf8');
              const notes = JSON.parse(raw);
              const remaining = notes.filter((n: any) => n.id !== id);
              fs.writeFileSync(VOICES_JSON, JSON.stringify(remaining, null, 2), 'utf8');
            }
          } catch {}
          return NextResponse.json({ success: true, message: 'Pesan suara berhasil dihapus' });
        }
      }
    } catch (e) {
      console.warn('Supabase voice_notes DELETE error:', e);
    }
  }

  // 2. Local fallback
  ensureVoiceStorage();
  try {
    if (fs.existsSync(VOICES_JSON)) {
      const raw = fs.readFileSync(VOICES_JSON, 'utf8');
      const notes = JSON.parse(raw);
      const target = notes.find((n: any) => n.id === id);
      if (!target) {
        return NextResponse.json({ success: false, error: 'Pesan suara tidak ditemukan' }, { status: 404 });
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
            error: 'Akses ditolak: Anda tidak memiliki wewenang untuk menghapus pesan suara dari acara ini.'
          }, { status: 403 });
        }
      }

      if (target.audioUrl) {
        await deleteFromR2(target.audioUrl);
      }

      try {
        const fileName = path.basename(target.audioUrl);
        const filePath = path.join(VOICES_DIR, fileName);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch {}

      const remaining = notes.filter((n: any) => n.id !== id);
      fs.writeFileSync(VOICES_JSON, JSON.stringify(remaining, null, 2), 'utf8');
      return NextResponse.json({ success: true, message: 'Pesan suara berhasil dihapus' });
    }
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }

  return NextResponse.json({ success: false, error: 'Pesan suara tidak ditemukan' }, { status: 404 });
}
