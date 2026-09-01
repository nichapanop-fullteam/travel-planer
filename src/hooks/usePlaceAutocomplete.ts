"use client";

import { useEffect, useRef, useState } from "react";
import { fetchAutocompleteSuggestions, type AutocompleteSuggestion } from "@/lib/external-places-api";

// Matched to Create Trip's destination field, which runs the same endpoint —
// search boxes on one API should not feel differently responsive.
const DEFAULT_DEBOUNCE_MS = 350;

/**
 * Destination suggestions for a free-text term, from GET /api/places/autocomplete.
 *
 * `undefined` means "no answer for this exact term yet" — either nothing has
 * been typed, or a request is in flight. Callers render one skeleton for both,
 * because there is nothing useful to say between them. An empty array means the
 * API answered and had nothing.
 *
 * Lives here rather than in either caller: /search and /main's hero both need
 * it, and the debounce, the session token and the stale-response guard are
 * exactly the parts that go subtly wrong when they are copied.
 */
export function usePlaceAutocomplete(term: string, debounceMs = DEFAULT_DEBOUNCE_MS): AutocompleteSuggestion[] | undefined {
  // Results are stored with the term they answer, so a keystroke invalidates
  // the previous ones for free. Clearing state on a term change instead would
  // be a synchronous setState inside an effect, and an extra render for
  // something that can just be derived.
  const [result, setResult] = useState<{ term: string; places: AutocompleteSuggestion[] } | null>(null);

  // Guards against a slow early request landing after a faster later one and
  // overwriting it — the endpoint helper takes no AbortSignal, so a stale
  // response has to be discarded on arrival rather than cancelled in flight.
  const requestSeq = useRef(0);
  // One token for the whole typing session, the way the autocomplete pricing
  // model expects (see fetchAutocompleteSuggestions' doc comment).
  const sessionToken = useRef(crypto.randomUUID());

  const trimmed = term.trim();
  useEffect(() => {
    if (!trimmed) return;
    const seq = ++requestSeq.current;
    const timer = setTimeout(() => {
      fetchAutocompleteSuggestions(trimmed, sessionToken.current)
        .then((places) => {
          if (requestSeq.current === seq) setResult({ term: trimmed, places });
        })
        .catch(() => {
          // The endpoint answers [] rather than erroring for a miss, so getting
          // here means the request itself failed. "Nothing found" is the honest
          // thing to show either way.
          if (requestSeq.current === seq) setResult({ term: trimmed, places: [] });
        });
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [trimmed, debounceMs]);

  return trimmed && result?.term === trimmed ? result.places : undefined;
}
