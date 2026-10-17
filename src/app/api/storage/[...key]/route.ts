import { getR2ObjectStream } from '@/lib/r2';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Only expose the folders the app actually writes to (prevents arbitrary bucket reads).
const ALLOWED_PREFIXES = ['events/', 'covers/', 'frames/', 'voices/', 'logos/', 'proofs/', 'addons/', 'testimonials/', 'general/'];

async function handle(request: Request, params: Promise<{ key: string[] }>, headOnly: boolean) {
  const { key = [] } = await params;
  const objectKey = key.map(decodeURIComponent).join('/');

  if (!objectKey || objectKey.includes('..') || !ALLOWED_PREFIXES.some(p => objectKey.startsWith(p))) {
    return new Response('Not found', { status: 404 });
  }

  const range = request.headers.get('range');
  const obj = await getR2ObjectStream(objectKey, range);
  if (!obj) {
    return new Response('File not found in storage', { status: 404 });
  }

  const headers = new Headers({
    'Content-Type': obj.contentType,
    // Objects are immutable (unique keys) -> let browsers AND the Vercel CDN cache them,
    // so each photo is pulled from R2 through the function only once.
    'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
    'Accept-Ranges': 'bytes',
    'Access-Control-Allow-Origin': '*',
    'X-Content-Type-Options': 'nosniff',
  });
  if (obj.contentLength !== undefined) headers.set('Content-Length', String(obj.contentLength));
  if (obj.contentRange) headers.set('Content-Range', obj.contentRange);
  if (obj.etag) headers.set('ETag', obj.etag);

  if (headOnly) {
    try { await obj.body.cancel(); } catch {}
    return new Response(null, { status: obj.isPartial ? 206 : 200, headers });
  }
  return new Response(obj.body, { status: obj.isPartial ? 206 : 200, headers });
}

export async function GET(request: Request, ctx: { params: Promise<{ key: string[] }> }) {
  try {
    return await handle(request, ctx.params, false);
  } catch (err) {
    console.error('Storage proxy error:', err);
    return new Response('Internal server error', { status: 500 });
  }
}

export async function HEAD(request: Request, ctx: { params: Promise<{ key: string[] }> }) {
  try {
    return await handle(request, ctx.params, true);
  } catch {
    return new Response(null, { status: 500 });
  }
}
