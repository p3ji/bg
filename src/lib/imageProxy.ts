import { lookup } from 'node:dns/promises';
import { request } from 'node:https';
import { isIP } from 'node:net';

// Only known cover providers may be contacted. No suffix or user-supplied host matching.
const COVER_HOSTS = new Set([
  'cf.geekdo-images.com', 'boardgamegeek.com', 'images.unsplash.com',
  'upload.wikimedia.org', 'commons.wikimedia.org', 'thumb.wikimedia.org',
  'cdn.shopify.com', 'playworldgame.com', 'littlecanadian.ca', 'ravensburger.com.au',
]);
const TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export function allowedCoverUrl(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !COVER_HOSTS.has(url.hostname)) {
    throw new Error('Image URL must use an approved HTTPS cover provider.');
  }
  return url;
}

export function publicIPv4(address: string): boolean {
  if (isIP(address) !== 4) return false;
  const [a, b] = address.split('.').map(Number);
  return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && [0, 168].includes(b)) ||
    (a === 198 && [18, 19, 51].includes(b)) || (a === 203 && b === 0));
}

export async function fetchCoverImage(url: URL): Promise<{ body: Buffer; contentType: string }> {
  // Pin the connection to a validated address; fetch() would resolve DNS again.
  const addresses = await lookup(url.hostname, { family: 4, all: true });
  if (!addresses.length || addresses.some(({ address }) => !publicIPv4(address))) {
    throw new Error('Cover provider resolved to a prohibited address.');
  }
  return new Promise((resolve, reject) => {
    const req = request({ hostname: addresses[0].address, servername: url.hostname, port: 443,
      path: url.pathname + url.search, method: 'GET',
      headers: { Host: url.hostname, Accept: 'image/avif,image/webp,image/png,image/jpeg,image/gif', 'User-Agent': 'GameShare/1.0' },
    }, res => {
      const fail = (message: string) => { res.destroy(); req.destroy(); reject(new Error(message)); };
      // Redirects are intentionally not followed, even between approved providers.
      if (res.statusCode !== 200) return fail('Cover provider did not return an image (redirects are not allowed).');
      const contentType = (res.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
      if (!TYPES.has(contentType)) return fail('Cover provider returned an unsupported content type.');
      if (Number(res.headers['content-length']) > MAX_IMAGE_BYTES) return fail('Image exceeds size limit.');
      let size = 0;
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (size > MAX_IMAGE_BYTES) { fail('Image exceeds size limit.'); return; }
        chunks.push(chunk);
      });
      res.on('error', reject);
      res.on('end', () => resolve({ body: Buffer.concat(chunks), contentType }));
    });
    const timer = setTimeout(() => req.destroy(new Error('Image request timed out.')), 8000);
    req.on('close', () => clearTimeout(timer));
    req.on('error', reject);
    req.end();
  });
}
