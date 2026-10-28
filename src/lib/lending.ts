import type { BorrowRequest, Game } from '@/types';
import { getCanonicalName, isSameHousehold } from './normalize';

export type LendingAction =
  | { type: 'request'; request: BorrowRequest }
  | { type: 'accept' | 'confirm' | 'dismiss'; requestId: string; actor: string | null }
  | { type: 'borrow'; borrower: string; returnDate?: string; expectedHolder: string }
  | { type: 'return'; notes?: string; expectedHolder: string };

export function currentHolder(game: Game): string {
  return game.status === 'borrowed' && game.currentBorrower ? game.currentBorrower : game.owner;
}

/** Pure domain transition. Its input must be read inside the same transaction as the writes. */
export function transitionLending(game: Game, requests: BorrowRequest[], action: LendingAction, friends: string[], now: string): Game {
  const same = (a?: string | null, b?: string | null) => isSameHousehold(a, b, friends);
  const holder = currentHolder(game);
  let nextRequests = requests.map(r => ({ ...r }));
  let next: Game = { ...game, history: [...(game.history || [])] };
  const request = 'requestId' in action ? nextRequests.find(r => r.id === action.requestId) : undefined;
  const accepted = nextRequests.filter(r => r.status === 'accepted');

  const transfer = (borrower: string, returnDate?: string, note?: string) => {
    if (game.status === 'borrowed' && game.currentBorrower) {
      next.history.unshift({ id: `hist-${crypto.randomUUID()}`, borrower: game.currentBorrower,
        borrowDate: game.borrowDate || now, returnDate: now, notes: note });
    }
    const toOwner = same(borrower, game.owner);
    next = { ...next, status: toOwner ? 'available' : 'borrowed', currentBorrower: toOwner ? null : borrower,
      borrowDate: toOwner ? null : now, expectedReturnDate: toOwner ? null : (returnDate || null) };
    nextRequests = nextRequests.map(r => {
      if (r.status !== 'pending' && r.status !== 'accepted') return r;
      if (same(r.requesterName, borrower)) return { ...r, status: 'fulfilled', confirmedAt: now };
      // A prior holder's acceptance never authorizes a later transfer from the new holder.
      return { ...r, status: 'pending', holderName: borrower, acceptedAt: undefined };
    });
  };

  switch (action.type) {
    case 'request': {
      const duplicate = nextRequests.find(r => same(r.requesterName, action.request.requesterName) && (r.status === 'pending' || r.status === 'accepted'));
      if (duplicate) throw new Error('This household already has an active request for this game.');
      if (nextRequests.filter(r => r.status === 'pending' || r.status === 'accepted').length >= 100) {
        throw new Error('This game has too many active requests. Dismiss old requests first.');
      }
      nextRequests.unshift({ ...action.request, holderName: holder, gameTitle: game.title });
      break;
    }
    case 'accept':
      if (!request || request.status !== 'pending') throw new Error('This request is no longer pending. Refresh and try again.');
      if (!same(action.actor, holder) || !same(request.holderName, holder)) throw new Error('The current holder must accept this request.');
      if (accepted.length) throw new Error('Another handoff is already accepted for this game. Complete or cancel it first.');
      request.status = 'accepted';
      request.acceptedAt = now;
      break;
    case 'confirm':
      if (!request || request.status !== 'accepted') throw new Error('This handoff is no longer awaiting receipt.');
      if (!same(action.actor, request.requesterName)) throw new Error('Select the requesting household to confirm receipt.');
      if (!same(holder, request.holderName)) throw new Error('The holder has changed. Request a new handoff.');
      if (accepted.length !== 1) throw new Error('There are conflicting accepted handoffs. Cancel the extra handoffs first.');
      transfer(getCanonicalName(request.requesterName, friends), request.expectedReturnDate, request.note);
      break;
    case 'borrow':
      if (!same(holder, action.expectedHolder)) throw new Error('The holder changed while this form was open. Please reopen it.');
      if (accepted.length) throw new Error('Complete or cancel the accepted handoff before lending directly.');
      transfer(getCanonicalName(action.borrower, friends), action.returnDate);
      break;
    case 'return':
      if (game.status !== 'borrowed' || !same(holder, action.expectedHolder)) throw new Error('This loan has changed. Please reopen the return form.');
      transfer(game.owner, undefined, action.notes);
      break;
    case 'dismiss':
      if (!request) throw new Error('This request has already been removed.');
      nextRequests = nextRequests.filter(r => r.id !== action.requestId);
      break;
  }
  const active = nextRequests.filter(r => r.status === 'pending' || r.status === 'accepted');
  const completed = nextRequests.filter(r => r.status !== 'pending' && r.status !== 'accepted');
  return { ...next, history: next.history.slice(0, 200), borrowRequests: [...active, ...completed].slice(0, 200) };
}
