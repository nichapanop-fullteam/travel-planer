"use client";

import { useCallback, useSyncExternalStore } from "react";

// Reports whether a media query currently matches, and re-renders when that
// changes.
//
// Needed alongside (not instead of) responsive CSS classes when a breakpoint
// has to drive behaviour rather than just appearance — `aria-hidden`, `inert`
// and other real attributes can't be set from a Tailwind variant, and getting
// them wrong at the wrong width takes controls out of the accessibility tree
// while they're still on screen.
//
// Built on useSyncExternalStore rather than useEffect + setState: matchMedia is
// exactly the "external store" it exists for, so the first client render
// already reads the real value instead of rendering a wrong one and correcting
// it in an effect.
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onStoreChange);
      return () => mql.removeEventListener("change", onStoreChange);
    },
    [query]
  );

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);

  // On the server there's no viewport to measure. `false` means callers get
  // the desktop behaviour during SSR, which is the safe default: nothing is
  // hidden or marked inert until the client confirms the width.
  const getServerSnapshot = useCallback(() => false, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
