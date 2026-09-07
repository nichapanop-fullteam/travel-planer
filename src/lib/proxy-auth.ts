import type { NextRequest } from "next/server";

// The external API rate-limits its paid routes — POST /trips/plan/generate
// (60/hour), GET /places/* (300/min) and POST /routes/calculate (120/min) —
// and counts them per user account when the request carries an access token.
// A request with no token is counted against a single bucket shared by
// everyone, so an unauthenticated proxy hop makes every visitor compete for
// one quota. These routes sit between the browser and that API, which is why
// the browser's Authorization header has to be handed on rather than dropped.
//
// None of these endpoints require auth: a missing token is not an error here,
// it only decides which bucket the call is counted against. Never send one the
// browser didn't provide.
//
// Idempotency-Key rides along for the same reason: the browser sets it to mark
// one attempt at one thing (see lib/idempotency.ts), and dropping it here
// would mean a retried plan generation pays for a second model call.
const FORWARDED_REQUEST_HEADERS = ["authorization", "idempotency-key"] as const;

export function upstreamHeaders(request: NextRequest, extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { "ngrok-skip-browser-warning": "true", ...extra };
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers[name] = value;
  }
  return headers;
}

// Quota state the API reports on every response. Passed through so a 429 can
// be explained ("resets at…") instead of surfacing as an unexplained failure.
const RATE_LIMIT_HEADERS = ["x-ratelimit-limit", "x-ratelimit-remaining", "x-ratelimit-reset"];

export function rateLimitHeaders(response: Response): Record<string, string> {
  const forwarded: Record<string, string> = {};
  for (const name of RATE_LIMIT_HEADERS) {
    const value = response.headers.get(name);
    if (value) forwarded[name] = value;
  }
  return forwarded;
}
