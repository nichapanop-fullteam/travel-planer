import { describe, expect, it, vi, beforeEach } from "vitest";
import { remixTrip, RemixApiError, type RemixTripRequest } from "@/lib/trip-remix-api";
import { BackendAuthenticationError } from "@/lib/authenticated-fetch";

const authenticatedFetch = vi.fn();

vi.mock("@/lib/authenticated-fetch", async () => {
  const actual = await vi.importActual<typeof import("@/lib/authenticated-fetch")>("@/lib/authenticated-fetch");
  return { ...actual, authenticatedFetch: (...args: unknown[]) => authenticatedFetch(...args) };
});

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    clone() {
      return jsonResponse(status, body);
    },
    json: async () => body,
  } as unknown as Response;
}

const payload: RemixTripRequest = {
  title: "ทริปหลวงพระบางของฉัน",
  startDate: "2026-09-12",
  endDate: "2026-09-14",
  travelerCount: 2,
  copyNotes: true,
  copyBudget: true,
};

describe("remixTrip", () => {
  beforeEach(() => {
    authenticatedFetch.mockReset();
  });

  // Requirement: the request body must never contain ownerId/userId —
  // ownership is derived server-side from the Bearer token.
  it("never sends ownerId or userId in the request body", async () => {
    authenticatedFetch.mockResolvedValue(jsonResponse(200, { id: "trip-123" }));

    await remixTrip("source-1", payload, "idem-key-1");

    expect(authenticatedFetch).toHaveBeenCalledTimes(1);
    const [, init] = authenticatedFetch.mock.calls[0];
    const sentBody = JSON.parse((init as RequestInit).body as string);
    expect(sentBody).not.toHaveProperty("ownerId");
    expect(sentBody).not.toHaveProperty("userId");
    expect(sentBody).toEqual(payload);
  });

  it("sends the Idempotency-Key header", async () => {
    authenticatedFetch.mockResolvedValue(jsonResponse(200, { id: "trip-123" }));
    await remixTrip("source-1", payload, "idem-key-42");
    const [, init] = authenticatedFetch.mock.calls[0];
    const headers = new Headers((init as RequestInit).headers);
    expect(headers.get("Idempotency-Key")).toBe("idem-key-42");
  });

  it("maps 400 to a duration_mismatch validation error with the expected day count", async () => {
    authenticatedFetch.mockResolvedValue(jsonResponse(400, { expectedDurationDays: 3 }));
    await expect(remixTrip("source-1", payload, "k")).rejects.toMatchObject({
      kind: "validation",
      expectedDurationDays: 3,
    });
  });

  it("maps 403 to forbidden with the private-source message", async () => {
    authenticatedFetch.mockResolvedValue(jsonResponse(403, {}));
    await expect(remixTrip("source-1", payload, "k")).rejects.toMatchObject({
      kind: "forbidden",
      message: "ไม่สามารถนำแผนส่วนตัวนี้ไปใช้ได้",
    });
  });

  it("maps 404 to not_found with the source-deleted message", async () => {
    authenticatedFetch.mockResolvedValue(jsonResponse(404, {}));
    await expect(remixTrip("source-1", payload, "k")).rejects.toMatchObject({
      kind: "not_found",
      message: "ไม่พบแผนต้นฉบับ หรือแผนอาจถูกลบแล้ว",
    });
  });

  it("maps a 409 that echoes an existing trip id onto RemixApiError.existingTripId", async () => {
    authenticatedFetch.mockResolvedValue(jsonResponse(409, { id: "already-created-trip" }));
    const error: RemixApiError = await remixTrip("source-1", payload, "k").catch((e) => e);
    expect(error).toBeInstanceOf(RemixApiError);
    expect(error.kind).toBe("conflict");
    expect(error.existingTripId).toBe("already-created-trip");
  });

  it("maps 500 to a generic server error", async () => {
    authenticatedFetch.mockResolvedValue(jsonResponse(500, {}));
    await expect(remixTrip("source-1", payload, "k")).rejects.toMatchObject({ kind: "server" });
  });

  it("maps an expired session (BackendAuthenticationError) to unauthorized", async () => {
    authenticatedFetch.mockRejectedValue(new BackendAuthenticationError());
    await expect(remixTrip("source-1", payload, "k")).rejects.toMatchObject({ kind: "unauthorized" });
  });
});
