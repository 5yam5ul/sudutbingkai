import fs from 'fs';
import path from 'path';
import { EventData, PhotoRecord, InvoiceRecord, PayoutRequest, UserAccount, VideoTestimonialSubmission, EventAddonItem, VideoWishRecord } from './types';
import { supabase, isSupabaseConfigured } from './supabase';

const DATA_DIR = path.join(process.cwd(), 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');
const PHOTOS_FILE = path.join(DATA_DIR, 'photos.json');
const INVOICES_FILE = path.join(DATA_DIR, 'invoices.json');
const PAYOUTS_FILE = path.join(DATA_DIR, 'payouts.json');
const VENDORS_FILE = path.join(DATA_DIR, 'vendors.json');
const TESTIMONIALS_FILE = path.join(DATA_DIR, 'testimonials.json');
const ADDONS_FILE = path.join(DATA_DIR, 'addons.json');
const VIDEO_WISHES_FILE = path.join(DATA_DIR, 'video_wishes.json');
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');
const VIDEOS_DIR = path.join(UPLOADS_DIR, 'videos');

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
      fs.writeFileSync(EVENTS_FILE, JSON.stringify([], null, 2), 'utf8');
    }

    if (!fs.existsSync(PHOTOS_FILE)) {
      fs.writeFileSync(PHOTOS_FILE, JSON.stringify([], null, 2), 'utf8');
    }

    if (!fs.existsSync(INVOICES_FILE)) {
      fs.writeFileSync(INVOICES_FILE, JSON.stringify([], null, 2), 'utf8');
    }

    if (!fs.existsSync(PAYOUTS_FILE)) {
      fs.writeFileSync(PAYOUTS_FILE, JSON.stringify([], null, 2), 'utf8');
    }

    if (!fs.existsSync(TESTIMONIALS_FILE)) {
      fs.writeFileSync(TESTIMONIALS_FILE, JSON.stringify([], null, 2), 'utf8');
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
    closingWishType: row.closing_wish_type || (row.package_tier === 'wedding' || row.package_tier === 'unlimited' ? 'video' : 'voice'),
    allowGuestFrameToggle: row.allow_guest_frame_toggle,
    coverUrl: row.cover_url || undefined,
    createdAt: row.created_at,
    hostEmail: row.host_email || undefined,
    paymentStatus: row.payment_status || 'paid',
    referralCodeUsed: row.referral_code_used || undefined,
    commissionAmount: row.commission_amount ? Number(row.commission_amount) : undefined,
    commissionStatus: row.commission_status || undefined,
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
    closing_wish_type: event.closingWishType || (event.packageTier === 'wedding' || event.packageTier === 'unlimited' ? 'video' : 'voice'),
    allow_guest_frame_toggle: event.allowGuestFrameToggle ?? true,
    cover_url: event.coverUrl || null,
    host_email: event.hostEmail || null,
    payment_status: event.paymentStatus || 'paid',
    referral_code_used: event.referralCodeUsed || null,
    commission_amount: event.commissionAmount || null,
    commission_status: event.commissionStatus || null,
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

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .or(`id.eq.${id},slug.eq.${cleanKey}`)
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
      if (updates.closingWishType !== undefined) dbUpdates.closing_wish_type = updates.closingWishType;
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

export async function deleteEvent(id: string): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('photos').delete().eq('event_id', id);
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (!error) return true;
      console.warn(`Supabase deleteEvent(${id}) error:`, error.message);
    } catch (err) {
      console.warn('Supabase deleteEvent exception:', err);
    }
  }

  // Local fallback
  ensureLocalDataFiles();
  try {
    if (fs.existsSync(EVENTS_FILE)) {
      const raw = fs.readFileSync(EVENTS_FILE, 'utf8');
      let events: EventData[] = JSON.parse(raw);
      events = events.filter(e => e.id !== id);
      fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2), 'utf8');
    }
    if (fs.existsSync(PHOTOS_FILE)) {
      const rawPhotos = fs.readFileSync(PHOTOS_FILE, 'utf8');
      let photos: PhotoRecord[] = JSON.parse(rawPhotos);
      photos = photos.filter(p => p.eventId !== id);
      fs.writeFileSync(PHOTOS_FILE, JSON.stringify(photos, null, 2), 'utf8');
    }
    return true;
  } catch (err) {
    console.error('Local deleteEvent error:', err);
    return false;
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
        query = query.eq('event_id', eventId);
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
        photos = photos.filter(p => p.eventId === eventId);
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

  // 1. Try Supabase insert
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('invoices').insert({
        id: newInvoice.id,
        invoice_number: newInvoice.invoiceNumber,
        event_id: newInvoice.eventId || null,
        order_id: newInvoice.orderId,
        buyer_type: newInvoice.buyerType,
        buyer_name: newInvoice.buyerName,
        buyer_email: newInvoice.buyerEmail,
        buyer_phone: newInvoice.buyerPhone || null,
        company_name: newInvoice.companyName || null,
        tier_id: newInvoice.tierId,
        tier_name: newInvoice.tierName,
        original_price: newInvoice.originalPrice,
        discount_amount: newInvoice.discountAmount || 0,
        discount_code: newInvoice.discountCode || null,
        final_amount: newInvoice.finalAmount,
        payment_method: newInvoice.paymentMethod || 'qris',
        status: newInvoice.status,
        paid_at: newInvoice.paidAt || null,
        created_at: newInvoice.createdAt
      });
    } catch (e) {
      console.warn('Supabase invoice insert skipped/fallback:', e);
    }
  }

  // 2. Local fallback
  invoices.unshift(newInvoice);
  try {
    fs.writeFileSync(INVOICES_FILE, JSON.stringify(invoices, null, 2), 'utf8');
  } catch (err) {
    console.warn('Failed to write invoice file:', err);
  }

  return newInvoice;
}

export async function getInvoice(idOrNumber: string): Promise<InvoiceRecord | null> {
  const cleanQuery = idOrNumber.trim();

  // 1. Try Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .or(`id.eq.${cleanQuery},invoice_number.eq.${cleanQuery},event_id.eq.${cleanQuery},order_id.eq.${cleanQuery}`)
        .limit(1);

      if (!error && data && data.length > 0) {
        const row = data[0];
        return {
          id: row.id,
          invoiceNumber: row.invoice_number,
          eventId: row.event_id || undefined,
          orderId: row.order_id,
          buyerType: row.buyer_type,
          buyerName: row.buyer_name,
          buyerEmail: row.buyer_email,
          buyerPhone: row.buyer_phone || undefined,
          companyName: row.company_name || undefined,
          tierId: row.tier_id,
          tierName: row.tier_name,
          originalPrice: Number(row.original_price),
          discountAmount: Number(row.discount_amount || 0),
          discountCode: row.discount_code || undefined,
          finalAmount: Number(row.final_amount),
          paymentMethod: row.payment_method,
          status: row.status,
          paidAt: row.paid_at || undefined,
          createdAt: row.created_at
        };
      }
    } catch (e) {
      // Fallback to local
    }
  }

  // 2. Local fallback
  ensureLocalDataFiles();
  try {
    const raw = fs.existsSync(INVOICES_FILE) ? fs.readFileSync(INVOICES_FILE, 'utf8') : '[]';
    const invoices: InvoiceRecord[] = JSON.parse(raw);
    const lower = cleanQuery.toLowerCase();
    return invoices.find(inv => 
      inv.id.toLowerCase() === lower ||
      inv.invoiceNumber.toLowerCase() === lower ||
      (inv.eventId && inv.eventId.toLowerCase() === lower) ||
      inv.orderId.toLowerCase() === lower
    ) || null;
  } catch {
    return null;
  }
}

export async function getInvoicesByEmail(email: string): Promise<InvoiceRecord[]> {
  const cleanEmail = email.trim();

  // 1. Try Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('buyer_email', cleanEmail)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data.map(row => ({
          id: row.id,
          invoiceNumber: row.invoice_number,
          eventId: row.event_id || undefined,
          orderId: row.order_id,
          buyerType: row.buyer_type,
          buyerName: row.buyer_name,
          buyerEmail: row.buyer_email,
          buyerPhone: row.buyer_phone || undefined,
          companyName: row.company_name || undefined,
          tierId: row.tier_id,
          tierName: row.tier_name,
          originalPrice: Number(row.original_price),
          discountAmount: Number(row.discount_amount || 0),
          discountCode: row.discount_code || undefined,
          finalAmount: Number(row.final_amount),
          paymentMethod: row.payment_method,
          status: row.status,
          paidAt: row.paid_at || undefined,
          createdAt: row.created_at
        }));
      }
    } catch (e) {
      // Fallback
    }
  }

  // 2. Local fallback
  ensureLocalDataFiles();
  try {
    const raw = fs.existsSync(INVOICES_FILE) ? fs.readFileSync(INVOICES_FILE, 'utf8') : '[]';
    const invoices: InvoiceRecord[] = JSON.parse(raw);
    const lower = cleanEmail.toLowerCase();
    return invoices.filter(inv => inv.buyerEmail.toLowerCase() === lower);
  } catch {
    return [];
  }
}

export async function updateInvoiceStatus(idOrNumber: string, status: 'pending' | 'paid' | 'cancelled', paidAt?: string): Promise<InvoiceRecord | null> {
  const cleanQuery = idOrNumber.trim();
  const effectivePaidAt = paidAt || (status === 'paid' ? new Date().toISOString() : undefined);

  // 1. Try Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
        .from('invoices')
        .update({ status, paid_at: effectivePaidAt || null })
        .or(`id.eq.${cleanQuery},invoice_number.eq.${cleanQuery},order_id.eq.${cleanQuery}`);
    } catch (e) {
      // Fallback
    }
  }

  // 2. Local fallback
  ensureLocalDataFiles();
  try {
    const raw = fs.existsSync(INVOICES_FILE) ? fs.readFileSync(INVOICES_FILE, 'utf8') : '[]';
    const invoices: InvoiceRecord[] = JSON.parse(raw);
    const lower = cleanQuery.toLowerCase();
    const idx = invoices.findIndex(inv => 
      inv.id.toLowerCase() === lower ||
      inv.invoiceNumber.toLowerCase() === lower ||
      (inv.eventId && inv.eventId.toLowerCase() === lower) ||
      inv.orderId.toLowerCase() === lower
    );

    if (idx < 0) return null;
    invoices[idx].status = status;
    if (effectivePaidAt) invoices[idx].paidAt = effectivePaidAt;

    fs.writeFileSync(INVOICES_FILE, JSON.stringify(invoices, null, 2), 'utf8');
    return invoices[idx];
  } catch {
    return null;
  }
}

export async function getAllInvoices(): Promise<InvoiceRecord[]> {
  // 1. Try Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map(row => ({
          id: row.id,
          invoiceNumber: row.invoice_number,
          eventId: row.event_id || undefined,
          orderId: row.order_id,
          buyerType: row.buyer_type,
          buyerName: row.buyer_name,
          buyerEmail: row.buyer_email,
          buyerPhone: row.buyer_phone || undefined,
          companyName: row.company_name || undefined,
          tierId: row.tier_id,
          tierName: row.tier_name,
          originalPrice: Number(row.original_price),
          discountAmount: Number(row.discount_amount || 0),
          discountCode: row.discount_code || undefined,
          finalAmount: Number(row.final_amount),
          paymentMethod: row.payment_method || 'qris',
          status: row.status,
          paidAt: row.paid_at || undefined,
          createdAt: row.created_at
        }));
      }
    } catch (e) {
      console.warn('Supabase getAllInvoices fallback:', e);
    }
  }

  // 2. Local fallback
  ensureLocalDataFiles();
  try {
    const raw = fs.existsSync(INVOICES_FILE) ? fs.readFileSync(INVOICES_FILE, 'utf8') : '[]';
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function updateInvoice(id: string, updates: Partial<InvoiceRecord>): Promise<InvoiceRecord | null> {
  // 1. Try Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      const dbUpdates: Record<string, any> = {};
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.finalAmount !== undefined) dbUpdates.final_amount = updates.finalAmount;
      if (updates.originalPrice !== undefined) dbUpdates.original_price = updates.originalPrice;
      if (updates.discountAmount !== undefined) dbUpdates.discount_amount = updates.discountAmount;
      if (updates.discountCode !== undefined) dbUpdates.discount_code = updates.discountCode;
      if (updates.buyerName !== undefined) dbUpdates.buyer_name = updates.buyerName;
      if (updates.buyerEmail !== undefined) dbUpdates.buyer_email = updates.buyerEmail;
      if (updates.buyerPhone !== undefined) dbUpdates.buyer_phone = updates.buyerPhone;
      if (updates.paymentMethod !== undefined) dbUpdates.payment_method = updates.paymentMethod;
      if (updates.paidAt !== undefined) dbUpdates.paid_at = updates.paidAt;

      await supabase
        .from('invoices')
        .update(dbUpdates)
        .eq('id', id);
    } catch (e) {
      console.warn('Supabase updateInvoice exception:', e);
    }
  }

  // 2. Local fallback
  ensureLocalDataFiles();
  try {
    const raw = fs.existsSync(INVOICES_FILE) ? fs.readFileSync(INVOICES_FILE, 'utf8') : '[]';
    const invoices: InvoiceRecord[] = JSON.parse(raw);
    const idx = invoices.findIndex(i => i.id === id || i.invoiceNumber === id);
    if (idx < 0) return null;

    invoices[idx] = { ...invoices[idx], ...updates };
    fs.writeFileSync(INVOICES_FILE, JSON.stringify(invoices, null, 2), 'utf8');
    return invoices[idx];
  } catch {
    return null;
  }
}

export async function deleteInvoice(id: string): Promise<boolean> {
  // 1. Try Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('invoices').delete().eq('id', id);
    } catch (e) {}
  }

  // 2. Local fallback
  ensureLocalDataFiles();
  try {
    const raw = fs.existsSync(INVOICES_FILE) ? fs.readFileSync(INVOICES_FILE, 'utf8') : '[]';
    let invoices: InvoiceRecord[] = JSON.parse(raw);
    invoices = invoices.filter(i => i.id !== id && i.invoiceNumber !== id);
    fs.writeFileSync(INVOICES_FILE, JSON.stringify(invoices, null, 2), 'utf8');
    return true;
  } catch {
    return false;
  }
}

// ==========================================
// VENDOR PARTNERS & PAYOUTS ENGINE
// ==========================================

export async function createPayoutRequest(data: Omit<PayoutRequest, 'id' | 'requestedAt' | 'status'>): Promise<PayoutRequest> {
  ensureLocalDataFiles();
  const newPayout: PayoutRequest = {
    ...data,
    id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    status: 'pending',
    requestedAt: new Date().toISOString()
  };

  // 1. Try Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('payout_requests').insert({
        id: newPayout.id,
        vendor_id: newPayout.vendorId,
        vendor_email: newPayout.vendorEmail,
        vendor_name: newPayout.vendorName,
        company_name: newPayout.companyName || null,
        amount: newPayout.amount,
        bank_details: newPayout.bankDetails,
        status: newPayout.status,
        proof_url: newPayout.proofUrl || null,
        notes: newPayout.notes || null,
        requested_at: newPayout.requestedAt,
        processed_at: newPayout.processedAt || null
      });
    } catch (e) {
      console.warn('Supabase payout insert skipped/fallback:', e);
    }
  }

  // 2. Local fallback
  let payouts: PayoutRequest[] = [];
  try {
    const raw = fs.existsSync(PAYOUTS_FILE) ? fs.readFileSync(PAYOUTS_FILE, 'utf8') : '[]';
    payouts = JSON.parse(raw);
  } catch {
    payouts = [];
  }

  payouts.unshift(newPayout);
  try {
    fs.writeFileSync(PAYOUTS_FILE, JSON.stringify(payouts, null, 2), 'utf8');
  } catch (err) {
    console.warn('Failed to write payouts file:', err);
  }

  return newPayout;
}

export async function getPayoutRequests(vendorId?: string): Promise<PayoutRequest[]> {
  // 1. Try Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      let query = supabase.from('payout_requests').select('*').order('requested_at', { ascending: false });
      if (vendorId) {
        query = query.or(`vendor_id.eq.${vendorId},vendor_email.eq.${vendorId}`);
      }
      const { data, error } = await query;
      if (!error && data) {
        return data.map(row => ({
          id: row.id,
          vendorId: row.vendor_id,
          vendorEmail: row.vendor_email,
          vendorName: row.vendor_name,
          companyName: row.company_name || undefined,
          amount: Number(row.amount),
          bankDetails: row.bank_details || { bankName: 'BCA', accountNumber: '', accountHolder: '' },
          status: row.status,
          proofUrl: row.proof_url || undefined,
          notes: row.notes || undefined,
          requestedAt: row.requested_at,
          processedAt: row.processed_at || undefined
        }));
      }
    } catch (e) {
      // Fallback
    }
  }

  // 2. Local fallback
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

export async function updatePayoutStatus(
  id: string,
  status: 'approved' | 'rejected',
  proofUrl?: string,
  notes?: string
): Promise<PayoutRequest | null> {
  const processedAt = new Date().toISOString();

  // 1. Try Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
        .from('payout_requests')
        .update({
          status,
          proof_url: proofUrl || null,
          notes: notes || null,
          processed_at: processedAt
        })
        .eq('id', id);
    } catch (e) {
      // Fallback
    }
  }

  // 2. Local fallback
  ensureLocalDataFiles();
  try {
    const raw = fs.existsSync(PAYOUTS_FILE) ? fs.readFileSync(PAYOUTS_FILE, 'utf8') : '[]';
    const payouts: PayoutRequest[] = JSON.parse(raw);
    const index = payouts.findIndex(p => p.id === id);
    if (index === -1) return null;

    payouts[index].status = status;
    payouts[index].processedAt = processedAt;
    if (proofUrl) payouts[index].proofUrl = proofUrl;
    if (notes) payouts[index].notes = notes;

    fs.writeFileSync(PAYOUTS_FILE, JSON.stringify(payouts, null, 2), 'utf8');
    return payouts[index];
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// TESTIMONIAL VIDEO SUBMISSIONS (REVENUE REWARD)
// ---------------------------------------------------------------------------

export async function createTestimonialSubmission(data: Omit<VideoTestimonialSubmission, 'id' | 'submittedAt' | 'status'>): Promise<VideoTestimonialSubmission> {
  const newSub: VideoTestimonialSubmission = {
    ...data,
    id: `testi_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    status: 'pending',
    submittedAt: new Date().toISOString()
  };

  // 1. Try Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('testimonials').insert({
        id: newSub.id,
        event_id: newSub.eventId,
        event_title: newSub.eventTitle,
        submitter_type: newSub.submitterType,
        submitter_id: newSub.submitterId,
        submitter_name: newSub.submitterName,
        submitter_email: newSub.submitterEmail || null,
        video_type: newSub.videoType,
        video_url: newSub.videoUrl,
        duration_seconds: newSub.durationSeconds,
        caption: newSub.caption || null,
        reward_amount: newSub.rewardAmount,
        status: newSub.status,
        admin_notes: newSub.adminNotes || null,
        reward_paid_at: newSub.rewardPaidAt || null,
        submitted_at: newSub.submittedAt
      });
    } catch (e) {
      console.warn('Supabase testimonial insert fallback:', e);
    }
  }

  // 2. Local fallback
  ensureLocalDataFiles();
  let submissions: VideoTestimonialSubmission[] = [];
  try {
    const raw = fs.existsSync(TESTIMONIALS_FILE) ? fs.readFileSync(TESTIMONIALS_FILE, 'utf8') : '[]';
    submissions = JSON.parse(raw);
  } catch {
    submissions = [];
  }

  submissions.unshift(newSub);
  try {
    fs.writeFileSync(TESTIMONIALS_FILE, JSON.stringify(submissions, null, 2), 'utf8');
  } catch (err) {
    console.warn('Failed to write testimonials file:', err);
  }

  return newSub;
}

export async function getAllTestimonials(): Promise<VideoTestimonialSubmission[]> {
  // 1. Try Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('testimonials')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (!error && data) {
        return data.map(row => ({
          id: row.id,
          eventId: row.event_id,
          eventTitle: row.event_title,
          submitterType: row.submitter_type,
          submitterId: row.submitter_id,
          submitterName: row.submitter_name,
          submitterEmail: row.submitter_email || undefined,
          videoType: row.video_type || 'link',
          videoUrl: row.video_url,
          durationSeconds: Number(row.duration_seconds),
          caption: row.caption || undefined,
          rewardAmount: Number(row.reward_amount || 50000),
          status: row.status,
          adminNotes: row.admin_notes || undefined,
          rewardPaidAt: row.reward_paid_at || undefined,
          submittedAt: row.submitted_at
        }));
      }
    } catch (e) {
      // Fallback
    }
  }

  // 2. Local fallback
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
  const rewardPaidAt = status === 'approved' ? new Date().toISOString() : undefined;

  // 1. Try Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
        .from('testimonials')
        .update({
          status,
          admin_notes: adminNotes || null,
          reward_paid_at: rewardPaidAt || null
        })
        .eq('id', id);
    } catch (e) {
      // Fallback
    }
  }

  // 2. Local fallback
  ensureLocalDataFiles();
  try {
    const raw = fs.existsSync(TESTIMONIALS_FILE) ? fs.readFileSync(TESTIMONIALS_FILE, 'utf8') : '[]';
    const list: VideoTestimonialSubmission[] = JSON.parse(raw);
    const index = list.findIndex(t => t.id === id);
    if (index === -1) return null;

    list[index].status = status;
    if (adminNotes) list[index].adminNotes = adminNotes;
    if (rewardPaidAt) list[index].rewardPaidAt = rewardPaidAt;

    fs.writeFileSync(TESTIMONIALS_FILE, JSON.stringify(list, null, 2), 'utf8');

    // 3. If approved and submitter is a vendor, disburse the reward to vendor wallet
    if (status === 'approved') {
      try {
        const currentTesti = list[index];
        if (currentTesti && currentTesti.submitterType === 'vendor' && currentTesti.submitterId) {
          const vendors = await getAllVendors();
          const matchedVendor = vendors.find(v => v.id === currentTesti.submitterId || (currentTesti.submitterEmail && v.email === currentTesti.submitterEmail));
          if (matchedVendor) {
            const reward = currentTesti.rewardAmount || 50000;
            await updateVendor(matchedVendor.id, {
              walletBalance: (matchedVendor.walletBalance || 0) + reward,
              totalEarnings: (matchedVendor.totalEarnings || 0) + reward
            });
          }
        }
      } catch (rewardErr) {
        console.warn('Failed to auto-disburse testimonial reward to vendor wallet:', rewardErr);
      }
    }

    return list[index];
  } catch {
    return null;
  }
}

// ==========================================
// VENDORS PARTNER MANAGEMENT ENGINE
// ==========================================

export async function getAllVendors(): Promise<any[]> {
  // 1. Try Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map(v => ({
          id: v.id,
          name: v.name,
          companyName: v.company_name || v.name,
          email: v.email,
          phone: v.phone || '',
          instagram: v.instagram || '',
          logoUrl: v.logo_url || '',
          tier: v.tier || 'pro',
          partnerTier: v.partner_tier || 'regular',
          referralCode: v.referral_code || '',
          commissionRate: Number(v.commission_rate ?? 0.12),
          walletBalance: Number(v.wallet_balance ?? 0),
          totalEarnings: Number(v.total_earnings ?? 0),
          wholesaleTokens: Number(v.wholesale_tokens ?? 0),
          bankDetails: {
            bankName: v.bank_name || 'BCA',
            accountNumber: v.bank_account_number || '',
            accountHolder: v.bank_account_holder || v.name
          },
          clientCount: Number(v.client_count ?? 0),
          city: v.city || '',
          createdAt: v.created_at
        }));
      }
    } catch (e) {
      console.warn('Supabase getAllVendors fallback:', e);
    }
  }

  // 2. Local fallback
  ensureLocalDataFiles();
  try {
    const raw = fs.existsSync(VENDORS_FILE) ? fs.readFileSync(VENDORS_FILE, 'utf8') : '[]';
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function saveVendor(vendorData: any): Promise<any> {
  const newVendor = {
    ...vendorData,
    id: vendorData.id || `vendor_${Date.now()}`,
    createdAt: vendorData.createdAt || new Date().toISOString()
  };

  // 1. Try Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      const record = {
        id: newVendor.id,
        name: newVendor.name,
        company_name: newVendor.companyName || newVendor.name,
        email: newVendor.email,
        phone: newVendor.phone || null,
        instagram: newVendor.instagram || null,
        logo_url: newVendor.logoUrl || null,
        tier: newVendor.tier || 'pro',
        partner_tier: newVendor.partnerTier || 'regular',
        referral_code: newVendor.referralCode || null,
        commission_rate: newVendor.commissionRate || 0.12,
        wallet_balance: newVendor.walletBalance || 0,
        total_earnings: newVendor.totalEarnings || 0,
        wholesale_tokens: newVendor.wholesaleTokens || 0,
        bank_name: newVendor.bankDetails?.bankName || null,
        bank_account_number: newVendor.bankDetails?.accountNumber || null,
        bank_account_holder: newVendor.bankDetails?.accountHolder || null,
        city: newVendor.city || null
      };

      await supabase.from('vendors').upsert(record);
    } catch (e) {
      console.warn('Supabase saveVendor fallback:', e);
    }
  }

  // 2. Local fallback
  ensureLocalDataFiles();
  try {
    const raw = fs.existsSync(VENDORS_FILE) ? fs.readFileSync(VENDORS_FILE, 'utf8') : '[]';
    const vendors: any[] = JSON.parse(raw);
    const existingIdx = vendors.findIndex(v => v.id === newVendor.id);
    if (existingIdx >= 0) {
      vendors[existingIdx] = { ...vendors[existingIdx], ...newVendor };
    } else {
      vendors.unshift(newVendor);
    }
    fs.writeFileSync(VENDORS_FILE, JSON.stringify(vendors, null, 2), 'utf8');
  } catch (e) {
    console.warn('Local saveVendor write skipped:', e);
  }

  return newVendor;
}

export async function updateVendor(id: string, updates: any): Promise<any | null> {
  // 1. Try Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      const dbUpdates: Record<string, any> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.companyName !== undefined) dbUpdates.company_name = updates.companyName;
      if (updates.email !== undefined) dbUpdates.email = updates.email;
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
      if (updates.instagram !== undefined) dbUpdates.instagram = updates.instagram;
      if (updates.logoUrl !== undefined) dbUpdates.logo_url = updates.logoUrl;
      if (updates.tier !== undefined) dbUpdates.tier = updates.tier;
      if (updates.partnerTier !== undefined) dbUpdates.partner_tier = updates.partnerTier;
      if (updates.referralCode !== undefined) dbUpdates.referral_code = updates.referralCode;
      if (updates.commissionRate !== undefined) dbUpdates.commission_rate = updates.commissionRate;
      if (updates.walletBalance !== undefined) dbUpdates.wallet_balance = updates.walletBalance;
      if (updates.totalEarnings !== undefined) dbUpdates.total_earnings = updates.totalEarnings;
      if (updates.wholesaleTokens !== undefined) dbUpdates.wholesale_tokens = updates.wholesaleTokens;
      if (updates.clientCount !== undefined) dbUpdates.client_count = updates.clientCount;
      if (updates.bankDetails) {
        if (updates.bankDetails.bankName) dbUpdates.bank_name = updates.bankDetails.bankName;
        if (updates.bankDetails.accountNumber) dbUpdates.bank_account_number = updates.bankDetails.accountNumber;
        if (updates.bankDetails.accountHolder) dbUpdates.bank_account_holder = updates.bankDetails.accountHolder;
      }

      await supabase.from('vendors').update(dbUpdates).eq('id', id);
    } catch (e) {
      console.warn('Supabase updateVendor exception:', e);
    }
  }

  // 2. Local fallback
  ensureLocalDataFiles();
  try {
    const raw = fs.existsSync(VENDORS_FILE) ? fs.readFileSync(VENDORS_FILE, 'utf8') : '[]';
    const vendors: any[] = JSON.parse(raw);
    const idx = vendors.findIndex(v => v.id === id);
    if (idx < 0) return null;

    vendors[idx] = { ...vendors[idx], ...updates, updatedAt: new Date().toISOString() };
    fs.writeFileSync(VENDORS_FILE, JSON.stringify(vendors, null, 2), 'utf8');
    return vendors[idx];
  } catch {
    return null;
  }
}

export async function deleteVendor(id: string): Promise<boolean> {
  // 1. Try Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('vendors').delete().eq('id', id);
    } catch (e) {}
  }

  // 2. Local fallback
  ensureLocalDataFiles();
  try {
    const raw = fs.existsSync(VENDORS_FILE) ? fs.readFileSync(VENDORS_FILE, 'utf8') : '[]';
    let vendors: any[] = JSON.parse(raw);
    vendors = vendors.filter(v => v.id !== id);
    fs.writeFileSync(VENDORS_FILE, JSON.stringify(vendors, null, 2), 'utf8');
    return true;
  } catch {
    return false;
  }
}

// ==========================================
// PHYSICAL ADDONS MANAGEMENT ENGINE
// ==========================================

export async function getAllAddons(): Promise<EventAddonItem[]> {
  // 1. Try Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('addons')
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        return data.map(row => ({
          id: row.id,
          name: row.name,
          category: row.category,
          description: row.description || '',
          price: Number(row.price),
          priceFormatted: `Rp ${Number(row.price).toLocaleString('id-ID')}`,
          costPrice: row.cost_price ? Number(row.cost_price) : undefined,
          imagePreviewUrl: row.image_url || undefined,
          isActive: row.is_active !== false,
          freeShippingJabodetabek: row.free_shipping_jabodetabek !== false,
          unit: row.unit || '1 set',
          isPopular: row.is_popular || false,
          createdAt: row.created_at
        }));
      }
    } catch (e) {
      console.warn('Supabase getAllAddons fallback:', e);
    }
  }

  // 2. Local fallback
  ensureLocalDataFiles();
  try {
    const raw = fs.existsSync(ADDONS_FILE) ? fs.readFileSync(ADDONS_FILE, 'utf8') : '[]';
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function saveAddon(addon: EventAddonItem): Promise<EventAddonItem> {
  const newAddon: EventAddonItem = {
    ...addon,
    id: addon.id || `addon_${Date.now()}`,
    priceFormatted: `Rp ${Number(addon.price).toLocaleString('id-ID')}`,
    createdAt: addon.createdAt || new Date().toISOString()
  };

  // 1. Try Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      const record = {
        id: newAddon.id,
        name: newAddon.name,
        category: newAddon.category,
        description: newAddon.description || null,
        price: newAddon.price,
        cost_price: newAddon.costPrice || null,
        image_url: newAddon.imagePreviewUrl || null,
        is_active: newAddon.isActive !== false,
        free_shipping_jabodetabek: newAddon.freeShippingJabodetabek !== false,
        unit: newAddon.unit || '1 set',
        is_popular: newAddon.isPopular || false
      };

      await supabase.from('addons').upsert(record);
    } catch (e) {
      console.warn('Supabase saveAddon exception:', e);
    }
  }

  // 2. Local fallback
  ensureLocalDataFiles();
  try {
    const raw = fs.existsSync(ADDONS_FILE) ? fs.readFileSync(ADDONS_FILE, 'utf8') : '[]';
    const list: EventAddonItem[] = JSON.parse(raw);
    const existingIdx = list.findIndex(a => a.id === newAddon.id);
    if (existingIdx >= 0) {
      list[existingIdx] = { ...list[existingIdx], ...newAddon };
    } else {
      list.push(newAddon);
    }
    fs.writeFileSync(ADDONS_FILE, JSON.stringify(list, null, 2), 'utf8');
  } catch (e) {}

  return newAddon;
}

export async function updateAddon(id: string, updates: Partial<EventAddonItem>): Promise<EventAddonItem | null> {
  // 1. Try Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      const dbUpdates: Record<string, any> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.category !== undefined) dbUpdates.category = updates.category;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.price !== undefined) dbUpdates.price = updates.price;
      if (updates.costPrice !== undefined) dbUpdates.cost_price = updates.costPrice;
      if (updates.imagePreviewUrl !== undefined) dbUpdates.image_url = updates.imagePreviewUrl;
      if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
      if (updates.freeShippingJabodetabek !== undefined) dbUpdates.free_shipping_jabodetabek = updates.freeShippingJabodetabek;
      if (updates.unit !== undefined) dbUpdates.unit = updates.unit;
      if (updates.isPopular !== undefined) dbUpdates.is_popular = updates.isPopular;

      await supabase.from('addons').update(dbUpdates).eq('id', id);
    } catch (e) {
      console.warn('Supabase updateAddon exception:', e);
    }
  }

  // 2. Local fallback
  ensureLocalDataFiles();
  try {
    const raw = fs.existsSync(ADDONS_FILE) ? fs.readFileSync(ADDONS_FILE, 'utf8') : '[]';
    const list: EventAddonItem[] = JSON.parse(raw);
    const idx = list.findIndex(a => a.id === id);
    if (idx < 0) return null;

    if (updates.price !== undefined) {
      updates.priceFormatted = `Rp ${Number(updates.price).toLocaleString('id-ID')}`;
    }
    list[idx] = { ...list[idx], ...updates };
    fs.writeFileSync(ADDONS_FILE, JSON.stringify(list, null, 2), 'utf8');
    return list[idx];
  } catch {
    return null;
  }
}

export async function deleteAddon(id: string): Promise<boolean> {
  // 1. Try Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('addons').delete().eq('id', id);
    } catch (e) {}
  }

  // 2. Local fallback
  ensureLocalDataFiles();
  try {
    const raw = fs.existsSync(ADDONS_FILE) ? fs.readFileSync(ADDONS_FILE, 'utf8') : '[]';
    let list: EventAddonItem[] = JSON.parse(raw);
    list = list.filter(a => a.id !== id);
    fs.writeFileSync(ADDONS_FILE, JSON.stringify(list, null, 2), 'utf8');
    return true;
  } catch {
    return false;
  }
}

// ==========================================
// VIDEO WISHES (15-SECOND VIDEO GUESTBOOK) ENGINE
// ==========================================

export async function saveVideoWish(wish: VideoWishRecord): Promise<VideoWishRecord> {
  const newWish: VideoWishRecord = {
    ...wish,
    id: wish.id || `vw_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: wish.timestamp || new Date().toISOString()
  };

  // 1. Try Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('video_wishes').insert({
        id: newWish.id,
        event_id: newWish.eventId,
        guest_name: newWish.guestName,
        table_number: newWish.tableNumber || null,
        video_url: newWish.videoUrl,
        thumbnail_url: newWish.thumbnailUrl || null,
        duration: newWish.durationSeconds || 15,
        aspect_ratio: newWish.aspectRatio || '9:16',
        timestamp: newWish.timestamp
      });
    } catch (e) {
      console.warn('Supabase saveVideoWish fallback:', e);
    }
  }

  // 2. Local fallback
  ensureLocalDataFiles();
  try {
    const raw = fs.existsSync(VIDEO_WISHES_FILE) ? fs.readFileSync(VIDEO_WISHES_FILE, 'utf8') : '[]';
    const list: VideoWishRecord[] = JSON.parse(raw);
    list.unshift(newWish);
    fs.writeFileSync(VIDEO_WISHES_FILE, JSON.stringify(list, null, 2), 'utf8');
  } catch (e) {}

  return newWish;
}

export async function getVideoWishes(eventId?: string): Promise<VideoWishRecord[]> {
  // 1. Try Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      let query = supabase.from('video_wishes').select('*').order('timestamp', { ascending: false });
      if (eventId) {
        query = query.eq('event_id', eventId);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data.map(row => ({
          id: row.id,
          eventId: row.event_id,
          guestName: row.guest_name,
          tableNumber: row.table_number || undefined,
          videoUrl: row.video_url,
          thumbnailUrl: row.thumbnail_url || undefined,
          durationSeconds: Number(row.duration || 15),
          aspectRatio: row.aspect_ratio || '9:16',
          timestamp: row.timestamp
        }));
      }
    } catch (e) {
      console.warn('Supabase getVideoWishes fallback:', e);
    }
  }

  // 2. Local fallback
  ensureLocalDataFiles();
  try {
    const raw = fs.existsSync(VIDEO_WISHES_FILE) ? fs.readFileSync(VIDEO_WISHES_FILE, 'utf8') : '[]';
    let list: VideoWishRecord[] = JSON.parse(raw);
    if (eventId) {
      list = list.filter(w => w.eventId === eventId);
    }
    return list;
  } catch {
    return [];
  }
}

export async function deleteVideoWish(id: string): Promise<boolean> {
  // 1. Try Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('video_wishes').delete().eq('id', id);
    } catch (e) {}
  }

  // 2. Local fallback
  ensureLocalDataFiles();
  try {
    const raw = fs.existsSync(VIDEO_WISHES_FILE) ? fs.readFileSync(VIDEO_WISHES_FILE, 'utf8') : '[]';
    let list: VideoWishRecord[] = JSON.parse(raw);
    list = list.filter(w => w.id !== id);
    fs.writeFileSync(VIDEO_WISHES_FILE, JSON.stringify(list, null, 2), 'utf8');
    return true;
  } catch {
    return false;
  }
}




