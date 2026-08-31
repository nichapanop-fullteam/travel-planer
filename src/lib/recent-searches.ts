const STORAGE_KEY = "punguide.recentSearches";
const MAX_ENTRIES = 8;

// The feed searches this browser has run, newest first — the "ค้นหาล่าสุด"
// row on /search. Client-side only: there is no search-history endpoint, and
// this is a per-device convenience rather than account data, so localStorage is
// the honest home for it (same shape as lib/create-trip-search.ts).
//
// Every read is defensive: the key can hold anything a previous version (or a
// user poking at devtools) left behind, and a search page that throws on a
// malformed string would be worse than one that shows no history.
export function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
  } catch {
    return [];
  }
}

/** Puts `term` at the front, de-duplicated case-insensitively, and returns the
 *  new list. Blank terms are ignored rather than stored as empty chips. */
export function addRecentSearch(term: string): string[] {
  const trimmed = term.trim();
  if (!trimmed) return getRecentSearches();
  const rest = getRecentSearches().filter((entry) => entry.toLowerCase() !== trimmed.toLowerCase());
  const next = [trimmed, ...rest].slice(0, MAX_ENTRIES);
  writeRecentSearches(next);
  return next;
}

export function removeRecentSearch(term: string): string[] {
  const next = getRecentSearches().filter((entry) => entry !== term);
  writeRecentSearches(next);
  return next;
}

export function clearRecentSearches(): string[] {
  writeRecentSearches([]);
  return [];
}

function writeRecentSearches(entries: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Private mode, or the quota is full. The list is a convenience; losing it
    // must not take the search page down with it.
  }
}
