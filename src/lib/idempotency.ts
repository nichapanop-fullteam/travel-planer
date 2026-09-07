// POST /trips/plan/generate and POST /trips/create both accept an
// Idempotency-Key header: repeating a key returns the first result instead of
// doing the work again (the generate one for 5 minutes and without paying for
// another model call, the create one permanently, deduped by a unique index on
// the backend so even two simultaneous requests produce a single trip).
//
// The rule that makes it safe is one key per *intention*, reused only when
// retrying that same intention. Reusing a key across a changed intention is
// the failure the API docs warn about: the traveler edits the form, presses
// generate, and gets the previous plan handed back — a button that looks
// broken. So the intention is identified by the request body itself, and any
// change to it mints a new key.
export interface IdempotentAttempt {
  key: string;
  body: string;
}

export function nextIdempotentAttempt(
  previous: IdempotentAttempt | null,
  body: string
): IdempotentAttempt {
  return previous && previous.body === body ? previous : { key: crypto.randomUUID(), body };
}
