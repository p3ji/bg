import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_CONTENT_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

function isPrivateOrLoopbackHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (
    lower === 'localhost' ||
    lower.endsWith('.localhost') ||
    lower.endsWith('.local') ||
    lower.endsWith('.internal')
  ) {
    return true;
  }

  // IPv4 checks
  const ipv4Match = lower.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [b0, b1] = [Number(ipv4Match[1]), Number(ipv4Match[2])];
    if (b0 === 127) return true; // 127.0.0.0/8 (Loopback)
    if (b0 === 10) return true; // 10.0.0.0/8 (Private)
    if (b0 === 172 && b1 >= 16 && b1 <= 31) return true; // 172.16.0.0/12 (Private)
    if (b0 === 192 && b1 === 168) return true; // 192.168.0.0/16 (Private)
    if (b0 === 169 && b1 === 254) return true; // 169.254.0.0/16 (Link-local / Cloud metadata)
    if (b0 === 0) return true; // 0.0.0.0/8
  }

  // IPv6 loopback / unique local / link-local
  if (
    lower === '::1' ||
    lower.startsWith('fe80:') ||
    lower.startsWith('fc') ||
    lower.startsWith('fd')
  ) {
    return true;
  }

  return false;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return NextResponse.json({ error: 'Invalid URL protocol' }, { status: 400 });
  }

  if (isPrivateOrLoopbackHost(parsed.hostname)) {
    return NextResponse.json({ error: 'Target host not permitted' }, { status: 403 });
  }

  try {
    const upstreamRes = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(8000), // 8s timeout to avoid serverless hanging
      next: { revalidate: 86400 * 7 }, // Cache for 7 days
    });

    if (!upstreamRes.ok) {
      return NextResponse.json(
        { error: `Upstream failed with status ${upstreamRes.status}` },
        { status: upstreamRes.status }
      );
    }

    // Check Content-Length before buffering to prevent memory exhaustion DoS
    const contentLength = upstreamRes.headers.get('content-length');
    if (contentLength && Number(contentLength) > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json({ error: 'Image exceeds size limit' }, { status: 413 });
    }

    // Validate Content-Type: strictly allow raster image types (block text/html, svg, scripts)
    const rawContentType = upstreamRes.headers.get('content-type') || 'image/jpeg';
    const cleanContentType = rawContentType.split(';')[0].trim().toLowerCase();

    if (!ALLOWED_CONTENT_TYPES.has(cleanContentType)) {
      return NextResponse.json(
        { error: 'Invalid content type returned by upstream' },
        { status: 415 }
      );
    }

    const buffer = await upstreamRes.arrayBuffer();
    if (buffer.byteLength > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json({ error: 'Image exceeds size limit' }, { status: 413 });
    }

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': cleanContentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; sandbox",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Image proxy error:', message);
    return NextResponse.json({ error: 'Failed to fetch image', details: message }, { status: 500 });
  }
}
