import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const VOICES_DIR = path.join(process.cwd(), 'public', 'uploads', 'voices');
const VOICES_JSON = path.join(process.cwd(), 'data', 'voice_notes.json');

function ensureVoiceStorage() {
  if (!fs.existsSync(VOICES_DIR)) {
    fs.mkdirSync(VOICES_DIR, { recursive: true });
  }
  if (!fs.existsSync(path.dirname(VOICES_JSON))) {
    fs.mkdirSync(path.dirname(VOICES_JSON), { recursive: true });
  }
  if (!fs.existsSync(VOICES_JSON)) {
    fs.writeFileSync(VOICES_JSON, JSON.stringify([], null, 2), 'utf8');
  }
}

export async function GET(request: Request) {
  ensureVoiceStorage();
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');

    const raw = fs.readFileSync(VOICES_JSON, 'utf8');
    let notes = JSON.parse(raw);
    if (eventId) {
      notes = notes.filter((n: any) => n.eventId === eventId);
    }
    return NextResponse.json({ success: true, voiceNotes: notes });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  ensureVoiceStorage();
  try {
    const formData = await request.formData();
    const eventId = formData.get('eventId') as string;
    const guestName = (formData.get('guestName') as string) || 'Tamu';
    const audioFile = formData.get('audio') as File;

    if (!eventId || !audioFile) {
      return NextResponse.json({ success: false, error: 'Data audio dan eventId wajib' }, { status: 400 });
    }

    const noteId = `voice-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const extension = audioFile.type.includes('mp4') ? 'm4a' : 'webm';
    const fileName = `${noteId}.${extension}`;
    const filePath = path.join(VOICES_DIR, fileName);

    const buffer = Buffer.from(await audioFile.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    const newRecord = {
      id: noteId,
      eventId,
      guestName,
      audioUrl: `/uploads/voices/${fileName}`,
      duration: Number(formData.get('duration')) || 0,
      timestamp: new Date().toISOString()
    };

    const raw = fs.readFileSync(VOICES_JSON, 'utf8');
    const notes = JSON.parse(raw);
    notes.unshift(newRecord);
    fs.writeFileSync(VOICES_JSON, JSON.stringify(notes, null, 2), 'utf8');

    return NextResponse.json({ success: true, voiceNote: newRecord });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  ensureVoiceStorage();
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID pesan suara diperlukan' }, { status: 400 });
    }

    const raw = fs.readFileSync(VOICES_JSON, 'utf8');
    const notes = JSON.parse(raw);
    const target = notes.find((n: any) => n.id === id);
    if (!target) {
      return NextResponse.json({ success: false, error: 'Pesan suara tidak ditemukan' }, { status: 404 });
    }

    // Try deleting file if exists
    try {
      const fileName = path.basename(target.audioUrl);
      const filePath = path.join(VOICES_DIR, fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (e) {
      console.warn('Could not unlink voice file:', e);
    }

    const remaining = notes.filter((n: any) => n.id !== id);
    fs.writeFileSync(VOICES_JSON, JSON.stringify(remaining, null, 2), 'utf8');

    return NextResponse.json({ success: true, message: 'Pesan suara berhasil dihapus' });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

