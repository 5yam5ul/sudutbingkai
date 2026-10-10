import fs from 'fs';
import path from 'path';
import { EventData, PhotoRecord } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');
const PHOTOS_FILE = path.join(DATA_DIR, 'photos.json');
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  if (!fs.existsSync(EVENTS_FILE)) {
    const sampleEvent: EventData = {
      id: 'demo-nikahan',
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
  } else {
    // Run migration if any photos still store raw base64 data
    migrateBase64Photos();
  }
}

/**
 * Extracts base64 image data to physical JPEG files in /public/uploads/
 * to keep photos.json lightweight, fast, and prevent memory leaks.
 */
function saveImageToFile(photoId: string, base64OrPath: string): string {
  if (!base64OrPath) return '';
  if (!base64OrPath.startsWith('data:image')) {
    return base64OrPath; // Already a file path or URL
  }

  try {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }

    const matches = base64OrPath.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
    const extension = matches && matches[1] === 'png' ? 'png' : 'jpg';
    const base64Data = matches ? matches[2] : base64OrPath.replace(/^data:image\/\w+;base64,/, '');

    const fileName = `${photoId}.${extension}`;
    const filePath = path.join(UPLOADS_DIR, fileName);
    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

    return `/uploads/${fileName}`;
  } catch (err) {
    console.error('Failed to save image to file:', err);
    return base64OrPath; // Fallback
  }
}

function migrateBase64Photos() {
  try {
    const raw = fs.readFileSync(PHOTOS_FILE, 'utf8');
    const photos: PhotoRecord[] = JSON.parse(raw);
    let changed = false;

    for (const photo of photos) {
      if (photo.imageData && photo.imageData.startsWith('data:image')) {
        photo.imageData = saveImageToFile(photo.id, photo.imageData);
        changed = true;
      }
    }

    if (changed) {
      fs.writeFileSync(PHOTOS_FILE, JSON.stringify(photos, null, 2), 'utf8');
    }
  } catch {
    // Ignore migration read errors
  }
}

export function getAllEvents(): EventData[] {
  ensureDataFiles();
  try {
    const raw = fs.readFileSync(EVENTS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function getEventById(id: string): EventData | null {
  const events = getAllEvents();
  return events.find(e => e.id === id) || null;
}

export function saveEvent(event: EventData): EventData {
  ensureDataFiles();
  const events = getAllEvents();
  const existingIdx = events.findIndex(e => e.id === event.id);
  if (existingIdx >= 0) {
    events[existingIdx] = { ...events[existingIdx], ...event };
  } else {
    events.unshift(event);
  }
  fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2), 'utf8');
  return event;
}

export function updateEvent(id: string, updates: Partial<EventData>): EventData | null {
  ensureDataFiles();
  const events = getAllEvents();
  const existingIdx = events.findIndex(e => e.id === id);
  if (existingIdx < 0) return null;

  events[existingIdx] = { ...events[existingIdx], ...updates };
  fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2), 'utf8');
  return events[existingIdx];
}

export function getAllPhotos(eventId?: string, includeHidden: boolean = false): PhotoRecord[] {
  ensureDataFiles();
  try {
    const raw = fs.readFileSync(PHOTOS_FILE, 'utf8');
    let photos: PhotoRecord[] = JSON.parse(raw);
    if (eventId) {
      photos = photos.filter(p => p.eventId === eventId);
    }
    if (!includeHidden) {
      photos = photos.filter(p => !p.isHidden);
    }
    return photos;
  } catch {
    return [];
  }
}

export function getPhotoById(id: string): PhotoRecord | null {
  ensureDataFiles();
  try {
    const raw = fs.readFileSync(PHOTOS_FILE, 'utf8');
    const photos: PhotoRecord[] = JSON.parse(raw);
    return photos.find(p => p.id === id) || null;
  } catch {
    return null;
  }
}

export function savePhoto(photo: PhotoRecord): PhotoRecord {
  ensureDataFiles();

  // Convert raw base64 data to physical file
  if (photo.imageData && photo.imageData.startsWith('data:image')) {
    photo.imageData = saveImageToFile(photo.id, photo.imageData);
  }

  const raw = fs.readFileSync(PHOTOS_FILE, 'utf8');
  const photos: PhotoRecord[] = JSON.parse(raw);
  photos.unshift(photo);
  fs.writeFileSync(PHOTOS_FILE, JSON.stringify(photos, null, 2), 'utf8');
  return photo;
}

export function updatePhoto(id: string, updates: Partial<PhotoRecord>): PhotoRecord | null {
  ensureDataFiles();
  try {
    const raw = fs.readFileSync(PHOTOS_FILE, 'utf8');
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

export function deletePhoto(id: string): boolean {
  ensureDataFiles();
  try {
    const raw = fs.readFileSync(PHOTOS_FILE, 'utf8');
    let photos: PhotoRecord[] = JSON.parse(raw);
    const target = photos.find(p => p.id === id);
    if (!target) return false;

    // Delete physical file if present
    if (target.imageData && target.imageData.startsWith('/uploads/')) {
      const filePath = path.join(process.cwd(), 'public', target.imageData.replace(/^\//, ''));
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch {}
      }
    }

    photos = photos.filter(p => p.id !== id);
    fs.writeFileSync(PHOTOS_FILE, JSON.stringify(photos, null, 2), 'utf8');
    return true;
  } catch {
    return false;
  }
}
