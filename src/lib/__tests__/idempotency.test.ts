import { describe, expect, it } from "vitest";

import { nextIdempotentAttempt } from "@/lib/idempotency";

const brief = JSON.stringify({ trip: { destination: "เชียงราย, ไทย" } });

describe("Idempotency-Key per attempt", () => {
  it("mints a key on the first attempt", () => {
    const attempt = nextIdempotentAttempt(null, brief);
    expect(attempt.body).toBe(brief);
    expect(attempt.key).toMatch(/^[0-9a-f-]{36}$/);
  });

  // A retry of the identical request is the same intention, so the API can
  // hand back the plan it already generated instead of paying for another
  // model call.
  it("keeps the key when the same request is retried", () => {
    const first = nextIdempotentAttempt(null, brief);
    expect(nextIdempotentAttempt(first, brief)).toBe(first);
  });

  // The failure the API docs call out: reusing a key across a changed brief
  // returns the previous plan, so "generate" looks broken.
  it("mints a new key as soon as the request changes", () => {
    const first = nextIdempotentAttempt(null, brief);
    const second = nextIdempotentAttempt(first, JSON.stringify({ trip: { destination: "เชียงใหม่, ไทย" } }));

    expect(second.key).not.toBe(first.key);
  });
});
