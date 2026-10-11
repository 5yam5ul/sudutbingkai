import fs from 'fs';
import path from 'path';
import { EventData, PhotoRecord, InvoiceRecord, PayoutRequest, UserAccount, VideoTestimonialSubmission } from './types';
import { supabase, isSupabaseConfigured } from './supabase';

const DATA_DIR = path.join(process.cwd(), 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');
const PHOTOS_FILE = path.join(DATA_DIR, 'photos.json');
const INVOICES_FILE = path.join(DATA_DIR, 'invoices.json');
const PAYOUTS_FILE = path.join(DATA_DIR, 'payouts.json');
const VENDORS_FILE = path.join(DATA_DIR, 'vendors.json');
const TESTIMONIALS_FILE = path.join(DATA_DIR, 'testimonials.json');
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
        slug: 'sarah-dimas',
        title: 'Pernikahan Sarah & Dimas',
        coupleOrHost: 'Sarah & Dimas',
        eventDate: '2026-11-20T09:00:00Z',
        location: 'Plataran Dharmawangsa, Jakarta',
        preset: 'portra',
        allowGuestPresetSwitch: true,
        maxGuests: 150,
        additionalPax: 0,
        shotsPerGuest: 20,
        revealMode: 'instant',
        createdAt: new Date().toISOString()
      };
      fs.writeFileSync(EVENTS_FILE, JSON.stringify([sampleEvent], null, 2), 'utf8');
    }

    if (!fs.existsSync(PHOTOS_FILE)) {
      fs.writeFileSync(PHOTOS_FILE, JSON.stringify([], null, 2), 'utf8');
    }

    if (!fs.existsSync(INVOICES_FILE)) {
      const sampleInvoice: InvoiceRecord = {
        id: 'inv_wedding_sarah_dimas',
        invoiceNumber: 'INV/SB/2026/02/0001',
        eventId: 'wedding-sarah-dimas',
        orderId: 'ord_sample_001',
        buyerType: 'client',
        buyerName: 'Sarah & Dimas',
        buyerEmail: 'pengantin@sudutbingkai.id',
        buyerPhone: '081298765432',
        tierId: 'wedding',
        tierName: 'Wedding (300 Tamu)',
        originalPrice: 499000,
        discountAmount: 49900,
        discountCode: 'VOWSANDCO',
        finalAmount: 449100,
        paymentMethod: 'qris',
        status: 'paid',
        paidAt: '2026-02-14T10:30:00Z',
        createdAt: '2026-02-14T10:25:00Z'
      };
      fs.writeFileSync(INVOICES_FILE, JSON.stringify([sampleInvoice], null, 2), 'utf8');
    }

    if (!fs.existsSync(PAYOUTS_FILE)) {
      fs.writeFileSync(PAYOUTS_FILE, JSON.stringify([], null, 2), 'utf8');
    }

    if (!fs.existsSync(TESTIMONIALS_FILE)) {
      const sampleTestimonial: VideoTestimonialSubmission = {
        id: 'testi_sample_01',
        eventId: 'wedding-sarah-dimas',
        eventTitle: 'Pernikahan Sarah & Dimas',
        submitterType: 'vendor',
        submitterId: 'vendor-1',
        submitterName: 'Vows & Co Wedding Organizer',
        videoType: 'link',
        videoUrl: 'https://drive.google.com/file/d/sample-wedding-testimonial/view',
        durationSeconds: 78,
        caption: 'Keseruan tamu saat heboh scan barcode di meja ballroom, antusiasme tinggi banget!',
        rewardAmount: 50000,
        status: 'approved',
        adminNotes: 'Video jernih, durasi 78 detik, interaksi tamu sangat natural.',
        rewardPaidAt: '2026-02-15T14:00:00Z',
        submittedAt: '2026-02-15T11:20:00Z'
      };
      fs.writeFileSync(TESTIMONIALS_FILE, JSON.stringify([sampleTestimonial], null, 2), 'utf8');
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
  const derivedSlug = row.slug || (row.id ? row.id.replace(/^wedding-|^event-|^sb-/, '') : undefined);
  return {
    id: row.id,
    slug: derivedSlug,
    title: row.title,
    coupleOrHost: row.couple_or_host,
    eventDate: row.event_date,
    location: row.location || undefined,
    preset: row.preset,
    allowedPresets: row.allowed_presets || undefined,
    allowGuestPresetSwitch: row.allow_guest_preset_switch,
    packageTier: row.package_tier,
    maxGuests: row.max_guests,
    additionalPax: row.additional_pax || 0,
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
    slug: event.slug || null,
    title: event.title,
    couple_or_host: event.coupleOrHost,
    event_date: event.eventDate,
    location: event.location || null,
    preset: event.preset || 'portra',
    allowed_presets: event.allowedPresets || null,
    allow_guest_preset_switch: event.allowGuestPresetSwitch ?? true,
    package_tier: event.packageTier || 'wedding',
    max_guests: event.maxGuests,
    additional_pax: event.additionalPax || 0,
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
  const cleanKey = (id || '').trim().toLowerCase();
  const targetId = (cleanKey === 'demo-nikahan' || cleanKey === 'sarah-dimas' || cleanKey === 'wedding-sarah-dimas')
    ? 'wedding-sarah-dimas'
    : id;

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
    } catch (err) {
      console.warn('Supabase getEventById exception:', err);
    }
  }

  // Find across all events (including local and Supabase)
  const events = await getAllEvents();
  return events.find(e => 
    e.id === id || 
    e.id === targetId || 
    (e.slug && e.slug.toLowerCase() === cleanKey) ||
    e.id.toLowerCase() === cleanKey ||
    e.id.toLowerCase().replace(/^wedding-|^event-|^sb-/, '') === cleanKey
  ) || null;
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

import { uploadBufferToR2, isR2Configured, deleteFromR2 } from './r2';

export async function savePhoto(photo: PhotoRecord): Promise<PhotoRecord> {
  let finalImageUrl = photo.imageData;

  // 1. Cloudflare R2 Upload (Zero Egress, High Performance Object Storage)
  if (isR2Configured && photo.imageData && photo.imageData.startsWith('data:image')) {
    try {
      const matches = photo.imageData.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
      const ext = matches && matches[1] === 'png' ? 'png' : 'jpg';
      const base64Data = matches ? matches[2] : photo.imageData.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';
      const storagePath = `events/${photo.eventId}/${photo.id}.${ext}`;

      const r2Url = await uploadBufferToR2(buffer, storagePath, contentType);
      if (r2Url) {
        finalImageUrl = r2Url;
      }
    } catch (r2Err) {
      console.warn('Cloudflare R2 photo upload error, falling back:', r2Err);
    }
  }

  // 2. Supabase (Database Row Upsert & Fallback Storage)
  if (isSupabaseConfigured && supabase) {
    try {
      // Fallback to Supabase Storage only if R2 wasn't used and image is still base64
      if (finalImageUrl && finalImageUrl.startsWith('data:image')) {
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

      // Save row to public.photos table in Supabase PostgreSQL
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
        if (target?.image_url) {
          if (target.image_url.includes('/photos/')) {
            const pathPart = target.image_url.split('/photos/')[1];
            if (pathPart) {
              await supabase.storage.from('photos').remove([pathPart]);
            }
          }
          if (isR2Configured && (target.image_url.includes('.r2.dev') || target.image_url.includes('r2.cloudflarestorage.com') || target.image_url.includes('/events/'))) {
            try {
              const urlObj = new URL(target.image_url);
              const r2Key = urlObj.pathname.replace(/^\/+/, '');
              await deleteFromR2(r2Key);
            } catch {}
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

// ==========================================
// INVOICES ENGINE
// ==========================================

export async function createInvoice(data: Omit<InvoiceRecord, 'id' | 'createdAt' | 'invoiceNumber'> & Partial<Pick<InvoiceRecord, 'id' | 'createdAt' | 'invoiceNumber'>>): Promise<InvoiceRecord> {
  ensureLocalDataFiles();
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  let invoices: InvoiceRecord[] = [];
  try {
    const raw = fs.existsSync(INVOICES_FILE) ? fs.readFileSync(INVOICES_FILE, 'utf8') : '[]';
    invoices = JSON.parse(raw);
  } catch {
    invoices = [];
  }

  const count = invoices.length + 1;
  const invoiceNumber = data.invoiceNumber || `INV/SB/${year}/${month}/${String(count).padStart(4, '0')}`;
  const id = data.id || `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const createdAt = data.createdAt || now.toISOString();

  const newInvoice: InvoiceRecord = {
    ...data,
    id,
    invoiceNumber,
    createdAt
  };

  invoices.unshift(newInvoice);
  try {
    fs.writeFileSync(INVOICES_FILE, JSON.stringify(invoices, null, 2), 'utf8');
  } catch (err) {
    console.warn('Failed to write invoice file:', err);
  }

  return newInvoice;
}

export async function getInvoice(idOrNumber: string): Promise<InvoiceRecord | null> {
  ensureLocalDataFiles();
  try {
    const raw = fs.existsSync(INVOICES_FILE) ? fs.readFileSync(INVOICES_FILE, 'utf8') : '[]';
    const invoices: InvoiceRecord[] = JSON.parse(raw);
    const cleanQuery = idOrNumber.trim().toLowerCase();
    return invoices.find(inv => 
      inv.id.toLowerCase() === cleanQuery ||
      inv.invoiceNumber.toLowerCase() === cleanQuery ||
      (inv.eventId && inv.eventId.toLowerCase() === cleanQuery) ||
      inv.orderId.toLowerCase() === cleanQuery
    ) || null;
  } catch {
    return null;
  }
}

export async function getInvoicesByEmail(email: string): Promise<InvoiceRecord[]> {
  ensureLocalDataFiles();
  try {
    const raw = fs.existsSync(INVOICES_FILE) ? fs.readFileSync(INVOICES_FILE, 'utf8') : '[]';
    const invoices: InvoiceRecord[] = JSON.parse(raw);
    const cleanEmail = email.trim().toLowerCase();
    return invoices.filter(inv => inv.buyerEmail.toLowerCase() === cleanEmail);
  } catch {
    return [];
  }
}

export async function updateInvoiceStatus(idOrNumber: string, status: 'pending' | 'paid' | 'cancelled', paidAt?: string): Promise<InvoiceRecord | null> {
  ensureLocalDataFiles();
  try {
    const raw = fs.existsSync(INVOICES_FILE) ? fs.readFileSync(INVOICES_FILE, 'utf8') : '[]';
    const invoices: InvoiceRecord[] = JSON.parse(raw);
    const cleanQuery = idOrNumber.trim().toLowerCase();
    const idx = invoices.findIndex(inv => 
      inv.id.toLowerCase() === cleanQuery ||
      inv.invoiceNumber.toLowerCase() === cleanQuery ||
      (inv.eventId && inv.eventId.toLowerCase() === cleanQuery) ||
      inv.orderId.toLowerCase() === cleanQuery
    );

    if (idx < 0) return null;
    invoices[idx].status = status;
    if (paidAt) invoices[idx].paidAt = paidAt;
    else if (status === 'paid' && !invoices[idx].paidAt) invoices[idx].paidAt = new Date().toISOString();

    fs.writeFileSync(INVOICES_FILE, JSON.stringify(invoices, null, 2), 'utf8');
    return invoices[idx];
  } catch {
    return null;
  }
}

// ==========================================
// VENDOR PARTNERS & PAYOUTS ENGINE
// ==========================================

export async function createPayoutRequest(data: Omit<PayoutRequest, 'id' | 'requestedAt' | 'status'>): Promise<PayoutRequest> {
  ensureLocalDataFiles();
  let payouts: PayoutRequest[] = [];
  try {
    const raw = fs.existsSync(PAYOUTS_FILE) ? fs.readFileSync(PAYOUTS_FILE, 'utf8') : '[]';
    payouts = JSON.parse(raw);
  } catch {
    payouts = [];
  }

  const newPayout: PayoutRequest = {
    ...data,
    id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    status: 'pending',
    requestedAt: new Date().toISOString()
  };

  payouts.unshift(newPayout);
  try {
    fs.writeFileSync(PAYOUTS_FILE, JSON.stringify(payouts, null, 2), 'utf8');
  } catch (err) {
    console.warn('Failed to write payouts file:', err);
  }

  return newPayout;
}

export async function getPayoutRequests(vendorId?: string): Promise<PayoutRequest[]> {
  ensureLocalDataFiles();
  try {
    const raw = fs.existsSync(PAYOUTS_FILE) ? fs.readFileSync(PAYOUTS_FILE, 'utf8') : '[]';
    const payouts: PayoutRequest[] = JSON.parse(raw);
    if (!vendorId) return payouts;
    return payouts.filter(p => p.vendorId === vendorId || p.vendorEmail.toLowerCase() === vendorId.toLowerCase());
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// TESTIMONIAL VIDEO SUBMISSIONS (REVENUE REWARD)
// ---------------------------------------------------------------------------

export async function createTestimonialSubmission(data: Omit<VideoTestimonialSubmission, 'id' | 'submittedAt' | 'status'>): Promise<VideoTestimonialSubmission> {
  ensureLocalDataFiles();
  let submissions: VideoTestimonialSubmission[] = [];
  try {
    const raw = fs.existsSync(TESTIMONIALS_FILE) ? fs.readFileSync(TESTIMONIALS_FILE, 'utf8') : '[]';
    submissions = JSON.parse(raw);
  } catch {
    submissions = [];
  }

  const newSub: VideoTestimonialSubmission = {
    ...data,
    id: `testi_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    status: 'pending',
    submittedAt: new Date().toISOString()
  };

  submissions.unshift(newSub);
  try {
    fs.writeFileSync(TESTIMONIALS_FILE, JSON.stringify(submissions, null, 2), 'utf8');
  } catch (err) {
    console.warn('Failed to write testimonials file:', err);
  }

  return newSub;
}

export async function getAllTestimonials(): Promise<VideoTestimonialSubmission[]> {
  ensureLocalDataFiles();
  try {
    const raw = fs.existsSync(TESTIMONIALS_FILE) ? fs.readFileSync(TESTIMONIALS_FILE, 'utf8') : '[]';
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function getTestimonialsByVendor(vendorId: string): Promise<VideoTestimonialSubmission[]> {
  const all = await getAllTestimonials();
  return all.filter(t => t.submitterId === vendorId || t.submitterEmail?.toLowerCase() === vendorId.toLowerCase());
}

export async function getTestimonialsByEvent(eventId: string): Promise<VideoTestimonialSubmission[]> {
  const all = await getAllTestimonials();
  return all.filter(t => t.eventId === eventId);
}

export async function updateTestimonialStatus(
  id: string,
  status: 'approved' | 'rejected',
  adminNotes?: string
): Promise<VideoTestimonialSubmission | null> {
  ensureLocalDataFiles();
  try {
    const raw = fs.existsSync(TESTIMONIALS_FILE) ? fs.readFileSync(TESTIMONIALS_FILE, 'utf8') : '[]';
    const list: VideoTestimonialSubmission[] = JSON.parse(raw);
    const index = list.findIndex(t => t.id === id);
    if (index === -1) return null;

    list[index].status = status;
    if (adminNotes) list[index].adminNotes = adminNotes;
    if (status === 'approved') {
      list[index].rewardPaidAt = new Date().toISOString();
    }

    fs.writeFileSync(TESTIMONIALS_FILE, JSON.stringify(list, null, 2), 'utf8');
    return list[index];
  } catch {
    return null;
  }
}

