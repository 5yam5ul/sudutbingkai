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
 * Delete an object from Cloudflare R2 bucket
 */
export async function deleteFromR2(key: string): Promise<boolean> {
  if (!r2Client) return false;

  try {
    const command = new DeleteObjectCommand({
      Bucket: r2BucketName,
      Key: key,
    });
    await r2Client.send(command);
    return true;
  } catch (error) {
    console.error('R2 delete failed:', error);
    return false;
  }
}
