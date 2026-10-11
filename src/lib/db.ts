import fs from 'fs';
import path from 'path';
import { EventData, PhotoRecord } from './types';
import { supabase, isSupabaseConfigured } from './supabase';

const DATA_DIR = path.join(process.cwd(), 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');
const PHOTOS_FILE = path.join(DATA_DIR, 'photos.json');
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

// Safe file system helpers for local mode / fallback
function safeEnsureDir(dirPath: string) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  } catch {
    // Read-only filesystem (e.g., Vercel serverless)
  }
}

function ensureLocalDataFiles() {
  safeEnsureDir(DATA_DIR);
  safeEnsureDir(UPLOADS_DIR);

  try {
    if (!fs.existsSync(EVENTS_FILE)) {
      const sampleEvent: EventData = {
        id: 'wedding-sarah-dimas',
        title: 'Pernikahan Sarah & Dimas',
        coupleOrHost: 'Sarah & Dimas',
        eventDate: '2026-11-20T09:00:00Z',
        location: 'Plataran Dharmawangsa, Jakarta',
        preset: 'portra',
        maxGuests: 150,
        shotsPerGuest: 20,
        revealMode: 'instant',
        createdAt: new Date().toISOString()
      };
      fs.writeFileSync(EVENTS_FILE, JSON.stringify([sampleEvent], null, 2), 'utf8');
    }

    if (!fs.existsSync(PHOTOS_FILE)) {
      fs.writeFileSync(PHOTOS_FILE, JSON.stringify([], null, 2), 'utf8');
    }
  } catch {
    // Ignore in read-only environment
  }
}

function saveImageToLocalFile(photoId: string, base64OrPath: string): string {
  if (!base64OrPath || !base64OrPath.startsWith('data:image')) {
    return base64OrPath;
  }

  try {
    safeEnsureDir(UPLOADS_DIR);
    const matches = base64OrPath.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
    const extension = matches && matches[1] === 'png' ? 'png' : 'jpg';
    const base64Data = matches ? matches[2] : base64OrPath.replace(/^data:image\/\w+;base64,/, '');

    const fileName = `${photoId}.${extension}`;
    const filePath = path.join(UPLOADS_DIR, fileName);
    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

    return `/uploads/${fileName}`;
  } catch (err) {
    console.warn('Local file write skipped:', err);
    return base64OrPath;
  }
}

// ---------------------------------------------------------------------------
// Supabase Data Transformers
// ---------------------------------------------------------------------------

function rowToEvent(row: any): EventData {
  return {
    id: row.id,
    title: row.title,
    coupleOrHost: row.couple_or_host,
    eventDate: row.event_date,
    location: row.location || undefined,
    preset: row.preset,
    allowedPresets: row.allowed_presets || undefined,
    allowGuestPresetSwitch: row.allow_guest_preset_switch,
    packageTier: row.package_tier,
    maxGuests: row.max_guests,
    shotsPerGuest: row.shots_per_guest,
    revealMode: row.reveal_mode,
    revealTime: row.reveal_time || undefined,
    frameId: row.frame_id,
    customFrameUrl: row.custom_frame_url || undefined,
    frameText: row.frame_text || undefined,
    allowVoiceNote: row.allow_voice_note,
    allowGuestFrameToggle: row.allow_guest_frame_toggle,
    coverUrl: row.cover_url || undefined,
    createdAt: row.created_at,
    hostEmail: row.host_email || undefined,
    vendorId: row.vendor_id || undefined,
    vendorName: row.vendor_name || undefined,
    vendorLogo: row.vendor_logo || undefined,
    vendorInstagram: row.vendor_instagram || undefined,
  };
}

function eventToRow(event: EventData) {
  return {
    id: event.id,
    title: event.title,
    couple_or_host: event.coupleOrHost,
    event_date: event.eventDate,
    location: event.location || null,
    preset: event.preset || 'portra',
    allowed_presets: event.allowedPresets || null,
    allow_guest_preset_switch: event.allowGuestPresetSwitch ?? true,
    package_tier: event.packageTier || 'wedding',
    max_guests: event.maxGuests,
    shots_per_guest: event.shotsPerGuest,
    reveal_mode: event.revealMode || 'instant',
    reveal_time: event.revealTime || null,
    frame_id: event.frameId || 'minimal-gold',
    custom_frame_url: event.customFrameUrl || null,
    frame_text: event.frameText || null,
    allow_voice_note: event.allowVoiceNote ?? true,
    allow_guest_frame_toggle: event.allowGuestFrameToggle ?? true,
    cover_url: event.coverUrl || null,
    host_email: event.hostEmail || null,
    vendor_id: event.vendorId || null,
    vendor_name: event.vendorName || null,
    vendor_logo: event.vendorLogo || null,
    vendor_instagram: event.vendorInstagram || null,
    created_at: event.createdAt || new Date().toISOString()
  };
}

function rowToPhoto(row: any): PhotoRecord {
  return {
    id: row.id,
    eventId: row.event_id,
    guestName: row.guest_name,
    sessionId: row.session_id,
    shotNumber: row.shot_number,
    imageData: row.image_url,
    caption: row.caption || undefined,
    isHidden: row.is_hidden || false,
    aspectRatio: row.aspect_ratio || '3:4',
    frameId: row.frame_id || 'none',
    voiceNoteUrl: row.voice_note_url || undefined,
    timestamp: row.timestamp
  };
}

function photoToRow(photo: PhotoRecord, imageUrl: string) {
  return {
    id: photo.id,
    event_id: photo.eventId,
    guest_name: photo.guestName,
    session_id: photo.sessionId,
    shot_number: photo.shotNumber,
    image_url: imageUrl,
    caption: photo.caption || null,
    is_hidden: photo.isHidden || false,
    aspect_ratio: photo.aspectRatio || '3:4',
    frame_id: photo.frameId || 'none',
    voice_note_url: photo.voiceNoteUrl || null,
    timestamp: photo.timestamp || new Date().toISOString()
  };
}

// ---------------------------------------------------------------------------
// EVENTS API
// ---------------------------------------------------------------------------

export async function getAllEvents(): Promise<EventData[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data.map(rowToEvent);
      }
      if (error) {
        console.warn('Supabase getAllEvents error, falling back to local:', error.message);
      }
    } catch (err) {
      console.warn('Supabase getAllEvents exception:', err);
    }
  }

  // Local JSON fallback
  ensureLocalDataFiles();
  try {
    if (fs.existsSync(EVENTS_FILE)) {
      const raw = fs.readFileSync(EVENTS_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch {}
  return [];
}

export async function getEventById(id: string): Promise<EventData | null> {
  const targetId = id === 'demo-nikahan' ? 'wedding-sarah-dimas' : id;
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .or(`id.eq.${id},id.eq.${targetId}`)
        .maybeSingle();

      if (!error && data) {
        return rowToEvent(data);
      }
      if (error) {
        console.warn(`Supabase getEventById(${id}) error, falling back to local:`, error.message);
      }
    } catch (err) {
      console.warn('Supabase getEventById exception:', err);
    }
  }

  // Local JSON fallback
  const events = await getAllEvents();
  return events.find(e => e.id === id || e.id === targetId) || null;
}

export async function saveEvent(event: EventData): Promise<EventData> {
  if (isSupabaseConfigured && supabase) {
    try {
      const row = eventToRow(event);
      const { error } = await supabase
        .from('events')
        .upsert(row);

      if (!error) {
        return event;
      }
      console.warn('Supabase saveEvent error, falling back to local:', error.message);
    } catch (err) {
      console.warn('Supabase saveEvent exception:', err);
    }
  }

  // Local fallback
  ensureLocalDataFiles();
  try {
    const raw = fs.existsSync(EVENTS_FILE) ? fs.readFileSync(EVENTS_FILE, 'utf8') : '[]';
    const events: EventData[] = JSON.parse(raw);
    const existingIdx = events.findIndex(e => e.id === event.id);
    if (existingIdx >= 0) {
      events[existingIdx] = { ...events[existingIdx], ...event };
    } else {
      events.unshift(event);
    }
    fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2), 'utf8');
  } catch (err) {
    console.warn('Local saveEvent skipped:', err);
  }
  return event;
}

export async function updateEvent(id: string, updates: Partial<EventData>): Promise<EventData | null> {
  if (isSupabaseConfigured && supabase) {
    try {
      const dbUpdates: Record<string, any> = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.coupleOrHost !== undefined) dbUpdates.couple_or_host = updates.coupleOrHost;
      if (updates.eventDate !== undefined) dbUpdates.event_date = updates.eventDate;
      if (updates.location !== undefined) dbUpdates.location = updates.location;
      if (updates.preset !== undefined) dbUpdates.preset = updates.preset;
      if (updates.allowedPresets !== undefined) dbUpdates.allowed_presets = updates.allowedPresets;
      if (updates.allowGuestPresetSwitch !== undefined) dbUpdates.allow_guest_preset_switch = updates.allowGuestPresetSwitch;
      if (updates.packageTier !== undefined) dbUpdates.package_tier = updates.packageTier;
      if (updates.maxGuests !== undefined) dbUpdates.max_guests = updates.maxGuests;
      if (updates.shotsPerGuest !== undefined) dbUpdates.shots_per_guest = updates.shotsPerGuest;
      if (updates.revealMode !== undefined) dbUpdates.reveal_mode = updates.revealMode;
      if (updates.revealTime !== undefined) dbUpdates.reveal_time = updates.revealTime;
      if (updates.frameId !== undefined) dbUpdates.frame_id = updates.frameId;
      if (updates.customFrameUrl !== undefined) dbUpdates.custom_frame_url = updates.customFrameUrl;
      if (updates.frameText !== undefined) dbUpdates.frame_text = updates.frameText;
      if (updates.allowVoiceNote !== undefined) dbUpdates.allow_voice_note = updates.allowVoiceNote;
      if (updates.allowGuestFrameToggle !== undefined) dbUpdates.allow_guest_frame_toggle = updates.allowGuestFrameToggle;
      if (updates.coverUrl !== undefined) dbUpdates.cover_url = updates.coverUrl;

      const { data, error } = await supabase
        .from('events')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        return rowToEvent(data);
      }
      console.warn(`Supabase updateEvent(${id}) error, falling back to local:`, error?.message);
    } catch (err) {
      console.warn('Supabase updateEvent exception:', err);
    }
  }

  // Local fallback
  ensureLocalDataFiles();
  try {
    const raw = fs.existsSync(EVENTS_FILE) ? fs.readFileSync(EVENTS_FILE, 'utf8') : '[]';
    const events: EventData[] = JSON.parse(raw);
    const existingIdx = events.findIndex(e => e.id === id);
    if (existingIdx < 0) return null;

    events[existingIdx] = { ...events[existingIdx], ...updates };
    fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2), 'utf8');
    return events[existingIdx];
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// PHOTOS API & STORAGE
// ---------------------------------------------------------------------------

export async function getAllPhotos(eventId?: string, includeHidden: boolean = false): Promise<PhotoRecord[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      let query = supabase
        .from('photos')
        .select('*')
        .order('timestamp', { ascending: false });

      if (eventId) {
        if (eventId === 'wedding-sarah-dimas' || eventId === 'demo-nikahan') {
          query = query.or('event_id.eq.wedding-sarah-dimas,event_id.eq.demo-nikahan');
        } else {
          query = query.eq('event_id', eventId);
        }
      }
      if (!includeHidden) {
        query = query.eq('is_hidden', false);
      }

      const { data, error } = await query;
      if (!error && data) {
        return data.map(rowToPhoto);
      }
      if (error) {
        console.warn('Supabase getAllPhotos error, falling back to local:', error.message);
      }
    } catch (err) {
      console.warn('Supabase getAllPhotos exception:', err);
    }
  }

  // Local JSON fallback
  ensureLocalDataFiles();
  try {
    if (fs.existsSync(PHOTOS_FILE)) {
      const raw = fs.readFileSync(PHOTOS_FILE, 'utf8');
      let photos: PhotoRecord[] = JSON.parse(raw);
      if (eventId) {
        if (eventId === 'wedding-sarah-dimas' || eventId === 'demo-nikahan') {
          photos = photos.filter(p => p.eventId === 'wedding-sarah-dimas' || p.eventId === 'demo-nikahan');
        } else {
          photos = photos.filter(p => p.eventId === eventId);
        }
      }
      if (!includeHidden) {
        photos = photos.filter(p => !p.isHidden);
      }
      return photos;
    }
  } catch {}
  return [];
}

export async function getPhotoById(id: string): Promise<PhotoRecord | null> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        return rowToPhoto(data);
      }
    } catch (err) {
      console.warn('Supabase getPhotoById exception:', err);
    }
  }

  const photos = await getAllPhotos(undefined, true);
  return photos.find(p => p.id === id) || null;
}

export async function savePhoto(photo: PhotoRecord): Promise<PhotoRecord> {
  let finalImageUrl = photo.imageData;

  // If Supabase is configured, upload image to Supabase Storage bucket 'photos'
  if (isSupabaseConfigured && supabase) {
    try {
      if (photo.imageData && photo.imageData.startsWith('data:image')) {
        const matches = photo.imageData.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
        const ext = matches && matches[1] === 'png' ? 'png' : 'jpg';
        const base64Data = matches ? matches[2] : photo.imageData.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';
        const storagePath = `events/${photo.eventId}/${photo.id}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(storagePath, buffer, {
            contentType,
            upsert: true
          });

        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage
            .from('photos')
            .getPublicUrl(storagePath);
          finalImageUrl = publicUrlData.publicUrl;
        } else {
          console.warn('Supabase photo upload error:', uploadError.message);
        }
      }

      // Save row to public.photos table
      const row = photoToRow(photo, finalImageUrl);
      const { error: dbError } = await supabase
        .from('photos')
        .upsert(row);

      if (!dbError) {
        return { ...photo, imageData: finalImageUrl };
      }
      console.warn('Supabase savePhoto DB error, falling back to local:', dbError.message);
    } catch (err) {
      console.warn('Supabase savePhoto exception:', err);
    }
  }

  // Local fallback
  ensureLocalDataFiles();
  if (photo.imageData && photo.imageData.startsWith('data:image')) {
    finalImageUrl = saveImageToLocalFile(photo.id, photo.imageData);
  }

  const savedRecord = { ...photo, imageData: finalImageUrl };

  try {
    const raw = fs.existsSync(PHOTOS_FILE) ? fs.readFileSync(PHOTOS_FILE, 'utf8') : '[]';
    const photos: PhotoRecord[] = JSON.parse(raw);
    photos.unshift(savedRecord);
    fs.writeFileSync(PHOTOS_FILE, JSON.stringify(photos, null, 2), 'utf8');
  } catch (err) {
    console.warn('Local savePhoto skipped:', err);
  }

  return savedRecord;
}

export async function updatePhoto(id: string, updates: Partial<PhotoRecord>): Promise<PhotoRecord | null> {
  if (isSupabaseConfigured && supabase) {
    try {
      const dbUpdates: Record<string, any> = {};
      if (updates.isHidden !== undefined) dbUpdates.is_hidden = updates.isHidden;
      if (updates.caption !== undefined) dbUpdates.caption = updates.caption;

      const { data, error } = await supabase
        .from('photos')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        return rowToPhoto(data);
      }
    } catch (err) {
      console.warn('Supabase updatePhoto exception:', err);
    }
  }

  // Local fallback
  ensureLocalDataFiles();
  try {
    const raw = fs.existsSync(PHOTOS_FILE) ? fs.readFileSync(PHOTOS_FILE, 'utf8') : '[]';
    const photos: PhotoRecord[] = JSON.parse(raw);
    const idx = photos.findIndex(p => p.id === id);
    if (idx < 0) return null;

    photos[idx] = { ...photos[idx], ...updates };
    fs.writeFileSync(PHOTOS_FILE, JSON.stringify(photos, null, 2), 'utf8');
    return photos[idx];
  } catch {
    return null;
  }
}

export async function deletePhoto(id: string): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: target } = await supabase
        .from('photos')
        .select('image_url')
        .eq('id', id)
        .maybeSingle();

      const { error } = await supabase
        .from('photos')
        .delete()
        .eq('id', id);

      if (!error) {
        // Try deleting from Supabase storage if it was stored there
        if (target?.image_url && target.image_url.includes('/photos/')) {
          const pathPart = target.image_url.split('/photos/')[1];
          if (pathPart) {
            await supabase.storage.from('photos').remove([pathPart]);
          }
        }
        return true;
      }
    } catch (err) {
      console.warn('Supabase deletePhoto exception:', err);
    }
  }

  // Local fallback
  ensureLocalDataFiles();
  try {
    const raw = fs.existsSync(PHOTOS_FILE) ? fs.readFileSync(PHOTOS_FILE, 'utf8') : '[]';
    let photos: PhotoRecord[] = JSON.parse(raw);
    const target = photos.find(p => p.id === id);
    if (!target) return false;

    if (target.imageData && target.imageData.startsWith('/uploads/')) {
      const filePath = path.join(process.cwd(), 'public', target.imageData.replace(/^\//, ''));
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch {}
      }
    }

    photos = photos.filter(p => p.id !== id);
    fs.writeFileSync(PHOTOS_FILE, JSON.stringify(photos, null, 2), 'utf8');
    return true;
  } catch {
    return false;
  }
}
