// Remembers which public trip a logged-out visitor wanted to Remix, across
// the redirect to /login and back — sessionStorage survives that
// navigation but clears itself once the tab closes, unlike localStorage
// which would linger indefinitely if the visitor never logs back in.
const KEY = "punguide.pendingRemixIntent";

export function setPendingRemixIntent(sourceTripId: string): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(KEY, sourceTripId);
}

// Clears the intent after reading it once, so navigating away and back
// later doesn't keep re-opening the Remix dialog.
export function consumePendingRemixIntent(): string | null {
  if (typeof window === "undefined") return null;
  const value = window.sessionStorage.getItem(KEY);
  if (value) window.sessionStorage.removeItem(KEY);
  return value;
}
