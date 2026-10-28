import { test, expect } from '@playwright/test';
import { mock } from 'node:test';
import { postSheets, queueSheetJob, flushSheetJobs, sheetSyncStatus } from '../../src/lib/sheetsSync';

test('HTTP and application failures reject, and the durable retry queue survives a failed attempt', async () => {
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  } });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: new EventTarget() });
  let response = new Response(JSON.stringify({ error: 'Rejected' }), { status: 500 });
  const fetchMock = mock.method(globalThis, 'fetch', async () => response.clone());
  try {
    await expect(postSheets({ action: 'add_household' })).rejects.toThrow('Rejected');
    response = new Response(JSON.stringify({ success: false, message: 'Service Account not configured.' }));
    await expect(postSheets({ action: 'add_household' })).rejects.toThrow(/not configured/);
    queueSheetJob({ id: 'household:Test', household: 'Test' });
    await flushSheetJobs();
    expect(sheetSyncStatus()).toMatchObject({ count: 1, error: 'Service Account not configured.' });
    expect(JSON.parse(storage.get('gameshare_sheet_outbox_v1')!)).toHaveLength(1);
    response = new Response(JSON.stringify({ success: true }));
    await flushSheetJobs();
    expect(sheetSyncStatus()).toEqual({ count: 0, error: '' });
    expect(JSON.parse(storage.get('gameshare_sheet_outbox_v1')!)).toEqual([]);
    expect(fetchMock.mock.callCount()).toBe(4);
  } finally { mock.restoreAll(); }
});
