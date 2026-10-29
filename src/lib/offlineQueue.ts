/**
 * Dexie.js offline queue manager for storing captured photos when network is lost.
 * Automatically synchronizes with server when network recovers.
 */

import Dexie, { Table } from 'dexie';

export interface OfflinePhotoPayload {
  id: string;
  eventId: string;
  sessionId?: string;
  guestName: string;
  shotNumber: number;
  imageData: string; // base64
  caption?: string;
  aspectRatio?: '1:1' | '3:4' | '9:16';
  frameId?: string;
  deviceId?: string;
  createdAt: number;
}

class SudutBingkaiOfflineDB extends Dexie {
  photosQueue!: Table<OfflinePhotoPayload, string>;

  constructor() {
    super('sudutbingkai_offline_db');
    this.version(1).stores({
      photos_queue: 'id, eventId, createdAt, sessionId'
    });
  }
}

export const offlineDb = new SudutBingkaiOfflineDB();

export async function addPhotoToOfflineQueue(photo: OfflinePhotoPayload): Promise<void> {
  try {
    await offlineDb.photosQueue.put(photo);
  } catch (err) {
    console.warn('Failed to add to Dexie offline queue:', err);
  }
}

export async function getOfflinePhotosQueue(eventId?: string, altEventId?: string): Promise<OfflinePhotoPayload[]> {
  try {
    if (eventId) {
      const items = await offlineDb.photosQueue
        .filter(p => p.eventId === eventId || (altEventId !== undefined && p.eventId === altEventId))
        .toArray();
      return items;
    }
    return await offlineDb.photosQueue.toArray();
  } catch {
    return [];
  }
}

export async function removeOfflinePhoto(id: string): Promise<void> {
  try {
    await offlineDb.photosQueue.delete(id);
  } catch (err) {
    console.warn('Failed to remove from Dexie offline queue:', err);
  }
}

/**
 * Flush all offline photos to the server when network is restored.
 */
export async function flushOfflineQueue(
  onPhotoSynced?: (synced: OfflinePhotoPayload) => void
): Promise<number> {
  if (typeof window === 'undefined' || !navigator.onLine) return 0;

  let queue: OfflinePhotoPayload[] = [];
  try {
    queue = await offlineDb.photosQueue.toArray();
  } catch {
    return 0;
  }

  if (queue.length === 0) return 0;

  let successCount = 0;

  for (const item of queue) {
    try {
      const res = await fetch('/api/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: item.eventId,
          sessionId: item.sessionId,
          guestName: item.guestName,
          shotNumber: item.shotNumber,
          imageData: item.imageData,
          caption: item.caption,
          aspectRatio: item.aspectRatio,
          frameId: item.frameId,
          deviceId: item.deviceId
        })
      });

      const data = await res.json();
      if (data.success) {
        await offlineDb.photosQueue.delete(item.id);
        successCount++;
        onPhotoSynced?.(item);
      }
    } catch (err) {
      console.warn('Sync failed for item, will retry on next connection:', item.id, err);
      break; // Stop loop if network drops again
    }
  }

  return successCount;
}
