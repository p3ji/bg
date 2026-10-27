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
  const parts = name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .split(/\band\b|\+|\/|,|\s+/)
    .map((s) => s.replace(/[^a-z0-9]/g, '').trim())
    .filter(Boolean)
    .sort();
  return parts.join('_');
}
