import { NextResponse } from 'next/server';

interface CachedDriveResponse {
  timestamp: number;
  data: {
    folders: Array<{ id: string; name: string }>;
    photos: Array<{ id: string; name: string; url: string; fullUrl: string }>;
    nextPageToken?: string;
  };
}

// In-memory 10-minute cache per folder query
const driveCache = new Map<string, CachedDriveResponse>();
const CACHE_TTL_MS = 10 * 60 * 1000;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawFolder = searchParams.get('folderId');
    const pageToken = searchParams.get('pageToken') || '';

    if (!rawFolder) {
      return NextResponse.json({ success: false, error: 'folderId diperlukan' }, { status: 400 });
    }

    // Extract clean folder ID from link or ID
    let folderId = rawFolder.trim();
    const folderMatch = folderId.match(/folders\/([a-zA-Z0-9-_]+)/);
    if (folderMatch && folderMatch[1]) {
      folderId = folderMatch[1];
    } else {
      const idMatch = folderId.match(/id=([a-zA-Z0-9-_]+)/);
      if (idMatch && idMatch[1]) {
        folderId = idMatch[1];
      }
    }

    const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'GOOGLE_DRIVE_API_KEY belum dikonfigurasi di server'
      }, { status: 500 });
    }

    const cacheKey = `${folderId}_${pageToken}`;
    const cached = driveCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
      return NextResponse.json({ success: true, ...cached.data, fromCache: true });
    }

    const query = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
    let apiUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=nextPageToken,files(id,name,mimeType,thumbnailLink)&pageSize=1000&key=${apiKey}`;
    if (pageToken) {
      apiUrl += `&pageToken=${encodeURIComponent(pageToken)}`;
    }

    const res = await fetch(apiUrl);
    const data = await res.json();

    if (!res.ok || data.error) {
      console.warn('Google Drive API error:', data.error?.message);
      return NextResponse.json({
        success: false,
        error: data.error?.message || 'Gagal mengakses folder Google Drive. Pastikan izin folder disetel ke "Siapa saja yang memiliki link dapat melihat".'
      }, { status: res.status >= 400 ? res.status : 502 });
    }

    const rawFiles = data.files || [];
    const folders = rawFiles
      .filter((f: any) => f.mimeType === 'application/vnd.google-apps.folder')
      .map((f: any) => ({
        id: f.id,
        name: f.name
      }));

    // Filter media items that have thumbnail links
    const photos = rawFiles
      .filter((f: any) => f.mimeType !== 'application/vnd.google-apps.folder' && f.thumbnailLink)
      .map((f: any) => ({
        id: f.id,
        name: f.name,
        // High efficiency 500px for grid view
        url: f.thumbnailLink ? f.thumbnailLink.replace('=s220', '=s500') : '',
        // Master QHD 1600px for lightbox inspection
        fullUrl: f.thumbnailLink ? f.thumbnailLink.replace('=s220', '=s1600') : ''
      }));

    const responsePayload = {
      folders,
      photos,
      nextPageToken: data.nextPageToken || undefined
    };

    driveCache.set(cacheKey, {
      timestamp: Date.now(),
      data: responsePayload
    });

    return NextResponse.json({
      success: true,
      ...responsePayload
    });
  } catch (err: any) {
    console.error('API /proofing/drive exception:', err);
    return NextResponse.json({
      success: false,
      error: err?.message || 'Internal server error saat mengambil Google Drive'
    }, { status: 500 });
  }
}
