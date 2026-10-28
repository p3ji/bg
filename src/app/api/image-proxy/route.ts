import { NextRequest, NextResponse } from 'next/server';
import { allowedCoverUrl, fetchCoverImage } from '@/lib/imageProxy';

export async function GET(request: NextRequest) {
  const value = request.nextUrl.searchParams.get('url');
  if (!value) return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  let url: URL;
  try { url = allowedCoverUrl(value); }
  catch { return NextResponse.json({ error: 'Image URL is not permitted' }, { status: 403 }); }
  try {
    const { body, contentType } = await fetchCoverImage(url);
    return new NextResponse(new Uint8Array(body), { headers: {
      'Content-Type': contentType, 'Cache-Control': 'public, max-age=604800',
      'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; sandbox",
    } });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch an allowed cover image' }, { status: 502 });
  }
}
