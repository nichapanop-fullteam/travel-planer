import { afterEach, describe, expect, it } from "vitest";
import type { NextRequest } from "next/server";

import { clearBackendSession, optionalAuthHeaders, setBackendAccessToken } from "@/lib/backend-user";
import { rateLimitHeaders, upstreamHeaders } from "@/lib/proxy-auth";

// upstreamHeaders only ever reads request.headers.
const requestWith = (headers: Record<string, string>) => ({ headers: new Headers(headers) }) as NextRequest;

describe("rate-limit attribution on the proxied paid routes", () => {
  afterEach(() => clearBackendSession());

  it("attaches a bearer token to proxy calls once there is a session", () => {
    setBackendAccessToken("access-token-123");
    expect(optionalAuthHeaders()).toEqual({ Authorization: "Bearer access-token-123" });
  });

  // These endpoints work signed out — the quota bucket is the only thing the
  // token changes — so a missing session must not become an Authorization
  // header or an error.
  it("sends nothing when signed out", () => {
    expect(optionalAuthHeaders()).toEqual({});
  });

  it("hands the browser's Authorization header on to the external API", () => {
    expect(upstreamHeaders(requestWith({ authorization: "Bearer from-browser" }))).toEqual({
      "ngrok-skip-browser-warning": "true",
      authorization: "Bearer from-browser",
    });
  });

  it("hands the Idempotency-Key on too, so a retry is not charged twice", () => {
    expect(
      upstreamHeaders(requestWith({ authorization: "Bearer t", "idempotency-key": "attempt-1" }))
    ).toEqual({
      "ngrok-skip-browser-warning": "true",
      authorization: "Bearer t",
      "idempotency-key": "attempt-1",
    });
  });

  it("never invents an Authorization header the browser did not send", () => {
    expect(upstreamHeaders(requestWith({}), { "Content-Type": "application/json" })).toEqual({
      "ngrok-skip-browser-warning": "true",
      "Content-Type": "application/json",
    });
  });

  it("passes the quota headers back through, and only the ones present", () => {
    const response = new Response(null, {
      headers: { "X-RateLimit-Limit": "60", "X-RateLimit-Remaining": "59" },
    });
    expect(rateLimitHeaders(response)).toEqual({
      "x-ratelimit-limit": "60",
      "x-ratelimit-remaining": "59",
    });
  });
});
