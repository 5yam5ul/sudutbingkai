import fs from 'fs';
import path from 'path';
import { EventData, PhotoRecord, InvoiceRecord, PayoutRequest, UserAccount, VideoTestimonialSubmission, EventAddonItem, VideoWishRecord, PACKAGE_TIERS, EventPackageTier } from './types';
import { supabase, isSupabaseConfigured } from './supabase';
import { uploadBufferToR2, isR2Configured, deleteFromR2 } from './r2';
import { isSameVendorId } from './auth';

const DATA_DIR = path.join(process.cwd(), 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');
const PHOTOS_FILE = path.join(DATA_DIR, 'photos.json');
const INVOICES_FILE = path.join(DATA_DIR, 'invoices.json');
const PAYOUTS_FILE = path.join(DATA_DIR, 'payouts.json');
const VENDORS_FILE = path.join(DATA_DIR, 'vendors.json');
const TESTIMONIALS_FILE = path.join(DATA_DIR, 'testimonials.json');
const ADDONS_FILE = path.join(DATA_DIR, 'addons.json');
const VIDEO_WISHES_FILE = path.join(DATA_DIR, 'video_wishes.json');
const VOICES_FILE = path.join(DATA_DIR, 'voice_notes.json');
const PROCESSED_WEBHOOKS_FILE = path.join(DATA_DIR, 'processed_webhooks.json');
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

    if (!fs.existsSync(PROCESSED_WEBHOOKS_FILE)) {
      fs.writeFileSync(PROCESSED_WEBHOOKS_FILE, JSON.stringify([], null, 2), 'utf8');
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

function cleanSlugString(text?: string): string | undefined {
  if (!text) return undefined;
  const clean = text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return clean || undefined;
}

function rowToEvent(row: any): EventData {
  const derivedSlug = row.slug || cleanSlugString(row.couple_or_host) || cleanSlugString(row.title) || (row.id ? row.id.replace(/^wedding-|^event-|^sb-/, '') : undefined);
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
  let localEventsMap = new Map<string, EventData>();
  ensureLocalDataFiles();
  try {
    if (fs.existsSync(EVENTS_FILE)) {
      const raw = fs.readFileSync(EVENTS_FILE, 'utf8');
      const parsed: EventData[] = JSON.parse(raw);
      for (const ev of parsed) {
        localEventsMap.set(ev.id, ev);
      }
    }
  } catch {}

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data.map(row => {
          const mapped = rowToEvent(row);
          const localCached = localEventsMap.get(mapped.id);
          if (localCached) {
            if (localCached.guestPin && !mapped.guestPin) mapped.guestPin = localCached.guestPin;
            if (localCached.vendorCoBranding && !mapped.vendorCoBranding) mapped.vendorCoBranding = localCached.vendorCoBranding;
            if (localCached.addons && !mapped.addons) mapped.addons = localCached.addons;
          }
          return mapped;
        });
      }
      if (error) {
        console.warn('Supabase getAllEvents error, falling back to local:', error.message);
      }
    } catch (err) {
      console.warn('Supabase getAllEvents exception:', err);
    }
  }

  return Array.from(localEventsMap.values());
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
        const mapped = rowToEvent(data);
        try {
          if (fs.existsSync(EVENTS_FILE)) {
            const raw = fs.readFileSync(EVENTS_FILE, 'utf8');
            const parsed: EventData[] = JSON.parse(raw);
            const localCached = parsed.find(e => e.id === mapped.id);
            if (localCached) {
              if (localCached.guestPin && !mapped.guestPin) mapped.guestPin = localCached.guestPin;
              if (localCached.vendorCoBranding && !mapped.vendorCoBranding) mapped.vendorCoBranding = localCached.vendorCoBranding;
              if (localCached.addons && !mapped.addons) mapped.addons = localCached.addons;
            }
          }
        } catch {}
        return mapped;
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

      if (error) {
        console.warn('Supabase saveEvent error, syncing local cache:', error.message);
      }
    } catch (err) {
      console.warn('Supabase saveEvent exception:', err);
    }
  }

  // Always sync local cache so extended fields (guestPin, vendorCoBranding, addons) and local fallback stay up to date
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
  const existing = await getEventById(id);
  const canonicalId = existing?.id || id;

  // Clean up replaced coverUrl or customFrameUrl from Cloudflare R2
  try {
    if (updates.coverUrl !== undefined && existing?.coverUrl && existing.coverUrl !== updates.coverUrl) {
      await deleteFromR2(existing.coverUrl);
    }
    if (updates.customFrameUrl !== undefined && existing?.customFrameUrl && existing.customFrameUrl !== updates.customFrameUrl) {
      await deleteFromR2(existing.customFrameUrl);
    }
  } catch {}

  if (isSupabaseConfigured && supabase) {
    try {
      const dbUpdates: Record<string, any> = {};
      if (updates.slug !== undefined) dbUpdates.slug = updates.slug;
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.coupleOrHost !== undefined) dbUpdates.couple_or_host = updates.coupleOrHost;
      if (updates.eventDate !== undefined) dbUpdates.event_date = updates.eventDate;
      if (updates.location !== undefined) dbUpdates.location = updates.location;
      if (updates.preset !== undefined) dbUpdates.preset = updates.preset;
      if (updates.allowedPresets !== undefined) dbUpdates.allowed_presets = updates.allowedPresets;
      if (updates.allowGuestPresetSwitch !== undefined) dbUpdates.allow_guest_preset_switch = updates.allowGuestPresetSwitch;
      if (updates.packageTier !== undefined) dbUpdates.package_tier = updates.packageTier;
      if (updates.maxGuests !== undefined) dbUpdates.max_guests = updates.maxGuests;
      if (updates.additionalPax !== undefined) dbUpdates.additional_pax = updates.additionalPax;
      if (updates.shotsPerGuest !== undefined) dbUpdates.shots_per_guest = updates.shotsPerGuest;
      if (updates.revealMode !== undefined) dbUpdates.reveal_mode = updates.revealMode;
      if (updates.revealTime !== undefined) dbUpdates.reveal_time = updates.revealTime || null;
      if (updates.frameId !== undefined) dbUpdates.frame_id = updates.frameId;
      if (updates.customFrameUrl !== undefined) dbUpdates.custom_frame_url = updates.customFrameUrl || null;
      if (updates.frameText !== undefined) dbUpdates.frame_text = updates.frameText || null;
      if (updates.allowVoiceNote !== undefined) dbUpdates.allow_voice_note = updates.allowVoiceNote;
      if (updates.closingWishType !== undefined) dbUpdates.closing_wish_type = updates.closingWishType;
      if (updates.allowGuestFrameToggle !== undefined) dbUpdates.allow_guest_frame_toggle = updates.allowGuestFrameToggle;
      if (updates.coverUrl !== undefined) dbUpdates.cover_url = updates.coverUrl || null;
      if (updates.paymentStatus !== undefined) dbUpdates.payment_status = updates.paymentStatus;
      if (updates.hostEmail !== undefined) dbUpdates.host_email = updates.hostEmail;
      if (updates.referralCodeUsed !== undefined) dbUpdates.referral_code_used = updates.referralCodeUsed;
      if (updates.commissionAmount !== undefined) dbUpdates.commission_amount = updates.commissionAmount;
      if (updates.commissionStatus !== undefined) dbUpdates.commission_status = updates.commissionStatus;
      if (updates.vendorId !== undefined) dbUpdates.vendor_id = updates.vendorId;
      if (updates.vendorName !== undefined) dbUpdates.vendor_name = updates.vendorName;
      if (updates.vendorLogo !== undefined) dbUpdates.vendor_logo = updates.vendorLogo;
      if (updates.vendorInstagram !== undefined) dbUpdates.vendor_instagram = updates.vendorInstagram;

      const { data, error } = await supabase
        .from('events')
        .update(dbUpdates)
        .eq('id', canonicalId)
        .select()
        .single();

      if (!error && data) {
        const updated: EventData = {
          ...rowToEvent(data),
          guestPin: updates.guestPin !== undefined ? (updates.guestPin || undefined) : existing?.guestPin,
          vendorCoBranding: updates.vendorCoBranding !== undefined ? updates.vendorCoBranding : existing?.vendorCoBranding,
          addons: updates.addons !== undefined ? updates.addons : existing?.addons
        };
        // Also sync local cache safely
        try {
          ensureLocalDataFiles();
          const raw = fs.existsSync(EVENTS_FILE) ? fs.readFileSync(EVENTS_FILE, 'utf8') : '[]';
          const events: EventData[] = JSON.parse(raw);
          const idx = events.findIndex(e => e.id === canonicalId || e.slug === canonicalId);
          if (idx >= 0) {
            events[idx] = updated;
          } else {
            events.unshift(updated);
          }
          fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2), 'utf8');
        } catch {}

        return updated;
      }
      console.warn(`Supabase updateEvent(${canonicalId}) error, falling back to local:`, error?.message);
    } catch (err) {
      console.warn('Supabase updateEvent exception:', err);
    }
  }

  // Local fallback
  ensureLocalDataFiles();
  try {
    const raw = fs.existsSync(EVENTS_FILE) ? fs.readFileSync(EVENTS_FILE, 'utf8') : '[]';
    const events: EventData[] = JSON.parse(raw);
    const existingIdx = events.findIndex(e => e.id === canonicalId || e.slug === canonicalId);
    if (existingIdx < 0) return null;

    const normalizedUpdates = { ...updates };
    if (normalizedUpdates.coverUrl === '') normalizedUpdates.coverUrl = undefined;
    if (normalizedUpdates.customFrameUrl === '') normalizedUpdates.customFrameUrl = undefined;
    if (normalizedUpdates.revealTime === '') normalizedUpdates.revealTime = undefined;

    events[existingIdx] = { ...events[existingIdx], ...normalizedUpdates };
    fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2), 'utf8');
    return events[existingIdx];
  } catch {
    return null;
  }
}

export async function deleteEvent(id: string): Promise<boolean> {
  const existing = await getEventById(id);
  const canonicalId = existing?.id || id;

  // 0a. Clawback available vendor commission if event is deleted while commissionStatus === 'available'
  if (
    existing?.paymentStatus === 'paid' &&
    existing?.vendorId &&
    existing?.commissionAmount &&
    existing.commissionAmount > 0 &&
    existing.commissionStatus === 'available'
  ) {
    try {
      const allVendors = await getAllVendors();
      const matchedVendor = allVendors.find(
        v => v.id === existing.vendorId || v.id?.replace(/^v_/, 'vendor_') === existing.vendorId?.replace(/^v_/, 'vendor_')
      );
      if (matchedVendor) {
        await updateVendor(matchedVendor.id, {
          walletBalance: Math.max(0, (matchedVendor.walletBalance || 0) - existing.commissionAmount),
          totalEarnings: Math.max(0, (matchedVendor.totalEarnings || 0) - existing.commissionAmount),
        });
      }
    } catch {}
  }

  // 0b. Clean up event cover photo and custom frame PNG from Cloudflare R2
  try {
    if (existing?.coverUrl) {
      await deleteFromR2(existing.coverUrl);
    }
    if (existing?.customFrameUrl) {
      await deleteFromR2(existing.customFrameUrl);
    }
  } catch {}

  // 1. Cascade cleanup: delete all photo files from Cloudflare R2, Supabase Storage, and local uploads
  try {
    const eventPhotos = await getAllPhotos(canonicalId, true);
    for (const p of eventPhotos) {
      if (p.imageData) {
        await deleteFromR2(p.imageData);
        if (isSupabaseConfigured && supabase && p.imageData.includes('/photos/')) {
          try {
            const pathPart = p.imageData.split('/photos/')[1];
            if (pathPart) await supabase.storage.from('photos').remove([pathPart]);
          } catch {}
        }
        if (p.imageData.startsWith('/uploads/')) {
          try {
            const localPath = path.join(process.cwd(), 'public', p.imageData.replace(/^\//, ''));
            if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
          } catch {}
        }
      }
      if (p.voiceNoteUrl) {
        await deleteFromR2(p.voiceNoteUrl);
      }
    }
  } catch (cleanErr) {
    console.warn(`Error cleaning photo files for event ${canonicalId}:`, cleanErr);
  }

  // 2. Cascade cleanup for video wishes and voice notes (Cloudflare R2 + Supabase Storage + local)
  try {
    const wishes = await getVideoWishes(canonicalId);
    for (const w of wishes) {
      if (w.videoUrl) {
        await deleteFromR2(w.videoUrl);
        if (isSupabaseConfigured && supabase && w.videoUrl.includes('/videos/')) {
          try {
            const pathPart = w.videoUrl.split('/videos/')[1];
            if (pathPart) await supabase.storage.from('videos').remove([pathPart]);
          } catch {}
        }
        if (w.videoUrl.startsWith('/uploads/')) {
          try {
            const vPath = path.join(process.cwd(), 'public', w.videoUrl.replace(/^\//, ''));
            if (fs.existsSync(vPath)) fs.unlinkSync(vPath);
          } catch {}
        }
      }
      if (w.thumbnailUrl) {
        await deleteFromR2(w.thumbnailUrl);
      }
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: supaVoices } = await supabase
          .from('voice_notes')
          .select('audio_url')
          .eq('event_id', canonicalId);
        if (supaVoices && supaVoices.length > 0) {
          for (const v of supaVoices) {
            if (v.audio_url) {
              await deleteFromR2(v.audio_url);
              if (v.audio_url.includes('/voices/')) {
                try {
                  const pathPart = v.audio_url.split('/voices/')[1];
                  if (pathPart) await supabase.storage.from('photos').remove([`voices/${pathPart}`]);
                } catch {}
              }
            }
          }
        }
      } catch {}
    }

    // Delete local voice files if any
    if (fs.existsSync(VOICES_FILE)) {
      const rawV = fs.readFileSync(VOICES_FILE, 'utf8');
      const allVoices: any[] = JSON.parse(rawV);
      const eventVoices = allVoices.filter(v => v.eventId === canonicalId);
      for (const v of eventVoices) {
        const aUrl = v.audioUrl || v.audio_url;
        if (aUrl) {
          await deleteFromR2(aUrl);
          if (aUrl.startsWith('/uploads/')) {
            try {
              const aPath = path.join(process.cwd(), 'public', aUrl.replace(/^\//, ''));
              if (fs.existsSync(aPath)) fs.unlinkSync(aPath);
            } catch {}
          }
        }
      }
      const keptVoices = allVoices.filter(v => v.eventId !== canonicalId);
      fs.writeFileSync(VOICES_FILE, JSON.stringify(keptVoices, null, 2), 'utf8');
    }

    // Clean up any event testimonials and their R2 video files
    const eventTestimonials = await getTestimonialsByEvent(canonicalId);
    for (const t of eventTestimonials) {
      if (t.videoUrl) {
        await deleteFromR2(t.videoUrl);
      }
    }
  } catch {}

  // 3. Supabase row deletion
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('photos').delete().eq('event_id', canonicalId);
      await supabase.from('video_wishes').delete().eq('event_id', canonicalId);
      await supabase.from('voice_notes').delete().eq('event_id', canonicalId);
      await supabase.from('testimonials').delete().eq('event_id', canonicalId);
      await supabase.from('invoices').delete().eq('event_id', canonicalId);
      const { error } = await supabase.from('events').delete().eq('id', canonicalId);
      if (!error) {
        // Also sync local fallback cleanup
        ensureLocalDataFiles();
        try {
          if (fs.existsSync(EVENTS_FILE)) {
            const raw = fs.readFileSync(EVENTS_FILE, 'utf8');
            let events: EventData[] = JSON.parse(raw);
            events = events.filter(e => e.id !== canonicalId && e.slug !== canonicalId);
            fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2), 'utf8');
          }
          if (fs.existsSync(PHOTOS_FILE)) {
            const rawPhotos = fs.readFileSync(PHOTOS_FILE, 'utf8');
            let photos: PhotoRecord[] = JSON.parse(rawPhotos);
            photos = photos.filter(p => p.eventId !== canonicalId);
            fs.writeFileSync(PHOTOS_FILE, JSON.stringify(photos, null, 2), 'utf8');
          }
          if (fs.existsSync(VIDEO_WISHES_FILE)) {
            const rawWishes = fs.readFileSync(VIDEO_WISHES_FILE, 'utf8');
            let wishes: VideoWishRecord[] = JSON.parse(rawWishes);
            wishes = wishes.filter(w => w.eventId !== canonicalId);
            fs.writeFileSync(VIDEO_WISHES_FILE, JSON.stringify(wishes, null, 2), 'utf8');
          }
          if (fs.existsSync(TESTIMONIALS_FILE)) {
            const rawTesti = fs.readFileSync(TESTIMONIALS_FILE, 'utf8');
            let testis: VideoTestimonialSubmission[] = JSON.parse(rawTesti);
            testis = testis.filter(t => t.eventId !== canonicalId);
            fs.writeFileSync(TESTIMONIALS_FILE, JSON.stringify(testis, null, 2), 'utf8');
          }
          if (fs.existsSync(INVOICES_FILE)) {
            const rawInv = fs.readFileSync(INVOICES_FILE, 'utf8');
            let invs: InvoiceRecord[] = JSON.parse(rawInv);
            invs = invs.filter(inv => inv.eventId !== canonicalId);
            fs.writeFileSync(INVOICES_FILE, JSON.stringify(invs, null, 2), 'utf8');
          }
        } catch {}
        return true;
      }
      console.warn(`Supabase deleteEvent(${canonicalId}) error:`, error.message);
    } catch (err) {
      console.warn('Supabase deleteEvent exception:', err);
    }
  }

  // 4. Local fallback cleanup
  ensureLocalDataFiles();
  try {
    if (fs.existsSync(EVENTS_FILE)) {
      const raw = fs.readFileSync(EVENTS_FILE, 'utf8');
      let events: EventData[] = JSON.parse(raw);
      events = events.filter(e => e.id !== canonicalId && e.slug !== canonicalId);
      fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2), 'utf8');
    }
    if (fs.existsSync(PHOTOS_FILE)) {
      const rawPhotos = fs.readFileSync(PHOTOS_FILE, 'utf8');
      let photos: PhotoRecord[] = JSON.parse(rawPhotos);
      photos = photos.filter(p => p.eventId !== canonicalId);
      fs.writeFileSync(PHOTOS_FILE, JSON.stringify(photos, null, 2), 'utf8');
    }
    if (fs.existsSync(VIDEO_WISHES_FILE)) {
      const rawWishes = fs.readFileSync(VIDEO_WISHES_FILE, 'utf8');
      let wishes: VideoWishRecord[] = JSON.parse(rawWishes);
      wishes = wishes.filter(w => w.eventId !== canonicalId);
      fs.writeFileSync(VIDEO_WISHES_FILE, JSON.stringify(wishes, null, 2), 'utf8');
    }
    if (fs.existsSync(TESTIMONIALS_FILE)) {
      const rawTesti = fs.readFileSync(TESTIMONIALS_FILE, 'utf8');
      let testis: VideoTestimonialSubmission[] = JSON.parse(rawTesti);
      testis = testis.filter(t => t.eventId !== canonicalId);
      fs.writeFileSync(TESTIMONIALS_FILE, JSON.stringify(testis, null, 2), 'utf8');
    }
    if (fs.existsSync(INVOICES_FILE)) {
      const rawInv = fs.readFileSync(INVOICES_FILE, 'utf8');
      let invs: InvoiceRecord[] = JSON.parse(rawInv);
      invs = invs.filter(inv => inv.eventId !== canonicalId);
      fs.writeFileSync(INVOICES_FILE, JSON.stringify(invs, null, 2), 'utf8');
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
        const photo = rowToPhoto(data);
        try {
          ensureLocalDataFiles();
          const raw = fs.existsSync(PHOTOS_FILE) ? fs.readFileSync(PHOTOS_FILE, 'utf8') : '[]';
          const photos: PhotoRecord[] = JSON.parse(raw);
          const idx = photos.findIndex(p => p.id === id);
          if (idx >= 0) {
            photos[idx] = photo;
            fs.writeFileSync(PHOTOS_FILE, JSON.stringify(photos, null, 2), 'utf8');
          }
        } catch {}
        return photo;
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
        .select('image_url, voice_note_url')
        .eq('id', id)
        .maybeSingle();

      const { error } = await supabase
        .from('photos')
        .delete()
        .eq('id', id);

      if (!error) {
        if (target?.image_url) {
          await deleteFromR2(target.image_url);
          if (target.image_url.includes('/photos/')) {
            const pathPart = target.image_url.split('/photos/')[1];
            if (pathPart) {
              await supabase.storage.from('photos').remove([pathPart]);
            }
          }
        }
        if ((target as any)?.voice_note_url) {
          await deleteFromR2((target as any).voice_note_url);
        }
        // Also sync local cache
        try {
          ensureLocalDataFiles();
          if (fs.existsSync(PHOTOS_FILE)) {
            const raw = fs.readFileSync(PHOTOS_FILE, 'utf8');
            let photos: PhotoRecord[] = JSON.parse(raw);
            photos = photos.filter(p => p.id !== id);
            fs.writeFileSync(PHOTOS_FILE, JSON.stringify(photos, null, 2), 'utf8');
          }
        } catch {}
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

    if (target.imageData) {
      await deleteFromR2(target.imageData);
      if (target.imageData.startsWith('/uploads/')) {
        const filePath = path.join(process.cwd(), 'public', target.imageData.replace(/^\//, ''));
        if (fs.existsSync(filePath)) {
          try { fs.unlinkSync(filePath); } catch {}
        }
      }
    }
    if (target.voiceNoteUrl) {
      await deleteFromR2(target.voiceNoteUrl);
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
  const orderId = data.orderId || `ord_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
  const buyerType = data.buyerType || 'client';
  const tierKey = (data.tierId || 'wedding') as EventPackageTier;
  const tierName = data.tierName || (PACKAGE_TIERS[tierKey]?.name || data.tierId || 'Wedding');
  const originalPrice = Number(data.originalPrice ?? data.finalAmount ?? 0);
  const finalAmount = Number(data.finalAmount ?? data.originalPrice ?? 0);
  const status = data.status || 'paid';
  const paidAt = data.paidAt || (status === 'paid' ? createdAt : undefined);

  const newInvoice: InvoiceRecord = {
    ...data,
    id,
    invoiceNumber,
    orderId,
    buyerType,
    tierName,
    originalPrice,
    finalAmount,
    status,
    paidAt,
    createdAt
  };

  // 1. Try Supabase insert
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: insertedData, error: insertError } = await supabase.from('invoices').insert({
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
      }).select().maybeSingle();

      if (!insertError && insertedData) {
        // Also sync local cache
        invoices.unshift(newInvoice);
        try {
          fs.writeFileSync(INVOICES_FILE, JSON.stringify(invoices, null, 2), 'utf8');
        } catch {}
        return newInvoice;
      }
      if (insertError) {
        console.warn('Supabase invoice insert error, falling back:', insertError.message);
      }
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
    const result = invoices.find(inv => 
      inv.id.toLowerCase() === lower ||
      inv.invoiceNumber.toLowerCase() === lower ||
      (inv.eventId && inv.eventId.toLowerCase() === lower) ||
      inv.orderId.toLowerCase() === lower
    ) || null;
    if (result) return result;
  } catch {
    // ignore
  }

  // 3. Fallback: check if cleanQuery is an event slug
  try {
    const matchedEvent = await getEventById(cleanQuery);
    if (matchedEvent && matchedEvent.id !== cleanQuery) {
      return getInvoice(matchedEvent.id);
    }
  } catch {}

  return null;
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
      const { data, error } = await supabase
        .from('invoices')
        .update({ status, paid_at: effectivePaidAt || null })
        .or(`id.eq.${cleanQuery},invoice_number.eq.${cleanQuery},order_id.eq.${cleanQuery}`)
        .select()
        .maybeSingle();

      if (!error && data) {
        const updatedInvoice: InvoiceRecord = {
          id: data.id,
          invoiceNumber: data.invoice_number,
          eventId: data.event_id || undefined,
          orderId: data.order_id,
          buyerType: data.buyer_type,
          buyerName: data.buyer_name,
          buyerEmail: data.buyer_email,
          buyerPhone: data.buyer_phone || undefined,
          companyName: data.company_name || undefined,
          tierId: data.tier_id,
          tierName: data.tier_name,
          originalPrice: Number(data.original_price),
          discountAmount: Number(data.discount_amount || 0),
          discountCode: data.discount_code || undefined,
          finalAmount: Number(data.final_amount),
          paymentMethod: data.payment_method || 'qris',
          status: data.status,
          paidAt: data.paid_at || undefined,
          createdAt: data.created_at
        };

        // Also safely sync local cache
        try {
          ensureLocalDataFiles();
          const raw = fs.existsSync(INVOICES_FILE) ? fs.readFileSync(INVOICES_FILE, 'utf8') : '[]';
          const invoices: InvoiceRecord[] = JSON.parse(raw);
          const lower = cleanQuery.toLowerCase();
          const idx = invoices.findIndex(inv => 
            inv.id.toLowerCase() === lower ||
            inv.invoiceNumber.toLowerCase() === lower ||
            (inv.eventId && inv.eventId.toLowerCase() === lower) ||
            inv.orderId.toLowerCase() === lower ||
            inv.id === data.id
          );
          if (idx >= 0) {
            invoices[idx] = updatedInvoice;
          } else {
            invoices.unshift(updatedInvoice);
          }
          fs.writeFileSync(INVOICES_FILE, JSON.stringify(invoices, null, 2), 'utf8');
        } catch {}

        return updatedInvoice;
      }
    } catch (e) {
      console.warn('Supabase updateInvoiceStatus exception:', e);
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

      const { data, error } = await supabase
        .from('invoices')
        .update(dbUpdates)
        .or(`id.eq.${id},invoice_number.eq.${id}`)
        .select()
        .maybeSingle();

      if (!error && data) {
        const updatedInvoice: InvoiceRecord = {
          id: data.id,
          invoiceNumber: data.invoice_number,
          eventId: data.event_id || undefined,
          orderId: data.order_id,
          buyerType: data.buyer_type,
          buyerName: data.buyer_name,
          buyerEmail: data.buyer_email,
          buyerPhone: data.buyer_phone || undefined,
          companyName: data.company_name || undefined,
          tierId: data.tier_id,
          tierName: data.tier_name,
          originalPrice: Number(data.original_price),
          discountAmount: Number(data.discount_amount || 0),
          discountCode: data.discount_code || undefined,
          finalAmount: Number(data.final_amount),
          paymentMethod: data.payment_method || 'qris',
          status: data.status,
          paidAt: data.paid_at || undefined,
          createdAt: data.created_at
        };

        // Also safely sync local cache
        try {
          ensureLocalDataFiles();
          const raw = fs.existsSync(INVOICES_FILE) ? fs.readFileSync(INVOICES_FILE, 'utf8') : '[]';
          const invoices: InvoiceRecord[] = JSON.parse(raw);
          const idx = invoices.findIndex(i => i.id === id || i.invoiceNumber === id || i.id === data.id);
          if (idx >= 0) {
            invoices[idx] = updatedInvoice;
          } else {
            invoices.unshift(updatedInvoice);
          }
          fs.writeFileSync(INVOICES_FILE, JSON.stringify(invoices, null, 2), 'utf8');
        } catch {}

        return updatedInvoice;
      }
      if (error) {
        console.warn('Supabase updateInvoice error:', error.message);
      }
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
      const { error } = await supabase.from('invoices').delete().or(`id.eq.${id},invoice_number.eq.${id}`);
      if (!error) {
        // Also sync local cache safely
        ensureLocalDataFiles();
        try {
          const raw = fs.existsSync(INVOICES_FILE) ? fs.readFileSync(INVOICES_FILE, 'utf8') : '[]';
          let invoices: InvoiceRecord[] = JSON.parse(raw);
          invoices = invoices.filter(i => i.id !== id && i.invoiceNumber !== id);
          fs.writeFileSync(INVOICES_FILE, JSON.stringify(invoices, null, 2), 'utf8');
        } catch {}
        return true;
      }
    } catch (e) {
      console.warn('Supabase deleteInvoice exception:', e);
    }
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
    return payouts.filter(p => isSameVendorId(p.vendorId, vendorId) || p.vendorEmail.toLowerCase() === vendorId.toLowerCase());
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

  // Check existing payout first to prevent double-refund and properly refund rejected pending payouts
  let previousStatus: string | undefined;
  try {
    const existingList = await getPayoutRequests();
    const existingPayout = existingList.find(p => p.id === id);
    previousStatus = existingPayout?.status;
    if (existingPayout?.proofUrl) {
      const isProofReplaced = Boolean(proofUrl && existingPayout.proofUrl !== proofUrl);
      const isRejectedWithoutNewProof = status === 'rejected' && !proofUrl;
      if (isProofReplaced || isRejectedWithoutNewProof) {
        await deleteFromR2(existingPayout.proofUrl);
      }
    }
  } catch {}

  const refundRejectedVendorPayout = async (vendorId: string, vendorEmail: string, amount: number) => {
    if (status !== 'rejected' || previousStatus !== 'pending' || amount <= 0) return;
    try {
      const vendors = await getAllVendors();
      const matchedVendor = vendors.find(
        v => isSameVendorId(v.id, vendorId) || (vendorEmail && v.email?.toLowerCase() === vendorEmail.toLowerCase())
      );
      if (matchedVendor) {
        await updateVendor(matchedVendor.id, {
          walletBalance: (matchedVendor.walletBalance || 0) + amount
        });
      }
    } catch (refundErr) {
      console.warn('Failed to refund rejected payout to vendor wallet:', refundErr);
    }
  };

  // 1. Try Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('payout_requests')
        .update({
          status,
          proof_url: proofUrl || null,
          notes: notes || null,
          processed_at: processedAt
        })
        .eq('id', id)
        .select()
        .maybeSingle();

      if (!error && data) {
        const updatedPayout: PayoutRequest = {
          id: data.id,
          vendorId: data.vendor_id,
          vendorEmail: data.vendor_email,
          vendorName: data.vendor_name,
          companyName: data.company_name || undefined,
          amount: Number(data.amount),
          bankDetails: data.bank_details || { bankName: 'BCA', accountNumber: '', accountHolder: '' },
          status: data.status,
          proofUrl: data.proof_url || undefined,
          notes: data.notes || undefined,
          requestedAt: data.requested_at,
          processedAt: data.processed_at || undefined
        };

        await refundRejectedVendorPayout(updatedPayout.vendorId, updatedPayout.vendorEmail, updatedPayout.amount);

        // Also sync local cache safely
        try {
          ensureLocalDataFiles();
          const raw = fs.existsSync(PAYOUTS_FILE) ? fs.readFileSync(PAYOUTS_FILE, 'utf8') : '[]';
          const payouts: PayoutRequest[] = JSON.parse(raw);
          const index = payouts.findIndex(p => p.id === id);
          if (index >= 0) {
            payouts[index] = updatedPayout;
          } else {
            payouts.unshift(updatedPayout);
          }
          fs.writeFileSync(PAYOUTS_FILE, JSON.stringify(payouts, null, 2), 'utf8');
        } catch {}

        return updatedPayout;
      }
    } catch (e) {
      console.warn('Supabase updatePayoutStatus exception:', e);
    }
  }

  // 2. Local fallback
  ensureLocalDataFiles();
  try {
    const raw = fs.existsSync(PAYOUTS_FILE) ? fs.readFileSync(PAYOUTS_FILE, 'utf8') : '[]';
    const payouts: PayoutRequest[] = JSON.parse(raw);
    const index = payouts.findIndex(p => p.id === id);
    if (index === -1) return null;

    if (!previousStatus) previousStatus = payouts[index].status;
    payouts[index].status = status;
    payouts[index].processedAt = processedAt;
    if (proofUrl) payouts[index].proofUrl = proofUrl;
    if (notes) payouts[index].notes = notes;

    fs.writeFileSync(PAYOUTS_FILE, JSON.stringify(payouts, null, 2), 'utf8');
    await refundRejectedVendorPayout(payouts[index].vendorId, payouts[index].vendorEmail, payouts[index].amount);
    return payouts[index];
  } catch {
    return null;
  }
}

export async function deletePayout(id: string): Promise<boolean> {
  try {
    const allPayouts = await getPayoutRequests();
    const target = allPayouts.find(p => p.id === id);
    if (target) {
      if (target.proofUrl) {
        await deleteFromR2(target.proofUrl);
      }
      if (target.status === 'pending' && target.amount > 0) {
        const vendors = await getAllVendors();
        const matchedVendor = vendors.find(
          v => isSameVendorId(v.id, target.vendorId) || (target.vendorEmail && v.email?.toLowerCase() === target.vendorEmail.toLowerCase())
        );
        if (matchedVendor) {
          await updateVendor(matchedVendor.id, {
            walletBalance: (matchedVendor.walletBalance || 0) + target.amount
          });
        }
      }
    }
  } catch {}

  // 1. Try Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('payout_requests').delete().eq('id', id);
      if (!error) {
        // Also sync local cache
        ensureLocalDataFiles();
        try {
          const raw = fs.existsSync(PAYOUTS_FILE) ? fs.readFileSync(PAYOUTS_FILE, 'utf8') : '[]';
          let payouts: PayoutRequest[] = JSON.parse(raw);
          payouts = payouts.filter(p => p.id !== id);
          fs.writeFileSync(PAYOUTS_FILE, JSON.stringify(payouts, null, 2), 'utf8');
        } catch {}
        return true;
      }
    } catch (e) {
      console.warn('Supabase deletePayout exception:', e);
    }
  }

  // 2. Local fallback
  ensureLocalDataFiles();
  try {
    const raw = fs.existsSync(PAYOUTS_FILE) ? fs.readFileSync(PAYOUTS_FILE, 'utf8') : '[]';
    let payouts: PayoutRequest[] = JSON.parse(raw);
    payouts = payouts.filter(p => p.id !== id);
    fs.writeFileSync(PAYOUTS_FILE, JSON.stringify(payouts, null, 2), 'utf8');
    return true;
  } catch {
    return false;
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
  return all.filter(t => isSameVendorId(t.submitterId, vendorId) || t.submitterEmail?.toLowerCase() === vendorId.toLowerCase());
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
  // Check existing testimonial first to prevent double-rewarding a previously approved submission
  let alreadyRewarded = false;
  try {
    const existingList = await getAllTestimonials();
    const existingTesti = existingList.find(t => t.id === id);
    if (existingTesti && (existingTesti.status === 'approved' || Boolean(existingTesti.rewardPaidAt))) {
      alreadyRewarded = true;
    }
  } catch {}

  const rewardPaidAt = status === 'approved' ? new Date().toISOString() : undefined;

  // 1. Try Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('testimonials')
        .update({
          status,
          admin_notes: adminNotes || null,
          reward_paid_at: rewardPaidAt || null
        })
        .eq('id', id)
        .select()
        .maybeSingle();

      if (!error && data) {
        const updatedTesti: VideoTestimonialSubmission = {
          id: data.id,
          eventId: data.event_id,
          eventTitle: data.event_title,
          submitterType: data.submitter_type,
          submitterId: data.submitter_id,
          submitterName: data.submitter_name,
          submitterEmail: data.submitter_email || undefined,
          videoType: data.video_type || 'link',
          videoUrl: data.video_url,
          durationSeconds: Number(data.duration_seconds),
          caption: data.caption || undefined,
          rewardAmount: Number(data.reward_amount || 50000),
          status: data.status,
          adminNotes: data.admin_notes || undefined,
          rewardPaidAt: data.reward_paid_at || undefined,
          submittedAt: data.submitted_at || data.created_at || new Date().toISOString()
        };

        // If newly approved (not already rewarded) and submitter is a vendor, disburse the reward to vendor wallet
        if (status === 'approved' && !alreadyRewarded && updatedTesti.submitterType === 'vendor' && updatedTesti.submitterId) {
          try {
            const vendors = await getAllVendors();
            const matchedVendor = vendors.find(v => isSameVendorId(v.id, updatedTesti.submitterId) || (updatedTesti.submitterEmail && v.email === updatedTesti.submitterEmail));
            if (matchedVendor && matchedVendor.status !== 'suspended') {
              const reward = updatedTesti.rewardAmount || 50000;
              await updateVendor(matchedVendor.id, {
                walletBalance: (matchedVendor.walletBalance || 0) + reward,
                totalEarnings: (matchedVendor.totalEarnings || 0) + reward
              });
            }
          } catch (rewardErr) {
            console.warn('Failed to auto-disburse testimonial reward to vendor wallet:', rewardErr);
          }
        }

        // Also safely sync local cache
        try {
          ensureLocalDataFiles();
          const raw = fs.existsSync(TESTIMONIALS_FILE) ? fs.readFileSync(TESTIMONIALS_FILE, 'utf8') : '[]';
          const list: VideoTestimonialSubmission[] = JSON.parse(raw);
          const index = list.findIndex(t => t.id === id);
          if (index >= 0) {
            list[index] = updatedTesti;
          } else {
            list.unshift(updatedTesti);
          }
          fs.writeFileSync(TESTIMONIALS_FILE, JSON.stringify(list, null, 2), 'utf8');
        } catch {}

        return updatedTesti;
      }
    } catch (e) {
      console.warn('Supabase updateTestimonialStatus exception:', e);
    }
  }

  // 2. Local fallback
  ensureLocalDataFiles();
  try {
    const raw = fs.existsSync(TESTIMONIALS_FILE) ? fs.readFileSync(TESTIMONIALS_FILE, 'utf8') : '[]';
    const list: VideoTestimonialSubmission[] = JSON.parse(raw);
    const index = list.findIndex(t => t.id === id);
    if (index === -1) return null;

    if (list[index].status === 'approved' || Boolean(list[index].rewardPaidAt)) {
      alreadyRewarded = true;
    }

    list[index].status = status;
    if (adminNotes) list[index].adminNotes = adminNotes;
    if (rewardPaidAt) list[index].rewardPaidAt = rewardPaidAt;

    fs.writeFileSync(TESTIMONIALS_FILE, JSON.stringify(list, null, 2), 'utf8');

    // 3. If newly approved and submitter is a vendor, disburse the reward to vendor wallet
    if (status === 'approved' && !alreadyRewarded) {
      try {
        const currentTesti = list[index];
        if (currentTesti && currentTesti.submitterType === 'vendor' && currentTesti.submitterId) {
          const vendors = await getAllVendors();
          const matchedVendor = vendors.find(v => isSameVendorId(v.id, currentTesti.submitterId) || (currentTesti.submitterEmail && v.email === currentTesti.submitterEmail));
          if (matchedVendor && matchedVendor.status !== 'suspended') {
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

export async function deleteTestimonial(id: string): Promise<boolean> {
  try {
    const allTestimonials = await getAllTestimonials();
    const target = allTestimonials.find(t => t.id === id);
    if (target?.videoUrl) {
      await deleteFromR2(target.videoUrl);
    }
  } catch {}

  // 1. Try Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('testimonials').delete().eq('id', id);
      if (!error) {
        // Also sync local cache
        ensureLocalDataFiles();
        try {
          const raw = fs.existsSync(TESTIMONIALS_FILE) ? fs.readFileSync(TESTIMONIALS_FILE, 'utf8') : '[]';
          let list: VideoTestimonialSubmission[] = JSON.parse(raw);
          list = list.filter(t => t.id !== id);
          fs.writeFileSync(TESTIMONIALS_FILE, JSON.stringify(list, null, 2), 'utf8');
        } catch {}
        return true;
      }
    } catch (e) {
      console.warn('Supabase deleteTestimonial exception:', e);
    }
  }

  // 2. Local fallback
  ensureLocalDataFiles();
  try {
    const raw = fs.existsSync(TESTIMONIALS_FILE) ? fs.readFileSync(TESTIMONIALS_FILE, 'utf8') : '[]';
    let list: VideoTestimonialSubmission[] = JSON.parse(raw);
    list = list.filter(t => t.id !== id);
    fs.writeFileSync(TESTIMONIALS_FILE, JSON.stringify(list, null, 2), 'utf8');
    return true;
  } catch {
    return false;
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
          tier: v.tier === 'suspended' ? 'pro' : (v.tier || 'pro'),
          status: v.status || (v.tier === 'suspended' ? 'suspended' : 'active'),
          partnerTier: v.partner_tier || 'regular',
          referralCode: v.referral_code || '',
          commissionRate: Number(v.commission_rate ?? 0.12),
          walletBalance: Number(v.wallet_balance ?? 0),
          totalEarnings: Number(v.total_earnings ?? 0),
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

async function resolveVendorLogoR2(vendorId: string, rawLogoUrl?: string | null): Promise<string> {
  if (!rawLogoUrl) return '';
  if (!rawLogoUrl.startsWith('data:image')) return rawLogoUrl;

  if (isR2Configured) {
    try {
      const matches = rawLogoUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
      const mimeType = matches ? `image/${matches[1]}` : 'image/png';
      const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
      const base64Data = matches ? matches[2] : rawLogoUrl.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const r2Key = `logos/vendor-${vendorId}-${Date.now()}.${ext}`;
      const r2Url = await uploadBufferToR2(buffer, r2Key, mimeType);
      if (r2Url) return r2Url;
    } catch (err) {
      console.warn('Vendor logo R2 upload fallback:', err);
    }
  }
  return rawLogoUrl;
}

async function syncVendorBrandingToEvents(
  vendorId: string,
  branding: { vendorLogo?: string; vendorName?: string; vendorInstagram?: string }
) {
  if (!vendorId) return;
  const normalizedTarget = vendorId.replace(/^v_/, 'vendor_');
  try {
    const allEvents = await getAllEvents();
    const matchingEvents = allEvents.filter(
      e => e.vendorId && (e.vendorId === vendorId || e.vendorId.replace(/^v_/, 'vendor_') === normalizedTarget)
    );
    for (const ev of matchingEvents) {
      const evUpdates: Partial<EventData> = {};
      if (branding.vendorLogo !== undefined && ev.vendorLogo !== branding.vendorLogo) {
        evUpdates.vendorLogo = branding.vendorLogo;
      }
      if (branding.vendorName !== undefined && ev.vendorName !== branding.vendorName) {
        evUpdates.vendorName = branding.vendorName;
      }
      if (branding.vendorInstagram !== undefined && ev.vendorInstagram !== branding.vendorInstagram) {
        evUpdates.vendorInstagram = branding.vendorInstagram;
      }
      if (Object.keys(evUpdates).length > 0) {
        await updateEvent(ev.id, evUpdates);
      }
    }
  } catch {}
}

export async function saveVendor(vendorData: any): Promise<any> {
  const vendorId = vendorData.id || `vendor_${Date.now()}`;
  let resolvedLogoUrl = vendorData.logoUrl || '';

  try {
    const existingVendors = await getAllVendors();
    const prevVendor = existingVendors.find(
      v => v.id === vendorId || v.id?.replace(/^v_/, 'vendor_') === String(vendorId).replace(/^v_/, 'vendor_')
    );
    if (resolvedLogoUrl && resolvedLogoUrl.startsWith('data:image')) {
      resolvedLogoUrl = await resolveVendorLogoR2(vendorId, resolvedLogoUrl);
    }
    await syncVendorBrandingToEvents(prevVendor?.id || vendorId, {
      vendorLogo: resolvedLogoUrl,
      vendorName: vendorData.companyName || vendorData.name,
      vendorInstagram: vendorData.instagram
    });
    if (prevVendor?.logoUrl && prevVendor.logoUrl !== resolvedLogoUrl) {
      await deleteFromR2(prevVendor.logoUrl);
    }
  } catch {}

  const newVendor = {
    ...vendorData,
    id: vendorId,
    status: vendorData.status || 'active',
    logoUrl: resolvedLogoUrl,
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
        tier: newVendor.status === 'suspended' ? 'suspended' : (newVendor.tier || 'pro'),
        partner_tier: newVendor.partnerTier || 'regular',
        referral_code: newVendor.referralCode || null,
        commission_rate: newVendor.commissionRate || 0.12,
        wallet_balance: newVendor.walletBalance || 0,
        total_earnings: newVendor.totalEarnings || 0,
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
  // Check if logoUrl/branding is being updated so linked events are synced and old R2 logo is cleaned up
  if (updates.logoUrl !== undefined || updates.companyName !== undefined || updates.instagram !== undefined) {
    try {
      if (updates.logoUrl && updates.logoUrl.startsWith('data:image')) {
        updates.logoUrl = await resolveVendorLogoR2(id, updates.logoUrl);
      }
      const existingVendors = await getAllVendors();
      const prevVendor = existingVendors.find(
        v => v.id === id || v.id?.replace(/^v_/, 'vendor_') === String(id).replace(/^v_/, 'vendor_')
      );
      await syncVendorBrandingToEvents(prevVendor?.id || id, {
        vendorLogo: updates.logoUrl,
        vendorName: updates.companyName,
        vendorInstagram: updates.instagram
      });
      if (updates.logoUrl !== undefined && prevVendor?.logoUrl && prevVendor.logoUrl !== updates.logoUrl) {
        await deleteFromR2(prevVendor.logoUrl);
      }
    } catch {}
  }

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
      if (updates.status !== undefined) {
        dbUpdates.tier = updates.status === 'suspended' ? 'suspended' : (updates.tier || 'pro');
      }
      if (updates.partnerTier !== undefined) dbUpdates.partner_tier = updates.partnerTier;
      if (updates.referralCode !== undefined) dbUpdates.referral_code = updates.referralCode;
      if (updates.commissionRate !== undefined) dbUpdates.commission_rate = updates.commissionRate;
      if (updates.walletBalance !== undefined) dbUpdates.wallet_balance = updates.walletBalance;
      if (updates.totalEarnings !== undefined) dbUpdates.total_earnings = updates.totalEarnings;
      if (updates.clientCount !== undefined) dbUpdates.client_count = updates.clientCount;
      if (updates.city !== undefined) dbUpdates.city = updates.city;
      if (updates.bankDetails) {
        if (updates.bankDetails.bankName) dbUpdates.bank_name = updates.bankDetails.bankName;
        if (updates.bankDetails.accountNumber) dbUpdates.bank_account_number = updates.bankDetails.accountNumber;
        if (updates.bankDetails.accountHolder) dbUpdates.bank_account_holder = updates.bankDetails.accountHolder;
      }

      const { data, error } = await supabase
        .from('vendors')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (!error && data) {
        const updatedVendor = {
          id: data.id,
          name: data.name,
          companyName: data.company_name || data.name,
          email: data.email,
          phone: data.phone || '',
          instagram: data.instagram || '',
          logoUrl: data.logo_url || '',
          tier: data.tier === 'suspended' ? 'pro' : (data.tier || 'pro'),
          status: updates.status || data.status || (data.tier === 'suspended' ? 'suspended' : 'active'),
          partnerTier: data.partner_tier || 'regular',
          referralCode: data.referral_code || '',
          commissionRate: Number(data.commission_rate ?? 0.12),
          walletBalance: Number(data.wallet_balance ?? 0),
          totalEarnings: Number(data.total_earnings ?? 0),
          bankDetails: {
            bankName: data.bank_name || 'BCA',
            accountNumber: data.bank_account_number || '',
            accountHolder: data.bank_account_holder || data.name
          },
          clientCount: Number(data.client_count ?? 0),
          city: data.city || '',
          createdAt: data.created_at,
          updatedAt: new Date().toISOString()
        };

        // Also sync local cache safely
        try {
          ensureLocalDataFiles();
          const raw = fs.existsSync(VENDORS_FILE) ? fs.readFileSync(VENDORS_FILE, 'utf8') : '[]';
          const vendors: any[] = JSON.parse(raw);
          const idx = vendors.findIndex(v => v.id === id);
          if (idx >= 0) {
            vendors[idx] = updatedVendor;
          } else {
            vendors.unshift(updatedVendor);
          }
          fs.writeFileSync(VENDORS_FILE, JSON.stringify(vendors, null, 2), 'utf8');
        } catch {}

        return updatedVendor;
      }
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
  try {
    const allVendors = await getAllVendors();
    const target = allVendors.find(v => v.id === id);
    if (target?.logoUrl) {
      await deleteFromR2(target.logoUrl);
    }
  } catch {}

  // 1. Try Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('vendors').delete().eq('id', id);
      if (!error) {
        // Also sync local cache safely
        ensureLocalDataFiles();
        try {
          const raw = fs.existsSync(VENDORS_FILE) ? fs.readFileSync(VENDORS_FILE, 'utf8') : '[]';
          let vendors: any[] = JSON.parse(raw);
          vendors = vendors.filter(v => v.id !== id);
          fs.writeFileSync(VENDORS_FILE, JSON.stringify(vendors, null, 2), 'utf8');
        } catch {}
        return true;
      }
    } catch (e) {
      console.warn('Supabase deleteVendor exception:', e);
    }
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
  let localList: EventAddonItem[] = [];
  try {
    ensureLocalDataFiles();
    const raw = fs.existsSync(ADDONS_FILE) ? fs.readFileSync(ADDONS_FILE, 'utf8') : '[]';
    localList = JSON.parse(raw);
  } catch {}

  // 1. Try Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('addons')
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        return data.map(row => {
          const localMatch = localList.find(a => a.id === row.id);
          return {
            id: row.id,
            name: row.name,
            category: row.category,
            description: row.description || '',
            price: Number(row.price),
            priceFormatted: `Rp ${Number(row.price).toLocaleString('id-ID')}`,
            costPrice: row.cost_price !== undefined && row.cost_price !== null
              ? Number(row.cost_price)
              : localMatch?.costPrice,
            imagePreviewUrl: row.image_preview_url || row.image_url || undefined,
            isActive: row.is_active !== undefined && row.is_active !== null
              ? row.is_active !== false
              : (localMatch?.isActive !== undefined ? localMatch.isActive : true),
            freeShippingJabodetabek: row.free_shipping_jabodetabek !== false,
            unit: row.unit || '1 set',
            isPopular: row.is_popular || false,
            createdAt: row.created_at
          };
        });
      }
    } catch (e) {
      console.warn('Supabase getAllAddons fallback:', e);
    }
  }

  // 2. Local fallback
  return localList;
}

export async function saveAddon(addon: EventAddonItem): Promise<EventAddonItem> {
  const addonId = addon.id || `addon_${Date.now()}`;
  let resolvedImageUrl = addon.imagePreviewUrl;

  try {
    const existingAddons = await getAllAddons();
    const prevAddon = existingAddons.find(a => a.id === addonId);
    if (resolvedImageUrl && resolvedImageUrl.startsWith('data:image/') && isR2Configured) {
      const matches = resolvedImageUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const mime = matches[1];
        const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
        const buffer = Buffer.from(matches[2], 'base64');
        const r2Url = await uploadBufferToR2(buffer, `addons/${addonId}-${Date.now()}.${ext}`, mime);
        if (r2Url) {
          resolvedImageUrl = r2Url;
        }
      }
    }
    if (prevAddon?.imagePreviewUrl && prevAddon.imagePreviewUrl !== resolvedImageUrl) {
      await deleteFromR2(prevAddon.imagePreviewUrl);
    }
  } catch (e) {
    console.warn('R2 addon image upload/cleanup failed, keeping fallback:', e);
  }

  const newAddon: EventAddonItem = {
    ...addon,
    id: addonId,
    imagePreviewUrl: resolvedImageUrl,
    priceFormatted: `Rp ${Number(addon.price).toLocaleString('id-ID')}`,
    createdAt: addon.createdAt || new Date().toISOString()
  };

  // 1. Try Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      const record: Record<string, any> = {
        id: newAddon.id,
        name: newAddon.name,
        category: newAddon.category,
        description: newAddon.description || null,
        price: newAddon.price,
        cost_price: newAddon.costPrice ?? null,
        is_active: newAddon.isActive !== false,
        image_preview_url: newAddon.imagePreviewUrl || null,
        free_shipping_jabodetabek: newAddon.freeShippingJabodetabek !== false,
        unit: newAddon.unit || '1 set',
        is_popular: newAddon.isPopular || false
      };

      let { data, error } = await supabase.from('addons').upsert(record).select().maybeSingle();
      if (error && (error.message?.includes('cost_price') || error.message?.includes('is_active') || error.code === 'PGRST204')) {
        const { cost_price: _cp, is_active: _ia, ...fallbackRecord } = record;
        const retry = await supabase.from('addons').upsert(fallbackRecord).select().maybeSingle();
        data = retry.data;
        error = retry.error;
      }

      if (!error && data) {
        const savedItem: EventAddonItem = {
          id: data.id,
          name: data.name,
          category: data.category,
          description: data.description || '',
          price: Number(data.price),
          priceFormatted: `Rp ${Number(data.price).toLocaleString('id-ID')}`,
          costPrice: data.cost_price !== undefined && data.cost_price !== null ? Number(data.cost_price) : newAddon.costPrice,
          imagePreviewUrl: data.image_preview_url || data.image_url || undefined,
          isActive: data.is_active !== undefined && data.is_active !== null ? data.is_active !== false : (newAddon.isActive !== false),
          freeShippingJabodetabek: data.free_shipping_jabodetabek !== false,
          unit: data.unit || '1 set',
          isPopular: data.is_popular || false,
          createdAt: data.created_at
        };

        // Also sync local cache safely
        try {
          ensureLocalDataFiles();
          const raw = fs.existsSync(ADDONS_FILE) ? fs.readFileSync(ADDONS_FILE, 'utf8') : '[]';
          const list: EventAddonItem[] = JSON.parse(raw);
          const existingIdx = list.findIndex(a => a.id === data.id);
          if (existingIdx >= 0) list[existingIdx] = savedItem;
          else list.push(savedItem);
          fs.writeFileSync(ADDONS_FILE, JSON.stringify(list, null, 2), 'utf8');
        } catch {}

        return savedItem;
      }
      if (error) {
        console.warn('Supabase saveAddon error, falling back to local:', error.message);
      }
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
  let existingAddon: EventAddonItem | undefined;
  try {
    const allAddons = await getAllAddons();
    existingAddon = allAddons.find(a => a.id === id);
    if (updates.imagePreviewUrl !== undefined) {
      if (updates.imagePreviewUrl && updates.imagePreviewUrl.startsWith('data:image/') && isR2Configured) {
        const matches = updates.imagePreviewUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const mime = matches[1];
          const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
          const buffer = Buffer.from(matches[2], 'base64');
          const r2Url = await uploadBufferToR2(buffer, `addons/${id}-${Date.now()}.${ext}`, mime);
          if (r2Url) {
            updates.imagePreviewUrl = r2Url;
          }
        }
      }
      if (existingAddon?.imagePreviewUrl && existingAddon.imagePreviewUrl !== updates.imagePreviewUrl) {
        await deleteFromR2(existingAddon.imagePreviewUrl);
      }
    }
  } catch {}

  // 1. Try Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      const dbUpdates: Record<string, any> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.category !== undefined) dbUpdates.category = updates.category;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.price !== undefined) dbUpdates.price = updates.price;
      if (updates.costPrice !== undefined) dbUpdates.cost_price = updates.costPrice;
      if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
      if (updates.imagePreviewUrl !== undefined) dbUpdates.image_preview_url = updates.imagePreviewUrl || null;
      if (updates.freeShippingJabodetabek !== undefined) dbUpdates.free_shipping_jabodetabek = updates.freeShippingJabodetabek;
      if (updates.unit !== undefined) dbUpdates.unit = updates.unit;
      if (updates.isPopular !== undefined) dbUpdates.is_popular = updates.isPopular;

      let { data, error } = await supabase.from('addons').update(dbUpdates).eq('id', id).select().maybeSingle();
      if (error && (error.message?.includes('cost_price') || error.message?.includes('is_active') || error.code === 'PGRST204')) {
        const { cost_price: _cp, is_active: _ia, ...fallbackUpdates } = dbUpdates;
        if (Object.keys(fallbackUpdates).length > 0) {
          const retry = await supabase.from('addons').update(fallbackUpdates).eq('id', id).select().maybeSingle();
          data = retry.data;
          error = retry.error;
        }
      }
      if (!error && data) {
        const updated: EventAddonItem = {
          id: data.id,
          name: data.name,
          category: data.category,
          description: data.description || '',
          price: Number(data.price),
          priceFormatted: `Rp ${Number(data.price).toLocaleString('id-ID')}`,
          costPrice: updates.costPrice !== undefined
            ? updates.costPrice
            : (data.cost_price !== undefined && data.cost_price !== null ? Number(data.cost_price) : existingAddon?.costPrice),
          imagePreviewUrl: data.image_preview_url || data.image_url || undefined,
          isActive: updates.isActive !== undefined
            ? updates.isActive
            : (data.is_active !== undefined && data.is_active !== null ? data.is_active !== false : (existingAddon?.isActive ?? true)),
          freeShippingJabodetabek: data.free_shipping_jabodetabek !== false,
          unit: data.unit || '1 set',
          isPopular: data.is_popular || false,
          createdAt: data.created_at
        };

        // Also sync local cache safely
        try {
          ensureLocalDataFiles();
          const raw = fs.existsSync(ADDONS_FILE) ? fs.readFileSync(ADDONS_FILE, 'utf8') : '[]';
          const list: EventAddonItem[] = JSON.parse(raw);
          const idx = list.findIndex(a => a.id === id);
          if (idx >= 0) {
            list[idx] = updated;
          } else {
            list.push(updated);
          }
          fs.writeFileSync(ADDONS_FILE, JSON.stringify(list, null, 2), 'utf8');
        } catch {}

        return updated;
      }
      if (error) {
        console.warn('Supabase updateAddon error, falling back to local:', error.message);
      }
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
  try {
    const allAddons = await getAllAddons();
    const target = allAddons.find(a => a.id === id);
    if (target?.imagePreviewUrl) {
      await deleteFromR2(target.imagePreviewUrl);
    }
  } catch {}

  // 1. Try Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('addons').delete().eq('id', id);
      if (!error) {
        // Also sync local cache safely
        try {
          ensureLocalDataFiles();
          const raw = fs.existsSync(ADDONS_FILE) ? fs.readFileSync(ADDONS_FILE, 'utf8') : '[]';
          let list: EventAddonItem[] = JSON.parse(raw);
          list = list.filter(a => a.id !== id);
          fs.writeFileSync(ADDONS_FILE, JSON.stringify(list, null, 2), 'utf8');
        } catch {}
        return true;
      }
    } catch (e) {
      console.warn('Supabase deleteAddon error:', e);
    }
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
  // Clean up media file from R2, Supabase Storage, or local uploads
  try {
    const all = await getVideoWishes();
    const target = all.find(w => w.id === id);
    if (target?.videoUrl) {
      await deleteFromR2(target.videoUrl);
      if (isSupabaseConfigured && supabase && target.videoUrl.includes('/videos/')) {
        try {
          const pathPart = target.videoUrl.split('/videos/')[1];
          if (pathPart) await supabase.storage.from('videos').remove([pathPart]);
        } catch {}
      }
      if (target.videoUrl.startsWith('/uploads/')) {
        try {
          const localPath = path.join(process.cwd(), 'public', target.videoUrl.replace(/^\//, ''));
          if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
        } catch {}
      }
    }
    if (target?.thumbnailUrl) {
      await deleteFromR2(target.thumbnailUrl);
    }
  } catch {}

  // 1. Try Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('video_wishes').delete().eq('id', id);
      if (!error) {
        // Also sync local cache safely
        ensureLocalDataFiles();
        try {
          const raw = fs.existsSync(VIDEO_WISHES_FILE) ? fs.readFileSync(VIDEO_WISHES_FILE, 'utf8') : '[]';
          let list: VideoWishRecord[] = JSON.parse(raw);
          list = list.filter(w => w.id !== id);
          fs.writeFileSync(VIDEO_WISHES_FILE, JSON.stringify(list, null, 2), 'utf8');
        } catch {}
        return true;
      }
    } catch (e) {
      console.warn('Supabase deleteVideoWish exception:', e);
    }
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

// ==========================================
// PAYMENT WEBHOOK IDEMPOTENCY ENGINE
// ==========================================

export async function isWebhookProcessed(txId: string): Promise<boolean> {
  if (!txId) return false;
  const canonicalId = txId.startsWith('tx_') ? txId : `tx_${txId}`;

  // 1. Check Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('id')
        .or(`id.eq.${canonicalId},id.eq.${txId}`)
        .maybeSingle();
      if (!error && data) {
        return true;
      }
    } catch (e) {
      // Fall through to local cache
    }
  }

  // 2. Check Local File
  try {
    ensureLocalDataFiles();
    if (fs.existsSync(PROCESSED_WEBHOOKS_FILE)) {
      const raw = fs.readFileSync(PROCESSED_WEBHOOKS_FILE, 'utf8');
      const list: string[] = JSON.parse(raw);
      if (list.includes(canonicalId) || list.includes(txId)) {
        return true;
      }
    }
  } catch (err) {
    console.warn('isWebhookProcessed read error:', err);
  }

  return false;
}

export async function markWebhookProcessed(txId: string, details?: any): Promise<void> {
  if (!txId) return;
  const canonicalId = txId.startsWith('tx_') ? txId : `tx_${txId}`;

  // 1. Supabase (upsert into payment_transactions)
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('payment_transactions').upsert({
        id: canonicalId,
        provider: details?.provider || 'mayar',
        amount: details?.amount || 0,
        customer_name: details?.customer_name || null,
        customer_email: details?.customer_email || null,
        status: 'PAID',
        description: details?.description || null,
        event_id: details?.event_id || null,
        created_at: new Date().toISOString()
      }, { onConflict: 'id' });
    } catch (e) {
      console.warn('markWebhookProcessed supabase warning:', e);
    }
  }

  // 2. Local File
  try {
    ensureLocalDataFiles();
    let list: string[] = [];
    if (fs.existsSync(PROCESSED_WEBHOOKS_FILE)) {
      list = JSON.parse(fs.readFileSync(PROCESSED_WEBHOOKS_FILE, 'utf8'));
    }
    if (!list.includes(canonicalId)) {
      list.push(canonicalId);
      // Keep to last 5000 IDs to avoid unbounded growth
      if (list.length > 5000) list = list.slice(-5000);
      fs.writeFileSync(PROCESSED_WEBHOOKS_FILE, JSON.stringify(list, null, 2), 'utf8');
    }
  } catch (err) {
    console.warn('markWebhookProcessed local write error:', err);
  }
}





