/**
 * IndexedDB offline queue manager for storing captured photos when network is lost.
 * Automatically synchronizes with server when network recovers.
 */

const DB_NAME = 'sudutbingkai_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'photos_queue';

export interface OfflinePhotoPayload {
  id: string;
  eventId: string;
  guestName: string;
  shotNumber: number;
  imageData: string; // base64
  caption?: string;
  aspectRatio?: '1:1' | '3:4' | '9:16';
  frameId?: string;
  createdAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function addPhotoToOfflineQueue(photo: OfflinePhotoPayload): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(photo);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to add to IndexedDB offline queue:', err);
  }
}

export async function getOfflinePhotosQueue(eventId?: string): Promise<OfflinePhotoPayload[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const results: OfflinePhotoPayload[] = req.result || [];
        if (eventId) {
          resolve(results.filter(p => p.eventId === eventId));
        } else {
          resolve(results);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function removeOfflinePhoto(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to remove from offline queue:', err);
  }
}

/**
 * Flush all offline photos to the server when network is restored.
 */
export async function flushOfflineQueue(
  onPhotoSynced?: (synced: OfflinePhotoPayload) => void
): Promise<number> {
  if (typeof window === 'undefined' || !navigator.onLine) return 0;

  const queue = await getOfflinePhotosQueue();
  if (queue.length === 0) return 0;

  let successCount = 0;

  for (const item of queue) {
    try {
      const res = await fetch('/api/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: item.eventId,
          guestName: item.guestName,
          shotNumber: item.shotNumber,
          imageData: item.imageData,
          caption: item.caption,
          aspectRatio: item.aspectRatio,
          frameId: item.frameId
        })
      });

      const data = await res.json();
      if (data.success) {
        await removeOfflinePhoto(item.id);
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
