import { DEFAULT_FRIENDS } from '@/data/friends';

/**
 * Splits a household or individual name into clean lowercase word tokens.
 * Handles '&', 'and', '+', '/', commas, and punctuation.
 */
export function normalizeTokens(name?: string | null): string[] {
  if (!name) return [];
  return name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .split(/\band\b|\+|\/|,|\s+/)
    .map((s) => s.replace(/[^a-z0-9]/g, '').trim())
    .filter(Boolean);
}

/**
 * Normalizes household names to be order-independent and formatting-resilient.
 * Matches:
 *  - "Kalissa & Allen" === "Allen & Kalissa" === "allen and kalissa"
 *  - "Angel & Peter" === "Peter & Angel" === "peter and angel"
 *  - "Stefan & Celina" === "Celina & Stefan"
 *  - "Carissa & Brandon" === "Brandon & Carissa"
 */
export function normalizeName(name?: string | null): string {
  if (!name) return '';
  return normalizeTokens(name).sort().join('_');
}

/**
 * Resolves any spelling or formatting variation (including single partner names
 * or reversed order) to the official canonical household name from the roster.
 *
 * Examples:
 *  - "Allen & Kalissa" -> "Kalissa & Allen"
 *  - "Peter" -> "Angel & Peter"
 *  - "Brandon" -> "Carissa & Brandon"
 *  - "Stefan" -> "Celina & Stefan"
 */
export function getCanonicalName(name?: string | null, roster: string[] = DEFAULT_FRIENDS): string {
  if (!name) return '';
  const trimmed = name.trim();
  const norm = normalizeName(trimmed);
  if (!norm) return trimmed;

  const activeRoster = roster && roster.length > 0 ? roster : DEFAULT_FRIENDS;

  // 1. Direct exact or normalized match with an existing household in the roster
  for (const candidate of activeRoster) {
    if (normalizeName(candidate) === norm) {
      return candidate;
    }
  }

  // 2. Token subset match (e.g. single partner name "Peter" -> "Angel & Peter")
  const inputTokens = normalizeTokens(trimmed);
  if (inputTokens.length > 0) {
    for (const candidate of activeRoster) {
      const candidateTokens = normalizeTokens(candidate);
      if (inputTokens.every((token) => candidateTokens.includes(token))) {
        return candidate;
      }
    }
  }

  return trimmed;
}

/**
 * Compares two household or person names and returns true if they refer to the same group/household.
 * Handles:
 *  - Order permutations ("Peter & Angel" vs "Angel & Peter")
 *  - Single-partner shortcuts ("Peter" matching "Angel & Peter")
 *  - Formatting variations ("and" vs "&" vs commas vs slashes)
 *  - Casing and surrounding whitespace
 */
export function isSameHousehold(
  a?: string | null,
  b?: string | null,
  roster: string[] = DEFAULT_FRIENDS
): boolean {
  if (!a || !b) return false;
  if (a === b) return true;

  const normA = normalizeName(a);
  const normB = normalizeName(b);
  if (normA && normA === normB) return true;

  const canonA = getCanonicalName(a, roster);
  const canonB = getCanonicalName(b, roster);
  if (canonA && canonB && normalizeName(canonA) === normalizeName(canonB)) return true;

  // Check if one name's tokens are a subset of the other (e.g. "Allen" and "Kalissa & Allen")
  const tokensA = normalizeTokens(a);
  const tokensB = normalizeTokens(b);
  if (tokensA.length > 0 && tokensB.length > 0) {
    if (tokensA.every((t) => tokensB.includes(t)) || tokensB.every((t) => tokensA.includes(t))) {
      return true;
    }
  }

  return false;
}
