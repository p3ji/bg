import { test, expect } from '@playwright/test';
import { transitionLending } from '../../src/lib/lending';
import type { Game, BorrowRequest } from '../../src/types';
const friends = ['Owner', 'Alice', 'Bob'];
const now = '2026-10-27T15:00:00.000Z';
const game: Game = { id: 'g', title: 'Game', owner: 'Owner', status: 'available', history: [],
  minPlayers: 1, maxPlayers: 4, minPlaytime: 30, maxPlaytime: 60, playtimeDisplay: '30–60m', type: 'Strategy' };
const request = (id: string, requesterName = 'Alice'): BorrowRequest => ({ id, gameId: 'g', gameTitle: 'Game',
  requesterName, holderName: 'Owner', status: 'pending', requestedAt: now });
const apply = (g: Game, action: Parameters<typeof transitionLending>[2]) => transitionLending(g, g.borrowRequests || [], action, friends, now);

test('request → accept → receipt → return keeps custody and request status consistent', () => {
  let g = apply(game, { type: 'request', request: request('a') });
  g = apply(g, { type: 'accept', requestId: 'a', actor: 'Owner' });
  expect(g.currentBorrower).toBeUndefined();
  g = apply(g, { type: 'confirm', requestId: 'a', actor: 'Alice' });
  expect(g.currentBorrower).toBe('Alice');
  expect(g.borrowRequests?.[0].status).toBe('fulfilled');
  g = apply(g, { type: 'return', expectedHolder: 'Alice', notes: 'All pieces returned' });
  expect(g.status).toBe('available');
  expect(g.currentBorrower).toBeNull();
  expect(g.history[0]).toMatchObject({ borrower: 'Alice', notes: 'All pieces returned' });
});

test('second acceptance after a competing commit is rejected', () => {
  let g = apply(game, { type: 'request', request: request('a') });
  g = apply(g, { type: 'request', request: request('b', 'Bob') });
  g = apply(g, { type: 'accept', requestId: 'a', actor: 'Owner' });
  expect(() => apply(g, { type: 'accept', requestId: 'b', actor: 'Owner' })).toThrow(/already accepted/);
  g = apply(g, { type: 'confirm', requestId: 'a', actor: 'Alice' });
  expect(g.borrowRequests?.find(r => r.id === 'b')).toMatchObject({ status: 'pending', holderName: 'Alice' });
  expect(() => apply(g, { type: 'confirm', requestId: 'b', actor: 'Bob' })).toThrow(/no longer awaiting/);
  expect(() => apply(g, { type: 'accept', requestId: 'b', actor: 'Owner' })).toThrow(/current holder/);
  g = apply(g, { type: 'accept', requestId: 'b', actor: 'Alice' });
  g = apply(g, { type: 'confirm', requestId: 'b', actor: 'Bob' });
  expect(g.currentBorrower).toBe('Bob');
  expect(g.history[0].borrower).toBe('Alice');
});

test('stale holder, wrong requester, replayed receipt and legacy competing acceptances are rejected', () => {
  const accepted = { ...request('a'), status: 'accepted' as const };
  expect(() => apply({ ...game, borrowRequests: [accepted] }, { type: 'confirm', requestId: 'a', actor: 'Bob' })).toThrow(/requesting household/);
  expect(() => apply({ ...game, status: 'borrowed', currentBorrower: 'Bob', borrowRequests: [accepted] }, { type: 'confirm', requestId: 'a', actor: 'Alice' })).toThrow(/holder has changed/);
  expect(() => apply({ ...game, borrowRequests: [accepted, { ...request('b', 'Bob'), status: 'accepted' }] }, { type: 'confirm', requestId: 'a', actor: 'Alice' })).toThrow(/conflicting/);
  const received = apply({ ...game, borrowRequests: [accepted] }, { type: 'confirm', requestId: 'a', actor: 'Alice' });
  expect(() => apply(received, { type: 'confirm', requestId: 'a', actor: 'Alice' })).toThrow(/no longer awaiting/);
  expect(() => apply(received, { type: 'borrow', borrower: 'Bob', expectedHolder: 'Owner' })).toThrow(/holder changed/);
});

test('return resets outstanding accepted handoffs and retargets pending requests', () => {
  const g = apply({ ...game, status: 'borrowed', currentBorrower: 'Alice', borrowDate: now,
    borrowRequests: [{ ...request('b', 'Bob'), holderName: 'Alice', status: 'accepted', acceptedAt: now }] },
  { type: 'return', expectedHolder: 'Alice' });
  expect(g.borrowRequests?.[0]).toMatchObject({ status: 'pending', holderName: 'Owner' });
  expect(g.borrowRequests?.[0].acceptedAt).toBeUndefined();
});

test('duplicate requests and direct lending over an accepted handoff are rejected', () => {
  const g = { ...game, borrowRequests: [{ ...request('a'), status: 'accepted' as const }] };
  expect(() => apply(g, { type: 'request', request: request('b') })).toThrow(/already has an active/);
  expect(() => apply(g, { type: 'borrow', borrower: 'Bob', expectedHolder: 'Owner' })).toThrow(/accepted handoff/);
  const cancelled = apply(g, { type: 'dismiss', requestId: 'a', actor: 'Owner' });
  expect(cancelled.borrowRequests).toEqual([]);
});

test('new loan history survives the 200-entry cap', () => {
  const history = Array.from({ length: 200 }, (_, i) => ({ id: `old-${i}`, borrower: 'Bob', borrowDate: now, returnDate: now }));
  const g = apply({ ...game, status: 'borrowed', currentBorrower: 'Alice', history }, { type: 'return', expectedHolder: 'Alice' });
  expect(g.history).toHaveLength(200);
  expect(g.history[0].borrower).toBe('Alice');
  expect(g.history.at(-1)?.id).toBe('old-198');
});
