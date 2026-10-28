import { doc, getDocFromServer } from 'firebase/firestore';
import { db, COLLECTIONS } from './firebase';
import type { Game } from '@/types';

export type SheetJob = { id: string; gameId: string; previousOwner: string; previousTitle: string }
  | { id: string; household: string };
const KEY = 'gameshare_sheet_outbox_v1';
let pending: SheetJob[] | null = null;
let flushing: Promise<void> | null = null;
let lastError = '';
function jobs(): SheetJob[] {
  if (pending) return pending;
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(KEY) || '[]');
    pending = Array.isArray(stored) ? stored.filter(j => j && typeof j.id === 'string' &&
      (typeof j.gameId === 'string' || typeof j.household === 'string')) : [];
  } catch { pending = []; }
  return pending!;
}
function publish() {
  try { localStorage.setItem(KEY, JSON.stringify(jobs())); }
  catch { lastError = 'Could not store the Sheets retry queue on this device. Keep this page open to retry.'; }
  window.dispatchEvent(new Event('bg_sheet_sync'));
}
export function sheetSyncStatus() { return { count: jobs().length, error: lastError }; }
export function queueSheetJob(job: SheetJob) {
  const existing = jobs().find(j => j.id === job.id);
  // Preserve the original row location through a sequence of renames.
  if (!existing) jobs().push(job);
  else pending = jobs().map(j => j.id === job.id ? { ...j } : j);
  publish();
}
export async function postSheets(body: Record<string, unknown>) {
  const response = await fetch('/api/sheets/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
  const result = await response.json();
  if (!response.ok || result.success !== true) throw new Error(result.error || result.message || `Sheets returned HTTP ${response.status}`);
}
export function flushSheetJobs(): Promise<void> {
  if (flushing) return flushing;
  flushing = (async () => {
    lastError = '';
    while (jobs().length) {
      const job = jobs()[0];
      try {
        if ('gameId' in job) {
          // Retry the latest committed state, never an old borrower captured in a form.
          const snapshot = await getDocFromServer(doc(db, COLLECTIONS.GAMES, job.gameId));
          if (!snapshot.exists()) throw new Error('Game no longer exists in the shared library.');
          const game = snapshot.data() as Game;
          await postSheets({ action: 'update_game_details', previousOwnerHousehold: job.previousOwner,
            previousGameTitle: job.previousTitle, updatedGame: game });
        } else await postSheets({ action: 'add_household', householdName: job.household });
        pending = jobs().filter(j => j !== job);
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Could not synchronize Google Sheets.';
        break;
      }
    }
  })().finally(() => { flushing = null; publish(); });
  return flushing;
}
