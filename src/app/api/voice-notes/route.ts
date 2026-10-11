import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { getEventById } from '@/lib/db';
import { uploadBufferToR2, isR2Configured } from '@/lib/r2';

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

  let resolvedEventId = eventIdParam;
  if (eventIdParam) {
    const event = await getEventById(eventIdParam);
    if (event) {
      resolvedEventId = event.id;
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
    const duration = Number(formData.get('duration')) || 0;

    const event = await getEventById(eventId);
    const targetEventId = event ? event.id : eventId;

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

    // 2. Local fallback
    ensureVoiceStorage();
    try {
      const filePath = path.join(VOICES_DIR, fileName);
      fs.writeFileSync(filePath, buffer);

      const newRecord = {
        id: noteId,
        eventId,
        guestName,
        audioUrl: `/uploads/voices/${fileName}`,
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
        .select('audio_url')
        .eq('id', id)
        .maybeSingle();

      const { error } = await supabase
        .from('voice_notes')
        .delete()
        .eq('id', id);

      if (!error) {
        if (target?.audio_url && target.audio_url.includes('/photos/')) {
          const pathPart = target.audio_url.split('/photos/')[1];
          if (pathPart) {
            await supabase.storage.from('photos').remove([pathPart]);
          }
        }
        return NextResponse.json({ success: true, message: 'Pesan suara berhasil dihapus' });
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
