import { Game } from '@/types';

/**
 * Computes Levenshtein distance between two strings
 */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

/**
 * Collapses consecutive duplicate letters:
 * e.g. "carcassonne" -> "carcasone"
 * e.g. "carcassone" -> "carcasone"
 * e.g. "carcasonne" -> "carcasone"
 */
function collapseRepeats(str: string): string {
  return str.replace(/(.)\1+/g, '$1');
}

/**
 * Cleans string for normalized text comparison
 */
function cleanString(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Checks whether a text field matches a user search query, accounting for:
 * 1. Direct substring inclusion
 * 2. Letter doubling / spelling variations (e.g. carcassonne vs carcassone)
 * 3. Space separation differences (e.g. "code names" vs "codenames")
 * 4. Minor typos and 1-2 character Levenshtein edit distance on words >= 4 letters
 */
export function matchesFuzzy(query?: string | null, text?: string | null): boolean {
  if (!query || !text) return false;
  const qClean = cleanString(query);
  const tClean = cleanString(text);
  if (!qClean) return false;

  // 1. Direct substring match
  if (tClean.includes(qClean)) return true;

  // 2. Collapsed repeats comparison (handles double-s, double-n, double-t etc.)
  const qCollapsed = collapseRepeats(qClean);
  const tCollapsed = collapseRepeats(tClean);
  if (tCollapsed.includes(qCollapsed)) return true;

  // 3. Space-less match (handles "code names" matching "codenames")
  const qNoSpace = qClean.replace(/\s+/g, '');
  const tNoSpace = tClean.replace(/\s+/g, '');
  if (tNoSpace.includes(qNoSpace) || collapseRepeats(tNoSpace).includes(collapseRepeats(qNoSpace))) return true;

  // 4. Token-by-token comparison
  const qWords = qClean.split(' ').filter(Boolean);
  const tWords = tClean.split(' ').filter(Boolean);

  return qWords.every((qWord) => {
    return tWords.some((tWord) => {
      // Direct word prefix or substring
      if (tWord.includes(qWord)) return true;
      if (collapseRepeats(tWord).includes(collapseRepeats(qWord))) return true;

      // Typo tolerance
      const maxLen = Math.max(qWord.length, tWord.length);
      const minLen = Math.min(qWord.length, tWord.length);
      if (maxLen - minLen > 2) return false;
      if (maxLen < 4) return false;

      const maxDistance = maxLen > 7 ? 2 : 1;
      return levenshtein(qWord, tWord) <= maxDistance;
    });
  });
}

/**
 * Strict entity-level title matching for syncing and deduplicating games.
 * Matches minor punctuation, spacing, article ("the"), or 1-2 char spelling variations
 * (e.g. "Carcassonne" vs "Carcassone", "7 Wonders: Duel" vs "7 Wonders Duel"),
 * while NEVER conflating base games with expansions ("Catan" vs "Catan: Seafarers").
 */
export function matchesTitleEntity(titleA?: string | null, titleB?: string | null): boolean {
  if (!titleA || !titleB) return false;
  const aClean = cleanString(titleA).replace(/^the\s+/, '');
  const bClean = cleanString(titleB).replace(/^the\s+/, '');
  if (!aClean || !bClean) return false;

  if (aClean === bClean) return true;
  if (collapseRepeats(aClean) === collapseRepeats(bClean)) return true;

  const aNoSpace = aClean.replace(/\s+/g, '');
  const bNoSpace = bClean.replace(/\s+/g, '');
  if (aNoSpace === bNoSpace) return true;
  if (collapseRepeats(aNoSpace) === collapseRepeats(bNoSpace)) return true;

  if (Math.abs(aClean.length - bClean.length) <= 2 && Math.min(aClean.length, bClean.length) >= 5) {
    return levenshtein(aClean, bClean) <= 2;
  }

  return false;
}

/**
 * Searches a game across title, category, notes, owner, and current borrower
 */
export function matchesGameSearch(query: string, game: Game): boolean {
  if (!query.trim()) return true;
  return (
    matchesFuzzy(query, game.title) ||
    matchesFuzzy(query, game.type) ||
    matchesFuzzy(query, game.notes) ||
    matchesFuzzy(query, game.owner) ||
    matchesFuzzy(query, game.currentBorrower)
  );
}
