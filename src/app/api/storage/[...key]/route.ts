import { NextResponse } from 'next/server';
import { downloadFromR2 } from '@/lib/r2';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ key: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const keyArray = resolvedParams?.key || [];
    const objectKey = keyArray.join('/');

    if (!objectKey) {
      return new NextResponse('Key not specified', { status: 400 });
    }

    const data = await downloadFromR2(objectKey);
    if (!data) {
      return new NextResponse('File not found in storage', { status: 404 });
    }

    return new NextResponse(new Uint8Array(data.buffer), {
      status: 200,
      headers: {
        'Content-Type': data.contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: unknown) {
    console.error('Storage proxy error:', err);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
