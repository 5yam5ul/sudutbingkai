import Dexie, { Table } from 'dexie';

export interface QueuedPhoto {
  id?: number;
  eventId: string;
  imageData: string; // Base64 or Blob URL
  guestName: string;
  shotNumber: number;
  caption?: string;
  timestamp: string;
  sessionId?: string;
  synced: number; // 0 = pending, 1 = synced
  retryCount: number;
}

export class OfflinePhotoDatabase extends Dexie {
  queuedPhotos!: Table<QueuedPhoto, number>;

  constructor() {
    super('SudutBingkaiOfflineDB');
    this.version(1).stores({
      queuedPhotos: '++id, eventId, synced, timestamp'
    });
  }
}

export const offlineDb = new OfflinePhotoDatabase();

/**
 * Simpan foto ke IndexedDB lokal jika offline / gagal koneksi
 */
export async function savePhotoToOfflineQueue(photo: Omit<QueuedPhoto, 'id' | 'synced' | 'retryCount'>): Promise<number> {
  return await offlineDb.queuedPhotos.add({
    ...photo,
    synced: 0,
    retryCount: 0
  });
}

/**
 * Ambil jumlah foto yang masih menunggu sinkronisasi (pending upload)
 */
export async function getPendingPhotoCount(eventId?: string): Promise<number> {
  try {
    if (eventId) {
      return await offlineDb.queuedPhotos.where({ eventId, synced: 0 }).count();
    }
    return await offlineDb.queuedPhotos.where('synced').equals(0).count();
  } catch {
    return 0;
  }
}

/**
 * Sinkronisasi antrean foto lokal ke server /api/photos
 */
export async function syncOfflinePhotos(
  onSuccess?: (item: QueuedPhoto) => void,
  onError?: (item: QueuedPhoto, error: any) => void
): Promise<{ syncedCount: number; failedCount: number }> {
  if (typeof window === 'undefined' || !navigator.onLine) {
    return { syncedCount: 0, failedCount: 0 };
  }

  let syncedCount = 0;
  let failedCount = 0;

  try {
    const pendingPhotos = await offlineDb.queuedPhotos.where('synced').equals(0).toArray();
    if (pendingPhotos.length === 0) return { syncedCount: 0, failedCount: 0 };

    for (const item of pendingPhotos) {
      try {
        const res = await fetch('/api/photos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId: item.eventId,
            imageData: item.imageData,
            guestName: item.guestName,
            shotNumber: item.shotNumber,
            caption: item.caption,
            sessionId: item.sessionId
          })
        });

        const data = await res.json();
        if (data.success) {
          await offlineDb.queuedPhotos.delete(item.id!);
          syncedCount++;
          if (onSuccess) onSuccess(item);
        } else {
          // Increment retry count
          await offlineDb.queuedPhotos.update(item.id!, {
            retryCount: (item.retryCount || 0) + 1
          });
          failedCount++;
          if (onError) onError(item, data.error);
        }
      } catch (uploadErr) {
        await offlineDb.queuedPhotos.update(item.id!, {
          retryCount: (item.retryCount || 0) + 1
        });
        failedCount++;
        if (onError) onError(item, uploadErr);
        // Jika putus jaringan saat looping, hentikan sementara
        if (!navigator.onLine) break;
      }
    }
  } catch (err) {
    console.warn('Gagal membaca antrean offline IndexedDB:', err);
  }

  return { syncedCount, failedCount };
}
