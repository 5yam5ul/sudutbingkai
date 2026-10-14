import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const r2AccountId = process.env.R2_ACCOUNT_ID || '';
const r2AccessKey = process.env.R2_ACCESS_KEY_ID || '';
const r2SecretKey = process.env.R2_SECRET_ACCESS_KEY || '';
const r2BucketName = process.env.R2_BUCKET_NAME || 'sudutbingkai-storage';
const r2PublicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || '';

export const isR2Configured = Boolean(
  r2AccountId &&
  r2AccessKey &&
  r2SecretKey &&
  r2BucketName
);

export const r2Client = isR2Configured
  ? new S3Client({
      region: 'auto',
      endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: r2AccessKey,
        secretAccessKey: r2SecretKey,
      },
    })
  : null;

/**
 * Upload a binary buffer (image or audio) directly to Cloudflare R2 bucket.
 * Returns the public URL of the uploaded asset if public URL is configured.
 */
export async function uploadBufferToR2(
  buffer: Buffer,
  key: string,
  contentType: string = 'image/jpeg'
): Promise<string | null> {
  if (!r2Client) {
    console.warn('R2 Client is not configured. Skipping R2 upload.');
    return null;
  }

  try {
    const command = new PutObjectCommand({
      Bucket: r2BucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    });

    await r2Client.send(command);

    const activePublicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || process.env.R2_PUBLIC_URL || r2PublicUrl;
    if (activePublicUrl) {
      const cleanBase = activePublicUrl.replace(/\/+$/, '');
      const cleanKey = key.replace(/^\/+/, '');
      return `${cleanBase}/${cleanKey}`;
    }

    return `https://${r2BucketName}.${r2AccountId}.r2.cloudflarestorage.com/${key}`;
  } catch (error) {
    console.error('R2 upload failed:', error);
    return null;
  }
}

/**
 * Extract the canonical R2 object key from a public URL or storage path
 */
export function extractR2KeyFromUrl(urlOrKey?: string | null): string | null {
  if (!urlOrKey || typeof urlOrKey !== 'string') return null;
  const trimmed = urlOrKey.trim();
  if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('/uploads/')) return null;

  // If it's already a relative R2 key
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return trimmed.replace(/^\/+/, '');
  }

  try {
    const activePublicUrl = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL || process.env.R2_PUBLIC_URL || r2PublicUrl || '').replace(/\/+$/, '');
    if (activePublicUrl && trimmed.startsWith(activePublicUrl)) {
      return trimmed.substring(activePublicUrl.length).replace(/^\/+/, '');
    }

    const urlObj = new URL(trimmed);
    const host = urlObj.hostname.toLowerCase();
    const pathname = urlObj.pathname.replace(/^\/+/, '');

    // Match R2 custom domains, .r2.dev, .r2.cloudflarestorage.com, or standard SudutBingkai key prefixes
    if (
      host.includes('.r2.dev') ||
      host.includes('r2.cloudflarestorage.com') ||
      pathname.startsWith('events/') ||
      pathname.startsWith('voices/') ||
      pathname.startsWith('videos/')
    ) {
      // Avoid deleting Supabase storage URLs (which contain /storage/v1/object/public/)
      if (pathname.includes('storage/v1/object/')) return null;
      return pathname;
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Delete an object from Cloudflare R2 bucket (accepts either a raw R2 key or a full R2 public URL)
 */
export async function deleteFromR2(keyOrUrl: string): Promise<boolean> {
  if (!r2Client) return false;
  const resolvedKey = extractR2KeyFromUrl(keyOrUrl);
  if (!resolvedKey) return false;

  try {
    const command = new DeleteObjectCommand({
      Bucket: r2BucketName,
      Key: resolvedKey,
    });
    await r2Client.send(command);
    return true;
  } catch (error) {
    console.error('R2 delete failed:', error);
    return false;
  }
}

