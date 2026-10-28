import { test, expect } from '@playwright/test';
import { allowedCoverUrl, publicIPv4 } from '../../src/lib/imageProxy';

test('only exact HTTPS providers without credentials or custom ports are allowed', () => {
  expect(allowedCoverUrl('https://cf.geekdo-images.com/cover.jpg').hostname).toBe('cf.geekdo-images.com');
  for (const value of ['http://cf.geekdo-images.com/x', 'https://cf.geekdo-images.com.evil.test/x',
    'https://evil.test/?url=https://cf.geekdo-images.com', 'https://user:pass@cf.geekdo-images.com/x',
    'https://cf.geekdo-images.com:8443/x', 'http://127.0.0.1', 'http://[::1]', 'https://[fd00::1]',
    'https://[::ffff:127.0.0.1]', 'https://localhost', 'https://169.254.169.254', 'file:///tmp/image.png']) {
    expect(() => allowedCoverUrl(value), value).toThrow();
  }
});

test('DNS results must be public IPv4 addresses', () => {
  for (const ip of ['127.0.0.1', '10.0.0.1', '172.16.0.1', '192.168.0.1', '169.254.169.254',
    '100.64.0.1', '0.0.0.0', '224.0.0.1', '198.18.0.1', '::1', '::ffff:127.0.0.1', 'fd00::1']) expect(publicIPv4(ip), ip).toBe(false);
  expect(publicIPv4('8.8.8.8')).toBe(true);
});

import { mock } from 'node:test';
import https from 'node:https';
import dns from 'node:dns/promises';
import { EventEmitter } from 'node:events';
import { fetchCoverImage, MAX_IMAGE_BYTES } from '../../src/lib/imageProxy';

test('proxy pins DNS, refuses redirects and stops oversized streams', async () => {
  const url = allowedCoverUrl('https://cf.geekdo-images.com/cover.jpg');
  const resolve = mock.method(dns, 'lookup', async () => [{ address: '8.8.8.8', family: 4 }]);
  let status = 200;
  let contentType = 'image/png';
  let chunks = [Buffer.from('image')];
  let destroyed = false;
  const connect = mock.method(https, 'request', (options: https.RequestOptions, callback: (response: unknown) => void) => {
    expect(options.hostname).toBe('8.8.8.8');
    expect(options.servername).toBe('cf.geekdo-images.com');
    const req = Object.assign(new EventEmitter(), {
      end() {
        queueMicrotask(() => {
          const res = Object.assign(new EventEmitter(), { statusCode: status, headers: { 'content-type': contentType },
            destroy() { destroyed = true; } });
          callback(res);
          if (!destroyed) {
            for (const chunk of chunks) res.emit('data', chunk);
            res.emit('end');
          }
          req.emit('close');
        });
      },
      destroy() { destroyed = true; req.emit('close'); },
    });
    return req;
  });
  try {
    expect((await fetchCoverImage(url)).body.toString()).toBe('image');
    status = 302;
    await expect(fetchCoverImage(url)).rejects.toThrow(/redirects are not allowed/);
    expect(connect.mock.callCount()).toBe(2); // No follow-up request to Location.
    destroyed = false;
    status = 200;
    contentType = 'text/html';
    await expect(fetchCoverImage(url)).rejects.toThrow(/unsupported content type/);
    destroyed = false;
    contentType = 'image/png';
    chunks = [Buffer.alloc(MAX_IMAGE_BYTES), Buffer.from('extra')];
    await expect(fetchCoverImage(url)).rejects.toThrow(/size limit/);
    expect(destroyed).toBe(true);
    resolve.mock.mockImplementation(async () => [{ address: '127.0.0.1', family: 4 }]);
    const previousCalls = connect.mock.callCount();
    await expect(fetchCoverImage(url)).rejects.toThrow(/prohibited address/);
    expect(connect.mock.callCount()).toBe(previousCalls);
  } finally { mock.restoreAll(); }
});
