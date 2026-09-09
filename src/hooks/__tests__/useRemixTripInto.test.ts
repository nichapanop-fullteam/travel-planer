import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useRemixTripInto } from "@/hooks/useRemixTripInto";
import { RemixApiError } from "@/lib/trip-remix-api";

const remixTripIntoMock = vi.fn();
let mockBackendUser: { id: string } | null = { id: "user-1" };

vi.mock("@/lib/trip-remix-api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/trip-remix-api")>("@/lib/trip-remix-api");
  return { ...actual, remixTripInto: (...args: unknown[]) => remixTripIntoMock(...args) };
});

vi.mock("@/providers/AuthProvider", () => ({
  useAuth: () => ({ backendUser: mockBackendUser, user: null, isLoading: false }),
}));

const options = { copyNotes: true, copyBudget: true };

function response(overrides: Record<string, unknown> = {}) {
  return {
    id: "target-1",
    title: "ไปหลวงพระบางกัน",
    attributionRecorded: false,
    replayed: false,
    addedDayNumbers: [3, 4, 5],
    addedStopCount: 14,
    ...overrides,
  };
}

describe("useRemixTripInto", () => {
  beforeEach(() => {
    remixTripIntoMock.mockReset();
    mockBackendUser = { id: "user-1" };
  });

  it("goes idle -> submitting -> success and exposes the target trip", async () => {
    let resolveFetch: (value: unknown) => void = () => {};
    remixTripIntoMock.mockReturnValue(new Promise((resolve) => (resolveFetch = resolve)));

    const { result } = renderHook(() => useRemixTripInto());
    expect(result.current.status).toBe("idle");

    act(() => {
      void result.current.submit("source-1", "target-1", options);
    });
    await waitFor(() => expect(result.current.status).toBe("submitting"));

    await act(async () => {
      resolveFetch(response());
    });

    expect(result.current.status).toBe("success");
    // The id that comes back is the TARGET — nothing was created.
    expect(result.current.result?.id).toBe("target-1");
    expect(result.current.result?.addedDayNumbers).toEqual([3, 4, 5]);
  });

  it("sends the source and target as separate path arguments, plus an Idempotency-Key", async () => {
    remixTripIntoMock.mockResolvedValue(response());

    const { result } = renderHook(() => useRemixTripInto());
    await act(async () => {
      await result.current.submit("source-1", "target-1", options);
    });

    expect(remixTripIntoMock).toHaveBeenCalledTimes(1);
    const [sourceTripId, targetTripId, payload, idempotencyKey] = remixTripIntoMock.mock.calls[0];
    expect(sourceTripId).toBe("source-1");
    expect(targetTripId).toBe("target-1");
    expect(payload).toEqual(options);
    expect(typeof idempotencyKey).toBe("string");
    expect(idempotencyKey).not.toBe("");
  });

  it("never calls the API before auth is confirmed", async () => {
    mockBackendUser = null;

    const { result } = renderHook(() => useRemixTripInto());
    await act(async () => {
      await result.current.submit("source-1", "target-1", options);
    });

    expect(remixTripIntoMock).not.toHaveBeenCalled();
    expect(result.current.status).toBe("unauthorized");
  });

  it("ignores a second submit while the first is still in flight", async () => {
    remixTripIntoMock.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useRemixTripInto());
    act(() => {
      void result.current.submit("source-1", "target-1", options);
      void result.current.submit("source-1", "target-1", options);
    });

    // The guard is what stops a double-click appending the plan twice before
    // the Idempotency-Key even reaches the server.
    expect(remixTripIntoMock).toHaveBeenCalledTimes(1);
  });

  it("keeps the same key across a retry of one attempt, and mints a new one after reset", async () => {
    remixTripIntoMock.mockRejectedValue(new RemixApiError("server", "พัง"));

    const { result } = renderHook(() => useRemixTripInto());
    await act(async () => {
      await result.current.submit("source-1", "target-1", options);
    });
    await act(async () => {
      await result.current.submit("source-1", "target-1", options);
    });
    const firstKey = remixTripIntoMock.mock.calls[0][3];
    expect(remixTripIntoMock.mock.calls[1][3]).toBe(firstKey);

    act(() => result.current.reset());
    await act(async () => {
      await result.current.submit("source-1", "target-1", options);
    });

    // A fresh attempt must not replay the failed one's key — a replay appends
    // nothing and would look like a silent no-op.
    expect(remixTripIntoMock.mock.calls[2][3]).not.toBe(firstKey);
    expect(result.current.status).toBe("error");
  });

  it("maps each API error kind onto its own status", async () => {
    const cases: Array<[RemixApiError["kind"], string]> = [
      ["forbidden", "forbidden"],
      ["not_found", "not_found"],
      ["unauthorized", "unauthorized"],
      ["validation", "error"],
      ["server", "error"],
    ];

    for (const [kind, expected] of cases) {
      remixTripIntoMock.mockReset();
      remixTripIntoMock.mockRejectedValue(new RemixApiError(kind, `ข้อความ ${kind}`));

      const { result } = renderHook(() => useRemixTripInto());
      await act(async () => {
        await result.current.submit("source-1", "target-1", options);
      });

      expect(result.current.status).toBe(expected);
      expect(result.current.message).toBe(`ข้อความ ${kind}`);
    }
  });

  it("still reports success for an idempotent replay, with no day numbers to show", async () => {
    remixTripIntoMock.mockResolvedValue(
      response({ replayed: true, addedDayNumbers: undefined, addedStopCount: undefined })
    );

    const { result } = renderHook(() => useRemixTripInto());
    await act(async () => {
      await result.current.submit("source-1", "target-1", options);
    });

    expect(result.current.status).toBe("success");
    expect(result.current.result?.replayed).toBe(true);
    expect(result.current.result?.addedDayNumbers).toBeUndefined();
  });
});
