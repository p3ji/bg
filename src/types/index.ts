export interface LoanHistoryRecord {
  id: string;
  borrower: string;
  borrowDate: string;
  returnDate: string;
  notes?: string;
}

export type BorrowRequestStatus = 'pending' | 'accepted' | 'fulfilled' | 'cancelled';

export interface BorrowRequest {
  id: string;
  gameId: string;
  gameTitle: string;
  requesterName: string;
  holderName: string; // Current borrower or owner who currently holds the game
  requestedAt: string;
  acceptedAt?: string;
  confirmedAt?: string;
  status: BorrowRequestStatus;
  note?: string;
  expectedReturnDate?: string;
}

export interface Game {
  id: string;
  title: string;
  owner: string; // e.g. "Angel & Peter", "Kalissa & Allen", etc.
  minPlayers: number;
  maxPlayers: number;
  minPlaytime: number;
  maxPlaytime: number;
  playtimeDisplay: string;
  type: string;
  notes?: string;
  status: 'available' | 'borrowed';
  currentBorrower?: string | null;
  borrowDate?: string | null;
  expectedReturnDate?: string | null;
  bggId?: number | null;
  bggRating?: number | null;
  bggRank?: number | null;
  weight?: number | null; // Complexity rating 1.0 to 5.0
  image?: string | null;
  thumbnail?: string | null;
  description?: string | null;
  year?: number | null;
  history: LoanHistoryRecord[];
  borrowRequests?: BorrowRequest[];
}

export type ViewMode = 'bookshelf' | 'table';

export interface FilterState {
  search: string;
  exactPlayers: number | null; // e.g. 4 for 4-player game
  maxPlaytime: number | null; // e.g. 60 min
  availability: 'all' | 'available' | 'borrowed';
  owner: string; // 'all' or specific owner
  type: string; // 'all' or specific type
  sortBy: 'title' | 'rank' | 'rating' | 'playtime' | 'weight' | 'players';
  sortOrder: 'asc' | 'desc';
}
